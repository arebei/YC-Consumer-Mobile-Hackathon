import { color } from '../theme';

/** "#3D7BFF" + 0.45 -> "rgba(61,123,255,0.45)". Falls back to grey for anything unexpected. */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return `rgba(136,136,136,${alpha})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

// Google Maps dark style for Android, where userInterfaceStyle="dark" has no effect.
export const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: color.bgRaised }] },
  { elementType: 'labels.text.fill', stylers: [{ color: color.textFaint }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: color.bg }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: color.elevated }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: color.surface }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: color.border }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: color.bg }] },
];
