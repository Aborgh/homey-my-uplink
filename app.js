'use strict';

const {OAuth2App} = require("homey-oauth2app");
const MyUplinkOAuth2Client = require("./lib/MyUplinkOAuth2Client");

module.exports = class NibeHeatpumpApp extends OAuth2App {
  static OAUTH2_CLIENT = MyUplinkOAuth2Client;
  static OAUTH2_DEBUG = false;
  static OAUTH2_MULTI_SESSION = true;
  async onOAuth2Init() {
    this.log("App started");
  }

};
