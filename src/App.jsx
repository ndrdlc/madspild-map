import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import MapCanvas from './components/Map.jsx';
import { LeftRail, DetailCard, TodayBadge } from './components/UI.jsx';
import Preferences from './components/Preferences.jsx';
import RecipePanel from './components/RecipePanel.jsx';
import MobileFeed from './components/MobileFeed.jsx';
import { usePreferences } from './hooks/usePreferences.js';
import { formatArea } from './utils/geo.js';
import { Analytics } from '@vercel/analytics/react';

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

// ── Brand → chain colour key (maps to CSS vars --chain-green / red / blue) ──
// Salling's API returns brand strings with varying casing and sub-formats
// (e.g. "føtex food", "føtex city", "Føtex"), so we substring-match the
// normalised brand against the known chain tokens — and fall back to the
// store name if the brand field is missing or unrecognised.
function chainForBrand(brand, storeName = '') {
  const probe = `${brand || ''} ${storeName || ''}`.toLowerCase();
  if (/føtex|foetex|fotex/.test(probe)) return 'green';
  if (/netto/.test(probe))              return 'red';
  if (/bilka/.test(probe))              return 'blue';
  return 'ink';
}

const CHAINS = [
  { id: 'all',   label: 'All stores', dot: null },
  { id: 'green', label: 'Føtex',      dot: 'var(--chain-green)' },
  { id: 'red',   label: 'Netto',      dot: 'var(--chain-red)'   },
  { id: 'blue',  label: 'Bilka',      dot: 'var(--chain-blue)'  },
];

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371, r = x => x * Math.PI / 180;
  const dLat = r(lat2 - lat1), dLng = r(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 +
    Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeStore(raw, center) {
  const s   = raw.store;
  const lat = s.coordinates[1];
  const lng = s.coordinates[0];
  return {
    id:      s.id,
    store:   s.name,
    brand:   s.brand,
    chain:   chainForBrand(s.brand, s.name),
    address: `${s.address.street}, ${s.address.zip} ${s.address.city}`,
    lat, lng,
    _d: s.distance_km ?? haversineKm(center.lat, center.lng, lat, lng),
    items: (raw.clearances || []).map(c => ({
      n:         c.product.description,
      was:       c.offer.originalPrice,
      now:       c.offer.newPrice,
      pct:       Math.round(c.offer.percentDiscount),
      tag:       c.product.categories?.en || c.product.categories?.da || 'Food',
      stock:     c.offer.stock,
      stockUnit: c.offer.stockUnit,
      image:     c.product.image,
      endTime:   c.offer.endTime,
    })),
  };
}

function fmtKm(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

const TWEAKS = { theme: 'paper', accent: 'sage', density: 'comfortable' };

function applyTheme(theme, accent) {
  document.documentElement.dataset.theme   = theme;
  document.documentElement.dataset.accent  = accent;
}

// ── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [rawDeals, setRawDeals] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [center, setCenter]     = useState({ lat: 55.6761, lng: 12.5683 });
  const mapRef = useRef(null);

  const [query, setQuery]         = useState('');
  const [filter, setFilter]       = useState('all');
  const [distance, setDistance]   = useState(10);
  const [city, setCity]           = useState('Copenhagen');
  const [railOpen, setRailOpen]   = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId]   = useState(null);
  const [savedIds, setSavedIds]     = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('mm.saved') || '[]')); } catch { return new Set(); }
  });

  const [tweaks, setTweaks]         = useState(TWEAKS);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [recipesOpen, setRecipesOpen] = useState(false);
  const [recipeScope, setRecipeScope] = useState('all'); // 'all' | 'store'

  const isMobile = useMediaQuery('(max-width: 768px)');
  const [mobileView, setMobileView] = useState('feed'); // 'feed' | 'map'

  const {
    preferences,
    showOnboarding,
    savePreferences: savePreferencesRaw,
    editPreferences: editPreferencesRaw,
    closeOnboarding,
  } = usePreferences();

  const editPreferences = useCallback(() => {
    setSelectedId(null);
    editPreferencesRaw();
  }, [editPreferencesRaw]);

  useEffect(() => applyTheme(tweaks.theme, tweaks.accent), [tweaks.theme, tweaks.accent]);
  useEffect(() => { document.documentElement.dataset.density = tweaks.density; }, [tweaks.density]);
  useEffect(() => {
    try { localStorage.setItem('mm.saved', JSON.stringify([...savedIds])); } catch {}
  }, [savedIds]);

  // ── API ────────────────────────────────────────────────────────────────────

  const loadDeals = useCallback(async (lat, lng, radius) => {
    try {
      setLoading(true);
      setError(null);
      const r = Math.min(Math.ceil(radius), 25);
      let res = await fetch(`/api/food-waste?lat=${lat}&lng=${lng}&radius=${r}`);
      const ct = res.headers.get('content-type') || '';

      if (!res.ok || !ct.includes('application/json')) {
        const key = import.meta.env.VITE_SALLING_API_KEY;
        if (!key) throw new Error(
          'Running locally? Use `vercel dev` instead of `npm run dev`, ' +
          'or add VITE_SALLING_API_KEY to .env.local. See .env.example.'
        );
        res = await fetch(
          `https://api.sallinggroup.com/v1/food-waste/?geo=${lat},${lng}&radius=${r}`,
          { headers: { Authorization: `Bearer ${key}` } }
        );
      }
      if (res.status === 500) throw new Error('The search area is too large. Try reducing the radius or zooming in.');
      if (!res.ok) throw new Error(`API error ${res.status}`);

      const data = await res.json();
      setRawDeals(data.filter(s =>
        s.store?.coordinates?.length === 2
      ));
      setCenter({ lat, lng });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial deal fetch on mount. If the user has a saved location from a
  // previous session, load deals there instead of the Copenhagen default.
  useEffect(() => {
    const lat = preferences?.location?.lat;
    const lng = preferences?.location?.lng;
    if (lat != null && lng != null) {
      setCenter({ lat, lng });
      loadDeals(lat, lng, 10);
    } else {
      loadDeals(55.6761, 12.5683, 10);
    }
    // Only run once on mount; preferences updates after mount go through
    // handleLocationChange instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the displayed city in sync with the saved preferences. This is the
  // single source of truth for the city label, so it can't be stomped by
  // intermediate re-renders.
  useEffect(() => {
    const savedCity = preferences?.location?.city;
    if (savedCity) setCity(savedCity);
  }, [preferences?.location?.city]);

  // ── Derived data ───────────────────────────────────────────────────────────

  const deals = useMemo(() =>
    rawDeals.map(r => normalizeStore(r, center))
  , [rawDeals, center]);

  const mapDeals = useMemo(() => deals.filter(d => {
    if (!d.items?.length) return false;  // no active deals at this store
    if (filter !== 'all' && d.chain !== filter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return d.store.toLowerCase().includes(q) ||
           d.items.some(i => i.n.toLowerCase().includes(q));
  }), [deals, filter, query]);

  const sortedDeals = useMemo(() =>
    mapDeals.filter(d => d._d <= distance * 1.1).slice().sort((a, b) => a._d - b._d)
  , [mapDeals, distance]);

  const selected = useMemo(() =>
    deals.find(d => d.id === selectedId) || null
  , [deals, selectedId]);

  const selectedItems = useMemo(() => {
    if (!selected) return [];

    // Sort by soonest expiry first. Items without endTime go to the end.
    // Stable secondary sort: deepest discount first when expiry ties.
    const byExpiry = (a, b) => {
      const ta = a.endTime ? new Date(a.endTime).getTime() : Infinity;
      const tb = b.endTime ? new Date(b.endTime).getTime() : Infinity;
      if (ta !== tb) return ta - tb;
      return (b.pct ?? 0) - (a.pct ?? 0);
    };

    const baseItems = selected.items.slice().sort(byExpiry);

    if (!query) return baseItems;
    const q = query.toLowerCase();
    const storeMatch = selected.store.toLowerCase().includes(q);
    if (storeMatch) return baseItems;
    const filtered = baseItems.filter(i => i.n.toLowerCase().includes(q));
    return filtered.length > 0 ? filtered : baseItems;
  }, [selected, query]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const onToggleSave = useCallback((id) => setSavedIds(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  }), []);

  const dealsRef = useRef(deals);
  useEffect(() => { dealsRef.current = deals; }, [deals]);

  const handleSelect = useCallback((id) => {
    setSelectedId(id);
    if (id && mapRef.current) {
      const d = dealsRef.current.find(x => x.id === id);
      if (d) mapRef.current.panTo([d.lat, d.lng], { animate: true, duration: 0.5 });
    }
  }, []);

  const handleSearchArea = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter();
    const bounds = map.getBounds();
    const corners = [
      bounds.getNorthEast(), bounds.getNorthWest(),
      bounds.getSouthEast(), bounds.getSouthWest(),
    ];
    let r = Math.max(...corners.map(p => c.distanceTo(p))) / 1000 * 1.2;
    r = Math.min(r, 25);
    setDistance(Math.ceil(r));
    loadDeals(c.lat, c.lng, r);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${c.lat}&lon=${c.lng}&format=json&addressdetails=1`
      );
      const data = await res.json();
      const area = formatArea(data.address);
      if (area) setCity(area);
    } catch {
      // ignore — keep current city label if reverse geocoding fails
    }
  }, [loadDeals]);

  const handleMapReady = useCallback((map) => { mapRef.current = map; }, []);

  const handleLocationChange = useCallback(({ lat, lng, city: area }) => {
    if (mapRef.current) mapRef.current.setView([lat, lng], 13);
    if (area) setCity(area);
    setDistance(10);
    loadDeals(lat, lng, 10);
  }, [loadDeals]);

  const savePreferences = useCallback((prefs) => {
    savePreferencesRaw(prefs);
    if (prefs.location?.lat != null && prefs.location?.lng != null) {
      handleLocationChange({
        lat: prefs.location.lat,
        lng: prefs.location.lng,
        city: prefs.location.city,
      });
    }
  }, [savePreferencesRaw, handleLocationChange]);

  const setTweak = (k, v) => setTweaks(t => ({ ...t, [k]: v }));

  // ── Render ─────────────────────────────────────────────────────────────────

  const onSelectStoreFromFeed = useCallback((id) => {
    setMobileView('map');
    handleSelect(id);
  }, [handleSelect]);

  const handleBackToFeed = useCallback(() => {
    setSelectedId(null);
    setMobileView('feed');
  }, []);

  if (isMobile && mobileView === 'feed') {
    return (
      <>
        <MobileFeed
          city={city}
          distance={distance}
          sortedDeals={sortedDeals}
          preferences={preferences}
          loading={loading}
          error={error}
          onEditPreferences={editPreferences}
          onOpenMap={() => setMobileView('map')}
          onSelectStore={onSelectStoreFromFeed}
        />
        {showOnboarding && (
          <Preferences
            initial={preferences}
            onSave={savePreferences}
            onClose={preferences ? closeOnboarding : undefined}
          />
        )}
      </>
    );
  }

  const brandStripVisible = isMobile && mobileView === 'map' && !railOpen;

  return (
    <div className={`app${brandStripVisible ? ' app--brand-strip-visible' : ''}`}>
      {brandStripVisible && (
        <>
          <div className="mfeed-brand-strip">
            <div className="mfeed-topbar-brand" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="mfeed-topbar-mark">
                <path d="M12 12 C 9 11, 6 9, 5 6 C 8 5, 11 7, 12 12 Z" fill="currentColor" fillOpacity="0.22"/>
                <path d="M12 12 C 15 11, 18 9, 19 6 C 16 5, 13 7, 12 12 Z" fill="currentColor" fillOpacity="0.22"/>
                <path d="M12 12 L 12 20"/>
                <path d="M12 12 L 7.5 7.5" strokeWidth="0.9" strokeOpacity="0.55"/>
                <path d="M12 12 L 16.5 7.5" strokeWidth="0.9" strokeOpacity="0.55"/>
              </svg>
              <span className="mfeed-topbar-name">
                Madspild<span className="brand-accent">·</span>Map
              </span>
            </div>
            <button
              className="mfeed-icon-btn"
              onClick={editPreferences}
              aria-label="Edit preferences"
              title="Edit preferences"
            >
              ⚙
            </button>
          </div>
          <button
            className="mfeed-back-btn"
            onClick={handleBackToFeed}
            aria-label="Back to feed"
          >
            ← Back
          </button>
        </>
      )}
      <LeftRail
        query={query}       setQuery={setQuery}
        filter={filter}     setFilter={setFilter}
        distance={distance} setDistance={setDistance}
        sortedDeals={sortedDeals}
        selectedId={selectedId} onSelect={handleSelect}
        hoveredId={hoveredId}   onHover={setHoveredId}
        savedIds={savedIds} onToggleSave={onToggleSave}
        CHAINS={CHAINS} fmtKm={fmtKm}
        loading={loading} error={error}
        onLocationChange={handleLocationChange}
        railOpen={railOpen}
        onToggleRail={() => setRailOpen(o => !o)}
        onBack={isMobile && mobileView === 'map' ? handleBackToFeed : null}
      />

      <main className="canvas">
        <MapCanvas
          deals={mapDeals}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onSelect={handleSelect}
          onHover={setHoveredId}
          onMapReady={handleMapReady}
          center={center}
        />

        <TodayBadge sortedDeals={sortedDeals} loading={loading} city={city} />

        <button
          className="search-area-btn"
          onClick={handleSearchArea}
          disabled={loading}
        >
          {loading ? 'Loading…' : 'Search this area'}
        </button>

        {preferences && sortedDeals.length > 0 && !recipesOpen && (
          <button
            className="recipes-fab"
            onClick={() => { setRecipeScope('all'); setRecipesOpen(true); }}
            title="Recipe ideas based on nearby discounts"
          >
            🍳 Recipe ideas
          </button>
        )}

        {recipesOpen && preferences && (
          <RecipePanel
            deals={recipeScope === 'store' && selected
              ? [{ ...selected, items: selectedItems }]
              : sortedDeals}
            preferences={preferences}
            onClose={() => setRecipesOpen(false)}
            onEditPreferences={editPreferences}
            onSelectStore={handleSelect}
            scope={recipeScope}
            scopeStoreName={recipeScope === 'store' && selected ? selected.store : null}
          />
        )}

        {selected && (
          <DetailCard
            deal={{ ...selected, items: selectedItems }}
            fmtKm={fmtKm}
            saved={savedIds.has(selected.id)}
            onToggleSave={onToggleSave}
            onClose={() => setSelectedId(null)}
            onAskRecipes={() => {
              setRecipeScope('store');
              setRecipesOpen(true);
            }}
          />
        )}
      </main>

      {showOnboarding && (
        <Preferences
          initial={preferences}
          onSave={savePreferences}
          onClose={preferences ? closeOnboarding : undefined}
        />
      )}

      {tweaksOpen && (
        <div className="tweaks">
          <header>Tweaks</header>
          <div className="tw-row">
            <label>Theme</label>
            <div className="tw-seg">
              {['paper','bone','slate'].map(t =>
                <button key={t} className={tweaks.theme===t?'on':''}
                        onClick={() => setTweak('theme', t)}>{t}</button>
              )}
            </div>
          </div>
          <div className="tw-row">
            <label>Accent</label>
            <div className="tw-seg">
              {['sage','clay','ink'].map(a =>
                <button key={a} className={tweaks.accent===a?'on':''}
                        onClick={() => setTweak('accent', a)}>{a}</button>
              )}
            </div>
          </div>
          <div className="tw-row">
            <label>Density</label>
            <div className="tw-seg">
              {['comfortable','compact'].map(d =>
                <button key={d} className={tweaks.density===d?'on':''}
                        onClick={() => setTweak('density', d)}>{d}</button>
              )}
            </div>
          </div>
        </div>
      )}
      <Analytics />
    </div>
  );
}
