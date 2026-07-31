import { Platform } from 'react-native'

import * as T from './bluetooth.types'

let BluetoothManager: T.BluetoothManager

if (Platform.OS === 'android') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { default: BluetoothAndroid } = require('./bluetooth.android')
  BluetoothManager = new BluetoothAndroid()
} else {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { default: BluetoothIos } = require('./bluetooth.ios')
  BluetoothManager = new BluetoothIos()
}

const ExportedBluetoothManager = BluetoothManager
export { ExportedBluetoothManager as BluetoothManager }
