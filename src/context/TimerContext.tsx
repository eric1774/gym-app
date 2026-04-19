import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import BackgroundTimer from 'react-native-background-timer';
import HapticFeedback from 'react-native-haptic-feedback';
import notifee, { AndroidImportance } from '@notifee/react-native';
import Sound from 'react-native-sound';

// ─── Countdown sound helpers ────────────────────────────────────────────────

// Play sounds alongside other audio (e.g. music) without interrupting
Sound.setCategory('Playback', true);

// Preload the two countdown sounds so playback is instant
const countdownBeep = new Sound('countdown_beep.wav', Sound.MAIN_BUNDLE, err => {
  if (err) { console.warn('Failed to load countdown_beep:', err); }
});
const countdownDone = new Sound('countdown_done.wav', Sound.MAIN_BUNDLE, err => {
  if (err) { console.warn('Failed to load countdown_done:', err); }
});
// Keep volume soft — audible but not jarring in a gym
countdownBeep.setVolume(0.5);
countdownDone.setVolume(0.6);

// ─── Notification helpers ────────────────────────────────────────────────────

const CHANNEL_ID = 'rest_timer';
const NOTIF_ID = 'rest_timer_active';

async function ensureChannel(): Promise<void> {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Rest Timer',
    importance: AndroidImportance.LOW,
    sound: 'default',
  });
}

async function showTimerNotification(remainingSeconds: number): Promise<void> {
  const m = Math.floor(remainingSeconds / 60);
  const s = remainingSeconds % 60;
  const timeStr = `${m}:${String(s).padStart(2, '0')}`;
  await notifee.displayNotification({
    id: NOTIF_ID,
    title: 'Rest Timer',
    body: `${timeStr} remaining`,
    android: {
      channelId: CHANNEL_ID,
      smallIcon: 'ic_launcher',
      ongoing: true,
      onlyAlertOnce: true,
    },
  });
}

async function cancelTimerNotification(): Promise<void> {
  try {
    await notifee.cancelNotification(NOTIF_ID);
  } catch {
    // ignore
  }
}

// ─── Context types ───────────────────────────────────────────────────────────

interface TimerContextValue {
  remainingSeconds: number | null;
  totalSeconds: number | null;
  isRunning: boolean;
  startTimer: (durationSeconds: number) => void;
  stopTimer: () => void;
  addTime: (deltaSeconds: number) => void;
}

const TimerContext = createContext<TimerContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [totalSeconds, setTotalSeconds] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const intervalIdRef = useRef<number | null>(null);
  const remainingRef = useRef<number | null>(null);

  // Keep ref in sync so the interval closure can read current value
  useEffect(() => {
    remainingRef.current = remainingSeconds;
  }, [remainingSeconds]);

  const clearExistingInterval = useCallback(() => {
    if (intervalIdRef.current !== null) {
      BackgroundTimer.clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  }, []);

  const onComplete = useCallback(async () => {
    clearExistingInterval();
    setRemainingSeconds(null);
    setTotalSeconds(null);
    setIsRunning(false);
    await cancelTimerNotification();
    HapticFeedback.trigger('notificationSuccess', { enableVibrateFallback: true });
    setTimeout(() => {
      HapticFeedback.trigger('notificationSuccess', { enableVibrateFallback: true });
    }, 400);
  }, [clearExistingInterval]);

  const startTimer = useCallback(
    async (durationSeconds: number) => {
      clearExistingInterval();
      await cancelTimerNotification();

      setTotalSeconds(durationSeconds);
      setRemainingSeconds(durationSeconds);
      setIsRunning(true);
      remainingRef.current = durationSeconds;

      await ensureChannel();
      await showTimerNotification(durationSeconds);

      intervalIdRef.current = BackgroundTimer.setInterval(async () => {
        const current = remainingRef.current;
        if (current === null) {
          return;
        }

        const next = current - 1;
        remainingRef.current = next;
        setRemainingSeconds(next);

        if (next <= 0) {
          // Final "boop" — lower pitch signals rest is over
          countdownDone.stop();
          countdownDone.play();
          onComplete();
          return;
        }

        // Countdown beeps at 3, 2, 1 seconds remaining
        if (next >= 1 && next <= 3) {
          countdownBeep.stop();
          countdownBeep.play();
          HapticFeedback.trigger('impactLight', { enableVibrateFallback: true });
        }

        if (next % 5 === 0) {
          try {
            await showTimerNotification(next);
          } catch {
            // notification update failures are non-fatal
          }
        }
      }, 1000);
    },
    [clearExistingInterval, onComplete],
  );

  const stopTimer = useCallback(async () => {
    clearExistingInterval();
    setRemainingSeconds(null);
    setTotalSeconds(null);
    setIsRunning(false);
    await cancelTimerNotification();
  }, [clearExistingInterval]);

  const addTime = useCallback((deltaSeconds: number) => {
    const current = remainingRef.current;
    if (current === null || !isRunning) { return; }
    const nextRemaining = Math.max(0, current + deltaSeconds);
    remainingRef.current = nextRemaining;
    setRemainingSeconds(nextRemaining);
    setTotalSeconds(prev => (prev === null ? null : prev + deltaSeconds));
    // Refresh the ongoing notification so the shown time matches
    showTimerNotification(nextRemaining).catch(() => {
      // non-fatal
    });
  }, [isRunning]);

  useEffect(() => {
    return () => {
      clearExistingInterval();
      cancelTimerNotification();
    };
  }, [clearExistingInterval]);

  return (
    <TimerContext.Provider
      value={{ remainingSeconds, totalSeconds, isRunning, startTimer, stopTimer, addTime }}>
      {children}
    </TimerContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTimer(): TimerContextValue {
  const ctx = useContext(TimerContext);
  if (!ctx) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return ctx;
}
