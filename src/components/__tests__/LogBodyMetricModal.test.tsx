import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { LogBodyMetricModal } from '../LogBodyMetricModal';

describe('LogBodyMetricModal — weight mode', () => {
  it('renders the weight title when mode=weight', () => {
    const { getByText } = render(
      <LogBodyMetricModal
        visible={true}
        mode="weight"
        initialDate="2026-04-22"
        onClose={jest.fn()}
        onSave={jest.fn()}
      />,
    );
    expect(getByText('Log Weight')).toBeTruthy();
  });

  it('Save button is disabled when value is empty', () => {
    const { getByTestId } = render(
      <LogBodyMetricModal
        visible={true}
        mode="weight"
        initialDate="2026-04-22"
        onClose={jest.fn()}
        onSave={jest.fn()}
      />,
    );
    const saveBtn = getByTestId('log-body-metric-save');
    expect(saveBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('Save button enables on valid weight value', () => {
    const { getByTestId } = render(
      <LogBodyMetricModal
        visible={true}
        mode="weight"
        initialDate="2026-04-22"
        onClose={jest.fn()}
        onSave={jest.fn()}
      />,
    );
    fireEvent.changeText(getByTestId('log-body-metric-value'), '177.4');
    expect(getByTestId('log-body-metric-save').props.accessibilityState?.disabled).toBe(false);
  });

  it('Save button stays disabled for out-of-range weight (< 50)', () => {
    const { getByTestId } = render(
      <LogBodyMetricModal
        visible={true}
        mode="weight"
        initialDate="2026-04-22"
        onClose={jest.fn()}
        onSave={jest.fn()}
      />,
    );
    fireEvent.changeText(getByTestId('log-body-metric-value'), '30');
    expect(getByTestId('log-body-metric-save').props.accessibilityState?.disabled).toBe(true);
  });

  it('calls onSave with normalized payload when Save is pressed', () => {
    const onSave = jest.fn();
    const { getByTestId } = render(
      <LogBodyMetricModal
        visible={true}
        mode="weight"
        initialDate="2026-04-22"
        onClose={jest.fn()}
        onSave={onSave}
      />,
    );
    fireEvent.changeText(getByTestId('log-body-metric-value'), '177.4');
    fireEvent.press(getByTestId('log-body-metric-save'));
    expect(onSave).toHaveBeenCalledWith({
      metricType: 'weight',
      value: 177.4,
      unit: 'lb',
      recordedDate: '2026-04-22',
      note: null,
    });
  });
});
