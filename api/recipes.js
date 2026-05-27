// ── Diet rules ────────────────────────────────────────────────────────────────
// Each diet defines: a human-readable rule (for the prompt) and a list of
// banned tokens (Danish + English) used by the server-side safety filter.
// Tokens are matched as word-ish substrings, case-insensitive, against the
// recipe's title + description + mainIngredients + steps.
const DIET_RULES = {
  Vegetarian: {
    rule: "STRICTLY NO meat, poultry, fish or seafood of any kind. No pork (svinekød, flæsk, pulled pork, bacon, skinke, hamburgerryg), no beef (oksekød, hakket okse), no chicken (kylling), no lamb (lam), no sausage made from meat (kødpølse, medister, jægerpølse, frankfurter), no fish (fisk, laks, torsk, tun, sild, makrel), no seafood (rejer, muslinger). Dairy and eggs ARE allowed.",
    banned: [
      // pork (Danish + English)
      'pork', 'bacon', 'ham', 'svin', 'flæsk', 'skinke', 'hamburgerryg',
      'medister', 'jægerpølse', 'pølse', 'nakkekot', 'svinemørbrad',
      'mørbrad', 'pulled pork', 'spæk', 'leverpostej', 'salami',
      // beef
      'beef', 'okse', 'oksekød', 'hakket okse', 'steak', 'bøf',
      // chicken / poultry
      'chicken', 'kylling', 'turkey', 'kalkun', 'duck', 'and ',
      // lamb
      'lamb', 'lam ',
      // generic meat
      'meat', 'kød', 'minced meat', 'hakket kød', 'sausage', 'frankfurter',
      // fish / seafood
      'fish', 'fisk', 'salmon', 'laks', 'tuna', 'tun', 'cod', 'torsk',
      'herring', 'sild', 'mackerel', 'makrel', 'shrimp', 'rejer',
      'prawn', 'crab', 'krabbe', 'mussel', 'musling', 'anchovy', 'ansjos',
    ],
  },
  Vegan: {
    rule: "STRICTLY NO animal products of any kind. No meat/poultry/fish/seafood (see vegetarian rules). Additionally NO dairy (mælk, ost, smør, fløde, yoghurt, kærnemælk, skyr, fromage), NO eggs (æg), NO honey (honning), NO gelatin.",
    banned: [
      // all vegetarian-banned tokens are implicit (see merging below) PLUS:
      'milk', 'mælk', 'kærnemælk', 'cheese', 'ost', 'butter', 'smør',
      'cream', 'fløde', 'yogurt', 'yoghurt', 'skyr', 'fromage', 'kvark',
      'egg', 'æg', 'honey', 'honning', 'gelatin', 'gelatine',
      'whey', 'valle', 'curd',
    ],
  },
  'Gluten-free': {
    rule: "STRICTLY NO gluten. No wheat (hvede, hvedemel), rye (rug, rugbrød), barley (byg), spelt, semolina, regular bread (brød, levebrød, sandwich), pasta, couscous, bulgur, breadcrumbs (rasp), or beer (øl).",
    banned: [
      'wheat', 'hvede', 'hvedemel', 'rye', 'rug', 'rugbrød', 'barley',
      'byg', 'spelt', 'semolina', 'couscous', 'bulgur', 'pasta',
      'spaghetti', 'lasagne', 'noodle', 'bread', 'brød', 'levebrød',
      'sandwich', 'toast', 'bun', 'bolle', 'breadcrumb', 'rasp',
      'flour', 'mel ', 'beer', 'øl ',
    ],
  },
  'Dairy free': {
    rule: "STRICTLY NO dairy. No milk (mælk), cheese (ost, skæreost, mozzarella, feta), butter (smør), cream (fløde), yogurt (yoghurt), skyr, buttermilk (kærnemælk), or whey-based ingredients.",
    banned: [
      'milk', 'mælk', 'kærnemælk', 'cheese', 'ost', 'skæreost',
      'mozzarella', 'feta', 'parmesan', 'butter', 'smør', 'cream',
      'fløde', 'yogurt', 'yoghurt', 'skyr', 'fromage', 'kvark',
      'whey', 'valle', 'curd',
    ],
  },
};

function bannedTokensFor(dietList) {
  if (!dietList?.length) return [];
  const tokens = new Set();
  for (const d of dietList) {
    const rule = DIET_RULES[d];
    if (!rule) continue;
    rule.banned.forEach(t => tokens.add(t.toLowerCase()));
    // Vegan inherits vegetarian's meat/fish bans.
    if (d === 'Vegan') {
      DIET_RULES.Vegetarian.banned.forEach(t => tokens.add(t.toLowerCase()));
    }
  }
  return [...tokens];
}

function recipeViolates(recipe, banned) {
  if (!banned.length) return null;
  const haystack = [
    recipe.title || '',
    recipe.description || '',
    ...(recipe.mainIngredients || []),
    ...(recipe.steps || []),
  ].join(' \n ').toLowerCase();
  for (const tok of banned) {
    // Use boundary-aware match so "and" doesn't match "sandwich" etc.
    const escaped = tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(^|[^a-zæøåA-ZÆØÅ])${escaped}([^a-zæøåA-ZÆØÅ]|$)`, 'i');
    if (re.test(haystack)) return tok;
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in environment' });
  }

  try {
    const { items, preferences } = req.body;

    if (!items?.length) {
      return res.status(400).json({ error: 'No items provided' });
    }

    const itemList = items
      .map(i => `- ${i.n} (${i.pct}% off, now ${i.now} kr, category: ${i.tag})`)
      .join('\n');

    const dietList = preferences.diet || [];
    const banned = bannedTokensFor(dietList);

    const dietRulesBlock = dietList.length
      ? dietList
          .map(d => DIET_RULES[d] ? `- ${d}: ${DIET_RULES[d].rule}` : `- ${d}`)
          .join('\n')
      : '- No dietary restrictions.';

    const timeList = Array.isArray(preferences.cookingTime)
      ? preferences.cookingTime
      : preferences.cookingTime ? [preferences.cookingTime] : ['1 hour'];

    const goalStr = preferences.goals?.length
      ? preferences.goals.join(', ')
      : 'eat well';

    const TIME_GUIDANCE = {
      '15-30 min': "QUICK MEALS: assembly-style dishes, raw or lightly cooked. No braising, no slow-cooking, no oven roasts longer than 20 min, no doughs that need to rise. Think sandwiches, salads, smørrebrød, stir-fries, omelettes, quick pan-fries, no-cook bowls. Total prep+cook ≤ 30 min.",
      '1 hour': "STANDARD MEALS: typical home-cooked dinners. Pastas, risottos, oven-roasted vegetables/proteins, one-pot meals, baked dishes, sautés that simmer. Total prep+cook 30-60 min.",
      '1-2 hours': "SLOW / COMPLEX MEALS: dishes that genuinely benefit from time. Braises, stews, slow roasts, dishes with multiple components, marinated proteins, doughs that need to rest/rise, layered casseroles, reductions. Total prep+cook 60-120 min.",
    };

    let timeRule;
    if (timeList.length === 1) {
      timeRule = `COOKING TIME (HARD CONSTRAINT): ${timeList[0]}.\n${TIME_GUIDANCE[timeList[0]] || TIME_GUIDANCE['1 hour']}\n\nThe "time" field in each recipe MUST reflect that recipe's actual total prep+cook time (e.g. "25 min", "45 min", "1h 30 min") — not just the tier label.`;
    } else {
      const tierBlock = timeList
        .map(t => `- "${t}": ${TIME_GUIDANCE[t] || ''}`)
        .join('\n');
      timeRule =
        `COOKING TIME — ACCEPTABLE TIERS (HARD CONSTRAINT):\n` +
        tierBlock +
        `\n\nEach recipe must fit within ONE of the tiers above. ACROSS the 3 recipes, suggest a MIX spanning the selected tiers — do not put all 3 recipes in the same tier when multiple are listed. The "time" field MUST reflect each recipe's actual total prep+cook time (e.g. "25 min", "45 min", "1h 30 min"), not just the tier label.`;
    }

    const prompt = `You are a creative chef helping reduce food waste in Denmark.

A user is near a supermarket with these discounted items going to waste today:
${itemList}

USER DIETARY RULES (these are HARD CONSTRAINTS — non-negotiable):
${dietRulesBlock}

${timeRule}

Other preferences:
- Goals: ${goalStr}

CRITICAL: The dietary rules above are absolute. If a discounted item violates a rule (e.g. pork is in the discount list but the user is Vegetarian), DO NOT use it and DO NOT mention it. Do NOT suggest a recipe that contains a forbidden ingredient and label it as "alternative" — just pick a different recipe. It is better to suggest fewer recipes or recipes that use only some discounted items + common pantry staples than to break a dietary rule.

Generate 3 recipe ideas that fully comply with the dietary rules. Respond ONLY with valid JSON, no markdown, no explanation. Use this exact structure:
{
  "recipes": [
    {
      "title": "Recipe name",
      "description": "One sentence describing the dish",
      "time": "30 min",
      "difficulty": "Easy",
      "mainIngredients": ["ingredient1", "ingredient2"],
      "tags": ["High protein", "Budget friendly"],
      "steps": [
        "Step 1: a single concrete cooking action, one sentence.",
        "Step 2: ..."
      ]
    }
  ]
}

The "steps" array should contain 4-7 short, actionable cooking instructions in order. Each step is one sentence, no numbering inside the string (the UI numbers them). Reference quantities approximately when useful (e.g. "2 slices", "a handful").`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', err);
      return res.status(response.status).json({ error: 'LLM API error', details: err });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    let parsed;
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
      return res.status(500).json({ error: 'Failed to parse LLM response', raw: text });
    }

    // ── Safety net: drop any recipe that contains a forbidden ingredient ────
    const original = parsed.recipes || [];
    const kept = [];
    const dropped = [];
    for (const r of original) {
      const violation = recipeViolates(r, banned);
      if (violation) {
        dropped.push({ title: r.title, violation });
        console.warn(`[recipes] dropped "${r.title}" — contains "${violation}" (diet=${dietList.join('+')})`);
      } else {
        kept.push(r);
      }
    }

    return res.status(200).json({
      recipes: kept,
      ...(dropped.length ? { droppedCount: dropped.length, droppedReasons: dropped } : {}),
    });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
