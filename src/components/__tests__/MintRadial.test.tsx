import React from 'react';
import { render } from '@testing-library/react-native';
import { MintRadial } from '../MintRadial';

describe('MintRadial', () => {
  it('renders without crashing with default props', () => {
    const { toJSON } = render(<MintRadial />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders at given size, top, left', () => {
    const { getByTestId } = render(
      <MintRadial size={100} top={-20} left={-10} testID="radial" />,
    );
    const wrapper = getByTestId('radial');
    expect(wrapper.props.style).toMatchObject({
      width: 100, height: 100, top: -20, left: -10,
      position: 'absolute', overflow: 'hidden',
    });
  });

  it('uses right anchor when corner=tr', () => {
    const { getByTestId } = render(
      <MintRadial corner="tr" right={-15} testID="radial" />,
    );
    const wrapper = getByTestId('radial');
    expect(wrapper.props.style).toMatchObject({ right: -15 });
    expect(wrapper.props.style).not.toHaveProperty('left');
  });
});
