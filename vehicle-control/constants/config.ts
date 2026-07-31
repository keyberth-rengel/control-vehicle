import type React from 'react'

export type BannerKey =
  | 'androidUnsupported'
  | 'bluetoothDisabled'
  | 'bluetoothPermissionRequired'

export type BannerVariant = 'info' | 'warning' | 'error' | 'success'

export type BannerConfig = {
  message: string
  title: string
  alertText?: string
  icon?: React.ReactNode | string
  primaryActionText?: string
  showPrimaryAction?: boolean
  variant?: BannerVariant
}

export const BANNERS: Record<BannerKey, BannerConfig> = {
  androidUnsupported: {
    variant: 'warning',
    icon: 'phone-android',
    title: 'Solo Android',
    message: 'HC-05 usa Bluetooth Classic.',
    alertText: 'Este modulo Bluetooth no esta disponible en iPhone o iPad.',
  },
  bluetoothDisabled: {
    variant: 'error',
    icon: 'bluetooth-disabled',
    title: 'Bluetooth desactivado',
    message: 'Activa Bluetooth para conectar el vehiculo.',
    showPrimaryAction: true,
    primaryActionText: 'Configuracion',
    alertText:
      'Activa Bluetooth en tu telefono antes de conectar el vehiculo.',
  },
  bluetoothPermissionRequired: {
    variant: 'warning',
    icon: 'lock-open',
    title: 'Permiso Bluetooth',
    message: 'Concede permisos para usar HC-05.',
    showPrimaryAction: true,
    primaryActionText: 'Permitir',
    alertText: 'La app necesita permisos de Bluetooth para controlar el vehiculo.',
  },
}
