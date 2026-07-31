import * as T from './bluetooth.types'

class BluetoothManagerClass implements T.BluetoothManager {
  async connect() {
    throw new Error('HC-05 no esta disponible en iOS.')
  }

  async send() {
    throw new Error('Bluetooth Classic no esta disponible en iOS.')
  }

  async sendBatch() {
    throw new Error('Bluetooth Classic no esta disponible en iOS.')
  }

  async isConnected() {
    return false
  }

  async refreshConnection() {
    return false
  }

  async disconnect() {
    return undefined
  }
}

export default BluetoothManagerClass
