import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CreateProgramModal } from '../CreateProgramModal';
import { createProgram } from '../../db/programs';

jest.mock('../../db/programs', () => ({
  createProgram: jest.fn().mockResolvedValue({
    id: 1,
    name: 'Test Program',
    weeks: 4,
    currentWeek: 1,
    startDate: null,
    createdAt: '',
    isActive: true,
  }),
}));

const mockCreateProgram = createProgram as jest.Mock;

describe('CreateProgramModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateProgram.mockResolvedValue({
      id: 1,
      name: 'Test Program',
      weeks: 4,
      currentWeek: 1,
      startDate: null,
      createdAt: '',
      isActive: true,
    });
  });

  it('renders Create Program title when visible', () => {
    const { getAllByText } = render(
      <CreateProgramModal visible={true} onClose={jest.fn()} onCreated={jest.fn()} />,
    );

    // Title and button both say 'Create Program'
    const elements = getAllByText('Create Program');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('submit is disabled when name is empty', () => {
    const onCreated = jest.fn();

    const { getAllByText } = render(
      <CreateProgramModal visible={true} onClose={jest.fn()} onCreated={onCreated} />,
    );

    // Name is empty by default, weeks defaults to '4' (valid)
    // Press submit button
    const buttons = getAllByText('Create Program');
    fireEvent.press(buttons[buttons.length - 1]);

    expect(mockCreateProgram).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('submit is disabled when weeks is invalid', () => {
    const onCreated = jest.fn();

    const { getByPlaceholderText, getByDisplayValue, getAllByText } = render(
      <CreateProgramModal visible={true} onClose={jest.fn()} onCreated={onCreated} />,
    );

    // Fill name
    fireEvent.changeText(getByPlaceholderText('Program name'), 'PPL');
    // Set weeks to 0 (invalid — weeksNum < 1)
    fireEvent.changeText(getByDisplayValue('4'), '0');

    const buttons = getAllByText('Create Program');
    fireEvent.press(buttons[buttons.length - 1]);

    expect(mockCreateProgram).not.toHaveBeenCalled();
  });

  it('calls createProgram and onCreated with valid form', async () => {
    const onCreated = jest.fn();

    const { getByPlaceholderText, getAllByText } = render(
      <CreateProgramModal visible={true} onClose={jest.fn()} onCreated={onCreated} />,
    );

    // Fill name, keep weeks at default '4'
    fireEvent.changeText(getByPlaceholderText('Program name'), 'Push Pull Legs');

    const buttons = getAllByText('Create Program');
    fireEvent.press(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(mockCreateProgram).toHaveBeenCalledWith('Push Pull Legs', 4);
    });

    expect(onCreated).toHaveBeenCalled();
  });
});
