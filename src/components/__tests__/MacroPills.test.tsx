import React from 'react';
import { render } from '@testing-library/react-native';
import { MacroPills } from '../MacroPills';

describe('MacroPills', () => {
  it('renders non-zero macro pills with correct text format', () => {
    const { getByText } = render(
      <MacroPills protein={32} carbs={45} fat={12} />
    );
    expect(getByText('32g P')).toBeTruthy();
    expect(getByText('45g C')).toBeTruthy();
    expect(getByText('12g F')).toBeTruthy();
  });

  it('hides zero-value macros (D-04/D-14)', () => {
    const { getByText, queryByText } = render(
      <MacroPills protein={30} carbs={0} fat={0} />
    );
    expect(getByText('30g P')).toBeTruthy();
    expect(queryByText(/C/)).toBeNull();
    expect(queryByText(/F/)).toBeNull();
  });

  it('returns null when all macros are zero', () => {
    const { toJSON } = render(
      <MacroPills protein={0} carbs={0} fat={0} />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders only protein and fat when carbs is zero', () => {
    const { getByText, queryByText } = render(
      <MacroPills protein={20} carbs={0} fat={15} />
    );
    expect(getByText('20g P')).toBeTruthy();
    expect(getByText('15g F')).toBeTruthy();
    expect(queryByText(/C/)).toBeNull();
  });
});
