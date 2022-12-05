// Original file: proto/discovery.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { DiscoverRequest as _v0_DiscoverRequest, DiscoverRequest__Output as _v0_DiscoverRequest__Output } from '../v0/DiscoverRequest';
import type { DiscoverResponse as _v0_DiscoverResponse, DiscoverResponse__Output as _v0_DiscoverResponse__Output } from '../v0/DiscoverResponse';

export interface DiscoveryHandlerClient extends grpc.Client {
    Discover(argument: _v0_DiscoverRequest, metadata: grpc.Metadata, options?: grpc.CallOptions): grpc.ClientReadableStream<_v0_DiscoverResponse__Output>;
    Discover(argument: _v0_DiscoverRequest, options?: grpc.CallOptions): grpc.ClientReadableStream<_v0_DiscoverResponse__Output>;
    discover(argument: _v0_DiscoverRequest, metadata: grpc.Metadata, options?: grpc.CallOptions): grpc.ClientReadableStream<_v0_DiscoverResponse__Output>;
    discover(argument: _v0_DiscoverRequest, options?: grpc.CallOptions): grpc.ClientReadableStream<_v0_DiscoverResponse__Output>;

}

export interface DiscoveryHandlerHandlers extends grpc.UntypedServiceImplementation {
    Discover: grpc.handleServerStreamingCall<_v0_DiscoverRequest__Output, _v0_DiscoverResponse>;

}

export interface DiscoveryHandlerDefinition extends grpc.ServiceDefinition {
    Discover: MethodDefinition<_v0_DiscoverRequest, _v0_DiscoverResponse, _v0_DiscoverRequest__Output, _v0_DiscoverResponse__Output>
}
