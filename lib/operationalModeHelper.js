"use strict";

const {
    OPERATION_MODE,
    HEATING_ADDITION,
    ELECTRICITY_ADDITION,
} = require("./parmeter.enum");

const OPERATIONAL_MODE_MAPPING = [
    { mode: 0, paramOPMode: 0, paramHeatAdd: 0, paramElectricityAdd: 0 },
    { mode: 1, paramOPMode: 1, paramHeatAdd: 0, paramElectricityAdd: 1 },
    { mode: 2, paramOPMode: 1, paramHeatAdd: 1, paramElectricityAdd: 0 },
    { mode: 3, paramOPMode: 2, paramHeatAdd: 0, paramElectricityAdd: 0 },
];

/**
 * @param {number} opVal - The OPERATION_MODE value from the device.
 * @param {number} heatVal - The HEATING_ADDITION value from the device.
 * @param {number} elecVal - The ELECTRICITY_ADDITION value from the device.
 * @returns {number} The interpreted operational mode (0, 1, 2, or 3).
 */
function interpretOperationalMode(opVal, heatVal, elecVal) {
    const found = OPERATIONAL_MODE_MAPPING.find(
        (m) =>
            m.paramOPMode === opVal &&
            m.paramHeatAdd === heatVal &&
            m.paramElectricityAdd === elecVal
    );
    return found ? found.mode : 0;
}

/**
 * @param {number} mode - One of 0, 1, 2, 3.
 * @returns {object} A payload object to be sent to the device,
 *                   containing OPERATION_MODE, HEATING_ADDITION,
 *                   and ELECTRICITY_ADDITION.
 */
function buildParameterPayload(mode) {
    const found = OPERATIONAL_MODE_MAPPING.find((m) => m.mode === mode);
    if (!found) {
        return {
            [OPERATION_MODE]: 0,
            [HEATING_ADDITION]: 0,
            [ELECTRICITY_ADDITION]: 0,
        };
    }
    return {
        [OPERATION_MODE]: found.paramOPMode,
        [HEATING_ADDITION]: found.paramHeatAdd,
        [ELECTRICITY_ADDITION]: found.paramElectricityAdd,
    };
}

module.exports = {
    interpretOperationalMode,
    buildParameterPayload,
};