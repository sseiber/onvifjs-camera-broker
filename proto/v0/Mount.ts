// Original file: proto/discovery.proto


export interface Mount {
  'containerPath'?: (string);
  'hostPath'?: (string);
  'readOnly'?: (boolean);
}

export interface Mount__Output {
  'containerPath': (string);
  'hostPath': (string);
  'readOnly': (boolean);
}
