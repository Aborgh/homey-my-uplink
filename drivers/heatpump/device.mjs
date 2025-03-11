'use strict';

import {OAuth2Device} from "homey-oauth2app";
import parameterMap from "../../lib/models/parameter-map.mjs";
import {SettingsManager} from "../../lib/helpers/settings-manager.mjs";
import {PowerCalculator} from "../../lib/helpers/power-calculator.mjs";
import ParameterIds from "../../lib/models/parameter-enum.mjs";
import * as constants from "node:constants";

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
        ParameterIds.TIME_HEAT_ADDITION,
        ParameterIds.COMPRESSOR_STATUS,
        ParameterIds.ELECTRIC_ADDITION_STATUS
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
                        case 'enum':
                            if (param.capabilityName === "status_electric_addition") {
                                const exactMatch = point.enumValues.find(item => Number(item.value) === Math.round(point.value * 10));
                                if (exactMatch) {
                                    // Found exact match
                                    value = exactMatch.text;
                                } else {
                                    // Try finding the closest match
                                    const closestMatch = this.findClosestEnumValue(Math.round(point.value * 10), point.enumValues);
                                    if (closestMatch) {
                                        value = closestMatch;
                                    } else {
                                        // Fallback to original value
                                        value = point.value;
                                    }
                                }

                                value = this.homey.__(value);
                                // Capitalize the first letter
                                if (typeof value === 'string') {
                                    value = value.charAt(0).toUpperCase() + value.slice(1);
                                }

                                // Translate the value
                                this.log(`Value: ${value}`);
                            } else {
                                const enumTextValue = point.enumValues
                                    .find(item => Number(item.value) === Math.round(point.value))?.text || point.value;
                                const translatedText = this.homey.__(enumTextValue);
                                value = translatedText.charAt(0).toUpperCase() + translatedText.slice(1);
                            }
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
    async onSettings({oldSettings, newSettings, changedKeys}) {
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

    /**
     * Find the closest enum value for a given numeric value
     * @param {number} targetValue - The target value to match
     * @param {Array} enumValues - Array of enum value objects
     * @returns {string} The text of the closest matching enum
     */
    findClosestEnumValue(targetValue, enumValues) {
        // Convert all enum values to numbers for comparison
        const numericEnums = enumValues.map(item => ({
            value: Number(item.value),
            text: item.text
        })).filter(item => !isNaN(item.value));

        if (numericEnums.length === 0) return null;

        // Find the closest enum value
        let closest = numericEnums[0];
        let closestDiff = Math.abs(targetValue - closest.value);

        for (let i = 1; i < numericEnums.length; i++) {
            const diff = Math.abs(targetValue - numericEnums[i].value);
            if (diff < closestDiff) {
                closest = numericEnums[i];
                closestDiff = diff;
            }
        }

        // Only accept matches that are reasonably close (within 10 units)
        if (closestDiff <= 10) {
            return closest.text;
        }

        return closest.text;
    }
}

export default HeatPumpDevice;