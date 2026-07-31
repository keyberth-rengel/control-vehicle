export const VehicleCommands = Object.freeze({
  forward: 'front',
  backward: 'back',
  left: 'left',
  right: 'right',
  stop: 'stop',
} as const)

export type VehicleCommand =
  (typeof VehicleCommands)[keyof typeof VehicleCommands]
