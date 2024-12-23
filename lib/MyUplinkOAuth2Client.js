"use strict";

const {OAuth2Client, OAuth2Error} = require("homey-oauth2app");

/**
 * Represents the OAuth2 client for the MyUplink API.
 */
class MyUplinkOAuth2Client extends OAuth2Client {

    static API_URL = "https://api.myuplink.com";
    static TOKEN_URL = "https://api.myuplink.com/oauth/token";
    static AUTHORIZATION_URL = "https://api.myuplink.com/oauth/authorize";
    static SCOPES = ["READSYSTEM", "WRITESYSTEM", "offline_access"];
    static REDIRECT_URL = "https://callback.athom.com/oauth2/callback";

    /**
     * Handles non-OK responses from the API.
     * @param {object} options
     * @param {object} options.body - The response body from the failed request.
     * @throws {OAuth2Error} When the body contains an error message.
     */
    async onHandleNotOK({body}) {
        this.error(body);
        await this.sendErrorNotification(body)
        throw new OAuth2Error(body.error);
    }

    async sendErrorNotification(message) {
        try {
            await this.homey.notifications.createNotification({
                excerpt: message, // Texten som ska visas i bannern
            });
            console.log('Notification sent:', message);
        } catch (error) {
            console.error('Failed to send notification:', error);
        }
    }

    /**
     * Fetches all systems available to the authenticated user.
     * @returns {Promise<object>} A promise that resolves to the user's systems data.
     */
    async getSystems() {
        return this.get({
            path: "/v2/systems/me",
        });
    }

    /**
     * Used to get different datapoints from parameters.
     * @param {string} deviceId - The ID of the device to query.
     * @param {number[]} parameterIds - An array of parameter IDs.
     * @returns {Promise<object[]>} A promise that resolves to an array of datapoints.
     */
    async getDataPoints(deviceId, parameterIds) {
        const params = parameterIds.join(",");
        return this.get({
            path: `/v2/devices/${deviceId}/points?parameters=${params}`,
        });
    }

    /**
     * Sets parameter value(s) on the device.
     *
     * This method accepts either:
     * 1) A single parameter ID and a single value, or
     * 2) An object mapping multiple parameter IDs to their respective values.
     *
     * @example
     *
     * // Multiple parameters
     * await setParameterValue(deviceId, {
     *   "47137": 1,
     *   "47371": 1,
     *   "47370": 0
     * });
     *
     * @param {string} deviceId - The ID of the device.
     * @param {object} body - The value to set for the parameter(s)
     * @returns {Promise<object>} The API response.
     */
    async setParameterValue(deviceId, body) {
        return this.patch({
            path: `/v2/devices/${deviceId}/points`,
            json: body
        });
    }

    /**
     * Retrieves device information.
     * @param {string} deviceId - The ID of the device.
     * @returns {Promise<object>} The device information.
     */
    async getDeviceInformation(deviceId) {
        return this.get({
            path: `/v2/devices/${deviceId}`,
        });
    }
}

module.exports = MyUplinkOAuth2Client;