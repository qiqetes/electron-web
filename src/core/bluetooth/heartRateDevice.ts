var AsyncLock = require('async-lock');

import noble, { Advertisement,  Peripheral } from "@abandonware/noble";
import { mainWindow } from "../../index";
import { bufferToListInt } from "./bluetoothDataParser";
import { BluetoothDeviceState, BluetoothDeviceTypes } from "./bluetoothDeviceEnum";
import { BluetoothFeatures } from "./bluetoothFeatures";
import { GattSpecification } from "./gattSpecification";
import {BluetoothDevice} from "./bluetoothDevice";

const parserType: BluetoothParserType = 'heartrate'

export class HeartRateDevice extends BluetoothDevice{
  heartRateValue: number|undefined;

  constructor(
    deviceId: string,
    deviceName: string,
    state: BluetoothDeviceState = BluetoothDeviceState.unknown,
    peripheral: Peripheral | undefined,
    broadcast: boolean = false
  ) {
    super(deviceId,deviceName,BluetoothDeviceTypes.HeartRate,state,peripheral,'heartrate',broadcast);

    this.heartRateValue = undefined;
  }


  static fromPeripheral(
    peripheral: noble.Peripheral,
    broadcast?: boolean
  ) {
    const statePeripheal =
      BluetoothDeviceState[peripheral.state] ||
      BluetoothDeviceState.disconnected;
    const isBroadcast = broadcast||false;
    const id = peripheral.uuid.toLowerCase();

    return new HeartRateDevice(
      id,
      peripheral.advertisement.localName,
      statePeripheal,
      peripheral,
      isBroadcast,
    );
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
      if(this.state == BluetoothDeviceState.connected){
        mainWindow.webContents.send("heartRateData-" + this.id, this.heartRateValue);
      }
  }


  getValues(){
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
          var data = state.readInt8(1); //heart rate measurement
          mainWindow.webContents.send("heartRateData-" + this.id, data);
        });
      }

    }
  }

  async getFeatures(): Promise<string[] | undefined> {
    this.features = [BluetoothFeatures.HeartRate];
    return this.features;
  }
}
