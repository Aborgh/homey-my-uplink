'use strict';

import {OAuth2Device} from "homey-oauth2app";

import {SettingsManager} from "../../lib/helpers/settings-manager.mjs";
import {PowerCalculator} from "../../lib/helpers/power-calculator.mjs";
import SSeriesParameterIds from "../../lib/models/s-series-parameter-enum.mjs";
import sSeriesParameterMap from "../../lib/models/s-series-parameter-map.mjs";

/**
 * Represents a Nibe S-Series Heat Pump device in Homey
 */
class SSeriesDevice extends OAuth2Device {
    /**
     * List of parameters to monitor
     * @type {number[]}
     */
    static MONITORED_PARAMETERS = [
        SSeriesParameterIds.OUTDOOR_TEMP,
        SSeriesParameterIds.ROOM_TEMP,
        SSeriesParameterIds.SUPPLY_TEMP,
        SSeriesParameterIds.RETURN_TEMP,
        SSeriesParameterIds.HOT_WATER_TOP,
        SSeriesParameterIds.HOT_WATER_CHARGING,
        SSeriesParameterIds.SUPPLY_LINE,
        SSeriesParameterIds.DISCHARGE_TEMP,
        SSeriesParameterIds.LIQUID_LINE,
        SSeriesParameterIds.SUCTION_GAS,
        SSeriesParameterIds.DEGREE_MINUTES,
        SSeriesParameterIds.CURRENT_COMPRESSOR_FREQ,
        SSeriesParameterIds.COMPRESSOR_STATUS,
        SSeriesParameterIds.HEATING_MEDIUM_PUMP_SPEED,
        SSeriesParameterIds.CURRENT_1,
        SSeriesParameterIds.CURRENT_2,
        SSeriesParameterIds.CURRENT_3,
    ];

    /**
     * Maps Homey capabilities to Nibe parameter IDs
     * @type {Object.<string, number>}
     */
    static CAPABILITY_PARAMETER_MAP = {
        'state_button.hot_water_boost': SSeriesParameterIds.HOT_WATER_BOOST,
        // 'state_button.ventilation_boost': SSeriesParameterIds.VENTILATION_BOOST,
        'target_temperature.room': SSeriesParameterIds.ROOM_TEMP_SETPOINT
    };

    /**
     * Initialize the device
     * @returns {Promise<void>}
     */
    async onOAuth2Init() {
        try {
            this.deviceId = this.getData().id;
            this.pollInterval = await this.getSetting('fetchIntervall') || 5;

            const deviceInfoHeader = `${"#".repeat(10)} DEVICE INFO ${"#".repeat(10)}`
            const infoHeader = `
${deviceInfoHeader}
            
NAME: ${this.getName()}
POLL INTERVAL: ${this.pollInterval}
CAPABILITIES: ${this.getCapabilities()}
                
${"#".repeat(deviceInfoHeader.length)}
            `
            this.log(infoHeader);
            this.log(`Device ${this.deviceId} initialized (S-Series)`);

            // Initialize services
            this.settingsManager = new SettingsManager(this, this.oAuth2Client);
            this.powerCalculator = new PowerCalculator();

            // Initial setup
            await this.fetchAndSetDataPoints(SSeriesDevice.MONITORED_PARAMETERS);
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

    async triggerFlow(flowId, token) {
        const flow = this.homey.flow.getTriggerCard(flowId);
        return flow.trigger({token});
    }

    /**
     * Sets up polling for data updates
     */
    startPolling() {
        this.pollTimer = this.homey.setInterval(async () => {
            this.log(`Fetching data for device ${this.deviceId}`);
            try {
                await this.fetchAndSetDataPoints(SSeriesDevice.MONITORED_PARAMETERS);
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
        for (const [capability, parameterId] of Object.entries(SSeriesDevice.CAPABILITY_PARAMETER_MAP)) {
            this.registerCapabilityListener(capability, async (value) => {
                try {
                    this.log(`Setting capability ${capability} to ${value}`);
                    const payload = {[parameterId]: Number(value)};
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
                const param = sSeriesParameterMap[Number(point.parameterId)];
                this.log(`${param.capabilityName}: ${point.value}`)
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
                        case 'enum':
                            value = this.processEnumValue(point, param);
                            break;
                        default:
                            value = point.value;
                    }


                    if (this.hasCapability(param.capabilityName)) {
                        await this.setCapabilityValue(param.capabilityName, value);
                        this.log(`Updated ${param.capabilityName} to ${value}`);
                    } else {
                        // Add capability if it doesn't exist
                        await this.addCapability(param.capabilityName);
                        await this.setCapabilityValue(param.capabilityName, value);
                        this.log(`Added capability: ${param.capabilityName} with value ${value}`);
                    }
                    await this.processFlowTriggers(param);
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
     * Process flow triggers based on parameter updates
     * @param {Object} param - The parameter mapping info
     */
    async processFlowTriggers(param) {
        if (param.parameterName === "status_compressor") {
            await this.triggerFlow("compressor-status-changed", param.value);
        }
    }

    /**
     * Process an enum value from the API
     * @param {Object} point - The data point from the API
     * @param {Object} param - The parameter mapping info
     * @returns {string} The processed enum value
     */
    processEnumValue(point, param) {
        // Standard enum handling for parameters
        return this.processStandardEnum(point);
    }

    /**
     * Process standard enum values
     * @param {Object} point - The data point from the API
     * @returns {string} The processed value
     */
    processStandardEnum(point) {
        const roundedValue = Math.round(point.value);

        // Get the matching enum text or fall back to the numeric value
        const enumText = point.enumValues.find(item =>
            Number(item.value) === roundedValue
        )?.text || String(point.value);

        // Translate and capitalize
        return this.formatEnumValue(enumText);
    }

    /**
     * Format an enum value text (translate and capitalize)
     * @param {string} text - The text to format
     * @returns {string} The formatted text
     */
    formatEnumValue(text) {
        // Translate the text
        const translated = this.homey.__(text);

        // Capitalize the first letter
        return typeof translated === 'string'
            ? translated.charAt(0).toUpperCase() + translated.slice(1)
            : translated;
    }

    /**
     * Handle device settings changes
     * @param {object} options - Settings change information
     */
    async onSettings({oldSettings, newSettings, changedKeys}) {
        try {
            // Handle poll interval change separately
            if (changedKeys.includes('fetchIntervall') &&
                newSettings.fetchIntervall !== oldSettings.fetchIntervall) {

                this.log(`Updating poll interval from ${oldSettings.fetchIntervall} to ${newSettings.fetchIntervall} minutes`);
                this.pollInterval = newSettings.fetchIntervall;

                // Reset the polling interval
                if (this.pollTimer) {
                    this.homey.clearInterval(this.pollTimer);
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
        if (this.pollTimer) {
            this.homey.clearInterval(this.pollTimer);
        }
    }
}

export default SSeriesDevice;