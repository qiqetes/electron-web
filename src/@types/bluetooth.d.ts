type BluetoothDeviceTypes =
  'unknown'|
  'heartrate'|
  'bike'

type BluetoothDeviceState =
  "unknown"|
  "connecting"|
  "connected"|
  "disconnecting"|
  "disconnected"|
  "error"

type BluetoothParserType =
  "heartrate"|
  "ftms"|
  "power"|
  "bhCustom"|
  "keiser"|
  "bhPro"

  type OrderBytes = 'lso'| 'mso'