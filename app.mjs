'use strict';


import {OAuth2App} from "homey-oauth2app";
import {MyUplinkOAuth2Client} from "./lib/api/my-uplink-o-auth2-client.mjs";

class NibeHeatpumpApp extends OAuth2App {
  static OAUTH2_CLIENT = MyUplinkOAuth2Client;
  static OAUTH2_DEBUG = false;
  static OAUTH2_MULTI_SESSION = true;
  async onOAuth2Init() {
    this.log("App started");
  }
}

export default NibeHeatpumpApp;