import noble, { Peripheral } from '@abandonware/noble';
import {  ipcMain } from 'electron';
import { mainWindow } from '../../index';
import {  KnownDevicesData } from "../../helpers/init";
import {BluetoothDevice} from './bluetoothDevice';
import { BluetoothDeviceState, BluetoothDeviceTypes, BTStatus } from './bluetoothDeviceEnum';

export class BluetoothManager {

  knownDevices: KnownDevicesData | undefined;
  allPeriphealList: Map<string,noble.Peripheral>;
  statusBluetooth = BTStatus.unknown;

  constructor() {
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

    }
  }

  enableDiscoverDevices = () =>{
    noble.on('discover', async (peripheral) => {
      if(peripheral.advertisement.localName != null && peripheral.advertisement.localName != ""){
        console.log(" Peripheal DISCOVER  ",peripheral.advertisement.localName);
      }else{
        return
      }

      const foundPeripheral: noble.Peripheral|undefined = this.allPeriphealList.get(peripheral.id);

      if(foundPeripheral){
        return
      }
      console.log("eiiii que estamos aquiii con ",peripheral);
      const bl = BluetoothDevice.fromPeripheral(peripheral,BluetoothDeviceTypes.HeartRate);
      console.log("emitimos ",bl)
      mainWindow.webContents.send("bluetoothDeviceFound",bl);
      if(!this.allPeriphealList.get(bl.id)){
        this.allPeriphealList.set(bl.id,peripheral);
      }
      //this.ipcMain.emit("bluetoothDeviceFound",bl)
      console.log("emitido")
    });
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

      peripheral.on('connect',(stream) => {
        const bl = BluetoothDevice.fromPeripheral(peripheral,BluetoothDeviceTypes.HeartRate);
        mainWindow.webContents.send("bluetoothDeviceState",bl);
        if(this.knownDevices != null){
          this.knownDevices.addFromBluetoothDevice(bl,true);
        }
        this.allPeriphealList.set(bl.id,peripheral);
      });

      peripheral.on('disconnect',(stream) => {
        const bl = BluetoothDevice.fromPeripheral(peripheral,BluetoothDeviceTypes.HeartRate);
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

  syncDevices = async () =>{
    const peripherals = Array.from(this.allPeriphealList.values());
    peripherals.forEach((peripheral) =>{
      const bl = BluetoothDevice.fromPeripheral(peripheral,BluetoothDeviceTypes.HeartRate);
      mainWindow.webContents.send("bluetoothDeviceFound",bl);
    })
  }

  getConnectedDevices = async () =>{
    const devices = Array.from(this.allPeriphealList.values());
    return devices.filter((device) =>{
      return device.state == BluetoothDeviceState.connected;
    })

  }
  startScan = async () =>{
    await noble.stopScanningAsync();
    const BLE= "BLUETOOTH: ";
    //Vamos a probar aqui los dispositivos
    console.log(BLE+"state ",noble.state);
    console.log(BLE+"START SCANING ");

    (await this.getConnectedDevices()).forEach((peripheral) =>{
      const bl = BluetoothDevice.fromPeripheral(peripheral,BluetoothDeviceTypes.HeartRate);
      console.log("emitimos ",bl)
      mainWindow.webContents.send("bluetoothDeviceFound",bl);
    });
    noble.on('stateChange', async (state) => {
      console.log(BLE+"stateChange ",state);
      if (state === BTStatus.poweredOn) {
        await noble.startScanningAsync(['180d'], false);
      }
    });



    noble.on('discover', async (peripheral) => {
      if(peripheral.advertisement.localName != null && peripheral.advertisement.localName != ""){
        console.log(BLE+" Peripheal DISCOVER  ",peripheral.advertisement.localName);
      }else{
        return
      }

      console.log("eiiii que estamos aquiii con ",peripheral);
      const bl = BluetoothDevice.fromPeripheral(peripheral,BluetoothDeviceTypes.HeartRate);
      console.log("emitimos ",bl)
      mainWindow.webContents.send("bluetoothDeviceFound",bl);
      if(!this.allPeriphealList.get(bl.id)){
        this.allPeriphealList.set(bl.id,peripheral);
      }
      //this.ipcMain.emit("bluetoothDeviceFound",bl)
      console.log("emitido")

      await noble.stopScanningAsync();


    // await peripheral.disconnectAsync();
      //process.exit(0);
    });

    if(this.statusBluetooth == BTStatus.poweredOn){
      await noble.startScanningAsync(['180d'], false);
    }
  }
}
