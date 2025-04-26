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
        SSeriesParameterIds.SUPPLY_LINE_TEMP,
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
        SSeriesParameterIds.LIFETIME_ENERGY_CONSUMED,
        SSeriesParameterIds.AVERAGE_OUTDOOR_TEMP
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

            // Fetch data first to ensure we have the right capabilities
            await this.fetchAndSetDataPoints(SSeriesDevice.MONITORED_PARAMETERS);

            // Check if we have current sensors and add measure_power if needed
            const hasCurrentCapabilities =
                this.hasCapability('measure_current.one') ||
                this.hasCapability('measure_current.two') ||
                this.hasCapability('measure_current.three');

            if (hasCurrentCapabilities) {
                if (!this.hasCapability('measure_power')) {
                    this.log('Adding measure_power capability');
                    await this.addCapability('measure_power');
                }
                // Now update power value
                await this.powerCalculator.updateDevicePower(this);
            } else {
                this.log('No current sensors found, skipping power calculation');
                if (this.hasCapability('measure_power')) {
                    await this.removeCapability('measure_power');
                }
            }

            await this.settingsManager.initializeSettings();

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
                await this.refreshZoneData();
            } catch (error) {
                this.error(`Error during polling: ${error.message}`);
            }
        }, 1000 * 60 * this.pollInterval);
    }

    /**
     * Sets up capability listeners for device control
     */
    async setupCapabilityListeners() {
        // Handle standard parameter-based capabilities
        for (const [capability, parameterId] of Object.entries(SSeriesDevice.CAPABILITY_PARAMETER_MAP)) {
            // Skip room temperature which is handled separately
            if (capability === 'target_temperature.room') continue;

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

        // Special handling for room temperature which uses zones
        this.registerCapabilityListener('target_temperature.room', async (value) => {
            try {
                this.log(`Setting room temperature to ${value}`);

                // First get all zones
                const zones = await this.oAuth2Client.getSmartHomeZones(this.deviceId);

                // Find zones that are not command-only (can be controlled)
                const controllableZones = zones.filter(zone => !zone.commandOnly);

                if (controllableZones.length === 0) {
                    this.error('No controllable zones found');
                    return;
                }

                // For simplicity, we'll set all controllable zones to the same temperature
                // Alternatively, you could store the preferred zone in settings
                for (const zone of controllableZones) {
                    this.log(`Setting zone ${zone.zoneId} (${zone.name}) to ${value}°C`);
                    await this.oAuth2Client.setZoneTemperature(this.deviceId, zone.zoneId, value);
                }

                // Store the target temperature
                await this.setCapabilityValue('target_temperature.room', value);

            } catch (error) {
                this.error(`Error setting room temperature: ${error.message}`);
                // Revert UI to current setpoint
                await this.refreshZoneData();
            }
        });
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
            // Create a set of parameter IDs that were actually returned
            const returnedParameterIds = new Set(dataPoints.map(point => Number(point.parameterId)));

            // Track which capabilities were updated
            const updatedCapabilities = new Set();

            // Process returned data points
            for (const point of dataPoints) {
                const param = sSeriesParameterMap[Number(point.parameterId)];
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

                    // Mark this capability as updated
                    updatedCapabilities.add(param.capabilityName);

                    await this.processFlowTriggers(param);
                } catch (capError) {
                    this.error(`Error setting capability ${param.capabilityName}: ${capError.message}`);
                }
            }

            // Check if current sensors exist to justify keeping measure_power
            const hasCurrent = returnedParameterIds.has(SSeriesParameterIds.CURRENT_1) ||
                returnedParameterIds.has(SSeriesParameterIds.CURRENT_2) ||
                returnedParameterIds.has(SSeriesParameterIds.CURRENT_3);

            // Only keep measure_power if we have current sensors
            if (!hasCurrent && this.hasCapability('measure_power')) {
                this.log('No current sensors found, removing measure_power capability');
                await this.removeCapability('measure_power');
            }

            // For target_temperature.room and measure_temperature.room, we'll check for zones in a separate method
            // since they're controlled through the zone system rather than parameters

            // Find capabilities that were expected but not updated
            const expectedCapabilities = new Set();
            for (const paramId of params) {
                const param = sSeriesParameterMap[paramId];
                if (param && param.capabilityName) {
                    expectedCapabilities.add(param.capabilityName);
                }
            }

            // Remove unsupported capabilities (excluding those we just decided to keep)
            for (const capabilityName of expectedCapabilities) {
                if (!updatedCapabilities.has(capabilityName) &&
                    this.hasCapability(capabilityName)) {

                    this.log(`Removing unsupported capability: ${capabilityName}`);
                    await this.removeCapability(capabilityName);
                }
            }

            // Handle zone-based capabilities separately
            await this.refreshZoneData();

        } catch (error) {
            this.error(`Error fetching data points: ${error.message}`);
            throw error;
        }
    }

    /**
     * Sets the target temperature
     * @param {number} temperature - Target temperature in Celsius
     * @returns {Promise<void>}
     */
    async setTargetTemperature(temperature) {
        try {
            this.log(`Setting target temperature to ${temperature}°C`);

            // First check if we have the capability
            if (!this.hasCapability('target_temperature.room')) {
                throw new Error('Device does not support target temperature control');
            }

            // First update the capability value
            await this.setCapabilityValue('target_temperature.room', temperature);

            // For S-Series, we need to update through the zone system
            const zones = await this.oAuth2Client.getSmartHomeZones(this.deviceId);

            // Find zones that are not command-only (can be controlled)
            const controllableZones = zones.filter(zone => !zone.commandOnly);

            if (controllableZones.length === 0) {
                throw new Error('No controllable zones found');
            }

            // Set all controllable zones to the same temperature
            for (const zone of controllableZones) {
                this.log(`Setting zone ${zone.zoneId} (${zone.name}) to ${temperature}°C`);
                await this.oAuth2Client.setZoneTemperature(this.deviceId, zone.zoneId, temperature);
            }

            this.log(`Successfully set target temperature to ${temperature}°C`);
        } catch (error) {
            this.error(`Failed to set target temperature: ${error.message}`);
            throw error;
        }
    }

    /**
     * Refreshes zone data and updates related capabilities
     */
    async refreshZoneData() {
        try {
            const zones = await this.oAuth2Client.getSmartHomeZones(this.deviceId);

            // Find a non-command-only zone to get the temperature setpoint
            const controlZone = zones.find(zone => !zone.commandOnly);

            if (controlZone) {
                // Add/update room temperature capabilities if we have a controllable zone
                if (!this.hasCapability('target_temperature.room')) {
                    await this.addCapability('target_temperature.room');
                }

                if (!this.hasCapability('measure_temperature.room')) {
                    await this.addCapability('measure_temperature.room');
                }

                // Update the target temperature capability
                if (controlZone.setpointHeat !== null) {
                    await this.setCapabilityValue('target_temperature.room', controlZone.setpointHeat);
                    this.log(`Updated target temperature to ${controlZone.setpointHeat} from zone: ${controlZone.name}`);
                }

                // If the zone has a temperature reading, update that too
                if (controlZone.temperature !== null) {
                    await this.setCapabilityValue('measure_temperature.room', controlZone.temperature);
                    this.log(`Updated room temperature to ${controlZone.temperature} from zone: ${controlZone.name}`);
                }
                if (controlZone.indoorHumidity !== null || controlZone.indoorHumidity !== 0) {
                    await this.addCapability(`measure_humidity.${controlZone.name}`);
                    await this.setCapabilityOptions(`measure_humidity.${controlZone.name}`, {
                        "title": {
                            "en": `${controlZone.name} humidity`,
                            "sv": `${controlZone.name} luftfuktighet`,
                            "no": `${controlZone.name} luftfuktighet`,
                            "da": `${controlZone.name} luftfugtighed`,
                        }
                    })
                    await this.setCapabilityValue(`measure_humidity.${controlZone.name}`, controlZone.indoorHumidity)
                    this.log(`Updated room humidity to ${controlZone.indoorHumidity} from zone: ${controlZone.name}`);
                } 
            } else {
                // No controllable zones found, remove room temperature capabilities
                if (this.hasCapability('target_temperature.room')) {
                    this.log('No controllable zones found, removing target_temperature.room capability');
                    await this.removeCapability('target_temperature.room');
                }

                // Keep measure_temperature.room if any zone has a temperature value
                const anyZoneWithTemp = zones.some(zone => zone.temperature !== null);
                if (!anyZoneWithTemp && this.hasCapability('measure_temperature.room')) {
                    this.log('No zones with temperature readings, removing measure_temperature.room capability');
                    await this.removeCapability('measure_temperature.room');
                }
            }
        } catch (error) {
            // If we get an error (like 404 Not Found), zones might not be supported at all
            this.error(`Error refreshing zone data: ${error.message}`);

            // Remove zone-related capabilities if we can't access zones
            if (error.statusCode === 404) {
                if (this.hasCapability('target_temperature.room')) {
                    this.log('Zones not supported, removing target_temperature.room capability');
                    await this.removeCapability('target_temperature.room');
                }

                if (this.hasCapability('measure_temperature.room')) {
                    this.log('Zones not supported, removing measure_temperature.room capability');
                    await this.removeCapability('measure_temperature.room');
                }
            }
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