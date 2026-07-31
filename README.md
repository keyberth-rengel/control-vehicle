# Control Vehicle 4x4

Proyecto para controlar un vehiculo 4x4 desde una app Expo/React Native usando Bluetooth Classic con un modulo HC-05. El vehiculo usa un Arduino, un driver L298N y motores DC amarillos TT con reduccion.

## Estructura

```text
vehicle-4x4/
  vehicle-4x4.ino        # Sketch Arduino

vehicle-control/
  app/                   # App Expo Router
  services/bluetooth/    # Conexion Bluetooth Classic HC-05
  constants/             # Comandos y configuracion visual
```

## Hardware

- Arduino compatible con `SoftwareSerial`
- Modulo Bluetooth HC-05
- Driver L298N
- Motores DC amarillos TT con reduccion
- Bateria para motores de 6V a 9V con buena corriente
- Fuente 5V estable para Arduino y HC-05

No uses bateria cuadrada de 9V para los motores. Tiene poca corriente, cae el voltaje y el HC-05 puede apagarse o desconectarse al arrancar los motores.

## Alimentacion recomendada

Para pruebas del carrito:

```text
USB / 5V estable -> Arduino + HC-05
Bateria 6V-9V    -> L298N + motores
GND Arduino      -> GND L298N
GND bateria      -> GND L298N
```

Opciones utiles de bateria:

- 4 pilas AA alcalinas: simple para pruebas.
- 4 pilas AA NiMH recargables: buena opcion segura.
- 2 baterias 18650 en serie: mas potencia, requiere cargador adecuado.
- LiPo 2S: buena potencia, requiere cargador balanceado y cuidado extra.

Todos los `GND` deben estar conectados entre si.

## Conexion L298N

El sketch usa este mapa de pines:

```text
Arduino D2 -> L298N IN1
Arduino D3 -> L298N IN2
Arduino D4 -> L298N IN3
Arduino D7 -> L298N IN4

L298N OUT1 / OUT2 -> motor izquierdo
L298N OUT3 / OUT4 -> motor derecho
ENA / ENB          -> jumpers puestos si no usas PWM
```

Si con `front` una rueda gira al reves, ajusta la polaridad en el sketch:

```cpp
const bool LEFT_MOTOR_FORWARD_USES_INPUT_1 = true;
const bool RIGHT_MOTOR_FORWARD_USES_INPUT_1 = true;
```

Cambia a `false` solo el lado que este invertido.

## Comandos Bluetooth

La app envia comandos de texto terminados con salto de linea (`\n`):

```text
front
back
left
right
stop
```

La app envia comandos repetidos solo mientras mantienes presionado un boton de direccion. Si pasan `450ms` sin recibir otro comando de movimiento, el Arduino detiene los motores como proteccion.

## Subir el sketch

1. Abre `vehicle-4x4/vehicle-4x4.ino` en Arduino IDE.
2. Selecciona la placa y puerto correctos.
3. Sube el sketch al Arduino.
4. Empareja el HC-05 desde Android antes de abrir la app.

## Ejecutar la app

```bash
cd vehicle-control
pnpm install
pnpm android
```

Tambien puedes iniciar Metro:

```bash
pnpm start
```

La app esta pensada para Android porque el HC-05 usa Bluetooth Classic SPP.

## Diagnostico rapido

- Si el HC-05 se apaga al mover motores: falta corriente o hay caida de voltaje.
- Si un motor arranca tarde: revisa bateria, `ENA/ENB`, cables y GND comun.
- Si un lado gira al reves: cambia la constante de polaridad de ese lado.
- Si la app no conecta: empareja primero el HC-05 desde ajustes de Android.
