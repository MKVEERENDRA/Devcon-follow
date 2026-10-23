import {EventEmitter, NativeModule, requireOptionalNativeModule} from 'expo';
import {PermissionsAndroid, Platform} from 'react-native';
import {openRadioSession} from './radio-session';

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
  return openRadioSession({native: nativeBle, events, token, onPeerToken, onState, authorize: async () => {
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
  }});
}
