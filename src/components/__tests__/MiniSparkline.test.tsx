import React from 'react';
import {render} from '@testing-library/react-native';
import type {ReactTestRendererJSON} from 'react-test-renderer';
import {MiniSparkline} from '../MiniSparkline';
import {colors} from '../../theme/colors';

/** Helper: extract single JSON tree from render result */
const getTree = (data: number[], props?: Record<string, unknown>) => {
  const {toJSON} = render(<MiniSparkline data={data} {...props} />);
  return toJSON() as ReactTestRendererJSON | null;
};

/** Helper: find the Polyline child in the rendered tree */
const findPolyline = (tree: ReactTestRendererJSON) =>
  (tree.children as ReactTestRendererJSON[] | null)?.find(
    (child) => typeof child === 'object' && child.type === 'Polyline',
  ) as ReactTestRendererJSON | undefined;

describe('MiniSparkline', () => {
  it('renders nothing for empty data array', () => {
    const tree = getTree([]);
    expect(tree).toBeNull();
  });

  it('renders SVG with Polyline for valid data', () => {
    const tree = getTree([1, 3, 2, 5, 4]);
    expect(tree).not.toBeNull();

    const polyline = findPolyline(tree!);
    expect(polyline).toBeDefined();
    expect(typeof polyline!.props.points).toBe('string');
    expect((polyline!.props.points as string).length).toBeGreaterThan(0);
  });

  it('handles single data point', () => {
    const tree = getTree([42]);
    expect(tree).not.toBeNull();

    const polyline = findPolyline(tree!);
    expect(polyline).toBeDefined();

    // Points string should have exactly two coordinate pairs (horizontal line)
    const pairs = (polyline!.props.points as string).trim().split(/\s+/);
    expect(pairs).toHaveLength(2);
  });

  it('handles all-same values without division by zero', () => {
    const tree = getTree([5, 5, 5, 5]);
    expect(tree).not.toBeNull();

    const polyline = findPolyline(tree!);
    expect(polyline).toBeDefined();

    // All y-coordinates should be equal (flat line at mid-height)
    const pairs = (polyline!.props.points as string).trim().split(/\s+/);
    const yValues = pairs.map((pair: string) => parseFloat(pair.split(',')[1]));
    const uniqueY = new Set(yValues);
    expect(uniqueY.size).toBe(1);
  });

  it('respects custom color prop', () => {
    const tree = getTree([1, 2, 3], {color: '#FF0000'});
    const polyline = findPolyline(tree!);
    expect(polyline!.props.stroke).toBe('#FF0000');
  });

  it('respects custom width and height', () => {
    const tree = getTree([1, 2, 3], {width: 120, height: 40});
    expect(tree!.props.width).toBe(120);
    expect(tree!.props.height).toBe(40);
  });

  it('uses default accent color when no color provided', () => {
    const tree = getTree([1, 2, 3]);
    const polyline = findPolyline(tree!);
    expect(polyline!.props.stroke).toBe(colors.accent);
    expect(polyline!.props.stroke).toBe('#8DC28A');
  });

  it('y-axis is inverted (highest value has smallest y)', () => {
    // data=[0, 10]: first point is min (largest y), second is max (smallest y)
    const tree = getTree([0, 10]);
    const polyline = findPolyline(tree!);

    const pairs = (polyline!.props.points as string).trim().split(/\s+/);
    const y1 = parseFloat(pairs[0].split(',')[1]);
    const y2 = parseFloat(pairs[1].split(',')[1]);

    // Higher value (10) should map to smaller y (closer to top of SVG)
    expect(y2).toBeLessThan(y1);
  });
});
