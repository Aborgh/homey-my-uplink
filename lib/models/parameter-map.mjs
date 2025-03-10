/**
 * Maps NIBE parameters to Homey capabilities and metadata
 * @module models/parameter-map
 */


/**
 * @typedef {Object} NibeParameter
 * @property {string} capabilityName - Capability name in Homey
 * @property {string} parameterName - Descriptive name of the parameter
 * @property {string} type - Data type of the parameter (e.g., "number", "boolean")
 */

import ParameterIds from "./parameter-enum.mjs";

/**
 * Map ParameterIds to Homey capabilities and additional metadata
 * @type {Object.<number, NibeParameter>}
 */
const parameterMap = {
    [ParameterIds.OUTDOOR_TEMP]: {
        capabilityName: "measure_temperature.outdoor",
        parameterName: "Outdoor Temperature (BT1)",
        type: "number"
    },
    [ParameterIds.HEATING_MEDIUM_SUPPLY]: {
        capabilityName: "measure_temperature.heating_supply",
        parameterName: "Heating Medium Supply (BT63)",
        type: "number"
    },
    [ParameterIds.RETURN_LINE_TEMP]: {
        capabilityName: "measure_temperature.return_line",
        parameterName: "Return Line Temperature (BT3)",
        type: "number"
    },
    [ParameterIds.HOT_WATER_TOP]: {
        capabilityName: "measure_temperature.hot_water_top",
        parameterName: "Hot Water Top (BT7)",
        type: "number"
    },
    [ParameterIds.HOT_WATER_CHARGING]: {
        capabilityName: "measure_temperature.hot_water_charging",
        parameterName: "Hot Water Charging (BT6)",
        type: "number"
    },
    [ParameterIds.CONDENSER_TEMP]: {
        capabilityName: "measure_temperature.condenser",
        parameterName: "Condenser Temperature (BT12)",
        type: "number"
    },
    [ParameterIds.SUCTION_GAS_TEMP]: {
        capabilityName: "measure_temperature.suction_gas",
        parameterName: "Suction Gas Temperature (BT17)",
        type: "number"
    },
    [ParameterIds.EXHAUST_AIR_TEMP]: {
        capabilityName: "measure_temperature.exhaust_air",
        parameterName: "Exhaust Air Temperature (BT20)",
        type: "number"
    },
    [ParameterIds.ROOM_TEMP]: {
        capabilityName: "measure_temperature.room",
        parameterName: "Room Temperature (BT50)",
        type: "number"
    },
    [ParameterIds.CURRENT_COMPRESSOR_FREQ]: {
        capabilityName: "measure_frequency.compressor",
        parameterName: "Current Compressor Frequency",
        type: "number"
    },
    [ParameterIds.SUPPLY_LINE]: {
        capabilityName: "measure_temperature.supply_line",
        parameterName: "Supply Line Temperature",
        type: "number"
    },
    [ParameterIds.CALCULATED_SUPPLY_LINE]: {
        capabilityName: "measure_temperature.calculated_supply_line",
        parameterName: "Calculated Supply Line Temperature",
        type: "number"
    },
    [ParameterIds.SET_POINT_TEMP_1]: {
        capabilityName: "target_temperature.room",
        parameterName: "Room sensor set point value heating climate system 1",
        type: "number"
    },
    [ParameterIds.NIGHT_COOLING]: {
        capabilityName: "night_cooling",
        parameterName: "Night Cooling",
        type: "boolean"
    },
    [ParameterIds.EXHAUST_AIR_FAN_SPEED]: {
        capabilityName: "measure_fan_speed.exhaust_air",
        parameterName: "Exhaust air fan speed",
        type: "number"
    },
    [ParameterIds.CURRENT_3]: {
        capabilityName: "measure_current.three",
        parameterName: "Current (BE3)",
        type: "number"
    },
    [ParameterIds.CURRENT_2]: {
        capabilityName: "measure_current.two",
        parameterName: "Current (BE2)",
        type: "number"
    },
    [ParameterIds.CURRENT_1]: {
        capabilityName: "measure_current.one",
        parameterName: "Current (BE1)",
        type: "number"
    },
    [ParameterIds.DEGREE_MINUTES]: {
        capabilityName: "measure_degree_minutes",
        parameterName: "Degree Minutes",
        type: "number"
    },
    [ParameterIds.EXTRACT_AIR_TEMP]: {
        capabilityName: "measure_temperature.extract_air",
        parameterName: "Extract Air Temperature",
        type: "number"
    },
    [ParameterIds.TEMPORARY_LUX]: {
        capabilityName: "state_button.temp_lux",
        parameterName: "Temporary Lux",
        type: "boolean"
    },
    [ParameterIds.INCREASED_VENTILATION]: {
        capabilityName: "state_button.ventilation_boost",
        parameterName: "Ventilation Boost",
        type: "boolean"
    },
    [ParameterIds.OPERATION_MODE]: {
        capabilityName: "operation_mode",
        parameterName: "Heater Operation Mode",
        type: "string"
    },
    [ParameterIds.HEATING_CURVE]: {
        capabilityName: "measure_heating_curve",
        parameterName: "Heating curve",
        type: "number"
    },
    [ParameterIds.OFFSET_CLIMATE_SYSTEM_1]: {
        capabilityName: "measure_offset_climate_system_1",
        parameterName: "Heating offset climate system 1",
        type: "number"
    },
    [ParameterIds.TIME_HEAT_ADDITION]: {
        capabilityName: "time.heat_addition",
        parameterName: "Time Heat Addition",
        type: "number"
    },
    [ParameterIds.COMPRESSOR_STATUS]: {
        capabilityName: "string.compressor_status",
        parameterName: "Compressor status",
        type: "enum"
    }
};
export default parameterMap;
