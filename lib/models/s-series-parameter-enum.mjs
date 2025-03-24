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
    OUTDOOR_TEMP: 4,               // Outdoor temperature (BT1)
    SUPPLY_TEMP: 8,                // Supply temperature (BT2)
    RETURN_TEMP: 10,               // Return temperature (BT3)
    HOT_WATER_TOP: 11,             // Hot water top (BT7)
    HOT_WATER_CHARGING: 12,        // Hot water charging (BT6)
    SUPPLY_LINE: 15,               // Supply line (BT12)
    DISCHARGE_TEMP: 16,            // Hot gas (BT14)
    LIQUID_LINE: 17,               // Liquid line (BT15)
    SUCTION_GAS: 19,               // Suction gas (BT17)
    ROOM_TEMP: 29,                 // Room temperature (BT50)
    BRINE_IN: 13,                  // Brine in (BT10)
    BRINE_OUT: 14,                 // Brine out (BT11)

    // System status
    DEGREE_MINUTES: 781,           // Degree minutes
    CALCULATED_SUPPLY_TEMP: 55002, // Calculated supply temperature
    HEAT_MEDIUM_PUMP_SPEED: 55021, // Heating medium pump speed (GP1)
    BRINE_PUMP_SPEED: 55023,       // Brine pump speed (GP2)

    // Electrical measurements
    CURRENT_1: 66,                 // Current BE1
    CURRENT_2: 65,                 // Current BE2
    CURRENT_3: 64,                 // Current BE3
    CURRENT_COMPRESSOR_FREQ: 5927, // Current frequency

    // Status and operation
    COMPRESSOR_STATUS: 23675,      // Compressor status
    ELECTRIC_ADDITION_STATUS: 55027, // Internal electric addition status
    OPERATION_PRIORITY: 55000,     // Operation priority

    // Power and energy
    POWER_CONSUMPTION: 1801,       // Power
    MAX_ELECTRIC_POWER: 3823,      // Max set electric power

    // Other sensors
    INVERTER_TEMP: 1800,           // Inverter temperature

    // Hot water and comfort
    COMFORT_MODE: 3697,            // Comfort mode
    TEMP_LUX: 48132,               // Temporary luxury

    // Settings and configuration
    OPERATION_MODE: 47137,         // Operational mode
    HEATING_CURVE: 47007,          // Heating curve
    HEATING_OFFSET: 47011,         // Heating offset

    // Additional unique parameters
    FLOW_SENSOR: 58,               // Flow sensor (BF1)
    VERSION_PIC: 264,              // PIC version
    VERSION_8051: 265,             // 8051 version
    COMMUNICATION_QUALITY: 60001   // Communication quality
};

export default SSeriesParameterIds;