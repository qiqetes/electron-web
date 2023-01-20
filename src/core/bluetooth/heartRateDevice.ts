var AsyncLock = require("async-lock");

import noble, { Advertisement, Peripheral } from "@abandonware/noble";
import { mainWindow } from "../../index";
import { bufferToListInt } from "./bluetoothDataParser";
import {
  BluetoothDeviceState,
  BluetoothDeviceTypes,
} from "./bluetoothDeviceEnum";
import { BluetoothFeatures } from "./bluetoothFeatures";
import { GattSpecification } from "./gattSpecification";
import { BluetoothDevice } from "./bluetoothDevice";

const parserType: BluetoothParserType = "heartrate";

export class HeartRateDevice extends BluetoothDevice {
  heartRateValue: number | undefined;

  constructor(
    deviceId: string,
    deviceName: string,
    state: BluetoothDeviceState = BluetoothDeviceState.unknown,
    peripheral: Peripheral | undefined,
    broadcast: boolean = false
  ) {
    super(
      deviceId,
      deviceName,
      BluetoothDeviceTypes.HeartRate,
      state,
      peripheral,
      "heartrate",
      broadcast
    );

    this.heartRateValue = undefined;
  }

  static fromPeripheral(peripheral: noble.Peripheral, broadcast?: boolean) {
    const statePeripheal =
      BluetoothDeviceState[peripheral.state] ||
      BluetoothDeviceState.disconnected;
    const isBroadcast = broadcast || false;
    const id = peripheral.uuid.toLowerCase();

    return new HeartRateDevice(
      id,
      peripheral.advertisement.localName,
      statePeripheal,
      peripheral,
      isBroadcast
    );
  }
  static fromBluetoothDevice(
    device: BluetoothDevice,
    broadcast?: boolean
  ) {
    const isBroadcast = broadcast||false;

    return new HeartRateDevice(
      device.id,
      device.name,
      device.state,
      undefined,
      isBroadcast,
    );
  }
  static isDevice(peripheral:Peripheral):HeartRateDevice|undefined {
    if(!peripheral){
      return
    }
    //Si tiene servicio de bicicleta, es una bicicleta, no un pulsómetro
    if (
      this.hasService(
        peripheral.advertisement.serviceUuids,
        GattSpecification.ftms.service
      )
    )
      return;

    let broadcast = false;
    const currentServices = peripheral.advertisement.serviceUuids;
    const allowedService = GattSpecification.heartRate.service;
    const currentName = peripheral.advertisement.localName;
    const allowedNames = GattSpecification.heartRate.allowedNames;

    if (!this.hasService(currentServices, allowedService)) {
      if (
        !this.hasName(currentName, allowedNames) ||
        !peripheral.advertisement.manufacturerData
      ) {
        return;
      } else {
        broadcast = true;
      }
    }
    return HeartRateDevice.fromPeripheral(peripheral, broadcast);
  }

  static isDeviceChromium(device:BluetoothDevice, uuids:string[],advertisement?:Buffer ):HeartRateDevice|undefined {
    if(!device){
      return
    }
    //Si tiene servicio de bicicleta, es una bicicleta, no un pulsómetro
    if(this.hasService(uuids, GattSpecification.ftms.service))
    return;

    let broadcast = false;
    const currentServices = uuids;
    const allowedService = GattSpecification.heartRate.service;
    const currentName = device.name;
    const allowedNames = GattSpecification.heartRate.allowedNames;

    if (!this.hasService(currentServices, allowedService)){
      if(!this.hasName(currentName,allowedNames) || !advertisement){
        return;
      }else{
        broadcast = true;
      }
    }

    const dev = HeartRateDevice.fromBluetoothDevice(device, broadcast);
    dev.currentServices = uuids;
    return dev;
  }

  static fromKnwonDevice(device: KnownDevice) {
    const statePeripheal = BluetoothDeviceState.unknown;

    return new HeartRateDevice(
      device.id,
      device.name,
      BluetoothDeviceState.unknown,
      undefined,
      device.broadcast
    );
  }

  setAdvertisment(advertisement: noble.Advertisement): void {
    const values = bufferToListInt(advertisement.manufacturerData);
    this.heartRateValue = values.at(-1);
    if (this.state == BluetoothDeviceState.connected) {
      mainWindow.webContents.send(
        "heartRateData-" + this.id,
        this.heartRateValue
      );
    }
  }

  getValues() {
    return this.heartRateValue;
  }

  async startNotify(): Promise<void> {
    if (!this.peripheral) {
      return;
    }
    // this.peripheral.removeAllListeners("notify");
    if (this.deviceType == "heartrate") {
      const characteristic = await this.getMeasurement(
        GattSpecification.heartRate.service,
        GattSpecification.heartRate.measurements.heartRate
      );

      if (characteristic != null) {
        this.notify(characteristic, (state: Buffer) => {
          this.readDataFromBuffer('',state);
        });
      }
    }
  }

  async getFeatures(): Promise<string[] | undefined> {
    this.features = [BluetoothFeatures.HeartRate];
    return this.features;
  }

  readDataFromBuffer(uuid:string, values:Buffer){
    const buffer = Buffer.from(values);
    var data = buffer.readInt8(1); //heart rate measurement
    if (data >= 0) {
      this.heartRateValue = data;
      mainWindow.webContents.send("heartRateData-" + this.id, data);
    }
  }
}
