import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NameSetupModal } from '../NameSetupModal';

describe('NameSetupModal', () => {
  it('renders welcome message + TextInput + Save + Skip buttons when visible', () => {
    const { getByText, getByTestId } = render(
      <NameSetupModal visible onSave={jest.fn()} onSkip={jest.fn()} />,
    );
    expect(getByText(/Welcome/i)).toBeTruthy();
    expect(getByTestId('name-setup-input')).toBeTruthy();
    expect(getByText('Save')).toBeTruthy();
    expect(getByText('Skip')).toBeTruthy();
  });

  it('renders nothing when not visible', () => {
    const { queryByTestId } = render(
      <NameSetupModal visible={false} onSave={jest.fn()} onSkip={jest.fn()} />,
    );
    expect(queryByTestId('name-setup-input')).toBeNull();
  });

  it('invokes onSave with the trimmed name when Save is tapped', () => {
    const onSave = jest.fn();
    const { getByTestId, getByText } = render(
      <NameSetupModal visible onSave={onSave} onSkip={jest.fn()} />,
    );
    fireEvent.changeText(getByTestId('name-setup-input'), '  Eric  ');
    fireEvent.press(getByText('Save'));
    expect(onSave).toHaveBeenCalledWith('Eric');
  });

  it('does not invoke onSave with an empty name', () => {
    const onSave = jest.fn();
    const { getByText } = render(
      <NameSetupModal visible onSave={onSave} onSkip={jest.fn()} />,
    );
    fireEvent.press(getByText('Save'));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('invokes onSkip when Skip is tapped', () => {
    const onSkip = jest.fn();
    const { getByText } = render(
      <NameSetupModal visible onSave={jest.fn()} onSkip={onSkip} />,
    );
    fireEvent.press(getByText('Skip'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
