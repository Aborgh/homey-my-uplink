'use strict';

const {OAuth2Driver} = require("homey-oauth2app");
const FlowHandler = require("../../lib/FlowHandler");

module.exports = class HeatPumpDriver extends OAuth2Driver {
    async onOAuth2Init() {
        try {
            // Initialize flow handling
            this.flowHandler = new FlowHandler(this);

            // Initialize triggers for all numeric capabilities
            await this.flowHandler.initializeNumericTriggers([
                'measure_temperature.room',
                'measure_temperature.heating_supply',
                'measure_temperature.return_line',
                'measure_temperature.outdoor',
                'measure_temperature.hot_water_charging',
                'measure_temperature.hot_water_top',
                'measure_temperature.calculated_supply_line',
                'measure_temperature.supply_line',
                'measure_temperature.condenser',
                'measure_temperature.exhaust_air',
                'measure_temperature.extract_air',
                'measure_temperature.suction_gas',
                'measure_fan_speed.exhaust_air',
                'measure_frequency.compressor',
                'measure_degree_minutes',
                'measure_current.one',
                'measure_current.two',
                'measure_current.three',
                'measure_power',
                'time.heat_addition'
            ]);

            // Initialize state buttons
            await this.flowHandler.initializeStateButtons([
                'state_button.temp_lux',
                'state_button.ventilation_boost'
            ]);

        } catch (err) {
            this.error(err);
        }
    }

    // Override setCapabilityValue to handle flow triggers
    async setCapabilityValue(capabilityId, value) {
        await super.setCapabilityValue(capabilityId, value);
        await this.flowHandler.handleCapabilityChange(capabilityId, value);
    }

    /**
     * Called during pairing to list devices available to pair.
     * @param {object} param0 - An object containing pairing options.
     * @param {import("./MyUplinkOAuth2Client")} param0.oAuth2Client - The OAuth2 client instance.
     * @returns {Promise<Array>} An array of device objects to be paired.
     */
    async onPairListDevices({oAuth2Client}) {
        const systems = await oAuth2Client.getSystems();

        return systems.systems.flatMap(system =>
            system.devices.map(device => ({
                name: device.product.name,
                data: {
                    id: device.id,
                },
                store: {
                    systemId: system.systemId,
                },
            }))
        );
    }
};