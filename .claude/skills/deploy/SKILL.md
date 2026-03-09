---
name: deploy
description: Build the Android release APK and install it on the connected physical phone. Use this skill whenever the user says "deploy", "install on phone", "update the app", "push to device", "build and install", or any variation of wanting to get the latest code running on their physical Android device. Also trigger when the user mentions APK, sideload, or releasing to their phone.
---

# Deploy to Physical Device

Build a release APK with the JS bundle embedded (no Metro needed) and install it on the connected physical Android phone, preserving all existing user data.

## Why each step matters

- **JAVA_HOME override**: The system default JDK may be too new for the React Native Gradle plugin. Android Studio's bundled JBR (JDK 21) is the known-good version.
- **`install -r` flag**: This replaces the app binary while keeping the app's internal storage (SQLite database, SharedPreferences, etc.) intact. Without `-r`, adb would fail if the app is already installed, and uninstalling first would wipe user data.
- **Physical device targeting**: `adb devices` may list both emulators and physical devices. Emulators show as `emulator-NNNN`. Target the non-emulator entry so the APK lands on the real phone.

## Steps

Run these commands using Bash. Do not prompt the user between steps — execute the full sequence.

### 1. Build the release APK

```bash
cd <project-root>/android && JAVA_HOME="C:/Program Files/Android/Android Studio/jbr" ./gradlew assembleRelease
```

Use a 10-minute timeout since native builds can be slow. The output APK lands at:
```
android/app/build/outputs/apk/release/app-release.apk
```

If the build fails, stop and show the error to the user. Do not attempt to install a stale APK.

### 2. Find the physical device

```bash
"$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" devices
```

Parse the output to find the device serial that does NOT start with `emulator-`. If no physical device is connected, tell the user to connect their phone with USB debugging enabled and stop.

If multiple physical devices are listed, ask the user which one to target.

### 3. Install the APK

```bash
"$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" -s <DEVICE_SERIAL> install -r <project-root>/android/app/build/outputs/apk/release/app-release.apk
```

The `-r` flag ensures the existing app (and all user data) is preserved. Expect output ending with `Success`.

### 4. Confirm

Tell the user the app has been installed and that their data is preserved.
