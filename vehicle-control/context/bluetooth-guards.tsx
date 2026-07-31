import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { AppState, Platform, ToastAndroid } from 'react-native'

import { BluetoothManager } from '~/services/bluetooth'
import { isBluetoothEnabled } from '~/utils/bluetooth'
import {
  checkBluetoothStatus,
  requestBluetoothPermissions,
} from '~/utils/permissions'

export type BluetoothState = {
  isAvailable: boolean
  isEnabled: boolean
  hasPermission: boolean
  isAndroid: boolean
  isConnected: boolean
}

type Context = {
  bluetoothState: BluetoothState
  refresh: () => Promise<void>
  handleBluetoothState: (guard: BluetoothState) => void
}

const initialState: BluetoothState = {
  isAvailable: Platform.OS === 'android',
  isEnabled: false,
  hasPermission: false,
  isAndroid: Platform.OS === 'android',
  isConnected: false,
}

const BluetoothGuardsContext = createContext<Context | null>(null)

function bluetoothClassic() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('react-native-bluetooth-classic').default
}

function showToast(msg: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.showWithGravity(msg, ToastAndroid.SHORT, ToastAndroid.CENTER)
  }
}

export function useBluetoothGuards() {
  const value = useContext(BluetoothGuardsContext)
  if (!value) {
    throw new Error(
      'useBluetoothGuards debe usarse dentro de BluetoothGuardsProvider.',
    )
  }

  return value
}

export function BluetoothGuardsProvider({
  children,
}: Readonly<PropsWithChildren>) {
  const [state, setState] = useState<BluetoothState>(initialState)
  const busyRef = useRef(false)
  const askedPermsRef = useRef(false)
  const lastConnectedRef = useRef(false)

  const ensureConnected = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setState((prev) => ({ ...prev, isConnected: false }))
      return false
    }

    if (!askedPermsRef.current) {
      const granted = await requestBluetoothPermissions()
      askedPermsRef.current = true
      if (!granted) {
        setState((prev) => ({ ...prev, hasPermission: false }))
        return false
      }
      setState((prev) => ({ ...prev, hasPermission: true }))
    }

    let connected = await BluetoothManager.refreshConnection({
      autoReconnect: true,
    })

    if (!connected) {
      try {
        await BluetoothManager.connect('HC-05')
        connected = await BluetoothManager.isConnected()
      } catch {
        connected = false
      }
    }

    if (connected !== lastConnectedRef.current) {
      showToast(connected ? 'Bluetooth conectado' : 'Bluetooth desconectado')
      lastConnectedRef.current = connected
    }

    setState((prev) => ({ ...prev, isConnected: connected }))
    return connected
  }, [])

  const refresh = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true

    try {
      if (Platform.OS !== 'android') {
        setState((prev) => ({
          ...prev,
          isAvailable: false,
          isConnected: false,
        }))
        return
      }

      const [hasPermission, isEnabled] = await Promise.all([
        checkBluetoothStatus(),
        isBluetoothEnabled(),
      ])

      setState((prev) => ({ ...prev, hasPermission, isEnabled }))

      if (isEnabled) {
        await ensureConnected()
      }
    } finally {
      busyRef.current = false
    }
  }, [ensureConnected])

  useEffect(() => {
    void refresh()

    const subApp = AppState.addEventListener('change', (appState) => {
      if (appState === 'active') void refresh()
    })

    if (Platform.OS !== 'android') {
      return () => {
        subApp.remove()
      }
    }

    const bluetooth = bluetoothClassic()
    const subOn = bluetooth.onBluetoothEnabled(() => void refresh())
    const subOff = bluetooth.onBluetoothDisabled(() => void refresh())

    return () => {
      subApp.remove()
      subOn.remove()
      subOff.remove()
    }
  }, [refresh])

  const contextValue = useMemo(
    () => ({
      bluetoothState: state,
      refresh,
      handleBluetoothState: setState,
    }),
    [refresh, state],
  )

  return (
    <BluetoothGuardsContext.Provider value={contextValue}>
      {children}
    </BluetoothGuardsContext.Provider>
  )
}
