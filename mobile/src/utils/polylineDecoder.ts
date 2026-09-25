export interface LatLng {
  latitude: number;
  longitude: number;
}

export function decodePolyline(encoded: string): LatLng[] {
  if (!encoded) return [];
  const points: LatLng[] = [];
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
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

export function polylineToSvgPath(
  encodedOrPoints?: string | LatLng[] | null,
  width = 250,
  height = 180,
  padding = 24
): { hasGps: boolean; pathD: string; startPoint: { x: number; y: number }; endPoint: { x: number; y: number } } {
  let points: LatLng[] = [];

  if (typeof encodedOrPoints === "string" && encodedOrPoints.length > 0) {
    points = decodePolyline(encodedOrPoints);
  } else if (Array.isArray(encodedOrPoints) && encodedOrPoints.length > 0) {
    points = encodedOrPoints;
  }

  // If workout has no GPS polyline data, return hasGps: false cleanly!
  if (!points || points.length < 2) {
    return {
      hasGps: false,
      pathD: "",
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 0, y: 0 },
    };
  }

  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const pt of points) {
    if (pt.latitude < minLat) minLat = pt.latitude;
    if (pt.latitude > maxLat) maxLat = pt.latitude;
    if (pt.longitude < minLng) minLng = pt.longitude;
    if (pt.longitude > maxLng) maxLng = pt.longitude;
  }

  const latDelta = (maxLat - minLat) || 0.001;
  const lngDelta = (maxLng - minLng) || 0.001;

  const drawableWidth = width - padding * 2;
  const drawableHeight = height - padding * 2;

  const scale = Math.min(drawableWidth / lngDelta, drawableHeight / latDelta);
  const xOffset = padding + (drawableWidth - lngDelta * scale) / 2;
  const yOffset = padding + (drawableHeight - latDelta * scale) / 2;

  const mappedPoints = points.map(pt => {
    const x = xOffset + (pt.longitude - minLng) * scale;
    const y = height - (yOffset + (pt.latitude - minLat) * scale);
    return { x, y };
  });

  const pathD = mappedPoints.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(" ");

  return {
    hasGps: true,
    pathD,
    startPoint: mappedPoints[0],
    endPoint: mappedPoints[mappedPoints.length - 1],
  };
}
