export type BluetoothEventHandler = (line: string) => void

export interface BluetoothManager {
  connect(name?: string, address?: string): Promise<void>
  send(command: string): Promise<void>
  sendBatch(lines: string[], delayMs?: number): Promise<void>
  disconnect(): Promise<void>
  isConnected(): Promise<boolean>
  refreshConnection(opts?: { autoReconnect?: boolean }): Promise<boolean>
}
