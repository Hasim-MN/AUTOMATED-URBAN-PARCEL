export type ParcelStatus =
  | 'verified'
  | 'ai_preliminary'
  | 'requires_review'
  | 'field_verification'
  | 'rejected';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ConflictType =
  | 'boundary_mismatch'
  | 'area_mismatch'
  | 'overlap'
  | 'gap'
  | 'self_intersection'
  | 'missing_parcel'
  | 'new_structure';

export type TopologyStatus = 'valid' | 'invalid';

export type VerificationStatus =
  | 'not_reviewed'
  | 'under_review'
  | 'verified'
  | 'field_verification_required';

export type ProjectStatus =
  | 'created'
  | 'data_uploaded'
  | 'ai_processing'
  | 'analysis_complete'
  | 'under_review'
  | 'field_verification'
  | 'completed';

export type ConfidenceLevel = 'very_high' | 'high' | 'medium' | 'low';

// Local coordinate system (normalized 0..1000 range for SVG rendering)
export type LocalPoint = { x: number; y: number };
export type Polygon = LocalPoint[];

export interface Parcel {
  id: string;
  surveyNumber: string;
  ward: string;
  zone: string;
  existingGeometry: Polygon;
  aiGeometry: Polygon;
  existingArea: number; // m²
  aiArea: number; // m²
  confidence: number; // 0-100
  boundaryConfidence: number;
  buildingConfidence: number;
  perimeter: number; // m
  boundaryDisplacement: number; // m
  status: ParcelStatus;
  conflictType: ConflictType | null;
  priority: Priority;
  topologyStatus: TopologyStatus;
  verificationStatus: VerificationStatus;
  topologyIssues: string[];
  notes: string;
  recommendation: string;
  conflictReasons: string[];
  assignedSurveyor: string | null;
  // field verification checklist
  checklist: {
    boundaryVerified: boolean;
    existingRecordChecked: boolean;
    gnssCollected: boolean;
    buildingChecked: boolean;
    neighborChecked: boolean;
  };
  hasBuilding: boolean;
  gnssPointIds: string[];
}

export interface Building {
  id: string;
  geometry: Polygon;
  area: number;
  height: number; // m
  parcelId: string | null;
  type: string;
}

export interface Road {
  id: string;
  path: LocalPoint[];
  name: string;
  width: number;
}

export interface GNSSPoint {
  id: string;
  x: number;
  y: number;
  latitude: number;
  longitude: number;
  accuracy: number; // cm
  surveyDate: string;
  parcelId: string;
}

export interface TopologyIssue {
  id: string;
  type: 'overlap' | 'gap' | 'self_intersection' | 'unclosed';
  parcelIds: string[];
  description: string;
  repaired: boolean;
}

export interface Project {
  id: string;
  name: string;
  surveyArea: string;
  district: string;
  state: string;
  surveyDate: string;
  status: ProjectStatus;
  progress: number;
  areaKm2: number;
  parcelsDetected: number;
  highConfidence: number;
  reviewRequired: number;
  fieldVerification: number;
  topologyErrors: number;
  avgConfidence: number;
  totalParcels: number;
  verifiedParcels: number;
  createdAt: string;
  gnssPointsCount: number;
}

export interface Surveyor {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
}

export interface VerificationRecord {
  id: string;
  parcelId: string;
  surveyor: string;
  date: string;
  status: VerificationStatus;
  notes: string;
}

export interface AppNotification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export interface LayerState {
  satelliteImagery: boolean;
  streetMap: boolean;
  aiParcelBoundaries: boolean;
  existingCadastralParcels: boolean;
  buildings: boolean;
  roads: boolean;
  dsm: boolean;
  dtm: boolean;
  gnssPoints: boolean;
  conflictAreas: boolean;
}

export type PageId =
  | 'dashboard'
  | 'projects'
  | 'new-survey'
  | 'ai-processing'
  | 'cadastral-map'
  | 'conflicts'
  | 'field-verification'
  | 'topology'
  | 'reports'
  | 'settings';
