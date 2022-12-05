// Original file: proto/discovery.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { Empty as _v0_Empty, Empty__Output as _v0_Empty__Output } from '../v0/Empty';
import type { RegisterDiscoveryHandlerRequest as _v0_RegisterDiscoveryHandlerRequest, RegisterDiscoveryHandlerRequest__Output as _v0_RegisterDiscoveryHandlerRequest__Output } from '../v0/RegisterDiscoveryHandlerRequest';

export interface RegistrationClient extends grpc.Client {
    RegisterDiscoveryHandler(argument: _v0_RegisterDiscoveryHandlerRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_v0_Empty__Output>): grpc.ClientUnaryCall;
    RegisterDiscoveryHandler(argument: _v0_RegisterDiscoveryHandlerRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_v0_Empty__Output>): grpc.ClientUnaryCall;
    RegisterDiscoveryHandler(argument: _v0_RegisterDiscoveryHandlerRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_v0_Empty__Output>): grpc.ClientUnaryCall;
    RegisterDiscoveryHandler(argument: _v0_RegisterDiscoveryHandlerRequest, callback: grpc.requestCallback<_v0_Empty__Output>): grpc.ClientUnaryCall;
    registerDiscoveryHandler(argument: _v0_RegisterDiscoveryHandlerRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_v0_Empty__Output>): grpc.ClientUnaryCall;
    registerDiscoveryHandler(argument: _v0_RegisterDiscoveryHandlerRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_v0_Empty__Output>): grpc.ClientUnaryCall;
    registerDiscoveryHandler(argument: _v0_RegisterDiscoveryHandlerRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_v0_Empty__Output>): grpc.ClientUnaryCall;
    registerDiscoveryHandler(argument: _v0_RegisterDiscoveryHandlerRequest, callback: grpc.requestCallback<_v0_Empty__Output>): grpc.ClientUnaryCall;

}

export interface RegistrationHandlers extends grpc.UntypedServiceImplementation {
    RegisterDiscoveryHandler: grpc.handleUnaryCall<_v0_RegisterDiscoveryHandlerRequest__Output, _v0_Empty>;

}

export interface RegistrationDefinition extends grpc.ServiceDefinition {
    RegisterDiscoveryHandler: MethodDefinition<_v0_RegisterDiscoveryHandlerRequest, _v0_Empty, _v0_RegisterDiscoveryHandlerRequest__Output, _v0_Empty__Output>
}
