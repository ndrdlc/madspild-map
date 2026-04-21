import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';
import LocationSearch from './components/LocationSearch';
import StoreModal from './components/StoreModal';
import ProductFilter from './components/ProductFilter';
import { Analytics } from "@vercel/analytics/react"

import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

function MapEvents({ setMapInstance }) {
  const map = useMap();
  useEffect(() => { setMapInstance(map); }, [map, setMapInstance]);
  return null;
}

export default function LeafletApp() {
  const [foodWasteData, setFoodWasteData] = useState([]);
  const [filteredStores, setFilteredStores] = useState([]);
  const [activeProductFilters, setActiveProductFilters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState([55.6761, 12.5683]);
  const [mapKey, setMapKey] = useState(0);
  const [mapInstance, setMapInstance] = useState(null);
  const [selectedStore, setSelectedStore] = useState(null);

  useEffect(() => {
    loadFoodWasteData(55.6761, 12.5683, 10);
  }, []);

  const loadFoodWasteData = async (lat, lng, radius = 5) => {
    try {
      setLoading(true);
      setError(null);
      const radiusInt = Math.ceil(radius);
      const proxyUrl = `/api/food-waste?lat=${lat}&lng=${lng}&radius=${radiusInt}`;
      let response = await fetch(proxyUrl);
      const proxyContentType = response.headers.get('content-type') || '';
      const proxyLooksLikeJson = proxyContentType.includes('application/json');

      if (!response.ok || !proxyLooksLikeJson) {
        const apiKey = import.meta.env.VITE_SALLING_API_KEY;
        if (!apiKey) {
          const text = await response.text();
          throw new Error(
            `API proxy returned an invalid response (${response.status}). ` +
              `Got content-type "${proxyContentType}". ` +
              `Response starts with: ${JSON.stringify(text.slice(0, 40))}`
          );
        }
        const directUrl = `https://api.sallinggroup.com/v1/food-waste/?geo=${lat},${lng}&radius=${radiusInt}`;
        response = await fetch(directUrl, { headers: { Authorization: `Bearer ${apiKey}` } });
      }

      if (response.status === 500) throw new Error(`The search area is too large (${radius.toFixed(1)} km radius). Try zooming in closer.`);
      if (response.status === 429) throw new Error('Rate limit exceeded. Please wait a few minutes and try again.');
      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      const validStores = data.filter(store =>
        store.store?.coordinates &&
        Array.isArray(store.store.coordinates) &&
        store.store.coordinates.length === 2
      );
      setFoodWasteData(validStores);
      setFilteredStores(validStores);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationChange = (location) => {
    setMapCenter([location.lat, location.lng]);
    setMapKey(prev => prev + 1);
    loadFoodWasteData(location.lat, location.lng, location.radius || 5);
  };

  const handleSearchCurrentArea = () => {
    if (!mapInstance) return;
    const center = mapInstance.getCenter();
    const bounds = mapInstance.getBounds();
    const corners = [bounds.getNorthEast(), bounds.getNorthWest(), bounds.getSouthEast(), bounds.getSouthWest()];
    const maxDist = Math.max(...corners.map(c => center.distanceTo(c)));
    let radiusInKm = (maxDist / 1000) * 1.2;
    if (radiusInKm > 25) {
      alert(`Area too large. Searching with 25km radius instead.`);
      radiusInKm = 25;
    }
    loadFoodWasteData(center.lat, center.lng, radiusInKm);
  };

  const handleFilteredStores = (stores, filters) => {
    setFilteredStores(stores);
    setActiveProductFilters(filters);
  };

  const filterProducts = (products) => {
    if (activeProductFilters.length === 0) return products;
    return products.filter(item => {
      const description = item.product.description?.toLowerCase() || '';
      const categoryEn = item.product.categories?.en?.toLowerCase() || '';
      const categoryDa = item.product.categories?.da?.toLowerCase() || '';
      return activeProductFilters.some(filterTerm => {
        const t = filterTerm.toLowerCase();
        return description.includes(t) || categoryEn.includes(t) || categoryDa.includes(t);
      });
    });
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🌱 Madspild Map</h1>
        <p>Find food waste deals near you</p>
      </header>

      <LocationSearch
        onLocationChange={handleLocationChange}
        onSearchCurrentArea={handleSearchCurrentArea}
        isLoading={loading}
      />

      <ProductFilter
        allStores={foodWasteData}
        onFilteredStores={handleFilteredStores}
        isLoading={loading}
      />

      {loading && <div className="loading">Loading food waste offers...</div>}
      {error && <div className="error">Error: {error}</div>}
      {!loading && filteredStores.length === 0 && foodWasteData.length > 0 && (
        <div className="no-results">No stores found with the selected product.</div>
      )}
      {!loading && foodWasteData.length === 0 && !error && (
        <div className="no-results">No food waste offers found in this area.</div>
      )}

      <MapContainer key={mapKey} center={mapCenter} zoom={13} className="map-container">
        <MapEvents setMapInstance={setMapInstance} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {filteredStores.map((store) => {
          const lng = store.store.coordinates[0];
          const lat = store.store.coordinates[1];
          const displayProducts = filterProducts(store.clearances || []);
          return (
            <Marker key={store.store.id} position={[lat, lng]}>
              <Popup maxWidth={400} maxHeight={500}>
                <div className="popup-content">
                  <h3>{store.store.name}</h3>
                  <p><strong>{store.store.brand}</strong></p>
                  <p>{store.store.address.street}</p>
                  <p>{store.store.address.zip} {store.store.address.city}</p>
                  {store.store.distance_km && (
                    <p className="distance">📍 {store.store.distance_km.toFixed(2)} km away</p>
                  )}
                  {displayProducts && displayProducts.length > 0 && (
                    <div className="offers">
                      <strong>Available offers ({displayProducts.length}):</strong>
                      <div className="offers-list">
                        {displayProducts.slice(0, 5).map((offer, idx) => (
                          <div key={idx} className="offer-item">
                            {offer.product.image && (
                              <img src={offer.product.image} alt={offer.product.description}
                                className="product-image" onError={(e) => e.target.style.display = 'none'} />
                            )}
                            <div className="offer-details">
                              <strong>{offer.product.description}</strong>
                              <div className="price-info">
                                <span className="new-price">{offer.offer.newPrice} kr</span>
                                <span className="old-price">{offer.offer.originalPrice} kr</span>
                                <span className="discount">-{offer.offer.percentDiscount.toFixed(0)}%</span>
                              </div>
                              <div className="stock-info">Stock: {offer.offer.stock} {offer.offer.stockUnit}</div>
                            </div>
                          </div>
                        ))}
                        {displayProducts.length > 5 && (
                          <div className="more-items">
                            <p><em>...and {displayProducts.length - 5} more items</em></p>
                            <button className="view-all-button"
                              onClick={() => setSelectedStore({ ...store, clearances: displayProducts })}>
                              View all {displayProducts.length} items
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {selectedStore && <StoreModal store={selectedStore} onClose={() => setSelectedStore(null)} />}
      <Analytics />

      <footer className="footer">
        <div className="footer-content">
          <p>This project is completely open source - feel free to help us improve!</p>
          <a href="https://github.com/ndrdlc/madspild-map" target="_blank" rel="noopener noreferrer" className="github-link">
            <svg className="github-icon" viewBox="0 0 16 16" width="20" height="20">
              <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
            </svg>
            <span>Contribute on GitHub</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
