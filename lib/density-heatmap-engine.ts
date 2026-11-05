import {
  ShopperAgent,
  ConsumerJourneyRecord,
  InsideMapWaypoint,
} from '@/components/surveillance/types';
import { ZONE_DEFINITIONS, getZoneFromPosition } from '@/lib/consumer-journey-tracker';

export type HeatmapTrafficMode = 'current' | 'peak';

export interface HeatmapPoint {
  x: number; // 3D world X (-18 to 18)
  z: number; // 3D world Z (-14 to 16)
  weight: number; // 0.1 to 1.5 intensity
  zoneId?: string;
  source?: 'active_agent' | 'historical_waypoint' | 'peak_cluster';
}

export interface ZoneDensityMetric {
  zoneId: string;
  zoneName: string;
  color: string;
  currentDensity: number; // percentage 0..100
  peakDensity: number; // percentage 0..100
  currentShoppers: number;
  peakShoppersPerHour: number;
  avgDwellSeconds: number;
  congestionStatus: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
}

// Generate rich synthetic historical peak hour clusters (Friday evening & Saturday afternoon rushes)
export function generateHistoricalPeakPoints(): HeatmapPoint[] {
  const points: HeatmapPoint[] = [];

  // Random helper with Gaussian-like clustering around a center
  const addCluster = (
    centerX: number,
    centerZ: number,
    radiusX: number,
    radiusZ: number,
    count: number,
    weightMin: number,
    weightMax: number,
    zoneId: string
  ) => {
    for (let i = 0; i < count; i++) {
      // Box-Muller transform for normal distribution
      const u1 = Math.random() || 0.0001;
      const u2 = Math.random() || 0.0001;
      const randStdNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      const randStdNormal2 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);

      const px = centerX + randStdNormal * (radiusX * 0.45);
      const pz = centerZ + randStdNormal2 * (radiusZ * 0.45);
      const weight = weightMin + Math.random() * (weightMax - weightMin);

      // Clamp within building bounds
      const clampedX = Math.max(-17.5, Math.min(17.5, px));
      const clampedZ = Math.max(-13.5, Math.min(15.5, pz));

      points.push({
        x: Math.round(clampedX * 100) / 100,
        z: Math.round(clampedZ * 100) / 100,
        weight: Math.round(weight * 100) / 100,
        zoneId,
        source: 'peak_cluster',
      });
    }
  };

  // 1. POS Checkout Lanes (Massive queue cluster during peak hours: X 10..13, Z -3..3)
  addCluster(11.2, -1.5, 2.5, 4.0, 95, 0.85, 1.4, 'POS_CHECKOUT');
  addCluster(11.8, 1.8, 2.2, 3.5, 80, 0.8, 1.35, 'POS_CHECKOUT');

  // 2. High-Value Electronics (Aisle 02: X -0.5, Z -5..4)
  addCluster(-0.5, -2.0, 1.8, 4.5, 75, 0.75, 1.3, 'AISLE_ELECTRONICS_02');
  addCluster(-0.5, 2.5, 1.8, 3.5, 60, 0.7, 1.2, 'AISLE_ELECTRONICS_02');

  // 3. Produce & Fresh Bakery (West perimeter: X -14, Z -5..5)
  addCluster(-13.8, 2.0, 3.0, 5.0, 90, 0.65, 1.1, 'PRODUCE_FRESH');
  addCluster(-13.5, -4.5, 2.8, 4.0, 70, 0.6, 1.05, 'PRODUCE_FRESH');

  // 4. Entrance Portal & Basket Pickup (South entrance chokepoint: X -7, Z 11..14)
  addCluster(-7.0, 12.5, 3.5, 2.8, 85, 0.7, 1.25, 'ENTRANCE_PORTAL');

  // 5. Aisle 03 Snacks & Beverages (Endcaps & promotional displays: X 5.5, Z -4..4)
  addCluster(5.8, 3.2, 2.0, 3.5, 65, 0.6, 1.15, 'AISLE_SNACKS_03');
  addCluster(5.8, -2.5, 2.0, 3.5, 55, 0.55, 1.0, 'AISLE_SNACKS_03');

  // 6. Aisle 01 Pantry & Dry Goods (X -7, Z -4..4)
  addCluster(-7.0, 0.0, 2.0, 5.0, 60, 0.5, 0.95, 'AISLE_GROCERY_01');

  // 7. EAS Anti-Theft Exit Gate & Turnstiles (X 9..11, Z 11..15)
  addCluster(9.8, 13.0, 2.5, 2.5, 50, 0.6, 1.05, 'EAS_EXIT_PORTAL');

  return points;
}

// Extract current live traffic points from active agents and their path trails
export function extractCurrentTrafficPoints(
  agents: ShopperAgent[],
  storedJourneys: ConsumerJourneyRecord[]
): HeatmapPoint[] {
  const points: HeatmapPoint[] = [];

  // Active agents in 3D scene
  agents.forEach((agent) => {
    const isBrowsing = agent.state === 'BROWSING_SHELF' || agent.state === 'LOITERING_HIGH_VALUE';
    const isPaying = agent.state === 'CHECKOUT_PAYING';
    const isPicking = agent.state === 'PICKING_ITEM' || agent.state === 'CONCEALMENT';

    // Stationary browsing/paying shoppers generate denser heat dwell
    let weight = 0.7;
    if (isPaying) weight = 1.3;
    else if (isPicking) weight = 1.1;
    else if (isBrowsing) weight = 0.95;
    else if (agent.speed > 2.0) weight = 0.45;

    points.push({
      x: agent.position[0],
      z: agent.position[2],
      weight,
      source: 'active_agent',
    });

    // Recent path trails (last 6-8 waypoints of current movement)
    if (agent.pathTrail && agent.pathTrail.length > 0) {
      agent.pathTrail.slice(-8).forEach((pt, idx) => {
        const trailWeight = 0.25 + (idx / 8) * 0.35;
        points.push({
          x: pt[0],
          z: pt[2],
          weight: trailWeight,
          source: 'active_agent',
        });
      });
    }
  });

  // Also include the most recent 5 completed customer journeys to form a solid baseline
  storedJourneys.slice(0, 5).forEach((journey) => {
    journey.waypoints.forEach((wp) => {
      points.push({
        x: wp.x,
        z: wp.z,
        weight: 0.35,
        source: 'historical_waypoint',
      });
    });
  });

  return points;
}

// Extract historical peak traffic points: combines historical journeys + peak cluster distribution
export function extractPeakHoursTrafficPoints(
  storedJourneys: ConsumerJourneyRecord[]
): HeatmapPoint[] {
  const syntheticPeak = generateHistoricalPeakPoints();
  const historicalPoints: HeatmapPoint[] = [];

  // Include all waypoints from stored journeys
  storedJourneys.forEach((journey) => {
    journey.waypoints.forEach((wp) => {
      const isHighDwell = wp.speed < 0.5 || wp.state === 'CHECKOUT_PAYING' || wp.state === 'BROWSING_SHELF';
      historicalPoints.push({
        x: wp.x,
        z: wp.z,
        weight: isHighDwell ? 0.9 : 0.5,
        source: 'historical_waypoint',
      });
    });
  });

  return [...syntheticPeak, ...historicalPoints];
}

// Compute zone density metrics for reporting and comparison
export function calculateZoneDensityMetrics(
  currentPoints: HeatmapPoint[],
  peakPoints: HeatmapPoint[]
): ZoneDensityMetric[] {
  return ZONE_DEFINITIONS.map((z) => {
    const inZone = (p: HeatmapPoint) =>
      p.x >= z.bounds.minX && p.x <= z.bounds.maxX && p.z >= z.bounds.minZ && p.z <= z.bounds.maxZ;

    const currPts = currentPoints.filter(inZone);
    const peakPts = peakPoints.filter(inZone);

    const currWeight = currPts.reduce((acc, p) => acc + p.weight, 0);
    const peakWeight = peakPts.reduce((acc, p) => acc + p.weight, 0);

    // Normalize density 0..100 based on area and peak capacity
    const currentDensity = Math.min(100, Math.round((currWeight / 18) * 100));
    const peakDensity = Math.min(100, Math.round((peakWeight / 55) * 100));

    let congestionStatus: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL' = 'NORMAL';
    if (peakDensity > 80) congestionStatus = 'CRITICAL';
    else if (peakDensity > 60) congestionStatus = 'HIGH';
    else if (peakDensity > 35) congestionStatus = 'ELEVATED';

    // Baseline dwell estimations
    const dwellMap: Record<string, number> = {
      ENTRANCE_PORTAL: 9,
      PRODUCE_FRESH: 42,
      AISLE_GROCERY_01: 34,
      AISLE_ELECTRONICS_02: 48,
      AISLE_SNACKS_03: 28,
      POS_CHECKOUT: 65,
      EAS_EXIT_PORTAL: 8,
    };

    return {
      zoneId: z.id,
      zoneName: z.name,
      color: z.color,
      currentDensity,
      peakDensity,
      currentShoppers: currPts.length,
      peakShoppersPerHour: Math.round(peakPts.length * 1.8),
      avgDwellSeconds: dwellMap[z.id] || 25,
      congestionStatus,
    };
  });
}

// Render density heatmap onto canvas
export function renderDensityHeatmapOnCanvas(
  canvas: HTMLCanvasElement,
  points: HeatmapPoint[],
  options: {
    radius?: number;
    opacity?: number;
    intensityMultiplier?: number;
  } = {}
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const radius = options.radius ?? 42;
  const opacity = options.opacity ?? 0.85;
  const intensity = options.intensityMultiplier ?? 1.0;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  if (points.length === 0) return;

  // Offscreen buffer for accumulating alpha intensity
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = width;
  shadowCanvas.height = height;
  const sCtx = shadowCanvas.getContext('2d');
  if (!sCtx) return;

  // Coordinate mapping from 3D world space (X: -18..18, Z: -14..16) to canvas space
  const mapX = (x: number) => ((x + 18) / 36) * (width - 40) + 20;
  const mapZ = (z: number) => ((z + 14) / 30) * (height - 60) + 30;

  // Step 1: Draw radial gaussian-like gradients into the shadow canvas with additive blending
  sCtx.fillStyle = 'rgba(0, 0, 0, 1)';
  sCtx.clearRect(0, 0, width, height);

  points.forEach((pt) => {
    const cx = mapX(pt.x);
    const cz = mapZ(pt.z);
    const ptRadius = radius * (0.8 + pt.weight * 0.4);

    const grad = sCtx.createRadialGradient(cx, cz, 0, cx, cz, ptRadius);
    const alpha = Math.min(1.0, 0.28 * pt.weight * intensity);
    grad.addColorStop(0, `rgba(0,0,0,${alpha})`);
    grad.addColorStop(0.4, `rgba(0,0,0,${alpha * 0.65})`);
    grad.addColorStop(0.8, `rgba(0,0,0,${alpha * 0.2})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    sCtx.fillStyle = grad;
    sCtx.beginPath();
    sCtx.arc(cx, cz, ptRadius, 0, Math.PI * 2);
    sCtx.fill();
  });

  // Step 2: Read pixel data from shadow canvas and recolor via a thermal density colormap
  const imgData = sCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Pre-generate 256-color gradient LUT
  const lut = createHeatmapColorLut(opacity);

  for (let i = 0; i < data.length; i += 4) {
    const alphaVal = data[i + 3];
    if (alphaVal > 2) {
      const lutIdx = Math.min(255, alphaVal);
      const color = lut[lutIdx];
      data[i] = color[0]; // R
      data[i + 1] = color[1]; // G
      data[i + 2] = color[2]; // B
      data[i + 3] = color[3]; // A
    } else {
      data[i + 3] = 0;
    }
  }

  // Draw recolored heatmap back to main display canvas
  ctx.putImageData(imgData, 0, 0);
}

// Generate high-contrast Surveillance Thermal Colormap:
// 0..40: Translucent Blue/Cyan
// 41..100: Emerald Green
// 101..160: Bright Yellow
// 161..210: Orange / Amber
// 211..255: Intense Crimson / Magenta
function createHeatmapColorLut(maxOpacity: number): number[][] {
  const lut: number[][] = [];
  const lutCanvas = document.createElement('canvas');
  lutCanvas.width = 256;
  lutCanvas.height = 1;
  const lCtx = lutCanvas.getContext('2d');

  if (!lCtx) {
    // Fallback LUT if 2D context fails
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      lut.push([Math.floor(255 * t), 0, Math.floor(255 * (1 - t)), Math.floor(255 * t * maxOpacity)]);
    }
    return lut;
  }

  const gradient = lCtx.createLinearGradient(0, 0, 256, 1);
  gradient.addColorStop(0.0, 'rgba(0, 30, 100, 0.0)');
  gradient.addColorStop(0.15, 'rgba(0, 120, 255, 0.35)');
  gradient.addColorStop(0.35, 'rgba(0, 230, 220, 0.65)');
  gradient.addColorStop(0.55, 'rgba(50, 235, 80, 0.85)');
  gradient.addColorStop(0.75, 'rgba(255, 220, 0, 0.95)');
  gradient.addColorStop(0.9, 'rgba(255, 70, 0, 1.0)');
  gradient.addColorStop(1.0, 'rgba(255, 0, 90, 1.0)');

  lCtx.fillStyle = gradient;
  lCtx.fillRect(0, 0, 256, 1);

  const raw = lCtx.getImageData(0, 0, 256, 1).data;
  for (let i = 0; i < 256; i++) {
    const idx = i * 4;
    const r = raw[idx];
    const g = raw[idx + 1];
    const b = raw[idx + 2];
    const a = Math.round(raw[idx + 3] * maxOpacity);
    lut.push([r, g, b, a]);
  }

  return lut;
}
