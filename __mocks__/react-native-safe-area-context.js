const React = require('react');

const SafeAreaProvider = ({ children }) => React.createElement('SafeAreaProvider', null, children);
const SafeAreaView = ({ children, ...props }) => React.createElement('SafeAreaView', props, children);

const useSafeAreaInsets = () => ({ top: 0, right: 0, bottom: 0, left: 0 });
const useSafeAreaFrame = () => ({ x: 0, y: 0, width: 390, height: 844 });

module.exports = {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
  useSafeAreaFrame,
  SafeAreaInsetsContext: {
    Consumer: ({ children }) => children({ top: 0, right: 0, bottom: 0, left: 0 }),
  },
  initialWindowMetrics: {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
  },
};
