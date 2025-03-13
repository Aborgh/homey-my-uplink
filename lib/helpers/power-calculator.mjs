/**
 * Helper class for calculating power consumption based on current measurements
 */
export class PowerCalculator {
    /**
     * Calculates the power consumption of a three-phase system
     *
     * @param {number} current1 - Current of phase 1 in amperes
     * @param {number} current2 - Current of phase 2 in amperes
     * @param {number} current3 - Current of phase 3 in amperes
     * @param {number} voltage - Voltage in volts (default 400)
     * @param {number} powerFactor - Power factor (default 0.95)
     * @returns {number} The calculated power in watts
     */
    calculateThreePhasePower(current1, current2, current3, voltage = 400, powerFactor = 0.95) {
        // Validate inputs
        if (!this.isValidCurrent(current1) ||
            !this.isValidCurrent(current2) ||
            !this.isValidCurrent(current3)) {
            return 0;
        }

        // För obalanserad last: använd fasspänning och summera alla strömmar
        const phaseVoltage = voltage / Math.sqrt(3);

        // Calculate power: P = Vphase × (I1 + I2 + I3) × PF
        return phaseVoltage * (current1 + current2 + current3) * powerFactor;
    }

    /**
     * Check if a current value is valid for calculation
     */
    isValidCurrent(current) {
        return typeof current === 'number' && !isNaN(current) && isFinite(current);
    }

    /**
     * Calculate and update device power capability based on current measurements
     *
     * @param {object} device - The device instance
     */
    async updateDevicePower(device) {
        try {
            const settings = await device.getSettings();
            const { powerFactor = 0.95, voltage = 400 } = settings;

            // Get current measurements from capabilities
            const current1 = device.getCapabilityValue("measure_current.one") || 0;
            const current2 = device.getCapabilityValue("measure_current.two") || 0;
            const current3 = device.getCapabilityValue("measure_current.three") || 0;

            // Calculate power
            const power = this.calculateThreePhasePower(
                current1,
                current2,
                current3,
                voltage,
                powerFactor
            );

            device.log(`Calculated power: ${power.toFixed(2)} W`);
            await device.setCapabilityValue("measure_power", power);

            return power;
        } catch (error) {
            device.error('Error calculating power:', error);
            return 0;
        }
    }
}

export default PowerCalculator;