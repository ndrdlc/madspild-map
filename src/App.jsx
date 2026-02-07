import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';
import LocationSearch from './components/LocationSearch';
import StoreModal from './components/StoreModal';
import ProductFilter from './components/ProductFilter';

// Fix for default marker icons in react-leaflet
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

// Component to save map reference
function MapEvents({ setMapInstance }) {
  const map = useMap();
  
  useEffect(() => {
    setMapInstance(map);
  }, [map, setMapInstance]);
  
  return null;
}

function App() {
  const [foodWasteData, setFoodWasteData] = useState([]);
  const [filteredStores, setFilteredStores] = useState([]);
  const [activeProductFilters, setActiveProductFilters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState([55.6761, 12.5683]); // Copenhagen
  const [mapKey, setMapKey] = useState(0); // Force map re-render when location changes
  const [mapInstance, setMapInstance] = useState(null);
  const [selectedStore, setSelectedStore] = useState(null);

  useEffect(() => {
    // Load initial data - start with a smaller radius
    loadFoodWasteData(55.6761, 12.5683, 10); // 10km radius for initial load
  }, []);

  const loadFoodWasteData = async (lat, lng, radius = 5) => {
    try {
      setLoading(true);
      setError(null);
      
      const apiKey = import.meta.env.VITE_SALLING_API_KEY;
      if (!apiKey) {
        throw new Error('API key not found. Please add VITE_SALLING_API_KEY to .env.local');
      }

      // Round radius to integer - API might not accept decimal values
      const radiusInt = Math.ceil(radius);
      
      const url = `https://api.sallinggroup.com/v1/food-waste/?geo=${lat},${lng}&radius=${radiusInt}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        }
      });
      
      if (response.status === 500) {
        throw new Error(`The search area is too large (${radius.toFixed(1)} km radius). Try zooming in closer or searching a smaller area.`);
      }
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a few minutes and try again.');
      }
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Filter out stores without valid coordinates
      // Note: coordinates are at store.coordinates as [longitude, latitude] array
      const validStores = data.filter(store => {
        return store.store?.coordinates && 
               Array.isArray(store.store.coordinates) &&
               store.store.coordinates.length === 2;
      });

      setFoodWasteData(validStores);
      setFilteredStores(validStores); // Initialize filtered stores with all stores
      
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationChange = (location) => {
    setMapCenter([location.lat, location.lng]);
    setMapKey(prev => prev + 1); // Force map to update
    loadFoodWasteData(location.lat, location.lng, location.radius || 5);
  };

  const handleSearchCurrentArea = () => {
    if (!mapInstance) {
      console.error('Map instance not available');
      return;
    }

    // Get the center of the current map view
    const center = mapInstance.getCenter();
    const bounds = mapInstance.getBounds();
    
    // Calculate distances to all four corners and use the maximum
    const northEast = bounds.getNorthEast();
    const northWest = bounds.getNorthWest();
    const southEast = bounds.getSouthEast();
    const southWest = bounds.getSouthWest();
    
    const distanceNE = center.distanceTo(northEast);
    const distanceNW = center.distanceTo(northWest);
    const distanceSE = center.distanceTo(southEast);
    const distanceSW = center.distanceTo(southWest);
    
    // Use the maximum distance to ensure entire map is covered
    const maxDistanceInMeters = Math.max(distanceNE, distanceNW, distanceSE, distanceSW);
    let radiusInKm = maxDistanceInMeters / 1000;
    
    // Add 20% buffer to ensure coverage at edges
    radiusInKm = radiusInKm * 1.2;
    
    // Cap at 25km - API seems to have issues with larger values
    if (radiusInKm > 25) {
      alert(`The visible area is too large (${radiusInKm.toFixed(1)} km radius needed). Please zoom in closer for better results. Searching with 25km radius instead.`);
      radiusInKm = 25;
    }

    loadFoodWasteData(center.lat, center.lng, radiusInKm);
  };

  const handleFilteredStores = (stores, filters) => {
    setFilteredStores(stores);
    setActiveProductFilters(filters);
  };

  // Helper function to filter products based on active filters
  const filterProducts = (products) => {
    if (activeProductFilters.length === 0) {
      return products;
    }

    return products.filter(item => {
      const description = item.product.description?.toLowerCase() || '';
      const categoryEn = item.product.categories?.en?.toLowerCase() || '';
      const categoryDa = item.product.categories?.da?.toLowerCase() || '';
      
      return activeProductFilters.some(filterTerm => {
        const termLower = filterTerm.toLowerCase();
        return description.includes(termLower) || 
               categoryEn.includes(termLower) || 
               categoryDa.includes(termLower);
      });
    });
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🌱 Madspild Map</h1>
        <p>Find food waste deals near you in Copenhagen</p>
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
        <div className="no-results">No stores found with the selected product. Try a different search term.</div>
      )}
      {!loading && foodWasteData.length === 0 && !error && (
        <div className="no-results">No food waste offers found in this area. Try a different location.</div>
      )}

      <MapContainer
        key={mapKey}
        center={mapCenter}
        zoom={13}
        className="map-container"
      >
        <MapEvents setMapInstance={setMapInstance} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {filteredStores.map((store) => {
          // Coordinates are [longitude, latitude] but Leaflet expects [latitude, longitude]
          const lng = store.store.coordinates[0];
          const lat = store.store.coordinates[1];
          
          // Filter products based on active filters
          const displayProducts = filterProducts(store.clearances || []);
          
          return (
            <Marker
              key={store.store.id}
              position={[lat, lng]}
            >
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
                              <img 
                                src={offer.product.image} 
                                alt={offer.product.description}
                                className="product-image"
                                onError={(e) => e.target.style.display = 'none'}
                              />
                            )}
                            <div className="offer-details">
                              <strong>{offer.product.description}</strong>
                              <div className="price-info">
                                <span className="new-price">{offer.offer.newPrice} kr</span>
                                <span className="old-price">{offer.offer.originalPrice} kr</span>
                                <span className="discount">-{offer.offer.percentDiscount.toFixed(0)}%</span>
                              </div>
                              <div className="stock-info">
                                Stock: {offer.offer.stock} {offer.offer.stockUnit}
                              </div>
                            </div>
                          </div>
                        ))}
                        {displayProducts.length > 5 && (
                          <div className="more-items">
                            <p><em>...and {displayProducts.length - 5} more items</em></p>
                            <button 
                              className="view-all-button"
                              onClick={() => setSelectedStore({ ...store, clearances: displayProducts })}
                            >
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

      {selectedStore && (
        <StoreModal 
          store={selectedStore} 
          onClose={() => setSelectedStore(null)}
        />
      )}
    </div>
  );
}

export default App;
