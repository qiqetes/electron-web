var AsyncLock = require("async-lock");

import noble, {
  Advertisement,
  Characteristic,
  Peripheral,
  Service,
} from "@abandonware/noble";
import { mainWindow } from "../../index";
import { BluetoothDeviceState } from "./bluetoothDeviceEnum";
interface BluetoothDeviceInterface {
  // Docs: https://electronjs.org/docs/api/structures/bluetooth-device
  id: string;
  broadcast: boolean;
  peripheral: Peripheral | undefined;
  cachedMeasurement: Characteristic[];
  parserType: BluetoothParserType;
  getId(): string;
  getName(): string;
  getDeviceType(): BluetoothDeviceTypes;
  getState(): BluetoothDeviceState;
  setAdvertisment(advertisement: Advertisement): void;
  getFeatures(): Promise<string[] | undefined>;
  connect(): void;
  getValues(): number | Map<string, any> | undefined;
  startNotify(): void;
  disconnect(): void;
  serialize(): {};
}

export class BluetoothDevice implements BluetoothDeviceInterface {
  id: string;
  name: string;
  deviceType: BluetoothDeviceTypes;
  state: BluetoothDeviceState;
  broadcast: boolean;
  peripheral: Peripheral | undefined;
  cachedMeasurement: Characteristic[];
  cachedServices: Service[];
  notifing: boolean;
  features: string[];
  lock: any;
  lockKey: any;
  parserType: BluetoothParserType;

  constructor(
    deviceId: string,
    deviceName: string,
    deviceType: BluetoothDeviceTypes,
    state: BluetoothDeviceState = BluetoothDeviceState.unknown,
    peripheral: Peripheral | undefined,
    parserType: BluetoothParserType,
    broadcast: boolean = false
  ) {
    this.id = deviceId;
    this.name = deviceName;
    this.deviceType = deviceType;
    this.state = state;
    this.parserType = parserType;
    this.broadcast = broadcast;
    this.peripheral = peripheral;
    this.cachedMeasurement = [];
    this.cachedServices = [];
    this.notifing = false;
    this.features = [];
    this.lock = new AsyncLock({ timeout: 5000 });
  }

  getValues(): number | Map<string, any> | undefined {
    return undefined;
  }
  setAdvertisment(advertisement: noble.Advertisement): void {
    throw new Error("Method not implemented.");
  }
  startNotify(): void {
    throw new Error("Method not implemented.");
  }
  getFeatures(): Promise<string[] | undefined> {
    throw new Error("Method not implemented.");
  }

  static hasService(periphealServices: string[], service: string) {
    if (periphealServices != null) {
      const serviceFound = periphealServices.find(
        (e) => service.toLowerCase() == e.toLowerCase()
      );
      if (serviceFound && serviceFound.length > 0) {
        return true;
      }
    }
    return false;
  }

  static hasName(peripheralName: string, allowedNames: string[]) {
    if (allowedNames != null) {
      const nameFound = allowedNames.find((e) =>
        peripheralName.toLowerCase().includes(e.toLowerCase())
      );
      if (nameFound && nameFound.length > 0) {
        return true;
      }
    }
    return false;
  }

  static isName(peripheralName: string, allowedNames: string[]) {
    if (allowedNames != null) {
      const nameFound = allowedNames.find(
        (e) => peripheralName.toLowerCase() == e.toLowerCase()
      );
      if (nameFound && nameFound.length > 0) {
        return true;
      }
    }
    return false;
  }
  /*
  static fromPeripheral(
    peripheral: noble.Peripheral,
    type: BluetoothDeviceTypes,
    parserType: BluetoothParserType,
    broadcast?: boolean
  ) {
    const statePeripheal =
      BluetoothDeviceState[peripheral.state] ||
      BluetoothDeviceState.disconnected;
    const isBroadcast = broadcast||false;
    const id = peripheral.uuid.toLowerCase();

    return new BluetoothDevice(
      id,
      peripheral.advertisement.localName,
      type,
      statePeripheal,
      peripheral,
      parserType,
      isBroadcast,
    );
  }*/

  static fromKnwonDevice(device: KnownDevice) {
    const statePeripheal = BluetoothDeviceState.unknown;

    return new BluetoothDevice(
      device.id,
      device.name,
      device.deviceType,
      BluetoothDeviceState.unknown,
      undefined,
      device.parserType,
      device.broadcast
    );
  }

  serialize(): {} {
    const values = this.getValues();
    return {
      id: this.getId(),
      name: this.getName(),
      deviceType: this.getDeviceType(),
      state: this.getState(),
      broadcast: this.broadcast,
      data: values,
    };
  }

  async connect(): Promise<void> {
    if (!this.peripheral) {
      return;
    }
    this.peripheral.removeAllListeners("connect");
    this.peripheral.removeAllListeners("disconnect");
    if (this.broadcast && !this.peripheral.connectable) {
      this.state = BluetoothDeviceState.connected;

      mainWindow.webContents.send("bluetoothDeviceState", this.serialize());
    } else {
      this.peripheral.on("connect", async (stream) => {
        this.cachedMeasurement = [];
        await this.getFeatures();
        this.state = BluetoothDeviceState[this.peripheral!.state];
        mainWindow.webContents.send("bluetoothDeviceState", this.serialize());

        this.startNotify();
      });

      this.peripheral.on("disconnect", async (stream) => {
        this.state = BluetoothDeviceState[this.peripheral!.state];
        mainWindow.webContents.send("bluetoothDeviceState", this.serialize());

        const measuremnts = this.cachedMeasurement;
        for (const char of measuremnts) {
          char.notify(false);
          char.removeAllListeners();
        }
        //Desde que emite el disconnect hasta que deja de verse en el discover pasa un tiempo, esperamos para que no haga reconexiones inválidas
        // const sleep = (ms:number) => new Promise(r => setTimeout(r, ms));
        //  await sleep(5000);
        this.peripheral!.removeAllListeners();
      });

      await this.peripheral.connectAsync();
    }
  }

  async disconnect(): Promise<void> {
    if (this.peripheral) {
      if (this.broadcast && this.state == "connected") {
        this.state = BluetoothDeviceState.disconnected;
        mainWindow.webContents.send("bluetoothDeviceState", this.serialize());
      } else {
        await this.peripheral.disconnectAsync();
      }
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

    const characteristic = await this.getMeasurement(service, char);
    if (characteristic) {
      await this.lock.acquire(this.lockKey, async (done: any) => {
        const valueWrite = await characteristic.write(data, false, (error) => {
          if (error) {
            console.error("ERROR ON WRITE ", error);
          }
        });
        done();
        return valueWrite;
      });
    }
  }

  checkFeature(feature: string) {
    if (!this.features.find((feat) => feat == feature)) {
      this.features.unshift(feature);
    }
  }

  cacheMeasurement = async (): Promise<void> => {
    if (!this.peripheral) return;
    const values =
      await this.peripheral.discoverSomeServicesAndCharacteristicsAsync([], []);
    this.cachedMeasurement = values.characteristics;
    this.cachedServices = values.services;
  };

  getMeasurement = async (
    serviceId: string,
    charId: string
  ): Promise<Characteristic | undefined> => {
    if (!this.peripheral) return;
    if (this.cachedMeasurement.length == 0) {
      await this.cacheMeasurement();
    }
    return this.cachedMeasurement.find((char) => char.uuid == charId);
  };
}
