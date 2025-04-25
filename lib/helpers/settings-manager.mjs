import FSeriesParameterIds from "../models/f-series-parameter-enum.mjs";

/**
 * Manages device settings and their synchronization with heat pump parameters
 */
export class SettingsManager {
    constructor(device, apiService) {
        this.device = device;
        this.apiService = apiService;
        this.deviceId = device.getData().id;
    }

    /**
     * Initialize device settings from heat pump
     */
    async initializeSettings() {
        try {
            // Get device information and set basic settings
            const deviceInfo = await this.apiService.getDeviceInformation(this.deviceId);

            await this.device.setSettings({
                serialNumber: deviceInfo.product.serialNumber,
                firmware: deviceInfo.firmware.currentFwVersion,
            });

            // Fetch and set heating curve settings
            await this.updateHeatpumpSettings();
        } catch (error) {
            this.device.error('Failed to initialize settings:', error);
        }
    }
    /**
     * Update settings based on heat pump current values
     */
    async updateHeatpumpSettings() {
        const parameters = [
            FSeriesParameterIds.HEATING_CURVE,
            FSeriesParameterIds.OFFSET_CLIMATE_SYSTEM_1
        ];

        try {
            this.device.log("Fetching settings from heat pump");
            const parameterValues = await this.apiService.getDataPoints(this.deviceId, parameters);

            // Extract values from response
            const settings = {};

            // Find parameters by ID or name pattern
            const heatingCurve = parameterValues.find(
                param => param.parameterId === FSeriesParameterIds.HEATING_CURVE ||
                    param.parameterName.toLowerCase() === 'heating curve'
            );

            const heatingOffset = parameterValues.find(
                param => param.parameterId === FSeriesParameterIds.OFFSET_CLIMATE_SYSTEM_1 ||
                    param.parameterName.toLowerCase().includes('heating offset climate system')
            );

            if (heatingCurve) {
                settings.heating_curve = heatingCurve.value;
            }

            if (heatingOffset) {
                settings.heating_offset_climate_system_1 = heatingOffset.value;
            }

            // Update all settings at once
            if (Object.keys(settings).length > 0) {
                this.device.log('Updating settings:', JSON.stringify(settings));
                await this.device.setSettings(settings);
            }
        } catch (error) {
            this.device.error('Failed to update settings from heat pump:', error);
        }
    }

    /**
     * Handle changes to device settings
     */
    async handleSettingsUpdate(oldSettings, newSettings, changedKeys) {
        try {
            this.device.log(`Settings changed: ${changedKeys.join(', ')}`);
            const updates = {};

            for (const key of changedKeys) {
                switch (key) {
                    case "heating_curve":
                        updates[FSeriesParameterIds.HEATING_CURVE] = Number(newSettings.heating_curve);
                        break;

                    case "heating_offset_climate_system_1":
                        updates[FSeriesParameterIds.OFFSET_CLIMATE_SYSTEM_1] = Number(newSettings.heating_offset_climate_system_1);
                        break;
                }
            }

            // Send updates to device if we have any
            if (Object.keys(updates).length > 0) {
                await this.apiService.setParameterValues(this.deviceId, updates);
            }

        } catch (error) {
            this.device.error('Error updating settings:', error);
        }
    }
}

export default SettingsManager;