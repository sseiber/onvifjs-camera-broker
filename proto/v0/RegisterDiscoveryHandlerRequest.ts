// Original file: proto/discovery.proto


// Original file: proto/discovery.proto

export enum _v0_RegisterDiscoveryHandlerRequest_EndpointType {
    UDS = 0,
    NETWORK = 1,
}

export interface RegisterDiscoveryHandlerRequest {
    'name'?: (string);
    'endpoint'?: (string);
    'endpointType'?: (_v0_RegisterDiscoveryHandlerRequest_EndpointType | keyof typeof _v0_RegisterDiscoveryHandlerRequest_EndpointType);
    'shared'?: (boolean);
}

export interface RegisterDiscoveryHandlerRequest__Output {
    'name': (string);
    'endpoint': (string);
    'endpointType': (keyof typeof _v0_RegisterDiscoveryHandlerRequest_EndpointType);
    'shared': (boolean);
}
