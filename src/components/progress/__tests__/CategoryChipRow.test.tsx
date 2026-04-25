import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CategoryChipRow } from '../CategoryChipRow';

describe('CategoryChipRow', () => {
  it('renders All chip plus all categories', () => {
    const { getByText } = render(
      <CategoryChipRow active="all" onChange={() => {}} />,
    );
    expect(getByText('All')).toBeTruthy();
    expect(getByText('Chest')).toBeTruthy();
    expect(getByText('Legs')).toBeTruthy();
  });

  it('All chip is the initial active state', () => {
    const { getByTestId } = render(
      <CategoryChipRow active="all" onChange={() => {}} />,
    );
    const allChip = getByTestId('chip-all');
    const flat = Array.isArray(allChip.props.style)
      ? Object.assign({}, ...allChip.props.style)
      : allChip.props.style;
    expect(flat.backgroundColor).toBe('#8DC28A'); // colors.accent
  });

  it('calls onChange with category key when chip pressed', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <CategoryChipRow active="all" onChange={onChange} />,
    );
    fireEvent.press(getByTestId('chip-chest'));
    expect(onChange).toHaveBeenCalledWith('chest');
  });

  it('All chip resets active to all', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <CategoryChipRow active="chest" onChange={onChange} />,
    );
    fireEvent.press(getByTestId('chip-all'));
    expect(onChange).toHaveBeenCalledWith('all');
  });
});
