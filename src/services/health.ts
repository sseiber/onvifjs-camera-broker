import { service, inject } from 'spryly';
import { Server } from '@hapi/hapi';
import { bind } from '../utils';

export const healthCheckInterval = 15;
// const healthCheckTimeout = 30;
// const healthCheckStartPeriod = 60;
// const healthCheckRetries = 3;

export enum HealthState {
    Good = 2,
    Warning = 1,
    Critical = 0
}

@service('health')
export class HealthService {
    @inject('$server')
    private server: Server;

    // private heathCheckStartTime = Date.now();
    // private failingStreak = 1;

    public async checkHealthState(): Promise<number> {
        if (!this.server.settings.app.iotDevice) {
            return HealthState.Good;
        }

        const moduleHealth = await this.server.settings.app.iotDevice.getHealth();

        this.server.log(['HealthService', 'info'], `Health check state: ${HealthState[moduleHealth]}`);

        return moduleHealth;
    }
}
