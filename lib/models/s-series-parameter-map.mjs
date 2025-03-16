/**
 * Maps NIBE S-Series parameters to Homey capabilities and metadata
 * @module models/sseries-parameter-map
 */

/**
 * @typedef {Object} SSeriesParameter
 * @property {string} capabilityName - Capability name in Homey
 * @property {string} parameterName - Descriptive name of the parameter
 * @property {string} type - Data type of the parameter (e.g., "number", "boolean", "enum")
 */

import SSeriesParameterIds from "./s-series-parameter-enum.mjs";

/**
 * Map ParameterIds to Homey capabilities and additional metadata
 * @type {Object.<number, SSeriesParameter>}
 */
const sSeriesParameterMap = {
    [SSeriesParameterIds.OUTDOOR_TEMP]: {
        capabilityName: "measure_temperature.outdoor",
        parameterName: "Outdoor Temperature (BT1)",
        type: "number"
    },
    [SSeriesParameterIds.SUPPLY_TEMP]: {
        capabilityName: "measure_temperature.heating_supply",
        parameterName: "Supply Temperature (BT2)",
        type: "number"
    },
    [SSeriesParameterIds.RETURN_TEMP]: {
        capabilityName: "measure_temperature.return_line",
        parameterName: "Return Temperature (BT3)",
        type: "number"
    },
    [SSeriesParameterIds.HOT_WATER_TOP]: {
        capabilityName: "measure_temperature.hot_water_top",
        parameterName: "Hot Water Top (BT7)",
        type: "number"
    },
    [SSeriesParameterIds.HOT_WATER_CHARGING]: {
        capabilityName: "measure_temperature.hot_water_charging",
        parameterName: "Hot Water Charging (BT6)",
        type: "number"
    },
    [SSeriesParameterIds.BRINE_IN]: {
        capabilityName: "measure_temperature.brine_in",
        parameterName: "Brine In (BT10)",
        type: "number"
    },
    [SSeriesParameterIds.BRINE_OUT]: {
        capabilityName: "measure_temperature.brine_out",
        parameterName: "Brine Out (BT11)",
        type: "number"
    },
    [SSeriesParameterIds.SUPPLY_LINE]: {
        capabilityName: "measure_temperature.supply_line",
        parameterName: "Supply Line (BT12)",
        type: "number"
    },
    [SSeriesParameterIds.DISCHARGE_TEMP]: {
        capabilityName: "measure_temperature.discharge",
        parameterName: "Discharge (BT14)",
        type: "number"
    },
    [SSeriesParameterIds.LIQUID_LINE]: {
        capabilityName: "measure_temperature.liquid_line",
        parameterName: "Liquid Line (BT15)",
        type: "number"
    },
    [SSeriesParameterIds.SUCTION_GAS]: {
        capabilityName: "measure_temperature.suction_gas",
        parameterName: "Suction Gas (BT17)",
        type: "number"
    },
    [SSeriesParameterIds.ROOM_TEMP]: {
        capabilityName: "measure_temperature.room",
        parameterName: "Room Temperature (BT50)",
        type: "number"
    },
    [SSeriesParameterIds.EXTERNAL_SUPPLY_LINE]: {
        capabilityName: "measure_temperature.external_supply",
        parameterName: "External Supply Line (BT25)",
        type: "number"
    },
    [SSeriesParameterIds.CURRENT_1]: {
        capabilityName: "measure_current.one",
        parameterName: "Current Phase 1 (BE3)",
        type: "number"
    },
    [SSeriesParameterIds.CURRENT_2]: {
        capabilityName: "measure_current.two",
        parameterName: "Current Phase 2 (BE2)",
        type: "number"
    },
    [SSeriesParameterIds.CURRENT_3]: {
        capabilityName: "measure_current.three",
        parameterName: "Current Phase 3 (BE1)",
        type: "number"
    },
    [SSeriesParameterIds.DEGREE_MINUTES]: {
        capabilityName: "measure_degree_minutes",
        parameterName: "Degree Minutes",
        type: "number"
    },
    [SSeriesParameterIds.CALCULATED_SUPPLY_TEMP]: {
        capabilityName: "measure_temperature.calculated_supply_line",
        parameterName: "Calculated Supply Temperature",
        type: "number"
    },
    [SSeriesParameterIds.HEAT_MEDIUM_PUMP_SPEED]: {
        capabilityName: "measure_pump_speed.heating_medium",
        parameterName: "Heating Medium Pump Speed (GP1)",
        type: "number"
    },
    [SSeriesParameterIds.CURRENT_COMPRESSOR_FREQ]: {
        capabilityName: "measure_frequency.compressor",
        parameterName: "Current Compressor Frequency",
        type: "number"
    },
    [SSeriesParameterIds.COMPRESSOR_STARTS]: {
        capabilityName: "measure_compressor_starts",
        parameterName: "Compressor Starts",
        type: "number"
    },
    [SSeriesParameterIds.COMPRESSOR_STATUS]: {
        capabilityName: "status_compressor",
        parameterName: "Compressor Status",
        type: "enum"
    },
    [SSeriesParameterIds.BRINE_PUMP_SPEED]: {
        capabilityName: "measure_pump_speed.brine",
        parameterName: "Brine Pump Speed (GP2)",
        type: "number"
    },
    [SSeriesParameterIds.REVERSING_VALVE]: {
        capabilityName: "status_reversing_valve",
        parameterName: "Reversing Valve (QN10)",
        type: "enum"
    },
    [SSeriesParameterIds.TARGET_ROOM_TEMP]: {
        capabilityName: "target_temperature.room",
        parameterName: "Room Sensor Set Point",
        type: "number"
    },
    [SSeriesParameterIds.TEMP_LUX]: {
        capabilityName: "state_button.temp_lux",
        parameterName: "Temporary Luxury",
        type: "boolean"
    },
    [SSeriesParameterIds.VENTILATION_BOOST]: {
        capabilityName: "state_button.ventilation_boost",
        parameterName: "Ventilation Boost",
        type: "boolean"
    },
    [SSeriesParameterIds.POWER_CONSUMPTION]: {
        capabilityName: "measure_power",
        parameterName: "Power Consumption",
        type: "number"
    },
    [SSeriesParameterIds.FAN_SPEED]: {
        capabilityName: "measure_fan_speed.exhaust_air",
        parameterName: "Fan Speed",
        type: "number"
    }
};

export default sSeriesParameterMap;