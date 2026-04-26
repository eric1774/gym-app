import React from 'react';
import { render } from '@testing-library/react-native';
import { WaterDropIcon } from '../WaterDropIcon';
import { colors } from '../../theme/colors';

describe('WaterDropIcon', () => {
  it('renders an Svg at the default size', () => {
    const { UNSAFE_getByType } = render(<WaterDropIcon testID="drop" />);
    // react-native-svg renders <Svg> at the top level
    const svg = UNSAFE_getByType(require('react-native-svg').default);
    expect(svg.props.width).toBe(14);
    expect(svg.props.height).toBe(14);
  });

  it('respects size prop', () => {
    const { UNSAFE_getByType } = render(<WaterDropIcon size={32} />);
    const svg = UNSAFE_getByType(require('react-native-svg').default);
    expect(svg.props.width).toBe(32);
    expect(svg.props.height).toBe(32);
  });

  it('uses colors.water as default fill', () => {
    const { UNSAFE_getByType } = render(<WaterDropIcon />);
    const Path = require('react-native-svg').Path;
    const path = UNSAFE_getByType(Path);
    expect(path.props.fill).toBe(colors.water);
  });

  it('respects custom color', () => {
    const { UNSAFE_getByType } = render(<WaterDropIcon color="#FF0000" />);
    const Path = require('react-native-svg').Path;
    const path = UNSAFE_getByType(Path);
    expect(path.props.fill).toBe('#FF0000');
  });
});
