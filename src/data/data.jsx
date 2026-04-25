// Sample food-waste deals data
// Store names are generic placeholders (not real brands)
const CHAINS = [
  { id: 'all',    label: 'All stores', dot: 'var(--ink)'   },
  { id: 'green',  label: 'Grønbæk',    dot: '#2F7D4F'      },
  { id: 'blue',   label: 'Blåhus',     dot: '#2B5CA8'      },
  { id: 'red',    label: 'Rødkøb',     dot: '#B33A3A'      },
];

// Fake Copenhagen-ish coordinates on our stylized canvas (0–100 grid)
const DEALS = [
  { id: 1,  store:'Grønbæk Nørrebro',   chain:'green', x: 41, y: 38, items: [
      { n:'Rugbrød',                was: 28, now: 9,  tag:'Bakery', best:'Today' },
      { n:'Øko. gulerødder 1kg',    was: 22, now: 7,  tag:'Produce', best:'2 days' },
      { n:'Hakket oksekød 500g',    was: 58, now: 19, tag:'Meat',    best:'Today' },
  ]},
  { id: 2,  store:'Blåhus Vesterbro',    chain:'blue',  x: 34, y: 58, items: [
      { n:'Pasta-salat',            was: 42, now: 14, tag:'Deli',    best:'Today' },
      { n:'Mælk 1L ×4',             was: 44, now: 16, tag:'Dairy',   best:'1 day' },
  ]},
  { id: 3,  store:'Rødkøb City',         chain:'red',   x: 49, y: 52, items: [
      { n:'Laksefilet 300g',        was: 79, now: 29, tag:'Fish',    best:'Today' },
      { n:'Blomkål',                was: 18, now: 5,  tag:'Produce', best:'2 days' },
      { n:'Sushi-bakke',            was: 89, now: 35, tag:'Deli',    best:'Today' },
      { n:'Croissant ×4',           was: 40, now: 12, tag:'Bakery',  best:'Today' },
  ]},
  { id: 4,  store:'Grønbæk Østerbro',    chain:'green', x: 58, y: 32, items: [
      { n:'Æbler 1kg',              was: 25, now: 9,  tag:'Produce', best:'3 days' },
      { n:'Kylling hel',            was: 65, now: 22, tag:'Meat',    best:'1 day' },
  ]},
  { id: 5,  store:'Blåhus Amagerbro',    chain:'blue',  x: 62, y: 70, items: [
      { n:'Skyr 1kg',               was: 32, now: 11, tag:'Dairy',   best:'2 days' },
      { n:'Sandwich',               was: 45, now: 15, tag:'Deli',    best:'Today' },
      { n:'Pizza fryst',            was: 38, now: 14, tag:'Frozen',  best:'30 days' },
  ]},
  { id: 6,  store:'Rødkøb Frederiksberg',chain:'red',   x: 28, y: 48, items: [
      { n:'Kaffebønner 500g',       was: 95, now: 39, tag:'Pantry',  best:'60 days' },
      { n:'Yoghurt 1L',             was: 22, now: 8,  tag:'Dairy',   best:'1 day' },
  ]},
  { id: 7,  store:'Grønbæk Valby',       chain:'green', x: 24, y: 74, items: [
      { n:'Rugbrød',                was: 28, now: 10, tag:'Bakery',  best:'Today' },
      { n:'Banan 1kg',              was: 18, now: 6,  tag:'Produce', best:'3 days' },
  ]},
  { id: 8,  store:'Blåhus Christianshavn',chain:'blue', x: 54, y: 62, items: [
      { n:'Hummus 200g',            was: 19, now: 7,  tag:'Deli',    best:'2 days' },
      { n:'Oliven',                 was: 24, now: 9,  tag:'Deli',    best:'5 days' },
      { n:'Pitabrød ×6',            was: 16, now: 5,  tag:'Bakery',  best:'Today' },
  ]},
  { id: 9,  store:'Rødkøb Nordhavn',     chain:'red',   x: 70, y: 22, items: [
      { n:'Økologisk mel 2kg',      was: 34, now: 12, tag:'Pantry',  best:'90 days' },
      { n:'Tomater',                was: 22, now: 7,  tag:'Produce', best:'2 days' },
  ]},
  { id:10,  store:'Grønbæk Sydhavn',     chain:'green', x: 36, y: 82, items: [
      { n:'Salat-blanding',         was: 28, now: 10, tag:'Produce', best:'1 day' },
      { n:'Citroner',               was: 16, now: 6,  tag:'Produce', best:'4 days' },
  ]},
];

// "You are here" marker on the canvas
const ME = { x: 45, y: 50 };

// Simple distance calc on the stylized canvas, ~1 canvas unit = 120m for display
const dist = (a, b) => {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx*dx + dy*dy);
};

const fmtKm = (d) => {
  const km = d * 0.12; // 1 unit = 120m
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
};

export { CHAINS, DEALS, ME, dist, fmtKm };
