import urllib.request
import json
import math

def deg2num(lat_deg, lon_deg, zoom):
  lat_rad = math.radians(lat_deg)
  n = 2.0 ** zoom
  xtile = int((lon_deg + 180.0) / 360.0 * n)
  ytile = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
  return (xtile, ytile)

try:
    print("Fetching metadata...")
    with urllib.request.urlopen('https://api.rainviewer.com/public/weather-maps.json', timeout=10) as response:
        data = json.loads(response.read().decode())
    
    if 'radar' not in data or 'past' not in data['radar']:
        print("Error: Invalid JSON structure")
        exit(1)
        
    past = data['radar']['past']
    if not past:
        print("Error: No past data")
        exit(1)
        
    last_frame = past[-1]
    ts = last_frame['time']
    last_frame = past[-1]
    ts = last_frame['time']
    host = data.get('host', 'https://tilecache.rainviewer.com') 
    
    print(f"Frame Data: {last_frame}")
    
    # Check Taiwan Tile (Taipei)
    lat = 25.03
    lon = 121.56
    z = 6
    x, y = deg2num(lat, lon, z)
    
    # Try using path from JSON if available
    path = last_frame.get('path', f'/v2/radar/{ts}')
    url = f"{host}{path}/256/{z}/{x}/{y}/6/0_0.png"
    
    print(f"URL: {url}")
    
    # For tiles, fetching content is better to check size
    with urllib.request.urlopen(url, timeout=10) as response:
        content = response.read()
        print(f"Tile Status Code: {response.status}")
        print(f"Tile Content type: {response.headers.get('Content-Type')}")
        print(f"Tile Size: {len(content)} bytes")
        
        if len(content) < 100:
             print("WARNING: Tile is very small (likely empty)")
        else:
             print("SUCCESS: Tile contains data")

except Exception as e:
    print(f"Exception: {e}")
