import {
  ShopperAgent,
  ConsumerJourneyRecord,
  ConsumerBuyingPattern,
  InsideMapWaypoint,
  BasketItemInteraction,
  ZoneDwellRecord,
  ShopperBehaviorState,
} from '@/components/surveillance/types';

const STORAGE_KEY = 'apex_surveillance_consumer_journeys_v1';

export const ZONE_DEFINITIONS = [
  { id: 'ENTRANCE_PORTAL', name: 'South Ingress Portal', bounds: { minX: -16, maxX: -2, minZ: 9, maxZ: 16 }, color: '#38bdf8' },
  { id: 'PRODUCE_FRESH', name: 'Produce & Fresh Bakery', bounds: { minX: -18, maxX: -10, minZ: -12, maxZ: 9 }, color: '#10b981' },
  { id: 'AISLE_GROCERY_01', name: 'Aisle 01 Pantry & Dry Goods', bounds: { minX: -10, maxX: -4, minZ: -12, maxZ: 9 }, color: '#f59e0b' },
  { id: 'AISLE_ELECTRONICS_02', name: 'Aisle 02 High-Value Electronics', bounds: { minX: -4, maxX: 3, minZ: -12, maxZ: 9 }, color: '#ef4444' },
  { id: 'AISLE_SNACKS_03', name: 'Aisle 03 Snacks & Beverages', bounds: { minX: 3, maxX: 9, minZ: -12, maxZ: 9 }, color: '#a855f7' },
  { id: 'POS_CHECKOUT', name: 'POS Checkout Lanes', bounds: { minX: 9, maxX: 18, minZ: -8, maxZ: 8 }, color: '#06b6d4' },
  { id: 'EAS_EXIT_PORTAL', name: 'EAS Anti-Theft Exit Gate', bounds: { minX: 6, maxX: 18, minZ: 8.5, maxZ: 16 }, color: '#f43f5e' },
];

export function getZoneFromPosition(x: number, z: number): { id: string; name: string } {
  for (const zone of ZONE_DEFINITIONS) {
    if (x >= zone.bounds.minX && x <= zone.bounds.maxX && z >= zone.bounds.minZ && z <= zone.bounds.maxZ) {
      return { id: zone.id, name: zone.name };
    }
  }
  // Fallback depending on general quadrants
  if (z > 8) return { id: 'ENTRANCE_PORTAL', name: 'South Ingress Portal' };
  if (x > 8) return { id: 'POS_CHECKOUT', name: 'POS Checkout Lanes' };
  return { id: 'AISLE_GROCERY_01', name: 'Aisle 01 Pantry & Dry Goods' };
}

// Realistic product pool for measuring buying interactions
const PRODUCT_CATALOG = {
  PRODUCE_FRESH: [
    { name: 'Organic Honeycrisp Apples', price: 4.99, cat: 'Produce' },
    { name: 'Artisan Sourdough Loaf', price: 6.50, cat: 'Bakery' },
    { name: 'California Avocados (3pk)', price: 5.25, cat: 'Produce' },
  ],
  AISLE_GROCERY_01: [
    { name: 'Extra Virgin Olive Oil 750ml', price: 18.99, cat: 'Pantry' },
    { name: 'Organic Colombian Dark Roast', price: 14.50, cat: 'Coffee' },
    { name: 'Gluten-Free Whole Grain Penne', price: 3.89, cat: 'Pantry' },
  ],
  AISLE_ELECTRONICS_02: [
    { name: 'Noise-Cancelling Wireless Headphones', price: 249.99, cat: 'Electronics' },
    { name: '4K Ultra-Compact Action Camera', price: 299.00, cat: 'Electronics' },
    { name: 'Bluetooth Smart Watch Series 7', price: 349.50, cat: 'Electronics' },
    { name: 'Smart Video Doorbell Sensor', price: 189.99, cat: 'Electronics' },
  ],
  AISLE_SNACKS_03: [
    { name: 'Dark Chocolate Sea Salt Truffles', price: 8.99, cat: 'Confectionery' },
    { name: 'Cold-Pressed Immunity Green Juice', price: 4.75, cat: 'Beverages' },
    { name: 'Artisan Smoked Almonds & Cashews', price: 6.25, cat: 'Snacks' },
  ],
};

// Seed realistic historical customer journeys so dataset is rich from turn 1
function generateInitialHistoricalJourneys(): ConsumerJourneyRecord[] {
  const baseTime = Date.now() - 3600 * 1000; // 1 hour ago
  const records: ConsumerJourneyRecord[] = [
    {
      id: 'CUST-089',
      badgeNumber: 89,
      gender: 'F',
      ageBracket: '26-35',
      estimatedAge: 29,
      status: 'COMPLETED',
      entryTime: baseTime + 120000,
      exitTime: baseTime + 165000,
      durationSeconds: 45,
      entryPoint: [-7.2, 0, 14.0],
      exitPoint: [9.1, 0, 14.8],
      pathLengthMeters: 38.4,
      currentZone: 'EAS Anti-Theft Exit Gate',
      zonesVisited: [
        { zoneId: 'ENTRANCE_PORTAL', zoneName: 'South Ingress Portal', entryTime: baseTime + 120000, exitTime: baseTime + 126000, dwellSeconds: 6, itemsInteracted: 0 },
        { zoneId: 'AISLE_GROCERY_01', zoneName: 'Aisle 01 Pantry & Dry Goods', entryTime: baseTime + 126000, exitTime: baseTime + 144000, dwellSeconds: 18, itemsInteracted: 2 },
        { zoneId: 'POS_CHECKOUT', zoneName: 'POS Checkout Lanes', entryTime: baseTime + 144000, exitTime: baseTime + 160000, dwellSeconds: 16, itemsInteracted: 0 },
        { zoneId: 'EAS_EXIT_PORTAL', zoneName: 'EAS Anti-Theft Exit Gate', entryTime: baseTime + 160000, exitTime: baseTime + 165000, dwellSeconds: 5, itemsInteracted: 0 },
      ],
      basket: [
        { id: 'item-89-1', name: 'Extra Virgin Olive Oil 750ml', category: 'Pantry', price: 18.99, timestamp: baseTime + 132000, action: 'added_to_cart' },
        { id: 'item-89-2', name: 'Gluten-Free Whole Grain Penne', category: 'Pantry', price: 3.89, timestamp: baseTime + 138000, action: 'added_to_cart' },
      ],
      cartItemCount: 2,
      cartTotalValue: 22.88,
      conversionOutcome: 'PURCHASED',
      buyingPattern: 'QUICK_GRAB_AND_GO',
      patternConfidence: 94,
      patternReasoning: 'Rapid direct corridor traversal to Aisle 01 essentials with immediate conversion at POS Checkout in under 45 seconds.',
      routeCategory: 'Express-Run',
      waypoints: [
        { x: -7.2, z: 14.0, timestamp: baseTime + 120000, timeFormatted: '11:02:00', zone: 'South Ingress Portal', speed: 1.8, action: 'Entering store', state: 'ENTERING' },
        { x: -6.8, z: 8.5, timestamp: baseTime + 125000, timeFormatted: '11:02:05', zone: 'South Ingress Portal', speed: 1.6, action: 'Heading north', state: 'WALKING_AISLE' },
        { x: -7.0, z: 2.4, timestamp: baseTime + 132000, timeFormatted: '11:02:12', zone: 'Aisle 01 Pantry & Dry Goods', speed: 0.2, action: 'Examining olive oil', state: 'BROWSING_SHELF' },
        { x: -7.0, z: -1.2, timestamp: baseTime + 138000, timeFormatted: '11:02:18', zone: 'Aisle 01 Pantry & Dry Goods', speed: 0.1, action: 'Adding pasta to basket', state: 'PICKING_ITEM' },
        { x: 3.0, z: 1.5, timestamp: baseTime + 148000, timeFormatted: '11:02:28', zone: 'POS Checkout Lanes', speed: 1.7, action: 'Approaching POS lane', state: 'HEADING_CHECKOUT' },
        { x: 10.5, z: 2.0, timestamp: baseTime + 155000, timeFormatted: '11:02:35', zone: 'POS Checkout Lanes', speed: 0.0, action: 'POS barcode scan', state: 'CHECKOUT_PAYING' },
        { x: 9.1, z: 14.8, timestamp: baseTime + 165000, timeFormatted: '11:02:45', zone: 'EAS Anti-Theft Exit Gate', speed: 1.5, action: 'Authorized exit', state: 'EXITING' },
      ],
    },
    {
      id: 'CUST-092',
      badgeNumber: 92,
      gender: 'M',
      ageBracket: '18-25',
      estimatedAge: 23,
      status: 'COMPLETED',
      entryTime: baseTime + 300000,
      exitTime: baseTime + 395000,
      durationSeconds: 95,
      entryPoint: [-7.0, 0, 14.0],
      exitPoint: [9.0, 0, 14.5],
      pathLengthMeters: 64.2,
      currentZone: 'EAS Anti-Theft Exit Gate',
      zonesVisited: [
        { zoneId: 'ENTRANCE_PORTAL', zoneName: 'South Ingress Portal', entryTime: baseTime + 300000, exitTime: baseTime + 308000, dwellSeconds: 8, itemsInteracted: 0 },
        { zoneId: 'AISLE_ELECTRONICS_02', zoneName: 'Aisle 02 High-Value Electronics', entryTime: baseTime + 308000, exitTime: baseTime + 360000, dwellSeconds: 52, itemsInteracted: 3 },
        { zoneId: 'POS_CHECKOUT', zoneName: 'POS Checkout Lanes', entryTime: baseTime + 360000, exitTime: baseTime + 388000, dwellSeconds: 28, itemsInteracted: 0 },
        { zoneId: 'EAS_EXIT_PORTAL', zoneName: 'EAS Anti-Theft Exit Gate', entryTime: baseTime + 388000, exitTime: baseTime + 395000, dwellSeconds: 7, itemsInteracted: 0 },
      ],
      basket: [
        { id: 'item-92-1', name: 'Noise-Cancelling Wireless Headphones', category: 'Electronics', price: 249.99, timestamp: baseTime + 345000, action: 'added_to_cart' },
      ],
      cartItemCount: 1,
      cartTotalValue: 249.99,
      conversionOutcome: 'PURCHASED',
      buyingPattern: 'TARGETED_BUYER',
      patternConfidence: 96,
      patternReasoning: 'Over 55% of total in-store dwell concentrated exclusively on high-value electronics display with targeted single-ticket purchase.',
      routeCategory: 'Direct-to-Electronics',
      waypoints: [
        { x: -7.0, z: 14.0, timestamp: baseTime + 300000, timeFormatted: '11:05:00', zone: 'South Ingress Portal', speed: 1.7, action: 'Ingress', state: 'ENTERING' },
        { x: -1.0, z: 8.0, timestamp: baseTime + 308000, timeFormatted: '11:05:08', zone: 'Aisle 02 High-Value Electronics', speed: 1.5, action: 'Crossing to Aisle 2', state: 'WALKING_AISLE' },
        { x: -0.5, z: 0.0, timestamp: baseTime + 325000, timeFormatted: '11:05:25', zone: 'Aisle 02 High-Value Electronics', speed: 0.1, action: 'Inspecting headphones box', state: 'BROWSING_SHELF' },
        { x: -0.4, z: -2.5, timestamp: baseTime + 345000, timeFormatted: '11:05:45', zone: 'Aisle 02 High-Value Electronics', speed: 0.2, action: 'Placing audio gear into basket', state: 'PICKING_ITEM' },
        { x: 5.0, z: 0.0, timestamp: baseTime + 365000, timeFormatted: '11:06:05', zone: 'POS Checkout Lanes', speed: 1.6, action: 'Direct path to register', state: 'HEADING_CHECKOUT' },
        { x: 10.5, z: 2.0, timestamp: baseTime + 380000, timeFormatted: '11:06:20', zone: 'POS Checkout Lanes', speed: 0.0, action: 'NFC card payment completed', state: 'CHECKOUT_PAYING' },
        { x: 9.0, z: 14.5, timestamp: baseTime + 395000, timeFormatted: '11:06:35', zone: 'EAS Anti-Theft Exit Gate', speed: 1.4, action: 'Store egress', state: 'EXITING' },
      ],
    },
    {
      id: 'CUST-095',
      badgeNumber: 95,
      gender: 'F',
      ageBracket: '36-50',
      estimatedAge: 42,
      status: 'COMPLETED',
      entryTime: baseTime + 500000,
      exitTime: baseTime + 640000,
      durationSeconds: 140,
      entryPoint: [-7.1, 0, 14.0],
      exitPoint: [9.2, 0, 14.6],
      pathLengthMeters: 92.5,
      currentZone: 'EAS Anti-Theft Exit Gate',
      zonesVisited: [
        { zoneId: 'ENTRANCE_PORTAL', zoneName: 'South Ingress Portal', entryTime: baseTime + 500000, exitTime: baseTime + 510000, dwellSeconds: 10, itemsInteracted: 0 },
        { zoneId: 'PRODUCE_FRESH', zoneName: 'Produce & Fresh Bakery', entryTime: baseTime + 510000, exitTime: baseTime + 550000, dwellSeconds: 40, itemsInteracted: 2 },
        { zoneId: 'AISLE_GROCERY_01', zoneName: 'Aisle 01 Pantry & Dry Goods', entryTime: baseTime + 550000, exitTime: baseTime + 590000, dwellSeconds: 40, itemsInteracted: 2 },
        { zoneId: 'AISLE_SNACKS_03', zoneName: 'Aisle 03 Snacks & Beverages', entryTime: baseTime + 590000, exitTime: baseTime + 615000, dwellSeconds: 25, itemsInteracted: 1 },
        { zoneId: 'POS_CHECKOUT', zoneName: 'POS Checkout Lanes', entryTime: baseTime + 615000, exitTime: baseTime + 635000, dwellSeconds: 20, itemsInteracted: 0 },
        { zoneId: 'EAS_EXIT_PORTAL', zoneName: 'EAS Anti-Theft Exit Gate', entryTime: baseTime + 635000, exitTime: baseTime + 640000, dwellSeconds: 5, itemsInteracted: 0 },
      ],
      basket: [
        { id: 'item-95-1', name: 'Organic Honeycrisp Apples', category: 'Produce', price: 4.99, timestamp: baseTime + 525000, action: 'added_to_cart' },
        { id: 'item-95-2', name: 'Artisan Sourdough Loaf', category: 'Bakery', price: 6.50, timestamp: baseTime + 540000, action: 'added_to_cart' },
        { id: 'item-95-3', name: 'Organic Colombian Dark Roast', category: 'Coffee', price: 14.50, timestamp: baseTime + 575000, action: 'added_to_cart' },
        { id: 'item-95-4', name: 'Cold-Pressed Immunity Green Juice', category: 'Beverages', price: 4.75, timestamp: baseTime + 605000, action: 'added_to_cart' },
      ],
      cartItemCount: 4,
      cartTotalValue: 30.74,
      conversionOutcome: 'PURCHASED',
      buyingPattern: 'EXPLORATORY_BROWSER',
      patternConfidence: 93,
      patternReasoning: 'Comprehensive multi-department circuit through Produce, Pantry, and Beverages with balanced shelf dwell and multi-item basket conversion.',
      routeCategory: 'Perimeter-Loop',
      waypoints: [
        { x: -7.1, z: 14.0, timestamp: baseTime + 500000, timeFormatted: '11:08:20', zone: 'South Ingress Portal', speed: 1.5, action: 'Entrance', state: 'ENTERING' },
        { x: -14.0, z: 6.0, timestamp: baseTime + 520000, timeFormatted: '11:08:40', zone: 'Produce & Fresh Bakery', speed: 0.8, action: 'Selecting fruit', state: 'BROWSING_SHELF' },
        { x: -13.5, z: -1.0, timestamp: baseTime + 540000, timeFormatted: '11:09:00', zone: 'Produce & Fresh Bakery', speed: 0.3, action: 'Bakery shelf inspection', state: 'PICKING_ITEM' },
        { x: -7.0, z: 0.0, timestamp: baseTime + 575000, timeFormatted: '11:09:35', zone: 'Aisle 01 Pantry & Dry Goods', speed: 0.5, action: 'Selecting coffee', state: 'PICKING_ITEM' },
        { x: 5.5, z: 2.0, timestamp: baseTime + 605000, timeFormatted: '11:10:05', zone: 'Aisle 03 Snacks & Beverages', speed: 0.6, action: 'Picking cold beverage', state: 'PICKING_ITEM' },
        { x: 10.5, z: 2.0, timestamp: baseTime + 625000, timeFormatted: '11:10:25', zone: 'POS Checkout Lanes', speed: 0.0, action: 'Checkout lane 1 payment', state: 'CHECKOUT_PAYING' },
        { x: 9.2, z: 14.6, timestamp: baseTime + 640000, timeFormatted: '11:10:40', zone: 'EAS Anti-Theft Exit Gate', speed: 1.4, action: 'Normal departure', state: 'EXITING' },
      ],
    },
    {
      id: 'CUST-098',
      badgeNumber: 98,
      gender: 'M',
      ageBracket: '26-35',
      estimatedAge: 31,
      status: 'APPREHENDED',
      entryTime: baseTime + 750000,
      exitTime: baseTime + 805000,
      durationSeconds: 55,
      entryPoint: [-6.8, 0, 14.0],
      exitPoint: [9.0, 0, 12.0],
      pathLengthMeters: 46.8,
      currentZone: 'EAS Anti-Theft Exit Gate',
      zonesVisited: [
        { zoneId: 'ENTRANCE_PORTAL', zoneName: 'South Ingress Portal', entryTime: baseTime + 750000, exitTime: baseTime + 756000, dwellSeconds: 6, itemsInteracted: 0 },
        { zoneId: 'AISLE_ELECTRONICS_02', zoneName: 'Aisle 02 High-Value Electronics', entryTime: baseTime + 756000, exitTime: baseTime + 788000, dwellSeconds: 32, itemsInteracted: 1 },
        { zoneId: 'EAS_EXIT_PORTAL', zoneName: 'EAS Anti-Theft Exit Gate', entryTime: baseTime + 788000, exitTime: baseTime + 805000, dwellSeconds: 17, itemsInteracted: 0 },
      ],
      basket: [
        { id: 'item-98-1', name: 'Bluetooth Smart Watch Series 7', category: 'Electronics', price: 349.50, timestamp: baseTime + 780000, action: 'concealed' },
      ],
      cartItemCount: 1,
      cartTotalValue: 349.50,
      conversionOutcome: 'THEFT',
      buyingPattern: 'LOSS_PREVENTION_RISK',
      patternConfidence: 98,
      patternReasoning: 'Anomalous trajectory bypassing cash registers, hand-to-jacket concealment gesture at electronics display, and sprint attempt to exit barrier.',
      routeCategory: 'Sprint-Bypass',
      waypoints: [
        { x: -6.8, z: 14.0, timestamp: baseTime + 750000, timeFormatted: '11:12:30', zone: 'South Ingress Portal', speed: 2.4, action: 'Fast ingress', state: 'ENTERING' },
        { x: -0.5, z: 2.0, timestamp: baseTime + 760000, timeFormatted: '11:12:40', zone: 'Aisle 02 High-Value Electronics', speed: 1.8, action: 'Approaching display', state: 'WALKING_AISLE' },
        { x: -0.5, z: -2.0, timestamp: baseTime + 775000, timeFormatted: '11:12:55', zone: 'Aisle 02 High-Value Electronics', speed: 0.1, action: 'Surveillance avoidance scanning', state: 'LOITERING_HIGH_VALUE' },
        { x: -0.4, z: -2.0, timestamp: baseTime + 780000, timeFormatted: '11:13:00', zone: 'Aisle 02 High-Value Electronics', speed: 0.0, action: 'Item concealed in jacket pocket', state: 'CONCEALMENT' },
        { x: 4.0, z: 7.0, timestamp: baseTime + 792000, timeFormatted: '11:13:12', zone: 'EAS Anti-Theft Exit Gate', speed: 4.2, action: 'Bypassing checkout at sprint speed', state: 'SPRINT_THEFT' },
        { x: 9.0, z: 12.0, timestamp: baseTime + 800000, timeFormatted: '11:13:20', zone: 'EAS Anti-Theft Exit Gate', speed: 0.0, action: 'Intercepted at EAS gate barrier', state: 'INTERCEPTED' },
      ],
    },
    {
      id: 'CUST-100',
      badgeNumber: 100,
      gender: 'F',
      ageBracket: '18-25',
      estimatedAge: 21,
      status: 'COMPLETED',
      entryTime: baseTime + 950000,
      exitTime: baseTime + 1020000,
      durationSeconds: 70,
      entryPoint: [-7.0, 0, 14.0],
      exitPoint: [9.3, 0, 14.7],
      pathLengthMeters: 49.0,
      currentZone: 'EAS Anti-Theft Exit Gate',
      zonesVisited: [
        { zoneId: 'ENTRANCE_PORTAL', zoneName: 'South Ingress Portal', entryTime: baseTime + 950000, exitTime: baseTime + 958000, dwellSeconds: 8, itemsInteracted: 0 },
        { zoneId: 'AISLE_SNACKS_03', zoneName: 'Aisle 03 Snacks & Beverages', entryTime: baseTime + 958000, exitTime: baseTime + 995000, dwellSeconds: 37, itemsInteracted: 2 },
        { zoneId: 'POS_CHECKOUT', zoneName: 'POS Checkout Lanes', entryTime: baseTime + 995000, exitTime: baseTime + 1014000, dwellSeconds: 19, itemsInteracted: 0 },
        { zoneId: 'EAS_EXIT_PORTAL', zoneName: 'EAS Anti-Theft Exit Gate', entryTime: baseTime + 1014000, exitTime: baseTime + 1020000, dwellSeconds: 6, itemsInteracted: 0 },
      ],
      basket: [
        { id: 'item-100-1', name: 'Dark Chocolate Sea Salt Truffles', category: 'Confectionery', price: 8.99, timestamp: baseTime + 975000, action: 'added_to_cart' },
        { id: 'item-100-2', name: 'Artisan Smoked Almonds & Cashews', category: 'Snacks', price: 6.25, timestamp: baseTime + 988000, action: 'added_to_cart' },
      ],
      cartItemCount: 2,
      cartTotalValue: 15.24,
      conversionOutcome: 'PURCHASED',
      buyingPattern: 'IMPULSE_SHOPPER',
      patternConfidence: 91,
      patternReasoning: 'Direct navigation to snack endcap, browsing impulse confection items, rapid checkout with sub-$20 confectionery basket.',
      routeCategory: 'Direct-to-Snacks',
      waypoints: [
        { x: -7.0, z: 14.0, timestamp: baseTime + 950000, timeFormatted: '11:15:50', zone: 'South Ingress Portal', speed: 1.6, action: 'Ingress', state: 'ENTERING' },
        { x: 5.5, z: 5.0, timestamp: baseTime + 965000, timeFormatted: '11:16:05', zone: 'Aisle 03 Snacks & Beverages', speed: 1.4, action: 'Snack endcap inspection', state: 'BROWSING_SHELF' },
        { x: 6.0, z: -1.0, timestamp: baseTime + 980000, timeFormatted: '11:16:20', zone: 'Aisle 03 Snacks & Beverages', speed: 0.3, action: 'Taking chocolate & nuts', state: 'PICKING_ITEM' },
        { x: 10.5, z: 2.0, timestamp: baseTime + 1000000, timeFormatted: '11:16:40', zone: 'POS Checkout Lanes', speed: 0.0, action: 'Self-checkout scan', state: 'CHECKOUT_PAYING' },
        { x: 9.3, z: 14.7, timestamp: baseTime + 1020000, timeFormatted: '11:17:00', zone: 'EAS Anti-Theft Exit Gate', speed: 1.4, action: 'Store exit', state: 'EXITING' },
      ],
    },
  ];

  return records;
}

export class ConsumerJourneyTracker {
  private static instance: ConsumerJourneyTracker;
  private storedJourneys: ConsumerJourneyRecord[] = [];
  private activeJourneys = new Map<string, ConsumerJourneyRecord>();
  private listeners: Set<() => void> = new Set();
  private lastWaypointTimes = new Map<string, number>();

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): ConsumerJourneyTracker {
    if (!ConsumerJourneyTracker.instance) {
      ConsumerJourneyTracker.instance = new ConsumerJourneyTracker();
    }
    return ConsumerJourneyTracker.instance;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.storedJourneys = parsed;
          return;
        }
      }
    } catch {
      // Fallback
    }

    // Initialize with rich historical data
    this.storedJourneys = generateInitialHistoricalJourneys();
    this.saveToStorage();
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      // Retain up to 100 most recent customer journeys to ensure deep pattern history
      const trimmed = this.storedJourneys.slice(-100);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Handle quota limit gracefully
    }
  }

  public registerNewCustomer(agent: ShopperAgent) {
    if (this.activeJourneys.has(agent.id)) return;

    const initialZone = getZoneFromPosition(agent.position[0], agent.position[2]);
    const now = Date.now();
    const timeFormatted = new Date(now).toTimeString().split(' ')[0];

    const initialWaypoint: InsideMapWaypoint = {
      x: Math.round(agent.position[0] * 100) / 100,
      z: Math.round(agent.position[2] * 100) / 100,
      timestamp: now,
      timeFormatted,
      zone: initialZone.name,
      speed: Math.round(agent.speed * 10) / 10,
      action: agent.currentActionText,
      state: agent.state,
    };

    const initialDwell: ZoneDwellRecord = {
      zoneId: initialZone.id,
      zoneName: initialZone.name,
      entryTime: now,
      dwellSeconds: 0,
      itemsInteracted: 0,
    };

    const record: ConsumerJourneyRecord = {
      id: agent.id,
      badgeNumber: agent.badgeNumber,
      gender: agent.gender,
      ageBracket: agent.ageBracket,
      estimatedAge: agent.estimatedAge,
      status: 'ACTIVE_IN_STORE',
      entryTime: now,
      exitTime: null,
      durationSeconds: 0,
      entryPoint: [agent.position[0], agent.position[1], agent.position[2]],
      exitPoint: null,
      waypoints: [initialWaypoint],
      pathLengthMeters: 0,
      zonesVisited: [initialDwell],
      currentZone: initialZone.name,
      basket: [],
      cartItemCount: 0,
      cartTotalValue: 0,
      conversionOutcome: 'IN_PROGRESS',
      buyingPattern: agent.isThief ? 'LOSS_PREVENTION_RISK' : 'EXPLORATORY_BROWSER',
      patternConfidence: 80,
      patternReasoning: 'Initial store ingress and route orientation.',
      routeCategory: 'Standard-Ingress',
    };

    this.activeJourneys.set(agent.id, record);
    this.lastWaypointTimes.set(agent.id, now);
  }

  public recordAgentMotion(agent: ShopperAgent, delta: number) {
    let journey = this.activeJourneys.get(agent.id);
    if (!journey) {
      this.registerNewCustomer(agent);
      journey = this.activeJourneys.get(agent.id);
      if (!journey) return;
    }

    const now = Date.now();
    journey.durationSeconds += delta;

    // Check zone transition
    const currentZone = getZoneFromPosition(agent.position[0], agent.position[2]);
    const currentActiveDwell = journey.zonesVisited[journey.zonesVisited.length - 1];

    if (currentActiveDwell && currentActiveDwell.zoneId === currentZone.id) {
      currentActiveDwell.dwellSeconds += delta;
    } else {
      // Transitioned to another store zone
      if (currentActiveDwell) {
        currentActiveDwell.exitTime = now;
      }
      journey.zonesVisited.push({
        zoneId: currentZone.id,
        zoneName: currentZone.name,
        entryTime: now,
        dwellSeconds: delta,
        itemsInteracted: 0,
      });
      journey.currentZone = currentZone.name;
    }

    // Sample waypoints every ~0.6 seconds or when state changes
    const lastSample = this.lastWaypointTimes.get(agent.id) || 0;
    const lastWaypoint = journey.waypoints[journey.waypoints.length - 1];
    const distFromLast = lastWaypoint
      ? Math.hypot(agent.position[0] - lastWaypoint.x, agent.position[2] - lastWaypoint.z)
      : 1.0;

    if (now - lastSample > 600 || distFromLast > 1.2 || (lastWaypoint && lastWaypoint.state !== agent.state)) {
      this.lastWaypointTimes.set(agent.id, now);
      journey.pathLengthMeters += distFromLast;

      journey.waypoints.push({
        x: Math.round(agent.position[0] * 100) / 100,
        z: Math.round(agent.position[2] * 100) / 100,
        timestamp: now,
        timeFormatted: new Date(now).toTimeString().split(' ')[0],
        zone: currentZone.name,
        speed: Math.round(agent.speed * 10) / 10,
        action: agent.currentActionText,
        state: agent.state,
      });

      // Keep max 150 waypoints per journey to conserve memory while retaining fine resolution
      if (journey.waypoints.length > 150) {
        // preserve first point (entry) and downsample
        journey.waypoints.splice(1, 1);
      }

      this.classifyBuyingPattern(journey, agent);
    }
  }

  public recordProductInteraction(agentId: string, action: 'inspected' | 'added_to_cart' | 'abandoned' | 'concealed') {
    const journey = this.activeJourneys.get(agentId);
    if (!journey) return;

    const currentZone = journey.zonesVisited[journey.zonesVisited.length - 1];
    const zoneKey = (currentZone?.zoneId as keyof typeof PRODUCT_CATALOG) || 'AISLE_GROCERY_01';
    const catalog = PRODUCT_CATALOG[zoneKey] || PRODUCT_CATALOG.AISLE_GROCERY_01;
    const randomProduct = catalog[Math.floor(Math.random() * catalog.length)];

    const item: BasketItemInteraction = {
      id: `item-${agentId}-${journey.basket.length + 1}`,
      name: randomProduct.name,
      category: randomProduct.cat,
      price: randomProduct.price,
      timestamp: Date.now(),
      action,
    };

    journey.basket.push(item);
    if (currentZone) {
      currentZone.itemsInteracted += 1;
    }

    if (action === 'added_to_cart' || action === 'concealed') {
      journey.cartItemCount += 1;
      journey.cartTotalValue = Math.round((journey.cartTotalValue + randomProduct.price) * 100) / 100;
    }

    this.classifyBuyingPattern(journey);
  }

  private classifyBuyingPattern(journey: ConsumerJourneyRecord, agent?: ShopperAgent) {
    const isThief = agent?.isThief || journey.basket.some((b) => b.action === 'concealed');
    const hasConcealed = agent?.hasConcealedItem || journey.basket.some((b) => b.action === 'concealed');
    const electronicsDwell = journey.zonesVisited
      .filter((z) => z.zoneId === 'AISLE_ELECTRONICS_02')
      .reduce((acc, curr) => acc + curr.dwellSeconds, 0);

    if (isThief || hasConcealed || journey.conversionOutcome === 'THEFT') {
      journey.buyingPattern = 'LOSS_PREVENTION_RISK';
      journey.patternConfidence = 98;
      journey.patternReasoning =
        'High anomalous intent trajectory, surveillance avoidance scanning, item concealed without POS registration.';
      journey.routeCategory = 'Sprint-Bypass';
      return;
    }

    if (journey.durationSeconds < 35 && journey.cartItemCount <= 2 && journey.zonesVisited.length <= 3) {
      journey.buyingPattern = 'QUICK_GRAB_AND_GO';
      journey.patternConfidence = 94;
      journey.patternReasoning =
        'Direct low-friction ingress-to-checkout sequence with minimal aisle wandering and rapid checkout conversion.';
      journey.routeCategory = 'Express-Run';
      return;
    }

    if (journey.cartTotalValue > 150 || (electronicsDwell > 15 && journey.cartItemCount >= 1)) {
      journey.buyingPattern = 'TARGETED_BUYER';
      journey.patternConfidence = 92;
      journey.patternReasoning =
        'Concentrated navigation directly to high-value technology shelves with high consideration and high basket spend.';
      journey.routeCategory = 'Direct-to-Electronics';
      return;
    }

    const uniqueZones = new Set(journey.zonesVisited.map((z) => z.zoneId));
    if (uniqueZones.size >= 4 && journey.durationSeconds > 45) {
      journey.buyingPattern = 'EXPLORATORY_BROWSER';
      journey.patternConfidence = 91;
      journey.patternReasoning =
        'Extensive store circulation traversing 4+ unique departments with multiple shelf evaluations and steady basket accumulation.';
      journey.routeCategory = 'Perimeter-Loop';
      return;
    }

    if (journey.basket.some((b) => b.category === 'Confectionery' || b.category === 'Snacks' || b.category === 'Beverages')) {
      journey.buyingPattern = 'IMPULSE_SHOPPER';
      journey.patternConfidence = 88;
      journey.patternReasoning =
        'Frequent mid-aisle hesitations near endcaps with high conversion for impulse confectionery and beverages.';
      journey.routeCategory = 'Direct-to-Snacks';
      return;
    }

    // Default
    journey.buyingPattern = 'BARGAIN_COMPARISON';
    journey.patternConfidence = 86;
    journey.patternReasoning =
      'Balanced dwell duration across dry goods shelves with deliberate product price and nutritional label comparisons.';
    journey.routeCategory = 'S-Curve-Through-Aisles';
  }

  public finalizeCustomerJourney(agentId: string, outcome: 'PURCHASED' | 'THEFT' | 'WALKOUT_EMPTY') {
    const journey = this.activeJourneys.get(agentId);
    if (!journey) return;

    const now = Date.now();
    journey.exitTime = now;
    journey.conversionOutcome = outcome;
    journey.status = outcome === 'THEFT' ? 'APPREHENDED' : 'COMPLETED';

    const lastWaypoint = journey.waypoints[journey.waypoints.length - 1];
    journey.exitPoint = lastWaypoint ? [lastWaypoint.x, 0, lastWaypoint.z] : [9.0, 0, 14.5];

    // Finalize last active zone dwell
    const lastDwell = journey.zonesVisited[journey.zonesVisited.length - 1];
    if (lastDwell && !lastDwell.exitTime) {
      lastDwell.exitTime = now;
    }

    // Classify final pattern
    this.classifyBuyingPattern(journey);

    // Push into stored database
    this.storedJourneys.unshift({ ...journey });
    this.activeJourneys.delete(agentId);
    this.lastWaypointTimes.delete(agentId);

    this.saveToStorage();
    this.notify();
  }

  public getAllStoredJourneys(): ConsumerJourneyRecord[] {
    return [...this.storedJourneys];
  }

  public getActiveJourneys(): ConsumerJourneyRecord[] {
    return Array.from(this.activeJourneys.values());
  }

  public clearAllStoredJourneys() {
    this.storedJourneys = [];
    this.saveToStorage();
    this.notify();
  }

  public resetToSampleShiftData() {
    this.storedJourneys = generateInitialHistoricalJourneys();
    this.saveToStorage();
    this.notify();
  }

  public exportAsJson(): string {
    return JSON.stringify(
      {
        dataset: 'Apex Sentinel AI - Retail Consumer Buying Behavior & Trajectory Database',
        exportedAt: new Date().toISOString(),
        totalCustomerRecords: this.storedJourneys.length,
        journeys: this.storedJourneys,
      },
      null,
      2
    );
  }

  public exportAsCsv(): string {
    const headers = [
      'Customer_ID',
      'Gender',
      'Age_Bracket',
      'Estimated_Age',
      'Status',
      'Duration_Seconds',
      'Path_Length_Meters',
      'Waypoints_Count',
      'Cart_Item_Count',
      'Cart_Total_USD',
      'Conversion_Outcome',
      'Buying_Pattern',
      'Pattern_Confidence_Pct',
      'Route_Category',
      'Entry_Time',
      'Exit_Time',
      'Zones_Visited_Sequence',
      'Basket_Items_Summary',
    ];

    const rows = this.storedJourneys.map((j) => {
      const zonesSeq = j.zonesVisited.map((z) => z.zoneName).join(' -> ');
      const basketSum = j.basket.map((b) => `${b.name}($${b.price})[${b.action}]`).join(' | ');

      return [
        `"${j.id}"`,
        `"${j.gender}"`,
        `"${j.ageBracket}"`,
        j.estimatedAge,
        `"${j.status}"`,
        Math.round(j.durationSeconds),
        j.pathLengthMeters.toFixed(1),
        j.waypoints.length,
        j.cartItemCount,
        j.cartTotalValue.toFixed(2),
        `"${j.conversionOutcome}"`,
        `"${j.buyingPattern}"`,
        j.patternConfidence,
        `"${j.routeCategory}"`,
        `"${new Date(j.entryTime).toISOString()}"`,
        `"${j.exitTime ? new Date(j.exitTime).toISOString() : 'N/A'}"`,
        `"${zonesSeq.replace(/"/g, '""')}"`,
        `"${basketSum.replace(/"/g, '""')}"`,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  public getAggregatedMetrics(records?: ConsumerJourneyRecord[]) {
    const list = records || this.storedJourneys;
    const total = list.length;
    if (total === 0) {
      return {
        totalJourneys: 0,
        avgDurationSec: 0,
        avgPathLengthM: 0,
        conversionRate: 0,
        theftRate: 0,
        avgBasketValue: 0,
        patternDistribution: {} as Record<ConsumerBuyingPattern, number>,
      };
    }

    let sumDuration = 0;
    let sumPathLength = 0;
    let sumPurchases = 0;
    let sumThefts = 0;
    let sumBasketVal = 0;
    const distribution: Record<string, number> = {};

    list.forEach((j) => {
      sumDuration += j.durationSeconds;
      sumPathLength += j.pathLengthMeters;
      if (j.conversionOutcome === 'PURCHASED') sumPurchases++;
      if (j.conversionOutcome === 'THEFT') sumThefts++;
      sumBasketVal += j.cartTotalValue;
      distribution[j.buyingPattern] = (distribution[j.buyingPattern] || 0) + 1;
    });

    return {
      totalJourneys: total,
      avgDurationSec: Math.round(sumDuration / total),
      avgPathLengthM: Math.round((sumPathLength / total) * 10) / 10,
      conversionRate: Math.round((sumPurchases / total) * 100),
      theftRate: Math.round((sumThefts / total) * 100),
      avgBasketValue: Math.round((sumBasketVal / total) * 100) / 100,
      patternDistribution: distribution as Record<ConsumerBuyingPattern, number>,
    };
  }
}

export const consumerJourneyTracker = ConsumerJourneyTracker.getInstance();
