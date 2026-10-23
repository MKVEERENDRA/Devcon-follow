// Shared by the native adapter and executable sandbox tests. A failed radio
// terminates only Bluetooth; the caller can keep its consented GPS fallback.
export async function openRadioSession({native, events, authorize, token, onPeerToken, onState}) {
  await authorize();
  let stopped = false;
  const listeners = [];
  const stop = () => {
    if (stopped) return;
    stopped = true;
    for (const listener of listeners) listener.remove();
    try { void Promise.resolve(native.stop()).catch(() => {}); } catch {}
  };
  const fail = state => {
    if (stopped) return;
    stop();
    onState(state);
  };
  const fatal = new Set(['unavailable', 'scan_error', 'advertise_error', 'gatt_service_error', 'permission_denied']);
  try {
    listeners.push(events.addListener('onPeerToken', event => {
      if (!stopped && typeof event?.token === 'string') onPeerToken(event.token);
    }));
    listeners.push(events.addListener('onBluetoothState', event => {
      if (stopped || typeof event?.state !== 'string') return;
      if (fatal.has(event.state)) fail(event.state);
      else onState(event.state);
    }));
    await native.start(token);
  } catch (error) {
    stop();
    throw error;
  }
  return {
    rotate(nextToken) {
      if (stopped) return;
      try { void Promise.resolve(native.rotateToken(nextToken)).catch(() => fail('unavailable')); }
      catch { fail('unavailable'); }
    },
    stop,
  };
}
