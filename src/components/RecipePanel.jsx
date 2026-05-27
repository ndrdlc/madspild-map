import React, { useState } from 'react';
import './RecipePanel.css';
import { useRecipes, findItemSource } from '../hooks/useRecipes.js';

function fmtKm(km) {
  if (km == null) return '';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function capitalizeFirst(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function RecipePanel({
  deals,
  preferences,
  onClose,
  onEditPreferences,
  onSelectStore,
  scope = 'all',         // 'all' = all nearby stores, 'store' = a single store
  scopeStoreName = null, // name of the store when scope === 'store'
}) {
  const { recipes, loading, error, droppedCount, refetch, allItems } =
    useRecipes(deals, preferences);
  const [expandedIdx, setExpandedIdx] = useState(null);

  const subtitle = scope === 'store' && scopeStoreName
    ? `Based on ${allItems.length} items at ${scopeStoreName}`
    : `Based on ${allItems.length} discounted items near you`;

  return (
    <div className="recipe-panel">
      <div className="recipe-panel-header">
        <div>
          <h2>Recipe ideas</h2>
          <p className="recipe-panel-sub">
            {subtitle}
            {droppedCount > 0 && (
              <>
                {' · '}
                <span className="recipe-panel-dropped">
                  {droppedCount} hidden (diet)
                </span>
              </>
            )}
          </p>
        </div>
        <div className="recipe-panel-actions">
          <button className="recipe-icon-btn" onClick={onEditPreferences} title="Edit preferences">
            ⚙️
          </button>
          <button className="recipe-icon-btn" onClick={onClose} title="Close">
            ✕
          </button>
        </div>
      </div>

      {loading && (
        <div className="recipe-loading">
          <div className="recipe-spinner" />
          <span>Finding recipes for your discounts…</span>
        </div>
      )}

      {error && (
        <div className="recipe-error">
          <p>{error}</p>
          <button onClick={refetch}>Try again</button>
        </div>
      )}

      {!loading && !error && recipes.length === 0 && (
        <div className="recipe-empty">
          <p>No recipes found. Try searching a different area.</p>
        </div>
      )}

      <div className="recipe-list">
        {recipes.map((r, i) => (
          <div key={i} className="recipe-card">
            <div className="recipe-card-meta">
              <span className="recipe-tag">{r.time}</span>
              <span className="recipe-tag recipe-tag--muted">{r.difficulty}</span>
            </div>
            <h3>{r.title}</h3>
            <p className="recipe-card-desc">{r.description}</p>
            <div className="recipe-ingredients">
              {r.mainIngredients?.map((ing, j) => {
                const src = findItemSource(ing, deals);
                const canSelect = src && onSelectStore;
                const Tag = canSelect ? 'button' : 'div';
                return (
                  <Tag
                    key={j}
                    className={`recipe-ingredient ${canSelect ? 'recipe-ingredient--clickable' : ''} ${src ? '' : 'recipe-ingredient--unmatched'}`}
                    onClick={canSelect ? () => onSelectStore(src.store.id) : undefined}
                    title={canSelect ? `Show ${src.store.store} on the map` : undefined}
                  >
                    <span className="recipe-ingredient-name">{capitalizeFirst(ing)}</span>
                    {src ? (
                      <span className="recipe-ingredient-store">
                        <span
                          className="recipe-ingredient-dot"
                          style={{ background: `var(--chain-${src.store.chain})` }}
                        />
                        <span className="recipe-ingredient-store-name">{src.store.store}</span>
                        <span className="recipe-ingredient-store-sep">·</span>
                        <span className="recipe-ingredient-store-dist">{fmtKm(src.store._d)}</span>
                        <span className="recipe-ingredient-store-sep">·</span>
                        <span className="recipe-ingredient-store-price">{Math.round(src.item.now)} kr</span>
                      </span>
                    ) : (
                      <span className="recipe-ingredient-store recipe-ingredient-store--missing">
                        not in nearby deals — pantry item
                      </span>
                    )}
                  </Tag>
                );
              })}
            </div>
            {r.tags?.length > 0 && (
              <div className="recipe-tags">
                {r.tags.map((tag, j) => (
                  <span key={j} className="recipe-tag recipe-tag--accent">{tag}</span>
                ))}
              </div>
            )}

            {r.steps?.length > 0 && (
              <>
                <button
                  className="recipe-view-btn"
                  onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                  aria-expanded={expandedIdx === i}
                >
                  {expandedIdx === i ? 'Hide recipe' : 'View recipe'}
                  <span className={`recipe-view-chevron ${expandedIdx === i ? 'open' : ''}`}>▾</span>
                </button>

                {expandedIdx === i && (
                  <ol className="recipe-steps">
                    {r.steps.map((step, k) => (
                      <li key={k}>{step}</li>
                    ))}
                  </ol>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {!loading && recipes.length > 0 && (
        <button className="recipe-refresh-btn" onClick={refetch}>
          Regenerate suggestions
        </button>
      )}
    </div>
  );
}
