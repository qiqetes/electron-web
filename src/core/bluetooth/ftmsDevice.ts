import noble, { Peripheral } from "@abandonware/noble";
import { mainWindow } from "../../index";
import { BikeDataFeaturesFtms } from "./bikeDataFeaturesFtms";
import { bufferToListInt, intToBuffer } from "./bluetoothDataParser";
import { BluetoothDeviceState } from "./bluetoothDeviceEnum";
import { BluetoothFeatures, getFtmsFeatures } from "./bluetoothFeatures";
import { GattSpecification } from "./gattSpecification";
import { ButtonMode, ZycleButton } from "./zycleButton";
import { BikeDevice } from "./bikeDevice";
import { BluetoothDevice } from "./bluetoothDevice";

export class FtmsDevice extends BikeDevice {
  zycleButton: ZycleButton;
  intervalWrite: NodeJS.Timer | undefined;

  constructor(
    deviceId: string,
    deviceName: string,
    state: BluetoothDeviceState = BluetoothDeviceState.unknown,
    peripheral: Peripheral | undefined,
    broadcast: boolean = false
  ) {
    super(deviceId, deviceName, state, peripheral, "ftms", false);
    this.bikeValues = new Map<string, any>();
    this.resistanceRange = undefined;
    this.zycleButton = new ZycleButton();
    this.powerTarget = 10;
    this.resistanceTarget = 10;
    this.normalization = "none";
  }

  static isDevice(peripheral: Peripheral): FtmsDevice | undefined {
    if (!peripheral) {
      return;
    }
    const currentServices = peripheral.advertisement.serviceUuids;
    const allowedService = GattSpecification.ftms.service;

    if (this.hasService(currentServices, allowedService)) {
      return FtmsDevice.fromPeripheral(peripheral, false);
    }
  }
  static fromBluetoothDevice(device: BluetoothDevice, broadcast?: boolean) {
    const isBroadcast = broadcast || false;

    return new FtmsDevice(
      device.id,
      device.name,
      device.state,
      undefined,
      isBroadcast
    );
  }

  static fromPeripheral(peripheral: noble.Peripheral, broadcast?: boolean) {
    const statePeripheal =
      BluetoothDeviceState[peripheral.state] ||
      BluetoothDeviceState.disconnected;
    const isBroadcast = broadcast || false;
    const id = peripheral.uuid.toLowerCase();

    return new FtmsDevice(
      id,
      peripheral.advertisement.localName,
      statePeripheal,
      peripheral,
      isBroadcast
    );
  }
  static fromKnwonDevice(device: KnownDevice) {
    const statePeripheal = BluetoothDeviceState.unknown;

    return new FtmsDevice(
      device.id,
      device.name,
      BluetoothDeviceState.unknown,
      undefined,
      device.broadcast
    );
  }

  static isDeviceChromium(
    device: BluetoothDevice,
    uuids: string[],
    advertisement?: Buffer
  ): FtmsDevice | undefined {
    if (!device) {
      return;
    }
    const broadcast = false;
    const currentServices = uuids;
    const allowedService = GattSpecification.ftms.service;

    if (this.hasService(currentServices, allowedService)) {
      const dev = FtmsDevice.fromBluetoothDevice(device, broadcast);
      dev.currentServices = uuids;
      return dev;
    }
  }

  setAdvertisment(advertisement: noble.Advertisement): void {}

  getValues() {
    return this.bikeValues;
  }

  readDataFromBuffer(uuid: string, data: Buffer): void {
    const minUuid = uuid.split("-")[0].replace(/^0+/, "");
    const replaceUuid = uuid.replace(/-/g, "");
    if (minUuid == GattSpecification.ftms.measurements.bikeData) {
      this.readBikeData(data);
    } else if (minUuid == GattSpecification.ftms.measurements.feature) {
      this.readFeaturesFromBuffer(data);
    } else if (minUuid == GattSpecification.ftms.measurements.resistanceRange) {
      const values = bufferToListInt(Buffer.from(data));
      this.resistanceRange = BikeDataFeaturesFtms.resistanceLevel(values);
    } else if (
      replaceUuid == GattSpecification.zycleButton.measurements.buttonControl
    ) {
      this.readButtonControl(data);
    }
  }

  readBikeData(data: Buffer): void {
    const bikeDataFeatures = new BikeDataFeaturesFtms();
    const state = Buffer.from(data);

    const values = bufferToListInt(state);
    this.bikeValues = bikeDataFeatures.valuesFeatures(values);
    this.bikeValues = this.getFeaturesValues(this.bikeValues);
    mainWindow.webContents.send("bikeData-" + this.id, this.bikeValues);
  }

  readButtonControl(data: Buffer): void {
    const state = Buffer.from(data);
    const values = bufferToListInt(state);
    const dataController = ZycleButton.valuesFeatures(values);

    if (this.zycleButton.changeValues(dataController)) {
      if (dataController.get(ZycleButton.LEVEL) != null) {
        if (dataController.get(ZycleButton.MODE) == ButtonMode.AUTO) {
          if (
            dataController.get(ZycleButton.LEVEL) !=
              Math.floor(this.powerTarget / 5) &&
            this.powerTarget != 10
          ) {
            this.resetWindowValues();
            mainWindow.webContents.send(
              "buttonChange-" + this.id,
              this.zycleButton.toJson()
            );
          }
        } else {
          if (
            dataController.get(ZycleButton.LEVEL) !=
            Math.floor(this.resistanceTarget)
          ) {
            this.resetWindowValues();
            mainWindow.webContents.send(
              "buttonChange-" + this.id,
              this.zycleButton.toJson()
            );
          }
        }
      }
    }
  }
  async readFeaturesFromBuffer(data: Buffer): Promise<void> {
    const featuresBuffer = Buffer.from(data);
    this.features = getFtmsFeatures(featuresBuffer);
    if (this.currentServices.length > 0) {
      //normalizamos los servicios quitando - para
      if (
        FtmsDevice.hasService(
          this.currentServices,
          GattSpecification.zycleButton.service
        )
      ) {
        this.features.push(BluetoothFeatures.ZycleButton);
      }
      //TODO PARCHAZO PARA BH
      if (this.getName() == "B01_0CF9F") {
        this.checkFeature(BluetoothFeatures.PowerTarget);
      }
    }
    console.log("Las features son estas", this.features);
    await this.requestControl();
    await this.startTraining();
  }

  async startNotify(): Promise<void> {
    if (!this.peripheral) {
      return;
    }
    const characteristic = await this.getMeasurement(
      GattSpecification.ftms.service,
      GattSpecification.ftms.measurements.bikeData
    );

    if (characteristic != null) {
      // this.peripheral.removeAllListeners('notify');
      this.notify(characteristic, (state: Buffer) => {
        this.readBikeData(state);
      });
    }

    if (
      this.features.find((feature) => feature == BluetoothFeatures.ZycleButton)
    ) {
      this.startZycleButton();
    }
  }

  async startZycleButton() {
    //SI es la zycle la normalización de datos es la mediana

    this.normalization = "median";
    const characteristic = await this.getMeasurement(
      GattSpecification.zycleButton.service,
      GattSpecification.zycleButton.measurements.buttonControl
    );
    if (characteristic != null) {
      this.notify(characteristic, (state: Buffer) => {
        this.readButtonControl(state);
      });
    }
  }

  async getFeatures(): Promise<string[] | undefined> {
    if (this.features.length > 0) {
      return this.features;
    }
    if (!this.peripheral) {
      return this.features;
    }

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
    //TODO PARCHAZO PARA BH
    if (this.getName() == "B01_0CF9F") {
      this.checkFeature(BluetoothFeatures.PowerTarget);
    }
    await this.requestControl();
    await this.startTraining();
    return this.features;
  }

  async startTraining() {
    if (this.intervalWrite) {
      clearInterval(this.intervalWrite);
    }
    const data = Buffer.from(GattSpecification.ftms.controlPoint.start);
    await this.writeData(
      GattSpecification.ftms.service,
      GattSpecification.ftms.measurements.controlPoint,
      data
    );
    this.powerTarget = 10;
    this.zycleButton = new ZycleButton();
    this.resetWindowValues();
  }

  async resetTraining() {
    const data = Buffer.from(GattSpecification.ftms.controlPoint.reset);
    if (this.intervalWrite) {
      clearInterval(this.intervalWrite);
    }
    await this.writeData(
      GattSpecification.ftms.service,
      GattSpecification.ftms.measurements.controlPoint,
      data
    );
    this.resetWindowValues();
  }

  async stopTraining() {
    this.resetWindowValues();
    if (this.intervalWrite) {
      clearInterval(this.intervalWrite);
    }
    const data = Buffer.from(GattSpecification.ftms.controlPoint.stop);
    await this.writeData(
      GattSpecification.ftms.service,
      GattSpecification.ftms.measurements.controlPoint,
      data
    );
  }

  async requestControl(): Promise<void> {
    if (!this.peripheral) {
      return;
    }
    const data = Buffer.from(
      GattSpecification.ftms.controlPoint.requestControl
    );
    await this.writeData(
      GattSpecification.ftms.service,
      GattSpecification.ftms.measurements.controlPoint,
      data
    );
  }

  async setPowerTarget(power: number): Promise<void> {
    const values = intToBuffer(power);
    const data = Buffer.concat([
      Buffer.from(GattSpecification.ftms.controlPoint.setPower),
      values,
    ]);

    await this.writeData(
      GattSpecification.ftms.service,
      GattSpecification.ftms.measurements.controlPoint,
      data
    );
    this.powerTarget = power;
    this.resetWindowValues();
    if (this.intervalWrite) {
      clearInterval(this.intervalWrite);
    }
    this.intervalWrite = setInterval(() => {
      this.writeData(
        GattSpecification.ftms.service,
        GattSpecification.ftms.measurements.controlPoint,
        data
      );
    }, 1000);
  }

  async setResistanceTarget(resistance: number): Promise<void> {
    if (this.intervalWrite) {
      clearInterval(this.intervalWrite);
    }
    this.resistanceTarget = resistance;

    const values = intToBuffer(resistance);
    const data = Buffer.concat([
      Buffer.from(GattSpecification.ftms.controlPoint.setResistance),
      values,
    ]);
    await this.writeData(
      GattSpecification.ftms.service,
      GattSpecification.ftms.measurements.controlPoint,
      data
    );
    this.resetWindowValues();
  }
  async stopPowerTarget(): Promise<void> {
    if (this.intervalWrite) {
      clearInterval(this.intervalWrite);
    }
    await this.startTraining();
  }

  async autoMode(enable: boolean): Promise<void> {
    if (this.intervalWrite) {
      clearInterval(this.intervalWrite);
    }
    if (!enable) {
      await this.stopPowerTarget();
    } else {
      await this.resetTraining();
      await this.setPowerTarget(this.powerTarget);
    }
  }

  async getLevelRange(): Promise<Map<string, number> | undefined> {
    if (this.resistanceRange) {
      return this.resistanceRange;
    }

    const featureRange = await this.getMeasurement(
      GattSpecification.ftms.service,
      GattSpecification.ftms.measurements.resistanceRange
    );
    if (featureRange) {
      await this.read(featureRange, (values: any) => {
        this.resistanceRange = BikeDataFeaturesFtms.resistanceLevel(values);
      });
    }

    return this.resistanceRange;
  }
}
