const React = require('react');

const createMockComponent = (name) => {
  const component = (props) => React.createElement(name, props, props.children);
  component.displayName = name;
  return component;
};

module.exports = {
  __esModule: true,
  default: createMockComponent('Svg'),
  Svg: createMockComponent('Svg'),
  Path: createMockComponent('Path'),
  Rect: createMockComponent('Rect'),
  Line: createMockComponent('Line'),
  Circle: createMockComponent('Circle'),
  G: createMockComponent('G'),
  Text: createMockComponent('SvgText'),
  Polyline: createMockComponent('Polyline'),
  Polygon: createMockComponent('Polygon'),
  Defs: createMockComponent('Defs'),
  LinearGradient: createMockComponent('LinearGradient'),
  RadialGradient: createMockComponent('RadialGradient'),
  Stop: createMockComponent('Stop'),
};
