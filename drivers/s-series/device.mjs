'use strict';


import {OAuth2Device} from "homey-oauth2app";

class SSeriesDevice extends OAuth2Device {
  
  /**
   * Initialize the device
   * @returns {Promise<void>}
   */
  async onOAuth2Init() {
    try {
      this.deviceId = this.getData().id;
      this.pollInterval = await this.getSetting('fetchIntervall') || 5;

      const deviceInfoHeader = `${"#".repeat(10)} DEVICE INFO ${"#".repeat(10)}`
      const infoHeader = `
${deviceInfoHeader}
            
NAME: ${this.getName()}
POLL INTERVAL: ${this.pollInterval}
CAPABILITIES: ${this.getCapabilities()}
                
${"#".repeat(deviceInfoHeader.length)}
            `
      this.log(infoHeader);
      this.log(`Device ${this.deviceId} initialized`);
      
    } catch (error) {
      this.error('Error during device initialization:', error.message, error.stack);
    }
  }



  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('MyDevice settings where changed');
  }
  

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('MyDevice has been deleted');
  }

};

export default SSeriesDevice;