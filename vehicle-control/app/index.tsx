import { MaterialIcons } from '@expo/vector-icons'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg'

import { Colors } from '~/constants/colors'
import { BANNERS } from '~/constants/config'
import { type VehicleCommand, VehicleCommands } from '~/constants/vehicle-commands'
import { useBluetoothGuards } from '~/context/bluetooth-guards'
import { BluetoothManager } from '~/services/bluetooth'
import {
  getBannerForBluetoothState,
  openBluetoothSettings,
} from '~/utils/bluetooth'
import { requestBluetoothPermissions } from '~/utils/permissions'

const SPEED_PRESETS = ['25', '50', '75', '100'] as const
const REPEAT_MS = 160
const SPEED_RAMP_MS = 120
const SPEED_STEP_DOWN = 8
const SPEED_STEP_UP = 4
const TACHOMETER_END_ANGLE = 334
const TACHOMETER_CENTER_X = 162
const TACHOMETER_CENTER_Y = 142
const TACHOMETER_RADIUS = 116
const TACHOMETER_START_ANGLE = 206
const TACHOMETER_STROKE = 16

type DriveMode = 'front' | 'stop' | 'back'
type SpeedPreset = (typeof SPEED_PRESETS)[number]

function getTachometerColor(percent: number) {
  if (percent >= 88) return Colors.danger
  if (percent >= 68) return Colors.warning
  return Colors.primary
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angle: number,
) {
  const radians = (angle * Math.PI) / 180

  return {
    x: centerX + Math.cos(radians) * radius,
    y: centerY + Math.sin(radians) * radius,
  }
}

function describeArc(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(centerX, centerY, radius, startAngle)
  const end = polarToCartesian(centerX, centerY, radius, endAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`
}

function openSettingsAlert() {
  Alert.alert(
    'Permisos denegados',
    'Abre la configuracion de la app y habilita Bluetooth.',
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Abrir configuracion',
        onPress: () => {
          void Linking.openSettings()
        },
      },
    ],
  )
}

export default function App() {
  const { bluetoothState, handleBluetoothState, refresh } = useBluetoothGuards()
  const [errorText, setErrorText] = useState('')
  const [driveMode, setDriveMode] = useState<DriveMode>('stop')
  const [currentSpeed, setCurrentSpeed] = useState(0)
  const [speedLimit, setSpeedLimit] = useState<SpeedPreset>('100')
  const driveRepeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const steerRepeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const banner = getBannerForBluetoothState(bluetoothState)
  const controlsDisabled = !bluetoothState.isConnected

  const statusText = useMemo(() => {
    if (!bluetoothState.isAndroid) return 'No soportado'
    if (!bluetoothState.isEnabled) return 'Bluetooth apagado'
    if (!bluetoothState.hasPermission) return 'Sin permiso'
    if (!bluetoothState.isConnected) return 'Desconectado'
    return 'Conectado'
  }, [bluetoothState])

  const handleBannerAction = () => {
    if (!bluetoothState.isAndroid) {
      Alert.alert(
        BANNERS.androidUnsupported.title,
        BANNERS.androidUnsupported.alertText,
        [{ text: 'Entendido' }],
      )
      return
    }

    if (!bluetoothState.isEnabled) {
      Alert.alert(
        BANNERS.bluetoothDisabled.title,
        BANNERS.bluetoothDisabled.alertText,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Abrir configuracion',
            onPress: () => {
              void openBluetoothSettings()
            },
          },
        ],
      )
      return
    }

    if (!bluetoothState.hasPermission) {
      Alert.alert(
        BANNERS.bluetoothPermissionRequired.title,
        BANNERS.bluetoothPermissionRequired.alertText,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Dar permisos',
            onPress: () => {
              requestBluetoothPermissions().then((hasPermission) => {
                if (hasPermission) {
                  handleBluetoothState({
                    ...bluetoothState,
                    hasPermission: true,
                  })
                  void refresh()
                  return
                }
                openSettingsAlert()
              })
            },
          },
        ],
      )
    }
  }

  const sendVehicleCommand = useCallback(
    async (command: VehicleCommand) => {
      if (!bluetoothState.isConnected) {
        setErrorText('HC-05 no esta conectado.')
        await refresh()
        return
      }

      try {
        setErrorText('')
        await BluetoothManager.send(command)
      } catch (error) {
        setErrorText((error as Error).message)
        await refresh()
      }
    },
    [bluetoothState.isConnected, refresh],
  )

  const clearDriveRepeat = useCallback(() => {
    if (driveRepeatRef.current) {
      clearInterval(driveRepeatRef.current)
      driveRepeatRef.current = null
    }
  }, [])

  const clearSteerRepeat = useCallback(() => {
    if (steerRepeatRef.current) {
      clearInterval(steerRepeatRef.current)
      steerRepeatRef.current = null
    }
  }, [])

  const startDrive = useCallback(
    (mode: DriveMode) => {
      if (controlsDisabled || mode === 'stop') return

      clearDriveRepeat()
      clearSteerRepeat()
      setDriveMode(mode)

      const command =
        mode === 'front' ? VehicleCommands.forward : VehicleCommands.backward

      void sendVehicleCommand(command)

      driveRepeatRef.current = setInterval(() => {
        void sendVehicleCommand(command)
      }, REPEAT_MS)
    },
    [clearDriveRepeat, clearSteerRepeat, controlsDisabled, sendVehicleCommand],
  )

  const stopMovement = useCallback(() => {
    clearDriveRepeat()
    clearSteerRepeat()
    setDriveMode('stop')
    void sendVehicleCommand(VehicleCommands.stop)
  }, [clearDriveRepeat, clearSteerRepeat, sendVehicleCommand])

  const stopDrive = useCallback(() => {
    clearDriveRepeat()
    setDriveMode('stop')
    void sendVehicleCommand(VehicleCommands.stop)
  }, [clearDriveRepeat, sendVehicleCommand])

  const stopSteering = useCallback(() => {
    clearSteerRepeat()
    setDriveMode('stop')
    void sendVehicleCommand(VehicleCommands.stop)
  }, [clearSteerRepeat, sendVehicleCommand])

  const startSteering = useCallback(
    (command: VehicleCommand) => {
      if (controlsDisabled) return

      clearDriveRepeat()
      clearSteerRepeat()
      setDriveMode('stop')
      void sendVehicleCommand(command)
      steerRepeatRef.current = setInterval(() => {
        void sendVehicleCommand(command)
      }, REPEAT_MS)
    },
    [clearDriveRepeat, clearSteerRepeat, controlsDisabled, sendVehicleCommand],
  )

  useEffect(() => {
    if (controlsDisabled) {
      clearDriveRepeat()
      clearSteerRepeat()
      setDriveMode('stop')
    }
  }, [clearDriveRepeat, clearSteerRepeat, controlsDisabled])

  useEffect(() => {
    const targetSpeed =
      driveMode === 'stop' || controlsDisabled ? 0 : Number(speedLimit)

    const speedRamp = setInterval(() => {
      setCurrentSpeed((previousSpeed) => {
        if (previousSpeed === targetSpeed) return previousSpeed

        if (previousSpeed < targetSpeed) {
          return Math.min(previousSpeed + SPEED_STEP_UP, targetSpeed)
        }

        return Math.max(previousSpeed - SPEED_STEP_DOWN, targetSpeed)
      })
    }, SPEED_RAMP_MS)

    return () => {
      clearInterval(speedRamp)
    }
  }, [controlsDisabled, driveMode, speedLimit])

  useEffect(() => {
    return () => {
      clearDriveRepeat()
      clearSteerRepeat()
    }
  }, [clearDriveRepeat, clearSteerRepeat])

  const tachometerEndAngle =
    TACHOMETER_START_ANGLE +
    (currentSpeed / 100) * (TACHOMETER_END_ANGLE - TACHOMETER_START_ANGLE)
  const tachometerTrackPath = describeArc(
    TACHOMETER_CENTER_X,
    TACHOMETER_CENTER_Y,
    TACHOMETER_RADIUS,
    TACHOMETER_START_ANGLE,
    TACHOMETER_END_ANGLE,
  )
  const tachometerProgressPath = describeArc(
    TACHOMETER_CENTER_X,
    TACHOMETER_CENTER_Y,
    TACHOMETER_RADIUS,
    TACHOMETER_START_ANGLE,
    Math.max(tachometerEndAngle, TACHOMETER_START_ANGLE + 1),
  )

  return (
    <View style={styles.screen}>
      <View style={styles.landscapeShell}>
        <View style={styles.driveControlCard}>
          <View style={styles.sectionHeader}>
            <Text selectable style={styles.panelTitle}>
              Traccion
            </Text>
            <View style={styles.modeBadge}>
              <Text selectable style={styles.modeBadgeText}>
                Pulsar
              </Text>
            </View>
          </View>

          <View style={styles.driveControlStack}>
            <Pressable
              accessibilityLabel="Marcha adelante"
              accessibilityRole="button"
              disabled={controlsDisabled}
              onPressIn={() => startDrive('front')}
              onPressOut={stopDrive}
              style={({ pressed }) => [
                styles.driveControlButton,
                driveMode === 'front' ? styles.driveControlButtonActive : null,
                pressed && !controlsDisabled ? styles.controlButtonPressed : null,
                controlsDisabled ? styles.controlButtonDisabled : null,
              ]}>
              <MaterialIcons
                name="keyboard-arrow-up"
                size={54}
                color={
                  controlsDisabled
                    ? Colors.muted
                    : driveMode === 'front'
                      ? Colors.white
                      : Colors.primary
                }
              />
              <Text
                style={[
                  styles.driveControlText,
                  driveMode === 'front' && !controlsDisabled
                    ? styles.controlTextActive
                    : null,
                  controlsDisabled ? styles.disabledText : null,
                ]}>
                Adelante
              </Text>
            </Pressable>

            <Pressable
              accessibilityLabel="Detener vehiculo"
              accessibilityRole="button"
              disabled={controlsDisabled}
              onPress={stopMovement}
              style={({ pressed }) => [
                styles.driveControlButton,
                styles.driveControlStopButton,
                driveMode === 'stop' ? styles.driveControlStopActive : null,
                pressed && !controlsDisabled ? styles.controlButtonPressed : null,
                controlsDisabled ? styles.controlButtonDisabled : null,
              ]}>
              <MaterialIcons
                name="pause"
                size={40}
                color={
                  controlsDisabled
                    ? Colors.muted
                    : driveMode === 'stop'
                      ? Colors.white
                      : Colors.danger
                }
              />
              <Text
                style={[
                  styles.driveControlText,
                  styles.driveControlStopText,
                  driveMode === 'stop' && !controlsDisabled
                    ? styles.controlTextActive
                    : null,
                  controlsDisabled ? styles.disabledText : null,
                ]}>
                Detener
              </Text>
            </Pressable>

            <Pressable
              accessibilityLabel="Marcha atras"
              accessibilityRole="button"
              disabled={controlsDisabled}
              onPressIn={() => startDrive('back')}
              onPressOut={stopDrive}
              style={({ pressed }) => [
                styles.driveControlButton,
                driveMode === 'back' ? styles.driveControlButtonActive : null,
                pressed && !controlsDisabled ? styles.controlButtonPressed : null,
                controlsDisabled ? styles.controlButtonDisabled : null,
              ]}>
              <MaterialIcons
                name="keyboard-arrow-down"
                size={54}
                color={
                  controlsDisabled
                    ? Colors.muted
                    : driveMode === 'back'
                      ? Colors.white
                      : Colors.primary
                }
              />
              <Text
                style={[
                  styles.driveControlText,
                  driveMode === 'back' && !controlsDisabled
                    ? styles.controlTextActive
                    : null,
                  controlsDisabled ? styles.disabledText : null,
                ]}>
                Atras
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.infoCard}>
          {banner ? (
            <Pressable
              accessibilityRole="button"
              onPress={handleBannerAction}
              style={styles.compactNotice}>
              <MaterialIcons
                name={banner.config.icon as never}
                size={18}
                color={Colors.warning}
              />
              <View style={styles.noticeCopy}>
                <Text selectable style={styles.noticeTitle}>
                  {banner.config.title}
                </Text>
                <Text selectable style={styles.noticeText}>
                  {banner.config.message}
                </Text>
              </View>
            </Pressable>
          ) : null}

          <View style={styles.headerPanel}>
            <View style={styles.vehicleMark}>
              <MaterialIcons name="directions-car" size={28} color={Colors.white} />
            </View>
            <View style={styles.headerCopy}>
              <Text selectable style={styles.sensorName}>
                HC-05
              </Text>
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                numberOfLines={1}
                selectable
                style={styles.sensorState}>
                {statusText}
              </Text>
            </View>
            <MaterialIcons
              name={
                bluetoothState.isConnected
                  ? 'bluetooth-connected'
                  : 'bluetooth-disabled'
              }
              size={22}
              color={bluetoothState.isConnected ? Colors.primary : Colors.muted}
            />
            <Pressable
              accessibilityLabel="Reconectar"
              accessibilityRole="button"
              onPress={() => void refresh()}
              style={styles.refreshButton}>
              <MaterialIcons name="refresh" size={21} color={Colors.primary} />
            </Pressable>
          </View>

          <View style={styles.speedPanel}>
            <View style={styles.sectionHeader}>
              <Text selectable style={styles.panelTitle}>
                Velocidad
              </Text>
              <View style={styles.limitBadge}>
                <Text selectable style={styles.limitBadgeText}>
                  Limite
                </Text>
              </View>
            </View>
            <View style={styles.speedGauge}>
              <View
                accessibilityLabel={`Velocidad aproximada ${currentSpeed}%`}
                style={styles.tachometer}>
                <Svg height="146" viewBox="0 0 324 158" width="100%">
                  <Path
                    d={tachometerTrackPath}
                    fill="none"
                    stroke={Colors.neutralSoft}
                    strokeLinecap="round"
                    strokeWidth={TACHOMETER_STROKE}
                  />
                  <Path
                    d={tachometerProgressPath}
                    fill="none"
                    opacity={currentSpeed === 0 ? 0.28 : 1}
                    stroke={getTachometerColor(currentSpeed)}
                    strokeLinecap="round"
                    strokeWidth={TACHOMETER_STROKE}
                  />
                  <Path
                    d={tachometerProgressPath}
                    fill="none"
                    opacity={currentSpeed === 0 ? 0 : 0.18}
                    stroke={getTachometerColor(currentSpeed)}
                    strokeLinecap="round"
                    strokeWidth={TACHOMETER_STROKE + 13}
                  />
                  {[TACHOMETER_START_ANGLE, 270, TACHOMETER_END_ANGLE].map(
                    (angle) => {
                      const outer = polarToCartesian(
                        TACHOMETER_CENTER_X,
                        TACHOMETER_CENTER_Y,
                        TACHOMETER_RADIUS + 1,
                        angle,
                      )
                      const inner = polarToCartesian(
                        TACHOMETER_CENTER_X,
                        TACHOMETER_CENTER_Y,
                        TACHOMETER_RADIUS - 22,
                        angle,
                      )

                      return (
                        <Path
                          d={`M ${inner.x} ${inner.y} L ${outer.x} ${outer.y}`}
                          key={angle}
                          stroke={Colors.card}
                          strokeLinecap="round"
                          strokeWidth="5"
                        />
                      )
                    },
                  )}
                  <Circle
                    cx={TACHOMETER_CENTER_X}
                    cy="135"
                    fill={Colors.card}
                    opacity="0.82"
                    r="61"
                    stroke={Colors.border}
                    strokeWidth="1"
                  />
                  <SvgText
                    fill={Colors.muted}
                    fontSize="11"
                    fontWeight="900"
                    textAnchor="middle"
                    x="40"
                    y="126">
                    0
                  </SvgText>
                  <SvgText
                    fill={Colors.muted}
                    fontSize="11"
                    fontWeight="900"
                    textAnchor="middle"
                    x="284"
                    y="126">
                    100
                  </SvgText>
                </Svg>
                <View style={styles.tachometerCenter}>
                  <Text selectable style={styles.speedValue}>
                    {currentSpeed}%
                  </Text>
                  <Text selectable style={styles.speedMeta}>
                    velocidad aprox.
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.speedPresetRow}>
              {SPEED_PRESETS.map((preset) => (
                <Pressable
                  accessibilityLabel={`Velocidad ${preset}%`}
                  accessibilityRole="button"
                  key={preset}
                  onPress={() => setSpeedLimit(preset)}
                  style={({ pressed }) => [
                    styles.speedPreset,
                    speedLimit === preset ? styles.speedPresetActive : null,
                    pressed ? styles.speedPresetPressed : null,
                  ]}>
                  <Text
                    selectable
                    style={[
                      styles.speedPresetText,
                      speedLimit === preset ? styles.speedPresetTextActive : null,
                    ]}>
                    {preset}%
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {errorText ? (
            <View style={styles.errorBox}>
              <Text selectable style={styles.errorText}>
                {errorText}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.steeringPanel}>
          <View style={styles.sectionHeader}>
            <Text selectable style={styles.panelTitle}>
              Giro
            </Text>
            <View style={styles.modeBadge}>
              <MaterialIcons name="settings-ethernet" size={15} color={Colors.primary} />
              <Text selectable style={styles.modeBadgeText}>
                Pulsar
              </Text>
            </View>
          </View>
          <View style={styles.steeringControls}>
            <Pressable
              accessibilityLabel="Girar izquierda"
              accessibilityRole="button"
              disabled={controlsDisabled}
              onPressIn={() => startSteering(VehicleCommands.left)}
              onPressOut={stopSteering}
              style={({ pressed }) => [
                styles.steerButton,
                pressed && !controlsDisabled ? styles.steerButtonPressed : null,
                controlsDisabled ? styles.steerButtonDisabled : null,
              ]}>
              {({ pressed }) => (
                <>
                  <MaterialIcons
                    name="keyboard-arrow-left"
                    size={58}
                    color={
                      pressed && !controlsDisabled ? Colors.white : Colors.muted
                    }
                  />
                  <Text
                    style={[
                      styles.steerButtonText,
                      pressed && !controlsDisabled
                        ? styles.controlTextActive
                        : null,
                    ]}>
                    Izquierda
                  </Text>
                </>
              )}
            </Pressable>

            <View style={styles.steeringNeutral}>
              <MaterialIcons name="radio-button-unchecked" size={30} color={Colors.muted} />
              <Text selectable style={styles.steeringNeutralText}>
                Neutral
              </Text>
            </View>

            <Pressable
              accessibilityLabel="Girar derecha"
              accessibilityRole="button"
              disabled={controlsDisabled}
              onPressIn={() => startSteering(VehicleCommands.right)}
              onPressOut={stopSteering}
              style={({ pressed }) => [
                styles.steerButton,
                pressed && !controlsDisabled ? styles.steerButtonPressed : null,
                controlsDisabled ? styles.steerButtonDisabled : null,
              ]}>
              {({ pressed }) => (
                <>
                  <MaterialIcons
                    name="keyboard-arrow-right"
                    size={58}
                    color={
                      pressed && !controlsDisabled ? Colors.white : Colors.muted
                    }
                  />
                  <Text
                    style={[
                      styles.steerButtonText,
                      pressed && !controlsDisabled
                        ? styles.controlTextActive
                        : null,
                    ]}>
                    Derecha
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.background,
    flex: 1,
    padding: 8,
  },
  landscapeShell: {
    alignItems: 'stretch',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  driveControlCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderCurve: 'continuous',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    gap: 18,
    justifyContent: 'center',
    padding: 12,
  },
  infoCard: {
    flex: 1.15,
    gap: 8,
    justifyContent: 'center',
  },
  compactNotice: {
    alignItems: 'center',
    backgroundColor: Colors.warningSoft,
    borderColor: Colors.warningBorder,
    borderCurve: 'continuous',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 40,
    padding: 8,
  },
  noticeCopy: {
    flex: 1,
    gap: 2,
  },
  noticeTitle: {
    color: Colors.warning,
    fontSize: 12,
    fontWeight: '900',
  },
  noticeText: {
    color: Colors.warning,
    fontSize: 11,
    fontWeight: '600',
  },
  headerPanel: {
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderCurve: 'continuous',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 10,
  },
  vehicleMark: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  sensorName: {
    color: Colors.ink,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0,
  },
  sensorState: {
    color: Colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  refreshButton: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderCurve: 'continuous',
    borderRadius: 10,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  steeringPanel: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderCurve: 'continuous',
    borderRadius: 12,
    borderWidth: 1,
    gap: 20,
    justifyContent: 'center',
    padding: 12,
    flex: 1,
  },
  driveControlStack: {
    flex: 1,
    gap: 10,
    justifyContent: 'center',
  },
  driveControlButton: {
    alignItems: 'center',
    backgroundColor: Colors.neutralSoft,
    borderColor: Colors.border,
    borderCurve: 'continuous',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
  },
  driveControlButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  driveControlStopButton: {
    backgroundColor: Colors.neutralSoft,
    borderColor: Colors.border,
  },
  driveControlStopActive: {
    backgroundColor: Colors.danger,
    borderColor: Colors.danger,
  },
  controlButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  controlButtonDisabled: {
    backgroundColor: Colors.neutralSoft,
    borderColor: Colors.border,
  },
  driveControlText: {
    color: Colors.primaryDark,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 4,
  },
  driveControlStopText: {
    color: Colors.danger,
  },
  controlTextActive: {
    color: Colors.white,
  },
  speedPanel: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderCurve: 'continuous',
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    padding: 9,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  panelTitle: {
    color: Colors.ink,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0,
  },
  modeBadge: {
    alignItems: 'center',
    backgroundColor: Colors.primarySoft,
    borderCurve: 'continuous',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  modeBadgeText: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
  },
  limitBadge: {
    backgroundColor: Colors.neutralSoft,
    borderColor: Colors.border,
    borderCurve: 'continuous',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  limitBadgeText: {
    color: Colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  steeringControls: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  steerButton: {
    alignItems: 'center',
    backgroundColor: Colors.neutralSoft,
    borderColor: Colors.border,
    borderCurve: 'continuous',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    height: 214,
    justifyContent: 'center',
  },
  steerButtonPressed: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    transform: [{ scale: 0.98 }],
  },
  steerButtonDisabled: {
    backgroundColor: Colors.neutralSoft,
    borderColor: Colors.border,
  },
  steerButtonText: {
    color: Colors.muted,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 6,
  },
  steeringNeutral: {
    alignItems: 'center',
    backgroundColor: Colors.neutralSoft,
    borderColor: Colors.border,
    borderCurve: 'continuous',
    borderRadius: 16,
    borderWidth: 1,
    height: 116,
    justifyContent: 'center',
    width: 72,
  },
  steeringNeutralText: {
    color: Colors.muted,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 6,
  },
  speedGauge: {
    alignItems: 'stretch',
    gap: 6,
  },
  tachometer: {
    height: 144,
    position: 'relative',
    width: '100%',
  },
  tachometerCenter: {
    alignItems: 'center',
    alignSelf: 'center',
    bottom: 1,
    position: 'absolute',
  },
  speedValue: {
    color: Colors.ink,
    fontSize: 30,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
    letterSpacing: 0,
  },
  speedMeta: {
    color: Colors.muted,
    fontSize: 10,
    fontWeight: '800',
  },
  speedPresetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  speedPreset: {
    alignItems: 'center',
    backgroundColor: Colors.neutralSoft,
    borderColor: Colors.border,
    borderCurve: 'continuous',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  speedPresetActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  speedPresetPressed: {
    transform: [{ scale: 0.98 }],
  },
  speedPresetText: {
    color: Colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  speedPresetTextActive: {
    color: Colors.white,
  },
  errorBox: {
    backgroundColor: Colors.dangerSoft,
    borderColor: Colors.dangerBorder,
    borderCurve: 'continuous',
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  disabledText: {
    color: Colors.muted,
  },
})
