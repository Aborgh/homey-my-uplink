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
        ParameterIds.TIME_HEAT_ADDITION,
        ParameterIds.COMPRESSOR_STATUS,
        // Removed for now since it doesn't return the correct value
        // ParameterIds.ELECTRIC_ADDITION_STATUS
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
            this.log(`Device ${this.deviceId} initialized`);

            // Initialize services
            this.settingsManager = new SettingsManager(this, this.oAuth2Client);
            this.powerCalculator = new PowerCalculator();

            // Initial setup
            await this.fetchAndSetDataPoints(HeatPumpDevice.MONITORED_PARAMETERS);
            await this.settingsManager.initializeSettings();
            await this.powerCalculator.updateDevicePower(this);

            // Set up capability listeners
            await this.setupCapabilityListeners();
            // remove "status_electric_addition" for now since it doesn't work on api-level
            if (this.hasCapability("status_electric_addition")) {
                await this.removeCapability("status_electric_addition");
            }
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
     *
     * @param {Object} param
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
        // Special handling for electric addition status
        if (param.capabilityName === "status_electric_addition") {
            this.log(param.capabilityName, 'value', point.value);
            return this.processElectricAdditionStatus(point);
        }

        // Standard enum handling for other parameters
        return this.processStandardEnum(point);
    }

    /**
     * Process electric addition status enum values
     * @param {Object} point - The data point from the API
     * @returns {string} The processed value
     */
    processElectricAdditionStatus(point) {
        const roundedValue = Math.round(point.value * 10);
        // Try to find an exact match first
        const exactMatch = point.enumValues.find(item =>
            Number(item.value) === roundedValue
        );

        let valueText = exactMatch?.text;

        // If no exact match, try to find the closest match
        if (!valueText) {
            valueText = this.findClosestEnumValue(roundedValue, point.enumValues);
        }

        // If we still don't have a value, use the original
        if (!valueText) {
            valueText = String(point.value);
        }

        // Translate and capitalize
        return this.formatEnumValue(valueText);
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

export default HeatPumpDevice;