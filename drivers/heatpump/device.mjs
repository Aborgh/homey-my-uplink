'use strict';

import {OAuth2Device} from "homey-oauth2app";
import parameterMap from "../../lib/models/parameter-map.mjs";
import {SettingsManager} from "../../lib/helpers/settings-manager.mjs";
import {PowerCalculator} from "../../lib/helpers/power-calculator.mjs";
import ParameterIds from "../../lib/models/parameter-enum.mjs";

/**
 * Represents a Nibe Heat Pump device in Homey
 */
class HeatPumpDevice extends OAuth2Device {
    /**
     * List of parameters to monitor
     * @type {number[]}
     */
    static MONITORED_PARAMETERS = [
        ParameterIds.OUTDOOR_TEMP,
        ParameterIds.ROOM_TEMP,
        ParameterIds.CURRENT_COMPRESSOR_FREQ,
        ParameterIds.CURRENT_3,
        ParameterIds.CURRENT_1,
        ParameterIds.CURRENT_2,
        ParameterIds.EXHAUST_AIR_FAN_SPEED,
        ParameterIds.EXTRACT_AIR_TEMP,
        ParameterIds.EXHAUST_AIR_TEMP,
        ParameterIds.DEGREE_MINUTES,
        ParameterIds.SET_POINT_TEMP_1,
        ParameterIds.CONDENSER_TEMP,
        ParameterIds.TEMPORARY_LUX,
        ParameterIds.INCREASED_VENTILATION,
        ParameterIds.HEATING_MEDIUM_SUPPLY,
        ParameterIds.RETURN_LINE_TEMP,
        ParameterIds.HOT_WATER_TOP,
        ParameterIds.HOT_WATER_CHARGING,
        ParameterIds.SUCTION_GAS_TEMP,
        ParameterIds.SUPPLY_LINE,
        ParameterIds.CALCULATED_SUPPLY_LINE,
        ParameterIds.TIME_HEAT_ADDITION
    ];

    /**
     * Maps Homey capabilities to Nibe parameter IDs
     * @type {Object.<string, number>}
     */
    static CAPABILITY_PARAMETER_MAP = {
        'state_button.temp_lux': ParameterIds.TEMPORARY_LUX,
        'state_button.ventilation_boost': ParameterIds.INCREASED_VENTILATION,
        'target_temperature.room': ParameterIds.SET_POINT_TEMP_1
    };

    /**
     * Initialize the device
     * @returns {Promise<void>}
     */
    async onOAuth2Init() {
        try {
            this.deviceId = this.getData().id;
            this.log(`Device ${this.deviceId} initialized`);

            // Initialize services
            this.settingsManager = new SettingsManager(this, this.oAuth2Client);
            this.powerCalculator = new PowerCalculator();

            // Get poll interval from settings
            this.pollInterval = await this.getSetting('fetchIntervall') || 5;
            this.log(`Fetch interval set to ${this.pollInterval} minutes`);

            // Initial setup
            await this.fetchAndSetDataPoints(HeatPumpDevice.MONITORED_PARAMETERS);
            await this.settingsManager.initializeSettings();
            await this.powerCalculator.updateDevicePower(this);

            // Set up capability listeners
            await this.setupCapabilityListeners();

            // Start polling
            this.startPolling();
        } catch (error) {
            this.error('Error during device initialization:', error.message, error.stack);
        }
    }

    /**
     * Sets up polling for data updates
     */
    startPolling() {
        this.pollInterval = this.homey.setInterval(async () => {
            this.log(`Fetching data for device ${this.deviceId}`);
            try {
                await this.fetchAndSetDataPoints(HeatPumpDevice.MONITORED_PARAMETERS);
                await this.powerCalculator.updateDevicePower(this);
                await this.settingsManager.updateHeatpumpSettings();
            } catch (error) {
                this.error(`Error during polling: ${error.message}`);
            }
        }, 1000 * 60 * this.pollInterval);
    }

    /**
     * Sets up capability listeners for device control
     */
    async setupCapabilityListeners() {
        for (const [capability, parameterId] of Object.entries(HeatPumpDevice.CAPABILITY_PARAMETER_MAP)) {
            this.registerCapabilityListener(capability, async (value) => {
                try {
                    this.log(`Setting capability ${capability} to ${value}`);
                    const payload = { [parameterId]: Number(value) };
                    await this.oAuth2Client.setParameterValues(this.deviceId, payload);
                } catch (error) {
                    this.error(`Error setting ${capability}: ${error.message}`);
                    // Re-fetch the current value to revert UI
                    await this.fetchAndSetDataPoints([parameterId]);
                }
            });
        }
    }

    /**
     * Fetches and updates data points for given parameters
     * @param {number[]} params - Parameter IDs to fetch
     * @returns {Promise<void>}
     */
    async fetchAndSetDataPoints(params) {
        try {
            this.log(`Fetching data points for ${params.length} parameters`);
            const dataPoints = await this.oAuth2Client.getDataPoints(this.deviceId, params);

            for (const point of dataPoints) {
                const param = parameterMap[Number(point.parameterId)];
                if (!param) {
                    this.log(`Unknown parameter: ${point.parameterId}`);
                    continue;
                }

                try {
                    let value;
                    switch (param.type) {
                        case 'boolean':
                            value = Boolean(point.value);
                            break;
                        case 'number':
                            value = Number(point.value);
                            break;
                        case 'string':
                            value = String(point.value);
                            break;
                        default:
                            value = point.value;
                    }

                    if (this.hasCapability(param.capabilityName)) {
                        await this.setCapabilityValue(param.capabilityName, value);
                        this.log(`Updated ${param.capabilityName} to ${value}`);
                    } else {
                        this.log(`Device missing capability: ${param.capabilityName}`);
                    }
                } catch (capError) {
                    this.error(`Error setting capability ${param.capabilityName}: ${capError.message}`);
                }
            }
        } catch (error) {
            this.error(`Error fetching data points: ${error.message}`);
            throw error;
        }
    }

    /**
     * Handle device settings changes
     * @param {object} options - Settings change information
     */
    async onSettings({ oldSettings, newSettings, changedKeys }) {
        try {
            // Handle poll interval change separately
            if (changedKeys.includes('fetchIntervall') &&
                newSettings.fetchIntervall !== oldSettings.fetchIntervall) {

                this.log(`Updating poll interval from ${oldSettings.fetchIntervall} to ${newSettings.fetchIntervall} minutes`);
                this.pollInterval = newSettings.fetchIntervall;

                // Reset the polling interval
                if (this.pollInterval) {
                    this.homey.clearInterval(this.pollInterval);
                }
                this.startPolling();
            }

            // Handle power-related settings changes
            if (changedKeys.includes('powerFactor') || changedKeys.includes('voltage')) {
                this.log('Power calculation parameters changed, updating power value');
                await this.powerCalculator.updateDevicePower(this);
            }

            // Handle heat pump settings
            await this.settingsManager.handleSettingsUpdate(oldSettings, newSettings, changedKeys);

        } catch (error) {
            this.error(`Error handling settings change: ${error.message}`);
            throw error;
        }
    }

    /**
     * Clean up when device is deleted
     */
    async onDeleted() {
        this.log(`Device ${this.deviceId} deleted, cleaning up`);
        if (this.pollInterval) {
            this.homey.clearInterval(this.pollInterval);
        }
    }
}
export default HeatPumpDevice;