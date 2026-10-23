export function openRadioSession(options: {
  native: {start(token: string): Promise<void>; rotateToken(token: string): Promise<void>; stop(): Promise<void>};
  events: {addListener(name: 'onPeerToken' | 'onBluetoothState', callback: (event: any) => void): {remove(): void}};
  authorize(): Promise<void>;
  token: string;
  onPeerToken(token: string): void;
  onState(state: string): void;
}): Promise<{rotate(token: string): void; stop(): void}>;
