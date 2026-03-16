import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AddDayModal } from '../AddDayModal';

describe('AddDayModal', () => {
  it('renders Add Day title when visible', () => {
    const { getAllByText } = render(
      <AddDayModal
        visible={true}
        onClose={jest.fn()}
        onAdd={jest.fn()}
        defaultName="Day 1"
      />,
    );

    // Title and button both say 'Add Day'
    const elements = getAllByText('Add Day');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('pre-fills default name', () => {
    const { getByDisplayValue } = render(
      <AddDayModal
        visible={true}
        onClose={jest.fn()}
        onAdd={jest.fn()}
        defaultName="Day 3"
      />,
    );

    expect(getByDisplayValue('Day 3')).toBeTruthy();
  });

  it('submit is disabled when name is empty', () => {
    const onAdd = jest.fn();
    const onClose = jest.fn();

    const { getByDisplayValue, getAllByText } = render(
      <AddDayModal
        visible={true}
        onClose={onClose}
        onAdd={onAdd}
        defaultName=""
      />,
    );

    // Name is already empty, but let's ensure it is
    fireEvent.changeText(getByDisplayValue(''), '');

    // Press submit button (last 'Add Day' — title is first)
    const buttons = getAllByText('Add Day');
    fireEvent.press(buttons[buttons.length - 1]);

    expect(onAdd).not.toHaveBeenCalled();
  });

  it('calls onAdd with trimmed name on valid submit', () => {
    const onAdd = jest.fn();
    const onClose = jest.fn();

    const { getByDisplayValue, getAllByText } = render(
      <AddDayModal
        visible={true}
        onClose={onClose}
        onAdd={onAdd}
        defaultName="Day 1"
      />,
    );

    // Change name to something with surrounding whitespace
    fireEvent.changeText(getByDisplayValue('Day 1'), '  Leg Day  ');

    // Press submit button (last occurrence)
    const buttons = getAllByText('Add Day');
    fireEvent.press(buttons[buttons.length - 1]);

    expect(onAdd).toHaveBeenCalledWith('Leg Day');
    expect(onClose).toHaveBeenCalled();
  });
});
