import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from 'react';
import type {
  GamificationContextValue,
  BadgeState,
  LevelState,
  ShieldState,
  CelebrationItem,
  AppEvent,
  AppEventType,
  BadgeTier,
} from '../types';
import { db } from '../db/database';
import {
  seedBadges,
  getEarnedBadges,
  earnBadgeTier,
  upsertBadgeProgress,
  getUnnotifiedBadges,
  markBadgeNotified,
  getAvailableShields,
  getUserLevel,
  updateUserLevel,
} from '../db/badges';
import { evaluateRelevantBadges } from '../utils/badgeEngine';
import { calculateCompositeLevel } from '../utils/levelCalculator';
import { BADGE_DEFINITIONS, getBadgeDefinition } from '../data/badgeDefinitions';
import { getNextThreshold } from '../utils/badgeEngine';

// ── App Event Bus ──

type AppEventListener = (event: AppEvent) => void;
const listeners = new Set<AppEventListener>();

export function emitAppEvent(event: AppEvent): void {
  for (const listener of listeners) {
    listener(event);
  }
}

export function useAppEventListener(handler: AppEventListener): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const wrapped: AppEventListener = (event) => handlerRef.current(event);
    listeners.add(wrapped);
    return () => {
      listeners.delete(wrapped);
    };
  }, []);
}

// ── Context ──

const GamificationContext = createContext<GamificationContextValue | undefined>(undefined);

export function useGamification(): GamificationContextValue {
  const ctx = useContext(GamificationContext);
  if (!ctx) {
    throw new Error('useGamification must be used inside <GamificationProvider>');
  }
  return ctx;
}

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const [badgeStates, setBadgeStates] = useState<Map<string, BadgeState>>(new Map());
  const [levelState, setLevelState] = useState<LevelState>({
    level: 1, title: 'Beginner',
    consistencyScore: 0, volumeScore: 0, nutritionScore: 0, varietyScore: 0,
    progressToNext: 0,
  });
  const [shieldState, setShieldState] = useState<ShieldState>({ workout: 0, protein: 0, water: 0 });
  const [pendingCelebrations, setPendingCelebrations] = useState<CelebrationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialized = useRef(false);

  const loadAllState = useCallback(async () => {
    // Load earned badges and build state map
    const earned = await getEarnedBadges();
    const stateMap = new Map<string, BadgeState>();

    // Initialize all badges with default state
    for (const def of BADGE_DEFINITIONS) {
      stateMap.set(def.id, {
        badgeId: def.id,
        currentTier: null,
        currentValue: 0,
        nextThreshold: def.tierThresholds ? def.tierThresholds[0] : 1,
      });
    }

    // Overlay earned badge data
    for (const row of earned) {
      const def = getBadgeDefinition(row.badge_id);
      if (!def) continue;
      stateMap.set(row.badge_id, {
        badgeId: row.badge_id,
        currentTier: row.tier as BadgeTier,
        currentValue: row.current_value,
        nextThreshold: getNextThreshold(row.tier as BadgeTier, def.tierThresholds),
      });
    }

    setBadgeStates(stateMap);

    // Load level
    const levelRow = await getUserLevel();
    setLevelState({
      level: levelRow.current_level,
      title: levelRow.title,
      consistencyScore: levelRow.consistency_score,
      volumeScore: levelRow.volume_score,
      nutritionScore: levelRow.nutrition_score,
      varietyScore: levelRow.variety_score,
      progressToNext: 0,
    });

    // Load shields
    const shields = await getAvailableShields();
    setShieldState(shields);

    // Load unnotified celebrations
    const unnotified = await getUnnotifiedBadges();
    const celebrations: CelebrationItem[] = [];
    for (const row of unnotified) {
      const def = getBadgeDefinition(row.badge_id);
      if (def) {
        celebrations.push({
          badge: def,
          newTier: row.tier as BadgeTier,
          earnedAt: row.earned_at,
        });
      }
    }
    setPendingCelebrations(celebrations);
  }, []);

  // ── Initialize: seed badges, load state ──
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    (async () => {
      try {
        await seedBadges();
        await loadAllState();
        // Fire APP_OPENED after state is loaded to check tenure/comeback badges
        setTimeout(() => {
          emitAppEvent({ type: 'APP_OPENED', timestamp: new Date().toISOString() });
        }, 100);
      } catch (error) {
        console.error('Gamification init failed:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [loadAllState]);

  // ── Check Badges (called after data mutations) ──
  const checkBadges = useCallback(async (event: AppEvent) => {
    try {
      const database = await db;
      const { updated, newTierUps } = await evaluateRelevantBadges(
        event.type,
        database,
        badgeStates,
      );

      // Persist tier-ups to DB
      for (const { badge, newTier } of newTierUps) {
        const state = updated.get(badge.id);
        if (state) {
          await earnBadgeTier(badge.id, newTier, state.currentValue);
        }
      }

      // Update progress for all evaluated badges
      for (const [badgeId, state] of updated) {
        if (state.currentValue > 0) {
          await upsertBadgeProgress(badgeId, state.currentValue);
        }
      }

      setBadgeStates(updated);

      // Queue celebrations for new tier-ups
      if (newTierUps.length > 0) {
        const newCelebrations: CelebrationItem[] = newTierUps.map(({ badge, newTier }) => ({
          badge,
          newTier,
          earnedAt: new Date().toISOString(),
        }));
        setPendingCelebrations(prev => [...prev, ...newCelebrations]);
      }

      // Recalculate level
      const levelResult = calculateCompositeLevel(
        levelState.consistencyScore,
        levelState.volumeScore,
        levelState.nutritionScore,
        levelState.varietyScore,
      );
      setLevelState(levelResult);
      await updateUserLevel(levelResult.level, levelResult.title, {
        consistency: levelResult.consistencyScore,
        volume: levelResult.volumeScore,
        nutrition: levelResult.nutritionScore,
        variety: levelResult.varietyScore,
      });

      // Refresh shields
      const shields = await getAvailableShields();
      setShieldState(shields);
    } catch (error) {
      console.error('Badge check failed:', error);
    }
  }, [badgeStates, levelState]);

  // ── Subscribe to AppEvents ──
  useAppEventListener(useCallback((event: AppEvent) => {
    checkBadges(event);
  }, [checkBadges]));

  // ── Dismiss Celebration ──
  const dismissCelebration = useCallback(async () => {
    const current = pendingCelebrations[0];
    if (!current) return;

    // Mark as notified in DB
    const unnotified = await getUnnotifiedBadges();
    const match = unnotified.find(
      r => r.badge_id === current.badge.id && r.tier === current.newTier,
    );
    if (match) {
      await markBadgeNotified(match.id);
    }

    setPendingCelebrations(prev => prev.slice(1));
  }, [pendingCelebrations]);

  // ── Refresh All ──
  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    await loadAllState();
    setIsLoading(false);
  }, [loadAllState]);

  const value = useMemo<GamificationContextValue>(
    () => ({
      badgeStates,
      levelState,
      shieldState,
      pendingCelebrations,
      isLoading,
      checkBadges,
      dismissCelebration,
      refreshAll,
    }),
    [badgeStates, levelState, shieldState, pendingCelebrations, isLoading, checkBadges, dismissCelebration, refreshAll],
  );

  return (
    <GamificationContext.Provider value={value}>
      {children}
    </GamificationContext.Provider>
  );
}
