// Mock data for the workout prototype — mirrors shape of real app's types.
// 10 exercises across categories, with realistic last-session history.

const EXERCISES = [
  { id: 1, name: 'Barbell Back Squat', category: 'legs', muscle: 'Quads · Glutes', measurementType: 'reps',
    target: { sets: 4, reps: 6, weight: 225 },
    last: [{ w: 215, r: 6 }, { w: 225, r: 6 }, { w: 225, r: 5 }, { w: 225, r: 4 }],
    restSec: 120 },
  { id: 2, name: 'Romanian Deadlift', category: 'legs', muscle: 'Hamstrings · Glutes', measurementType: 'reps',
    target: { sets: 3, reps: 8, weight: 185 },
    last: [{ w: 175, r: 8 }, { w: 185, r: 8 }, { w: 185, r: 7 }],
    restSec: 90 },
  { id: 3, name: 'Bench Press', category: 'chest', muscle: 'Chest · Triceps', measurementType: 'reps',
    target: { sets: 4, reps: 8, weight: 155 },
    last: [{ w: 145, r: 8 }, { w: 155, r: 8 }, { w: 155, r: 7 }, { w: 155, r: 6 }],
    restSec: 90 },
  { id: 4, name: 'Incline Dumbbell Press', category: 'chest', muscle: 'Upper Chest', measurementType: 'reps',
    target: { sets: 3, reps: 10, weight: 60 },
    last: [{ w: 55, r: 10 }, { w: 60, r: 10 }, { w: 60, r: 9 }],
    restSec: 75 },
  { id: 5, name: 'Pull-Up', category: 'back', muscle: 'Lats · Biceps', measurementType: 'reps',
    target: { sets: 4, reps: 8, weight: 0 },
    last: [{ w: 0, r: 10 }, { w: 0, r: 9 }, { w: 0, r: 8 }, { w: 0, r: 6 }],
    restSec: 90 },
  { id: 6, name: 'Barbell Row', category: 'back', muscle: 'Mid-back · Rhomboids', measurementType: 'reps',
    target: { sets: 3, reps: 10, weight: 135 },
    last: [{ w: 125, r: 10 }, { w: 135, r: 10 }, { w: 135, r: 9 }],
    restSec: 75 },
  { id: 7, name: 'Overhead Press', category: 'shoulders', muscle: 'Delts · Triceps', measurementType: 'reps',
    target: { sets: 3, reps: 6, weight: 115 },
    last: [{ w: 105, r: 6 }, { w: 115, r: 6 }, { w: 115, r: 5 }],
    restSec: 90 },
  { id: 8, name: 'Lateral Raise', category: 'shoulders', muscle: 'Side Delts', measurementType: 'reps',
    target: { sets: 3, reps: 12, weight: 20 },
    last: [{ w: 20, r: 12 }, { w: 20, r: 12 }, { w: 20, r: 11 }],
    restSec: 60 },
  { id: 9, name: 'Plank', category: 'core', muscle: 'Abs · Obliques', measurementType: 'timed',
    target: { sets: 3, reps: 60, weight: 0 },
    last: [{ w: 0, r: 60 }, { w: 0, r: 55 }, { w: 0, r: 45 }],
    restSec: 60 },
  { id: 10, name: 'Treadmill Intervals', category: 'conditioning', muscle: 'Cardio', measurementType: 'timed',
    target: { sets: 1, reps: 900, weight: 0 },
    last: [{ w: 0, r: 900 }],
    restSec: 90 },
];

// Colors lifted directly from src/theme/colors.ts
const GYM = {
  bg: '#151718',
  surface: '#1E2024',
  surfaceHi: '#24272C',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',
  primary: '#FFFFFF',
  secondary: '#8E9298',
  secondaryDim: '#6A6E74',
  accent: '#8DC28A',
  accentDim: '#1A3326',
  accentGlow: 'rgba(141,194,138,0.15)',
  onAccent: '#1A1A1A',
  danger: '#D9534F',
  timer: '#FACC15',
  prGold: '#FFB800',
  cat: {
    chest: '#E8845C', back: '#5B9BF0', legs: '#B57AE0',
    shoulders: '#4ECDC4', arms: '#8DC28A', core: '#F0B830',
    conditioning: '#E0697E',
  },
};

function fmtDuration(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
function fmtElapsed(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

Object.assign(window, { EXERCISES, GYM, fmtDuration, fmtElapsed });
