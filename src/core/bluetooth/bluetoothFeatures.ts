
export enum BluetoothFeatures {
  Speed = "Velocidad medi",
  AvgSpeed = "Velocidad media",
  Cadence = "Cadencia",
  TotalDistance = "Distancia total",
  Inclinación = "Inclinación",
  Elevation = "Elevación",
  Pace = "Pasos",
  StepCount = "Recuento de pasos",
  Resistance = "Nivel de resistencia",
  StrideCount = "Conteo de zancada",
  Energy = "Energía",
  HeartRate = "Pulsaciones",
  Metabolic = "Metabolic",
  ElapsedTime = "Tiempo restante",
  RemainingTime = "Remaining timre",
  Power = "Potencia",
  PowerOutput = "Potencia de salida",
  UserData = "Datos de usuario",

// Write features
  SpeedTarget = "Velocidad objetivo",
  InclinationTarget = "Inclinación objetivo",
  ResistanceTarget = "Resistencia objetivo",
  PowerTarget = "Modo automático",
  HeartRateTarget = "Pulso objetivo",
  KcalTarget = "Kcal objetivo",
  StepTarget = "Pasos objetivo",
  StrideTarget = "Zancada objetivo",
  DistanceTarget = "Distancia objetivo",
  TimeTarget = "Tiempo objetivo",
  TimeTwoZones = "Tiempo en 2 zonas",
  TimeThreeZones = "Tiempo en 3 zonas",
  TimeFiveZonesBike = "Tiempo en 5 zonas",
  BikeSimulation = "Simulación de parámetros ",
  WheelCircunference = "Tamaño de la rueda",
  SpinDown = "Spin down",
  CadenceTarget = "Cadencia objetivo",

  /// FTMS AVAILABLE
  BikeData = "BIKE_DATA",
  ControlPoint = "CONTROL_POINT",
  ResistanceLevelTarget = "RESISTENCE_LEVEL_RANGE",
  Feature = "FEATURE",
  PowerRange = "POWER_RANGE",
  TrainingStatus = "TRAINING_STATUS",
  Status = "STATUS",

  // PARA ZYCLE
  ZycleButton = "Control manual de botones",
}
/* Lista ordenadas de características */
const FTMSOrderFeaturesRead = [
  BluetoothFeatures.AvgSpeed,
  BluetoothFeatures.Cadence,
  BluetoothFeatures.TotalDistance,
  BluetoothFeatures.Inclinación,
  BluetoothFeatures.Elevation,
  BluetoothFeatures.Pace,
  BluetoothFeatures.StepCount,
  BluetoothFeatures.Resistance,
  BluetoothFeatures.StrideCount,
  BluetoothFeatures.Energy,
  BluetoothFeatures.HeartRate,
  BluetoothFeatures.Metabolic,
  BluetoothFeatures.ElapsedTime,
  BluetoothFeatures.RemainingTime,
  BluetoothFeatures.Power,
  BluetoothFeatures.PowerOutput,
  BluetoothFeatures.UserData
];

/* Lista ordenadas de características */
const  FTMSOrderFeaturesWrite = [
  BluetoothFeatures.SpeedTarget,
  BluetoothFeatures.InclinationTarget,
  BluetoothFeatures.ResistanceTarget,
  BluetoothFeatures.PowerTarget,
  BluetoothFeatures.HeartRateTarget,
  BluetoothFeatures.KcalTarget,
  BluetoothFeatures.StepTarget,
  BluetoothFeatures.StrideTarget,
  BluetoothFeatures.DistanceTarget,
  BluetoothFeatures.TimeTarget,
  BluetoothFeatures.TimeTwoZones,
  BluetoothFeatures.TimeThreeZones,
  BluetoothFeatures.TimeFiveZonesBike,
  BluetoothFeatures.BikeSimulation,
  BluetoothFeatures.WheelCircunference,
  BluetoothFeatures.SpinDown,
  BluetoothFeatures.CadenceTarget
];

export const getFtmsFeatures = (values: Buffer):string[] => {
  // A ver la ordenación de los bits para controlar esto
  const bitsFeaturesRead:Buffer =  Buffer.concat([values.subarray(0,7).reverse(),values.subarray(7,16).reverse()]);

  var availabe = getAvailableFeatures(bitsFeaturesRead,FTMSOrderFeaturesRead);
  if(values.length > 48){
    const bitsFeaturesWrite = Buffer.concat([values.subarray(32,39).reverse() , values.subarray(40,48).reverse()]);
    const availabeWrite = getAvailableFeatures(bitsFeaturesWrite,FTMSOrderFeaturesWrite);
    availabe.concat(availabeWrite);
  }

  return availabe;
}

const getAvailableFeatures = (bits: Buffer, features: string[]):string[] => {
  const sizeFeatures = features.length;
  var availableFeatures:string[] = [];

  bits.forEach((value,index) => {
    if (index < sizeFeatures) {
      if (value == 1) {
        availableFeatures.push(features[index]);
      }
    }
  });
  return availableFeatures;
}
