import React from 'react';
import './StoreModal.css';

function StoreModal({ store, onClose }) {
  if (!store) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{store.store.name}</h2>
            <p className="store-info">
              <strong>{store.store.brand}</strong> • {store.store.address.street}, {store.store.address.zip} {store.store.address.city}
            </p>
            {store.store.distance_km && (
              <p className="distance">📍 {store.store.distance_km.toFixed(2)} km away</p>
            )}
          </div>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <h3>All available offers ({store.clearances.length}):</h3>
          
          <div className="products-grid">
            {store.clearances.map((offer, idx) => (
              <div key={idx} className="product-card">
                {offer.product.image && (
                  <img 
                    src={offer.product.image} 
                    alt={offer.product.description}
                    className="product-image-large"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                )}
                <div className="product-info">
                  <h4>{offer.product.description}</h4>
                  
                  <div className="price-row">
                    <span className="new-price-large">{offer.offer.newPrice} kr</span>
                    <span className="old-price-large">{offer.offer.originalPrice} kr</span>
                    <span className="discount-badge">-{offer.offer.percentDiscount.toFixed(0)}%</span>
                  </div>
                  
                  <div className="product-details">
                    <p>Stock: <strong>
                      {offer.offer.stock < 1 && offer.offer.stock > 0 
                        ? (offer.offer.stock * 1000).toFixed(0) + ' g'
                        : offer.offer.stock % 1 === 0 
                          ? offer.offer.stock + ' ' + offer.offer.stockUnit
                          : offer.offer.stock.toFixed(2) + ' ' + offer.offer.stockUnit}
                    </strong></p>
                    <p className="valid-until">
                      Gyldig til: {new Date(offer.offer.endTime).toLocaleDateString('da-DK', { 
                        day: '2-digit', 
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  
                  {offer.product.categories?.en && (
                    <p className="category">{offer.product.categories.en.split('>').pop()}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StoreModal;
