import { getAvailableFeatures, getFeatures, intToBinary } from "./bluetoothDataParser";

export enum BluetoothFeatures {
  Speed = "Velocidad media",
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
  RemainingTime = "Remaining time",
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

  //POWER FEATURES
  Pedal = "Pedal power",
  PowerBalance = "Pedal power balance",
  PowerBalanceReference = "Pedal power balance reference",

   Torque = "Accumulated Torque",
   TorqueSource = "Accumulated Torque source",

   WheelRevolution = "Wheel Revolution power",
   WheelRevolutionTimestamp =
      "Wheel Revolution power timestamp",

   CrankRevolution = "Crank Revolution power",
   CrankRevolutionTimestamp =
      "Crank Revolution power timestamp",

   ExtremesMagnitudes = "Extreme Magnitudes",
   ExtremesForcesMagnitudes = "Extreme force Magnitudes",
   ExtremesTorqueMagnitures = "Extreme torque Magnitudes",

   ExtremesAngles = "Extreme Angles",
   DeadSpotAngles = "Dead Spot Angles",
   TopDeadSpotAngles = "Top Dead Spot Angles",
   BottomDeadSpotAngles = "Bottom Dead Spot Angles",

   OffsetCompensationIndicator =
      "Offset Compensation Indicator",
   SensorMeasurement0 = "Sensor Measurement 0",
   SensorMeasurement1 = "Sensor Measurement 1",
   InstantaneousDirection = "Instantaneous direction",
   OffsetCompensation = "Offset Compensation",

   MultipleSensorLocation = "Multiple Sensor Locations",
   CrankLengthAdjustment = "Crank Length Adjustment",
   ChainLengthAdjustment = "Chain Length Adjustment",
   ChainWeightAdjustment = "Chain weight Adjustment",
   SpanLengthAdjustment = "Span Length Adjustment",
   FactorCalibrationDate = "Factory Calibration date",
   EnhancedOffset = "Enhanced Offset Compensation ",

   CrankValue = "CRANK_VALUE ",
   CrankTimestamp = "CRANK_TIMESTAMP_VALUE ",

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

// zycle features readed
//const buffer = Buffer.from([0x86,0x50,0x00,0x00,0x0c,0xe0,0x00,0x00])
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



  /* Lista ordenadas de características */
const PowerOrderFeaturesRead = [
  BluetoothFeatures.Pedal,
  BluetoothFeatures.Torque,
  BluetoothFeatures.WheelRevolution,
  BluetoothFeatures.CrankRevolution,
  BluetoothFeatures.ExtremesMagnitudes,
  BluetoothFeatures.ExtremesAngles,
  BluetoothFeatures.DeadSpotAngles,
  BluetoothFeatures.Energy,
  BluetoothFeatures.OffsetCompensationIndicator,
  BluetoothFeatures.SensorMeasurement0,
  BluetoothFeatures.SensorMeasurement1,
  BluetoothFeatures.InstantaneousDirection,
  BluetoothFeatures.OffsetCompensation,
  BluetoothFeatures.Power,
  BluetoothFeatures.MultipleSensorLocation,
  BluetoothFeatures.CrankLengthAdjustment,
  BluetoothFeatures.ChainLengthAdjustment,
  BluetoothFeatures.ChainWeightAdjustment,
  BluetoothFeatures.SpanLengthAdjustment,
  BluetoothFeatures.FactorCalibrationDate,
  BluetoothFeatures.EnhancedOffset,
  ];

  const  PowerOrderFeaturesWrite: string[] = [];


export const getFtmsFeatures = (values: Buffer):string[] => {
  // A ver la ordenación de los bits para controlar esto
  if(values.length< 2){
    return [''];
  }
  const bitsFeaturesRead = intToBinary(values.readUIntBE(0,1)).reverse().concat(intToBinary(values.readUIntBE(1,1)).reverse());
  //const bitsFeaturesRead:Buffer =  Buffer.concat([values.subarray(0,7).reverse(),values.subarray(7,16).reverse()]);
   var availabe = getFeatures(bitsFeaturesRead,FTMSOrderFeaturesRead);

   if(values.length > 5){
    const bitsFeaturesWrite = intToBinary(values.readUIntBE(4,1)).reverse().concat(intToBinary(values.readUIntBE(5,1)).reverse());
    //const bitsFeaturesWrite = Buffer.concat([values.subarray(32,39).reverse() , values.subarray(40,48).reverse()]);
    const availabeWrite = getFeatures(bitsFeaturesWrite,FTMSOrderFeaturesWrite);
    availabe = availabe.concat(availabeWrite);
  }

  return availabe;
}

export const getPowerFeatures = (values: Buffer):string[] => {
  // A ver la ordenación de los bits para controlar esto
  if(values.length< 2){
    return [''];
  }
  const bitsFeaturesRead = intToBinary(values.readUIntBE(0,1)).reverse().concat(intToBinary(values.readUIntBE(1,1)).reverse());
  //const bitsFeaturesRead:Buffer =  Buffer.concat([values.subarray(0,7).reverse(),values.subarray(7,16).reverse()]);
   var availabe = getFeatures(bitsFeaturesRead,PowerOrderFeaturesRead);
   if(values.length > 2){
    const bitsFeaturesWrite = intToBinary(values.readUIntBE(2,1)).reverse().concat(intToBinary(values.readUIntBE(3,1)).reverse());
    //const bitsFeaturesWrite = Buffer.concat([values.subarray(32,39).reverse() , values.subarray(40,48).reverse()]);
    const availabeWrite = getFeatures(bitsFeaturesWrite,PowerOrderFeaturesWrite);
    availabe = availabe.concat(availabeWrite);

  }
  availabe.push(BluetoothFeatures.Power);

  if(availabe.find((value ) => value == BluetoothFeatures.CrankRevolution)){
    availabe.push(BluetoothFeatures.Cadence);
  }


  return availabe;
}
