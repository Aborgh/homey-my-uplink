/**
 * Parameter IDs for NIBE S-Series heat pump systems.
 *
 * @module models/sseries-parameter-enum
 */

/**
 * Parameter IDs for various sensors and controls in S-Series heat pumps
 * @readonly
 * @enum {number}
 */
const SSeriesParameterIds = {
    // Temperature readings
    OUTDOOR_TEMP: 1,               // Outdoor temperature (BT1)
    SUPPLY_TEMP: 5,                // Supply temperature (BT2)
    RETURN_TEMP: 7,                // Return temperature (BT3)
    HOT_WATER_TOP: 8,              // Hot water top (BT7)
    HOT_WATER_CHARGING: 9,         // Hot water charging (BT6)
    BRINE_IN: 10,                  // Brine in (BT10) - Only for ground source
    BRINE_OUT: 11,                 // Brine out (BT11) - Only for ground source
    SUPPLY_LINE: 12,               // Supply line (BT12)
    DISCHARGE_TEMP: 13,            // Discharge (BT14)
    LIQUID_LINE: 14,               // Liquid line (BT15)
    SUCTION_GAS: 16,               // Suction gas (BT17)
    ROOM_TEMP: 26,                 // Room temperature 1 (BT50)
    EXTERNAL_SUPPLY_LINE: 39,      // External supply line (BT25)
    COMPRESSOR_SENSOR: 86,         // Compressor sensor (EB100-BT29)

    // System status
    DEGREE_MINUTES: 11,            // Degree minutes (uses Holding Register ID from Modbus specs)
    CALCULATED_SUPPLY_TEMP: 1017,  // Calculated supply temp
    CALCULATED_COOLING_SUPPLY: 1567, // Calculated cooling supply temp
    HEAT_MEDIUM_PUMP_SPEED: 1102,  // Heating medium pump speed (GP1)
    CURRENT_COMPRESSOR_FREQ: 1046, // Current compressor frequency
    COMPRESSOR_STARTS: 1083,       // Compressor starts
    COMPRESSOR_STATUS: 1100,       // Compressor status (0=off, 1=on)
    BRINE_PUMP_SPEED: 1104,        // Brine pump speed (GP2)
    REVERSING_VALVE: 2196,         // Reversing valve (QN10) (0=heating, 1=hot water)

    // Controls and settings
    TARGET_ROOM_TEMP: 47398,       // Room sensor setpoint S1
    HEATING_CURVE: 47007,          // Heat curve S1
    HEATING_OFFSET: 47011,         // Heat offset S1
    MIN_SUPPLY_TEMP: 47015,        // Min supply system 1
    MAX_SUPPLY_TEMP: 47019,        // Max supply system 1
    OPERATION_MODE: 47137,         // Operational mode (0=auto, 1=manual, 2=add heat only)

    // Hot water settings
    HOT_WATER_COMFORT_MODE: 47041, // Hot water comfort mode
    TEMP_LUX: 48132,               // Temporary luxury (0=off, 1=3h, 2=6h, 3=12h, 4=one time)

    // Power measurements
    // Current and power measurements
    CURRENT_1: 46,                 // Current BE3
    CURRENT_2: 48,                 // Current BE2
    CURRENT_3: 50,                 // Current BE1
    POWER_CONSUMPTION: 2166,       // Instantaneous used power

    // Air handling
    VENTILATION_BOOST: 50005,      // Increased ventilation
    FAN_SPEED: 2133,               // Fan speed
};

export default SSeriesParameterIds;