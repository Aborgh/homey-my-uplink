'use strict';

import {OAuth2Driver} from "homey-oauth2app";

class FSerierDriver extends OAuth2Driver {
    async onOAuth2Init() {}

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
}

export default FSerierDriver;