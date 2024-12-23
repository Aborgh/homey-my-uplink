'use strict';

const { OAuth2Driver } = require("homey-oauth2app");

module.exports = class MyDriver extends OAuth2Driver {
  /**
   * Called when the driver is initialized with OAuth2.
   */
  async onOAuth2Init() {
    // Initialization logic, if any
  }

  /**
   * Called during pairing to list devices available to pair.
   * @param {object} param0 - An object containing pairing options.
   * @param {import("./MyUplinkOAuth2Client")} param0.oAuth2Client - The OAuth2 client instance.
   * @returns {Promise<Array>} An array of device objects to be paired.
   */
  async onPairListDevices({ oAuth2Client }) {
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