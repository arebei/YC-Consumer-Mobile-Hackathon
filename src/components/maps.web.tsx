import L from 'leaflet';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Polygon as LeafletPolygon, Polyline as LeafletPolyline, useMap } from 'react-leaflet';

// Web stand-in for react-native-maps, aliased in metro.config.js. Only the pieces the screens
// render inside <LassoMap> (Marker, Polyline, Polygon) exist; they draw onto LassoMap.web's Leaflet map.

type Coordinate = { latitude: number; longitude: number };
type Point = { x: number; y: number };

const toLatLng = (c: Coordinate): [number, number] => [c.latitude, c.longitude];

export function Marker({
  coordinate,
  anchor = { x: 0.5, y: 1 },
  onPress,
  children,
}: {
  coordinate: Coordinate;
  anchor?: Point;
  onPress?: () => void;
  tracksViewChanges?: boolean;
  children?: ReactNode;
}) {
  const map = useMap();
  const [el] = useState(() => document.createElement('div'));
  const [marker] = useState(() =>
    L.marker(toLatLng(coordinate), {
      icon: L.divIcon({ html: el, className: 'lasso-marker', iconSize: [0, 0] }),
      interactive: Boolean(onPress),
      keyboard: false,
    }),
  );

  useEffect(() => {
    marker.addTo(map);
    return () => {
      marker.remove();
    };
  }, [map, marker]);

  useEffect(() => {
    marker.setLatLng(toLatLng(coordinate));
  }, [marker, coordinate.latitude, coordinate.longitude]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!onPress) return;
    marker.on('click', onPress);
    return () => {
      marker.off('click', onPress);
    };
  }, [marker, onPress]);

  el.style.position = 'absolute';
  el.style.width = 'max-content';
  el.style.transform = `translate(${-anchor.x * 100}%, ${-anchor.y * 100}%)`;
  return createPortal(children, el);
}

export function Polyline({
  coordinates,
  strokeColor,
  strokeWidth = 1,
  lineCap,
  lineJoin,
}: {
  coordinates: Coordinate[];
  strokeColor?: string;
  strokeWidth?: number;
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
}) {
  return (
    <LeafletPolyline
      positions={coordinates.map(toLatLng)}
      interactive={false}
      pathOptions={{ color: strokeColor, weight: strokeWidth, opacity: 1, lineCap, lineJoin }}
    />
  );
}

export function Polygon({
  coordinates,
  fillColor,
  strokeColor,
  strokeWidth = 1,
  tappable,
  onPress,
}: {
  coordinates: Coordinate[];
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  tappable?: boolean;
  onPress?: () => void;
}) {
  return (
    <LeafletPolygon
      positions={coordinates.map(toLatLng)}
      interactive={Boolean(tappable)}
      bubblingMouseEvents={false}
      pathOptions={{
        fill: Boolean(fillColor) && fillColor !== 'transparent',
        fillColor,
        fillOpacity: 1,
        color: strokeColor,
        weight: strokeWidth,
        opacity: 1,
      }}
      eventHandlers={onPress ? { click: onPress } : undefined}
    />
  );
}

export default function MapView(): never {
  throw new Error('react-native-maps MapView is not available on web; use LassoMap.');
}
