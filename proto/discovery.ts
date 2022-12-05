import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { DiscoveryHandlerClient as _v0_DiscoveryHandlerClient, DiscoveryHandlerDefinition as _v0_DiscoveryHandlerDefinition } from './v0/DiscoveryHandler';
import type { RegistrationClient as _v0_RegistrationClient, RegistrationDefinition as _v0_RegistrationDefinition } from './v0/Registration';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
    new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
    v0: {
        Device: MessageTypeDefinition
        DeviceSpec: MessageTypeDefinition
        DiscoverRequest: MessageTypeDefinition
        DiscoverResponse: MessageTypeDefinition
        DiscoveryHandler: SubtypeConstructor<typeof grpc.Client, _v0_DiscoveryHandlerClient> & { service: _v0_DiscoveryHandlerDefinition }
        Empty: MessageTypeDefinition
        Mount: MessageTypeDefinition
        RegisterDiscoveryHandlerRequest: MessageTypeDefinition
        Registration: SubtypeConstructor<typeof grpc.Client, _v0_RegistrationClient> & { service: _v0_RegistrationDefinition }
    }
}

