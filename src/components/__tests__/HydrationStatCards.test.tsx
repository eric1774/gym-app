import React from 'react';
import { render } from '@testing-library/react-native';
import { HydrationStatCards } from '../HydrationStatCards';

describe('HydrationStatCards', () => {
  it('renders streak count "5" and sublabel "day streak" when streakDays=5', () => {
    const { getByText } = render(
      <HydrationStatCards streakDays={5} weeklyAvgOz={46.08} goalOz={64} />,
    );
    expect(getByText('5')).toBeTruthy();
    expect(getByText('day streak')).toBeTruthy();
  });

  it('renders "0" and "day streak" when streakDays=0 (empty state)', () => {
    const { getByText } = render(
      <HydrationStatCards streakDays={0} weeklyAvgOz={46.08} goalOz={64} />,
    );
    expect(getByText('0')).toBeTruthy();
    expect(getByText('day streak')).toBeTruthy();
  });

  it('renders "72%" and "7-day avg" when weeklyAvgOz=46.08 and goalOz=64', () => {
    const { getByText } = render(
      <HydrationStatCards streakDays={5} weeklyAvgOz={46.08} goalOz={64} />,
    );
    expect(getByText('72%')).toBeTruthy();
    expect(getByText('7-day avg')).toBeTruthy();
  });

  it('renders em-dash and "7-day avg" when weeklyAvgOz is null (no data)', () => {
    const { getByText } = render(
      <HydrationStatCards streakDays={0} weeklyAvgOz={null} goalOz={64} />,
    );
    expect(getByText('\u2014')).toBeTruthy();
    expect(getByText('7-day avg')).toBeTruthy();
  });

  it('renders "0%" and "7-day avg" when weeklyAvgOz=0 and goalOz=64', () => {
    const { getByText } = render(
      <HydrationStatCards streakDays={0} weeklyAvgOz={0} goalOz={64} />,
    );
    expect(getByText('0%')).toBeTruthy();
    expect(getByText('7-day avg')).toBeTruthy();
  });

  it('renders SVG icon containers for streak and weekly avg cards', () => {
    const { getByTestId } = render(
      <HydrationStatCards streakDays={5} weeklyAvgOz={46.08} goalOz={64} />,
    );
    expect(getByTestId('streak-icon-container')).toBeTruthy();
    expect(getByTestId('weeklyavg-icon-container')).toBeTruthy();
  });

  it('has correct accessibility labels "Streak: 5 days" and "Weekly average: 72%"', () => {
    const { getByLabelText } = render(
      <HydrationStatCards streakDays={5} weeklyAvgOz={46.08} goalOz={64} />,
    );
    expect(getByLabelText('Streak: 5 days')).toBeTruthy();
    expect(getByLabelText('Weekly average: 72%')).toBeTruthy();
  });
});
