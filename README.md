# 🌱 Madspild Map

A web app that helps people in Denmark rescue food before it goes to waste — surfacing discounted clearance items from Salling Group stores (Føtex, Netto, Bilka) and turning them into recipes you can actually cook.

## Features

### Discovering deals
- 🗺️ Interactive Leaflet map centered on Copenhagen, with coverage anywhere in Denmark
- 📍 Real-time food-waste clearances from nearby stores via the Salling Group API
- 🔍 Search by store name, product, zip code, or address (Danish zip lookup includes Copenhagen-specific neighbourhood names like Christianshavn, Nørrebro, Vesterbro) or by using "My location"
- 🏪 Filter by chain (Føtex, Netto, Bilka)
- ⏱️ Items inside a store are sorted by soonest-to-expire first, so what truly needs rescuing reads at the top
- ❤️ Save stores for later
- 💰 Total potential savings and a rough CO₂ estimate per area, with inline disclosure tooltips explaining what's measured vs. estimated

### AI-powered recipe ideas (Claude Haiku)
- 🍳 Generates 3 recipe ideas for either *all nearby deals* or *a single store's items* — your pick
- 🥗 Personalised by:
  - Dietary preferences (Vegetarian, Vegan, Gluten-free, Dairy-free)
  - Cooking time tiers (15–30 min, 1 hour, 1–2 hours) — multi-select; tier semantics nudge the model toward genuinely different dishes (assembly vs. simmer vs. braise)
  - Goals (Save money, Eat healthier, Reduce waste, Try new foods)
- 📋 Each recipe includes title, time, difficulty, main ingredients, tags, and an expandable step-by-step procedure
- 🔗 Ingredients link back to the specific store carrying them (with distance + price), or are flagged as *pantry items* when they're not in the nearby deals
- 💾 In-memory cache per (deals × preferences) so re-opening the panel doesn't trigger another LLM call

### Mobile UX
- 📱 Dedicated mobile feed view
- 🗺️ "View map" button to switch to the full map

## Tech Stack

- **Frontend**: React 18 + Vite
- **Map**: Leaflet + React Leaflet
- **AI**: Anthropic Claude Haiku 4.5 (via `/api/recipes` serverless function)
- **APIs**: Salling Group Food Waste API, OpenStreetMap Nominatim (geocoding)
- **Deployment**: Vercel (serverless functions for `/api/*` routes)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Salling Group API key — [request one here](https://developer.sallinggroup.com)
- Anthropic API key for the recipe feature — [console.anthropic.com](https://console.anthropic.com)
- [Vercel CLI](https://vercel.com/docs/cli) if you want to run the serverless functions locally

### Installation

```bash
git clone https://github.com/ndrdlc/madspild-map.git
cd madspild-map
npm install
```

### Environment variables

This project uses two server-side keys. Add them to your Vercel project (under **Settings → Environment Variables** for all of *Development*, *Preview*, and *Production*):

| Key | Used by |
|---|---|
| `SALLING_API_KEY` | `/api/food-waste` — proxies the Salling Group request so the key never reaches the browser |
| `ANTHROPIC_API_KEY` | `/api/recipes` — calls Claude Haiku for recipe suggestions |

For local development, either pull them down with `vercel env pull .env.local` or paste them into `.env.local` manually. See `.env.example` for the format.

### Running locally

The app has two halves: the Vite frontend (`npm run dev`) and the Vercel serverless functions (`/api/*`). For the full experience including AI recipes, run them together with the Vercel CLI:

```bash
vercel link        # one-time, links this folder to a Vercel project
vercel dev         # starts both the Vite dev server and /api/* routes
```

Open the URL it prints (usually <http://localhost:3000>).

If you only need the map view and don't care about live recipes, plain Vite works too:

```bash
npm run dev
```

…but the **🍳 Recipe ideas** button will return a "Recipe API not found" error because `/api/recipes` isn't served. The browser also needs a `VITE_SALLING_API_KEY` in `.env.local` in that case so it can call Salling directly without the serverless proxy.

## Building for Production

```bash
npm run build
npm run preview
```

`vercel --prod` deploys the built site plus the serverless functions in one step.

## Project Structure

```
api/
  food-waste.js          # Salling Group clearances proxy
  recipes.js             # Anthropic Claude recipe generator
src/
  App.jsx                # Top-level app, switches between mobile feed and desktop rail+map
  components/
    Map.jsx              # Leaflet wrapper
    UI.jsx               # LeftRail, DetailCard, TodayBadge
    Preferences.jsx      # Onboarding sheet (diet, cooking time, goals, location)
    RecipePanel.jsx      # Recipe ideas overlay (desktop side panel + mobile full-screen)
    MobileFeed.jsx       # Mobile-only feed: brand bar, impact card, deals carousel, recipes
  hooks/
    usePreferences.js    # localStorage-backed user preferences
    useRecipes.js        # Cached LLM call + ingredient-to-store matcher
  utils/
    geo.js               # Nominatim geocoding + Danish zip-to-neighbourhood table
```

## Future Improvements

- [ ] Show store opening hours
- [ ] Recipe image generation
- [ ] Multi-language support (Danish UI strings)

## Contributing

Contributions are welcome — please open a Pull Request. For larger features, open an issue first to discuss the approach.

## License

MIT

## Acknowledgments

- Food-waste data from the [Salling Group API](https://developer.sallinggroup.com)
- Map tiles from [OpenStreetMap](https://www.openstreetmap.org)
- Geocoding from [Nominatim](https://nominatim.openstreetmap.org)
- AI recipes powered by [Anthropic Claude](https://www.anthropic.com)
