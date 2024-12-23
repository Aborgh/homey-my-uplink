const ParameterEnum = require("./parmeter.enum");

/**
 * @typedef {Object} NibeParameter
 * @property {string} capabilityName - Capability in Homey.
 * @property {string} parameterName - Descriptive name of the parameter.
 * @property {string} type - Data type of the parameter (e.g., "number", "boolean").
 */

/**
 * Map ParameterEnum to Homey capabilities and additional metadata.
 * @type {Object.<number, NibeParameter>}
 */
const NibeParameterMap = {
    [ParameterEnum.OUTDOOR_TEMP]: {
        capabilityName: "measure_temperature.outdoor",
        parameterName: "Outdoor Temperature (BT1)",
        type: "number"
    },
    [ParameterEnum.HEATING_MEDIUM_SUPPLY]: {
        capabilityName: "measure_temperature.heating_supply",
        parameterName: "Heating Medium Supply (BT63)",
        type: "number"
    },
    [ParameterEnum.RETURN_LINE_TEMP]: {
        capabilityName: "measure_temperature.return_line",
        parameterName: "Return Line Temperature (BT3)",
        type: "number"
    },
    [ParameterEnum.HOT_WATER_TOP]: {
        capabilityName: "measure_temperature.hot_water_top",
        parameterName: "Hot Water Top (BT7)",
        type: "number"
    },
    [ParameterEnum.HOT_WATER_CHARGING]: {
        capabilityName: "measure_temperature.hot_water_charging",
        parameterName: "Hot Water Charging (BT6)",
        type: "number"
    },
    [ParameterEnum.CONDENSER_TEMP]: {
        capabilityName: "measure_temperature.condenser",
        parameterName: "Condenser Temperature (BT12)",
        type: "number"
    },
    [ParameterEnum.SUCTION_GAS_TEMP]: {
        capabilityName: "measure_temperature.suction_gas",
        parameterName: "Suction Gas Temperature (BT17)",
        type: "number"
    },
    [ParameterEnum.EXHAUST_AIR_TEMP]: {
        capabilityName: "measure_temperature.exhaust_air",
        parameterName: "Exhaust Air Temperature (BT20)",
        type: "number"
    },
    [ParameterEnum.ROOM_TEMP]: {
        capabilityName: "measure_temperature.room",
        parameterName: "Room Temperature (BT50)",
        type: "number"
    },
    [ParameterEnum.CURRENT_COMPRESSOR_FREQ]: {
        capabilityName: "measure_frequency.compressor",
        parameterName: "Current Compressor Frequency",
        type: "number"
    },
    [ParameterEnum.INVERTER_TEMP]: {
        capabilityName: "inverter_temperature",
        parameterName: "Inverter Temperature",
        type: "number"
    },
    [ParameterEnum.SET_POINT_TEMP_1]: {
        capabilityName: "target_temperature.room",
        parameterName: "Room sensor set point value heating climate system 1",
        type: "number"
    },
    [ParameterEnum.NIGHT_COOLING]: {
        capabilityName: "night_cooling",
        parameterName: "Night Cooling",
        type: "boolean"
    },
    [ParameterEnum.EXHAUST_AIR_FAN_SPEED]: {
        capabilityName: "measure_fan_speed.exhaust_air",
        parameterName: "Exhaust air fan speed",
        type: "number"
    },
    [ParameterEnum.CURRENT_3]: {
        capabilityName: "measure_current.three",
        parameterName: "Current (BE3)",
        type: "number"
    },
    [ParameterEnum.CURRENT_2]: {
        capabilityName: "measure_current.two",
        parameterName: "Current (BE2)",
        type: "number"
    },
    [ParameterEnum.CURRENT_1]: {
        capabilityName: "measure_current.one",
        parameterName: "Current (BE1)",
        type: "number"
    },
    [ParameterEnum.DEGREE_MINUTES]: {
        capabilityName: "measure_degree_minutes",
        parameterName: "Degree Minutes",
        type: "number"
    },
    [ParameterEnum.EXTRACT_AIR_TEMP]: {
        capabilityName: "measure_temperature.extract_air",
        parameterName: "Extract Air Temperature",
        type: "number"
    },
    [ParameterEnum.TEMPORARY_LUX]: {
        capabilityName: "state_button.temp_lux",
        parameterName: "Temporary Lux",
        type: "boolean"
    },
    [ParameterEnum.INCREASED_VENTILATION]: {
        capabilityName: "state_button.ventilation_boost",
        parameterName: "Ventilation Boost",
        type: "boolean"
    },
    [ParameterEnum.OPERATION_MODE]: {
        capabilityName: "operation_mode",
        parameterName: "Heater Operation Mode",
        type: "string"
    }

};

module.exports = NibeParameterMap;