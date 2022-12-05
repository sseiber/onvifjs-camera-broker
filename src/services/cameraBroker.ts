import { service, inject } from 'spryly';
import { Server } from '@hapi/hapi';
import {
    CameraDevice
} from './cameraDevice';
import {
    DeviceMethodRequest,
    DeviceMethodResponse
} from 'azure-iot-device';
import {
    IIotDevicePlugin,
    IDeviceCommandResponse
} from '../plugins/iotDevice';
import { HealthState } from './health';
import {
    OpcPublisherNodesRequest
} from '../common/miab';
import { emptyObj } from 'src/utils';

const ModuleName = 'CameraBrokerService';

enum DeviceCredentialType {
    None = 0,
    X509Certificate = 1,
    SymmetricKey = 2
}

interface IDeviceCredentials {
    idScope?: string;
    primaryKey?: string;
    secondaryKey?: string;
    type?: DeviceCredentialType;
    x509Certificate?: Uint8Array | string;
}

export interface IDeviceProvisionInfo {
    deviceId: string;
    modelId: string;
    deviceCredentials: IDeviceCredentials;
    opcPublisherNodesRequest: OpcPublisherNodesRequest;
}

interface IProvisionResult {
    dpsProvisionStatus: boolean;
    dpsProvisionMessage: string;
    dpsHubConnectionString: string;
    clientConnectionStatus: boolean;
    clientConnectionMessage: string;
    cameraDevice: CameraDevice;
}

enum CameraBrokerCapability {
    evStartVideoStream = 'evStartVideoStream',
    evStopVideoStream = 'evStopVideoStream',
    evInference = 'evInference',
    wpCameraProfile = 'wpCameraProfile',
    cmSendCommand = 'cmSendCommand'
}

interface ICameraBrokerSettings {
    [CameraBrokerCapability.wpCameraProfile]: string;
}

@service('cameraBroker')
export class CameraBrokerService {
    @inject('$server')
    private server: Server;

    private healthState = HealthState.Good;
    private iotDevicePluginModule: IIotDevicePlugin;
    private cameraBrokerSettings: ICameraBrokerSettings = {
        [CameraBrokerCapability.wpCameraProfile]: ''
    };

    public async init(): Promise<void> {
        this.server.log([ModuleName, 'info'], 'initialize');
    }

    public async initializeDevice(): Promise<void> {
        this.server.log([ModuleName, 'info'], `initializeDevice`);

        this.iotDevicePluginModule = this.server.settings.app.iotDevice;
    }

    public async onHandleDeviceProperties(desiredChangedSettings: any): Promise<void> {
        try {
            this.server.log([ModuleName, 'info'], `onHandleDeviceProperties`);
            if (this.iotDevicePluginModule.debugTelemetry()) {
                this.server.log([ModuleName, 'info'], JSON.stringify(desiredChangedSettings, null, 4));
            }

            const patchedProperties = {};

            for (const setting in desiredChangedSettings) {
                if (!Object.prototype.hasOwnProperty.call(desiredChangedSettings, setting)) {
                    continue;
                }

                if (setting === '$version') {
                    continue;
                }

                const value = Object.prototype.hasOwnProperty.call(desiredChangedSettings[setting], 'value')
                    ? desiredChangedSettings[setting].value
                    : desiredChangedSettings[setting];

                switch (setting) {
                    case CameraBrokerCapability.wpCameraProfile:
                        patchedProperties[setting] = {
                            value: (this.cameraBrokerSettings[setting] as any) = value || '',
                            ac: 200,
                            ad: 'completed',
                            av: desiredChangedSettings['$version']
                        };
                        break;

                    default:
                        break;
                }
            }

            if (!emptyObj(patchedProperties)) {
                await this.iotDevicePluginModule.updateDeviceProperties(patchedProperties);
            }
        }
        catch (ex) {
            this.server.log([ModuleName, 'error'], `Exception while handling desired properties: ${ex.message}`);
        }
    }

    public onDeviceConnect(): void {
        this.server.log([ModuleName, 'info'], `The device received a connect event`);
    }

    public onDeviceError(error: Error): void {
        this.server.log([ModuleName, 'error'], `Device client connection error: ${error.message}`);

        this.healthState = HealthState.Critical;
    }

    public async onDeviceReady(): Promise<void> {
        this.server.log([ModuleName, 'info'], `Starting onDeviceReady initializaton`);

        this.healthState = this.iotDevicePluginModule.deviceClient ? HealthState.Good : HealthState.Critical;

        this.iotDevicePluginModule.deviceClient.onDeviceMethod(CameraBrokerCapability.cmSendCommand, this.handleDirectMethod.bind(this));
    }

    public async onHealth(): Promise<HealthState> {
        return this.healthState;
    }

    private async handleDirectMethod(commandRequest: DeviceMethodRequest, commandResponse: DeviceMethodResponse) {
        this.server.log([ModuleName, 'info'], `${commandRequest.methodName} command received`);

        let response: IDeviceCommandResponse = {
            status: 200,
            message: ''
        };

        try {
            switch (commandRequest.methodName) {
                case CameraBrokerCapability.cmSendCommand:
                    response = await this.sendCameraCommand();
                    break;

                default:
                    response.status = 400;
                    response.message = `An unknown method name was found: ${commandRequest.methodName}`;
            }

            this.server.log([ModuleName, 'info'], response.message);
        }
        catch (ex) {
            response.status = 400;
            response.message = `An error occurred executing the command ${commandRequest.methodName}: ${ex.message}`;

            this.server.log([ModuleName, 'error'], response.message);
        }

        await commandResponse.send(200, response);
    }

    private async sendCameraCommand(): Promise<IDeviceCommandResponse> {
        const response: IDeviceCommandResponse = {
            status: 501,
            message: 'Not implemented'
        };

        return response;
    }
}
