import ParameterIds from "../models/parameter-enum.mjs";

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
                operational_mode: "0"
            });

            // Initialize operational mode setting
            await this.initializeOperationalMode();

            // Fetch and set heating curve settings
            await this.updateHeatpumpSettings();
        } catch (error) {
            this.device.error('Failed to initialize settings:', error);
        }
    }

    /**
     * Initialize operational mode setting
     */
    async initializeOperationalMode() {
        this.hasOperationalMode = false;

        try {
            const opModeData = await this.apiService.getDataPoints(
                this.deviceId,
                [ParameterIds.OPERATION_MODE]
            );

            if (opModeData && opModeData.length > 0) {
                const opMode = opModeData[0].value;
                await this.device.setSettings({
                    operational_mode: String(opMode)
                });
                this.hasOperationalMode = true;
                this.device.log('Successfully set operational_mode to', opMode);
            }
        } catch (error) {
            if (error.statusCode === 404 || error.statusCode === 400) {
                this.device.log(`Operation mode parameter not found (${error.statusCode}), skipping this setting`);
            } else {
                this.device.error('Error fetching operational mode:', error);
            }
        }
    }

    /**
     * Update settings based on heat pump current values
     */
    async updateHeatpumpSettings() {
        const parameters = [
            ParameterIds.HEATING_CURVE,
            ParameterIds.OFFSET_CLIMATE_SYSTEM_1
        ];

        if (this.hasOperationalMode) {
            parameters.push(ParameterIds.OPERATION_MODE);
        }

        try {
            this.device.log("Fetching settings from heat pump");
            const parameterValues = await this.apiService.getDataPoints(this.deviceId, parameters);

            // Extract values from response
            const settings = {};

            // Find parameters by ID or name pattern
            const heatingCurve = parameterValues.find(
                param => param.parameterId === ParameterIds.HEATING_CURVE ||
                    param.parameterName.toLowerCase() === 'heating curve'
            );

            const heatingOffset = parameterValues.find(
                param => param.parameterId === ParameterIds.OFFSET_CLIMATE_SYSTEM_1 ||
                    param.parameterName.toLowerCase().includes('heating offset climate system')
            );

            if (heatingCurve) {
                settings.heating_curve = heatingCurve.value;
            }

            if (heatingOffset) {
                settings.heating_offset_climate_system_1 = heatingOffset.value;
            }

            // Handle operational mode if available
            if (this.hasOperationalMode) {
                const opMode = parameterValues.find(
                    param => param.parameterId === ParameterIds.OPERATION_MODE ||
                        param.parameterName.toLowerCase().includes('heater operation mode')
                );

                if (opMode) {
                    settings.operational_mode = String(opMode.value);
                }
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
                    case "operational_mode":
                        if (this.hasOperationalMode) {
                            updates[ParameterIds.OPERATION_MODE] = Number(newSettings.operational_mode);
                        }
                        break;

                    case "heating_curve":
                        updates[ParameterIds.HEATING_CURVE] = Number(newSettings.heating_curve);
                        break;

                    case "heating_offset_climate_system_1":
                        updates[ParameterIds.OFFSET_CLIMATE_SYSTEM_1] = Number(newSettings.heating_offset_climate_system_1);
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