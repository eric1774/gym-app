import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import HapticFeedback from 'react-native-haptic-feedback';
import { colors } from '../theme/colors';
import { Plus, Minus, Check } from './icons';
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

  const handleLog = () => {
    if (isLoggingDisabled) { return; }
    onLog();
    HapticFeedback.trigger('impactMedium', { enableVibrateFallback: true });
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
          {timedStopwatchDisplay ?? (
            <Text style={styles.timedValue}>{formatDuration(nextR)}</Text>
          )}
        </View>
      ) : (
        <View style={styles.stepperColumn}>
          <StepperRow
            label="WEIGHT"
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
      <TouchableOpacity
        style={[styles.logButton, isLoggingDisabled && styles.logButtonDisabled]}
        onPress={handleLog}
        disabled={isLoggingDisabled}
        activeOpacity={0.85}>
        <Check size={18} color={colors.onAccent} />
        <Text style={styles.logButtonText}>LOG SET {setNumber}</Text>
      </TouchableOpacity>
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
    fontSize: 28,
    fontWeight: '700',
    color: colors.timerActive,
    fontVariant: ['tabular-nums'],
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
});
