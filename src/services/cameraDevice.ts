import { Server } from '@hapi/hapi';
import { IDeviceProvisionInfo } from './cameraBroker';
import { HealthState } from './health';
import { bind, defer, emptyObj } from '../utils';
import { IDeviceCommandResponse } from 'src/plugins/iotDevice';

interface IClientConnectResult {
    clientConnectionStatus: boolean;
    clientConnectionMessage: string;
}

export enum CameraDeviceCapability {
    rpDeviceId = 'rpDeviceId',
    rpEndpointUrl = 'rpEndpointUrl',
    wpDebugTelemetry = 'wpDebugTelemetry',
    cmTurnOnIndicator = 'cmTurnOnIndicator',
    cmTurnOffIndicator = 'cmTurnOffIndicator'
}

interface ICameraDeviceSettings {
    [CameraDeviceCapability.wpDebugTelemetry]: boolean;
}

export class CameraDevice {
    private server: Server;
    private deviceProvisionInfoInternal: IDeviceProvisionInfo;
    private deviceClient: IoTDeviceClient;
    private deviceTwin: Twin;

    private deferredStart = defer();
    private healthState = HealthState.Good;

    private cameraDeviceSettings: ICameraDeviceSettings = {
        [CameraDeviceCapability.wpDebugTelemetry]: false
    };

    constructor(server: Server, deviceProvisionInfo: IDeviceProvisionInfo) {
        this.server = server;
        this.deviceProvisionInfoInternal = deviceProvisionInfo;
    }

    public get deviceProvisionInfo(): IDeviceProvisionInfo {
        return this.deviceProvisionInfoInternal;
    }

    public async sendOpcPublisherRuntimeEvent(_event: string, _messageJson?: any): Promise<void> {
        return;
    }

    public async processOpcData(data: any): Promise<void> {
        this.server.log([this.deviceProvisionInfo.deviceId, 'info'], `processOpcData`);

        if (!data || !this.deviceClient) {
            this.server.log([this.deviceProvisionInfo.deviceId, 'error'], `Missing data or client not connected`);
            return;
        }

        try {
            await this.sendMessage(data);
        }
        catch (ex) {
            this.server.log([this.deviceProvisionInfo.deviceId, 'error'], `Error processing opc data message: ${ex.message}`);
        }
    }
}
