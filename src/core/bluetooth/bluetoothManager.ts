import noble, { Characteristic, Peripheral } from "@abandonware/noble";
import { ipcMain } from "electron";
import { mainWindow } from "../../index";
import { KnownDevicesData } from "../../helpers/init";
import { BluetoothDevice } from "./bluetoothDevice";
import {
  BluetoothDeviceState,
  BluetoothDeviceTypes,
  BTStatus,
} from "./bluetoothDeviceEnum";
import { GattSpecification } from "./gattSpecification";
import { BluetoothFeatures, getFtmsFeatures } from "./bluetoothFeatures";
import { HeartRateDevice } from "./heartRateDevice";
import { FtmsDevice } from "./ftmsDevice";
import { BikeDevice } from "./bikeDevice";
import { KeiserDevice } from "./keiserDevice";

export class BluetoothManager {
  knownDevices: KnownDevicesData | undefined;
  allDevicesList: Map<string, BluetoothDevice|HeartRateDevice|BikeDevice>;

  statusBluetooth = BTStatus.unknown;
  autoScan: boolean;

  constructor() {
    this.autoScan = false; //Controlar condición de carrera, se carga antes la webapp que los dispositivos conocidos
    this.allDevicesList = new Map<string,  BluetoothDevice|HeartRateDevice|BikeDevice>();

    this.bluetoothStateChange();

    ipcMain.on("bluetoothStartScan", () => {
      // this.callback("");
      this.startScan();
    });

    ipcMain.on("connectDevice", async (_, id: string) => {
      this.connect(id);
    });

    ipcMain.on("disconnectDevice", async (_, id: string) => {
      this.disconnect(id);
    });

    ipcMain.on("syncDevices", async () => {
      this.syncDevices();
    });

    ipcMain.on("syncStatus", async () => {
      mainWindow.webContents.send("stateChange", this.statusBluetooth);
    });

    ipcMain.on("enableAutoScan", async () => {
      this.enableAutoScan();
    });

    ipcMain.on("getFeatures", async (event ): Promise<void> => {
      const features = await this.getFeatures();
      event.returnValue = features;
    });

    ipcMain.on("getLevelRange", async (event): Promise<void> => {
      const levelRange = await this.getLevelRange();
      event.returnValue = levelRange;
    });

    ipcMain.on("setPowerTarget", async (event,power:number): Promise<void> => {
      const features = await this.setPowerTarget(power);
      event.returnValue = null;
    });

    ipcMain.on("stopPowerTarget", async (event): Promise<void> => {
      const features = await this.stopPowerTarget();
      event.returnValue = null;
    });

        ipcMain.on("setResistanceTarget", async (event, resistance: number): Promise<void> => {
      const features = await this.setResistanceTarget(resistance);
      event.returnValue = null;
    });

    ipcMain.on("autoMode", async (event, enable: boolean): Promise<void> => {
      const features = await this.autoMode(enable);
      event.returnValue = null;
    });


    this.enableDiscoverDevices();
  }

  loadKnownDevices(): void {
    this.knownDevices = KnownDevicesData;

    //ya se permite el auto escaneo
    if (
      this.autoScan &&
      this.knownDevices != null &&
      this.knownDevices.hasKnownDevices()
    ) {
      this.enableAutoScan();
    }
  }
  //Write features
  async setPowerTarget(power: number): Promise<void> {
    await this.getConnectedDevices(BluetoothDeviceTypes.Bike).forEach(async (device) => {
      if( device as BikeDevice){
        const bikeDevice = device as BikeDevice;
        await bikeDevice.setPowerTarget(power);
      }
    })
  }

  async stopPowerTarget(): Promise<void> {
    await this.getConnectedDevices(BluetoothDeviceTypes.Bike).forEach(async (device) => {
      if( device as BikeDevice){
        const bikeDevice = device as BikeDevice;
        await bikeDevice.stopPowerTarget();
      }
    })
  }

  async setResistanceTarget(resistance: number): Promise<void> {
    await this.getConnectedDevices(BluetoothDeviceTypes.Bike).forEach(async (device) => {
      if( device as BikeDevice){
        const bikeDevice = device as BikeDevice;
        await bikeDevice.setResistanceTarget(resistance);
      }
    })

  }

  async autoMode(enable: boolean): Promise<void> {
    //TODO Guardar en preferencia

    await this.getConnectedDevices(BluetoothDeviceTypes.Bike).forEach(async (device) => {
      if( device as BikeDevice){
        const bikeDevice = device as BikeDevice;
        await bikeDevice.autoMode(enable);
      }
    })
  }

  async getFeatures(): Promise<string[] | undefined> {
    let features:string[] = [];
    const devices = this.getConnectedDevices(BluetoothDeviceTypes.Bike);
    for(const device of devices){
      const newFeatures = await device.getFeatures();
      if(newFeatures){
        let array3 = new Set([...features,...newFeatures]);
        features = Array.from(array3);
      }
    }

    return features;
  }

  async getLevelRange(
  ): Promise<Map<string, number> | undefined> {
    let levelRange;
    const devices = this.getConnectedDevices(BluetoothDeviceTypes.Bike);
    for( const device of devices){
      if( device as BikeDevice){
        const bikeDevice = device as BikeDevice;
          const currentLevelRange = await bikeDevice.getLevelRange();
        if(currentLevelRange != null){
          levelRange = currentLevelRange;
        }
      }
    }
    return levelRange
  }

  enableAutoScan(): void {
    this.autoScan = true;

    if (this.knownDevices != null && this.knownDevices.hasKnownDevices()) {
      this.enableScan();
    }
  }

  //Comprobamos si paramos con el escaneo del dispositivo o continuamos

  stopScanPeripheral = (
    device: BluetoothDevice | undefined,
    knownDevice: KnownDevice | undefined
  ): boolean => {
    //Sino lo tenemos registrado, continuamos
    if (!device) {
      return false;
    }
    //Si el dispositivo es broadcast, continuamos

    if(knownDevice?.broadcast){
      return false;
    }
    //Si el dispositivo está desconectado pero tiene conexión automática
    if (
      device.state == "disconnected" ||
      (device.state == "disconnecting" && knownDevice?.autoConnect)
    ) {
      return false;
    }
    return true;
  };

  enableDiscoverDevices = () => {
    noble.on("discover", async (peripheral) => {
      const deviceId = peripheral.uuid.toLowerCase();
      const knownDevice = this.knownDevices?.getKnownDevice(deviceId);

      if (
        (peripheral.advertisement.localName != null &&
          peripheral.advertisement.localName != "") ||
        knownDevice != null
      ) {
         console.log(" Peripheal DISCOVER  ",peripheral.advertisement.localName);
      } else {
        //console.log(" Peripheal DISCOVER NOT FOUND  ",peripheral.id);

        return;
      }

      const foundDevice: BluetoothDevice | undefined =
        this.allDevicesList.get(deviceId);
        console.log("JUSTO ANTES NO PASA AQUí")

      if (this.stopScanPeripheral(foundDevice, knownDevice)) {
        return;
      }
      console.log("NO PASA AQUí")

      if(foundDevice && foundDevice.broadcast){
        //TODO comprobar con un dispositivo real
        foundDevice.setAdvertisment(peripheral.advertisement);
        console.log("ISIIIII EL broadcast ",foundDevice.serialize())
        mainWindow.webContents.send("bluetoothDeviceFound", foundDevice.serialize());
        return
      }
      var bl;

      if (knownDevice != undefined) {
        //Lo teniamos conectado pero ahora no está disponible para conectar
        console.log("STEP 0");
        if(!peripheral.connectable && !knownDevice.broadcast){
          console.log("STEP 1");

        //if (!knownDevice.broadcast){
          bl = this.findBluetoothDevice(peripheral);
        }else{
          console.log("STEP 2");

          bl = this.getDeviceByType(peripheral,knownDevice);
          console.log("tenemos al final esto ",bl)
        }
      } else {
        console.log("STEP 3");

        bl = this.findBluetoothDevice(peripheral);
      }
      console.log("EEEIIIII EL BL ES ESTO ",bl)
      if (bl == null) {
        return;
      }


       console.log("emitimos ", bl.serialize());
      mainWindow.webContents.send("bluetoothDeviceFound", bl.serialize());

      this.allDevicesList.set(deviceId, bl);
      //Autoconnect
      if (knownDevice != null && knownDevice.autoConnect) {
        this.connect(deviceId);
      }
      //this.ipcMain.emit("bluetoothDeviceFound",bl)
      //console.log("emitido",);
    });
  };

  findBluetoothDevice = (
    peripheal: noble.Peripheral
  ): BluetoothDevice | undefined => {
    blDevice = this.isBike(peripheal);

    if (blDevice != null) {
      return blDevice;
    } else {
      var blDevice = this.isHeartRate(peripheal);
    }

    return blDevice;
  };

  isBike = (peripheral: noble.Peripheral): BluetoothDevice | undefined => {
    const ftmsDevice = FtmsDevice.isDevice(peripheral);
    if(ftmsDevice) return ftmsDevice;
    const keiserDevice = KeiserDevice.isDevice(peripheral);
    if(keiserDevice) return keiserDevice;
  };

  isHeartRate = (peripheral: noble.Peripheral): BluetoothDevice | undefined => {
    const heartRateDevice = HeartRateDevice.isDevice(peripheral);

    return heartRateDevice;
  };

  // await peripheral.disconnectAsync();
  //proces
  enableScan = () => {
    if (this.statusBluetooth == BTStatus.poweredOn) {
      noble.startScanningAsync([], true);
    }
  };

  disconnect = async (id: string) => {
    const foundDevice: BluetoothDevice | undefined =
      this.allDevicesList.get(id);

    if (foundDevice && (foundDevice as BluetoothDevice)) {
      if (this.knownDevices != null) {
        this.knownDevices.addFromBluetoothDevice(foundDevice, false);
      }

      await foundDevice.disconnect();
      if(foundDevice.broadcast){
        this.allDevicesList.set(foundDevice.id, foundDevice);
      }

    }
  };

  connect = async (id: string) => {
    const foundDevice: BluetoothDevice | undefined =
      this.allDevicesList.get(id);

    if (!foundDevice || !foundDevice?.peripheral) {
      return;
    }
    if (this.knownDevices)
      this.knownDevices.addFromBluetoothDevice(foundDevice, true);

      await foundDevice.connect();

      if(foundDevice.broadcast){
        this.allDevicesList.set(foundDevice.id, foundDevice);
      }


  };

  bluetoothStateChange = async () => {
    this.statusBluetooth = noble.state;
    noble.on("stateChange", async (state) => {
      this.statusBluetooth = state;
      mainWindow.webContents.send("stateChange", state);
    });
  };

  //Devolvemos todos los dispositivos que hemos encontrado, junto con los que ya conocemos
  syncDevices = async () => {
    let foundDevices: string[] = [];
    const devices = Array.from(this.allDevicesList.values());

    devices.forEach((device) => {
      foundDevices.push(device.id);
      mainWindow.webContents.send("bluetoothDeviceFound", device.serialize());
    });

    //Devolvemos los dispositivos no encontrados
    const knownDevices = this.knownDevices?.getKnownDevices();

    if (knownDevices != null && Object.entries(knownDevices).length > 0)
      Object.keys(knownDevices).forEach((key) => {
        const lowerKey = key.toLowerCase();
        if (
          !foundDevices.includes(lowerKey) &&
          knownDevices[lowerKey] != null
        ) {
          const bl = BluetoothDevice.fromKnwonDevice(knownDevices[lowerKey]);
          mainWindow.webContents.send("bluetoothDeviceFound", bl.serialize());
        }
      });
  };

  getConnectedDevices = (deviceType: BluetoothDeviceTypes|undefined) => {
    const devices = Array.from(this.allDevicesList.values());
    return devices.filter((device) => {
      return device.state == BluetoothDeviceState.connected && (deviceType == undefined|| device.deviceType == deviceType);
    });
  };

  startScan = async () => {
    await noble.stopScanningAsync();
    this.syncDevices();
    this.enableScan();
  };

  getDeviceType = (id: string): [BluetoothDeviceTypes, BluetoothParserType] => {
    var deviceType = BluetoothDeviceTypes.HeartRate;
    var parserType: BluetoothParserType = "heartrate";

    if (this.knownDevices != null) {
      const knwon = this.knownDevices.getKnownDevice(id.toLowerCase());
      if (knwon != null) {
        deviceType = knwon.deviceType as BluetoothDeviceTypes;
      }
    }
    return [deviceType, parserType];
  };

  hasService(periphealServices: string[], service: string){

    if (periphealServices != null) {
      const serviceFound = periphealServices.find(
        (e) => service == e.toLowerCase()
      );
      if(serviceFound && serviceFound.length > 0){
        return true;
      }
    }
    return false
  }

  hasName(peripheralName: string,allowedNames: string[] ){

    if (allowedNames != null) {
      const nameFound = allowedNames.find(
        (e) => peripheralName.toLowerCase() == e.toLowerCase()
      );
      if(nameFound && nameFound.length > 0){
        return true;
      }
    }
    return false
  }

  getDeviceByType=(peripheral:Peripheral, knownDevice:KnownDevice):HeartRateDevice|BikeDevice|BluetoothDevice|undefined => {
    if(knownDevice.parserType == 'heartrate' || knownDevice.deviceType == 'heartrate'){
      console.log("SIIIII ESTAMOS AQUIIIIIII ");
      return HeartRateDevice.fromPeripheral(peripheral,knownDevice.broadcast);
    }else if(knownDevice.parserType == 'ftms'){
      return FtmsDevice.fromPeripheral(peripheral,knownDevice.broadcast);
    }
  }
}
