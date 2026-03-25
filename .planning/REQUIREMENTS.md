# Requirements: GymTrack

**Defined:** 2026-03-23
**Core Value:** Fast, frictionless set logging mid-workout

## v1.6 Requirements

Requirements for Heart Rate Monitoring milestone. Each maps to roadmap phases.

### BLE Connection

- [x] **BLE-01**: User can scan for nearby BLE heart rate devices from within the app
- [x] **BLE-02**: User can select and connect to a Garmin Forerunner 245 from the scan results
- [x] **BLE-03**: App remembers the paired device and auto-reconnects on workout start
- [x] **BLE-04**: App requests correct Android BLE permissions (BLUETOOTH_SCAN + BLUETOOTH_CONNECT on 12+, ACCESS_FINE_LOCATION on older)
- [x] **BLE-05**: User can see connection state indicator (connected/reconnecting/disconnected) in workout header

### Live HR Display

- [ ] **HR-01**: User can see live BPM updating in the workout header during an active workout
- [ ] **HR-02**: Live BPM display is color-coded by HR zone (5-zone model: 50/60/70/80/90% of max HR)
- [ ] **HR-03**: Zone label is shown alongside BPM (e.g., "Zone 3 — Aerobic")
- [x] **HR-04**: When watch disconnects mid-workout, BPM shows "- -" and app attempts one auto-reconnect

### HR Settings

- [ ] **SET-01**: User can enter their age in Settings, which calculates max HR via 220-age formula
- [ ] **SET-02**: User can initiate device pairing from Settings screen

### HR Data & Stats

- [ ] **DATA-01**: HR samples are stored per workout session as time-series data (hr_samples table)
- [ ] **DATA-02**: Average HR and Peak HR are computed and persisted per workout session (DB migration v8)
- [ ] **DATA-03**: Average HR and Peak HR are displayed on the workout summary card
- [ ] **DATA-04**: Average HR and Peak HR are displayed in calendar history day details

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### HR Analytics

- **ANAL-01**: User can view zone time distribution chart per session
- **ANAL-02**: User can view HR trend line on workout summary
- **ANAL-03**: User can see HR-based rest timer suggestion (informational, non-blocking)

### HR Export

- **EXP-01**: HR data included in program JSON export

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Background HR monitoring | Requires foreground service, conflicts with rest timer notification, unnecessary for gym use |
| Multi-device support | Single Garmin target, unnecessary complexity |
| HR-based rest timer adjustment | Too deep an integration of BLE + TimerContext for v1.6 |
| Calorie estimation from HR | Requires additional biometric inputs, accuracy issues |
| Mini HR graph during rest | User explicitly excluded |
| Persistent BLE connection across sessions | Battery drain, no use case for resting HR |
| Automated zone-based intensity alerts | Adds cognitive noise mid-workout, visual zones suffice |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BLE-01 | Phase 25 | Complete |
| BLE-02 | Phase 25 | Complete |
| BLE-03 | Phase 25 | Complete |
| BLE-04 | Phase 24 | Complete |
| BLE-05 | Phase 25 | Complete |
| HR-01 | Phase 27 | Pending |
| HR-02 | Phase 27 | Pending |
| HR-03 | Phase 27 | Pending |
| HR-04 | Phase 25 | Complete |
| SET-01 | Phase 27 | Pending |
| SET-02 | Phase 27 | Pending |
| DATA-01 | Phase 26 | Pending |
| DATA-02 | Phase 26 | Pending |
| DATA-03 | Phase 26 | Pending |
| DATA-04 | Phase 26 | Pending |

**Coverage:**
- v1.6 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-23*
*Last updated: 2026-03-23 after roadmap creation — all 15 requirements mapped*
