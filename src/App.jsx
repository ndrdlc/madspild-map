import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import MapCanvas from './components/Map.jsx';
import { LeftRail, DetailCard, TodayBadge } from './components/UI.jsx';

// ── Brand → chain colour key (maps to CSS vars --chain-green / red / blue) ──
const BRAND_TO_CHAIN = { 'Føtex': 'green', 'Netto': 'red', 'Bilka': 'blue' };

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
    chain:   BRAND_TO_CHAIN[s.brand] || 'ink',
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
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId]   = useState(null);
  const [savedIds, setSavedIds]     = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('mm.saved') || '[]')); } catch { return new Set(); }
  });

  const [tweaks, setTweaks]         = useState(TWEAKS);
  const [tweaksOpen, setTweaksOpen] = useState(false);

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

  useEffect(() => { loadDeals(55.6761, 12.5683, 10); }, []);

  // ── Derived data ───────────────────────────────────────────────────────────

  const deals = useMemo(() =>
    rawDeals.map(r => normalizeStore(r, center))
  , [rawDeals, center]);

  const mapDeals = useMemo(() => deals.filter(d => {
    if (filter !== 'all' && d.chain !== filter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return d.store.toLowerCase().includes(q) ||
           d.items.some(i => i.n.toLowerCase().includes(q));
  }), [deals, filter, query]);

  const sortedDeals = useMemo(() =>
    mapDeals.filter(d => d._d <= distance).slice().sort((a, b) => a._d - b._d)
  , [mapDeals, distance]);

  const selected = useMemo(() =>
    deals.find(d => d.id === selectedId) || null
  , [deals, selectedId]);

  const selectedItems = useMemo(() => {
    if (!selected) return [];
    if (!query) return selected.items;
    const q = query.toLowerCase();
    const storeMatch = selected.store.toLowerCase().includes(q);
    if (storeMatch) return selected.items;
    const filtered = selected.items.filter(i => i.n.toLowerCase().includes(q));
    return filtered.length > 0 ? filtered : selected.items;
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

  const handleSearchArea = useCallback(() => {
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
  }, [loadDeals]);

  const handleMapReady = useCallback((map) => { mapRef.current = map; }, []);

  const handleLocationChange = useCallback(({ lat, lng }) => {
    if (mapRef.current) mapRef.current.setView([lat, lng], 13);
    setDistance(5);
    loadDeals(lat, lng, 5);
  }, [loadDeals]);

  const setTweak = (k, v) => setTweaks(t => ({ ...t, [k]: v }));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="app">
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
      />

      <main className="canvas">
        <MapCanvas
          deals={mapDeals}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onSelect={handleSelect}
          onHover={setHoveredId}
          onMapReady={handleMapReady}
        />

        <TodayBadge sortedDeals={sortedDeals} loading={loading} />

        <button
          className="search-area-btn"
          onClick={handleSearchArea}
          disabled={loading}
        >
          {loading ? 'Loading…' : 'Search this area'}
        </button>

        {selected && (
          <DetailCard
            deal={{ ...selected, items: selectedItems }}
            fmtKm={fmtKm}
            saved={savedIds.has(selected.id)}
            onToggleSave={onToggleSave}
            onClose={() => setSelectedId(null)}
          />
        )}
      </main>

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
    </div>
  );
}
