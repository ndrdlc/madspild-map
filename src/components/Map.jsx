import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const CHAIN_COLORS = {
  green: '#2F7D4F',
  red:   '#B33A3A',
  blue:  '#2B5CA8',
  ink:   '#857E6F',
};

function createPinIcon(chain, sel, hov) {
  const color = CHAIN_COLORS[chain] || CHAIN_COLORS.ink;
  const size  = sel ? 22 : hov ? 18 : 14;
  const bw    = sel ? 4 : 3;
  const ring  = sel
    ? `0 0 0 5px ${color}33, 0 2px 10px rgba(0,0,0,0.28)`
    : '0 1px 4px rgba(0,0,0,0.22)';
  return L.divIcon({
    className: 'mm-pin',
    html: `<div style="
      width:${size}px;height:${size}px;
      border-radius:50%;
      background:${color};
      border:${bw}px solid #F3EEE4;
      box-shadow:${ring};
      cursor:pointer;
      transition:all .15s ease;
    "></div>`,
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function Inner({ deals, selectedId, hoveredId, onSelect, onHover, onMapReady }) {
  const map = useMap();
  useEffect(() => { onMapReady(map); }, [map, onMapReady]);

  return deals.map(d => (
    <Marker
      key={d.id}
      position={[d.lat, d.lng]}
      icon={createPinIcon(d.chain, d.id === selectedId, d.id === hoveredId)}
      eventHandlers={{
        click:     () => onSelect(d.id),
        mouseover: () => onHover(d.id),
        mouseout:  () => onHover(null),
      }}
    />
  ));
}

export default function MapCanvas({ deals, selectedId, hoveredId, onSelect, onHover, onMapReady, center }) {
  // MapContainer's `center` prop is only honoured on the first mount; once the
  // map exists, panning happens via mapRef.setView() in the parent. So this
  // value is the *initial* position when the map first renders.
  const initialCenter = center && center.lat != null && center.lng != null
    ? [center.lat, center.lng]
    : [55.6761, 12.5683];

  return (
    <MapContainer
      center={initialCenter}
      zoom={14}
      style={{ height: '100%', width: '100%' }}
      zoomControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Inner
        deals={deals}
        selectedId={selectedId}
        hoveredId={hoveredId}
        onSelect={onSelect}
        onHover={onHover}
        onMapReady={onMapReady}
      />
    </MapContainer>
  );
}
