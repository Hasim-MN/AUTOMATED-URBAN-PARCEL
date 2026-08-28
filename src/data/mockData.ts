import type {
  Parcel,
  Building,
  Road,
  GNSSPoint,
  TopologyIssue,
  Project,
  Surveyor,
  AppNotification,
  ParcelStatus,
  Priority,
  ConflictType,
  VerificationStatus,
  ConfidenceLevel,
} from '@/types';

// Deterministic pseudo-random generator for reproducible demo data
let _seed = 42;
const rand = () => {
  _seed = (_seed * 1103515245 + 12345) & 0x7fffffff;
  return _seed / 0x7fffffff;
};
const randRange = (min: number, max: number) => min + rand() * (max - min);
const randInt = (min: number, max: number) => Math.floor(randRange(min, max + 1));
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

const M = 1000; // local coordinate space size

const surveyors: Surveyor[] = [
  { id: 'S001', name: 'Ravi Kumar', email: 'ravi.kumar@cadastra.ai', role: 'Senior Surveyor', avatar: 'RK' },
  { id: 'S002', name: 'Priya Sharma', email: 'priya.sharma@cadastra.ai', role: 'GIS Analyst', avatar: 'PS' },
  { id: 'S003', name: 'Arjun Mehta', email: 'arjun.mehta@cadastra.ai', role: 'Field Surveyor', avatar: 'AM' },
  { id: 'S004', name: 'Sneha Patel', email: 'sneha.patel@cadastra.ai', role: 'Cadastral Officer', avatar: 'SP' },
  { id: 'S005', name: 'Vikram Singh', email: 'vikram.singh@cadastra.ai', role: 'Surveyor', avatar: 'VS' },
];

// Generate a rectangular-ish parcel polygon with some irregularity
function generateParcelGeometry(cx: number, cy: number, w: number, h: number, jitter: number): { x: number; y: number }[] {
  const j = () => randRange(-jitter, jitter);
  return [
    { x: cx - w / 2 + j(), y: cy - h / 2 + j() },
    { x: cx + w / 2 + j(), y: cy - h / 2 + j() },
    { x: cx + w / 2 + j(), y: cy + h / 2 + j() },
    { x: cx - w / 2 + j(), y: cy + h / 2 + j() },
  ];
}

function polygonArea(poly: { x: number; y: number }[]): number {
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    area += poly[i].x * poly[j].y;
    area -= poly[j].x * poly[i].y;
  }
  return Math.abs(area) / 2;
}

function polygonPerimeter(poly: { x: number; y: number }[]): number {
  let p = 0;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    const dx = poly[j].x - poly[i].x;
    const dy = poly[j].y - poly[i].y;
    p += Math.sqrt(dx * dx + dy * dy);
  }
  return p;
}

// Scale factor: local units to meters² — tuned so areas look realistic (100-300 m²)
const AREA_SCALE = 0.45;

function getConfidenceLevel(c: number): ConfidenceLevel {
  if (c >= 95) return 'very_high';
  if (c >= 80) return 'high';
  if (c >= 60) return 'medium';
  return 'low';
}

function getPriority(confidence: number, areaDiff: number, conflictType: ConflictType | null): Priority {
  if (confidence < 60 || (conflictType === 'overlap' && areaDiff > 15) || conflictType === 'self_intersection') return 'CRITICAL';
  if (confidence < 75 || areaDiff > 10 || conflictType === 'overlap') return 'HIGH';
  if (confidence < 85 || areaDiff > 5 || conflictType) return 'MEDIUM';
  return 'LOW';
}

function getStatus(confidence: number, verificationStatus: VerificationStatus, conflictType: ConflictType | null, topologyStatus: 'valid' | 'invalid'): ParcelStatus {
  if (verificationStatus === 'verified') return 'verified';
  if (verificationStatus === 'field_verification_required' || confidence < 70) return 'field_verification';
  if (conflictType || confidence < 85 || topologyStatus === 'invalid') return 'requires_review';
  return 'ai_preliminary';
}

function getRecommendation(p: { confidence: number; boundaryDisplacement: number; conflictType: ConflictType | null; topologyStatus: string }): string {
  if (p.confidence < 60) return 'Insufficient confidence — field verification required.';
  if (p.confidence < 70) return `Field verification recommended because AI confidence is ${p.confidence}% and the predicted boundary differs from the existing cadastral boundary by ${p.boundaryDisplacement.toFixed(1)} m.`;
  if (p.topologyStatus === 'invalid') return 'Topology repair required before acceptance.';
  if (p.conflictType === 'overlap') return 'Review manually — overlapping parcel detected.';
  if (p.confidence < 85) return 'Compare with existing record before acceptance.';
  if (p.confidence < 95) return 'Review manually — verify boundary alignment.';
  return 'Accept AI boundary — high confidence prediction.';
}

function getConflictReasons(confidence: number, areaDiff: number, boundaryDiff: number, conflictType: ConflictType | null, hasGnss: boolean, gnssDist: number): string[] {
  const reasons: string[] = [];
  if (conflictType === 'boundary_mismatch' || boundaryDiff > 1) reasons.push(`Existing and AI boundaries differ by ${boundaryDiff.toFixed(1)} m`);
  if (conflictType === 'area_mismatch' || areaDiff > 5) reasons.push(`Area differs by ${areaDiff.toFixed(1)}%`);
  if (conflictType === 'overlap') reasons.push('Overlapping parcel detected with adjacent boundary');
  if (conflictType === 'gap') reasons.push('Gap detected between neighboring parcels');
  if (conflictType === 'self_intersection') reasons.push('Self-intersecting geometry detected');
  if (conflictType === 'missing_parcel') reasons.push('AI detects a parcel with no existing cadastral record');
  if (conflictType === 'new_structure') reasons.push('New building/structure detected not in existing GIS');
  if (hasGnss && gnssDist > 1.5) reasons.push(`GNSS point is ${gnssDist.toFixed(1)} m from AI boundary`);
  if (confidence < 80) reasons.push(`Confidence below 80% (${confidence}%)`);
  if (reasons.length === 0) reasons.push('Minor boundary variance within tolerance');
  return reasons;
}

export function generateParcels(): Parcel[] {
  _seed = 42; // reset for reproducibility
  const parcels: Parcel[] = [];
  const cols = 10;
  const rows = 8;
  const cellW = M / cols;
  const cellH = M / rows;
  const pad = cellW * 0.08;

  let id = 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = c * cellW + cellW / 2;
      const cy = r * cellH + cellH / 2;
      const w = cellW - pad * 2;
      const h = cellH - pad * 2;

      // Existing geometry (stable, low jitter)
      const existing = generateParcelGeometry(cx, cy, w, h, 2);
      // AI geometry (higher jitter to simulate prediction variance)
      const aiJitter = randRange(4, 18);
      const ai = generateParcelGeometry(cx, cy, w + randRange(-8, 8), h + randRange(-8, 8), aiJitter);

      const existingArea = polygonArea(existing) * AREA_SCALE;
      const aiArea = polygonArea(ai) * AREA_SCALE;
      const areaDiffPct = existingArea > 0 ? Math.abs(((aiArea - existingArea) / existingArea) * 100) : 0;
      const perimeter = polygonPerimeter(ai) * Math.sqrt(AREA_SCALE);

      // Boundary displacement: average corner shift
      let bdisp = 0;
      for (let i = 0; i < 4; i++) {
        const dx = ai[i].x - existing[i].x;
        const dy = ai[i].y - existing[i].y;
        bdisp += Math.sqrt(dx * dx + dy * dy);
      }
      bdisp = (bdisp / 4) * Math.sqrt(AREA_SCALE);

      const confidence = Math.round(randRange(55, 99));
      const boundaryConfidence = Math.round(confidence + randRange(-8, 4));
      const buildingConfidence = Math.round(randRange(70, 98));

      // Determine conflict
      let conflictType: ConflictType | null = null;
      const roll = rand();
      if (areaDiffPct > 8 && roll < 0.3) conflictType = 'area_mismatch';
      else if (bdisp > 2.5 && roll < 0.25) conflictType = 'boundary_mismatch';
      else if (roll < 0.08) conflictType = 'overlap';
      else if (roll < 0.13) conflictType = 'gap';
      else if (roll < 0.16) conflictType = 'self_intersection';
      else if (roll < 0.19) conflictType = 'missing_parcel';
      else if (roll < 0.22) conflictType = 'new_structure';

      const topologyStatus = conflictType === 'self_intersection' || conflictType === 'gap' || roll < 0.05 ? 'invalid' : 'valid';
      const topologyIssues: string[] = [];
      if (topologyStatus === 'invalid') {
        if (conflictType === 'overlap' || roll < 0.02) topologyIssues.push('Overlap with adjacent parcel');
        if (conflictType === 'gap' || (roll > 0.02 && roll < 0.04)) topologyIssues.push('Gap between neighboring parcels');
        if (conflictType === 'self_intersection') topologyIssues.push('Self-intersecting geometry');
        if (roll > 0.04 && roll < 0.06) topologyIssues.push('Unclosed geometry');
      }

      const hasGnss = rand() < 0.4;
      const gnssDist = hasGnss ? randRange(0.2, 3.5) : 0;

      const verificationStatus: VerificationStatus =
        confidence < 70 ? 'field_verification_required' :
        rand() < 0.15 ? 'under_review' :
        rand() < 0.6 ? 'verified' : 'not_reviewed';

      const status = getStatus(confidence, verificationStatus, conflictType, topologyStatus);
      const priority = getPriority(confidence, areaDiffPct, conflictType);
      const assignedSurveyor = verificationStatus === 'field_verification_required' ? pick(surveyors).name : null;

      const pid = `P-${String(id).padStart(5, '0')}`;
      const conflictReasons = getConflictReasons(confidence, areaDiffPct, bdisp, conflictType, hasGnss, gnssDist);

      const parcel: Parcel = {
        id: pid,
        surveyNumber: `SV-${randInt(100, 999)}/${randInt(1, 12)}`,
        ward: `Ward ${randInt(1, 30)}`,
        zone: `Zone 04`,
        existingGeometry: existing,
        aiGeometry: ai,
        existingArea: Math.round(existingArea * 10) / 10,
        aiArea: Math.round(aiArea * 10) / 10,
        confidence,
        boundaryConfidence: Math.max(0, Math.min(100, boundaryConfidence)),
        buildingConfidence,
        perimeter: Math.round(perimeter * 10) / 10,
        boundaryDisplacement: Math.round(bdisp * 10) / 10,
        status,
        conflictType,
        priority,
        topologyStatus,
        verificationStatus,
        topologyIssues,
        notes: '',
        recommendation: getRecommendation({ confidence, boundaryDisplacement: bdisp, conflictType, topologyStatus }),
        conflictReasons,
        assignedSurveyor,
        checklist: {
          boundaryVerified: verificationStatus === 'verified',
          existingRecordChecked: verificationStatus === 'verified',
          gnssCollected: verificationStatus === 'verified' && hasGnss,
          buildingChecked: false,
          neighborChecked: verificationStatus === 'verified',
        },
        hasBuilding: rand() < 0.6,
        gnssPointIds: hasGnss ? [] : [],
      };

      parcels.push(parcel);
      id++;
    }
  }
  return parcels;
}

export function generateBuildings(parcels: Parcel[]): Building[] {
  _seed = 99;
  const buildings: Building[] = [];
  let bid = 1;
  for (const p of parcels) {
    if (!p.hasBuilding) continue;
    // Building is smaller than parcel, centered
    const ai = p.aiGeometry;
    const cx = ai.reduce((s, pt) => s + pt.x, 0) / ai.length;
    const cy = ai.reduce((s, pt) => s + pt.y, 0) / ai.length;
    const w = Math.abs(ai[1].x - ai[0].x) * randRange(0.3, 0.6);
    const h = Math.abs(ai[2].y - ai[1].y) * randRange(0.3, 0.6);
    const geom = generateParcelGeometry(cx, cy, w, h, 3);
    buildings.push({
      id: `B-${String(bid).padStart(4, '0')}`,
      geometry: geom,
      area: Math.round(polygonArea(geom) * AREA_SCALE * 10) / 10,
      height: Math.round(randRange(3, 18) * 10) / 10,
      parcelId: p.id,
      type: pick(['Residential', 'Commercial', 'Government', 'Industrial']),
    });
    bid++;
  }
  return buildings;
}

export function generateRoads(): Road[] {
  _seed = 77;
  const roads: Road[] = [];
  // Horizontal roads
  for (let r = 1; r < 8; r++) {
    const y = (M / 8) * r;
    roads.push({
      id: `R-H${r}`,
      path: [{ x: 0, y }, { x: M, y }],
      name: `Road H-${r}`,
      width: randRange(6, 14),
    });
  }
  // Vertical roads
  for (let c = 1; c < 10; c++) {
    const x = (M / 10) * c;
    roads.push({
      id: `R-V${c}`,
      path: [{ x, y: 0 }, { x, y: M }],
      name: `Road V-${c}`,
      width: randRange(6, 14),
    });
  }
  return roads;
}

export function generateGNSSPoints(parcels: Parcel[]): GNSSPoint[] {
  _seed = 55;
  const points: GNSSPoint[] = [];
  let gid = 1;
  const baseLat = 26.9124;
  const baseLng = 75.7873;
  for (const p of parcels) {
    if (rand() < 0.35) continue;
    const ai = p.aiGeometry;
    // Point near a corner of the parcel
    const corner = pick(ai);
    const x = corner.x + randRange(-15, 15);
    const y = corner.y + randRange(-15, 15);
    const lat = baseLat + (y / M - 0.5) * 0.04;
    const lng = baseLng + (x / M - 0.5) * 0.04;
    points.push({
      id: `GNSS-${String(gid).padStart(4, '0')}`,
      x,
      y,
      latitude: Math.round(lat * 10000) / 10000,
      longitude: Math.round(lng * 10000) / 10000,
      accuracy: Math.round(randRange(1, 5) * 10) / 10,
      surveyDate: '28 Aug 2026',
      parcelId: p.id,
    });
    p.gnssPointIds.push(`GNSS-${String(gid).padStart(4, '0')}`);
    gid++;
  }
  return points;
}

export function generateTopologyIssues(parcels: Parcel[]): TopologyIssue[] {
  const issues: TopologyIssue[] = [];
  let tid = 1;
  for (const p of parcels) {
    if (p.topologyStatus !== 'invalid') continue;
    for (const issue of p.topologyIssues) {
      const type = issue.toLowerCase().includes('overlap') ? 'overlap' :
        issue.toLowerCase().includes('gap') ? 'gap' :
        issue.toLowerCase().includes('self') ? 'self_intersection' : 'unclosed';
      // Find adjacent parcel for overlap/gap
      const adjacent = parcels.find(pp => pp.id !== p.id &&
        Math.abs(pp.aiGeometry[0].x - p.aiGeometry[0].x) < 120 &&
        Math.abs(pp.aiGeometry[0].y - p.aiGeometry[0].y) < 120);
      issues.push({
        id: `T-${String(tid).padStart(4, '0')}`,
        type,
        parcelIds: adjacent ? [p.id, adjacent.id] : [p.id],
        description: type === 'overlap' && adjacent
          ? `Overlap detected between ${p.id} and ${adjacent.id}`
          : issue,
        repaired: false,
      });
      tid++;
    }
  }
  return issues;
}

export function generateProjects(): Project[] {
  return [
    {
      id: 'PRJ-001',
      name: 'Jaipur Urban Cadastral Survey – Zone 04',
      surveyArea: 'Zone 04, Jaipur',
      district: 'Jaipur',
      state: 'Rajasthan',
      surveyDate: '28 Aug 2026',
      status: 'analysis_complete',
      progress: 78,
      areaKm2: 4.2,
      parcelsDetected: 1284,
      highConfidence: 1031,
      reviewRequired: 198,
      fieldVerification: 55,
      topologyErrors: 43,
      avgConfidence: 87.4,
      totalParcels: 1284,
      verifiedParcels: 3917,
      createdAt: '15 Aug 2026',
      gnssPointsCount: 312,
    },
    {
      id: 'PRJ-002',
      name: 'Ajmer Rural Parcel Mapping – Sector 12',
      surveyArea: 'Sector 12, Ajmer',
      district: 'Ajmer',
      state: 'Rajasthan',
      surveyDate: '20 Aug 2026',
      status: 'under_review',
      progress: 54,
      areaKm2: 2.8,
      parcelsDetected: 842,
      highConfidence: 614,
      reviewRequired: 142,
      fieldVerification: 38,
      topologyErrors: 21,
      avgConfidence: 82.1,
      totalParcels: 842,
      verifiedParcels: 512,
      createdAt: '10 Aug 2026',
      gnssPointsCount: 198,
    },
    {
      id: 'PRJ-003',
      name: 'Jodhpur City Expansion – Block 07',
      surveyArea: 'Block 07, Jodhpur',
      district: 'Jodhpur',
      state: 'Rajasthan',
      surveyDate: '25 Aug 2026',
      status: 'ai_processing',
      progress: 35,
      areaKm2: 3.5,
      parcelsDetected: 0,
      highConfidence: 0,
      reviewRequired: 0,
      fieldVerification: 0,
      topologyErrors: 0,
      avgConfidence: 0,
      totalParcels: 0,
      verifiedParcels: 0,
      createdAt: '24 Aug 2026',
      gnssPointsCount: 0,
    },
    {
      id: 'PRJ-004',
      name: 'Udaipur Lake District – Ward 03',
      surveyArea: 'Ward 03, Udaipur',
      district: 'Udaipur',
      state: 'Rajasthan',
      surveyDate: '18 Aug 2026',
      status: 'completed',
      progress: 100,
      areaKm2: 1.9,
      parcelsDetected: 620,
      highConfidence: 580,
      reviewRequired: 24,
      fieldVerification: 12,
      topologyErrors: 8,
      avgConfidence: 91.2,
      totalParcels: 620,
      verifiedParcels: 596,
      createdAt: '01 Aug 2026',
      gnssPointsCount: 145,
    },
  ];
}

export function generateNotifications(): AppNotification[] {
  return [
    { id: 'N1', type: 'warning', title: 'Review Required', message: '12 new parcels require review in Zone 04.', time: '5 min ago', read: false },
    { id: 'N2', type: 'error', title: 'Topology Conflicts', message: '5 topology conflicts detected in Sector 12.', time: '23 min ago', read: false },
    { id: 'N3', type: 'success', title: 'Verification Completed', message: 'Field verification completed for P-00452.', time: '1 hour ago', read: false },
    { id: 'N4', type: 'info', title: 'AI Analysis Complete', message: 'AI analysis completed for Zone 04.', time: '2 hours ago', read: true },
    { id: 'N5', type: 'warning', title: 'Low Confidence', message: '8 parcels below 60% confidence threshold.', time: '3 hours ago', read: true },
  ];
}

export { surveyors };
export { getConfidenceLevel };
