// Original file: proto/discovery.proto

import type { Mount as _v0_Mount, Mount__Output as _v0_Mount__Output } from '../v0/Mount';
import type { DeviceSpec as _v0_DeviceSpec, DeviceSpec__Output as _v0_DeviceSpec__Output } from '../v0/DeviceSpec';

export interface Device {
    'id'?: (string);
    'properties'?: ({ [key: string]: string });
    'mounts'?: (_v0_Mount)[];
    'deviceSpecs'?: (_v0_DeviceSpec)[];
}

export interface Device__Output {
    'id': (string);
    'properties': ({ [key: string]: string });
    'mounts': (_v0_Mount__Output)[];
    'deviceSpecs': (_v0_DeviceSpec__Output)[];
}
