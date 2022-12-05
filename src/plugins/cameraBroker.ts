import { HapiPlugin, inject } from 'spryly';
import { Server } from '@hapi/hapi';
import {
    IIotDevicePluginOptions,
    iotDevicePluginModule
} from './iotDevice';
import {
    CameraBrokerService
} from '../services/cameraBroker';

declare module '@hapi/hapi' {
    interface ServerOptionsApp {
        cameraBroker?: ICameraBrokerPluginModule;
    }
}

const ModuleName = 'CameraBrokerPluginModule';

export interface IEnvironmentConfig {
    opcPublisherModuleId: string;
    dpsProvisioningHost: string;
}

export interface ICameraBrokerPluginModule {
    environmentConfig: IEnvironmentConfig;
}

export class CameraBrokerPlugin implements HapiPlugin {
    @inject('$server')
    private server: Server;

    @inject('cameraBroker')
    private cameraBroker: CameraBrokerService;

    public async init(): Promise<void> {
        this.server.log([ModuleName, 'info'], `init`);
    }

    public async register(server: Server, _options: any): Promise<void> {
        server.log([ModuleName, 'info'], 'register');

        try {
            server.settings.app.cameraBroker = new CameraBrokerPluginModule(server);

            const pluginOptions: IIotDevicePluginOptions = {
                initializeDevice: this.cameraBroker.initializeDevice.bind(this.cameraBroker),
                onDeviceConnect: this.cameraBroker.onDeviceConnect.bind(this.cameraBroker),
                onHandleDeviceProperties: this.cameraBroker.onHandleDeviceProperties.bind(this.cameraBroker),
                onDeviceError: this.cameraBroker.onDeviceError.bind(this.cameraBroker),
                onDeviceReady: this.cameraBroker.onDeviceReady.bind(this.cameraBroker),
                onHealth: this.cameraBroker.onHealth.bind(this.cameraBroker)
            };

            await server.register([
                {
                    plugin: iotDevicePluginModule,
                    options: pluginOptions
                }
            ]);
        }
        catch (ex) {
            server.log([ModuleName, 'error'], `Error while registering : ${ex.message}`);
        }
    }
}

class CameraBrokerPluginModule implements ICameraBrokerPluginModule {
    // @ts-ignore
    private server: Server;

    constructor(server: Server) {
        this.server = server;
    }

    public environmentConfig: IEnvironmentConfig = {
        opcPublisherModuleId: process.env.opcPublisherModuleId || 'opcpublisher',
        dpsProvisioningHost: process.env.dpsProvisioningHost || 'global.azure-devices-provisioning.net'
    };
}
