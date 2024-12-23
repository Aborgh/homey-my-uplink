'use strict';

const {OAuth2Device} = require("homey-oauth2app");
const {
    OUTDOOR_TEMP,
    ROOM_TEMP,
    CURRENT_COMPRESSOR_FREQ,
    CURRENT_3,
    CURRENT_1,
    CURRENT_2,
    EXHAUST_AIR_FAN_SPEED,
    EXTRACT_AIR_TEMP,
    EXHAUST_AIR_TEMP,
    DEGREE_MINUTES,
    TEMPORARY_LUX,
    SET_POINT_TEMP_1,
    CONDENSER_TEMP,
    INCREASED_VENTILATION,
    OPERATION_MODE,
    HEATING_MEDIUM_SUPPLY,
    RETURN_LINE_TEMP,
    HOT_WATER_TOP,
    HOT_WATER_CHARGING,
    SUCTION_GAS_TEMP,
    HEATING_ADDITION,
    ELECTRICITY_ADDITION
} = require("../../lib/parmeter.enum");
const nibeParameterMap = require("../../lib/nibeParameter");
const {buildParameterPayload, interpretOperationalMode} = require("../../lib/operationalModeHelper");

module.exports = class MyDevice extends OAuth2Device {
    id;
    fetchInterval;
    deviceParams = [
        OUTDOOR_TEMP,
        ROOM_TEMP,
        CURRENT_COMPRESSOR_FREQ,
        CURRENT_3,
        CURRENT_1,
        CURRENT_2,
        EXHAUST_AIR_FAN_SPEED,
        EXTRACT_AIR_TEMP,
        EXHAUST_AIR_TEMP,
        DEGREE_MINUTES,
        SET_POINT_TEMP_1,
        CONDENSER_TEMP,
        TEMPORARY_LUX,
        INCREASED_VENTILATION,
        HEATING_MEDIUM_SUPPLY,
        RETURN_LINE_TEMP,
        HOT_WATER_TOP,
        HOT_WATER_CHARGING,
        SUCTION_GAS_TEMP,
    ];

    CAPABILITY_PARAMETER_MAP = {
        "state_button.temp_lux": TEMPORARY_LUX,
        "state_button.ventilation_boost": INCREASED_VENTILATION,
        "target_temperature.room": SET_POINT_TEMP_1,
        "heater_operation_mode": OPERATION_MODE,
    };

    intervalMin = 5;

    async onOAuth2Init() {
        try {
            this.id = this.getData().id;
            this.intervalMin = await this.getSetting("fetchIntervall");
            await this.fetchAndSetDataPoints(this.deviceParams);
            await this.setSystemSettings();
            await this.updateOperationalModeSetting();
            this.fetchInterval = this.homey.setInterval(async () => {
                await this.fetchAndSetDataPoints(this.deviceParams);
                await this.calculateAndSetPower();
                await this.updateOperationalModeSetting();
            }, 1000 * 60 * this.intervalMin);

            for (const [capability, parameterId] of Object.entries(this.CAPABILITY_PARAMETER_MAP)) {
                this.registerCapabilityListener(capability, async (value) => {
                    try {
                        const payload = {[parameterId]: Number(value)};
                        await this.oAuth2Client.setParameterValue(this.id, payload);
                    } catch (error) {
                        this.error(`Error setting ${parameterId} for ${capability}:`, error);
                    }
                });
            }

        } catch (err) {
            this.error(err);
        }
    }

    async setSystemSettings() {
        const deviceInformation = await this.oAuth2Client.getDeviceInformation(this.id);
        await this.setSettings({
            serialNumber: deviceInformation.product.serialNumber,
            firmware: deviceInformation.firmware.currentFwVersion,
        });
    }

    /**
     * Retrieves and sets data points for given parameters.
     * @param {number[]} params - The list of parameter IDs to fetch.
     */
    async fetchAndSetDataPoints(params) {
        try {
            const dataPoints = await this.getDataPoints(this.id, params);

            for (const point of dataPoints) {
                const param = nibeParameterMap[Number(point.parameterId)];
                if (param) {
                    let value;
                    switch (param.type) {
                        case "boolean":
                            value = Boolean(point.value);
                            break;
                        case "number":
                            value = Number(point.value);
                            break;
                        case "string":
                            value = String(point.value);
                            break;
                        default:
                            value = point.value;
                    }
                    await this.setCapabilityValue(param.capabilityName, value);
                }
            }
        } catch (error) {
            this.error(error);
        }
    }

    /**
     * Calculates and updates the device's power consumption.
     */
    async calculateAndSetPower() {
        const {powerFactor, voltage} = await this.getSettings();

        try {
            const current_three = this.getCapabilityValue("measure_current.three");
            const current_two = this.getCapabilityValue("measure_current.two");
            const current_one = this.getCapabilityValue("measure_current.one");

            const watt = this.calculateThreePhasePower(
                current_one,
                current_two,
                current_three,
                voltage,
                powerFactor
            );

            await this.setCapabilityValue("measure_power", watt);
        } catch (error) {
            this.error('Error in calculateAndSetPower:', error);
        }
    }

    /**
     * Calculates the power consumption of a three-phase system.
     * @param {number} current1 - Current of phase 1.
     * @param {number} current2 - Current of phase 2.
     * @param {number} current3 - Current of phase 3.
     * @param {number} [voltage=400] - Voltage in volts (default is 400).
     * @param {number} [powerFactor=0.9] - Power factor (default is 0.9).
     * @returns {number} The calculated wattage.
     */
    calculateThreePhasePower(current1, current2, current3, voltage = 400, powerFactor = 0.9) {
        return Math.sqrt(3) * voltage * powerFactor * ((current1 + current2 + current3) / 3);
    }

    /**
     * Helper method to refresh current measurements (used in onSettings).
     */
    async refreshCurrentMeasurements() {
        const params = [CURRENT_1, CURRENT_2, CURRENT_3];
        await this.fetchAndSetDataPoints(params);
        await this.calculateAndSetPower();
    }

    /**
     * Gets data points from the OAuth2 client.
     * @param {string} deviceId - The device ID.
     * @param {number[]} parameterId - An array of parameter IDs.
     * @returns {Promise<NibeParameterData[]>} A promise that resolves to an array of parameter data objects.
     */
    async getDataPoints(deviceId, parameterId) {
        return this.oAuth2Client.getDataPoints(deviceId, parameterId);
    }

    async onSettings({oldSettings, newSettings, changedKeys}) {
        try {
            for (const changedKey of changedKeys) {
                if (changedKey === "power_factor" || changedKey === "voltage") {
                    await this.refreshCurrentMeasurements();
                }
                if (changedKey === "operational_mode") {
                    const modeNumber = Number(newSettings.operational_mode);
                    const payload = buildParameterPayload(modeNumber);
                    await this.oAuth2Client.setParameterValue(this.id, payload);
                }
            }
        } catch (error) {
            this.error(error);
        }
    }

    async updateOperationalModeSetting() {
        try {
            const relevantParams = [OPERATION_MODE, HEATING_ADDITION, ELECTRICITY_ADDITION];
            const dataPoints = await this.getDataPoints(this.id, relevantParams);
            const paramValues = {};
            for (const dataPoint of dataPoints) {
                paramValues[dataPoint.parameterId] = Number(dataPoint.value);
            }

            const newMode = interpretOperationalMode(
                paramValues[OPERATION_MODE],
                paramValues[HEATING_ADDITION],
                paramValues[ELECTRICITY_ADDITION],
            );

            const currentSettings = await this.getSettings();
            if (Number(currentSettings.operational_mode) !== newMode) {
                await this.setSettings({ operational_mode: String(newMode) });
            }
        } catch (error) {
            this.error('Failed to update operational_mode setting:', error);
        }
    }

    /**
     * Called when the user deletes the device.
     */
    async onDeleted() {
        this.homey.clearInterval(this.fetchInterval)
    }
};

/**
 * Represents the shape of a NibeParameterData object.
 * @typedef {Object} NibeParameterData
 * @property {string} category - Device category or model.
 * @property {number} parameterId - Unique identifier for the parameter.
 * @property {string} parameterName - Descriptive name of the parameter.
 * @property {string} parameterUnit - Unit of the parameter value (e.g., °C, Hz).
 * @property {boolean} writable - Indicates if the parameter is writable.
 * @property {string} timestamp - ISO 8601 timestamp of the last value update.
 * @property {number} value - Current value of the parameter.
 * @property {string} strVal - String representation of the value, including units.
 * @property {Array.<string>} smartHomeCategories - Categories for smart home integration (if any).
 * @property {?number} minValue - Minimum allowed value, if applicable.
 * @property {?number} maxValue - Maximum allowed value, if applicable.
 * @property {number} stepValue - Increment step for writable values.
 * @property {Array.<Object>} enumValues - List of enumerated values (empty if not applicable).
 * @property {number} scaleValue - Scaling factor to adjust the parameter value.
 * @property {?string} zoneId - ID of the zone the parameter belongs to (null if not applicable).
 */