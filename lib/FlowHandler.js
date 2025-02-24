'use strict';

class FlowHandler {
    constructor(device) {
        this.device = device;
        this.homey = device.homey;
        this._triggers = new Map();
        this._triggerCache = new Map();
    }

    // Initialize flow handling for numeric capabilities
    async initializeNumericTriggers(capabilities) {
        for (const capability of capabilities) {
            if (typeof this.device.getCapabilityValue(capability) === 'number') {
                const triggerId = `${capability}_changed`;
                this._triggers.set(capability, triggerId);

                const trigger = this.homey.flow.getDeviceTriggerCard(triggerId);
                this._triggerCache.set(triggerId, trigger);
            }
        }
    }

    // Initialize boolean state buttons
    async initializeStateButtons(stateButtons) {
        for (const button of stateButtons) {
            // Register condition card
            const conditionId = `${button}_active`;
            const condition = this.homey.flow.getConditionCard(conditionId);

            condition.registerRunListener(async (args) => {
                return args.device.getCapabilityValue(button);
            });

            // Register action card
            const actionId = `set_${button}`;
            const action = this.homey.flow.getActionCard(actionId);

            action.registerRunListener(async (args) => {
                await args.device.setCapabilityValue(button, args.state);
            });
        }
    }

    // Handle capability value changes
    async handleCapabilityChange(capability, value) {
        const triggerId = this._triggers.get(capability);
        if (triggerId) {
            const trigger = this._triggerCache.get(triggerId);
            if (trigger) {
                const tokens = {
                    [capability]: value
                };
                await trigger.trigger(this.device, tokens);
            }
        }
    }
}

module.exports = FlowHandler;