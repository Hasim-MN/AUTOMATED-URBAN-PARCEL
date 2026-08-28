import { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import MapView from '@/components/MapView';
import { Button, StatusBadge, PriorityBadge, ConfidenceBar, AIDisclaimer } from '@/components/UI';
import type { LayerState } from '@/types';
import {
  Layers, Map as MapIcon, Building2, Route, Mountain, Ruler,
  AlertTriangle, Eye, EyeOff, GitCompare, Pencil, Check, X,
  MapPin, Crosshair, Maximize2,
} from 'lucide-react';

const LAYER_CONFIG: { key: keyof LayerState; label: string; icon: typeof Layers; group: string }[] = [
  { key: 'satelliteImagery', label: 'Satellite Imagery', icon: MapIcon, group: 'Base Layers' },
  { key: 'streetMap', label: 'Street Map', icon: MapIcon, group: 'Base Layers' },
  { key: 'aiParcelBoundaries', label: 'AI Parcel Boundaries', icon: Layers, group: 'Survey Layers' },
  { key: 'existingCadastralParcels', label: 'Existing Cadastral Parcels', icon: MapIcon, group: 'Survey Layers' },
  { key: 'buildings', label: 'Buildings', icon: Building2, group: 'Survey Layers' },
  { key: 'roads', label: 'Roads', icon: Route, group: 'Survey Layers' },
  { key: 'dsm', label: 'DSM', icon: Mountain, group: 'Survey Layers' },
  { key: 'dtm', label: 'DTM', icon: Mountain, group: 'Survey Layers' },
  { key: 'gnssPoints', label: 'GNSS/CORS Points', icon: Crosshair, group: 'Survey Layers' },
  { key: 'conflictAreas', label: 'Conflict Areas', icon: AlertTriangle, group: 'Survey Layers' },
];

export default function WebGIS() {
  const {
    parcels, buildings, roads, gnssPoints, layers, toggleLayer,
    selectedParcelId, setSelectedParcelId, compareMode, setCompareMode,
    compareSlider, setCompareSlider, basemapMode, setBasemapMode,
    acceptAIBoundary, rejectParcel, requestFieldVerification, repairTopology,
    settings, setCurrentPage,
  } = useApp();

  const [showLayerPanel, setShowLayerPanel] = useState(true);
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Listen for compare slider events from MapView
  useEffect(() => {
    const handler = (e: Event) => setCompareSlider((e as CustomEvent<number>).detail);
    window.addEventListener('compare-slider', handler);
    return () => window.removeEventListener('compare-slider', handler);
  }, [setCompareSlider]);

  const selectedParcel = parcels.find(p => p.id === selectedParcelId);

  const filteredParcels = useMemo(() => {
    if (filterStatus === 'all') return parcels;
    if (filterStatus === 'conflicts') return parcels.filter(p => p.conflictType !== null || p.topologyStatus === 'invalid');
    if (filterStatus === 'field') return parcels.filter(p => p.status === 'field_verification');
    return parcels.filter(p => p.status === filterStatus);
  }, [parcels, filterStatus]);

  const layerGroups = ['Base Layers', 'Survey Layers'];

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Left: Layer/Control Panel */}
      {showLayerPanel && (
        <div className="w-64 bg-white border-r border-slate-200 flex flex-col overflow-hidden flex-shrink-0">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-600" />
              <span className="font-bold text-sm text-slate-800">Layers & Controls</span>
            </div>
            <button onClick={() => setShowLayerPanel(false)} className="text-slate-400 hover:text-slate-600">
              <EyeOff className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* Layer groups */}
            {layerGroups.map(group => (
              <div key={group}>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2 px-1">{group}</div>
                <div className="space-y-1">
                  {LAYER_CONFIG.filter(l => l.group === group).map(layer => {
                    const Icon = layer.icon;
                    const isVisible = layers[layer.key];
                    return (
                      <button
                        key={layer.key}
                        onClick={() => toggleLayer(layer.key)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all ${
                          isVisible ? 'bg-blue-50 text-slate-800' : 'text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isVisible ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span className="flex-1 text-left text-xs font-medium">{layer.label}</span>
                        {isVisible ? <Eye className="w-3.5 h-3.5 text-blue-500" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Filter */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2 px-1">Filter Parcels</div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Parcels</option>
                <option value="verified">Verified</option>
                <option value="ai_preliminary">AI Preliminary</option>
                <option value="requires_review">Requires Review</option>
                <option value="field_verification">Field Verification</option>
                <option value="conflicts">Conflicts Only</option>
              </select>
            </div>

            {/* Compare mode */}
            <div className="border-t border-slate-100 pt-3">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2 px-1">Comparison Tools</div>
              <button
                onClick={() => setCompareMode(!compareMode)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all ${
                  compareMode ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <GitCompare className="w-4 h-4" />
                <span className="text-xs font-semibold">Compare Layers</span>
              </button>
              {compareMode && (
                <div className="mt-2 px-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                    <span>Existing</span><span>AI</span>
                  </div>
                  <input
                    type="range" min={0} max={100} value={compareSlider}
                    onChange={(e) => setCompareSlider(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>
              )}
            </div>

            {/* Basemap toggle */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2 px-1">Basemap</div>
              <div className="flex gap-1">
                <button
                  onClick={() => { setBasemapMode('satellite'); toggleLayer('satelliteImagery'); }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg ${basemapMode === 'satellite' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                >Satellite</button>
                <button
                  onClick={() => { setBasemapMode('street'); toggleLayer('streetMap'); }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg ${basemapMode === 'street' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                >Street</button>
              </div>
            </div>
          </div>

          {/* Stats footer */}
          <div className="border-t border-slate-100 p-3 space-y-1">
            <div className="text-[10px] text-slate-500 flex justify-between"><span>Showing:</span><span className="font-bold text-slate-700">{filteredParcels.length} parcels</span></div>
            <div className="text-[10px] text-slate-500 flex justify-between"><span>Selected:</span><span className="font-bold text-slate-700">{selectedParcelId || 'None'}</span></div>
          </div>
        </div>
      )}

      {/* Center: Map */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Map toolbar */}
        <div className="bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-2 flex-wrap">
          {!showLayerPanel && (
            <Button size="sm" variant="secondary" onClick={() => setShowLayerPanel(true)}>
              <Layers className="w-3.5 h-3.5" /> Layers
            </Button>
          )}
          {!showInfoPanel && (
            <Button size="sm" variant="secondary" onClick={() => setShowInfoPanel(true)}>
              <MapIcon className="w-3.5 h-3.5" /> Details
            </Button>
          )}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-semibold">WebGIS</span>
            <span className="text-slate-300">|</span>
            <span>{filteredParcels.length} parcels visible</span>
            {compareMode && (
              <>
                <span className="text-slate-300">|</span>
                <span className="text-blue-600 font-semibold">Compare Mode Active</span>
              </>
            )}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5">
            <button className="px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5" /> Measure
            </button>
            <button className="px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-1">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <button className="px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-1">
              <Maximize2 className="w-3.5 h-3.5" /> Fullscreen
            </button>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 p-3 overflow-hidden">
          <MapView
            parcels={filteredParcels}
            buildings={buildings}
            roads={roads}
            gnssPoints={gnssPoints}
            layers={layers}
            selectedParcelId={selectedParcelId}
            onSelectParcel={setSelectedParcelId}
            compareMode={compareMode}
            compareSlider={compareSlider}
            basemapMode={basemapMode}
            highlightConflicts={layers.conflictAreas}
            showGrid={settings.showGrid}
            height="100%"
            searchParcelId={selectedParcelId}
          />
        </div>

        {/* Status bar */}
        <div className="bg-slate-800 text-slate-300 px-4 py-1.5 flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-4">
            <span>EPSG:32643 · UTM Zone 43N</span>
            <span>Scale: 1:{Math.round(2500 / (1))}</span>
            <span>26.9124°N 75.7873°E</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full" /> Connected</span>
            <span>Parcels: {parcels.length}</span>
            <span>Buildings: {buildings.length}</span>
            <span>GNSS: {gnssPoints.length}</span>
          </div>
        </div>
      </div>

      {/* Right: Parcel Details Panel */}
      {showInfoPanel && (
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col overflow-hidden flex-shrink-0">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="font-bold text-sm text-slate-800">Parcel Details</span>
            <button onClick={() => setShowInfoPanel(false)} className="text-slate-400 hover:text-slate-600">
              <EyeOff className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {!selectedParcel ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                  <MapIcon className="w-6 h-6 text-slate-400" />
                </div>
                <div className="text-sm font-semibold text-slate-600">No Parcel Selected</div>
                <div className="text-xs text-slate-400 mt-1">Click a parcel on the map to view its details, AI confidence, and validation status.</div>
              </div>
            ) : (
              <ParcelDetails
                parcel={selectedParcel}
                onAccept={() => acceptAIBoundary(selectedParcel.id)}
                onReject={() => rejectParcel(selectedParcel.id)}
                onFieldVerif={() => requestFieldVerification(selectedParcel.id)}
                onRepair={() => repairTopology(selectedParcel.id)}
                onGoToField={() => setCurrentPage('field-verification')}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ParcelDetails({ parcel, onAccept, onReject, onFieldVerif, onRepair, onGoToField }: {
  parcel: import('@/types').Parcel;
  onAccept: () => void;
  onReject: () => void;
  onFieldVerif: () => void;
  onRepair: () => void;
  onGoToField: () => void;
}) {
  const areaDiff = parcel.aiArea - parcel.existingArea;
  const areaDiffPct = parcel.existingArea > 0 ? ((areaDiff / parcel.existingArea) * 100) : 0;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="font-bold text-slate-800 text-lg">{parcel.id}</div>
          <PriorityBadge priority={parcel.priority} />
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={parcel.status} />
          <StatusBadge status={parcel.topologyStatus} />
        </div>
      </div>

      {/* AI Confidence */}
      <div className="bg-slate-50 rounded-lg p-3">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">AI Confidence</div>
        <ConfidenceBar value={parcel.confidence} />
        <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
          <div><span className="text-slate-500">Boundary:</span> <span className="font-bold text-slate-700">{parcel.boundaryConfidence}%</span></div>
          <div><span className="text-slate-500">Building:</span> <span className="font-bold text-slate-700">{parcel.buildingConfidence}%</span></div>
        </div>
      </div>

      {/* AI Recommendation */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <MapPin className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">AI Recommendation</span>
        </div>
        <p className="text-xs text-blue-900 leading-relaxed">{parcel.recommendation}</p>
      </div>

      {/* Conflict reasons */}
      {parcel.conflictReasons.length > 0 && (parcel.conflictType || parcel.confidence < 80) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Why is this flagged?</span>
          </div>
          <ul className="space-y-1">
            {parcel.conflictReasons.map((r, i) => (
              <li key={i} className="text-xs text-red-800 flex items-start gap-1.5">
                <span className="text-red-500 mt-0.5">✓</span> {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Identification */}
      <Section title="Identification">
        <DetailRow label="Parcel ID" value={parcel.id} />
        <DetailRow label="Survey Number" value={parcel.surveyNumber} />
        <DetailRow label="Ward" value={parcel.ward} />
        <DetailRow label="Zone" value={parcel.zone} />
      </Section>

      {/* Geometry */}
      <Section title="Geometry">
        <DetailRow label="Existing Area" value={`${parcel.existingArea} m²`} labelColor="text-slate-500" valueColor="text-slate-600" />
        <DetailRow label="AI Estimated Area" value={`${parcel.aiArea} m²`} valueColor="text-blue-600" />
        <DetailRow
          label="Area Difference"
          value={`${areaDiff > 0 ? '+' : ''}${areaDiff.toFixed(1)} m² (${areaDiffPct.toFixed(1)}%)`}
          valueColor={Math.abs(areaDiffPct) > 10 ? 'text-red-600 font-bold' : Math.abs(areaDiffPct) > 5 ? 'text-amber-600' : 'text-green-600'}
        />
        <DetailRow label="Perimeter" value={`${parcel.perimeter} m`} />
        <DetailRow label="Boundary Displacement" value={`${parcel.boundaryDisplacement} m`} valueColor={parcel.boundaryDisplacement > 2 ? 'text-red-600' : 'text-slate-600'} />
      </Section>

      {/* Validation */}
      <Section title="Validation">
        <DetailRow label="Topology Status" value={parcel.topologyStatus === 'valid' ? 'Valid' : 'Invalid'} valueColor={parcel.topologyStatus === 'valid' ? 'text-green-600' : 'text-red-600'} />
        <DetailRow label="Overlap Status" value={parcel.topologyIssues.some(i => i.includes('Overlap')) ? 'Detected' : 'None'} valueColor={parcel.topologyIssues.some(i => i.includes('Overlap')) ? 'text-red-600' : 'text-green-600'} />
        <DetailRow label="Gap Status" value={parcel.topologyIssues.some(i => i.includes('Gap')) ? 'Detected' : 'None'} valueColor={parcel.topologyIssues.some(i => i.includes('Gap')) ? 'text-red-600' : 'text-green-600'} />
        <DetailRow label="Self-intersection" value={parcel.topologyIssues.some(i => i.includes('Self')) ? 'Detected' : 'None'} valueColor={parcel.topologyIssues.some(i => i.includes('Self')) ? 'text-red-600' : 'text-green-600'} />
      </Section>

      {/* Survey status */}
      <Section title="Survey Status">
        <div className="flex items-center gap-2">
          <StatusBadge status={parcel.verificationStatus} />
          {parcel.assignedSurveyor && <span className="text-xs text-slate-500">Assigned: {parcel.assignedSurveyor}</span>}
        </div>
      </Section>

      {/* Topology repair */}
      {parcel.topologyStatus === 'invalid' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="text-xs font-bold text-amber-700 mb-2">Topology Issues</div>
          {parcel.topologyIssues.map((issue, i) => (
            <div key={i} className="text-xs text-amber-800 mb-1">{issue}</div>
          ))}
          <Button size="sm" variant="secondary" className="w-full mt-2" onClick={onRepair}>
            <Check className="w-3.5 h-3.5" /> Auto Repair
          </Button>
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <Button size="sm" variant="success" className="w-full" onClick={onAccept}>
          <Check className="w-4 h-4" /> Accept AI Boundary
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="secondary">Edit Boundary</Button>
          <Button size="sm" variant="danger" onClick={onReject}>Reject</Button>
        </div>
        <Button size="sm" variant="secondary" className="w-full" onClick={() => { onFieldVerif(); onGoToField(); }}>
          <MapPin className="w-4 h-4" /> Request Field Verification
        </Button>
      </div>

      <AIDisclaimer />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function DetailRow({ label, value, labelColor = 'text-slate-500', valueColor = 'text-slate-700' }: { label: string; value: string; labelColor?: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className={labelColor}>{label}</span>
      <span className={`font-semibold ${valueColor}`}>{value}</span>
    </div>
  );
}
