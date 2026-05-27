// Picks the most specific area label we can from a Nominatim address object.
// Prefers neighbourhood/suburb/quarter, then combines with the city when both
// exist — e.g. "Nørrebro, Copenhagen". Returns null if nothing usable is found.
export function formatArea(addr) {
  if (!addr) return null;
  const neighbourhood =
    addr.neighbourhood ||
    addr.suburb ||
    addr.quarter ||
    addr.city_district ||
    null;
  const city = (
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    ''
  ).replace(/\s*Kommune$/i, '').trim() || null;

  if (neighbourhood && city && neighbourhood.toLowerCase() !== city.toLowerCase()) {
    return `${neighbourhood}, ${city}`;
  }
  return neighbourhood || city || null;
}

// Canonical Danish zip → neighbourhood map. OSM's "suburb"/"neighbourhood"
// tags around Copenhagen are inconsistent (e.g. 1428 reverse-geocodes to
// "Amagerbro" even though postally it's Christianshavn), so we use this
// authoritative table first and only fall back to OSM data for unknown zips.
// Source: Danish post (PostNord) zip-to-district mapping.
function lookupDanishZip(zip) {
  const n = parseInt(zip, 10);
  if (Number.isNaN(n)) return null;

  // Greater Copenhagen districts
  if (n >= 1000 && n <= 1373) return { area: 'Indre By', city: 'Copenhagen' };
  if (n >= 1400 && n <= 1499) return { area: 'Christianshavn', city: 'Copenhagen' };
  if (n >= 1500 && n <= 1799) return { area: 'Vesterbro', city: 'Copenhagen' };
  if (n >= 1800 && n <= 1999) return { area: null, city: 'Frederiksberg' };
  if (n === 2100) return { area: 'Østerbro', city: 'Copenhagen' };
  if (n === 2150) return { area: 'Nordhavn', city: 'Copenhagen' };
  if (n === 2200) return { area: 'Nørrebro', city: 'Copenhagen' };
  if (n === 2300) return { area: 'Amager', city: 'Copenhagen' };
  if (n === 2400) return { area: 'Nordvest', city: 'Copenhagen' };
  if (n === 2450) return { area: 'Sydhavnen', city: 'Copenhagen' };
  if (n === 2500) return { area: 'Valby', city: 'Copenhagen' };
  if (n === 2700) return { area: 'Brønshøj', city: 'Copenhagen' };
  if (n === 2720) return { area: 'Vanløse', city: 'Copenhagen' };

  return null;
}

function formatZipArea(zip) {
  const r = lookupDanishZip(zip);
  if (!r) return null;
  return r.area ? `${r.area}, ${r.city}` : r.city;
}

// Reverse-geocode coordinates → area string (or null on failure).
export async function reverseGeocodeArea(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return formatArea(data?.address);
  } catch {
    return null;
  }
}

// Forward-geocode user input (zip code or address) within Denmark, returning
// { lat, lng, city, query } or null if not found. For zip queries we also do
// a reverse lookup on the resolved point — Nominatim's zip endpoint usually
// returns only "København", but reverse-geocoding the centre gives us the
// neighbourhood (e.g. "Nørrebro, Copenhagen").
export async function geocodeInput(input) {
  const q = input.trim();
  if (!q) return null;

  const isZip = /^\d{4}$/.test(q);
  const url = isZip
    ? `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(q)}&country=Denmark&format=json&limit=1&addressdetails=1`
    : `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)},Denmark&format=json&limit=1&addressdetails=1`;

  let res;
  try {
    res = await fetch(url);
  } catch {
    return null;
  }
  const data = await res.json();
  if (!data?.length) return null;

  const lat = parseFloat(data[0].lat);
  const lng = parseFloat(data[0].lon);
  const forwardArea = formatArea(data[0].address);

  let area = forwardArea;
  if (isZip) {
    // Authoritative Danish zip → district table first; OSM's suburb tags
    // around Copenhagen are inconsistent.
    const tableArea = formatZipArea(q);
    if (tableArea) {
      area = tableArea;
    } else {
      // Fallback for zips outside our table: reverse-geocode the centre and
      // prefer a result that includes both neighbourhood and city.
      const reverseArea = await reverseGeocodeArea(lat, lng);
      if (reverseArea && reverseArea.includes(',') && !forwardArea?.includes(',')) {
        area = reverseArea;
      } else if (!forwardArea && reverseArea) {
        area = reverseArea;
      }
    }
  }

  return { lat, lng, city: area, query: q };
}
