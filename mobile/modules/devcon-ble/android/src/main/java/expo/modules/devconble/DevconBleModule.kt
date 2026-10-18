package expo.modules.devconble

import android.Manifest
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattServer
import android.bluetooth.BluetoothGattServerCallback
import android.bluetooth.BluetoothGattService
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.pm.PackageManager
import android.os.ParcelUuid
import android.os.SystemClock
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

class DevconBleModule : Module() {
  companion object {
    private val SERVICE_UUID: UUID = UUID.fromString("6d8f0c10-79a4-4e7a-a25c-100000000001")
    private val TOKEN_UUID: UUID = UUID.fromString("6d8f0c10-79a4-4e7a-a25c-100000000002")
    private const val PEER_READ_INTERVAL_MS = 15_000L
    private const val MAX_CONCURRENT_GATT = 4
  }

  private var scanner: BluetoothLeScanner? = null
  private var advertiser: BluetoothLeAdvertiser? = null
  private var gattServer: BluetoothGattServer? = null
  @Volatile private var gattServiceReady = false
  private var scanCallback: ScanCallback? = null
  private var advertiseCallback: AdvertiseCallback? = null
  private val gattClients = ConcurrentHashMap<String, BluetoothGatt>()
  @Volatile private var tokenBytes: ByteArray = byteArrayOf()
  private val lastEmittedAt = ConcurrentHashMap<String, Long>()
  private val lastReadAt = ConcurrentHashMap<String, Long>()
  @Volatile private var running = false

  override fun definition() = ModuleDefinition {
    Name("DevconBle")
    Events("onPeerToken", "onBluetoothState")

    Function("start") { token: String ->
      require(token.matches(Regex("^[A-Za-z0-9_-]{32}$"))) { "Invalid ephemeral peer token" }
      startRadio(token)
    }

    Function("rotateToken") { token: String ->
      require(token.matches(Regex("^[A-Za-z0-9_-]{32}$"))) { "Invalid ephemeral peer token" }
      tokenBytes = token.toByteArray(Charsets.UTF_8)
      advertise()
    }

    Function("stop") { stopRadio() }
    OnDestroy { stopRadio() }
  }

  private fun startRadio(token: String) {
    val context = appContext.reactContext ?: throw IllegalStateException("React context unavailable")
    val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
      ?: throw IllegalStateException("Bluetooth is unavailable on this device")
    val bluetooth = manager.adapter ?: throw IllegalStateException("Bluetooth is unavailable on this device")
    if (!bluetooth.isEnabled) throw IllegalStateException("Turn on Bluetooth to discover attendees")
    if (android.os.Build.VERSION.SDK_INT >= 31) {
      val missing = listOf(Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_ADVERTISE, Manifest.permission.BLUETOOTH_CONNECT)
        .filter { context.checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED }
      if (missing.isNotEmpty()) throw SecurityException("Grant Nearby devices permission to use attendee discovery")
    } else if (context.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
      throw SecurityException("Grant location permission to scan for nearby Bluetooth devices")
    }

    stopRadio()
    scanner = bluetooth.bluetoothLeScanner ?: throw IllegalStateException("Bluetooth scanning is unavailable")
    advertiser = bluetooth.bluetoothLeAdvertiser ?: throw IllegalStateException("Bluetooth advertising is unavailable")
    tokenBytes = token.toByteArray(Charsets.UTF_8)
    lastEmittedAt.clear(); lastReadAt.clear()
    val service = BluetoothGattService(SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY)
    service.addCharacteristic(BluetoothGattCharacteristic(TOKEN_UUID, BluetoothGattCharacteristic.PROPERTY_READ, BluetoothGattCharacteristic.PERMISSION_READ))
    gattServer = manager.openGattServer(context, serverCallback) ?: throw IllegalStateException("Could not open Bluetooth service")
    gattServiceReady = false
    running = true
    if (gattServer?.addService(service) != true) {
      stopRadio()
      throw IllegalStateException("Could not publish nearby service")
    }

    val filter = ScanFilter.Builder().setServiceUuid(ParcelUuid(SERVICE_UUID)).build()
    val settings = ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build()
    scanCallback = object : ScanCallback() {
      override fun onScanResult(callbackType: Int, result: ScanResult) {
        if (!running) return
        val device = result.device
        val key = device.address
        val now = SystemClock.elapsedRealtime()
        lastReadAt.keys.toList().forEach { oldKey -> if (now - (lastReadAt[oldKey] ?: now) > 300_000L) lastReadAt.remove(oldKey) }
        val previous = lastReadAt[key]
        if (gattClients.size < MAX_CONCURRENT_GATT && !gattClients.containsKey(key) && (previous == null || now - previous >= PEER_READ_INTERVAL_MS)) {
          lastReadAt[key] = now
          try { gattClients[key] = device.connectGatt(context, false, clientCallback, BluetoothDevice.TRANSPORT_LE) } catch (_: SecurityException) { }
        }
      }
      override fun onScanFailed(errorCode: Int) { sendEvent("onBluetoothState", mapOf("state" to "scan_error", "code" to errorCode)) }
    }
    try {
      scanner?.startScan(listOf(filter), settings, scanCallback)
      sendEvent("onBluetoothState", mapOf("state" to "starting"))
    } catch (error: Exception) {
      stopRadio()
      throw error
    }
  }

  private fun advertise() {
    if (!running || !gattServiceReady) return
    val data = AdvertiseData.Builder().addServiceUuid(ParcelUuid(SERVICE_UUID)).setIncludeDeviceName(false).build()
    val settings = AdvertiseSettings.Builder().setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
      .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM).setConnectable(true).build()
    advertiseCallback?.let { try { advertiser?.stopAdvertising(it) } catch (_: SecurityException) { } }
    advertiseCallback = object : AdvertiseCallback() {
      override fun onStartSuccess(settingsInEffect: AdvertiseSettings) { sendEvent("onBluetoothState", mapOf("state" to "active")) }
      override fun onStartFailure(errorCode: Int) { sendEvent("onBluetoothState", mapOf("state" to "advertise_error", "code" to errorCode)) }
    }
    try {
      advertiser?.startAdvertising(settings, data, advertiseCallback)
    } catch (_: SecurityException) {
      sendEvent("onBluetoothState", mapOf("state" to "permission_denied"))
    } catch (_: Exception) {
      sendEvent("onBluetoothState", mapOf("state" to "advertise_error"))
    }
  }

  private val serverCallback = object : BluetoothGattServerCallback() {
    override fun onServiceAdded(status: Int, service: BluetoothGattService) {
      if (!running || service.uuid != SERVICE_UUID) return
      if (status != BluetoothGatt.GATT_SUCCESS) {
        stopRadio()
        sendEvent("onBluetoothState", mapOf("state" to "gatt_service_error", "code" to status))
        return
      }
      gattServiceReady = true
      advertise()
    }

    override fun onCharacteristicReadRequest(device: BluetoothDevice, requestId: Int, offset: Int, characteristic: BluetoothGattCharacteristic) {
      if (characteristic.uuid != TOKEN_UUID) { gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_REQUEST_NOT_SUPPORTED, offset, null); return }
      val value = tokenBytes
      if (offset > value.size) { gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_INVALID_OFFSET, offset, null); return }
      gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, value.copyOfRange(offset, value.size))
    }
  }

  private val clientCallback = object : BluetoothGattCallback() {
    override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
      if (status != BluetoothGatt.GATT_SUCCESS || newState != BluetoothProfile.STATE_CONNECTED) {
        closeGatt(gatt)
        return
      }
      try {
        if (android.os.Build.VERSION.SDK_INT >= 21 && gatt.requestMtu(64)) return
      } catch (_: SecurityException) { }
      gatt.discoverServices()
    }
    override fun onMtuChanged(gatt: BluetoothGatt, mtu: Int, status: Int) {
      gatt.discoverServices()
    }
    override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) {
      val characteristic = gatt.getService(SERVICE_UUID)?.getCharacteristic(TOKEN_UUID)
      if (status == BluetoothGatt.GATT_SUCCESS && characteristic != null) gatt.readCharacteristic(characteristic) else closeGatt(gatt)
    }
    @Deprecated("Android callback retained for broad device compatibility")
    override fun onCharacteristicRead(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, status: Int) {
      if (status == BluetoothGatt.GATT_SUCCESS && characteristic.uuid == TOKEN_UUID) emitToken(characteristic.value)
      closeGatt(gatt)
    }
    override fun onCharacteristicRead(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, value: ByteArray, status: Int) {
      if (status == BluetoothGatt.GATT_SUCCESS && characteristic.uuid == TOKEN_UUID) emitToken(value)
      closeGatt(gatt)
    }
  }

  private fun emitToken(bytes: ByteArray?) {
    val value = bytes?.toString(Charsets.UTF_8) ?: return
    if (!value.matches(Regex("^[A-Za-z0-9_-]{32}$")) || value.toByteArray().contentEquals(tokenBytes)) return
    val now = SystemClock.elapsedRealtime()
    lastEmittedAt.keys.toList().forEach { key -> if (now - (lastEmittedAt[key] ?: now) > 180_000L) lastEmittedAt.remove(key) }
    val previous = lastEmittedAt[value]
    if (previous == null || now - previous >= PEER_READ_INTERVAL_MS) {
      lastEmittedAt[value] = now
      sendEvent("onPeerToken", mapOf("token" to value))
    }
  }

  private fun closeGatt(gatt: BluetoothGatt) {
    gattClients.remove(gatt.device.address)
    try { gatt.close() } catch (_: Exception) { }
  }

  private fun stopRadio() {
    running = false
    try { scanCallback?.let { scanner?.stopScan(it) } } catch (_: Exception) { }
    try { advertiseCallback?.let { advertiser?.stopAdvertising(it) } } catch (_: Exception) { }
    try { gattServer?.close() } catch (_: Exception) { }
    gattClients.values.toList().forEach { closeGatt(it) }
    scanCallback = null; advertiseCallback = null; gattServer = null; scanner = null; advertiser = null; gattServiceReady = false
    tokenBytes = byteArrayOf(); lastEmittedAt.clear(); lastReadAt.clear()
    sendEvent("onBluetoothState", mapOf("state" to "stopped"))
  }
}
