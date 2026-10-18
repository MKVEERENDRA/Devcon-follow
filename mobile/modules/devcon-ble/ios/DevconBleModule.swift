import ExpoModulesCore
import CoreBluetooth

private final class DevconBleRadio: NSObject, CBCentralManagerDelegate, CBPeripheralManagerDelegate, CBPeripheralDelegate {
  var emit: ((String, [String: Any]) -> Void)?
  private func sendEvent(_ name: String, _ body: [String: Any]) { emit?(name, body) }
  private let serviceId = CBUUID(string: "6D8F0C10-79A4-4E7A-A25C-100000000001")
  private let tokenId = CBUUID(string: "6D8F0C10-79A4-4E7A-A25C-100000000002")
  private var central: CBCentralManager?
  private var peripheralManager: CBPeripheralManager?
  private var token = ""
  private let peerReadInterval: TimeInterval = 15
  private let maxConcurrentGatt = 4
  private var lastEmittedAt = [String: Date]()
  private var lastReadAt = [UUID: Date]()
  private var connected = [UUID: CBPeripheral]()
  private var running = false

  func start(_ newToken: String) throws {
    try validate(newToken)
    stopRadio()
    token = newToken
    running = true
    central = CBCentralManager(delegate: self, queue: .main)
    peripheralManager = CBPeripheralManager(delegate: self, queue: .main)
  }
  func rotateToken(_ newToken: String) throws {
    try validate(newToken)
    token = newToken
    if peripheralManager?.state == .poweredOn { publishService() }
  }
  private func validate(_ value: String) throws {
    guard value.range(of: "^[A-Za-z0-9_-]{32}$", options: .regularExpression) != nil else {
      throw NSError(domain: "DevconBle", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid ephemeral peer token"])
    }
  }

  public func centralManagerDidUpdateState(_ central: CBCentralManager) {
    guard running else { return }
    if central.state == .poweredOn { central.scanForPeripherals(withServices: [serviceId], options: [CBCentralManagerScanOptionAllowDuplicatesKey: true]) }
    else { sendEvent("onBluetoothState", ["state": "unavailable"]) }
  }

  public func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
    guard running else { return }
    if peripheral.state == .poweredOn { publishService() }
    else { sendEvent("onBluetoothState", ["state": "unavailable"]) }
  }

  private func publishService() {
    guard let manager = peripheralManager, manager.state == .poweredOn else { return }
    manager.stopAdvertising()
    manager.removeAllServices()
    let characteristic = CBMutableCharacteristic(type: tokenId, properties: [.read], value: Data(token.utf8), permissions: [.readable])
    let service = CBMutableService(type: serviceId, primary: true)
    service.characteristics = [characteristic]
    manager.add(service)
  }

  public func peripheralManager(_ peripheral: CBPeripheralManager, didAdd service: CBService, error: Error?) {
    guard running, error == nil else {
      sendEvent("onBluetoothState", ["state": "advertise_error"])
      return
    }
    peripheral.startAdvertising([CBAdvertisementDataServiceUUIDsKey: [serviceId]])
    sendEvent("onBluetoothState", ["state": "active"])
  }

  public func peripheralManagerDidStartAdvertising(_ peripheral: CBPeripheralManager, error: Error?) {
    if let error = error { sendEvent("onBluetoothState", ["state": "advertise_error", "message": error.localizedDescription]) }
  }

  public func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveRead request: CBATTRequest) {
    guard request.characteristic.uuid == tokenId else { peripheral.respond(to: request, withResult: .requestNotSupported); return }
    let bytes = Data(token.utf8)
    guard request.offset <= bytes.count else { peripheral.respond(to: request, withResult: .invalidOffset); return }
    request.value = bytes.subdata(in: request.offset..<bytes.count)
    peripheral.respond(to: request, withResult: .success)
  }

  public func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String: Any], rssi RSSI: NSNumber) {
    guard running, connected.count < maxConcurrentGatt, !connected.keys.contains(peripheral.identifier) else { return }
    let now = Date()
    lastReadAt = lastReadAt.filter { now.timeIntervalSince($0.value) <= 300 }
    if let lastRead = lastReadAt[peripheral.identifier], now.timeIntervalSince(lastRead) < peerReadInterval { return }
    lastReadAt[peripheral.identifier] = now
    connected[peripheral.identifier] = peripheral
    peripheral.delegate = self
    central.connect(peripheral, options: nil)
  }

  public func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
    peripheral.discoverServices([serviceId])
  }

  public func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
    guard error == nil, let service = peripheral.services?.first(where: { $0.uuid == serviceId }) else { central?.cancelPeripheralConnection(peripheral); return }
    peripheral.discoverCharacteristics([tokenId], for: service)
  }

  public func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
    guard error == nil, let characteristic = service.characteristics?.first(where: { $0.uuid == tokenId }) else { central?.cancelPeripheralConnection(peripheral); return }
    peripheral.readValue(for: characteristic)
  }

  public func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
    if error == nil, characteristic.uuid == tokenId, let data = characteristic.value, let value = String(data: data, encoding: .utf8),
       value.range(of: "^[A-Za-z0-9_-]{32}$", options: .regularExpression) != nil, value != token {
      let now = Date()
      lastEmittedAt = lastEmittedAt.filter { now.timeIntervalSince($0.value) <= 180 }
      if let previous = lastEmittedAt[value], now.timeIntervalSince(previous) < peerReadInterval {
        central?.cancelPeripheralConnection(peripheral)
        connected.removeValue(forKey: peripheral.identifier)
        return
      }
      lastEmittedAt[value] = now
      sendEvent("onPeerToken", ["token": value])
    }
    central?.cancelPeripheralConnection(peripheral)
    connected.removeValue(forKey: peripheral.identifier)
  }

  public func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
    connected.removeValue(forKey: peripheral.identifier)
  }

  public func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
    connected.removeValue(forKey: peripheral.identifier)
  }

  func stopRadio() {
    running = false
    central?.stopScan()
    connected.values.forEach { central?.cancelPeripheralConnection($0) }
    peripheralManager?.stopAdvertising()
    peripheralManager?.removeAllServices()
    connected.removeAll(); lastReadAt.removeAll(); lastEmittedAt.removeAll(); token = ""
    central = nil; peripheralManager = nil
    sendEvent("onBluetoothState", ["state": "stopped"])
  }
}

public final class DevconBleModule: Module {
  private let radio = DevconBleRadio()
  public func definition() -> ModuleDefinition {
    Name("DevconBle")
    Events("onPeerToken", "onBluetoothState")
    OnCreate { self.radio.emit = { [weak self] name, body in self?.sendEvent(name, body) } }
    AsyncFunction("start") { (token: String) in try self.radio.start(token) }.runOnQueue(.main)
    AsyncFunction("rotateToken") { (token: String) in try self.radio.rotateToken(token) }.runOnQueue(.main)
    AsyncFunction("stop") { self.radio.stopRadio() }.runOnQueue(.main)
    OnDestroy { DispatchQueue.main.async { self.radio.stopRadio() } }
  }
}
