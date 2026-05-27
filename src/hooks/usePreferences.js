import { useState, useCallback } from 'react';

const KEY = 'mm.preferences';

const DEFAULTS = {
  diet: [],
  cookingTime: ['1 hour'], // array of one or more tiers
  goals: [],
  location: null, // { lat, lng, city, query }
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Migrate legacy single-string cookingTime → array.
    if (typeof parsed.cookingTime === 'string') {
      parsed.cookingTime = [parsed.cookingTime];
    }
    return { ...DEFAULTS, ...parsed };
  } catch {
    return null;
  }
}

function save(prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // ignore — localStorage unavailable (private mode, quota, etc.)
  }
}

export function usePreferences() {
  const [preferences, setPreferences] = useState(() => load());
  const [showOnboarding, setShowOnboarding] = useState(() => load() === null);

  const savePreferences = useCallback((prefs) => {
    save(prefs);
    setPreferences(prefs);
    setShowOnboarding(false);
  }, []);

  const editPreferences = useCallback(() => {
    setShowOnboarding(true);
  }, []);

  const closeOnboarding = useCallback(() => {
    if (preferences) setShowOnboarding(false);
  }, [preferences]);

  const resetPreferences = useCallback(() => {
    localStorage.removeItem(KEY);
    setPreferences(null);
    setShowOnboarding(true);
  }, []);

  return {
    preferences,
    showOnboarding,
    savePreferences,
    editPreferences,
    closeOnboarding,
    resetPreferences,
  };
}
