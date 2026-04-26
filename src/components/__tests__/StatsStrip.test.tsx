import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StatsStrip } from '../StatsStrip';

describe('StatsStrip', () => {
  const data = {
    sessions: { current: 3, lastWeek: 2 },
    prs: { current: 2, lastWeek: 1 },
    tonnage: { currentLb: 24500, lastWeekLb: 22400 },
  };

  it('renders session count, PR count, and formatted tonnage', () => {
    const { getByTestId } = render(<StatsStrip data={data} onPress={jest.fn()} />);
    expect(getByTestId('stats-strip-sessions-value').props.children).toBe('3');
    expect(getByTestId('stats-strip-prs-value').props.children).toBe('2');
    expect(getByTestId('stats-strip-tonnage-value').props.children).toBe('24.5K lb');
  });

  it('renders neutral "vs last wk" deltas for all 3 stats', () => {
    const { getByTestId } = render(<StatsStrip data={data} onPress={jest.fn()} />);
    expect(getByTestId('stats-strip-sessions-delta').props.children).toMatch(/vs last wk/);
    expect(getByTestId('stats-strip-prs-delta').props.children).toMatch(/vs last wk/);
    expect(getByTestId('stats-strip-tonnage-delta').props.children).toMatch(/vs last wk/);
  });

  it('PR value uses prGold color; sessions+tonnage use textSoft (no danger color)', () => {
    const { getByTestId } = render(<StatsStrip data={data} onPress={jest.fn()} />);
    const flat = (el: any) => {
      const styles = Array.isArray(el.props.style) ? el.props.style.flat() : [el.props.style];
      return styles.filter(Boolean).map((s: any) => s && s.color).filter(Boolean);
    };
    expect(flat(getByTestId('stats-strip-prs-value'))).toContain('#FFB800');     // prGold
    expect(flat(getByTestId('stats-strip-sessions-value'))).toContain('#BDC3CB'); // textSoft
    expect(flat(getByTestId('stats-strip-tonnage-value'))).toContain('#BDC3CB');  // textSoft
    // No danger anywhere
    ['stats-strip-prs-value', 'stats-strip-sessions-value', 'stats-strip-tonnage-value'].forEach((id) => {
      expect(flat(getByTestId(id))).not.toContain('#D9534F'); // danger
    });
  });

  it('fires onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<StatsStrip data={data} onPress={onPress} />);
    fireEvent.press(getByTestId('stats-strip'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows down arrow when current < lastWeek (still neutral color)', () => {
    const downData = { ...data, sessions: { current: 1, lastWeek: 3 } };
    const { getByTestId } = render(<StatsStrip data={downData} onPress={jest.fn()} />);
    const delta = getByTestId('stats-strip-sessions-delta');
    expect(delta.props.children).toContain('↓');
  });
});
