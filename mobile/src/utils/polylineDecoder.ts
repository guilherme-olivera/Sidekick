/**
 * Decodes Google/Strava Encoded Polyline into Lat/Lng coordinates
 */
export function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  if (!encoded) return [];

  const points: { latitude: number; longitude: number }[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
}

/**
 * Converts Lat/Lng points into a scaled SVG path string (d="M...") fitting width & height bounds
 */
export function pointsToSvgPath(
  points: { latitude: number; longitude: number }[],
  width: number = 280,
  height: number = 180,
  padding: number = 20
): string {
  if (!points || points.length === 0) return "";

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const pt of points) {
    if (pt.latitude < minLat) minLat = pt.latitude;
    if (pt.latitude > maxLat) maxLat = pt.latitude;
    if (pt.longitude < minLng) minLng = pt.longitude;
    if (pt.longitude > maxLng) maxLng = pt.longitude;
  }

  const latRange = maxLat - minLat || 0.001;
  const lngRange = maxLng - minLng || 0.001;

  const drawableW = width - padding * 2;
  const drawableH = height - padding * 2;

  const pathParts: string[] = [];

  points.forEach((pt, idx) => {
    // Normalize X (lng) and Y (lat - inverted because SVG Y grows down)
    const x = padding + ((pt.longitude - minLng) / lngRange) * drawableW;
    const y = padding + (1 - (pt.latitude - minLat) / latRange) * drawableH;

    if (idx === 0) {
      pathParts.push(`M ${x.toFixed(1)} ${y.toFixed(1)}`);
    } else {
      pathParts.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
  });

  return pathParts.join(" ");
}
