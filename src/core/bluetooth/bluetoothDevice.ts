const AsyncLock = require("async-lock");

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
  currentServices: string[];
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
  readDataFromBuffer(uuid: string, data: Buffer): void;
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
  gattCallback: Function | undefined;
  currentServices: string[];

  constructor(
    deviceId: string,
    deviceName: string,
    deviceType: BluetoothDeviceTypes,
    state: BluetoothDeviceState = BluetoothDeviceState.unknown,
    peripheral: Peripheral | undefined,
    parserType: BluetoothParserType,
    broadcast = false
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
    this.currentServices = [];
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
  readDataFromBuffer(uuid: string, data: Buffer) {
    throw new Error("Method not implemented.");
  }
  readFeaturesFromBuffer(data: Buffer) {}

  setGattCallback(callback: Function) {
    this.gattCallback = callback;
  }
  static minifyService = (
    peripheralService: string,
    service: string
  ): string => {
    if (peripheralService.includes("-") && service.includes("-")) {
      return peripheralService;
    } else if (peripheralService.includes("-") && service.length > 6) {
      const val = peripheralService.replace(/-/g, "");
      return val;
    } else if (peripheralService.includes("-")) {
      const val = peripheralService.split("-")[0].replace(/^0+/, "");
      return val;
    } else {
      return peripheralService;
    }
  };
  static hasService(periphealServices: string[], service: string) {
    if (periphealServices != null) {
      const serviceFound = periphealServices.find(
        (e) =>
          this.minifyService(e, service).toLocaleLowerCase() ==
          service.toLowerCase()
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
  static fromChromium(deviceId: string, deviceName: string) {
    const statePeripheal = BluetoothDeviceState.unknown;

    return new BluetoothDevice(
      deviceId,
      deviceName,
      "unknown",
      BluetoothDeviceState.disconnected,
      undefined,
      "heartrate",
      false
    );
  }

  serialize(): {} {
    const values = this.getValues();
    return {
      id: this.getId(),
      name: this.getName(),
      deviceType: this.getDeviceType(),
      parserType: this.parserType,
      state: this.getState(),
      broadcast: this.broadcast,
      data: values,
    };
  }
  async connect(): Promise<void> {
    if (!this.peripheral) {
      if (this.gattCallback != undefined) {
        try {
          this.gattCallback(this.id);
        } catch (error) {
          console.error("conenct callback ", error);
        }
        console.log("SIIII TODO WAY ");
      }
      return;
    }
    this.state = BluetoothDeviceState.connecting;
    mainWindow.webContents.send("bluetoothDeviceState", this.serialize());
    this.peripheral.removeAllListeners("connect");
    this.peripheral.removeAllListeners("disconnect");
    if (this.broadcast && !this.peripheral.connectable) {
      this.state = BluetoothDeviceState.connected;

      mainWindow.webContents.send("bluetoothDeviceState", this.serialize());
    } else {
      this.peripheral.on("connect", async (stream) => {
        this.cachedMeasurement = [];
        this.state = BluetoothDeviceState[this.peripheral!.state];
        mainWindow.webContents.send("bluetoothDeviceState", this.serialize());
        await this.getFeatures();

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
      // Si no se ha conectado correctamente avisamos a la web.
      if (
        this.state !== (BluetoothDeviceState.connected as BluetoothDeviceState)
      ) {
        this.state = BluetoothDeviceState.disconnected;
        mainWindow.webContents.send("bluetoothDeviceState", this.serialize());
      }
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
      mainWindow.webContents.send("writeData-" + this.getName(), data);
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
