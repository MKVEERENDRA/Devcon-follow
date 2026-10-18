import {EventEmitter, NativeModule, requireOptionalNativeModule} from 'expo';
import {PermissionsAndroid, Platform} from 'react-native';

type BleEvents = {
  onPeerToken: (event: {token: string}) => void;
  onBluetoothState: (event: {state: string}) => void;
};
type DevconBleModule = NativeModule<BleEvents> & {
  start(token: string): Promise<void>;
  rotateToken(token: string): Promise<void>;
  stop(): Promise<void>;
};

export type ProximityRadio = {rotate: (token: string) => void; stop: () => void};
const nativeBle = requireOptionalNativeModule<DevconBleModule>('DevconBle');
const events = nativeBle as unknown as EventEmitter<BleEvents> | undefined;


export async function startProximityRadio(token: string, onPeerToken: (token: string) => void, onState: (state: string) => void): Promise<ProximityRadio> {
  if (!nativeBle || !events) throw new Error('Bluetooth discovery requires an installed Android or iOS development build.');
  if (Platform.OS === 'android' && Number(Platform.Version) >= 31) {
    const requested = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    if (Object.values(requested).some(value => value !== PermissionsAndroid.RESULTS.GRANTED)) {
      throw new Error('Nearby devices permission is required for Bluetooth discovery.');
    }
  }
  const peerListener = events.addListener('onPeerToken', (event: {token?: unknown}) => {
    if (typeof event?.token === 'string') onPeerToken(event.token);
  });
  const fatalStates = new Set(['unavailable', 'scan_error', 'advertise_error', 'gatt_service_error', 'permission_denied']);
  const stateListener = events.addListener('onBluetoothState', (event: {state?: unknown}) => {
    if (typeof event?.state !== 'string') return;
    onState(event.state);
    if (fatalStates.has(event.state)) {
      try { void Promise.resolve(nativeBle.stop()).catch(()=>{}); } catch { }
    }
  });
  try {
    await nativeBle.start(token);
  } catch (error) {
    peerListener.remove(); stateListener.remove();
    throw error;
  }
  let stopped = false;
  return {
    rotate(nextToken) { if (!stopped) void Promise.resolve(nativeBle.rotateToken(nextToken)).catch(()=>onState('unavailable')); },
    stop() {
      if (stopped) return;
      stopped = true;
      try { void Promise.resolve(nativeBle.stop()).catch(()=>{}); } finally { peerListener.remove(); stateListener.remove(); }
    },
  };
}
