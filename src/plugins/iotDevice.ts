import { Server, Plugin } from '@hapi/hapi';
import { Mqtt as IoTHubTransport } from 'azure-iot-device-mqtt';
import { SymmetricKeySecurityClient } from 'azure-iot-security-symmetric-key';
import {
    RegistrationResult,
    ProvisioningDeviceClient
} from 'azure-iot-provisioning-device';
import { Mqtt as ProvisioningTransport } from 'azure-iot-provisioning-device-mqtt';
import {
    Client as DeviceClient,
    Twin,
    Message as IoTMessage,
    DeviceMethodRequest,
    DeviceMethodResponse
} from 'azure-iot-device';
import {
    arch as osArch,
    hostname as osHostname,
    platform as osPlatform,
    type as osType,
    release as osRelease,
    version as osVersion,
    cpus as osCpus,
    freemem as osFreeMem,
    loadavg as osLoadAvg
} from 'os';
import { HealthState } from '../services/health';
import { defer, sleep } from '../utils';

declare module '@hapi/hapi' {
    interface ServerOptionsApp {
        iotDevice?: IIotDevicePlugin;
    }
}

const PluginName = 'IotDevicePlugin';
const ModuleName = 'IotDevicePluginModule';
const defaultHealthCheckRetries = 3;

export enum DeviceCredentialType {
    None = 0,
    X509Certificate = 1,
    SymmetricKey = 2
}

export interface IDeviceCredentials {
    idScope?: string;
    primaryKey?: string;
    secondaryKey?: string;
    type?: DeviceCredentialType;
    x509Certificate?: Uint8Array | string;
}

export interface IDeviceProvisionInfo {
    deviceId: string;
    deviceCredentials: IDeviceCredentials;
}

export interface IProvisionResult {
    dpsProvisionStatus: boolean;
    dpsProvisionMessage: string;
    dpsHubConnectionString: string;
    clientConnectionStatus: boolean;
    clientConnectionMessage: string;
}

export interface IClientConnectResult {
    clientConnectionStatus: boolean;
    clientConnectionMessage: string;
}

export interface IIotDevicePluginOptions {
    initializeDevice(): Promise<void>;
    onHandleDeviceProperties(desiredProps: any): Promise<void>;
    onDeviceConnect?(): void;
    onDeviceDisconnect?(): void;
    onDeviceError?(error: Error): void;
    onDeviceReady(): Promise<void>;
    onHealth(): Promise<HealthState>;
}

export interface IIotDevicePlugin {
    deviceId: string;
    deviceClient: DeviceClient;
    debugTelemetry(): boolean;
    getHealth(): Promise<HealthState>;
    sendMessage(data: any, outputName?: string): Promise<void>;
    updateDeviceProperties(properties: any): Promise<void>;
}

export const iotDevicePluginModule: Plugin<any> = {
    name: 'IotDevicePluginModule',

    register: async (server: Server, options: IIotDevicePluginOptions): Promise<void> => {
        server.log([PluginName, 'info'], 'register');

        if (!options.onHealth) {
            throw new Error('Missing required option onHealth in IotDeviceModuleOptions');
        }

        if (!options.onHandleDeviceProperties) {
            throw new Error('Missing required option onHandleDeviceProperties in IotDeviceModuleOptions');
        }

        if (!options.onDeviceReady) {
            throw new Error('Missing required option onDeviceReady in IotDeviceModuleOptions');
        }

        const plugin = new IotDevicePluginModule(server, options);

        server.settings.app.iotDevice = plugin;

        await plugin.startDevice();
    }
};

interface ISystemProperties {
    cpuModel: string;
    cpuCores: number;
    cpuUsage: number;
    freeMemory: number;
}

enum IotcEdgeHostDevicePropNames {
    Hostname = 'hostname',
    ProcessorArchitecture = 'processorArchitecture',
    Platform = 'platform',
    OsType = 'osType',
    OsName = 'osName',
    SwVersion = 'swVersion'
}

interface IRestartDeviceCommandRequestParams {
    timeout: number;
}

export interface IDeviceCommandResponse {
    status: number;
    message: string;
    payload?: any;
}

enum IotDeviceCapability {
    evDeviceStarted = 'evDeviceStarted',
    evDeviceStopped = 'evDeviceStopped',
    evDeviceRestart = 'evDeviceRestart',
    wpDebugTelemetry = 'wpDebugTelemetry',
    cmRestartDevice = 'cmRestartDevice'
}

interface IIotDeviceSettings {
    [IotDeviceCapability.wpDebugTelemetry]: boolean;
}

class IotDevicePluginModule implements IIotDevicePlugin {
    private server: Server;
    private deviceTwin: Twin = null;
    private deferredStart = defer();
    private options: IIotDevicePluginOptions;
    private healthCheckRetries: number = defaultHealthCheckRetries;
    private healthState = HealthState.Good;
    private healthCheckFailStreak = 0;
    private deviceSettings: IIotDeviceSettings = {
        [IotDeviceCapability.wpDebugTelemetry]: true
    };

    constructor(server: Server, options: IIotDevicePluginOptions) {
        this.server = server;
        this.options = options;
    }

    public async startDevice(): Promise<boolean> {
        let result = false;

        try {
            await this.options.initializeDevice();

            const provisionResult = await this.connectDevice(deviceProvisionInfo);

            if (provisionResult.dpsProvisionStatus && provisionResult.clientConnectionStatus) {
                await this.deferredStart.promise;

                await this.options.onDeviceReady();

                this.healthCheckRetries = Number(process.env.healthCheckRetries) || defaultHealthCheckRetries;

                await this.updateDeviceProperties({
                    [IotcEdgeHostDevicePropNames.ProcessorArchitecture]: osArch() || 'Unknown',
                    [IotcEdgeHostDevicePropNames.Hostname]: osHostname() || 'Unknown',
                    [IotcEdgeHostDevicePropNames.Platform]: osPlatform() || 'Unknown',
                    [IotcEdgeHostDevicePropNames.OsType]: osType() || 'Unknown',
                    [IotcEdgeHostDevicePropNames.OsName]: osRelease() || 'Unknown',
                    [IotcEdgeHostDevicePropNames.SwVersion]: osVersion() || 'Unknown'
                });

                await this.sendMessage({
                    [IotDeviceCapability.evDeviceStarted]: 'Device initialization'
                });
            }
            else {
                result = false;

                this.server.log([ModuleName, 'info'], `clientConnectionStatus: ${provisionResult.clientConnectionStatus}, clientConnectionMessage: ${provisionResult.clientConnectionMessage}`);
            }
        }
        catch (ex) {
            result = false;

            this.server.log([ModuleName, 'error'], `Exception while starting IotDevice plugin: ${ex.message}`);
        }

        return result;
    }

    public deviceId: string = process.env.IOTEDGE_DEVICEID || '';
    public deviceClient: DeviceClient = null;

    public debugTelemetry(): boolean {
        return this.deviceSettings[IotDeviceCapability.wpDebugTelemetry];
    }

    public async getHealth(): Promise<HealthState> {
        if (!this.deviceClient) {
            return this.healthState;
        }

        let healthState = this.healthState;

        try {
            if (healthState === HealthState.Good) {
                const systemProperties = await this.getSystemProperties();
                const freeMemory = systemProperties?.freeMemory || 0;

                // TODO:
                // Find the right threshold for this metric
                if (freeMemory === 0) {
                    healthState = HealthState.Critical;
                }
                else {
                    healthState = await this.options.onHealth();
                }
            }

            this.healthState = healthState;
        }
        catch (ex) {
            this.server.log([ModuleName, 'error'], `Error in healthState (may indicate a critical issue): ${ex.message}`);
            this.healthState = HealthState.Critical;
        }

        if (this.healthState < HealthState.Good) {
            this.server.log([ModuleName, 'warning'], `Health check warning: ${HealthState[healthState]}`);

            if (++this.healthCheckFailStreak >= this.healthCheckRetries) {
                this.server.log([ModuleName, 'warning'], `Health check too many warnings: ${healthState}`);

                await this.restartDevice(0, 'checkHealthState');
            }
        }

        return this.healthState;
    }

    public async sendMessage(data: any): Promise<void> {
        if (!data || !this.deviceClient) {
            return;
        }

        try {
            const iotcMessage = new IoTMessage(JSON.stringify(data));

            await this.deviceClient.sendEvent(iotcMessage);

            if (this.debugTelemetry()) {
                this.server.log([ModuleName, 'info'], `sendMessage: ${JSON.stringify(data, null, 4)}`);
            }
        }
        catch (ex) {
            this.server.log([ModuleName, 'error'], `sendMessage: ${ex.message}`);
        }
    }

    public async updateDeviceProperties(properties: any): Promise<void> {
        if (!properties || !this.deviceTwin) {
            return;
        }

        try {
            await new Promise((resolve, reject) => {
                this.deviceTwin.properties.reported.update(properties, (error) => {
                    if (error) {
                        return reject(error);
                    }

                    return resolve('');
                });
            });

            if (this.debugTelemetry()) {
                this.server.log([ModuleName, 'info'], `Device live properties updated: ${JSON.stringify(properties, null, 4)}`);
            }
        }
        catch (ex) {
            this.server.log([ModuleName, 'error'], `Error while updating client properties: ${ex.message}`);
        }
    }

    private async connectDevice(deviceProvisionInfo: IDeviceProvisionInfo, cachedDpsConnectionString?: string): Promise<IProvisionResult> {
        this.server.log([ModuleName, 'info'], `Provisioning deviceId: ${deviceProvisionInfo.deviceId}`);

        const deviceProvisionResult: IProvisionResult = {
            dpsProvisionStatus: false,
            dpsProvisionMessage: '',
            dpsHubConnectionString: '',
            clientConnectionStatus: false,
            clientConnectionMessage: ''
        };

        try {
            let dpsConnectionString = cachedDpsConnectionString;

            if (!dpsConnectionString) {
                const provisioningSecurityClient = new SymmetricKeySecurityClient(deviceProvisionInfo.deviceId, deviceProvisionInfo.deviceCredentials.primaryKey);
                const provisioningClient = ProvisioningDeviceClient.create(
                    this.server.settings.app.cameraBroker.environmentConfig.dpsProvisioningHost,
                    deviceProvisionInfo.deviceCredentials.idScope,
                    new ProvisioningTransport(),
                    provisioningSecurityClient);

                const dpsResult = await provisioningClient.register();

                const hostnameSegment = `HostName=${(dpsResult as RegistrationResult).assignedHub}`;
                const deviceIdSegment = `DeviceId=${(dpsResult as RegistrationResult).deviceId}`;
                const securitySegment = `SharedAccessKey=${deviceProvisionInfo.deviceCredentials.primaryKey}`;

                dpsConnectionString = `${hostnameSegment};${deviceIdSegment};${securitySegment}`;

                this.server.log([ModuleName, 'info'], `register device client succeeded`);
            }

            deviceProvisionResult.dpsProvisionStatus = true;
            deviceProvisionResult.dpsProvisionMessage = `IoT Central successfully provisioned device: ${deviceProvisionInfo.deviceId}`;
            deviceProvisionResult.dpsHubConnectionString = dpsConnectionString;

            const { clientConnectionStatus, clientConnectionMessage } = await this.connectDeviceInternal(dpsConnectionString);

            this.server.log([ModuleName, 'info'], `clientConnectionStatus: ${clientConnectionStatus}, clientConnectionMessage: ${clientConnectionMessage}`);

            deviceProvisionResult.clientConnectionStatus = clientConnectionStatus;
            deviceProvisionResult.clientConnectionMessage = clientConnectionMessage;
        }
        catch (ex) {
            deviceProvisionResult.dpsProvisionStatus = false;
            deviceProvisionResult.dpsProvisionMessage = `Error while provisioning device: ${ex.message}`;

            this.server.log([ModuleName, 'error'], deviceProvisionResult.dpsProvisionMessage);
        }

        return deviceProvisionResult;
    }

    private async connectDeviceInternal(dpsHubConnectionString: string): Promise<IClientConnectResult> {
        const result: IClientConnectResult = {
            clientConnectionStatus: false,
            clientConnectionMessage: ''
        };

        if (this.deviceClient) {
            if (this.deviceTwin) {
                this.deviceTwin.removeAllListeners();
            }

            if (this.deviceClient) {
                this.deviceTwin.removeAllListeners();

                await this.deviceClient.close();
            }

            this.deviceClient = null;
            this.deviceTwin = null;
        }

        try {
            this.deviceClient = await DeviceClient.fromConnectionString(dpsHubConnectionString, IoTHubTransport);

            if (!this.deviceClient) {
                result.clientConnectionStatus = false;
                result.clientConnectionMessage = `Failed to connect device client interface from connection string - device: ${this.deviceProvisionInfo.deviceId}`;
            }
            else {
                result.clientConnectionStatus = true;
                result.clientConnectionMessage = `Successfully connected to IoT Central - device: ${this.deviceProvisionInfo.deviceId}`;
            }
        }
        catch (ex) {
            result.clientConnectionStatus = false;
            result.clientConnectionMessage = `Failed to instantiate client interface from configuration: ${ex.message}`;

            this.server.log([this.deviceProvisionInfo.deviceId, 'error'], `${result.clientConnectionMessage}`);
        }

        if (result.clientConnectionStatus === false) {
            return result;
        }

        try {
            this.deviceClient.on('connect', this.onDeviceConnect.bind(this));
            this.deviceClient.on('disconnect', this.onDeviceDisconnect.bind(this));
            this.deviceClient.on('error', this.onDeviceError.bind(this));

            this.deviceClient.onDeviceMethod(IotDeviceCapability.cmRestartDevice, this.handleDirectMethod.bind(this));

            await this.deviceClient.open();

            this.deviceTwin = await this.deviceClient.getTwin();
            this.deviceTwin.on('properties.desired', this.onHandleDeviceProperties.bind(this));

            result.clientConnectionStatus = true;
        }
        catch (ex) {
            result.clientConnectionStatus = false;
            result.clientConnectionMessage = `IoT Central connection error: ${ex.message}`;

            this.server.log([this.deviceProvisionInfo.deviceId, 'error'], result.clientConnectionMessage);
        }

        return result;
    }

    private async onHandleDeviceProperties(desiredChangedSettings: any): Promise<void> {
        if (!this.deviceClient) {
            return;
        }

        this.server.log([ModuleName, 'info'], `onHandleDeviceProperties`);
        if (this.debugTelemetry()) {
            this.server.log([ModuleName, 'info'], `desiredChangedSettings:\n${JSON.stringify(desiredChangedSettings, null, 4)}`);
        }

        await this.options.onHandleDeviceProperties(desiredChangedSettings);

        try {
            const patchedProperties = {};

            for (const setting in desiredChangedSettings) {
                if (!Object.prototype.hasOwnProperty.call(desiredChangedSettings, setting)) {
                    continue;
                }

                if (setting === '$version') {
                    continue;
                }

                const value = desiredChangedSettings[setting];

                switch (setting) {
                    case IotDeviceCapability.wpDebugTelemetry:
                        patchedProperties[setting] = {
                            value: this.deviceSettings[setting] = value || false,
                            ac: 200,
                            ad: 'completed',
                            av: desiredChangedSettings['$version']
                        };
                        break;

                    default:
                        this.server.log([ModuleName, 'warning'], `Received desired property change for unknown setting '${setting}'`);
                        break;
                }
            }

            if (Object.prototype.hasOwnProperty.call(patchedProperties, 'value')) {
                await this.updateDeviceProperties(patchedProperties);
            }
        }
        catch (ex) {
            this.server.log([ModuleName, 'error'], `Exception while handling desired properties: ${ex.message}`);
        }

        this.deferredStart.resolve();
    }

    private onDeviceConnect() {
        if (this.options.onDeviceConnect) {
            this.options.onDeviceConnect();
        }
        else {
            this.server.log([ModuleName, 'info'], `The device received a connect event`);
        }
    }

    private async onDeviceDisconnect(): Promise<void> {
        try {
            if (this.deviceTwin) {
                this.deviceTwin.removeAllListeners();
            }

            if (this.deviceClient) {
                this.deviceClient.removeAllListeners();

                await this.deviceClient.close();
            }

            this.deviceClient = null;
            this.deviceTwin = null;

            if (this.options.onDeviceDisconnect) {
                this.options.onDeviceDisconnect();
            }
            else {
                this.server.log([ModuleName, 'info'], `The device received a disconnect event`);
            }
        }
        catch (ex) {
            this.server.log([ModuleName, 'info'], `Error during device disconnect handler`);
        }
    }

    private onDeviceError(error: Error) {
        try {
            this.deviceClient = null;
            this.deviceTwin = null;

            if (this.options.onDeviceError) {
                this.options.onDeviceError(error);
            }
            else {
                this.server.log([ModuleName, 'error'], `Device client connection error: ${error.message} `);
            }
        }
        catch (ex) {
            this.server.log([ModuleName, 'error'], `Device client connection error: ${ex.message} `);
        }
    }

    private async handleDirectMethod(commandRequest: DeviceMethodRequest, commandResponse: DeviceMethodResponse) {
        this.server.log([ModuleName, 'info'], `${commandRequest.methodName} command received`);

        const response: IDeviceCommandResponse = {
            status: 200,
            message: ''
        };

        try {
            switch (commandRequest.methodName) {
                case IotDeviceCapability.cmRestartDevice:
                    await this.restartDevice((commandRequest?.payload as IRestartDeviceCommandRequestParams)?.timeout || 0, 'RestartDevice command received');

                    response.status = 200;
                    response.message = 'Restart device request received';
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

    private async restartDevice(timeout: number, reason: string): Promise<void> {
        this.server.log([ModuleName, 'info'], `restartDevice`);

        try {
            await this.sendMessage({
                [IotDeviceCapability.evDeviceRestart]: reason,
                [IotDeviceCapability.evDeviceStopped]: 'Device restart'
            });

            await sleep(1000 * timeout);
        }
        catch (ex) {
            this.server.log([ModuleName, 'error'], `${ex.message}`);
        }

        // let Docker restart our container after 5 additional seconds to allow responses to this method to return
        setTimeout(() => {
            this.server.log([ModuleName, 'info'], `Shutting down main process - device container will restart`);
            process.exit(1);
        }, 1000 * 5);
    }

    private async getSystemProperties(): Promise<ISystemProperties> {
        const cpus = osCpus();
        const cpuUsageSamples = osLoadAvg();

        return {
            cpuModel: cpus[0]?.model || 'Unknown',
            cpuCores: cpus?.length || 0,
            cpuUsage: cpuUsageSamples[0],
            freeMemory: osFreeMem() / 1024
        };
    }
}
