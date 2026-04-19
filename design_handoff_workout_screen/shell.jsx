// Shared UI: NumberPad (slide-up), RestBar (persistent), WorkoutHeader, TweaksPanel

/* global React, GYM, Icon, fmtElapsed */
const { useState: useStateS, useEffect: useEffectS, useRef: useRefS } = React;

// ─────────────────────────────────────────────────────
// Number pad — slides up from bottom
// ─────────────────────────────────────────────────────
function NumberPad({ visible, field, value, label, onCommit, onCancel }) {
  const [buf, setBuf] = useStateS(String(value ?? ''));
  useEffectS(() => { setBuf(String(value ?? '')); }, [value, visible]);

  const push = (c) => setBuf(b => {
    if (c === '.' && b.includes('.')) return b;
    if (b === '0' && c !== '.') return c;
    if (b.length >= 5) return b;
    return b + c;
  });
  const back = () => setBuf(b => b.slice(0, -1));
  const clear = () => setBuf('');

  if (!visible) return null;

  const keys = ['7','8','9','4','5','6','1','2','3','.','0','⌫'];

  return (
    <>
      <div
        onClick={onCancel}
        style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)',
          zIndex: 40, animation: 'fadeIn .18s',
        }}
      />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 41,
        background: GYM.surface, borderRadius: '22px 22px 0 0',
        padding: '10px 16px 16px',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
        animation: 'slideUp .22s cubic-bezier(.2,.9,.3,1.1)',
      }}>
        <div style={{ width: 40, height: 4, background: GYM.borderStrong, borderRadius: 2, margin: '0 auto 12px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.6, color: GYM.secondary }}>
              {label ? label.toUpperCase() : ''}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: GYM.primary, marginTop: 2 }}>
              Enter {field}
            </div>
          </div>
          <button onClick={clear} style={{
            padding: '6px 12px', borderRadius: 8,
            background: 'rgba(255,255,255,0.04)', border: 'none',
            color: GYM.secondary, fontSize: 12, fontWeight: 700,
          }}>CLEAR</button>
        </div>

        {/* Display */}
        <div style={{
          background: GYM.bg, border: `1px solid ${GYM.border}`,
          borderRadius: 14, padding: '16px',
          textAlign: 'center', marginBottom: 12,
        }}>
          <div style={{
            fontSize: 48, fontWeight: 800, color: GYM.primary,
            fontVariantNumeric: 'tabular-nums', letterSpacing: -1,
            lineHeight: 1, minHeight: 48,
            fontFamily: 'Inter, system-ui',
          }}>
            {buf || '0'}
            <span style={{
              display: 'inline-block', width: 2, height: 38,
              background: GYM.accent, marginLeft: 4, verticalAlign: 'middle',
              animation: 'blink 1s infinite',
            }} />
          </div>
          <div style={{ fontSize: 12, color: GYM.secondary, marginTop: 4 }}>
            {field === 'weight' || field === 'w' ? 'pounds' : field === 'reps' || field === 'r' ? 'reps' : ''}
          </div>
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {keys.map(k => (
            <button
              key={k}
              onClick={() => k === '⌫' ? back() : push(k)}
              style={{
                height: 56, background: k === '⌫' ? 'rgba(255,255,255,0.04)' : GYM.surfaceHi,
                border: `1px solid ${GYM.border}`, borderRadius: 14,
                color: GYM.primary, fontSize: 24, fontWeight: 700,
                fontFamily: 'Inter, system-ui',
                display: 'grid', placeItems: 'center',
              }}>
              {k === '⌫' ? <Icon.Backspace s={22} c={GYM.primary} /> : k}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={onCancel} style={{
            flex: 1, height: 50, borderRadius: 14,
            background: 'transparent', border: `1px solid ${GYM.border}`,
            color: GYM.secondary, fontSize: 14, fontWeight: 700,
          }}>CANCEL</button>
          <button
            onClick={() => onCommit(parseFloat(buf || '0') || 0)}
            style={{
              flex: 2, height: 50, borderRadius: 14,
              background: GYM.accent, border: 'none',
              color: GYM.onAccent, fontSize: 14, fontWeight: 800, letterSpacing: 0.3,
            }}>CONFIRM</button>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────
// Rest timer banner — full-width under the header
// ─────────────────────────────────────────────────────
function RestBar({ seconds, total, onSkip, onAdd }) {
  if (seconds <= 0) return null;
  const progress = total > 0 ? seconds / total : 0;
  return (
    <div style={{
      background: 'linear-gradient(180deg, rgba(250,204,21,0.14), rgba(250,204,21,0.06))',
      borderBottom: `1px solid rgba(250,204,21,0.25)`,
      padding: '10px 16px',
      animation: 'slideDown .2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 16,
          background: 'rgba(250,204,21,0.2)',
          display: 'grid', placeItems: 'center',
        }}>
          <Icon.Timer s={16} c={GYM.timer} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: GYM.timer, letterSpacing: 1.5 }}>
            REST
          </div>
          <div style={{
            fontSize: 20, fontWeight: 800, color: GYM.primary,
            fontVariantNumeric: 'tabular-nums', lineHeight: 1,
          }}>
            {fmtElapsed(seconds)}
          </div>
        </div>
        <button onClick={onAdd} style={{
          padding: '7px 12px', borderRadius: 999,
          background: 'rgba(255,255,255,0.06)', border: `1px solid ${GYM.border}`,
          color: GYM.primary, fontSize: 12, fontWeight: 700,
        }}>+15s</button>
        <button onClick={onSkip} style={{
          padding: '7px 14px', borderRadius: 999,
          background: GYM.timer, border: 'none',
          color: GYM.onAccent, fontSize: 12, fontWeight: 800, letterSpacing: 0.3,
        }}>SKIP</button>
      </div>
      <div style={{
        marginTop: 8, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2,
      }}>
        <div style={{
          height: 3, width: `${progress * 100}%`,
          background: GYM.timer, borderRadius: 2, transition: 'width 1s linear',
        }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Workout header — timer, volume, PR count, end button
// ─────────────────────────────────────────────────────
function WorkoutHeader({ elapsed, volume, prCount, setCount, onEnd, title, hr = 142, hrZone = 3, hrConnected = true }) {
  // HR zone color scale (1-5)
  const zoneColor = ['#5B9BF0', '#8DC28A', '#FACC15', '#E8845C', '#E0697E'][Math.max(0, Math.min(4, hrZone - 1))];
  return (
    <div style={{
      padding: '14px 16px 12px',
      borderBottom: `1px solid ${GYM.border}`,
      background: GYM.bg,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div style={{
            fontSize: 10, fontWeight: 800, color: GYM.accent,
            letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: 3, background: GYM.accent,
              animation: 'pulse 1.4s infinite',
            }} />
            LIVE · PUSH DAY
          </div>
          <div style={{
            fontSize: 32, fontWeight: 800, color: GYM.primary,
            fontVariantNumeric: 'tabular-nums', letterSpacing: -1,
            lineHeight: 1, marginTop: 4,
            fontFamily: 'Inter, system-ui',
          }}>
            {fmtElapsed(elapsed)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Heart rate readout — live BLE HR from strap */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 12,
            background: `linear-gradient(135deg, ${zoneColor}22, ${zoneColor}0a)`,
            border: `1px solid ${zoneColor}44`,
          }}>
            <Icon.Heart s={16} c={zoneColor} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1 }}>
              <div style={{
                fontSize: 18, fontWeight: 800, color: GYM.primary,
                fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5,
              }}>
                {hr}
              </div>
              <div style={{ fontSize: 8, fontWeight: 800, color: zoneColor, letterSpacing: 1.2, marginTop: 2 }}>
                Z{hrZone} · BPM
              </div>
            </div>
          </div>
          <button
            onClick={onEnd}
            style={{
              padding: '8px 12px', borderRadius: 10,
              background: 'rgba(217,83,79,0.12)', border: `1px solid rgba(217,83,79,0.25)`,
              color: GYM.danger, fontSize: 12, fontWeight: 800, letterSpacing: 0.4,
            }}>FINISH</button>
        </div>
      </div>
      <div style={{
        display: 'flex', gap: 16, marginTop: 12,
      }}>
        <div>
          <div style={{ fontSize: 10, color: GYM.secondary, fontWeight: 700, letterSpacing: 1.4 }}>VOLUME</div>
          <div style={{ fontSize: 15, color: GYM.primary, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {volume.toLocaleString()} <span style={{ fontSize: 11, color: GYM.secondary, fontWeight: 500 }}>lb</span>
          </div>
        </div>
        <div style={{ width: 1, background: GYM.border }} />
        <div>
          <div style={{ fontSize: 10, color: GYM.secondary, fontWeight: 700, letterSpacing: 1.4 }}>SETS</div>
          <div style={{ fontSize: 15, color: GYM.primary, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {setCount}
          </div>
        </div>
        <div style={{ width: 1, background: GYM.border }} />
        <div>
          <div style={{ fontSize: 10, color: GYM.secondary, fontWeight: 700, letterSpacing: 1.4, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Icon.Trophy s={10} c={GYM.prGold} /> PRS
          </div>
          <div style={{ fontSize: 15, color: prCount > 0 ? GYM.prGold : GYM.primary, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {prCount}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { NumberPad, RestBar, WorkoutHeader });
