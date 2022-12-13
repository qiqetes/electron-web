type KnownDevice = {
  id: string;
  name: string;
  deviceType: BluetoothDeviceTypes;
  autoConnect: boolean;
  broadcast: boolean;
}
type KnownDevices =
 {[id: string]: KnownDevice };

 Map<string,KnownDevice>|null

interface KnownDevicesData extends IndexableData, KnownDevicesDataDB {
  getKnownDevices:() => KnownDevices;
  hasKnownDevices:() => boolean,
  getKnownDevice:(string) => KnownDevice|undefined;
  saveKnwonDevice:(KnownDevice) => void;
  addFromBluetoothDevice:(BluetoothDevice,boolean) => void;
}

interface KnownDevicesDataDB extends IndexableData {
  knownDevices: KnownDevices;
}
