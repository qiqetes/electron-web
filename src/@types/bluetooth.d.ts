type BluetoothDeviceTypes = "unknown" | "heartrate" | "bike";

type BluetoothDeviceState =
  | "unknown"
  | "connecting"
  | "connected"
  | "disconnecting"
  | "disconnected"
  | "error";

type BluetoothParserType =
  | "heartrate"
  | "ftms"
  | "power"
  | "bhCustom"
  | "bhPro"
  | "keiser";

type OrderBytes = "lso" | "mso";

type normalization = "avg" | "median" | "pow" | "none";
