export const GattSpecification = {
  heartRate: {
    service: "180d",
    measurements: {
      heartRate: "2a37",
    },
    allowedNames: [
      "polar h9",
      "polar h10",
      "polar oh1",
      "heartbeat",
      "hrm30",
      "h6m 54210",
    ],
  },
  ftms: {
    service: "1826",
    measurements: {
      bikeData: "2ad2",
      feature: "2acc",
      powerRange: "2ad8",
      controlPoint: "2ad9",
      trainingStatus: "2ad3",
      status: "2ada",
      resitanceRange: "2ad6",
    },
    controlPoint: {
      requestControl: [0x00],
      reset: [0x01],
      stop: [0x08, 0x01],
      pause: [0x08, 0x02],
      start: [0x07],
      setResistance: [0x04],
      setPower: [0x05],
    },
  },
  keiser: {
    allowedNames: ["M3"],
  },
  power: {
    service: "1818",
    measurements: {
      features: "2a65",
      bikeData: "2a63",
    },
  },
  zycleButton: {
    service: "beefee024910473cbe46960948c2f59c",
    measurements: {
      buttonControl: "beefe0044910473cbe46960948c2f59c",
    },
  },
};
