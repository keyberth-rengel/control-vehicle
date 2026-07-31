#include <SoftwareSerial.h>

// Bluetooth pins
const byte BLUETOOTH_RX_PIN = 10;  // Arduino RX receives from HC-05 TXD
const byte BLUETOOTH_TX_PIN = 11;  // Arduino TX sends to HC-05 RXD

SoftwareSerial bluetooth(BLUETOOTH_RX_PIN, BLUETOOTH_TX_PIN);

// L298N motor driver pins
const byte LEFT_MOTOR_INPUT_1 = 2;
const byte LEFT_MOTOR_INPUT_2 = 3;
const byte RIGHT_MOTOR_INPUT_1 = 4;
const byte RIGHT_MOTOR_INPUT_2 = 7;

// Change one of these to false if that wheel is wired backward.
const bool LEFT_MOTOR_FORWARD_USES_INPUT_1 = true;
const bool RIGHT_MOTOR_FORWARD_USES_INPUT_1 = true;

// The app repeats motion commands every 160 ms. Stop if commands stop arriving.
const unsigned long COMMAND_TIMEOUT_MS = 450;

// Separate buffers for USB Serial and Bluetooth
String serialCommandBuffer = "";
String bluetoothCommandBuffer = "";
unsigned long lastMovementCommandAt = 0;
bool movementCommandActive = false;

void setup() {
  pinMode(LEFT_MOTOR_INPUT_1, OUTPUT);
  pinMode(LEFT_MOTOR_INPUT_2, OUTPUT);
  pinMode(RIGHT_MOTOR_INPUT_1, OUTPUT);
  pinMode(RIGHT_MOTOR_INPUT_2, OUTPUT);

  stopMotors();

  Serial.begin(9600);
  bluetooth.begin(9600);

  Serial.println("Robot ready");
  Serial.println("Commands: front, back, left, right, stop");

  bluetooth.println("Robot ready");
  bluetooth.println("Commands: front, back, left, right, stop");
}

void loop() {
  readCommands(Serial, serialCommandBuffer);
  readCommands(bluetooth, bluetoothCommandBuffer);
  stopMotorsIfCommandTimedOut();
}

void readCommands(Stream& communicationPort, String& commandBuffer) {
  while (communicationPort.available() > 0) {
    char receivedCharacter = communicationPort.read();

    // Execute the command when Enter is received
    if (receivedCharacter == '\n' || receivedCharacter == '\r') {
      if (commandBuffer.length() > 0) {
        processCommand(commandBuffer);
        commandBuffer = "";
      }

      continue;
    }

    // Avoid excessively long or incorrect messages
    if (commandBuffer.length() < 20) {
      commandBuffer += receivedCharacter;
    }
  }
}

void processCommand(String command) {
  command.trim();
  command.toLowerCase();

  Serial.print("Command received: ");
  Serial.println(command);

  if (command == "front" || command == "forward") {
    moveForward();
    markMovementCommandActive();
  }
  else if (command == "back" || command == "backward") {
    moveBackward();
    markMovementCommandActive();
  }
  else if (command == "left") {
    turnLeft();
    markMovementCommandActive();
  }
  else if (command == "right") {
    turnRight();
    markMovementCommandActive();
  }
  else if (command == "stop") {
    stopMotors();
  }
  else {
    stopMotors();

    Serial.print("Unknown command: ");
    Serial.println(command);

    bluetooth.print("Unknown command: ");
    bluetooth.println(command);
  }
}

void markMovementCommandActive() {
  movementCommandActive = true;
  lastMovementCommandAt = millis();
}

void stopMotorsIfCommandTimedOut() {
  if (!movementCommandActive) return;

  if (millis() - lastMovementCommandAt > COMMAND_TIMEOUT_MS) {
    stopMotors();
  }
}

void moveForward() {
  setLeftMotorForward();
  setRightMotorForward();
}

void moveBackward() {
  setLeftMotorBackward();
  setRightMotorBackward();
}

void turnLeft() {
  setLeftMotorBackward();
  setRightMotorForward();
}

void turnRight() {
  setLeftMotorForward();
  setRightMotorBackward();
}

void setLeftMotorForward() {
  setMotorDirection(
    LEFT_MOTOR_INPUT_1,
    LEFT_MOTOR_INPUT_2,
    LEFT_MOTOR_FORWARD_USES_INPUT_1
  );
}

void setLeftMotorBackward() {
  setMotorDirection(
    LEFT_MOTOR_INPUT_1,
    LEFT_MOTOR_INPUT_2,
    !LEFT_MOTOR_FORWARD_USES_INPUT_1
  );
}

void setRightMotorForward() {
  setMotorDirection(
    RIGHT_MOTOR_INPUT_1,
    RIGHT_MOTOR_INPUT_2,
    RIGHT_MOTOR_FORWARD_USES_INPUT_1
  );
}

void setRightMotorBackward() {
  setMotorDirection(
    RIGHT_MOTOR_INPUT_1,
    RIGHT_MOTOR_INPUT_2,
    !RIGHT_MOTOR_FORWARD_USES_INPUT_1
  );
}

void setMotorDirection(byte input1Pin, byte input2Pin, bool useInput1) {
  digitalWrite(input1Pin, useInput1 ? HIGH : LOW);
  digitalWrite(input2Pin, useInput1 ? LOW : HIGH);
}

void stopMotors() {
  movementCommandActive = false;

  digitalWrite(LEFT_MOTOR_INPUT_1, LOW);
  digitalWrite(LEFT_MOTOR_INPUT_2, LOW);

  digitalWrite(RIGHT_MOTOR_INPUT_1, LOW);
  digitalWrite(RIGHT_MOTOR_INPUT_2, LOW);
}
