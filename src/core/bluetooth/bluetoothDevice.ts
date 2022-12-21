var AsyncLock = require('async-lock');

import noble, { Characteristic, Peripheral } from "@abandonware/noble";
import { mainWindow } from "../../index";
import { BikeDataFeatures } from "./bikeDataFeatures";
import { bufferToListInt, intToBuffer } from "./bluetoothDataParser";
import { BluetoothDeviceState } from "./bluetoothDeviceEnum";
import { BluetoothFeatures, getFtmsFeatures } from "./bluetoothFeatures";
import { GattSpecification } from "./gattSpecification";

interface BluetoothDeviceInterface {
  // Docs: https://electronjs.org/docs/api/structures/bluetooth-device
  id: string;
  broadcast: boolean;
  parserType: BluetoothParserType;
  peripheral: Peripheral | undefined;
  cacheMeasurement: Characteristic[];
  getId(): string;
  getName(): string;
  getDeviceType(): BluetoothDeviceTypes;
  getState(): BluetoothDeviceState;
  getFeatures(): Promise<string[] | undefined>;
  getLevelRange(): Promise<Map<string, number> | undefined>;
  setPowerTarget(power:number): Promise<void>;
  setResistanceTarget(resistance:number): Promise<void>;
  stopPowerTarget(): Promise<void>;
  autoMode(enable:boolean): Promise<void>;

  connect(): void;
  disconnect(): void;
  serialize(): {};
}

export class BluetoothDevice implements BluetoothDeviceInterface {
  id: string;
  name: string;
  deviceType: BluetoothDeviceTypes;
  state: BluetoothDeviceState;
  broadcast: boolean;
  parserType: BluetoothParserType;
  peripheral: Peripheral | undefined;
  cacheMeasurement: Characteristic[];
  notifing: boolean;
  features: string[];
  bikeValues: Map<string, any>;
  resistanceRange: Map<string, number> | undefined;
  lock: any;
  lockKey: any;

  constructor(
    deviceId: string,
    deviceName: string,
    deviceType: BluetoothDeviceTypes,
    state: BluetoothDeviceState = BluetoothDeviceState.unknown,
    parserType: BluetoothParserType,
    peripheral: Peripheral | undefined,
    broadcast: boolean = false
  ) {
    this.id = deviceId;
    this.name = deviceName;
    this.deviceType = deviceType;
    this.state = state;
    this.broadcast = broadcast;
    this.parserType = parserType;
    this.peripheral = peripheral;
    this.cacheMeasurement = [];
    this.notifing = false;
    this.features = [];
    this.bikeValues = new Map<string, any>();
    this.resistanceRange = undefined;
    this.lock = new AsyncLock();
  }
  static fromPeripheral(
    peripheral: noble.Peripheral,
    type: BluetoothDeviceTypes,
    parserType: BluetoothParserType
  ) {
    const statePeripheal =
      BluetoothDeviceState[peripheral.state] ||
      BluetoothDeviceState.disconnected;
    const broadcast = !peripheral.connectable;
    const id = peripheral.uuid.toLowerCase();

    return new BluetoothDevice(
      id,
      peripheral.advertisement.localName,
      type,
      statePeripheal,
      parserType,
      peripheral,
      broadcast
    );
  }

  static fromKnwonDevice(device: KnownDevice) {
    const statePeripheal = BluetoothDeviceState.unknown;

    return new BluetoothDevice(
      device.id,
      device.name,
      device.deviceType,
      BluetoothDeviceState.unknown,
      device.parserType,
      undefined,
      device.broadcast
    );
  }

  serialize(): {} {
    return {
      id: this.getId(),
      name: this.getName(),
      deviceType: this.getDeviceType(),
      state: this.getState(),
      broadcast: this.broadcast,
    };
  }
  async startNotify(): Promise<void> {
    if (!this.peripheral) {
      return;
    }
    this.peripheral.removeAllListeners("serviceDiscover");

    if (this.deviceType == "heartrate") {
      const characteristic = await this.getMeasurement(
        GattSpecification.heartRate.service,
        GattSpecification.heartRate.measurements.heartRate
      );

      if (characteristic != null) {
        this.cacheMeasurement = [characteristic];

        this.notify(characteristic, (state: Buffer) => {
          var data = state.readInt8(1); //heart rate measurement
          mainWindow.webContents.send("heartRateData-" + this.id, data);
        });
      }
    } else if (this.deviceType == "bike") {
      if (this.parserType == "ftms") {
        const characteristic = await this.getMeasurement(
          GattSpecification.ftms.service,
          GattSpecification.ftms.measurements.bikeData
        );

        if (characteristic != null) {
          this.cacheMeasurement = [characteristic];
          let bikeDataFeatures = new BikeDataFeatures();
          this.notify(characteristic, (state: Buffer) => {
            const values = bufferToListInt(state);
            this.bikeValues = bikeDataFeatures.valuesFeatures(values);
            console.log("BIKE DATA =  ", this.bikeValues);
            mainWindow.webContents.send("bikeData-" + this.id, this.bikeValues);
          });
        }
      }
    }
  }

  async connect(): Promise<void> {
    if (!this.peripheral) {
      return;
    }
    this.peripheral.removeAllListeners("connect");
    this.peripheral.removeAllListeners("disconnect");
    this.peripheral.on("connect", async (stream) => {
      await this.getFeatures();
      this.state = BluetoothDeviceState[this.peripheral!.state];
      mainWindow.webContents.send("bluetoothDeviceState", this.serialize());

      this.startNotify();
    });

    this.peripheral.on("disconnect", async (stream) => {
      this.state = BluetoothDeviceState[this.peripheral!.state];
      mainWindow.webContents.send("bluetoothDeviceState", this.serialize());

      const measuremnts = this.cacheMeasurement;
      if (measuremnts) {
        measuremnts.forEach((char) => {
          char.notify(false);
          char.removeAllListeners();
        });
      }
      //Desde que emite el disconnect hasta que deja de verse en el discover pasa un tiempo, esperamos para que no haga reconexiones inválidas
      // const sleep = (ms:number) => new Promise(r => setTimeout(r, ms));
      //  await sleep(5000);
      this.peripheral!.removeAllListeners();
    });

    await this.peripheral.connectAsync();
  }

  async disconnect(): Promise<void> {
    if (this.peripheral) {
      await this.peripheral.disconnectAsync();
    }
  }

  async getFeatures(): Promise<string[] | undefined> {
    if (this.features.length > 0) {
      return this.features;
    }

    if (this.deviceType == "heartrate") {
      this.features = [BluetoothFeatures.HeartRate];
      return this.features;
    } else if (this.parserType == "ftms") {
      this.features = await this.getFeaturesFtms();
      return this.features;
    }
  }
  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getDeviceType(): BluetoothDeviceTypes {
    return this.deviceType;
  }
  getState(): BluetoothDeviceState {
    return this.state;
  }

  async getFeaturesFtms(): Promise<string[]> {
    if (!this.peripheral) {
      return [];
    }
    const features: string[] = [];

    const characteristic = await this.getMeasurement(
      GattSpecification.ftms.service,
      GattSpecification.ftms.measurements.feature
    );
    if (characteristic) {
      await this.read(characteristic, async (features: any) => {
        this.features = await getFtmsFeatures(features);
      });
    }

    const zycleButton = await this.getMeasurement(
      GattSpecification.zycleButton.service,
      GattSpecification.zycleButton.measurements.buttonControl
    );
    if (zycleButton) {
      this.features.push(BluetoothFeatures.ZycleButton);
    }

    await this.requestControl();
    await this.startTraining();
    return this.features;
  }

  async startTraining() {
    if (this.parserType == "ftms") {
      const data = Buffer.from(GattSpecification.ftms.controlPoint.start);
      await this.writeData(
        GattSpecification.ftms.service,
        GattSpecification.ftms.measurements.controlPoint,
        data
      );
    }
  }

  async resetTraining() {
    if (this.parserType == "ftms") {
      const data = Buffer.from(GattSpecification.ftms.controlPoint.reset);
      await this.writeData(
        GattSpecification.ftms.service,
        GattSpecification.ftms.measurements.controlPoint,
        data
      );
    }
  }

  async stopTraining() {
    if (this.parserType == "ftms") {
      const data = Buffer.from(GattSpecification.ftms.controlPoint.stop);
      await this.writeData(
        GattSpecification.ftms.service,
        GattSpecification.ftms.measurements.controlPoint,
        data
      );
    }
  }

  async requestControl(): Promise<void> {
    if (!this.peripheral) {
      return;
    }
    if (this.parserType == "ftms") {
      const data = Buffer.from(
        GattSpecification.ftms.controlPoint.requestControl
      );
      await this.writeData(
        GattSpecification.ftms.service,
        GattSpecification.ftms.measurements.controlPoint,
        data
      );
    }
  }

  async setPowerTarget(power: number): Promise<void> {
    if (this.parserType == "ftms") {
      const values = intToBuffer(power);
      const data = Buffer.concat([Buffer.from(GattSpecification.ftms.controlPoint.setPower),values]);

      await this.writeData(
        GattSpecification.ftms.service,
        GattSpecification.ftms.measurements.controlPoint,
        data
      );
    }
  }

  async setResistanceTarget(resistance: number): Promise<void> {
    if (this.parserType == "ftms") {
      const values = intToBuffer(resistance);
      const data = Buffer.concat([Buffer.from(GattSpecification.ftms.controlPoint.setResistance),values]);

      await this.writeData(
        GattSpecification.ftms.service,
        GattSpecification.ftms.measurements.controlPoint,
        data
      );
    }
  }
  async stopPowerTarget(): Promise<void> {
    await this.startTraining()
  }

  async autoMode(enable: boolean): Promise<void> {
    if(!enable){
      await this.stopPowerTarget();
    }else{
      await this.resetTraining();
    }
    throw new Error("Method not implemented.");
  }

  async getLevelRange(): Promise<Map<string, number> | undefined> {
    if (this.deviceType == "bike") {
      if (this.resistanceRange) {
        return this.resistanceRange;
      }

      const featureRange = await this.getMeasurement(
        GattSpecification.ftms.service,
        GattSpecification.ftms.measurements.powerRange
      );
      if (featureRange) {
        await this.read(featureRange, (values: any) => {
          this.resistanceRange = BikeDataFeatures.resistanceLevel(values);
        });
      }
      return this.resistanceRange;
    }
  }
  async notify(measurement: Characteristic, callback: Function): Promise<void> {
    measurement.on("notify", (state) => {});
    measurement.notify(true, (state) => {});

    measurement.on("data", (state: Buffer, isNotify) => {
      callback(state);
    });
  }
  async read(measurement: Characteristic, callback: Function): Promise<void> {
    const values = await measurement.readAsync();
    callback(values);
  }

  async writeData(service: string, char: string, data: Buffer) {
    if (!this.peripheral) {
      return null;
    }

    this.lock.acquire(this.lockKey, async (done:any) => {
      const characteristic = await this.getMeasurement(service, char);
      if (characteristic) {
        const valueWrite = await characteristic.write(data, false, (error) => {
          if (error) {
            console.error("ERROR ON WRITE ", error);
          }
        });
        return valueWrite;
      }
    });
  }

  getMeasurement = async (
    serviceId: string,
    charId: string
  ): Promise<Characteristic | undefined> => {
    if (!this.peripheral) return;
    const { characteristics } =
      await this.peripheral.discoverSomeServicesAndCharacteristicsAsync(
        [serviceId],
        [charId]
      );
    return characteristics.find((char) => char.uuid == charId);
  };


}
