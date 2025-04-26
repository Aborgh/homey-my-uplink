'use strict';

import {OAuth2App} from "homey-oauth2app";
import {MyUplinkOAuth2Client} from "./lib/api/my-uplink-o-auth2-client.mjs";

class NibeHeatpumpApp extends OAuth2App {
  static OAUTH2_CLIENT = MyUplinkOAuth2Client;
  static OAUTH2_DEBUG = false;
  static OAUTH2_MULTI_SESSION = true;

  async onOAuth2Init() {
    this.log("App started");

    // Register flow actions and conditions
    this.registerFlowActions();
    this.registerFlowConditions();
  }

  registerFlowActions() {
    // Set temperature action
    const setTemperatureAction = this.homey.flow.getActionCard('set-temperature');

    setTemperatureAction.registerRunListener(async (args, state) => {
      const { device } = args;
      const targetTemperature = args.target_temperature;

      if (!device || !device.setTargetTemperature) {
        throw new Error('Device not found or does not support temperature control');
      }

      this.log(`Setting temperature to ${targetTemperature} on device ${device.getName()}`);

      // Call the device's method to set the temperature
      await device.setTargetTemperature(targetTemperature);

      return true;
    });
  }

  registerFlowConditions() {
    // Outdoor temperature condition
    const outdoorTempCondition = this.homey.flow.getConditionCard('outdoor-temperature-condition');
    outdoorTempCondition.registerRunListener(async (args, state) => {
      const { device, comparison, temperature } = args;

      if (!device) {
        throw new Error('Device not found');
      }

      const currentTemp = device.getCapabilityValue('measure_temperature.outdoor');

      if (typeof currentTemp !== 'number') {
        throw new Error('Outdoor temperature not available');
      }

      this.log(`Checking if outdoor temperature ${currentTemp}°C is ${comparison} ${temperature}°C`);

      switch (comparison) {
        case 'greater':
          return currentTemp > temperature;
        case 'equals':
          // Allow for a small tolerance in temperature comparison (±0.1°C)
          return Math.abs(currentTemp - temperature) <= 0.1;
        case 'less':
          return currentTemp < temperature;
        default:
          throw new Error(`Invalid comparison: ${comparison}`);
      }
    });

    // Indoor temperature condition
    const indoorTempCondition = this.homey.flow.getConditionCard('indoor-temperature-condition');
    indoorTempCondition.registerRunListener(async (args, state) => {
      const { device, comparison, temperature } = args;

      if (!device) {
        throw new Error('Device not found');
      }

      const currentTemp = device.getCapabilityValue('measure_temperature.room');

      if (typeof currentTemp !== 'number') {
        throw new Error('Indoor temperature not available');
      }

      this.log(`Checking if indoor temperature ${currentTemp}°C is ${comparison} ${temperature}°C`);

      switch (comparison) {
        case 'greater':
          return currentTemp > temperature;
        case 'equals':
          // Allow for a small tolerance in temperature comparison (±0.1°C)
          return Math.abs(currentTemp - temperature) <= 0.1;
        case 'less':
          return currentTemp < temperature;
        default:
          throw new Error(`Invalid comparison: ${comparison}`);
      }
    });

    // Temperature difference condition
    const tempDiffCondition = this.homey.flow.getConditionCard('temperature-difference-condition');
    tempDiffCondition.registerRunListener(async (args, state) => {
      const { device, comparison, temperature } = args;

      if (!device) {
        throw new Error('Device not found');
      }

      const indoorTemp = device.getCapabilityValue('measure_temperature.room');
      const outdoorTemp = device.getCapabilityValue('measure_temperature.outdoor');

      if (typeof indoorTemp !== 'number' || typeof outdoorTemp !== 'number') {
        throw new Error('Temperature readings not available');
      }

      const tempDifference = Math.abs(indoorTemp - outdoorTemp);

      this.log(`Checking if temperature difference ${tempDifference.toFixed(1)}°C is ${comparison} ${temperature}°C`);

      switch (comparison) {
        case 'greater':
          return tempDifference > temperature;
        case 'equals':
          // Allow for a small tolerance in temperature comparison (±0.1°C)
          return Math.abs(tempDifference - temperature) <= 0.1;
        case 'less':
          return tempDifference < temperature;
        default:
          throw new Error(`Invalid comparison: ${comparison}`);
      }
    });

    // Temperature in range condition
    const tempRangeCondition = this.homey.flow.getConditionCard('temperature-in-range-condition');
    tempRangeCondition.registerRunListener(async (args, state) => {
      console.log(args)
      const { device, type, min, max } = args;

      if (!device) {
        throw new Error('Device not found');
      }

      let currentTemp;

      if (type === 'indoor') {
        currentTemp = device.getCapabilityValue('measure_temperature.room');
      } else if (type === 'outdoor') {
        currentTemp = device.getCapabilityValue('measure_temperature.outdoor');
      } else {
        throw new Error(`Invalid temperature type: ${type}`);
      }

      if (typeof currentTemp !== 'number') {
        throw new Error(`${type} temperature not available`);
      }

      this.log(`Checking if ${type} temperature ${currentTemp}°C is/isn't between ${min}°C and ${max}°C`);

      return currentTemp >= min && currentTemp <= max;
    });
  }
}

export default NibeHeatpumpApp;