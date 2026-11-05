export type CameraId = 'cam1' | 'cam2' | 'cam3' | 'cam4' | 'camFree';

export type ViewLayoutMode = 'quad' | 'single' | 'pip';

export type VisionFilterMode = 'normal' | 'ai' | 'thermal' | 'night';

export interface CameraDefinition {
  id: CameraId;
  name: string;
  code: string;
  zone: string;
  lens: string;
  resolution: string;
  fps: number;
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  description: string;
  riskRating: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export type GenderGroup = 'M' | 'F';
export type AgeBracket = '18-25' | '26-35' | '36-50' | '50+';

export interface DemographicBreakdown {
  gender: {
    male: number;
    female: number;
    malePercent: number;
    femalePercent: number;
  };
  ageGroups: {
    '18-25': number;
    '26-35': number;
    '36-50': number;
    '50+': number;
  };
}

export type ShopperBehaviorState =
  | 'ENTERING'
  | 'WALKING_AISLE'
  | 'BROWSING_SHELF'
  | 'PICKING_ITEM'
  | 'HEADING_CHECKOUT'
  | 'CHECKOUT_PAYING'
  | 'EXITING'
  | 'LOITERING_HIGH_VALUE'
  | 'CONCEALMENT'
  | 'SPRINT_THEFT'
  | 'INTERCEPTED';

export interface ShopperAgent {
  id: string;
  badgeNumber: number;
  gender: 'M' | 'F';
  ageBracket: AgeBracket;
  estimatedAge: number;
  shirtColor: string;
  pantsColor: string;
  position: [number, number, number];
  rotationY: number;
  velocity: [number, number, number];
  speed: number;
  state: ShopperBehaviorState;
  stateTimer: number;
  isThief: boolean;
  hasConcealedItem: boolean;
  itemCount: number;
  dwellTimeNearElectronics: number;
  riskScore: number; // 0 - 100
  targetDestination: [number, number, number] | null;
  pathTrail: [number, number, number][];
  currentActionText: string;
  // Screen space 2D projections for CCTV UI overlays
  screenProjections: {
    [key in CameraId]?: {
      x: number;
      y: number;
      boxWidth: number;
      boxHeight: number;
      visible: boolean;
      depth: number;
    };
  };
}

export interface SecurityAlert {
  id: string;
  timestamp: string;
  timeOffset?: number; // seconds relative to live when incident occurred
  cameraId: CameraId;
  cameraName: string;
  shopperId: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  indicators: string[];
}

export interface SystemTelemetry {
  footfallTotal: number;
  activeShoppers: number;
  highRiskSuspects: number;
  theftsPrevented: number;
  bandwidthMbps: number;
  serverFps: number;
  systemHealth: string;
  securityGateAlarming: boolean;
  demographics?: DemographicBreakdown;
}

export interface PlaybackState {
  isPlaying: boolean;
  isLive: boolean;
  playbackSpeed: number; // 0.5, 1, 2, 4, 8
  currentTimeOffset: number; // seconds offset from live edge (0 = live, -30 = 30s in past)
  maxHistoryDuration: number; // Total window in seconds (e.g. 90s)
}

export interface HistorySnapshot {
  timestamp: number;
  timeOffset: number;
  timeStr: string;
  isAlarmActive: boolean;
  agents: {
    id: string;
    gender?: GenderGroup;
    ageBracket?: AgeBracket;
    estimatedAge?: number;
    position: [number, number, number];
    rotationY: number;
    state: ShopperBehaviorState;
    isThief: boolean;
    hasConcealedItem: boolean;
    riskScore: number;
    speed: number;
    actionText: string;
  }[];
}

export type ConsumerBuyingPattern =
  | 'TARGETED_BUYER'
  | 'EXPLORATORY_BROWSER'
  | 'QUICK_GRAB_AND_GO'
  | 'IMPULSE_SHOPPER'
  | 'BARGAIN_COMPARISON'
  | 'LOSS_PREVENTION_RISK';

export interface InsideMapWaypoint {
  x: number;
  z: number;
  timestamp: number;
  timeFormatted: string;
  zone: string;
  speed: number;
  action: string;
  state: ShopperBehaviorState;
}

export interface BasketItemInteraction {
  id: string;
  name: string;
  category: string;
  price: number;
  timestamp: number;
  action: 'inspected' | 'added_to_cart' | 'abandoned' | 'concealed';
}

export interface ZoneDwellRecord {
  zoneId: string;
  zoneName: string;
  entryTime: number;
  exitTime?: number;
  dwellSeconds: number;
  itemsInteracted: number;
}

export interface ConsumerJourneyRecord {
  id: string;
  badgeNumber: number;
  gender: GenderGroup;
  ageBracket: AgeBracket;
  estimatedAge: number;
  status: 'ACTIVE_IN_STORE' | 'COMPLETED' | 'APPREHENDED';
  entryTime: number;
  exitTime: number | null;
  durationSeconds: number;
  entryPoint: [number, number, number];
  exitPoint: [number, number, number] | null;
  waypoints: InsideMapWaypoint[];
  pathLengthMeters: number;
  zonesVisited: ZoneDwellRecord[];
  currentZone: string;
  basket: BasketItemInteraction[];
  cartItemCount: number;
  cartTotalValue: number;
  conversionOutcome: 'PURCHASED' | 'THEFT' | 'WALKOUT_EMPTY' | 'IN_PROGRESS';
  buyingPattern: ConsumerBuyingPattern;
  patternConfidence: number;
  patternReasoning: string;
  routeCategory: string;
}

