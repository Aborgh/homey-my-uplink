/**
 * Helper class for managing and batching API requests to the heat pump
 * Nibe heat-pumps aren't the greatest at replying to the requests given
 */
export class RequestQueueHelper {
    constructor(device) {
        this.device = device;
        this.pendingRequests = {};
        this.timeout = null;
        this.processingDelay = 500; // ms between batches
        this.minRequestInterval = 5000; // minimum 5 seconds between API calls
        this.lastRequestTime = 0;
    }

    /**
     * Queue a parameter update for batched processing
     * @param {number} parameterId - The parameter ID to update
     * @param {Record<string, number>} value - The value to set
     * @returns {Promise<void>} A promise that resolves when the request is processed
     */
    queueParameterUpdate(parameterId, value) {
        return new Promise((resolve, reject) => {
            // Add to the pending requests queue
            this.pendingRequests[parameterId] = {
                value,
                resolve,
                reject
            };

            if (this.timeout) {
                clearTimeout(this.timeout);
            }
            
            // Set a timeout to process the batched requests
            this.timeout = setTimeout(() => this.processQueue(), this.processingDelay);
        });
    }

    /**
     * Process all queued parameter updates as a single API call
     * @return {Promise<void>}
     */
    async processQueue() {
        if (Object.keys(this.pendingRequests).length === 0) return;

        const now = Date.now();
        // Rate limit handling
        const timeSinceLastRequest = now - this.lastRequestTime;

        if (timeSinceLastRequest < this.minRequestInterval) {
            const delayNeeded = this.minRequestInterval - timeSinceLastRequest;
            this.device.log(`Rate limiting: waiting ${delayNeeded}ms before next request`);

            this.timeout = setTimeout(() => this.processQueue(), delayNeeded);
            return;
        }

        const currentBatch = {...this.pendingRequests};
        this.pendingRequests = {};

        // Create a payload with all the parameter updates
        const payload = {};
        Object.entries(currentBatch).forEach(([parameterId, request]) => {
            payload[parameterId] = request.value;
        });

        try {
            // Send the batch to the heat pump
            this.device.log(`Processing batched request with ${Object.keys(payload).length} parameters: ${JSON.stringify(payload)}`);
            await this.device.oAuth2Client.setParameterValues(this.device.deviceId, payload);
            // Update values in the UI to reflect new values
            this.device.log(`Updating data points for ${Object.keys(payload)} parameters`)
            await this.device.fetchAndSetDataPoints(Object.keys(payload))
            // Update last request time after successful processing
            this.lastRequestTime = Date.now();

            Object.values(currentBatch).forEach(request => {
                request.resolve();
            });
        } catch (error) {
            this.device.error(`Error processing batched request: ${error.message}`);

            Object.values(currentBatch).forEach(request => {
                request.reject(error);
            });
        }
    }

    /**
     * Clear the queue and cancel any pending operations
     */
    clearQueue() {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }

        Object.values(this.pendingRequests).forEach(request => {
            request.reject(new Error('Queue cleared'));
        });

        this.pendingRequests = {};
    }
}

export default RequestQueueHelper;