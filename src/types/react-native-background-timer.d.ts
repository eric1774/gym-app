declare module 'react-native-background-timer' {
  class BackgroundTimer {
    static setInterval(callback: () => void, delay: number): number;
    static clearInterval(intervalId: number): void;
    static setTimeout(callback: () => void, delay: number): number;
    static clearTimeout(timeoutId: number): void;
    static start(delay?: number): void;
    static stop(): void;
    static runBackgroundTimer(callback: () => void, delay: number): void;
    static stopBackgroundTimer(): void;
  }
  export default BackgroundTimer;
}
