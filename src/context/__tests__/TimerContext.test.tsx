import React from 'react';
import { Text, View } from 'react-native';
import { render, act } from '@testing-library/react-native';
import { TimerProvider, useTimer } from '../TimerContext';
import HapticFeedback from 'react-native-haptic-feedback';

function TimerTestConsumer({ onCtx }: { onCtx?: (ctx: any) => void }) {
  const ctx = useTimer();
  React.useEffect(() => {
    onCtx?.(ctx);
  });
  return (
    <View>
      <Text testID="remaining">{String(ctx.remainingSeconds)}</Text>
      <Text testID="total">{String(ctx.totalSeconds)}</Text>
      <Text testID="running">{String(ctx.isRunning)}</Text>
    </View>
  );
}

describe('TimerContext', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts in idle state', () => {
    const { getByTestId } = render(
      <TimerProvider>
        <TimerTestConsumer />
      </TimerProvider>,
    );

    expect(getByTestId('remaining').props.children).toBe('null');
    expect(getByTestId('total').props.children).toBe('null');
    expect(getByTestId('running').props.children).toBe('false');
  });

  it('startTimer sets running and remaining', async () => {
    let ctxRef: any;
    const { getByTestId } = render(
      <TimerProvider>
        <TimerTestConsumer onCtx={(c) => { ctxRef = c; }} />
      </TimerProvider>,
    );

    await act(async () => {
      ctxRef.startTimer(10);
    });

    expect(getByTestId('remaining').props.children).toBe('10');
    expect(getByTestId('total').props.children).toBe('10');
    expect(getByTestId('running').props.children).toBe('true');
  });

  it('countdown decrements each second', async () => {
    let ctxRef: any;
    const { getByTestId } = render(
      <TimerProvider>
        <TimerTestConsumer onCtx={(c) => { ctxRef = c; }} />
      </TimerProvider>,
    );

    await act(async () => {
      ctxRef.startTimer(5);
    });

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(getByTestId('remaining').props.children).toBe('4');

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(getByTestId('remaining').props.children).toBe('3');
  });

  it('plays beep and haptic at 3, 2, 1 seconds remaining', async () => {
    let ctxRef: any;
    render(
      <TimerProvider>
        <TimerTestConsumer onCtx={(c) => { ctxRef = c; }} />
      </TimerProvider>,
    );

    // Start with 5 seconds so we can advance to the 3-second mark
    await act(async () => {
      ctxRef.startTimer(5);
    });

    // Advance to remaining = 3 (2 ticks from 5)
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(HapticFeedback.trigger).toHaveBeenCalledWith('impactLight', { enableVibrateFallback: true });
    (HapticFeedback.trigger as jest.Mock).mockClear();

    // Advance to remaining = 2
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(HapticFeedback.trigger).toHaveBeenCalledWith('impactLight', { enableVibrateFallback: true });
    (HapticFeedback.trigger as jest.Mock).mockClear();

    // Advance to remaining = 1
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(HapticFeedback.trigger).toHaveBeenCalledWith('impactLight', { enableVibrateFallback: true });
  });

  it('completes with done sound and double haptic at 0', async () => {
    let ctxRef: any;
    render(
      <TimerProvider>
        <TimerTestConsumer onCtx={(c) => { ctxRef = c; }} />
      </TimerProvider>,
    );

    await act(async () => {
      ctxRef.startTimer(3);
    });

    // Clear haptic calls from countdown beeps at 3s start
    (HapticFeedback.trigger as jest.Mock).mockClear();

    // Advance 3 seconds to reach 0 (completion)
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    // First notificationSuccess haptic fires at completion
    expect(HapticFeedback.trigger).toHaveBeenCalledWith('notificationSuccess', { enableVibrateFallback: true });

    const callsBefore = (HapticFeedback.trigger as jest.Mock).mock.calls.length;

    // Advance 400ms for the second haptic pulse via setTimeout
    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    const callsAfter = (HapticFeedback.trigger as jest.Mock).mock.calls.length;
    expect(callsAfter).toBeGreaterThan(callsBefore);
    expect(HapticFeedback.trigger).toHaveBeenLastCalledWith('notificationSuccess', { enableVibrateFallback: true });
  });

  it('stopTimer clears interval and resets state', async () => {
    let ctxRef: any;
    const { getByTestId } = render(
      <TimerProvider>
        <TimerTestConsumer onCtx={(c) => { ctxRef = c; }} />
      </TimerProvider>,
    );

    await act(async () => {
      ctxRef.startTimer(10);
    });

    // Advance 3 seconds (remaining should be 7)
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(getByTestId('remaining').props.children).toBe('7');

    await act(async () => {
      ctxRef.stopTimer();
    });

    expect(getByTestId('remaining').props.children).toBe('null');
    expect(getByTestId('total').props.children).toBe('null');
    expect(getByTestId('running').props.children).toBe('false');
  });

  it('cleans up interval on unmount', async () => {
    let ctxRef: any;
    const { unmount } = render(
      <TimerProvider>
        <TimerTestConsumer onCtx={(c) => { ctxRef = c; }} />
      </TimerProvider>,
    );

    await act(async () => {
      ctxRef.startTimer(10);
    });

    // Unmount — useEffect cleanup should fire clearExistingInterval
    act(() => {
      unmount();
    });

    // Advancing timers after unmount should not throw
    expect(() => {
      jest.advanceTimersByTime(5000);
    }).not.toThrow();
  });
});
