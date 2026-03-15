import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RenameModal } from '../RenameModal';

describe('RenameModal', () => {
  it('renders title and current name', () => {
    const { getByText, getByDisplayValue } = render(
      <RenameModal
        visible={true}
        title="Rename Program"
        currentName="PPL"
        onClose={jest.fn()}
        onSave={jest.fn()}
      />,
    );

    expect(getByText('Rename Program')).toBeTruthy();
    expect(getByDisplayValue('PPL')).toBeTruthy();
  });

  it('Save button is disabled when name unchanged', () => {
    const onSave = jest.fn();
    const { getByText } = render(
      <RenameModal
        visible={true}
        title="Rename Program"
        currentName="PPL"
        onClose={jest.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.press(getByText('Save'));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('Save button is disabled when name is empty', () => {
    const onSave = jest.fn();
    const { getByText, getByDisplayValue } = render(
      <RenameModal
        visible={true}
        title="Rename Program"
        currentName="PPL"
        onClose={jest.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.changeText(getByDisplayValue('PPL'), '');
    fireEvent.press(getByText('Save'));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('calls onSave with trimmed name when valid', () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    const { getByText, getByDisplayValue } = render(
      <RenameModal
        visible={true}
        title="Rename Program"
        currentName="PPL"
        onClose={onClose}
        onSave={onSave}
      />,
    );

    fireEvent.changeText(getByDisplayValue('PPL'), '  Upper Body  ');
    fireEvent.press(getByText('Save'));
    expect(onSave).toHaveBeenCalledWith('Upper Body');
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Cancel pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <RenameModal
        visible={true}
        title="Rename Program"
        currentName="PPL"
        onClose={onClose}
        onSave={jest.fn()}
      />,
    );

    fireEvent.press(getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
