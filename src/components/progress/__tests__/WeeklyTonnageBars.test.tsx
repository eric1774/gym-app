import React from 'react';
import { render } from '@testing-library/react-native';
import { WeeklyTonnageBars } from '../WeeklyTonnageBars';

describe('WeeklyTonnageBars', () => {
  it('renders 4 bars', () => {
    const { getAllByTestId } = render(
      <WeeklyTonnageBars values={[9500, 13200, 17400, 18450]} />,
    );
    expect(getAllByTestId(/^bar-/)).toHaveLength(4);
  });

  it('current week bar (last) uses mint accent', () => {
    const { getByTestId } = render(
      <WeeklyTonnageBars values={[9500, 13200, 17400, 18450]} />,
    );
    const cur = getByTestId('bar-3');
    const flat = Array.isArray(cur.props.style)
      ? Object.assign({}, ...cur.props.style)
      : cur.props.style;
    expect(flat.backgroundColor).toBe('#8DC28A');
  });

  it('historical bars use slate', () => {
    const { getByTestId } = render(
      <WeeklyTonnageBars values={[9500, 13200, 17400, 18450]} />,
    );
    const hist = getByTestId('bar-0');
    const flat = Array.isArray(hist.props.style)
      ? Object.assign({}, ...hist.props.style)
      : hist.props.style;
    expect(flat.backgroundColor).toBe('#5B7A95');
  });

  it('renders timeline labels 4w / 3w / 2w / this', () => {
    const { getByText } = render(
      <WeeklyTonnageBars values={[9500, 13200, 17400, 18450]} />,
    );
    expect(getByText('4w ago')).toBeTruthy();
    expect(getByText('this')).toBeTruthy();
  });
});
