// V1 — Stacked Cards
// Faithful to current app: one card per exercise, inline logging panel,
// tidy completed-set chips, collapsible "peek" history, per-row PR glow.

/* global React, EXERCISES, GYM, Icon, fmtDuration, fmtElapsed, NumberPad, RestBar */
const { useState, useEffect, useMemo, useRef } = React;

function SetRow({ n, w, r, type, isTimed, locked }) {
  const dotColor =
    type === 'pr' ? GYM.prGold :
    type === 'done' ? GYM.accent :
    type === 'active' ? GYM.primary :
    'transparent';
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '28px 1fr 1fr 40px',
      alignItems: 'center', gap: 12, padding: '10px 14px',
      background: type === 'active' ? 'rgba(141,194,138,0.06)' :
                  type === 'pr' ? 'rgba(255,184,0,0.06)' : 'transparent',
      borderRadius: 10, minHeight: 44, fontFamily: 'Inter, system-ui',
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: 12,
        background: dotColor === 'transparent' ? 'transparent' : dotColor,
        border: type === 'pending' ? `1.5px solid ${GYM.border}` : 'none',
        display: 'grid', placeItems: 'center',
        color: type === 'pr' ? GYM.onAccent : GYM.onAccent,
        fontSize: 11, fontWeight: 700,
      }}>
        {type === 'done' || type === 'pr' ? <Icon.Check s={13} c={GYM.onAccent} /> : n}
      </div>
      <div style={{ color: locked ? GYM.secondary : GYM.primary, fontSize: 17, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
        {isTimed ? fmtDuration(r) : `${w} lb`}
      </div>
      <div style={{ color: locked ? GYM.secondary : GYM.primary, fontSize: 17, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
        {isTimed ? '' : `${r} reps`}
      </div>
      <div style={{ textAlign: 'right' }}>
        {type === 'pr' && <Icon.Trophy s={14} c={GYM.prGold} />}
      </div>
    </div>
  );
}

function StepperInput({ label, value, onChange, step = 5, min = 0, onTap }) {
  const unit = label === 'WEIGHT' ? 'lb' : label === 'REPS' ? 'reps' : '';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 6px 6px 12px',
      background: GYM.bg, border: `1px solid ${GYM.border}`, borderRadius: 12,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 800, letterSpacing: 1.4, color: GYM.secondary,
        minWidth: 54,
      }}>{label}</div>
      <button
        onClick={(e) => { e.stopPropagation(); onTap && onTap(); }}
        style={{
          flex: 1, background: 'transparent', border: 'none',
          color: GYM.primary, fontSize: 24, fontWeight: 700,
          fontVariantNumeric: 'tabular-nums', fontFamily: 'Inter, system-ui',
          textAlign: 'left', padding: '4px 0',
        }}>
        {value}
        <span style={{ fontSize: 12, color: GYM.secondary, fontWeight: 500, marginLeft: 4 }}>{unit}</span>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onChange(Math.max(min, value - step)); }}
        style={{
          width: 38, height: 38, border: `1px solid ${GYM.border}`, background: GYM.surface,
          color: GYM.primary, borderRadius: 10, fontSize: 18, fontWeight: 700,
          display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>−</button>
      <button
        onClick={(e) => { e.stopPropagation(); onChange(value + step); }}
        style={{
          width: 38, height: 38, border: `1px solid rgba(141,194,138,0.3)`, background: GYM.accentGlow,
          color: GYM.accent, borderRadius: 10, fontSize: 18, fontWeight: 700,
          display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>+</button>
    </div>
  );
}

function ExerciseCardV1({ ex, state, onLog, onToggle, onExpand, expanded, onStartRest, onOpenPad, onOpenHistory, supersetBadge }) {
  const target = ex.target;
  const completed = state.sets.length;
  const isTimed = ex.measurementType === 'timed';
  const isDone = state.done;
  const catColor = GYM.cat[ex.category] || GYM.accent;
  const [w, setW] = useState(state.nextW);
  const [r, setR] = useState(state.nextR);
  const [showHistory, setShowHistory] = useState(false);
  useEffect(() => { setW(state.nextW); setR(state.nextR); }, [state.nextW, state.nextR]);

  return (
    <div style={{
      background: expanded ? GYM.surfaceHi : GYM.surface,
      borderRadius: 18,
      border: `1px solid ${expanded ? 'rgba(141,194,138,0.28)' : GYM.border}`,
      marginBottom: 10, overflow: 'hidden',
      transition: 'all .2s',
      boxShadow: expanded ? `0 0 0 1px rgba(141,194,138,0.18), 0 8px 24px rgba(0,0,0,0.3)` : 'none',
    }}>
      {/* Header */}
      <div
        onClick={onExpand}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', cursor: 'pointer',
        }}>
        {/* category accent */}
        <div style={{
          width: 3, alignSelf: 'stretch',
          background: supersetBadge ? supersetBadge.color : catColor,
          borderRadius: 2,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {supersetBadge && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3,
            }}>
              <div style={{
                padding: '1px 6px', borderRadius: 4,
                background: supersetBadge.isCurrent ? supersetBadge.color : 'rgba(181,122,224,0.15)',
                color: supersetBadge.isCurrent ? '#fff' : supersetBadge.color,
                fontSize: 9, fontWeight: 800, letterSpacing: 1,
              }}>
                {supersetBadge.label}{String.fromCharCode(49 + supersetBadge.index)}
              </div>
              {supersetBadge.isCurrent && (
                <span style={{ fontSize: 9, fontWeight: 800, color: supersetBadge.color, letterSpacing: 1.2 }}>
                  ← NOW
                </span>
              )}
            </div>
          )}
          <div style={{
            fontSize: 16, fontWeight: 700, color: isDone ? GYM.secondary : GYM.primary,
            textDecoration: isDone ? 'line-through' : 'none',
            fontFamily: 'Inter, system-ui', letterSpacing: -0.2,
          }}>{ex.name}</div>
          <div style={{ marginTop: 2, display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: GYM.secondary, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 600 }}>
              {completed}/{target.sets} sets
            </span>
            <span style={{ width: 3, height: 3, background: GYM.secondaryDim, borderRadius: 2 }} />
            <span style={{ fontSize: 12, color: GYM.secondary, fontVariantNumeric: 'tabular-nums' }}>
              {isTimed ? `${target.reps}s target` : `${target.reps} × ${target.weight} lb`}
            </span>
            {state.prCount > 0 && (
              <>
                <span style={{ width: 3, height: 3, background: GYM.secondaryDim, borderRadius: 2 }} />
                <span style={{ fontSize: 12, color: GYM.prGold, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Icon.Trophy s={12} c={GYM.prGold} /> PR
                </span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          style={{
            width: 32, height: 32, borderRadius: 16,
            background: isDone ? GYM.accent : 'transparent',
            border: isDone ? 'none' : `1.5px solid ${GYM.borderStrong}`,
            display: 'grid', placeItems: 'center',
          }}>
          {isDone && <Icon.Check s={16} c={GYM.onAccent} />}
        </button>
      </div>

      {/* Completed set chips when collapsed */}
      {!expanded && completed > 0 && (
        <div style={{ padding: '0 16px 14px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {state.sets.map((s, i) => (
            <div key={i} style={{
              fontSize: 12, fontWeight: 600, padding: '4px 9px', borderRadius: 999,
              background: s.isPR ? 'rgba(255,184,0,0.12)' : 'rgba(141,194,138,0.10)',
              color: s.isPR ? GYM.prGold : GYM.accent,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {isTimed ? fmtDuration(s.r) : `${s.w}×${s.r}`}
              {s.isPR && ' ★'}
            </div>
          ))}
        </div>
      )}

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: '0 16px 16px' }}>
          {/* Logged sets */}
          {state.sets.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              {state.sets.map((s, i) => (
                <SetRow key={i} n={i + 1} w={s.w} r={s.r} type={s.isPR ? 'pr' : 'done'} isTimed={isTimed} locked />
              ))}
            </div>
          )}

          {/* History peek */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowHistory(v => !v); }}
            style={{
              width: '100%', background: 'transparent', border: `1px dashed ${GYM.border}`,
              borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', color: GYM.secondary, fontSize: 13,
              fontWeight: 600, fontFamily: 'Inter, system-ui', marginBottom: 10,
            }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon.History s={14} c={GYM.secondary} />
              Last session {showHistory ? '' : `· ${ex.last.length} sets`}
            </span>
            <Icon.Chevron s={14} c={GYM.secondary} dir={showHistory ? 'up' : 'down'} />
          </button>
          {showHistory && (
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '8px 12px', marginBottom: 10 }}>
              {ex.last.map((s, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', padding: '4px 0',
                  fontSize: 13, color: GYM.secondary, fontVariantNumeric: 'tabular-nums',
                }}>
                  <span>Set {i + 1}</span>
                  <span>{isTimed ? fmtDuration(s.r) : `${s.w} lb × ${s.r}`}</span>
                </div>
              ))}
            </div>
          )}

          {/* Next set input */}
          <div style={{
            padding: '12px', background: GYM.surface, borderRadius: 14,
            border: `1px solid ${GYM.border}`,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: 12, background: GYM.accentGlow,
                color: GYM.accent, fontSize: 12, fontWeight: 800,
                display: 'grid', placeItems: 'center', flexShrink: 0,
              }}>
                {completed + 1}
              </div>
              <div style={{
                fontSize: 11, fontWeight: 800, color: GYM.secondary, letterSpacing: 1.4,
              }}>NEXT SET</div>
            </div>
            {!isTimed ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <StepperInput label="WEIGHT" value={w} onChange={setW} step={5} onTap={() => onOpenPad('w', w, (v) => setW(v))} />
                <StepperInput label="REPS" value={r} onChange={setR} step={1} onTap={() => onOpenPad('r', r, (v) => setR(v))} />
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: GYM.timer, fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {fmtDuration(r)}
              </div>
            )}
          </div>

          <button
            onClick={() => onLog(w, r)}
            style={{
              width: '100%', marginTop: 10, background: GYM.accent, color: GYM.onAccent,
              border: 'none', borderRadius: 14, padding: '14px', fontSize: 15,
              fontWeight: 700, letterSpacing: 0.3,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            <Icon.Check s={18} c={GYM.onAccent} />
            LOG SET {completed + 1}
          </button>
        </div>
      )}
    </div>
  );
}

function WarmupSection() {
  const WARMUP = [
    { id: 'w1', name: 'Foam roll quads + glutes', detail: '60s each side', done: true },
    { id: 'w2', name: 'Hip 90/90 + ankle rocks', detail: '8 reps / side', done: true },
    { id: 'w3', name: 'Goblet squat', detail: '2 × 8 @ 25 lb', done: false },
    { id: 'w4', name: 'Banded glute bridge', detail: '2 × 12', done: false },
  ];
  const [items, setItems] = useState(WARMUP);
  const [open, setOpen] = useState(true);
  const done = items.filter(i => i.done).length;
  const total = items.length;
  const complete = done === total;
  const amber = '#F0B830';

  const toggle = (id) => setItems(arr => arr.map(i => i.id === id ? { ...i, done: !i.done } : i));

  return (
    <div style={{
      background: complete ? 'rgba(141,194,138,0.04)' : 'linear-gradient(180deg, rgba(240,184,48,0.08), rgba(240,184,48,0.02))',
      border: `1px solid ${complete ? 'rgba(141,194,138,0.25)' : 'rgba(240,184,48,0.25)'}`,
      borderRadius: 18, marginBottom: 18, overflow: 'hidden',
    }}>
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', cursor: 'pointer',
        }}>
        <div style={{
          width: 38, height: 38, borderRadius: 12,
          background: complete ? 'rgba(141,194,138,0.15)' : 'rgba(240,184,48,0.15)',
          display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>
          {complete
            ? <Icon.Check s={18} c={GYM.accent} />
            : <Icon.Flame s={20} c={amber} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              fontSize: 10, fontWeight: 800,
              color: complete ? GYM.accent : amber,
              letterSpacing: 1.8, textTransform: 'uppercase',
            }}>{complete ? 'Warm-up complete' : 'Warm-up'}</div>
          </div>
          <div style={{
            fontSize: 16, fontWeight: 700, color: GYM.primary,
            fontFamily: 'Inter, system-ui', letterSpacing: -0.2, marginTop: 1,
          }}>
            {complete ? 'Ready to lift' : 'Prime the body first'}
          </div>
          {/* progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <div style={{
              flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2,
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${(done / total) * 100}%`, height: 4,
                background: complete ? GYM.accent : amber,
                borderRadius: 2, transition: 'width .3s',
              }} />
            </div>
            <div style={{
              fontSize: 11, fontWeight: 700, color: GYM.secondary,
              fontVariantNumeric: 'tabular-nums',
            }}>{done}/{total}</div>
          </div>
        </div>
        <Icon.Chevron s={18} c={GYM.secondary} dir={open ? 'up' : 'down'} />
      </div>

      {open && (
        <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map((item, i) => (
            <div
              key={item.id}
              onClick={() => toggle(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 10,
                background: item.done ? 'rgba(141,194,138,0.06)' : 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
              }}>
              <button
                style={{
                  width: 22, height: 22, borderRadius: 11, flexShrink: 0,
                  background: item.done ? GYM.accent : 'transparent',
                  border: item.done ? 'none' : `1.5px solid ${GYM.borderStrong}`,
                  display: 'grid', placeItems: 'center',
                }}>
                {item.done && <Icon.Check s={12} c={GYM.onAccent} />}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: 600,
                  color: item.done ? GYM.secondary : GYM.primary,
                  textDecoration: item.done ? 'line-through' : 'none',
                  fontFamily: 'Inter, system-ui',
                }}>{item.name}</div>
              </div>
              <div style={{
                fontSize: 11, color: GYM.secondaryDim, fontVariantNumeric: 'tabular-nums',
                fontWeight: 600,
              }}>{item.detail}</div>
            </div>
          ))}
          {!complete && (
            <button
              onClick={() => setItems(arr => arr.map(i => ({ ...i, done: true })))}
              style={{
                marginTop: 6, padding: '10px',
                background: 'transparent',
                border: `1px dashed rgba(240,184,48,0.4)`,
                borderRadius: 10, color: amber,
                fontSize: 12, fontWeight: 800, letterSpacing: 0.8,
              }}>SKIP TO WORKOUT</button>
          )}
        </div>
      )}
    </div>
  );
}

// Superset definitions — pairs/groups of exercise IDs that should rotate.
// In production this comes from the workout template.
const SUPERSETS = [
  { id: 'ss1', label: 'A', members: [3, 5] }, // Bench + Pull-up
  { id: 'ss2', label: 'B', members: [8, 9] }, // Lat raise + Plank
];

function SupersetGroup({ members, label, exState, expanded, onExpand, onLog, onToggle, onOpenPad, current, onAdvance }) {
  const exs = members.map(id => EXERCISES.find(e => e.id === id));
  const totalRounds = Math.max(...exs.map(e => e.target.sets));
  const completedRounds = Math.min(...exs.map(e => exState[e.id]?.sets.length ?? 0));
  const purple = '#B57AE0';

  return (
    <div style={{
      background: 'linear-gradient(180deg, rgba(181,122,224,0.05), rgba(181,122,224,0.01))',
      border: `1px solid rgba(181,122,224,0.28)`,
      borderRadius: 20, padding: 10, marginBottom: 10,
      position: 'relative',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '4px 8px 10px',
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: 8,
          background: 'rgba(181,122,224,0.18)',
          color: purple, fontSize: 13, fontWeight: 800,
          display: 'grid', placeItems: 'center',
          fontFamily: 'Inter, system-ui',
        }}>{label}</div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 10, fontWeight: 800, color: purple,
            letterSpacing: 1.8, textTransform: 'uppercase',
          }}>Superset · {exs.length} exercises</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4, marginTop: 2,
            fontSize: 12, color: GYM.secondary, fontWeight: 600,
          }}>
            {exs.map((e, i) => (
              <React.Fragment key={e.id}>
                <span style={{
                  color: current === e.id ? GYM.primary : GYM.secondary,
                  fontWeight: current === e.id ? 700 : 600,
                }}>{e.name.split(' ').slice(-1)[0]}</span>
                {i < exs.length - 1 && (
                  <span style={{ color: purple, fontWeight: 800 }}>→</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div style={{
          fontSize: 11, fontWeight: 800, color: GYM.secondary,
          fontVariantNumeric: 'tabular-nums', letterSpacing: 0.5,
        }}>
          {completedRounds}/{totalRounds} <span style={{ fontWeight: 600, color: GYM.secondaryDim }}>rounds</span>
        </div>
      </div>

      {/* Nested exercise cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {exs.map((ex, i) => (
          <div key={ex.id} style={{ position: 'relative' }}>
            {current === ex.id && (
              <div style={{
                position: 'absolute', left: -4, top: 16, bottom: 16,
                width: 3, borderRadius: 2, background: purple,
                boxShadow: `0 0 12px ${purple}80`,
              }} />
            )}
            <ExerciseCardV1
              ex={ex}
              state={exState[ex.id]}
              expanded={expanded === ex.id}
              onExpand={() => onExpand(ex.id)}
              onLog={(w, r) => { onLog(ex.id, w, r); onAdvance(ex.id); }}
              onToggle={() => onToggle(ex.id)}
              onOpenPad={(f, v, s) => onOpenPad(f, v, s, ex.name)}
              supersetBadge={{ label, index: i, total: exs.length, color: purple, isCurrent: current === ex.id }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function V1StackedCards({ openPad, triggerRest }) {
  const [exState, setExState] = useState(() =>
    Object.fromEntries(EXERCISES.map(ex => [ex.id, {
      sets: [],
      nextW: ex.target.weight,
      nextR: ex.target.reps,
      done: false,
      prCount: 0,
    }]))
  );
  const [expanded, setExpanded] = useState(EXERCISES[0].id);

  // Seed with a few completed sets for demo realism
  useEffect(() => {
    setExState(s => ({
      ...s,
      [1]: { ...s[1], sets: [
        { w: 225, r: 6 }, { w: 225, r: 6, isPR: true },
      ]},
    }));
  }, []);

  const handleLog = (exId, w, r) => {
    setExState(s => {
      const ex = EXERCISES.find(e => e.id === exId);
      const prev = s[exId];
      const isPR = !ex.measurementType === 'timed' && (w > ex.target.weight || (w === ex.target.weight && r > ex.target.reps)) && Math.random() > 0.6;
      return {
        ...s,
        [exId]: {
          ...prev,
          sets: [...prev.sets, { w, r, isPR }],
          prCount: prev.prCount + (isPR ? 1 : 0),
        },
      };
    });
    triggerRest(EXERCISES.find(e => e.id === exId).restSec);
  };

  const handleToggle = (exId) => {
    setExState(s => ({ ...s, [exId]: { ...s[exId], done: !s[exId].done } }));
  };

  const handleExpand = (exId) => {
    setExpanded(e => e === exId ? null : exId);
  };

  // Track superset "current" pointers — advance on log
  const [ssCurrent, setSsCurrent] = useState(() =>
    Object.fromEntries(SUPERSETS.map(ss => [ss.id, ss.members[0]]))
  );
  const advanceSuperset = (exId) => {
    const ss = SUPERSETS.find(s => s.members.includes(exId));
    if (!ss) return;
    const idx = ss.members.indexOf(exId);
    const next = ss.members[(idx + 1) % ss.members.length];
    setSsCurrent(c => ({ ...c, [ss.id]: next }));
    setExpanded(next);
  };

  // Build a flat render plan: supersets inline with their first member's category,
  // standalone exercises grouped by category.
  const plan = useMemo(() => {
    const ssByFirstMember = new Map(
      SUPERSETS.map(ss => [ss.members[0], ss])
    );
    const inSS = new Set(SUPERSETS.flatMap(ss => ss.members));
    const items = []; // { type: 'cat-header' | 'exercise' | 'superset', ... }
    let lastCat = null;
    EXERCISES.forEach(ex => {
      if (ex.category !== lastCat) {
        lastCat = ex.category;
        const catList = EXERCISES.filter(e => e.category === ex.category);
        items.push({ type: 'cat-header', cat: ex.category, list: catList });
      }
      if (ssByFirstMember.has(ex.id)) {
        items.push({ type: 'superset', ss: ssByFirstMember.get(ex.id) });
      } else if (!inSS.has(ex.id)) {
        items.push({ type: 'exercise', ex });
      }
    });
    return items;
  }, []);

  return (
    <div style={{ padding: '8px 14px 120px' }}>
      <WarmupSection />
      {plan.map((item, i) => {
        if (item.type === 'cat-header') {
          return (
            <div key={`h-${item.cat}`} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              marginTop: i === 0 ? 0 : 16, marginBottom: 10, padding: '0 2px',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: GYM.cat[item.cat] }} />
              <div style={{
                fontSize: 11, fontWeight: 800, color: GYM.secondary,
                letterSpacing: 1.8, textTransform: 'uppercase',
              }}>{item.cat}</div>
              <div style={{ flex: 1, height: 1, background: GYM.border }} />
              <div style={{ fontSize: 11, color: GYM.secondaryDim, fontVariantNumeric: 'tabular-nums' }}>
                {item.list.filter(e => exState[e.id]?.done).length}/{item.list.length}
              </div>
            </div>
          );
        }
        if (item.type === 'superset') {
          return (
            <SupersetGroup
              key={item.ss.id}
              members={item.ss.members}
              label={item.ss.label}
              exState={exState}
              expanded={expanded}
              onExpand={handleExpand}
              onLog={handleLog}
              onToggle={handleToggle}
              onOpenPad={openPad}
              current={ssCurrent[item.ss.id]}
              onAdvance={advanceSuperset}
            />
          );
        }
        const ex = item.ex;
        return (
          <ExerciseCardV1
            key={ex.id}
            ex={ex}
            state={exState[ex.id]}
            expanded={expanded === ex.id}
            onExpand={() => handleExpand(ex.id)}
            onLog={(w, r) => handleLog(ex.id, w, r)}
            onToggle={() => handleToggle(ex.id)}
            onOpenPad={(field, val, setter) => openPad(field, val, setter, ex.name)}
          />
        );
      })}
    </div>
  );
}

Object.assign(window, { V1StackedCards });
