import React, { useState } from 'react';
import './ProductFilter.css';

function ProductFilter({ allStores, onFilteredStores, isLoading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Common product keywords in both English and Danish
  const commonProducts = [
    { en: 'bread', da: 'brød' },
    { en: 'milk', da: 'mælk' },
    { en: 'cheese', da: 'ost' },
    { en: 'meat', da: 'kød' },
    { en: 'chicken', da: 'kylling' },
    { en: 'fish', da: 'fisk' },
    { en: 'yogurt', da: 'yoghurt' },
    { en: 'butter', da: 'smør' },
    { en: 'egg', da: 'æg' },
    { en: 'pasta', da: 'pasta' },
    { en: 'rice', da: 'ris' },
    { en: 'pizza', da: 'pizza' },
    { en: 'salad', da: 'salat' },
    { en: 'juice', da: 'juice' },
    { en: 'coffee', da: 'kaffe' },
    { en: 'tea', da: 'te' },
    { en: 'chocolate', da: 'chokolade' },
    { en: 'cake', da: 'kage' },
  ];

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      // No search term - show all stores
      onFilteredStores(allStores, []);
      return;
    }

    const searchLower = searchTerm.toLowerCase().trim();
    
    // Filter stores that have products matching the search term
    const filtered = allStores.filter(store => {
      if (!store.clearances || store.clearances.length === 0) return false;

      // Check if any product matches the search term
      return store.clearances.some(item => {
        const description = item.product.description?.toLowerCase() || '';
        const categoryEn = item.product.categories?.en?.toLowerCase() || '';
        const categoryDa = item.product.categories?.da?.toLowerCase() || '';
        
        // Search in description and categories
        return description.includes(searchLower) || 
               categoryEn.includes(searchLower) || 
               categoryDa.includes(searchLower);
      });
    });

    const newFilters = activeFilters.includes(searchTerm) 
      ? activeFilters 
      : [...activeFilters, searchTerm];
    
    onFilteredStores(filtered, newFilters);
    
    // Add to active filters if not already there
    if (!activeFilters.includes(searchTerm)) {
      setActiveFilters(newFilters);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleQuickFilter = (product) => {
    setSearchTerm(product.en);
    // Immediately filter
    const filtered = allStores.filter(store => {
      if (!store.clearances || store.clearances.length === 0) return false;
      
      return store.clearances.some(item => {
        const description = item.product.description?.toLowerCase() || '';
        const categoryEn = item.product.categories?.en?.toLowerCase() || '';
        const categoryDa = item.product.categories?.da?.toLowerCase() || '';
        
        const enLower = product.en.toLowerCase();
        const daLower = product.da.toLowerCase();
        
        return description.includes(enLower) || 
               description.includes(daLower) ||
               categoryEn.includes(enLower) || 
               categoryDa.includes(daLower);
      });
    });
    
    const newFilters = activeFilters.includes(product.en) 
      ? activeFilters 
      : [...activeFilters, product.en];
    
    onFilteredStores(filtered, newFilters);
    
    if (!activeFilters.includes(product.en)) {
      setActiveFilters(newFilters);
    }
  };

  const removeFilter = (filter) => {
    const newFilters = activeFilters.filter(f => f !== filter);
    setActiveFilters(newFilters);
    
    if (newFilters.length === 0) {
      // No filters left - show all stores
      setSearchTerm('');
      onFilteredStores(allStores, []);
    } else {
      // Re-filter with remaining filters
      const filtered = allStores.filter(store => {
        if (!store.clearances || store.clearances.length === 0) return false;
        
        return store.clearances.some(item => {
          const description = item.product.description?.toLowerCase() || '';
          const categoryEn = item.product.categories?.en?.toLowerCase() || '';
          const categoryDa = item.product.categories?.da?.toLowerCase() || '';
          
          return newFilters.some(filterTerm => {
            const termLower = filterTerm.toLowerCase();
            return description.includes(termLower) || 
                   categoryEn.includes(termLower) || 
                   categoryDa.includes(termLower);
          });
        });
      });
      
      onFilteredStores(filtered, newFilters);
    }
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setActiveFilters([]);
    onFilteredStores(allStores, []);
  };

  return (
    <div className="product-filter">
      <div className="filter-toggle-bar">
        <button 
          className="filter-toggle-button"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? "Hide product filter" : "Show product filter"}
        >
          <span className="toggle-icon">{isExpanded ? '▼' : '▶'}</span>
          <span className="toggle-text">🔍 Filter by Product</span>
          {activeFilters.length > 0 && !isExpanded && (
            <span className="filter-badge">{activeFilters.length}</span>
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="filter-content">
          <div className="filter-header">
            <p>Search for specific products in English or Danish</p>
          </div>

          <div className="filter-search">
            <input
              type="text"
              placeholder="e.g., brød, mælk, ost..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="filter-input"
            />
            <button 
              onClick={handleSearch}
              disabled={isLoading || !searchTerm.trim()}
              className="filter-button"
            >
              Search
            </button>
            {(activeFilters.length > 0 || searchTerm) && (
              <button 
                onClick={clearAllFilters}
                className="clear-button"
              >
                Clear All
              </button>
            )}
          </div>

          {activeFilters.length > 0 && (
            <div className="active-filters">
              <span className="filters-label">Active filters:</span>
              {activeFilters.map((filter, idx) => (
                <span key={idx} className="filter-tag">
                  {filter}
                  <button 
                    onClick={() => removeFilter(filter)}
                    className="remove-filter"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="quick-filters">
            <span className="quick-label">Quick filters:</span>
            <div className="quick-buttons">
              {commonProducts.slice(0, 10).map((product, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickFilter(product)}
                  disabled={isLoading}
                  className="quick-filter-btn"
                  title={`${product.en} / ${product.da}`}
                >
                  {product.en}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductFilter;
