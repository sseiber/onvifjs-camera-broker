import { ComposeManifest } from 'spryly';
import { resolve as pathResolve } from 'path';

const DefaultPort = 9070;
const PORT = process.env.PORT || process.env.port || process.env.PORT0 || process.env.port0 || DefaultPort;

declare module '@hapi/hapi' {
    interface ServerOptionsApp {
        rootDirectory: string;
        storageRootDirectory: string;
        slogan: string;
    }
}

export function manifest(_config?: any): ComposeManifest {
    return {
        server: {
            port: PORT,
            app: {
                rootDirectory: pathResolve(__dirname, '..'),
                storageRootDirectory: process.env.DATAMISC_ROOT || '/data/storage',
                slogan: 'AVA Edge Gateway Module'
            }
        },
        services: [
            './services'
        ],
        plugins: [
            ...[
                {
                    plugin: './plugins'
                }
            ],
            ...[
                {
                    plugin: './apis'
                }
            ]
        ]
    };
}
