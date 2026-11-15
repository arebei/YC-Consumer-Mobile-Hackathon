import { useEffect, useRef, type ReactNode } from 'react';
import { Platform, StyleSheet } from 'react-native';
import MapView, { Polygon, type MapPressEvent } from 'react-native-maps';

import type { Id } from '../../convex/_generated/dataModel';
import type { LatLng } from '../../convex/lib/loop';
import { darkMapStyle, withAlpha } from '../lib/colors';

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
  children?: ReactNode;
};

/** Delta for roughly a 600 m view: enough to see a whole loop. */
const DELTA = 0.006;
const FILL_OTHER = 0.45;
const FILL_MINE = 0.65;
const STROKE_OTHER = 1.5;
const STROKE_MINE = 2.5;

const toCoord = (p: LatLng) => ({ latitude: p.lat, longitude: p.lng });

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
  children,
}: Props) {
  const ref = useRef<MapView>(null);
  const cellPressedAt = useRef(0);
  const fitted = useRef(false);

  useEffect(() => {
    if (!follow) return;
    ref.current?.animateCamera({ center: toCoord(center) }, { duration: 500 });
  }, [follow, center.lat, center.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (fitted.current || !fitCellIds?.length || !cells) return;
    const wanted = new Set(fitCellIds);
    const coords = cells.filter((c) => wanted.has(c.cellId)).flatMap((c) => c.boundary.map(toCoord));
    if (coords.length === 0) return;
    fitted.current = true;
    const pad = { top: 120, right: 48, bottom: 360, left: 48 };
    // Give the map a moment to lay out before fitting.
    setTimeout(() => ref.current?.fitToCoordinates(coords, { edgePadding: pad, animated: true }), 300);
  }, [cells, fitCellIds]);

  const handleMapPress = (_e: MapPressEvent) => {
    // On iOS a polygon tap also reaches the map; ignore that echo.
    if (Date.now() - cellPressedAt.current < 400) return;
    onMapPress?.();
  };

  return (
    <MapView
      ref={ref}
      style={StyleSheet.absoluteFill}
      initialRegion={{ ...toCoord(center), latitudeDelta: DELTA, longitudeDelta: DELTA }}
      userInterfaceStyle="dark"
      customMapStyle={Platform.OS === 'android' ? darkMapStyle : undefined}
      showsUserLocation
      showsMyLocationButton={false}
      showsCompass={false}
      toolbarEnabled={false}
      pitchEnabled={false}
      rotateEnabled={false}
      onPanDrag={onUserDrag}
      onPress={handleMapPress}>
      {cells?.map((c) => {
        const mine = c.ownerId === myId;
        const fill = fillOverride?.[c.cellId] ?? (mine ? FILL_MINE : FILL_OTHER);
        return (
          <Polygon
            key={c.cellId}
            coordinates={c.boundary.map(toCoord)}
            fillColor={withAlpha(c.ownerColor, fill)}
            strokeColor={c.ownerColor}
            strokeWidth={mine ? STROKE_MINE : STROKE_OTHER}
            tappable
            onPress={() => {
              cellPressedAt.current = Date.now();
              onCellPress?.(c.cellId);
            }}
          />
        );
      })}
      {children}
    </MapView>
  );
}
