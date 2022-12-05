/* eslint-disable @typescript-eslint/no-empty-interface */
interface NodeSubscriptionConfiguration {
    displayName?: string;
    nodeId: string;
    publishingIntervalMilliseconds?: number;
    queueSize?: number;
    samplingIntervalMilliseconds?: number;
}

export interface Asset {
    assetId: string;
    deviceCredentials: DeviceCredentials;
    nodes: NodeSubscriptionConfiguration[];
    opcEndpoint: Endpoint;
    publishingIntervalMilliseconds?: number;
    samplingIntervalMilliseconds?: number;
}

enum DeviceCredentialType {
    None = 0,
    X509Certificate = 1,
    SymmetricKey = 2
}

enum EndpointCredentialType {
    Anonymous = 0,
    Username = 1
}

enum SecurityMode {
    Lowest = 0,
    Best = 1
}

interface DeviceCredentials {
    idScope?: string;
    primaryKey?: string;
    secondaryKey?: string;
    type?: DeviceCredentialType;
    x509Certificate?: Uint8Array | string;
}

interface EndpointCredentials {
    credentialType?: EndpointCredentialType;
    password?: string;
    username?: string;
}

interface OpcDataValue {
    serverTimestamp?: Date;
    sourceTimestamp?: Date;
    status?: string;
    value?: any;
}

interface OpcReadNode {
    dataValue?: OpcDataValue;
    nodeId: string;
}

interface OpcWriteNode {
    dataValue: OpcDataValue;
    nodeId: string;
}

interface OpcWriteNodeResult {
    nodeId?: string;
    status?: string;
}

export interface Endpoint {
    credentials?: EndpointCredentials;
    securityMode?: SecurityMode;
    uri: string;
}

export interface TestConnectionRequest {
    opcEndpoint: Endpoint;
}

export interface TestConnectionResponse {
}

export interface AddOrUpdateAssetRequest {
    asset: Asset;
    skipNodeValidation?: boolean;
}

export interface AddOrUpdateAssetResponse {
}

export interface RemoveAssetRequest {
    assetId: string;
}

export interface RemoveAssetResponse {
}

export interface ReadValuesRequest {
    opcEndpoint: Endpoint;
    opcReadNodes: OpcReadNode[];
}

export interface ReadValuesResponse {
    opcReadNodes?: OpcReadNode[];
}

export interface WriteValuesRequest {
    opcEndpoint: Endpoint;
    opcWriteNodes: OpcWriteNode[];
}

export interface WriteValuesResponse {
    opcWriteNodes?: OpcWriteNodeResult[];
}

//
// OPC Publisher defined data structures
//

enum OpcAuthenticationMode {
    Anonymous = 'Anonymous',
    UsernamePassword = 'UsernamePassword'
}

interface OpcPublisherNode {
    Id: string;
    ExpandedNodeId?: string;
    OpcSamplingInterval?: number;
    OpcSamplingIntervalTimespan?: string;
    OpcPublishingInterval?: number;
    OpcPublishingIntervalTimespan?: string;
    DataSetFieldId?: string;
    DisplayName?: string;
    HeartbeatInterval?: number;
    HeartbeatIntervalTimespan?: string;
    QueueSize?: number;
}

export interface OpcPublisherNodesRequest {
    EndpointUrl: string;
    UseSecurity?: boolean;
    OpcAuthenticationMode?: OpcAuthenticationMode;
    UserName?: string;
    Password?: string;
    DataSetWriterGroup?: string;
    DataSetWriterId?: string;
    DataSetPublishingInterval?: number;
    DataSetPublishingIntervalTimespan?: string;
    Tag?: string;
    OpcNodes?: OpcPublisherNode[];
}
