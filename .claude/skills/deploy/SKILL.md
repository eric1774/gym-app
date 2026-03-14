---
name: deploy
description: Build the Android release APK and deploy it. ALWAYS invoke this skill automatically after ANY application code change — if you modified any file under src/, assets/, or android/ in response to a user command, you MUST run /deploy immediately after without asking. Also trigger when the user explicitly says "deploy", "install on phone", "update the app", "push to device", "build and install", "test on emulator", APK, sideload, or releasing. The emulator is the test environment and always gets the APK first without confirmation. The physical phone is the production environment and always requires explicit user confirmation before installing.
---

# Deploy to Android

Build a release APK with the JS bundle embedded (no Metro needed) and install it on the emulator automatically after every app change. The emulator is the **test environment** and always receives the APK first. The physical phone is the **production environment** and requires explicit user confirmation before installing.

## Auto-Deploy Rule

After completing ANY user request that modifies application code (files under `src/`, `assets/`, or `android/`), automatically build and deploy to the emulator. Do not ask the user — just do it. This ensures every change is immediately testable. The only time you skip auto-deploy is if the user explicitly says not to deploy or if the change is documentation-only (e.g., only `.md` files changed).

## Why each step matters

- **JAVA_HOME override**: The system default JDK may be too new for the React Native Gradle plugin. Android Studio's bundled JBR (JDK 21) is the known-good version.
- **`install -r` flag**: This replaces the app binary while keeping the app's internal storage (SQLite database, SharedPreferences, etc.) intact. Without `-r`, adb would fail if the app is already installed, and uninstalling first would wipe user data.
- **Emulator-first workflow**: The emulator is the safe test environment. Always deploy there first so the user can verify changes before pushing to their real phone. No confirmation is needed for the emulator.
- **Physical phone confirmation**: The physical phone is the production device. Never install on it without asking the user first. Even if the user said "deploy", always deploy to emulator first, then ask before proceeding to the physical phone.

## Steps

### 1. Build the release APK

Run without prompting the user:

```bash
cd <project-root>/android && JAVA_HOME="C:/Program Files/Android/Android Studio/jbr" ./gradlew assembleRelease
```

Use a 10-minute timeout since native builds can be slow. The output APK lands at:
```
android/app/build/outputs/apk/release/app-release.apk
```

If the build fails, stop and show the error to the user. Do not attempt to install a stale APK.

### 2. List connected devices

```bash
"$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" devices
```

Parse the output. Emulators show as `emulator-NNNN`. Physical devices have alphanumeric serials (e.g., `R5CXC1ZXSNW`).

### 3. Install on the emulator (test environment — no confirmation needed)

If an emulator is running, install immediately without asking:

```bash
"$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" -s <EMULATOR_SERIAL> install -r <project-root>/android/app/build/outputs/apk/release/app-release.apk
```

If no emulator is running, tell the user and suggest they start one. Do not skip ahead to the physical phone.

### 4. Confirm emulator install and ask about physical phone

Tell the user the APK has been installed on the emulator (test environment). Then ask:

> "App deployed to the emulator. Would you like to also deploy to the physical phone (production)?"

**Wait for the user's explicit confirmation before proceeding.** Do not install on the physical phone unless the user says yes.

### 5. Install on the physical phone (production — confirmation required)

Only after the user confirms, install on the physical device:

```bash
"$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" -s <DEVICE_SERIAL> install -r <project-root>/android/app/build/outputs/apk/release/app-release.apk
```

If the physical device shows as `unauthorized`, tell the user to check their phone for the USB debugging authorization prompt. If no physical device is connected, tell the user to connect their phone with USB debugging enabled.

If multiple physical devices are listed, ask the user which one to target.

### 6. Confirm

Tell the user the app has been installed on the physical phone and that their data is preserved.
