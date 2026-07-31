# Vehicle Control App

App Expo/React Native para controlar el vehiculo 4x4 por Bluetooth Classic usando un modulo HC-05.

## Requisitos

- Android con Bluetooth Classic.
- HC-05 emparejado desde los ajustes de Android.
- Sketch Arduino cargado desde `../vehicle-4x4/vehicle-4x4.ino`.
- Alimentacion de motores separada y con `GND` comun con Arduino.

## Comandos

La app envia estos comandos con salto de linea (`\n`):

```text
front
back
left
right
stop
```

Los comandos de movimiento se repiten cada `160ms` mientras mantienes presionado un boton de direccion. El sketch detiene motores si deja de recibir comandos.

## Instalacion

```bash
pnpm install
```

## Scripts

```bash
pnpm start
pnpm android
pnpm typecheck
```

## Notas de hardware

No alimentes motores DC desde el `5V` del Arduino ni con una bateria cuadrada de 9V. Usa una fuente/bateria dedicada para el L298N y une todos los `GND`.
