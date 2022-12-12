import { saveAll } from "../helpers/databaseHelpers";
import { BluetoothDevice } from "../core/bluetooth/bluetoothDevice";
import { DB } from "../helpers/init";

class KnownDevicesDataModel implements KnownDevicesData {

  knownDevices: KnownDevices; // [id: id+"-"+mediaType]


  constructor() {
    this.knownDevices = {};
  }

  hasKnownDevices(): boolean {
    if(this.knownDevices != null && Object.keys(this.knownDevices).length > 0 ){
      return true;
    }else{
      return false;
    }
  };

  getKnownDevices() : KnownDevices {
    return this.knownDevices;
  };

  getKnownDevice(id:string): KnownDevice|null {
    return this.knownDevices[id];
  };

  getKnwonDevice(id: string): KnownDevice|undefined {
    if(this.knownDevices != null){
      return this.knownDevices[id];
    }
  };

  addFromBluetoothDevice(device: BluetoothDevice,autoConnect: boolean) {
    const knownDevice : KnownDevice = {
      id: device.id,
      name: device.name,
      deviceType: device.deviceType,
      autoConnect: autoConnect
    }

    console.log("ESTAMS justo antes del save known ",knownDevice)
    this.saveKnwonDevice(knownDevice);
    console.log("************* WWWIIII GUARDAMOS EL KNOWN DEVICE",knownDevice);
    this.saveToDb();
  }

  saveKnwonDevice(knownDevice: KnownDevice):void{
    if(this.knownDevices != null){
      console.log("ahora vamos a setear el known device",knownDevice);
      console.log("antes de setear ",this.knownDevices)
      this.knownDevices[knownDevice.id] =  knownDevice;
      console.log("DE KNOEN DEVICES TenemoS ",this.knownDevices);
    }
  }

  getFromDb(): void {
    if (!DB.data) return;
    if (DB.data.knownDevices) {
      this.knownDevices =  DB.data.knownDevices;
    }
  }

  async saveToDb(writeToDb = false): Promise<void> {
    if (!DB.data) return;
    console.log("EE AASFASF VAMOS A GUARDAR ESTO ");
    DB.data.knownDevices = this.knownDevices;
    console.log("********** ** HOOOOOLAAAAA DB WRITE *************",DB.data.knownDevices);
    await DB.write();
        console.log("********** ** HOOOOOLAAAAA AHORA SIII*************");
  }

  init() {
  }


}

export = KnownDevicesDataModel;
