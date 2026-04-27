import React from 'react';
import { render } from '@testing-library/react-native';
import { SearchIcon } from '../SearchIcon';

describe('SearchIcon', () => {
  it('renders without crashing with default props', () => {
    const { toJSON } = render(<SearchIcon />);
    expect(toJSON()).toBeTruthy();
  });

  it('accepts size and color props', () => {
    const { toJSON } = render(<SearchIcon size={20} color="#FF0000" />);
    expect(toJSON()).toBeTruthy();
  });
});
