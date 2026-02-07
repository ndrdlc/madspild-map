export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const API_KEY = process.env.VITE_SALLING_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    // Copenhagen coordinates with 5km radius
    const lat = 55.6761;
    const lng = 12.5683;
    const radius = 5; // 5km
    
    const response = await fetch(
      `https://api.sallinggroup.com/v1/food-waste/?geo=${lat},${lng}&radius=${radius}`,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Salling API error: ${response.status}`);
    }

    const data = await response.json();
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching food waste data:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch food waste data',
      message: error.message 
    });
  }
}
