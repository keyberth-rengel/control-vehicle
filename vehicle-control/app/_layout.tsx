import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

import { Colors } from '~/constants/colors'
import { BluetoothGuardsProvider } from '~/context/bluetooth-guards'

export default function Layout() {
  return (
    <BluetoothGuardsProvider>
      <StatusBar hidden />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: Colors.background },
          headerShown: false,
        }}
      />
    </BluetoothGuardsProvider>
  )
}
