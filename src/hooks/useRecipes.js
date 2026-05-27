import { useState, useEffect, useCallback } from 'react';

// Bump CACHE_SCHEMA when the recipe shape changes so previously cached
// entries miss and we re-call the LLM with the new prompt.
const CACHE_SCHEMA = 'v4';

// Module-level cache so opening/closing the panel — or switching between
// mobile feed and desktop panel — doesn't trigger duplicate LLM calls.
let _cache = { key: null, recipes: [], droppedCount: 0 };

const buildCacheKey = (deals, preferences) =>
  CACHE_SCHEMA + '|' + deals.map(d => d.id).join(',') + '|' + JSON.stringify(preferences);

export function useRecipes(deals, preferences, { enabled = true } = {}) {
  const cacheKey = buildCacheKey(deals, preferences);
  const allItems = deals.flatMap(d => d.items).slice(0, 15);

  const [recipes, setRecipes] = useState(() =>
    _cache.key === cacheKey ? _cache.recipes : []
  );
  const [droppedCount, setDroppedCount] = useState(() =>
    _cache.key === cacheKey ? _cache.droppedCount : 0
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: allItems, preferences }),
      });

      const text = await res.text();
      let data = null;
      if (text) {
        try { data = JSON.parse(text); } catch { /* non-JSON body */ }
      }

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(
            'Recipe API not found. If you are running locally, use `vercel dev` instead of `npm run dev` so /api routes are served.'
          );
        }
        throw new Error(data?.error || `API error ${res.status}${text ? `: ${text.slice(0, 120)}` : ''}`);
      }

      if (!data) {
        throw new Error('Empty response from /api/recipes. Check ANTHROPIC_API_KEY is set in your Vercel env.');
      }

      const list = data.recipes || [];
      const dropped = data.droppedCount || 0;
      _cache = { key: cacheKey, recipes: list, droppedCount: dropped };
      setRecipes(list);
      setDroppedCount(dropped);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  useEffect(() => {
    if (!enabled) return;
    if (!allItems.length || !preferences) return;
    if (_cache.key === cacheKey && _cache.recipes.length > 0) {
      setRecipes(_cache.recipes);
      setDroppedCount(_cache.droppedCount);
      return;
    }
    fetchRecipes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, enabled]);

  return { recipes, loading, error, droppedCount, refetch: fetchRecipes, allItems };
}

// Match a recipe ingredient name back to a discounted item. `deals` is sorted
// by distance, so the first match is the closest store carrying it.
export function findItemSource(ingredientName, deals) {
  if (!ingredientName) return null;
  const q = ingredientName.toLowerCase().trim();
  for (const d of deals) {
    for (const it of d.items) {
      const n = it.n.toLowerCase();
      if (n === q || n.includes(q) || q.includes(n)) {
        return { store: d, item: it };
      }
    }
  }
  return null;
}
