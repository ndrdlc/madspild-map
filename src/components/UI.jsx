import { useState, useCallback } from 'react';

// ── Primitives ───────────────────────────────────────────────────────────────

function Chip({ active, onClick, dot, children }) {
  return (
    <button className={`chip ${active ? 'chip--on' : ''}`} onClick={onClick}>
      {dot && <span className="chip-dot" style={{ background: dot }} />}
      {children}
    </button>
  );
}

function Tag({ children }) {
  return <span className="tag">{children}</span>;
}

function formatExpiry(endTime) {
  if (!endTime) return null;
  const d = new Date(endTime);
  const diff = d - Date.now();
  if (diff < 0) return 'expired';
  if (diff < 86_400_000) return 'expires today';
  if (diff < 172_800_000) return 'expires tomorrow';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ── Left rail ────────────────────────────────────────────────────────────────

export function LeftRail({
  query, setQuery,
  filter, setFilter,
  distance, setDistance,
  sortedDeals, selectedId, onSelect, onHover, hoveredId,
  savedIds, onToggleSave,
  CHAINS, fmtKm,
  loading, error,
  onLocationChange,
}) {
  const [geoStatus, setGeoStatus] = useState('');

  const handleSearchKeyDown = useCallback(async (e) => {
    if (e.key !== 'Enter') return;
    const q = query.trim();
    if (!q || !/\d/.test(q)) return;

    const isZip = /^\d{4}$/.test(q);
    setGeoStatus('Searching location…');
    try {
      const url = isZip
        ? `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(q)}&country=Denmark&format=json&limit=1&addressdetails=1`
        : `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)},Denmark&format=json&limit=1&addressdetails=1`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.length > 0) {
        const addr = data[0].address || {};
        const city = addr.city || addr.town || addr.village || addr.municipality || null;
        onLocationChange({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), city });
        setQuery('');
        setGeoStatus('');
      } else {
        setGeoStatus('Location not found');
        setTimeout(() => setGeoStatus(''), 3000);
      }
    } catch {
      setGeoStatus('Search failed, try again');
      setTimeout(() => setGeoStatus(''), 3000);
    }
  }, [query, onLocationChange, setQuery]);

  return (
    <aside className="rail">
      <header className="rail-head">
        <div className="brand">
          <svg viewBox="0 0 24 24" width="22" height="22" className="brand-mark">
            <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M12 4 C 8 9, 8 15, 12 20 C 16 15, 16 9, 12 4 Z"
                  fill="currentColor" opacity="0.9"/>
            <circle cx="12" cy="12" r="1.4" fill="var(--paper)"/>
          </svg>
          <div>
            <div className="brand-name">Madspild<span className="brand-accent">·</span>Map</div>
            <div className="brand-sub">Find food before it goes to waste.</div>
          </div>
        </div>
      </header>

      <div className="search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>
        </svg>
        <input
          placeholder="Store, product, zip or address…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleSearchKeyDown}
        />
        {query && <button className="clear" onClick={() => setQuery('')}>×</button>}
      </div>
      {geoStatus && <div className="geo-status">{geoStatus}</div>}

      <div className="filters">
        <div className="row">
          {CHAINS.map(c =>
            <Chip key={c.id} active={filter === c.id} onClick={() => setFilter(c.id)}
                  dot={c.dot || null}>
              {c.label}
            </Chip>
          )}
        </div>
        <div className="slider">
          <div className="slider-head">
            <span>Radius</span>
            <span className="mono">{fmtKm(distance)}</span>
          </div>
          <input type="range" min="1" max="25" step="0.5"
                 value={distance}
                 onChange={e => setDistance(+e.target.value)}/>
          <div className="slider-ticks">
            <span>near</span><span>whole city</span>
          </div>
        </div>
      </div>

      <div className="list-head">
        <span className="list-title">{sortedDeals.length} stores</span>
        <span className="list-sub">sorted by distance</span>
      </div>

      <div className="list">
        {error && (
          <div className="empty">
            <div className="empty-emoji">⚠</div>
            {error}
          </div>
        )}

        {!error && !loading && sortedDeals.length === 0 && (
          <div className="empty">
            <div className="empty-emoji">·</div>
            No stores in this radius.<br />Try increasing the range.
          </div>
        )}

        {!error && loading && sortedDeals.length === 0 && (
          <div className="empty">
            <div className="empty-emoji">·</div>
            Loading deals…
          </div>
        )}

        {sortedDeals.map(d => {
          const sel      = d.id === selectedId;
          const hov      = d.id === hoveredId;
          const saved    = savedIds.has(d.id);
          const minPrice = Math.min(...d.items.map(i => i.now));
          const maxDisc  = Math.max(...d.items.map(i => Math.round((1 - i.now / i.was) * 100)));
          return (
            <div key={d.id}
                 role="button" tabIndex={0}
                 className={`card ${sel ? 'card--sel' : ''} ${hov ? 'card--hov' : ''}`}
                 onMouseEnter={() => onHover(d.id)}
                 onMouseLeave={() => onHover(null)}
                 onClick={() => onSelect(d.id)}
                 onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(d.id); } }}>
              <div className="card-left">
                <span className="card-dot" style={{ background: `var(--chain-${d.chain})` }}/>
              </div>
              <div className="card-mid">
                <div className="card-title">{d.store}</div>
                <div className="card-meta">
                  <span>{d.items.length} items</span>
                  <span className="dot-sep">·</span>
                  <span>{fmtKm(d._d)}</span>
                  <span className="dot-sep">·</span>
                  <span className="save-pct">−{maxDisc}%</span>
                </div>
              </div>
              <div className="card-right">
                <div className="from">from</div>
                <div className="price">{minPrice.toFixed(0)}<span className="kr">kr</span></div>
                <span className={`heart ${saved ? 'on' : ''}`}
                      role="button" tabIndex={0}
                      onClick={e => { e.stopPropagation(); onToggleSave(d.id); }}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onToggleSave(d.id); } }}
                      aria-label="Save">
                  <svg viewBox="0 0 24 24" width="14" height="14"
                       fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6">
                    <path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10z"/>
                  </svg>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <footer className="rail-foot">
        <div>
          <div className="foot-num">{sortedDeals.reduce((n, d) => n + d.items.length, 0)}</div>
          <div className="foot-lbl">items today</div>
        </div>
        <div>
          <div className="foot-num">
            {Math.round(sortedDeals.reduce((n, d) =>
              n + d.items.reduce((m, i) => m + (i.was - i.now), 0), 0)
            )}<span className="kr">kr</span>
          </div>
          <div className="foot-lbl">can be saved</div>
        </div>
      </footer>
    </aside>
  );
}

// ── Detail card ───────────────────────────────────────────────────────────────

export function DetailCard({ deal, onClose, fmtKm, saved, onToggleSave }) {
  if (!deal) return null;
  const totalWas = deal.items.reduce((s, i) => s + i.was, 0);
  const totalNow = deal.items.reduce((s, i) => s + i.now, 0);
  const saveKr   = Math.round(totalWas - totalNow);
  const savePct  = Math.round((saveKr / totalWas) * 100);

  return (
    <section className="detail" key={deal.id}>
      <header className="detail-head">
        <div>
          <div className="detail-chain">
            <span className="dot" style={{ background: `var(--chain-${deal.chain})` }}/>
            <span>{deal.store}</span>
          </div>
          <div className="detail-meta">
            {fmtKm(deal._d)} away · {deal.address}
          </div>
        </div>
        <div className="detail-actions">
          <button className={`icon-btn ${saved ? 'on' : ''}`}
                  onClick={() => onToggleSave(deal.id)} aria-label="Save">
            <svg viewBox="0 0 24 24" width="16" height="16"
                 fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6">
              <path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10z"/>
            </svg>
          </button>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
                 stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6l12 12M18 6L6 18"/>
            </svg>
          </button>
        </div>
      </header>

      <div className="detail-items">
        {deal.items.map((it, idx) => {
          const pct = Math.round((1 - it.now / it.was) * 100);
          const expiry = it.endTime
            ? formatExpiry(it.endTime)
            : it.stock != null ? `${it.stock} ${it.stockUnit} left` : null;
          return (
            <div key={idx} className="item">
              <div className="item-main">
                <div className="item-name">{it.n}</div>
                <div className="item-meta">
                  {it.tag && <Tag>{it.tag}</Tag>}
                  {expiry && <span className="best">{expiry}</span>}
                </div>
              </div>
              <div className="item-prices">
                <span className="was">{it.was.toFixed(0)}<span className="kr">kr</span></span>
                <span className="now">{it.now.toFixed(0)}<span className="kr">kr</span></span>
                <span className="pct">−{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>

      <footer className="detail-foot">
        <div className="foot-bar">
          <div>
            <div className="foot-lbl">Total</div>
            <div className="foot-val">
              <span className="was">{totalWas.toFixed(0)}<span className="kr">kr</span></span>
              <span className="now">{totalNow.toFixed(0)}<span className="kr">kr</span></span>
            </div>
          </div>
          <div className="save-pill">Save {saveKr} kr ({savePct}%)</div>
        </div>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${deal.lat},${deal.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn--primary"
        >
          Get directions ↗
        </a>
      </footer>
    </section>
  );
}

// ── Today badge ───────────────────────────────────────────────────────────────

export function TodayBadge({ sortedDeals, loading, city = 'Copenhagen' }) {
  const totalSave = sortedDeals.reduce(
    (s, d) => s + d.items.reduce((m, i) => m + (i.was - i.now), 0), 0
  );
  const itemCount = sortedDeals.reduce((s, d) => s + d.items.length, 0);
  const co2 = Math.round(itemCount * 0.4 * 10) / 10;

  return (
    <div className="today">
      <div className="today-row">
        <div>
          <div className="today-lbl">Today in {city}</div>
          <div className="today-val">
            {loading ? '…' : `${Math.round(totalSave)} kr`}
            {' '}<span className="today-sub">can be saved</span>
          </div>
        </div>
        <div className="today-sep"/>
        <div>
          <div className="today-lbl">Food rescued</div>
          <div className="today-val">
            {loading ? '…' : `${co2} kg`}
            {' '}<span className="today-sub">CO₂e avoided</span>
          </div>
        </div>
      </div>
    </div>
  );
}
