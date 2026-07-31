import { Linking, Platform } from 'react-native'

import { BANNERS } from '~/constants/config'

export async function isBluetoothEnabled() {
  if (Platform.OS !== 'android') return false

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const RNBluetoothClassic = require('react-native-bluetooth-classic').default
    return await RNBluetoothClassic.isBluetoothEnabled()
  } catch {
    return false
  }
}

export async function openBluetoothSettings() {
  if (Platform.OS !== 'android') return

  const actions = [
    'android.settings.BLUETOOTH_SETTINGS',
    'android.settings.CONNECTION_SETTINGS',
    'android.settings.SETTINGS',
  ]

  for (const action of actions) {
    try {
      await Linking.sendIntent(action)
      return
    } catch {}
  }

  try {
    await Linking.openSettings()
  } catch {}
}

export type BluetoothBannerState = {
  isAndroid: boolean
  isEnabled: boolean
  hasPermission: boolean
}

export function getBannerForBluetoothState(state: BluetoothBannerState) {
  if (!state.isAndroid) {
    return { key: 'androidUnsupported', config: BANNERS.androidUnsupported }
  }

  if (!state.isEnabled) {
    return { key: 'bluetoothDisabled', config: BANNERS.bluetoothDisabled }
  }

  if (!state.hasPermission) {
    return {
      key: 'bluetoothPermissionRequired',
      config: BANNERS.bluetoothPermissionRequired,
    }
  }

  return null
}
