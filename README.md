# 🌱 Madspild Map

A web application to help Danmark's residents find nearby food waste offers from Salling Group stores (Føtex, Netto, Bilka).

## Features

- 🗺️ Interactive map centered on Copenhagen but available in all Denmark
- 📍 Real-time food waste offers from local stores
- 🏪 Filter by store type (Føtex, Netto, Bilka)
- 💰 See discounted prices and original prices
- 📱 Responsive design for mobile and desktop

## Tech Stack

- **Frontend**: React + Vite
- **Map**: Leaflet + React Leaflet
- **API**: Salling Group Food Waste API
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Salling Group API key ([get one here](https://developer.sallinggroup.com))

### Installation

1. Clone the repository
```bash
git clone https://github.com/ndrdlc/madspild-map.git
cd madspild-map
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env.local` file and add your API key
```
VITE_SALLING_API_KEY=your_api_key_here
```

4. Start the development server
```bash
npm run dev
```

5. Open http://localhost:3000 in your browser

## Building for Production

```bash
npm run build
npm run preview
```

## Future Improvements

- [ ] Filter by distance from user location
- [ ] Show store opening hours
- [ ] Add favorite stores
- [ ] Push notifications for new offers

## Contributing

Contributions are welcome, please feel free to submit a Pull Request.

## License

MIT

## Acknowledgments

- Food waste data provided by [Salling Group API](https://developer.sallinggroup.com)
- Map tiles from OpenStreetMap
