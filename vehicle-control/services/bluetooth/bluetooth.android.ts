import RNBluetoothClassic, {
  type BluetoothDevice,
  type BluetoothEventSubscription,
} from 'react-native-bluetooth-classic'

import * as T from './bluetooth.types'

class BluetoothManagerClass implements T.BluetoothManager {
  private device: BluetoothDevice | null = null
  private lastAddress: string | null = null
  private subscription: BluetoothEventSubscription | null = null

  async connect(name = 'HC-05', address?: string) {
    const bonded = await RNBluetoothClassic.getBondedDevices()
    const target = bonded.find((device) => {
      return (
        (address && device.address === address) ||
        (name && device.name?.includes(name))
      )
    })

    if (!target) {
      throw new Error('No se encontro un dispositivo HC-05 emparejado.')
    }

    this.lastAddress = target.address
    this.device = await RNBluetoothClassic.connectToDevice(target.address, {
      delimiter: '\n',
    })
  }

  private async ensureConnected() {
    if (await this.isConnected()) return this.device!
    if (!this.lastAddress) {
      throw new Error('No hay una direccion conocida. Conecta el HC-05 primero.')
    }

    this.device = await RNBluetoothClassic.connectToDevice(this.lastAddress, {
      delimiter: '\n',
    })
    return this.device
  }

  async send(command: string) {
    const device = await this.ensureConnected()
    const line = command.endsWith('\n') ? command : `${command}\n`
    await device.write(line)
  }

  async sendBatch(lines: string[], delayMs = 60) {
    for (const line of lines) {
      await this.send(line)
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }
  }

  async disconnect() {
    try {
      this.subscription?.remove?.()
      this.subscription = null
      if (this.device) {
        await this.device.disconnect()
      }
    } finally {
      this.device = null
    }
  }

  async isConnected() {
    if (!this.device) return false

    try {
      const connected = await this.device.isConnected()
      if (!connected) this.device = null
      return connected
    } catch {
      this.device = null
      return false
    }
  }

  async refreshConnection(opts: { autoReconnect?: boolean } = {}) {
    const connected = await this.isConnected()
    if (connected) return true
    if (!opts.autoReconnect) return false

    try {
      await this.ensureConnected()
      return true
    } catch {
      return false
    }
  }
}

export default BluetoothManagerClass
