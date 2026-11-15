import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CircleMarker, MapContainer, Polygon, TileLayer, useMap, useMapEvents } from 'react-leaflet';

import type { Id } from '../../convex/_generated/dataModel';
import type { LatLng } from '../../convex/lib/loop';
import { withAlpha } from '../lib/colors';
import { color } from '../theme';

export type MapCell = {
  cellId: string;
  boundary: LatLng[];
  ownerId: Id<'players'>;
  ownerColor: string;
};

type Props = {
  cells: MapCell[] | undefined;
  myId: Id<'players'> | undefined;
  /** Where to start, and where to follow while `follow` is true. */
  center: LatLng;
  follow: boolean;
  onUserDrag?: () => void;
  onCellPress?: (cellId: string) => void;
  onMapPress?: () => void;
  /** Per-cell fill override (0..1), used by the capture animation. */
  fillOverride?: Record<string, number>;
  /** Fit the camera to these cells once they are on the map (Result screen). */
  fitCellIds?: string[];
  /** Faint outlines of nearby blocks (claimed ones are skipped). */
  grid?: { cellId: string; boundary: LatLng[] }[];
  children?: ReactNode;
};

/** Roughly the same ~600 m view as the native DELTA of 0.006. */
const ZOOM = 16;
const FILL_OTHER = 0.45;
const FILL_MINE = 0.65;
const STROKE_OTHER = 1.5;
const STROKE_MINE = 2.5;
const GRID_STROKE = 1;
const USER_DOT_RADIUS = 7;

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// OSM standard tiles turned into a night map.
const css = `
.lasso-map.leaflet-container { background: ${color.bg}; font-family: inherit; }
.lasso-map .leaflet-tile-pane { filter: invert(1) hue-rotate(180deg) brightness(0.9); }
.lasso-map .leaflet-control-attribution { background: rgba(7,7,10,0.6); color: ${color.textFaint}; font-size: 10px; }
.lasso-map .leaflet-control-attribution a { color: ${color.textMuted}; }
.lasso-map .lasso-marker { background: none; border: none; }
`;

const toLatLng = (p: LatLng): [number, number] => [p.lat, p.lng];

export function LassoMap({
  cells,
  myId,
  center,
  follow,
  onUserDrag,
  onCellPress,
  onMapPress,
  fillOverride,
  fitCellIds,
  grid,
  children,
}: Props) {
  const claimed = useMemo(() => new Set(cells?.map((c) => c.cellId)), [cells]);
  const [initialCenter] = useState(() => toLatLng(center));

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
      <style>{css}</style>
      <MapContainer
        className="lasso-map"
        style={{ position: 'absolute', inset: 0 }}
        center={initialCenter}
        zoom={ZOOM}
        zoomControl={false}
        boxZoom={false}
        keyboard={false}>
        <TileLayer url={TILE_URL} attribution={ATTRIBUTION} maxZoom={19} />
        <Camera center={center} follow={follow} cells={cells} fitCellIds={fitCellIds} onUserDrag={onUserDrag} onMapPress={onMapPress} />
        {grid
          ?.filter((g) => !claimed.has(g.cellId))
          .map((g) => (
            <Polygon
              key={`grid-${g.cellId}`}
              positions={g.boundary.map(toLatLng)}
              interactive={false}
              pathOptions={{ fill: false, color: color.border, weight: GRID_STROKE, opacity: 1 }}
            />
          ))}
        {cells?.map((c) => {
          const mine = c.ownerId === myId;
          const fill = fillOverride?.[c.cellId] ?? (mine ? FILL_MINE : FILL_OTHER);
          return (
            <Polygon
              key={c.cellId}
              positions={c.boundary.map(toLatLng)}
              bubblingMouseEvents={false}
              pathOptions={{
                fillColor: withAlpha(c.ownerColor, fill),
                fillOpacity: 1,
                color: c.ownerColor,
                opacity: 1,
                weight: mine ? STROKE_MINE : STROKE_OTHER,
              }}
              eventHandlers={{ click: () => onCellPress?.(c.cellId) }}
            />
          );
        })}
        <UserDot />
        {children}
      </MapContainer>
    </div>
  );
}

/** Follow, fit-to-cells, drag and tap handling: the parts MapView does through props and its ref. */
function Camera({
  center,
  follow,
  cells,
  fitCellIds,
  onUserDrag,
  onMapPress,
}: Pick<Props, 'center' | 'follow' | 'cells' | 'fitCellIds' | 'onUserDrag' | 'onMapPress'>) {
  const map = useMap();
  const fitted = useRef(false);

  useMapEvents({
    dragstart: () => onUserDrag?.(),
    click: () => onMapPress?.(),
  });

  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);

  useEffect(() => {
    if (!follow) return;
    map.panTo(toLatLng(center), { animate: true, duration: 0.5 });
  }, [map, follow, center.lat, center.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (fitted.current || !fitCellIds?.length || !cells) return;
    const wanted = new Set(fitCellIds);
    const coords = cells.filter((c) => wanted.has(c.cellId)).flatMap((c) => c.boundary.map(toLatLng));
    if (coords.length === 0) return;
    fitted.current = true;
    // Give the map a moment to lay out before fitting.
    setTimeout(
      () => map.fitBounds(L.latLngBounds(coords), { paddingTopLeft: [48, 120], paddingBottomRight: [48, 360], animate: true }),
      300,
    );
  }, [map, cells, fitCellIds]);

  return null;
}

/** The browser's own fix, like showsUserLocation on native: nothing is drawn without one. */
function UserDot() {
  const [fix, setFix] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (p) => setFix([p.coords.latitude, p.coords.longitude]),
      () => setFix(null),
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  if (!fix) return null;
  return (
    <CircleMarker
      center={fix}
      radius={USER_DOT_RADIUS}
      interactive={false}
      pathOptions={{ fillColor: color.info, fillOpacity: 1, color: color.text, weight: 2, opacity: 1 }}
    />
  );
}
