import React, { createRef } from 'react';
import { render, act } from '@testing-library/react-native';
import { ExportToast, ExportToastHandle } from '../ExportToast';

describe('ExportToast', () => {
  it('renders nothing when no toast shown', () => {
    const ref = createRef<ExportToastHandle>();
    const { toJSON } = render(<ExportToast ref={ref} />);
    expect(toJSON()).toBeNull();
  });

  it('shows success message after show call', () => {
    const ref = createRef<ExportToastHandle>();
    const { getByText } = render(<ExportToast ref={ref} />);
    act(() => { ref.current!.show('Export saved', 'success'); });
    expect(getByText('Export saved')).toBeTruthy();
  });

  it('shows error message after show call', () => {
    const ref = createRef<ExportToastHandle>();
    const { getByText } = render(<ExportToast ref={ref} />);
    act(() => { ref.current!.show('Export failed', 'error'); });
    expect(getByText('Export failed')).toBeTruthy();
  });

  it('exposes show via ref', () => {
    const ref = createRef<ExportToastHandle>();
    render(<ExportToast ref={ref} />);
    expect(ref.current).not.toBeNull();
    expect(typeof ref.current!.show).toBe('function');
  });
});
