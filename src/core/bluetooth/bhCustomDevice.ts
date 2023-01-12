import noble, { Peripheral } from "@abandonware/noble";
import { BluetoothDeviceState } from "./bluetoothDeviceEnum";
import { GattSpecification } from "./gattSpecification";
import { BikeDevice } from "./bikeDevice";

export class BhCustomDevice extends BikeDevice {
  lastCrank: number | undefined;
  lastTimestampCrank: number | undefined;

  constructor(
    deviceId: string,
    deviceName: string,
    state: BluetoothDeviceState = BluetoothDeviceState.unknown,
    peripheral: Peripheral | undefined,
    broadcast: boolean = false
  ) {
    super(deviceId, deviceName, state, peripheral, "power", broadcast);
    this.bikeValues = new Map<string, any>();
    this.resistanceRange = undefined;
    this.powerTarget = 10;
    this.resistanceTarget = 10;

    this.lastCrank = undefined;
    this.lastTimestampCrank = undefined;
    this.normalization = "pow";
  }

  static isDevice(peripheral: Peripheral): BhCustomDevice | undefined {
    if (!peripheral) {
      return;
    }
    const currentServices = peripheral.advertisement.serviceUuids;
    const allowedService = GattSpecification.ftms.service;

    if (this.hasService(currentServices, allowedService)) {
      return BhCustomDevice.fromPeripheral(peripheral, false);
    }
  }

  static fromPeripheral(peripheral: noble.Peripheral, broadcast?: boolean) {
    const statePeripheal =
      BluetoothDeviceState[peripheral.state] ||
      BluetoothDeviceState.disconnected;
    const isBroadcast = broadcast || false;
    const id = peripheral.uuid.toLowerCase();

    return new BhCustomDevice(
      id,
      peripheral.advertisement.localName,
      statePeripheal,
      peripheral,
      isBroadcast
    );
  }
}
