import { PermissionsAndroid, Platform } from 'react-native'

const androidVersion = () => Number(Platform.Version)

function bluetoothPermissions() {
  if (Platform.OS !== 'android') return []

  if (androidVersion() >= 31) {
    return [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    ]
  }

  return [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]
}

export async function requestBluetoothPermissions() {
  if (Platform.OS !== 'android') return false

  try {
    const permissions = bluetoothPermissions()
    const result = await PermissionsAndroid.requestMultiple(permissions)
    return permissions.every((permission) => {
      return result[permission] === PermissionsAndroid.RESULTS.GRANTED
    })
  } catch {
    return false
  }
}

export async function checkBluetoothStatus() {
  if (Platform.OS !== 'android') return false

  try {
    const permissions = bluetoothPermissions()
    const results = await Promise.all(
      permissions.map((permission) => PermissionsAndroid.check(permission)),
    )
    return results.every(Boolean)
  } catch {
    return false
  }
}
