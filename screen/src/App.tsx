import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { CircleMarker, MapContainer, Polygon, TileLayer, Tooltip, useMap } from "react-leaflet";
import { latLngBounds } from "leaflet";
import { api } from "../../convex/_generated/api";

type CellView = NonNullable<ReturnType<typeof useQuery<typeof api.cells.all>>>[number];
type EventView = NonNullable<ReturnType<typeof useQuery<typeof api.events.recent>>>[number];

const FLASH_MS = 600;

function FitOnce({ cells }: { cells: CellView[] | undefined }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !cells || cells.length === 0) return;
    done.current = true;
    map.fitBounds(latLngBounds(cells.flatMap((c) => c.boundary.map((p) => [p.lat, p.lng] as [number, number]))), { padding: [80, 80] });
  }, [cells, map]);
  return null;
}

function useFlashing(cells: CellView[] | undefined) {
  const owners = useRef(new Map<string, string>());
  const [flashing, setFlashing] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!cells) return;
    const changed: string[] = [];
    for (const c of cells) {
      const prev = owners.current.get(c.cellId);
      if (prev !== undefined && prev !== c.ownerId) changed.push(c.cellId);
      owners.current.set(c.cellId, c.ownerId);
    }
    if (changed.length === 0) return;
    setFlashing((s) => new Set([...s, ...changed]));
    const timer = setTimeout(() => {
      setFlashing((s) => {
        const next = new Set(s);
        for (const id of changed) next.delete(id);
        return next;
      });
    }, FLASH_MS);
    return () => clearTimeout(timer);
  }, [cells]);
  return flashing;
}

function eventSentence(e: EventView) {
  const head = `${e.byName} took ${e.cellCount} blocks from ${e.fromName} with a ${e.strength}-block loop`;
  const main = e.byFlag ? `${head}: \u201C${e.byFlag}\u201D` : `${head}.`;
  return e.shopName ? `${main} They now hold ${e.shopName}.` : main;
}

export default function App() {
  const cells = useQuery(api.cells.all);
  const shops = useQuery(api.shops.list);
  const events = useQuery(api.events.recent);
  const flashing = useFlashing(cells);

  const legend = useMemo(() => {
    const byOwner = new Map<string, { name: string; color: string; blocks: number }>();
    for (const c of cells ?? []) {
      const row = byOwner.get(c.ownerId) ?? { name: c.ownerName, color: c.ownerColor, blocks: 0 };
      row.blocks += 1;
      byOwner.set(c.ownerId, row);
    }
    return [...byOwner.entries()].sort((a, b) => b[1].blocks - a[1].blocks).slice(0, 8);
  }, [cells]);

  const loading = cells === undefined || shops === undefined || events === undefined;

  return (
    <div className="screen">
      <MapContainer center={[37.7608, -122.3861]} zoom={17} className="map" attributionControl>
        <TileLayer
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
          attribution="&copy; Stadia Maps &copy; OpenMapTiles &copy; OpenStreetMap contributors"
        />
        <FitOnce cells={cells} />
        {cells?.map((c) => {
          const color = flashing.has(c.cellId) ? "#FFFFFF" : c.ownerColor;
          return (
            <Polygon
              key={c.cellId}
              positions={c.boundary.map((p) => [p.lat, p.lng] as [number, number])}
              pathOptions={{ color, weight: 2, fillColor: color, fillOpacity: 0.5 }}
            />
          );
        })}
        {shops?.map((s) => (
          <CircleMarker
            key={s.shopId}
            center={[s.lat, s.lng]}
            radius={14}
            pathOptions={{ color: "#FFC83D", weight: 4, fillColor: s.holderColor ?? "#15151C", fillOpacity: 0.9 }}
          >
            <Tooltip permanent direction="top" offset={[0, -16]} className="shop-label">
              <div className="shop-name">{s.name}</div>
              <div className="shop-holder">{s.holderName ? `Held by ${s.holderName}` : "Unclaimed"}</div>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>

      <div className="panel title">
        <h1>Lasso</h1>
        <p>Walk a loop. Own the blocks inside it.</p>
      </div>

      {legend.length > 0 && (
        <div className="panel legend">
          {legend.map(([id, p]) => (
            <div key={id} className="legend-row">
              <span className="dot" style={{ background: p.color }} />
              <span className="legend-name">{p.name}</span>
              <span className="legend-count">{p.blocks}</span>
            </div>
          ))}
        </div>
      )}

      {events && events.length > 0 && (
        <div className="panel ticker">
          {events.slice(0, 5).map((e) => (
            <div key={e.eventId} className="ticker-row" style={{ color: e.byFlag ? e.byColor : undefined }}>
              {eventSentence(e)}
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="panel center">Connecting…</div>
      ) : cells.length === 0 ? (
        <div className="panel center">No blocks claimed yet. Walk a loop.</div>
      ) : null}
    </div>
  );
}
