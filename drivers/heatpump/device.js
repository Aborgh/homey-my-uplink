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
    HEATING_CURVE,
    OFFSET_CLIMATE_SYSTEM_1,
    SUPPLY_LINE,
    CALCULATED_SUPPLY_LINE,
    TIME_HEAT_ADDITION
} = require("../../lib/parmeter.enum");
const nibeParameterMap = require("../../lib/nibeParameter");

module.exports = class HeatPumpDevice extends OAuth2Device {
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
        SUPPLY_LINE,
        CALCULATED_SUPPLY_LINE,
        TIME_HEAT_ADDITION
    ];

    CAPABILITY_PARAMETER_MAP = {
        "state_button.temp_lux": TEMPORARY_LUX,
        "state_button.ventilation_boost": INCREASED_VENTILATION,
        "target_temperature.room": SET_POINT_TEMP_1,
        "heater_operation_mode": OPERATION_MODE,
    };

    intervalMin = 5;
    opMode = false;
    async onOAuth2Init() {
        try {
            this.id = this.getData().id;
            this.log(`Device ${this.id} initialized`);
            this.intervalMin = await this.getSetting("fetchIntervall");
            this.log(`Fetch interval set to ${this.intervalMin} minutes`);
            await this.fetchAndSetDataPoints(this.deviceParams);
            await this.setSystemSettings();
            await this.calculateAndSetPower();
            this.fetchInterval = this.homey.setInterval(async () => {
                this.log(`Fetching data for device ${this.id}`);
                await this.fetchAndSetDataPoints(this.deviceParams);
                await this.calculateAndSetPower();
                await this.updateSettingsFromHeatPump();
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
        try {
            const deviceInformation = await this.oAuth2Client.getDeviceInformation(this.id);

            await this.setSettings({
                serialNumber: deviceInformation.product.serialNumber,
                firmware: deviceInformation.firmware.currentFwVersion,
            });

            try {
                const opModeData = await this.oAuth2Client.getDataPoints(this.id, [OPERATION_MODE]);
                if (opModeData && opModeData.length > 0) {
                    const opMode = opModeData[0].value;
                    await this.setSettings({
                        operational_mode: String(opMode)
                    });
                    this.opMode = true;
                    this.log('Successfully set operational_mode to', opMode);
                }
            } catch (opModeError) {
                // Check if it's a 404 error
                if (opModeError.statusCode === 404) {
                    this.log('Operation mode parameter not found (404), setting default value');
                    await this.setSettings({
                        operational_mode: "0"
                    });
                    this.opMode = false;
                } else {
                    this.error('Error fetching operational mode:', opModeError);
                }
            }
        } catch (error) {
            this.error('Failed to set system settings:', error);
        }
    }

    /**
     * Retrieves and sets data points for given parameters.
     * @param {number[]} params - The list of parameter IDs to fetch.
     */
    async fetchAndSetDataPoints(params) {
        try {
            this.log(`Fetching data points for parameters: ${params.join(', ')}`);
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
            this.log(`Calculated power: ${watt} W`);
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
            this.log(`Settings changed: ${changedKeys.join(', ')}`);
            for (const changedKey of changedKeys) {
                if (changedKey === "power_factor" || changedKey === "voltage") {
                    await this.refreshCurrentMeasurements();
                }
                if (changedKey === "operational_mode" && this.opMode) {
                    const modeNumber = Number(newSettings.operational_mode);
                    await this.oAuth2Client.setParameterValue(this.id, {[OPERATION_MODE]: modeNumber});
                }

                if (changedKey === "heating_curve") {
                    const heatingCurve = Number(newSettings.heating_curve);
                    await this.oAuth2Client.setParameterValue(this.id, {[HEATING_CURVE]: heatingCurve});
                }

                if (changedKey === "heating_offset_climate_system_1") {
                    const offset = Number(newSettings.heating_offset_climate_system_1);
                    await this.oAuth2Client.setParameterValue(this.id, {[OFFSET_CLIMATE_SYSTEM_1]: offset});
                }
            }
        } catch (error) {
            this.error(error);
        }
    }
    
    async updateSettingsFromHeatPump() {
        try {
            this.log("Fetching settings from heatpump");
            const parameters = await this.oAuth2Client.getDataPoints(this.id, [
                HEATING_CURVE,
                OFFSET_CLIMATE_SYSTEM_1,
                OPERATION_MODE
            ]);
            const heatingCurveParam = parameters.find(param => param.parameterId === HEATING_CURVE || param.parameterName.toLowerCase() === 'heating curve');
            const heatingOffsetParam = parameters.find(param => param.parameterId === OFFSET_CLIMATE_SYSTEM_1 || param.parameterName.toLowerCase().includes('heating offset climate system'));
            
            // Handle OpMode separately since not everyone has this.
            if (this.opMode) {
                const operationalMode = parameters.find(param => param.parameterId === OPERATION_MODE || param.parameterName.toLowerCase().includes('heater operation mode'));
                await this.setSettings({
                    operational_mode: operationalMode.value
                })
            }

            if (!heatingCurveParam || !heatingOffsetParam) {
                throw new Error('Could not find required parameters in the response');
            }

            const heatingCurve = heatingCurveParam.value;
            const heatingOffset = heatingOffsetParam.value;

            this.log(`Updated settings: Heating curve = ${heatingCurve}, Heating offset = ${heatingOffset}`);

            await this.setSettings({
                heating_curve: heatingCurve,
                heating_offset_climate_system_1: heatingOffset,
            });
        } catch (error) {
            this.error('Failed to update settings from heat pump:', error);
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