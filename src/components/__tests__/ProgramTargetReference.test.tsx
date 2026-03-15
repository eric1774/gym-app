import React from 'react';
import { render } from '@testing-library/react-native';
import { ProgramTargetReference } from '../ProgramTargetReference';

describe('ProgramTargetReference', () => {
  it('displays target without weight when weight is 0', () => {
    const { getByText, queryByText } = render(
      <ProgramTargetReference targetSets={3} targetReps={10} targetWeightKg={0} />,
    );
    expect(getByText('3x10')).toBeTruthy();
    expect(queryByText(/@/)).toBeNull();
  });

  it('displays target with weight', () => {
    const { getByText } = render(
      <ProgramTargetReference targetSets={4} targetReps={8} targetWeightKg={185} />,
    );
    expect(getByText('4x8 @ 185lb')).toBeTruthy();
  });
});
