import React, { useState, useMemo, useEffect, useRef } from 'react';
import './MobileFeed.css';
import { useRecipes, findItemSource } from '../hooks/useRecipes.js';

const SAVINGS_TOOLTIP =
  'Sum of (original price − discounted price) across every discounted item shown. ' +
  'Real prices from the Salling API, but assumes every item is bought — actual ' +
  'savings depend on how many deals you pick up.';

const CO2_TOOLTIP =
  'Rough estimate at 0.4 kg CO₂ per rescued item. A simple flat assumption — ' +
  'real impact varies a lot by food type (meat is far higher than vegetables) ' +
  'and only counts if the item is actually rescued rather than thrown out.';

function fmtKm(km) {
  if (km == null) return '';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function capitalizeFirst(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function MobileFeed({
  city,
  distance,
  sortedDeals,
  preferences,
  loading,
  error,
  onEditPreferences,
  onOpenMap,
  onSelectStore,
}) {
  const { recipes, loading: recipesLoading, error: recipesError, droppedCount, refetch } =
    useRecipes(sortedDeals, preferences);

  const [expandedRecipe, setExpandedRecipe] = useState(null);
  const [openImpactTip, setOpenImpactTip] = useState(null); // 'savings' | 'co2' | null
  const impactRef = useRef(null);

  // Close impact tooltip when tapping outside the card.
  useEffect(() => {
    if (!openImpactTip) return;
    function onDocClick(e) {
      if (impactRef.current && !impactRef.current.contains(e.target)) {
        setOpenImpactTip(null);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('touchstart', onDocClick);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('touchstart', onDocClick);
    };
  }, [openImpactTip]);

  // Flatten all discounted items across visible stores, sort by discount %.
  const products = useMemo(() => {
    const flat = sortedDeals.flatMap(d => d.items.map(it => ({ ...it, store: d })));
    return flat.sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0)).slice(0, 30);
  }, [sortedDeals]);

  const totalItems = sortedDeals.reduce((n, d) => n + d.items.length, 0);
  const totalSave = sortedDeals.reduce(
    (s, d) => s + d.items.reduce((m, i) => m + (i.was - i.now), 0), 0
  );
  const co2 = Math.round(totalItems * 0.4 * 10) / 10;

  return (
    <div className="mfeed">
      <div className="mfeed-topbar">
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
          onClick={onEditPreferences}
          aria-label="Edit preferences"
          title="Edit preferences"
        >
          ⚙
        </button>
      </div>

      <header className="mfeed-header">
        <div className="mfeed-title">
          <div className="mfeed-h1">Food worth saving near you</div>
          <div className="mfeed-h1-sub">Every deal you grab is one less item wasted.</div>
        </div>
      </header>

      <button
        className="mfeed-location"
        onClick={onEditPreferences}
        title="Change location"
      >
        <span className="mfeed-loc-icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s-7-7.58-7-13a7 7 0 1 1 14 0c0 5.42-7 13-7 13z"/>
            <circle cx="12" cy="9" r="2.5"/>
          </svg>
        </span>
        <div className="mfeed-loc-text">
          <div className="mfeed-loc-name">
            {city || 'Set your location'}
            <span className="mfeed-loc-caret"> ▾</span>
          </div>
          <div className="mfeed-loc-sub">Within {distance} km</div>
        </div>
        <span className="mfeed-loc-badge">
          {loading ? '…' : `${totalItems} deals`}
        </span>
      </button>

      {error && (
        <div className="mfeed-banner mfeed-banner--error">{error}</div>
      )}

      {totalItems > 0 && (
        <div className="mfeed-impact" ref={impactRef}>
          <div className="mfeed-impact-head">Your potential impact today</div>
          <div className="mfeed-impact-grid">
            <div className="mfeed-impact-stat">
              <div className="mfeed-impact-value">
                ~{Math.round(totalSave).toLocaleString('da-DK')}
                <span className="mfeed-impact-unit">kr</span>
              </div>
              <div className="mfeed-impact-label">
                <span>could be saved</span>
                <button
                  type="button"
                  className={`mfeed-impact-info ${openImpactTip === 'savings' ? 'on' : ''}`}
                  onClick={() => setOpenImpactTip(openImpactTip === 'savings' ? null : 'savings')}
                  aria-expanded={openImpactTip === 'savings'}
                  aria-label="More about could-be-saved estimate"
                >ⓘ</button>
              </div>
            </div>
            <div className="mfeed-impact-sep" />
            <div className="mfeed-impact-stat">
              <div className="mfeed-impact-value">
                ~{co2}
                <span className="mfeed-impact-unit">kg CO₂</span>
              </div>
              <div className="mfeed-impact-label">
                <span>could be spared</span>
                <button
                  type="button"
                  className={`mfeed-impact-info ${openImpactTip === 'co2' ? 'on' : ''}`}
                  onClick={() => setOpenImpactTip(openImpactTip === 'co2' ? null : 'co2')}
                  aria-expanded={openImpactTip === 'co2'}
                  aria-label="More about CO2 estimate"
                >ⓘ</button>
              </div>
            </div>
          </div>
          {openImpactTip && (
            <div className="mfeed-impact-tip" role="tooltip">
              {openImpactTip === 'savings' ? SAVINGS_TOOLTIP : CO2_TOOLTIP}
            </div>
          )}
        </div>
      )}

      <section className="mfeed-section">
        <div className="mfeed-section-head">
          <h2>Fresh Deals</h2>
          <button className="mfeed-section-cta" onClick={onOpenMap}>
            View on map
          </button>
        </div>
        {products.length === 0 && !loading ? (
          <p className="mfeed-empty">No deals in this area. Try a wider radius or a different location.</p>
        ) : (
          <div className="mfeed-deals">
            {products.map((p, i) => (
              <button
                key={`${p.store.id}-${i}`}
                className="mfeed-deal"
                onClick={() => onSelectStore?.(p.store.id)}
                title={`Sold at ${p.store.store}`}
              >
                <div className="mfeed-deal-thumb">
                  {p.image ? (
                    <img src={p.image} alt="" loading="lazy" />
                  ) : (
                    <span className="mfeed-deal-thumb-fallback">🥗</span>
                  )}
                </div>
                <div className="mfeed-deal-body">
                  <div className="mfeed-deal-name">{p.n}</div>
                  <div className="mfeed-deal-store">
                    <span
                      className="mfeed-deal-dot"
                      style={{ background: `var(--chain-${p.store.chain})` }}
                    />
                    {p.store.store} · {fmtKm(p.store._d)}
                  </div>
                  <div className="mfeed-deal-prices">
                    <span className="mfeed-deal-now">{Math.round(p.now)} kr</span>
                    {p.was != null && (
                      <span className="mfeed-deal-was">{Math.round(p.was)} kr</span>
                    )}
                    {p.pct != null && (
                      <span className="mfeed-deal-pct">−{Math.round(p.pct)}%</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mfeed-section">
        <div className="mfeed-section-head">
          <h2>Popular Recipes</h2>
          {recipes.length > 0 && (
            <button className="mfeed-section-cta" onClick={refetch}>
              Regenerate
            </button>
          )}
        </div>

        {droppedCount > 0 && (
          <p className="mfeed-recipe-note">{droppedCount} hidden because they don't match your diet.</p>
        )}

        {recipesLoading && (
          <div className="mfeed-loading">
            <div className="mfeed-spinner" />
            <span>Finding recipes for your discounts…</span>
          </div>
        )}

        {recipesError && (
          <div className="mfeed-banner mfeed-banner--error">
            {recipesError}
            <button className="mfeed-banner-btn" onClick={refetch}>Try again</button>
          </div>
        )}

        {!recipesLoading && !recipesError && recipes.length === 0 && (
          <p className="mfeed-empty">No recipes yet — add some deals nearby and we'll suggest meals.</p>
        )}

        <div className="mfeed-recipes">
          {recipes.map((r, i) => (
            <div key={i} className="mfeed-recipe">
              <div className="mfeed-recipe-meta">
                <span className="mfeed-pill">{r.time}</span>
                <span className="mfeed-pill mfeed-pill--muted">{r.difficulty}</span>
              </div>
              <h3>{r.title}</h3>
              <p className="mfeed-recipe-desc">{r.description}</p>

              <div className="mfeed-recipe-ings">
                {r.mainIngredients?.map((ing, j) => {
                  const src = findItemSource(ing, sortedDeals);
                  const canSelect = src && onSelectStore;
                  const Tag = canSelect ? 'button' : 'div';
                  return (
                    <Tag
                      key={j}
                      className={`mfeed-ing ${canSelect ? 'mfeed-ing--clickable' : ''}`}
                      onClick={canSelect ? () => onSelectStore(src.store.id) : undefined}
                    >
                      <span className="mfeed-ing-name">{capitalizeFirst(ing)}</span>
                      {src ? (
                        <span className="mfeed-ing-store">
                          <span
                            className="mfeed-deal-dot"
                            style={{ background: `var(--chain-${src.store.chain})` }}
                          />
                          {src.store.store} · {fmtKm(src.store._d)} · {Math.round(src.item.now)} kr
                        </span>
                      ) : (
                        <span className="mfeed-ing-store mfeed-ing-store--missing">pantry item</span>
                      )}
                    </Tag>
                  );
                })}
              </div>

              {r.tags?.length > 0 && (
                <div className="mfeed-tags">
                  {r.tags.map((t, k) => (
                    <span key={k} className="mfeed-pill mfeed-pill--accent">{t}</span>
                  ))}
                </div>
              )}

              {r.steps?.length > 0 && (
                <>
                  <button
                    className="mfeed-recipe-toggle"
                    onClick={() => setExpandedRecipe(expandedRecipe === i ? null : i)}
                  >
                    {expandedRecipe === i ? 'Hide recipe' : 'View recipe'}
                    <span className={`mfeed-recipe-chevron ${expandedRecipe === i ? 'open' : ''}`}>▾</span>
                  </button>
                  {expandedRecipe === i && (
                    <ol className="mfeed-recipe-steps">
                      {r.steps.map((step, k) => <li key={k}>{step}</li>)}
                    </ol>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      <button className="mfeed-map-fab" onClick={onOpenMap} aria-label="View map">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
          <line x1="9" y1="3" x2="9" y2="18" />
          <line x1="15" y1="6" x2="15" y2="21" />
        </svg>
        View map
      </button>
    </div>
  );
}
