import React from 'react';
import { render } from '@testing-library/react-native';
import { ChartInspectCallout } from '../ChartInspectCallout';
import { ChartPoint } from '../../../types';

const point: ChartPoint = {
  sessionId: 5, date: '2026-04-22T00:00:00Z', bestWeightLb: 195, volumeLb: 18450, isPR: true,
};

describe('ChartInspectCallout', () => {
  it('renders point details', () => {
    const { getByText } = render(<ChartInspectCallout point={point} />);
    expect(getByText(/Apr 22/)).toBeTruthy();
    expect(getByText(/195 lb/)).toBeTruthy();
    expect(getByText(/18,450 vol/)).toBeTruthy();
  });

  it('shows PR badge when point.isPR=true', () => {
    const { getByText } = render(<ChartInspectCallout point={point} />);
    expect(getByText(/PR/)).toBeTruthy();
  });

  it('renders hint sub-line', () => {
    const { getByText } = render(<ChartInspectCallout point={point} />);
    expect(getByText(/Tap any point/i)).toBeTruthy();
  });

  it('renders empty fallback when point is null', () => {
    const { getByText } = render(<ChartInspectCallout point={null} />);
    expect(getByText(/No session selected/i)).toBeTruthy();
  });
});
