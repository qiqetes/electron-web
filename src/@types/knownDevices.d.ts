type KnownDevice = {
  id: string;
  name: string;
  deviceType: BluetoothDeviceTypes | null;
  autoConnect: Boolean;
}
type KnownDevices =
 {[id: string]: KnownDevice };

 Map<string,KnownDevice>|null

interface KnownDevicesData extends IndexableData, KnownDevicesDataDB {
  getKnownDevices:() => KnownDevices;
  hasKnownDevices:() => boolean,
  getKnwonDevice:(string) => KnownDevice|undefined;
  saveKnwonDevice:(KnownDevice) => void;
  addFromBluetoothDevice:(BluetoothDevice,boolean) => void;
  getKnownDevice:(string) => KnownDevice|null;
}

interface KnownDevicesDataDB extends IndexableData {
  knownDevices: KnownDevices;
}
