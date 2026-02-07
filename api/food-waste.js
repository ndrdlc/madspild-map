export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { lat, lng, radius } = req.query;

    if (!lat || !lng || !radius) {
      return res.status(400).json({ 
        error: 'Missing required parameters: lat, lng, radius' 
      });
    }

    const apiKey = process.env.VITE_SALLING_API_KEY;

    if (!apiKey) {
      console.error('API key not found in environment variables');
      return res.status(500).json({ 
        error: 'Server configuration error' 
      });
    }

    const apiUrl = `https://api.sallinggroup.com/v1/food-waste/?geo=${lat},${lng}&radius=${radius}`;
    
    console.log('Fetching from Salling API:', apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Salling API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: `API error: ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}