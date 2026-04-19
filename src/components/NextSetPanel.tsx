import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import HapticFeedback from 'react-native-haptic-feedback';
import { colors } from '../theme/colors';
import { Plus, Minus, Check, Timer } from './icons';
import { ExerciseMeasurementType } from '../types';

interface StepperRowProps {
  label: string;
  value: number;
  unit: string;
  step: number;
  min?: number;
  onChange: (next: number) => void;
  onOpenPad: () => void;
}

function StepperRow({ label, value, unit, step, min = 0, onChange, onOpenPad }: StepperRowProps) {
  const handleMinus = () => {
    if (value <= min) { return; }
    onChange(Math.max(min, value - step));
    HapticFeedback.trigger('impactLight', { enableVibrateFallback: true });
  };
  const handlePlus = () => {
    onChange(value + step);
    HapticFeedback.trigger('impactLight', { enableVibrateFallback: true });
  };

  return (
    <View style={stepperStyles.row}>
      <Text style={stepperStyles.label}>{label}</Text>
      <TouchableOpacity style={stepperStyles.valueButton} onPress={onOpenPad} activeOpacity={0.7}>
        <Text style={stepperStyles.valueText}>
          {value}
          <Text style={stepperStyles.unitText}> {unit}</Text>
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[stepperStyles.stepButton, stepperStyles.minusButton, value <= min && stepperStyles.stepButtonDisabled]}
        onPress={handleMinus}
        disabled={value <= min}
        activeOpacity={0.7}>
        <Minus size={18} color={colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[stepperStyles.stepButton, stepperStyles.plusButton]}
        onPress={handlePlus}
        activeOpacity={0.7}>
        <Plus size={18} color={colors.accent} />
      </TouchableOpacity>
    </View>
  );
}

interface NextSetPanelProps {
  setNumber: number;                    // 1-based next-set number
  measurementType: ExerciseMeasurementType;
  nextW: number;
  nextR: number;
  onNextChange: (field: 'w' | 'r', value: number) => void;
  onOpenPad: (field: 'w' | 'r') => void;
  onLog: () => void;
  isLoggingDisabled?: boolean;
  timedStopwatchDisplay?: React.ReactNode; // for timed mode: render stopwatch UI
}

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

type TimerState = 'idle' | 'running' | 'stopped';

export function NextSetPanel({
  setNumber,
  measurementType,
  nextW,
  nextR,
  onNextChange,
  onOpenPad,
  onLog,
  isLoggingDisabled,
  timedStopwatchDisplay,
}: NextSetPanelProps) {
  const isTimed = measurementType === 'timed';
  const isHeightReps = measurementType === 'height_reps';
  const weightStep = isHeightReps ? 2 : 5;
  const weightUnit = isHeightReps ? 'in' : 'lb';

  // Timer state — hooks called unconditionally to comply with Rules of Hooks.
  // In non-timed mode these stay at their initial values and are never mutated.
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerState === 'running') {
      intervalRef.current = setInterval(() => {
        if (startedAtRef.current !== null) {
          setElapsedSeconds(Math.round((Date.now() - startedAtRef.current) / 1000));
        }
      }, 1000);
      return () => {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      };
    }
    return;
  }, [timerState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };
  }, []);

  const handleStartTimer = () => {
    startedAtRef.current = Date.now();
    setElapsedSeconds(0);
    setTimerState('running');
    HapticFeedback.trigger('impactMedium', { enableVibrateFallback: true });
  };

  const handleStopTimer = () => {
    const captured = startedAtRef.current
      ? Math.round((Date.now() - startedAtRef.current) / 1000)
      : 0;
    setElapsedSeconds(captured);
    onNextChange('r', captured);
    setTimerState('stopped');
    HapticFeedback.trigger('notificationWarning', { enableVibrateFallback: true });
  };

  const handleResetTimer = () => {
    startedAtRef.current = null;
    setElapsedSeconds(0);
    setTimerState('idle');
    HapticFeedback.trigger('impactLight', { enableVibrateFallback: true });
  };

  const renderBottomButton = () => {
    if (isTimed && timerState === 'idle') {
      return (
        <TouchableOpacity
          style={[styles.logButton, { backgroundColor: colors.accent }]}
          onPress={handleStartTimer}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Start timer">
          <Timer size={18} color={colors.onAccent} />
          <Text style={styles.logButtonText}>START TIMER</Text>
        </TouchableOpacity>
      );
    }
    if (isTimed && timerState === 'running') {
      return (
        <TouchableOpacity
          style={[styles.logButton, { backgroundColor: colors.danger }]}
          onPress={handleStopTimer}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Stop timer">
          <View style={styles.stopIcon} />
          <Text style={[styles.logButtonText, { color: '#FFFFFF' }]}>STOP</Text>
        </TouchableOpacity>
      );
    }
    // Non-timed OR timed-stopped: LOG SET button
    return (
      <TouchableOpacity
        style={[styles.logButton, isLoggingDisabled && styles.logButtonDisabled]}
        onPress={() => {
          if (isLoggingDisabled) { return; }
          onLog();
          HapticFeedback.trigger('impactMedium', { enableVibrateFallback: true });
          if (isTimed) {
            // Reset local state so next set starts fresh.
            startedAtRef.current = null;
            setElapsedSeconds(0);
            setTimerState('idle');
          }
        }}
        disabled={isLoggingDisabled}
        activeOpacity={0.85}>
        <Check size={18} color={colors.onAccent} />
        <Text style={styles.logButtonText}>LOG SET {setNumber}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.panel}>
      <View style={styles.eyebrowRow}>
        <View style={styles.setBadge}>
          <Text style={styles.setBadgeText}>{setNumber}</Text>
        </View>
        <Text style={styles.eyebrowText}>NEXT SET</Text>
      </View>
      {isTimed ? (
        <View style={styles.timedDisplay}>
          <Text
            style={[
              styles.timedValue,
              timerState === 'running' ? styles.timedValueRunning : null,
              timerState === 'stopped' ? styles.timedValueStopped : null,
            ]}
            accessibilityLiveRegion={timerState === 'running' ? 'polite' : 'none'}>
            {formatDuration(timerState === 'idle' ? 0 : elapsedSeconds)}
          </Text>
          {timerState === 'stopped' && (
            <TouchableOpacity
              onPress={handleResetTimer}
              accessibilityRole="button"
              accessibilityLabel="Reset timer"
              style={styles.resetPill}>
              <Text style={styles.resetText}>{'\u21BA  Reset'}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.stepperColumn}>
          <StepperRow
            label={isHeightReps ? 'HEIGHT' : 'WEIGHT'}
            value={nextW}
            unit={weightUnit}
            step={weightStep}
            onChange={v => onNextChange('w', v)}
            onOpenPad={() => onOpenPad('w')}
          />
          <StepperRow
            label="REPS"
            value={nextR}
            unit="reps"
            step={1}
            onChange={v => onNextChange('r', v)}
            onOpenPad={() => onOpenPad('r')}
          />
        </View>
      )}
      {renderBottomButton()}
    </View>
  );
}

const stepperStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 6,
    paddingLeft: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: colors.secondary,
    minWidth: 54,
  },
  valueButton: {
    flex: 1,
    paddingVertical: 4,
  },
  valueText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  unitText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.secondary,
  },
  stepButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minusButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  plusButton: {
    borderWidth: 1,
    borderColor: 'rgba(141,194,138,0.3)',
    backgroundColor: colors.accentGlow,
  },
  stepButtonDisabled: {
    opacity: 0.3,
  },
});

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  setBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accentGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accent,
  },
  eyebrowText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: colors.secondary,
  },
  stepperColumn: {
    gap: 8,
  },
  timedDisplay: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  timedValue: {
    fontSize: 48,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1.5,
    color: colors.secondary,
    textAlign: 'center',
  },
  timedValueRunning: {
    color: colors.accent,
  },
  timedValueStopped: {
    color: colors.primary,
  },
  resetPill: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  resetText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
  },
  logButton: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
  },
  logButtonDisabled: {
    opacity: 0.5,
  },
  logButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onAccent,
    letterSpacing: 0.3,
  },
  stopIcon: {
    width: 14,
    height: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
});
