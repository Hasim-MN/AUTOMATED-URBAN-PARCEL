import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import type { Parcel, Building, Road, GNSSPoint, LayerState } from '@/types';

interface MapViewProps {
  parcels: Parcel[];
  buildings: Building[];
  roads: Road[];
  gnssPoints: GNSSPoint[];
  layers: LayerState;
  selectedParcelId: string | null;
  onSelectParcel: (id: string | null) => void;
  compareMode?: boolean;
  compareSlider?: number;
  basemapMode?: 'satellite' | 'street';
  highlightConflicts?: boolean;
  showGrid?: boolean;
  height?: string;
  searchParcelId?: string | null;
}

const STATUS_COLORS: Record<string, { fill: string; stroke: string }> = {
  verified: { fill: 'rgba(34, 197, 94, 0.25)', stroke: '#16a34a' },
  ai_preliminary: { fill: 'rgba(59, 130, 246, 0.25)', stroke: '#2563eb' },
  requires_review: { fill: 'rgba(245, 158, 11, 0.25)', stroke: '#d97706' },
  field_verification: { fill: 'rgba(239, 68, 68, 0.25)', stroke: '#dc2626' },
  rejected: { fill: 'rgba(107, 114, 128, 0.15)', stroke: '#6b7280' },
};

const EXISTING_COLOR = { fill: 'rgba(107, 114, 128, 0.08)', stroke: '#6b7280' };
const CONFLICT_COLOR = { fill: 'rgba(239, 68, 68, 0.35)', stroke: '#dc2626' };

function pointsToString(points: { x: number; y: number }[]): string {
  return points.map(p => `${p.x},${p.y}`).join(' ');
}

const M = 1000; // coordinate space

export default function MapView({
  parcels,
  buildings,
  roads,
  gnssPoints,
  layers,
  selectedParcelId,
  onSelectParcel,
  compareMode = false,
  compareSlider = 50,
  basemapMode = 'satellite',
  highlightConflicts = false,
  showGrid = true,
  height = '100%',
  searchParcelId = null,
}: MapViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Auto-zoom to search result
  useEffect(() => {
    if (searchParcelId) {
      const p = parcels.find(pp => pp.id === searchParcelId);
      if (p) {
        const cx = p.aiGeometry.reduce((s, pt) => s + pt.x, 0) / p.aiGeometry.length;
        const cy = p.aiGeometry.reduce((s, pt) => s + pt.y, 0) / p.aiGeometry.length;
        setZoom(2.5);
        setPan({ x: 250 - cx * 2.5, y: 250 - cy * 2.5 });
      }
    }
  }, [searchParcelId, parcels]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.5, Math.min(8, z * delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleParcelClick = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectParcel(id);
  }, [onSelectParcel]);

  const handleBgClick = useCallback(() => {
    onSelectParcel(null);
  }, [onSelectParcel]);

  const zoomIn = () => setZoom(z => Math.min(8, z * 1.3));
  const zoomOut = () => setZoom(z => Math.max(0.5, z / 1.3));
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const transform = `translate(${pan.x}, ${pan.y}) scale(${zoom})`;

  // Split parcels for compare mode
  const sliderThreshold = useMemo(() => (compareSlider / 100) * M, [compareSlider]);

  const gridLines = useMemo(() => {
    const lines = [];
    const step = 50;
    for (let i = 0; i <= M; i += step) {
      lines.push({ type: 'h', val: i, major: i % 100 === 0 });
      lines.push({ type: 'v', val: i, major: i % 100 === 0 });
    }
    return lines;
  }, []);

  // Determine which geometry to show for each parcel
  const getParcelGeometry = (parcel: Parcel): { x: number; y: number }[] => {
    if (compareMode) {
      // Left of slider: existing, right of slider: AI
      // We render both and clip
      return parcel.aiGeometry;
    }
    return layers.aiParcelBoundaries ? parcel.aiGeometry : parcel.existingGeometry;
  };

  const isConflict = (p: Parcel) => highlightConflicts && (p.conflictType !== null || p.status === 'field_verification' || p.topologyStatus === 'invalid');

  return (
    <div className="relative w-full overflow-hidden bg-slate-900 rounded-lg" style={{ height }}>
      {/* Satellite/Street basemap background */}
      <div className="absolute inset-0" style={{
        background: basemapMode === 'satellite'
          ? 'radial-gradient(ellipse at 30% 20%, #1e3a2e 0%, #1a2e1f 25%, #1a2419 50%, #202820 75%, #1e2519 100%)'
          : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 50%, #cbd5e1 100%)',
      }} />

      {/* Faint texture for satellite */}
      {basemapMode === 'satellite' && (
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Cdefs%3E%3Cpattern id='n' x='0' y='0' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Ccircle cx='20' cy='20' r='1.5' fill='%23334239' opacity='0.4'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='200' height='200' fill='url(%23n)'/%3E%3C/svg%3E")`,
        }} />
      )}

      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full cursor-grab"
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleBgClick}
        viewBox="0 0 1000 700"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <clipPath id="clipLeft">
            <rect x="0" y="0" width={sliderThreshold} height={M} />
          </clipPath>
          <clipPath id="clipRight">
            <rect x={sliderThreshold} y="0" width={M - sliderThreshold} height={M} />
          </clipPath>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(239,68,68,0.4)" strokeWidth="2" />
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform={transform}>
          {/* Grid */}
          {showGrid && (
            <g opacity={basemapMode === 'satellite' ? 0.15 : 0.3}>
              {gridLines.map((line, i) => (
                line.type === 'h'
                  ? <line key={`gh${i}`} x1={0} y1={line.val} x2={M} y2={line.val} stroke={line.major ? '#64748b' : '#94a3b8'} strokeWidth={line.major ? 0.5 : 0.25} />
                  : <line key={`gv${i}`} x1={line.val} y1={0} x2={line.val} y2={M} stroke={line.major ? '#64748b' : '#94a3b8'} strokeWidth={line.major ? 0.5 : 0.25} />
              ))}
            </g>
          )}

          {/* Roads */}
          {layers.roads && (
            <g>
              {roads.map(road => (
                <line
                  key={road.id}
                  x1={road.path[0].x} y1={road.path[0].y}
                  x2={road.path[1].x} y2={road.path[1].y}
                  stroke={basemapMode === 'satellite' ? '#475569' : '#94a3b8'}
                  strokeWidth={road.width * zoom > 4 ? road.width / 3 : 2}
                  strokeLinecap="round"
                  opacity={0.6}
                />
              ))}
            </g>
          )}

          {/* Existing Cadastral Parcels (gray outlines) */}
          {layers.existingCadastralParcels && !compareMode && (
            <g>
              {parcels.map(p => (
                <polygon
                  key={`ex-${p.id}`}
                  points={pointsToString(p.existingGeometry)}
                  fill={EXISTING_COLOR.fill}
                  stroke={EXISTING_COLOR.stroke}
                  strokeWidth={1 / zoom}
                  strokeDasharray="4 2"
                  opacity={0.6}
                  pointerEvents="none"
                />
              ))}
            </g>
          )}

          {/* Compare Mode: Left side = Existing, Right side = AI */}
          {compareMode && (
            <>
              <g clipPath="url(#clipLeft)">
                {layers.existingCadastralParcels && parcels.map(p => (
                  <polygon
                    key={`cmp-ex-${p.id}`}
                    points={pointsToString(p.existingGeometry)}
                    fill={EXISTING_COLOR.fill}
                    stroke={EXISTING_COLOR.stroke}
                    strokeWidth={1.5 / zoom}
                    strokeDasharray="4 2"
                  />
                ))}
                {layers.buildings && buildings.map(b => (
                  <polygon key={`cmp-ex-b-${b.id}`} points={pointsToString(b.geometry)} fill="rgba(100,116,139,0.3)" stroke="#64748b" strokeWidth={0.5 / zoom} />
                ))}
              </g>
              <g clipPath="url(#clipRight)">
                {layers.aiParcelBoundaries && parcels.map(p => {
                  const colors = isConflict(p) ? CONFLICT_COLOR : STATUS_COLORS[p.status] || STATUS_COLORS.ai_preliminary;
                  return (
                    <polygon
                      key={`cmp-ai-${p.id}`}
                      points={pointsToString(p.aiGeometry)}
                      fill={colors.fill}
                      stroke={colors.stroke}
                      strokeWidth={1.5 / zoom}
                    />
                  );
                })}
                {layers.buildings && buildings.map(b => (
                  <polygon key={`cmp-ai-b-${b.id}`} points={pointsToString(b.geometry)} fill="rgba(168,162,158,0.4)" stroke="#a8a29e" strokeWidth={0.5 / zoom} />
                ))}
              </g>
              {/* Divider line */}
              <line x1={sliderThreshold} y1={0} x2={sliderThreshold} y2={M} stroke="#3b82f6" strokeWidth={2 / zoom} />
              <text x={sliderThreshold + 5} y={20} fill="#93c5fd" fontSize={10 / zoom} fontWeight="bold">EXISTING</text>
              <text x={sliderThreshold - 55} y={20} fill="#93c5fd" fontSize={10 / zoom} fontWeight="bold">AI</text>
            </>
          )}

          {/* AI Parcel Boundaries (normal mode) */}
          {layers.aiParcelBoundaries && !compareMode && (
            <g>
              {parcels.map(p => {
                const geom = p.aiGeometry;
                const colors = isConflict(p) ? CONFLICT_COLOR : STATUS_COLORS[p.status] || STATUS_COLORS.ai_preliminary;
                const isSelected = p.id === selectedParcelId;
                const isHovered = p.id === hoveredId;
                return (
                  <g key={p.id}>
                    {/* Conflict hatch overlay */}
                    {isConflict(p) && (
                      <polygon points={pointsToString(geom)} fill="url(#hatch)" pointerEvents="none" />
                    )}
                    <polygon
                      points={pointsToString(geom)}
                      fill={colors.fill}
                      stroke={isSelected ? '#1e40af' : colors.stroke}
                      strokeWidth={(isSelected ? 2.5 : isHovered ? 1.8 : 1.2) / zoom}
                      style={{ transition: 'stroke-width 0.15s' }}
                      filter={isSelected ? 'url(#glow)' : undefined}
                      onMouseEnter={() => setHoveredId(p.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={(e) => handleParcelClick(p.id, e)}
                      className="cursor-pointer"
                    />
                    {/* Selected parcel label */}
                    {isSelected && (
                      <g pointerEvents="none">
                        <rect x={geom[0].x - 30} y={geom[0].y - 18} width={70} height={14} fill="#1e40af" rx={3} />
                        <text x={geom[0].x + 5} y={geom[0].y - 7} fill="white" fontSize={9 / zoom} textAnchor="middle" fontWeight="bold">{p.id}</text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* Buildings */}
          {layers.buildings && !compareMode && (
            <g pointerEvents="none">
              {buildings.map(b => (
                <polygon
                  key={b.id}
                  points={pointsToString(b.geometry)}
                  fill="rgba(120,113,108,0.5)"
                  stroke="#78716c"
                  strokeWidth={0.6 / zoom}
                />
              ))}
            </g>
          )}

          {/* GNSS/CORS Points */}
          {layers.gnssPoints && (
            <g>
              {gnssPoints.map(pt => {
                const isSelected = pt.parcelId === selectedParcelId;
                return (
                  <g key={pt.id} onClick={(e) => { e.stopPropagation(); onSelectParcel(pt.parcelId); }} className="cursor-pointer">
                    <circle cx={pt.x} cy={pt.y} r={6 / zoom} fill="rgba(34,197,94,0.2)" stroke="#22c55e" strokeWidth={1.5 / zoom} />
                    <circle cx={pt.x} cy={pt.y} r={2.5 / zoom} fill="#22c55e" />
                    {isSelected && (
                      <circle cx={pt.x} cy={pt.y} r={10 / zoom} fill="none" stroke="#22c55e" strokeWidth={2 / zoom} className="animate-ping" />
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* Conflict Areas highlight */}
          {layers.conflictAreas && !compareMode && highlightConflicts && (
            <g pointerEvents="none">
              {parcels.filter(isConflict).map(p => (
                <polygon
                  key={`conf-${p.id}`}
                  points={pointsToString(p.aiGeometry)}
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth={2.5 / zoom}
                  strokeDasharray="6 3"
                />
              ))}
            </g>
          )}
        </g>
      </svg>

      {/* Zoom controls */}
      <div className="absolute right-3 top-3 flex flex-col gap-1.5 z-10">
        <button onClick={zoomIn} className="w-8 h-8 bg-white/90 hover:bg-white shadow-md rounded text-slate-700 font-bold flex items-center justify-center transition-colors">+</button>
        <button onClick={zoomOut} className="w-8 h-8 bg-white/90 hover:bg-white shadow-md rounded text-slate-700 font-bold flex items-center justify-center transition-colors">−</button>
        <button onClick={resetView} className="w-8 h-8 bg-white/90 hover:bg-white shadow-md rounded text-slate-700 flex items-center justify-center transition-colors" title="Reset view">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9" /><path d="M3 4v5h5" /></svg>
        </button>
      </div>

      {/* Legend */}
      <div className="absolute left-3 bottom-3 bg-white/90 backdrop-blur rounded-lg shadow-md p-2.5 z-10 max-w-[200px]">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Legend</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(34,197,94,0.4)', border: '1px solid #16a34a' }} /><span className="text-slate-700">Verified</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(59,130,246,0.4)', border: '1px solid #2563eb' }} /><span className="text-slate-700">AI Preliminary</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(245,158,11,0.4)', border: '1px solid #d97706' }} /><span className="text-slate-700">Requires Review</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(239,68,68,0.4)', border: '1px solid #dc2626' }} /><span className="text-slate-700">Field Verification</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm border border-dashed" style={{ borderColor: '#6b7280', background: 'rgba(107,114,128,0.1)' }} /><span className="text-slate-700">Existing Record</span></div>
        </div>
      </div>

      {/* Coordinates / scale indicator */}
      <div className="absolute right-3 bottom-3 bg-white/90 backdrop-blur rounded-lg shadow-md px-3 py-1.5 z-10">
        <div className="text-[10px] text-slate-500 font-mono">
          ZOOM: {zoom.toFixed(1)}x | 26.9124°N, 75.7873°E
        </div>
      </div>

      {/* Compare slider */}
      {compareMode && (
        <div className="absolute left-1/2 top-3 -translate-x-1/2 z-10 flex items-center gap-3 bg-white/90 backdrop-blur rounded-lg shadow-md px-4 py-2">
          <span className="text-xs font-semibold text-slate-600">Existing</span>
          <input
            type="range"
            min={0}
            max={100}
            value={compareSlider}
            onChange={(e) => {
              const event = new CustomEvent('compare-slider', { detail: Number(e.target.value) });
              window.dispatchEvent(event);
            }}
            className="w-32 accent-blue-600"
          />
          <span className="text-xs font-semibold text-slate-600">AI</span>
        </div>
      )}
    </div>
  );
}
