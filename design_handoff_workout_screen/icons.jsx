// Shared icons (minimal line style) + small UI primitives for the prototype.
/* global React */
const { useState, useEffect, useRef } = React;

const Icon = {
  Plus: ({ s = 20, c = '#fff' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke={c} strokeWidth={2.4} strokeLinecap="round" />
    </svg>
  ),
  Minus: ({ s = 20, c = '#fff' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14" stroke={c} strokeWidth={2.4} strokeLinecap="round" />
    </svg>
  ),
  Check: ({ s = 18, c = '#fff' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M4 12l5 5L20 6" stroke={c} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  History: ({ s = 18, c = '#8E9298' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M12 8v4l3 3" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.1 11a9 9 0 1 1 .1 2" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 4v7h7" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  More: ({ s = 20, c = '#8E9298' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="5" cy="12" r="1.6" fill={c} />
      <circle cx="12" cy="12" r="1.6" fill={c} />
      <circle cx="19" cy="12" r="1.6" fill={c} />
    </svg>
  ),
  Chevron: ({ s = 18, c = '#8E9298', dir = 'down' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
      style={{ transform: dir === 'up' ? 'rotate(180deg)' : dir === 'right' ? 'rotate(-90deg)' : dir === 'left' ? 'rotate(90deg)' : 'none' }}>
      <path d="M6 9l6 6 6-6" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Swap: ({ s = 18, c = '#8E9298' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M7 4L3 8l4 4M3 8h13M17 20l4-4-4-4M21 16H8" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Flame: ({ s = 16, c = '#FFB800' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={c}>
      <path d="M12 2s4 4 4 8a4 4 0 1 1-8 0c0-2 1-3 1-3s-3 1-3 5a6 6 0 0 0 12 0c0-6-6-10-6-10z" />
    </svg>
  ),
  Trophy: ({ s = 14, c = '#FFB800' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4zM6 6H3v2a3 3 0 0 0 3 3M18 6h3v2a3 3 0 0 1-3 3M10 16h4v4h-4z" stroke={c} strokeWidth={1.8} strokeLinejoin="round" />
    </svg>
  ),
  Close: ({ s = 20, c = '#8E9298' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6L6 18" stroke={c} strokeWidth={2.2} strokeLinecap="round" />
    </svg>
  ),
  Timer: ({ s = 16, c = '#FACC15' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="13" r="8" stroke={c} strokeWidth={2} />
      <path d="M12 9v4l2 2M9 3h6" stroke={c} strokeWidth={2} strokeLinecap="round" />
    </svg>
  ),
  Heart: ({ s = 14, c = '#E0697E' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={c}>
      <path d="M12 21s-7-4.5-9.5-9a5.5 5.5 0 0 1 9.5-5 5.5 5.5 0 0 1 9.5 5c-2.5 4.5-9.5 9-9.5 9z" />
    </svg>
  ),
  Bluetooth: ({ s = 12, c = '#5B9BF0' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M7 7l10 10-5 5V2l5 5L7 17" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Backspace: ({ s = 22, c = '#fff' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M22 5H9l-6 7 6 7h13a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z" stroke={c} strokeWidth={1.8} strokeLinejoin="round" />
      <path d="M15 10l-4 4M11 10l4 4" stroke={c} strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  ),
};

Object.assign(window, { Icon });
