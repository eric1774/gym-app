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
- **Pre-deploy backup**: Before installing on the physical phone, back up the currently-installed APK and attempt to back up the database. This allows `/rollback` to revert if something goes wrong.

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

### 5. Back up the phone before installing (production safety net)

Before installing the new APK on the physical phone, create a backup so `/rollback` can revert if needed. This step is mandatory — never skip it.

```bash
# Create backup directory with timestamp
BACKUP_DIR="<project-root>/.deploy-backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"
DEVICE_SERIAL="<DEVICE_SERIAL>"
PACKAGE="com.gymtrack"
```

#### 5a. Back up the currently-installed APK

```bash
APK_BACKED_UP=false
APK_PATH=$("$ADB" -s "$DEVICE_SERIAL" shell pm path "$PACKAGE" 2>/dev/null | tr -d '\r' | sed 's/package://')
if [ -n "$APK_PATH" ]; then
  "$ADB" -s "$DEVICE_SERIAL" pull "$APK_PATH" "$BACKUP_DIR/app-backup.apk"
  if [ $? -eq 0 ]; then
    APK_BACKED_UP=true
  fi
fi
```

If the app isn't installed yet (first deploy), note this — there's nothing to back up.

#### 5b. Quiesce the app and back up the database

Force-stop the app before copying to ensure SQLite has flushed the WAL and the database is in a consistent state. Without this, copying `db` and `-wal` separately under concurrent writes can produce a corrupt backup.

This works when the app is built with `debuggable=true` or when running a debug build. On release builds it will fail gracefully — this is expected.

```bash
# Force-stop the app so SQLite flushes WAL and releases locks
"$ADB" -s "$DEVICE_SERIAL" shell "am force-stop $PACKAGE"

# Try to copy database files via run-as
"$ADB" -s "$DEVICE_SERIAL" shell "run-as $PACKAGE cp databases/gymtrack.db /data/local/tmp/gymtrack-backup.db" 2>/dev/null
if [ $? -eq 0 ]; then
  "$ADB" -s "$DEVICE_SERIAL" pull /data/local/tmp/gymtrack-backup.db "$BACKUP_DIR/gymtrack.db"
  "$ADB" -s "$DEVICE_SERIAL" shell "rm /data/local/tmp/gymtrack-backup.db" 2>/dev/null
  # Also try WAL and SHM files if they exist (should be empty after force-stop, but copy for safety)
  "$ADB" -s "$DEVICE_SERIAL" shell "run-as $PACKAGE cp databases/gymtrack.db-wal /data/local/tmp/gymtrack-backup.db-wal" 2>/dev/null
  if [ $? -eq 0 ]; then
    "$ADB" -s "$DEVICE_SERIAL" pull /data/local/tmp/gymtrack-backup.db-wal "$BACKUP_DIR/gymtrack.db-wal"
    "$ADB" -s "$DEVICE_SERIAL" shell "rm /data/local/tmp/gymtrack-backup.db-wal" 2>/dev/null
  fi
  DB_BACKED_UP=true
else
  DB_BACKED_UP=false
fi
```

#### 5c. Capture the current schema version

Read the schema version from the app's database so rollback can detect incompatible downgrades. This uses the same `run-as` path as the DB backup — on release builds it will fail, in which case record `"unknown"`.

```bash
DB_SCHEMA_VERSION=$("$ADB" -s "$DEVICE_SERIAL" shell "run-as $PACKAGE sqlite3 databases/gymtrack.db 'PRAGMA user_version;'" 2>/dev/null | tr -d '\r')
if [ -z "$DB_SCHEMA_VERSION" ]; then
  DB_SCHEMA_VERSION="unknown"
fi
```

Also capture the schema version the **new** APK will migrate to by reading the highest migration version from the source code:

```bash
NEW_SCHEMA_VERSION=$(grep -oP 'version:\s*\K[0-9]+' "<project-root>/src/db/migrations.ts" | sort -n | tail -1)
if [ -z "$NEW_SCHEMA_VERSION" ]; then
  NEW_SCHEMA_VERSION="unknown"
fi
```

#### 5d. Write a backup manifest

```bash
cat > "$BACKUP_DIR/manifest.json" << MANIFEST
{
  "timestamp": "$(date -Iseconds)",
  "device_serial": "$DEVICE_SERIAL",
  "package": "$PACKAGE",
  "apk_backed_up": $APK_BACKED_UP,
  "db_backed_up": $DB_BACKED_UP,
  "db_schema_version": "$DB_SCHEMA_VERSION",
  "new_schema_version": "$NEW_SCHEMA_VERSION",
  "source_commit": "$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')",
  "new_apk": "<project-root>/android/app/build/outputs/apk/release/app-release.apk"
}
MANIFEST
```

#### 5e. Update the "latest" symlink

```bash
# Write the path to a "latest" file for easy rollback reference
echo "$BACKUP_DIR" > "<project-root>/.deploy-backups/latest"
```

#### 5f. Report backup status

Tell the user what was backed up:

> "Backup created at `.deploy-backups/<timestamp>/`
> - APK: {backed up | not available (app not yet installed on device)}
> - Database: {backed up | not available (release build — run-as not permitted)}
>
> Use `/rollback` to revert if needed."

If the APK couldn't be backed up (first install), warn the user that `/rollback` will not be able to restore a previous version since none existed. Proceed with the install.

If the database couldn't be backed up, note this but proceed with the install — the APK backup alone allows reverting the code, and `install -r` preserves data on the phone.

### 6. Install on the physical phone (production — confirmation required)

Only after backup completes and the user has confirmed (from step 4), install on the physical device:

```bash
"$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" -s <DEVICE_SERIAL> install -r <project-root>/android/app/build/outputs/apk/release/app-release.apk
```

If the physical device shows as `unauthorized`, tell the user to check their phone for the USB debugging authorization prompt. If no physical device is connected, tell the user to connect their phone with USB debugging enabled.

If multiple physical devices are listed, ask the user which one to target.

### 7. Confirm

Tell the user the app has been installed on the physical phone, that their data is preserved, and remind them that `/rollback` is available if anything goes wrong.
