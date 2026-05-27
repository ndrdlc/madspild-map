import React, { useState } from 'react';
import './Preferences.css';
import { geocodeInput, reverseGeocodeArea } from '../utils/geo.js';

const DIET_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-free', 'Dairy free'];
const TIME_OPTIONS = ['15-30 min', '1 hour', '1-2 hours'];
const GOAL_OPTIONS = ['Save money', 'Eat healthier', 'Reduce waste', 'Try new foods'];

export default function Preferences({ onSave, onClose, initial }) {
  const [locationInput, setLocationInput] = useState(initial?.location?.query ?? '');
  const [resolvedLocation, setResolvedLocation] = useState(initial?.location ?? null);
  const [locStatus, setLocStatus] = useState(''); // '', 'geocoding', 'error', 'ok'
  const [locError, setLocError] = useState('');

  const [diet, setDiet] = useState(initial?.diet ?? []);
  const [cookingTime, setCookingTime] = useState(() => {
    if (Array.isArray(initial?.cookingTime)) return initial.cookingTime;
    if (typeof initial?.cookingTime === 'string') return [initial.cookingTime];
    return ['1 hour'];
  });
  const [goals, setGoals] = useState(initial?.goals ?? []);
  const [submitting, setSubmitting] = useState(false);

  function toggleDiet(val) {
    setDiet(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  }
  function toggleGoal(val) {
    setGoals(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  }
  function toggleTime(val) {
    setCookingTime(prev => {
      if (prev.includes(val)) {
        // Keep at least one tier selected.
        if (prev.length === 1) return prev;
        return prev.filter(v => v !== val);
      }
      return [...prev, val];
    });
  }

  function onLocationInputChange(e) {
    setLocationInput(e.target.value);
    // Typed input invalidates any previously resolved location.
    if (resolvedLocation) setResolvedLocation(null);
    if (locError) setLocError('');
  }

  async function useMyLocation() {
    if (!navigator.geolocation) {
      setLocError('Geolocation not supported in this browser.');
      return;
    }
    setLocStatus('geocoding');
    setLocError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const area = await reverseGeocodeArea(lat, lng);
        setResolvedLocation({
          lat,
          lng,
          city: area,
          query: 'Current location',
        });
        setLocationInput(area ? `Current location (${area})` : 'Current location');
        setLocStatus('ok');
      },
      () => {
        setLocError("Couldn't read your location. Try entering a zip code instead.");
        setLocStatus('error');
      },
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    setLocError('');
    let location = resolvedLocation;

    // If the user typed something but we haven't geocoded it yet, do so now.
    if (!location && locationInput.trim()) {
      setLocStatus('geocoding');
      try {
        location = await geocodeInput(locationInput);
        if (!location) {
          setLocError("Location not found. Try a Danish zip (e.g. 2200) or city name.");
          setLocStatus('error');
          setSubmitting(false);
          return;
        }
      } catch {
        setLocError('Could not look up location. Check your connection.');
        setLocStatus('error');
        setSubmitting(false);
        return;
      }
      setLocStatus('ok');
    }

    onSave({ diet, cookingTime, goals, location });
    setSubmitting(false);
  }

  return (
    <div className="prefs-overlay" onClick={onClose}>
      <div className="prefs-sheet" onClick={e => e.stopPropagation()}>
        {onClose && (
          <button className="prefs-close" onClick={onClose} aria-label="Close">×</button>
        )}
        <div className="prefs-logo" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            {/* Left leaf */}
            <path d="M24 24 C 18 22, 12 18, 10 12 C 16 10, 22 14, 24 24 Z" fill="currentColor" fillOpacity="0.18"/>
            {/* Right leaf */}
            <path d="M24 24 C 30 22, 36 18, 38 12 C 32 10, 26 14, 24 24 Z" fill="currentColor" fillOpacity="0.18"/>
            {/* Stem */}
            <path d="M24 24 L 24 40"/>
            {/* Vein lines for definition */}
            <path d="M24 24 L 14 14" strokeWidth="1.2" strokeOpacity="0.55"/>
            <path d="M24 24 L 34 14" strokeWidth="1.2" strokeOpacity="0.55"/>
          </svg>
        </div>

        <h1 className="prefs-title">Set Your Preferences</h1>
        <p className="prefs-sub">Help us personalize your experience</p>

        <section className="prefs-section">
          <h2>Your Location</h2>
          <div className="prefs-location">
            <div className="prefs-location-input">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 22s-7-7.58-7-13a7 7 0 1 1 14 0c0 5.42-7 13-7 13z"/>
                <circle cx="12" cy="9" r="2.5"/>
              </svg>
              <input
                type="text"
                placeholder="Enter your city or zip code"
                value={locationInput}
                onChange={onLocationInputChange}
                disabled={submitting}
              />
            </div>
            <button
              type="button"
              className="prefs-location-geo"
              onClick={useMyLocation}
              disabled={submitting}
            >
              Use my location
            </button>
          </div>
          {locStatus === 'geocoding' && (
            <p className="prefs-location-hint">Finding location…</p>
          )}
          {locStatus === 'ok' && resolvedLocation?.city && (
            <p className="prefs-location-hint">Found: {resolvedLocation.city}</p>
          )}
          {locError && <p className="prefs-location-error">{locError}</p>}
        </section>

        <section className="prefs-section">
          <h2>Dietary Preferences</h2>
          <div className="prefs-chips">
            {DIET_OPTIONS.map(opt => (
              <button
                key={opt}
                className={`prefs-chip ${diet.includes(opt) ? 'active' : ''}`}
                onClick={() => toggleDiet(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </section>

        <section className="prefs-section">
          <h2>Cooking time</h2>
          <div className="prefs-chips">
            {TIME_OPTIONS.map(opt => (
              <button
                key={opt}
                className={`prefs-chip ${cookingTime.includes(opt) ? 'active' : ''}`}
                onClick={() => toggleTime(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </section>

        <section className="prefs-section">
          <h2>Your Goals</h2>
          <div className="prefs-chips">
            {GOAL_OPTIONS.map(opt => (
              <button
                key={opt}
                className={`prefs-chip ${goals.includes(opt) ? 'active' : ''}`}
                onClick={() => toggleGoal(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </section>

        <button className="prefs-cta" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Finding stores…' : 'Get Started'}
        </button>
      </div>
    </div>
  );
}
