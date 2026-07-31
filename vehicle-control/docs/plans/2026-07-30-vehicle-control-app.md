# Vehicle Control App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a separate Expo Android app next to the Arduino sketch to control the vehicle over HC-05 Bluetooth Classic.

**Architecture:** Use `iot-connect` as a UX and Bluetooth reference, not as a feature template. Keep only the Bluetooth Classic manager, permission guards, and banner flow that help with HC-05; replace all IoT light behavior with vehicle movement commands that match the Arduino sketch: `front`, `back`, `left`, `right`, and `stop`.

**Tech Stack:** Expo Router, React Native, TypeScript, `react-native-bluetooth-classic`, `@expo/vector-icons`.

---

### Task 1: Scaffold The App

**Files:**
- Create: `vehicle-control/package.json`
- Create: `vehicle-control/app.json`
- Create: `vehicle-control/index.js`
- Create: `vehicle-control/tsconfig.json`

**Steps:**
1. Add the Expo app package metadata and Android permissions.
2. Register Expo Router as the root entry point.
3. Configure the `~/*` TypeScript path alias.

### Task 2: Add Bluetooth Infrastructure

**Files:**
- Create: `vehicle-control/services/bluetooth/index.ts`
- Create: `vehicle-control/services/bluetooth/bluetooth.android.ts`
- Create: `vehicle-control/services/bluetooth/bluetooth.ios.ts`
- Create: `vehicle-control/services/bluetooth/bluetooth.types.ts`
- Create: `vehicle-control/context/bluetooth-guards.tsx`
- Create: `vehicle-control/utils/bluetooth.ts`
- Create: `vehicle-control/utils/permissions.ts`

**Steps:**
1. Adapt the Android HC-05 connection behavior from `iot-connect`.
2. Keep iOS unsupported because HC-05 uses Bluetooth Classic SPP.
3. Add Android permission checks and automatic refresh/reconnect.

### Task 3: Add Vehicle Commands And UI

**Files:**
- Create: `vehicle-control/constants/vehicle-commands.ts`
- Create: `vehicle-control/constants/colors.ts`
- Create: `vehicle-control/constants/config.ts`
- Create: `vehicle-control/components/banner.tsx`
- Create: `vehicle-control/components/control-pad.tsx`
- Create: `vehicle-control/app/_layout.tsx`
- Create: `vehicle-control/app/index.tsx`

**Steps:**
1. Define typed command strings compatible with the Arduino sketch.
2. Build a control pad that sends direction commands repeatedly while pressed and sends `stop` on release.
3. Add a manual command field for testing and troubleshooting.

### Task 4: Verify

**Steps:**
1. Install dependencies.
2. Run TypeScript checks.
3. Start the Expo dev server for manual Android testing.
