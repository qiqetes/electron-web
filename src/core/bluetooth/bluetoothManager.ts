import noble, { Peripheral } from '@abandonware/noble';
import {  ipcMain } from 'electron';
import { mainWindow } from '../../index';
import {  KnownDevicesData } from "../../helpers/init";
import {BluetoothDevice} from './bluetoothDevice';
import { BluetoothDeviceState, BluetoothDeviceTypes, BTStatus } from './bluetoothDeviceEnum';
import { GattSpecification } from './gattSpecification';

export class BluetoothManager {

  knownDevices: KnownDevicesData | undefined;
  allPeriphealList: Map<string,noble.Peripheral>;
  statusBluetooth = BTStatus.unknown;
  discardDevices: string[];

  constructor() {
    this.discardDevices =[];
    this.allPeriphealList = new Map<string,noble.Peripheral>;
    this.bluetoothStateChange();

    ipcMain.on("bluetoothStartScan", () => {
      console.log("^^^^^ÂSDF Â^SD ^F A^SDF A^S DF^SD^F D^S")
      // this.callback("");
      this.startScan();
    });

    ipcMain.on('connectDevice',async(_,id:string)=>{
      this.connect(id);
    });

    ipcMain.on('disconnectDevice',async(_,id:string)=>{
      this.disconnect(id);
    });

    ipcMain.on('syncDevices',async()=>{
      this.syncDevices();
    });

    ipcMain.on('syncStatus',async()=>{
      mainWindow.webContents.send("stateChange",this.statusBluetooth);
    });

    this.enableDiscoverDevices();
  }

  loadKnownDevices():void {
    this.knownDevices = KnownDevicesData;
     console.log("SIIIIII TENEMOS DE KNOWN DEVICES");
    console.log(this.knownDevices.getKnownDevices());

    if(this.knownDevices.hasKnownDevices()){
      this.enableScan();
    }
  }

  enableDiscoverDevices = () =>{
    noble.on('discover', async (peripheral) => {
      const deviceId = peripheral.uuid.toLowerCase();

      const knownDevice = this.knownDevices?.getKnownDevice(deviceId);

      /*
      if(this.discardDevices.includes(peripheral.uuid) && knownDevice == undefined){
        return
      }*/
      if(peripheral.advertisement.localName != null && peripheral.advertisement.localName != ""){
        //console.log(" Peripheal DISCOVER  ",peripheral.advertisement.localName);
      }else{
        return
      }
      const foundPeripheral: noble.Peripheral|undefined = this.allPeriphealList.get(deviceId);

      if(foundPeripheral){
        return
      }
      var bl;
      bl = this.findBluetoothDevice(peripheral);

      if(knownDevice != undefined){
        bl = BluetoothDevice.fromPeripheral(peripheral,knownDevice.deviceType);
      }else{
        bl = this.findBluetoothDevice(peripheral);
      }
      if(bl == null){
        this.discardDevices.push(peripheral.uuid);
        return;
      }
      console.log("emitimos ",bl)
      mainWindow.webContents.send("bluetoothDeviceFound",bl);
      if(!this.allPeriphealList.get(bl.id)){
        this.allPeriphealList.set(bl.id,peripheral);
      }
      //Autoconnect
      if(knownDevice != null && knownDevice.autoConnect){
        this.connect(bl.id);
      }
      //this.ipcMain.emit("bluetoothDeviceFound",bl)
      console.log("emitido")
    });
  }

  findBluetoothDevice =(peripheal: noble.Peripheral): BluetoothDevice| undefined=>{
    var blDevice = this.isHeartRate(peripheal);

    if(blDevice != null){
      return blDevice;
    }else{
      blDevice = this.isBike(peripheal);
    }
    return blDevice;
  }
  isBike = (peripheral: noble.Peripheral): BluetoothDevice| undefined => {
    if(peripheral.advertisement.serviceUuids != null){
      const service = peripheral.advertisement.serviceUuids.find((e)=> GattSpecification.ftms.services.includes(e));

      if (service != null){
        return  BluetoothDevice.fromPeripheral(peripheral,BluetoothDeviceTypes.Bike);
      }
    }
  }

  isHeartRate = (peripheral: noble.Peripheral): BluetoothDevice| undefined=> {
    if(peripheral.advertisement.serviceUuids != null){
      const service = peripheral.advertisement.serviceUuids.find((e)=> GattSpecification.heartRate.services.includes(e));

      if (service != null){
        return  BluetoothDevice.fromPeripheral(peripheral,BluetoothDeviceTypes.HeartRate);
      }
    }
  }
  // await peripheral.disconnectAsync();
    //proces
  enableScan = () => {
    if(this.statusBluetooth == BTStatus.poweredOn){
      noble.startScanningAsync([], true);
    }
  }


  disconnect = async (id:string) =>{
    const foundPeripheral: noble.Peripheral|undefined = this.allPeriphealList.get(id);
    if(foundPeripheral as noble.Peripheral){
      const peripheral = foundPeripheral as noble.Peripheral;
      await peripheral.disconnectAsync();
    }
  }

  connect = async (id:string) =>{
    const foundPeripheral: noble.Peripheral|undefined = this.allPeriphealList.get(id);
    if(foundPeripheral as noble.Peripheral){
      const peripheral = foundPeripheral as noble.Peripheral;
      const deviceType = this.getDeviceType(id);

      peripheral.on('connect',(stream) => {
        const bl = BluetoothDevice.fromPeripheral(peripheral,deviceType);

        mainWindow.webContents.send("bluetoothDeviceState",bl);
        if(this.knownDevices != null){
          this.knownDevices.addFromBluetoothDevice(bl,true);
        }
        this.allPeriphealList.set(bl.id,peripheral);
      });

      peripheral.on('disconnect',(stream) => {
        const bl = BluetoothDevice.fromPeripheral(peripheral,deviceType);
        if(this.knownDevices != null){
          this.knownDevices.addFromBluetoothDevice(bl,false);
        }
        mainWindow.webContents.send("bluetoothDeviceState",bl);
        this.allPeriphealList.set(bl.id,peripheral);
      });

      await peripheral.connectAsync();

      const {characteristics} = await peripheral.discoverSomeServicesAndCharacteristicsAsync([], []);
//      console.log("de char ",characteristics)
      const hearRateMeasure = await characteristics.find((char) => char.uuid=='2a37');
      if(hearRateMeasure != null){
        console.log(`${peripheral.address} (${peripheral.advertisement.localName}): ${hearRateMeasure}%`);
        hearRateMeasure.notify(true, (( state) => {
          console.log("SIIIII EL HEART RATE3  este MEASURE ES ",state,);
        }))

        hearRateMeasure.on('data',(( state:Buffer, isNotify ) => {
          console.log(" el 0 es ",state.readInt8(0));
          console.log(" el 1 es ",state.readInt8(1)); //Heart rate
          var data =  state.readInt8(1);

          mainWindow.webContents.send("heartRateData",data);

        }));

        hearRateMeasure.once('notify', ((state) => {
          console.log("SIIIII EL HEART RATE MEASURE ES ",state);
        }));
      }
    }
  }

  bluetoothStateChange = async () =>{
    this.statusBluetooth = noble.state;
    noble.on('stateChange', async (state) => {
      this.statusBluetooth = state;
      mainWindow.webContents.send("stateChange",state);
    });
  }

  //Devolvemos todos los dispositivos que hemos encontrado, junto con los que ya conocemos
  syncDevices = async () =>{
    let foundDevices: string[] = [];
    const peripherals = Array.from(this.allPeriphealList.values());
    peripherals.forEach((peripheral) =>{
      foundDevices.push(peripheral.uuid);
      const deviceType = this.getDeviceType(peripheral.uuid)
      const bl = BluetoothDevice.fromPeripheral(peripheral,deviceType);
      mainWindow.webContents.send("bluetoothDeviceFound",bl);
    })
    const knownDevices = this.knownDevices?.getKnownDevices();

    if(knownDevices != null &&  Object.entries(knownDevices).length > 0)

    Object.keys(knownDevices).forEach(key => {
      const lowerKey = key.toLowerCase();

      if(!foundDevices.includes(lowerKey) && knownDevices[lowerKey] != null){
        const bl = BluetoothDevice.fromKnwonDevice(knownDevices[lowerKey]);
        mainWindow.webContents.send("bluetoothDeviceFound",bl);
      }
    });
  }

  getConnectedDevices = async () =>{
    const devices = Array.from(this.allPeriphealList.values());
    return devices.filter((device) =>{
      return device.state == BluetoothDeviceState.connected;
    })
  }

  startScan = async () =>{
    this.discardDevices =[];
    await noble.stopScanningAsync();
    this.syncDevices();
    this.enableScan();
  }

  getDeviceType = (id:string):BluetoothDeviceTypes => {
    var deviceType = BluetoothDeviceTypes.HeartRate;
    if(this.knownDevices != null){
      const knwon = this.knownDevices.getKnownDevice(id.toLowerCase());
      if(knwon != null){
        deviceType = knwon.deviceType as BluetoothDeviceTypes;
      }
    }
    return deviceType;
  }
}
