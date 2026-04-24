import React from 'react';
import { render } from '@testing-library/react-native';
import { GradientBackdrop } from '../GradientBackdrop';
import Svg from 'react-native-svg';

describe('GradientBackdrop', () => {
  it('renders an SVG with linear base + radial overlay', () => {
    const { UNSAFE_getByType } = render(
      <GradientBackdrop
        borderRadius={18}
        base={{ from: '#1E2024', to: '#1A3326', angleDeg: 135 }}
        overlays={[
          { type: 'radial', cx: '10%', cy: '10%', rx: '60%', ry: '60%',
            stops: [
              { offset: 0, color: '#8DC28A', opacity: 0.35 },
              { offset: 0.55, color: '#8DC28A', opacity: 0 },
            ] },
        ]}
      />,
    );
    expect(UNSAFE_getByType(Svg)).toBeTruthy();
  });

  it('renders an SVG with base only when overlays is empty', () => {
    const { UNSAFE_getByType } = render(
      <GradientBackdrop
        borderRadius={14}
        base={{ from: '#1E2024', to: '#1C2228', angleDeg: 165 }}
        overlays={[]}
      />,
    );
    expect(UNSAFE_getByType(Svg)).toBeTruthy();
  });

  it('renders multiple overlays', () => {
    const { UNSAFE_getAllByType } = render(
      <GradientBackdrop
        borderRadius={18}
        base={{ from: '#000', to: '#fff', angleDeg: 0 }}
        overlays={[
          { type: 'radial', cx: '10%', cy: '10%', rx: '60%', ry: '60%',
            stops: [{ offset: 0, color: '#fff', opacity: 0.5 }, { offset: 1, color: '#fff', opacity: 0 }] },
          { type: 'linear', angleDeg: 90,
            stops: [{ offset: 0, color: '#000', opacity: 0.3 }, { offset: 1, color: '#000', opacity: 0 }] },
        ]}
      />,
    );
    expect(UNSAFE_getAllByType(Svg).length).toBe(1);
  });
});
