/**
 * Helper class for calculating power consumption based on current measurements or energy deltas
 */
export class PowerCalculator {
    constructor() {
        this.lastEnergyValues = new Map();
        this.lastEnergyTimestamps = new Map();
        this.lastPowerTimestamps = new Map();
    }
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
     * Calculate power from energy delta (lifetime_energy_consumed)
     * 
     * @param {string} deviceId - Unique device identifier
     * @param {number} currentEnergy - Current energy value in kWh
     * @returns {number} The calculated power in watts, or 0 if not enough data
     */
    calculatePowerFromEnergyDelta(deviceId, currentEnergy) {
        const now = Date.now();
        const lastValue = this.lastEnergyValues.get(deviceId);
        const lastTimestamp = this.lastEnergyTimestamps.get(deviceId);

        if (lastValue === undefined || lastTimestamp === undefined) {
            // First reading, store and return 0
            this.lastEnergyValues.set(deviceId, currentEnergy);
            this.lastEnergyTimestamps.set(deviceId, now);
            return 0;
        }

        const energyDeltaKWh = currentEnergy - lastValue;
        const timeDeltaHours = (now - lastTimestamp) / (1000 * 60 * 60);

        // Update stored values
        this.lastEnergyValues.set(deviceId, currentEnergy);
        this.lastEnergyTimestamps.set(deviceId, now);

        // Validate delta (should be positive and reasonable)
        if (energyDeltaKWh < 0 || timeDeltaHours <= 0) {
            return 0;
        }

        // Calculate power: P = ΔE / Δt (convert kWh to Wh)
        const powerW = (energyDeltaKWh * 1000) / timeDeltaHours;

        // Sanity check: power should be reasonable (0-20kW for heat pumps)
        return powerW > 0 && powerW <= 20000 ? powerW : 0;
    }

    /**
     * Calculate and update device power capability based on current measurements or energy delta
     *
     * @param {object} device - The device instance
     */
    async updateDevicePower(device) {
        try {
            // Don't proceed if device doesn't have the measure_power capability
            if (!device.hasCapability('measure_power')) {
                device.log('Skipping power calculation: device does not have measure_power capability');
                return 0;
            }

            const settings = await device.getSettings();
            const { powerFactor = 0.95, voltage = 400 } = settings;

            // Get current measurements from capabilities
            const current1 = device.getCapabilityValue("measure_current.one") || 0;
            const current2 = device.getCapabilityValue("measure_current.two") || 0;
            const current3 = device.getCapabilityValue("measure_current.three") || 0;

            // Check if we have valid current measurements
            const hasValidCurrent = this.isValidCurrent(current1) ||
                                  this.isValidCurrent(current2) ||
                                  this.isValidCurrent(current3);

            let power = 0;

            if (hasValidCurrent) {
                // Use current-based calculation
                power = this.calculateThreePhasePower(
                    current1,
                    current2,
                    current3,
                    voltage,
                    powerFactor
                );
                device.log(`Calculated power from current: ${power.toFixed(2)} W`);
            }

            if (power === 0) {
                const lifetimeEnergy = device.getCapabilityValue("meter_power.lifetime_energy_consumed");
                
                if (lifetimeEnergy !== null && lifetimeEnergy !== undefined) {
                    power = this.calculatePowerFromEnergyDelta(device.getData().id, lifetimeEnergy);
                    device.log(`Calculated power from energy delta: ${power.toFixed(2)} W (lifetime energy: ${lifetimeEnergy} kWh)`);
                } else {
                    device.log('No current measurements or lifetime energy available for power calculation');
                }
            }

            await device.setCapabilityValue("measure_power", power);
            return power;
        } catch (error) {
            device.error('Error calculating power:', error);
            return 0;
        }
    }

    /**
     * Accumulate energy (kWh) from the current measure_power value over elapsed time.
     * Uses trapezoidal-ish integration: energy += power × elapsed hours.
     *
     * @param {object} device - The device instance
     * @returns {Promise<number>} The updated meter_power value in kWh
     */
    async updateMeterPower(device) {
        try {
            if (!device.hasCapability('meter_power')) {
                return 0;
            }

            const deviceId = device.getData().id;
            const now = Date.now();
            const powerW = device.getCapabilityValue('measure_power') || 0;
            const lastTimestamp = this.lastPowerTimestamps.get(deviceId);

            // Store timestamp for next calculation
            this.lastPowerTimestamps.set(deviceId, now);

            if (lastTimestamp === undefined) {
                // First reading — nothing to accumulate yet
                device.log('meter_power: first reading, skipping accumulation');
                return device.getCapabilityValue('meter_power') || 0;
            }

            const elapsedHours = (now - lastTimestamp) / (1000 * 60 * 60);

            // Safety: ignore unreasonable gaps (> 1 hour) to avoid spikes after outages
            if (elapsedHours <= 0 || elapsedHours > 1) {
                device.log(`meter_power: skipping accumulation, elapsed ${elapsedHours.toFixed(3)}h`);
                return device.getCapabilityValue('meter_power') || 0;
            }

            const energyDeltaKWh = (powerW / 1000) * elapsedHours;
            const currentMeterPower = device.getCapabilityValue('meter_power') || 0;
            const newMeterPower = Math.round((currentMeterPower + energyDeltaKWh) * 1000) / 1000;

            await device.setCapabilityValue('meter_power', newMeterPower);
            device.log(`meter_power: +${energyDeltaKWh.toFixed(4)} kWh → ${newMeterPower} kWh (${powerW.toFixed(1)}W × ${elapsedHours.toFixed(3)}h)`);

            return newMeterPower;
        } catch (error) {
            device.error('Error updating meter_power:', error);
            return 0;
        }
    }
}

export default PowerCalculator;