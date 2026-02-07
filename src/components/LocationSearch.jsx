import React, { useState } from 'react';
import './LocationSearch.css';

function LocationSearch({ onLocationChange, onSearchCurrentArea, isLoading }) {
  const [searchInput, setSearchInput] = useState('');
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');

    if (!searchInput.trim()) {
      setError('Please enter a zip code or address');
      return;
    }

    try {
      // Check if input is a Danish zip code (4 digits)
      const zipCodePattern = /^\d{4}$/;
      
      if (zipCodePattern.test(searchInput.trim())) {
        // It's a zip code - search for it in Denmark
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?postalcode=${searchInput.trim()}&country=Denmark&format=json&limit=1`
        );
        const data = await response.json();

        if (data && data.length > 0) {
          const location = {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            displayName: data[0].display_name
          };
          onLocationChange(location);
        } else {
          setError('Zip code not found. Try a Copenhagen area code (e.g., 2200, 1050)');
        }
      } else {
        // It's an address - geocode it
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchInput)},Denmark&format=json&limit=1`
        );
        const data = await response.json();

        if (data && data.length > 0) {
          const location = {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            displayName: data[0].display_name
          };
          onLocationChange(location);
        } else {
          setError('Address not found. Try adding "Copenhagen" to your search');
        }
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      setError('Failed to find location. Please try again.');
    }
  };

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            displayName: 'Your location'
          };
          onLocationChange(location);
          setError('');
        },
        (err) => {
          setError('Could not get your location. Please enter a zip code or address.');
        }
      );
    } else {
      setError('Geolocation is not supported by your browser');
    }
  };

  return (
    <div className="location-search">
      <form onSubmit={handleSearch} className="search-form">
        <div className="search-input-group">
          <input
            type="text"
            placeholder="Enter zip code (e.g., 2200) or address..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            disabled={isLoading}
            className="search-input"
          />
          <button 
            type="submit" 
            disabled={isLoading}
            className="search-button"
          >
            🔍 Search
          </button>
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={isLoading}
            className="location-button"
            title="Use my current location"
          >
            📍 My Location
          </button>
          <button
            type="button"
            onClick={onSearchCurrentArea}
            disabled={isLoading}
            className="area-button"
            title="Search in the current map view"
          >
            🗺️ Search this area
          </button>
        </div>
      </form>
      {error && <div className="search-error">{error}</div>}
    </div>
  );
}

export default LocationSearch;
