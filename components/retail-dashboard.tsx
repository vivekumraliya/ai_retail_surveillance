'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ShieldAlert, Users, Activity, AlertTriangle, Video, Eye, Bell, CheckCircle, Crosshair } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
type Point = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number; name: string; type: 'shelf' | 'billing' | 'entrance' | 'exit' };

type CustomerState = 'ENTERING' | 'BROWSING' | 'BILLING' | 'EXITING' | 'STEALING' | 'ESCAPED';

interface Customer {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  color: string;
  state: CustomerState;
  target: Point | null;
  path: Point[];
  isThief: boolean;
  dwellTime: number;
  maxDwellTime: number;
  visitedShelves: number;
  hasStolen: boolean;
  alerted: boolean;
}

interface Alert {
  id: string;
  time: string;
  message: string;
  type: 'info' | 'warning' | 'critical';
}

interface Stats {
  footfall: number;
  active: number;
  suspicious: number;
  prevented: number;
}

// --- Constants & Layout ---
const STORE_WIDTH = 800;
const STORE_HEIGHT = 600;

const ZONES: Rect[] = [
  { x: 50, y: 500, w: 120, h: 80, name: 'Entrance', type: 'entrance' },
  { x: 630, y: 500, w: 120, h: 80, name: 'Exit', type: 'exit' },
  { x: 630, y: 100, w: 120, h: 100, name: 'Billing', type: 'billing' },
  { x: 200, y: 120, w: 60, h: 300, name: 'Electronics', type: 'shelf' },
  { x: 350, y: 120, w: 60, h: 300, name: 'Cosmetics', type: 'shelf' },
  { x: 500, y: 120, w: 60, h: 300, name: 'Clothing', type: 'shelf' },
];

const CCTV_VIEWS = [
  { id: 'cam1', name: 'Entrance Cam', src: { x: 0, y: 400, w: 250, h: 200 } },
  { id: 'cam2', name: 'Aisle Cam', src: { x: 150, y: 50, w: 450, h: 400 } },
  { id: 'cam3', name: 'Billing Cam', src: { x: 550, y: 50, w: 250, h: 250 } },
  { id: 'cam4', name: 'Exit Cam', src: { x: 550, y: 400, w: 250, h: 200 } },
];

// --- Helper Functions ---
const distance = (p1: Point, p2: Point) => Math.hypot(p2.x - p1.x, p2.y - p1.y);
const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;
const generateId = () => `CUST-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

export default function RetailDashboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cctvRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  
  const [stats, setStats] = useState<Stats>({ footfall: 0, active: 0, suspicious: 0, prevented: 0 });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [sirenActive, setSirenActive] = useState(false);

  // Mutable simulation state
  const simState = useRef({
    customers: [] as Customer[],
    lastSpawnTime: 0,
    stats: { footfall: 0, active: 0, suspicious: 0, prevented: 0 },
    heatmap: new Float32Array(STORE_WIDTH * STORE_HEIGHT).fill(0),
  });

  const addAlert = useCallback((message: string, type: 'info' | 'warning' | 'critical') => {
    setAlerts(prev => {
      const newAlert = { id: Math.random().toString(), time: new Date().toLocaleTimeString(), message, type };
      return [newAlert, ...prev].slice(0, 8); // Keep last 8
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const spawnCustomer = (time: number) => {
      const state = simState.current;
      // Spawn every 2-4 seconds, max 15 active
      if (time - state.lastSpawnTime > randomRange(2000, 4000) && state.customers.length < 15) {
        state.lastSpawnTime = time;
        const isThief = Math.random() < 0.15; // 15% chance of being a thief
        
        const entrance = ZONES.find(z => z.type === 'entrance')!;
        const newCustomer: Customer = {
          id: generateId(),
          x: entrance.x + entrance.w / 2 + randomRange(-20, 20),
          y: entrance.y + entrance.h / 2 + randomRange(-10, 10),
          vx: 0, vy: 0,
          speed: randomRange(40, 70),
          color: isThief ? '#ef4444' : '#3b82f6', // Red for thief (internal), Blue normal
          state: 'ENTERING',
          target: null,
          path: [],
          isThief,
          dwellTime: 0,
          maxDwellTime: randomRange(3, 8),
          visitedShelves: 0,
          hasStolen: false,
          alerted: false,
        };
        state.customers.push(newCustomer);
        state.stats.footfall++;
        
        if (isThief) {
           addAlert(`Suspicious profile detected at entrance: ${newCustomer.id}`, 'warning');
        }
      }
    };

    const updateCustomer = (c: Customer, dt: number) => {
      // Record path
      if (c.path.length === 0 || distance(c, c.path[c.path.length - 1]) > 20) {
        c.path.push({ x: c.x, y: c.y });
        if (c.path.length > 20) c.path.shift();
      }

      // Heatmap update
      const hx = Math.floor(c.x);
      const hy = Math.floor(c.y);
      if (hx >= 0 && hx < STORE_WIDTH && hy >= 0 && hy < STORE_HEIGHT) {
        simState.current.heatmap[hy * STORE_WIDTH + hx] += dt * 0.5;
      }

      // State Machine
      if (!c.target) {
        if (c.state === 'ENTERING' || c.state === 'BROWSING') {
          // Pick a random shelf
          const shelves = ZONES.filter(z => z.type === 'shelf');
          const shelf = shelves[Math.floor(Math.random() * shelves.length)];
          // Target a point near the shelf
          c.target = {
            x: shelf.x + (Math.random() > 0.5 ? -30 : shelf.w + 30),
            y: shelf.y + randomRange(20, shelf.h - 20)
          };
        } else if (c.state === 'BILLING') {
          const billing = ZONES.find(z => z.type === 'billing')!;
          c.target = { x: billing.x + randomRange(10, billing.w - 10), y: billing.y + billing.h + 30 };
        } else if (c.state === 'EXITING' || c.state === 'STEALING') {
          const exit = ZONES.find(z => z.type === 'exit')!;
          c.target = { x: exit.x + exit.w / 2, y: exit.y + exit.h / 2 };
        }
      }

      if (c.target) {
        const dx = c.target.x - c.x;
        const dy = c.target.y - c.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 5) {
          // Reached target
          if (c.state === 'ENTERING') {
            c.state = 'BROWSING';
            c.target = null;
          } else if (c.state === 'BROWSING') {
            c.dwellTime += dt;
            if (c.dwellTime > c.maxDwellTime) {
              c.dwellTime = 0;
              c.visitedShelves++;
              
              if (c.isThief && !c.hasStolen) {
                c.hasStolen = true;
                addAlert(`${c.id} showing concealment gesture near shelf`, 'warning');
                simState.current.stats.suspicious++;
              }

              if (c.isThief) {
                c.state = 'STEALING';
                c.target = null;
                c.speed = 90; // Move faster
              } else if (c.visitedShelves >= randomRange(1, 3)) {
                c.state = 'BILLING';
                c.target = null;
              } else {
                c.target = null; // Pick another shelf
              }
            } else if (c.dwellTime > 4 && !c.alerted && c.isThief) {
               addAlert(`${c.id} loitering too long near high-value items`, 'info');
               c.alerted = true;
            }
          } else if (c.state === 'BILLING') {
            c.dwellTime += dt;
            if (c.dwellTime > 3) { // Billing takes 3 seconds
              c.state = 'EXITING';
              c.target = null;
            }
          } else if (c.state === 'EXITING' || c.state === 'STEALING') {
            c.state = 'ESCAPED';
          }
        } else {
          // Move towards target
          c.vx = (dx / dist) * c.speed;
          c.vy = (dy / dist) * c.speed;
          
          // Simple collision avoidance with others
          simState.current.customers.forEach(other => {
            if (other.id !== c.id) {
              const odx = c.x - other.x;
              const ody = c.y - other.y;
              const odist = Math.hypot(odx, ody);
              if (odist < 30) {
                c.vx += (odx / odist) * 20;
                c.vy += (ody / odist) * 20;
              }
            }
          });

          c.x += c.vx * dt;
          c.y += c.vy * dt;
        }
      }

      // Exit Zone Detection for Thieves
      if (c.state === 'STEALING') {
        const exit = ZONES.find(z => z.type === 'exit')!;
        if (c.x > exit.x - 50 && c.y > exit.y - 50 && !c.alerted) {
          c.alerted = true;
          addAlert(`POTENTIAL THEFT DETECTED: ${c.id} skipping billing!`, 'critical');
          setSirenActive(true);
          simState.current.stats.prevented++;
          setTimeout(() => setSirenActive(false), 3000);
        }
      }
    };

    const draw = () => {
      // Clear
      ctx.fillStyle = '#0f172a'; // slate-900
      ctx.fillRect(0, 0, STORE_WIDTH, STORE_HEIGHT);

      // Draw Grid
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let i = 0; i < STORE_WIDTH; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, STORE_HEIGHT); ctx.stroke();
      }
      for (let i = 0; i < STORE_HEIGHT; i += 40) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(STORE_WIDTH, i); ctx.stroke();
      }

      // Draw Zones
      ZONES.forEach(z => {
        ctx.fillStyle = z.type === 'shelf' ? '#334155' : 
                        z.type === 'billing' ? '#047857' : 
                        z.type === 'entrance' ? '#1d4ed8' : '#be123c';
        ctx.globalAlpha = 0.6;
        ctx.fillRect(z.x, z.y, z.w, z.h);
        ctx.globalAlpha = 1.0;
        
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.strokeRect(z.x, z.y, z.w, z.h);

        ctx.fillStyle = '#f8fafc';
        ctx.font = '12px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(z.name, z.x + z.w / 2, z.y + z.h / 2 + 4);
      });

      // Draw Customers
      simState.current.customers.forEach(c => {
        // Path trail
        if (c.path.length > 1) {
          ctx.beginPath();
          ctx.moveTo(c.path[0].x, c.path[0].y);
          for (let i = 1; i < c.path.length; i++) {
            ctx.lineTo(c.path[i].x, c.path[i].y);
          }
          ctx.strokeStyle = c.state === 'STEALING' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(56, 189, 248, 0.4)';
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        // Bounding Box
        const isAlerted = c.state === 'STEALING' && c.alerted;
        ctx.strokeStyle = isAlerted ? '#ef4444' : '#38bdf8';
        ctx.lineWidth = isAlerted ? 3 : 1.5;
        if (isAlerted) {
          ctx.setLineDash([5, 5]);
        } else {
          ctx.setLineDash([]);
        }
        ctx.strokeRect(c.x - 15, c.y - 15, 30, 30);
        ctx.setLineDash([]);

        // Avatar
        ctx.beginPath();
        ctx.arc(c.x, c.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = isAlerted ? '#ef4444' : '#38bdf8';
        ctx.fill();

        // ID Label
        ctx.fillStyle = isAlerted ? '#fca5a5' : '#bae6fd';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(c.id, c.x, c.y - 20);
        
        // Status indicator
        if (c.state === 'STEALING') {
           ctx.fillStyle = '#ef4444';
           ctx.fillText('SUSPECT', c.x, c.y + 25);
        }
      });

      // Update CCTV Panels
      cctvRefs.current.forEach((cctvCanvas, index) => {
        if (!cctvCanvas) return;
        const cctvCtx = cctvCanvas.getContext('2d');
        if (!cctvCtx) return;
        
        const view = CCTV_VIEWS[index];
        cctvCtx.clearRect(0, 0, cctvCanvas.width, cctvCanvas.height);
        
        // Draw from main canvas
        cctvCtx.drawImage(
          canvas, 
          view.src.x, view.src.y, view.src.w, view.src.h, // Source
          0, 0, cctvCanvas.width, cctvCanvas.height // Dest
        );
        
        // Add scanline effect
        cctvCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        for(let i=0; i<cctvCanvas.height; i+=4) {
            cctvCtx.fillRect(0, i, cctvCanvas.width, 1);
        }
        
        // Add timestamp & Cam Name
        cctvCtx.fillStyle = '#38bdf8';
        cctvCtx.font = '10px monospace';
        cctvCtx.textAlign = 'left';
        cctvCtx.fillText(`${view.name} - ${new Date().toLocaleTimeString()}`, 5, 15);
        cctvCtx.fillText('REC \u25CF', cctvCanvas.width - 40, 15);
      });
    };

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      spawnCustomer(time);

      // Update customers
      simState.current.customers.forEach(c => updateCustomer(c, dt));
      
      // Remove escaped
      simState.current.customers = simState.current.customers.filter(c => c.state !== 'ESCAPED');
      
      // Update active count
      simState.current.stats.active = simState.current.customers.length;

      draw();
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    // Sync stats to React state every second
    const statsInterval = setInterval(() => {
      setStats({ ...simState.current.stats });
    }, 1000);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearInterval(statsInterval);
    };
  }, [addAlert]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 p-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${sirenActive ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-blue-500/20 text-blue-400'}`}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">AI Sentinel</h1>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Retail Smart Surveillance System</p>
          </div>
        </div>
        
        <div className="flex gap-6">
          <StatBox icon={<Users />} label="Total Footfall" value={stats.footfall} />
          <StatBox icon={<Activity />} label="Active Inside" value={stats.active} />
          <StatBox icon={<Eye className="text-amber-400" />} label="Suspicious Acts" value={stats.suspicious} />
          <StatBox icon={<CheckCircle className="text-emerald-400" />} label="Thefts Prevented" value={stats.prevented} />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left: Main Simulation View */}
        <div className="flex-1 p-6 flex flex-col relative">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Crosshair size={18} className="text-blue-400" />
              Live Floor Tracking
            </h2>
            <div className="flex gap-2 text-xs">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400"></span> Normal</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Suspect</span>
            </div>
          </div>
          
          <div className={`relative flex-1 rounded-xl overflow-hidden border-2 transition-colors duration-300 ${sirenActive ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]' : 'border-slate-800'}`}>
            <canvas 
              ref={canvasRef} 
              width={STORE_WIDTH} 
              height={STORE_HEIGHT} 
              className="w-full h-full object-contain bg-slate-900"
            />
            
            {/* Siren Overlay */}
            <AnimatePresence>
              {sirenActive && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.2, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                  className="absolute inset-0 bg-red-500 pointer-events-none"
                />
              )}
            </AnimatePresence>
          </div>

          {/* CCTV Panels (Bottom) */}
          <div className="mt-6 grid grid-cols-4 gap-4 h-40">
            {CCTV_VIEWS.map((view, i) => (
              <div key={view.id} className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden relative group">
                <canvas 
                  ref={el => { cctvRefs.current[i] = el; }}
                  width={300}
                  height={200}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                />
                <div className="absolute top-2 left-2 flex items-center gap-1 text-[10px] font-mono text-white bg-black/50 px-2 py-1 rounded">
                  <Video size={10} className={sirenActive && view.id === 'cam4' ? 'text-red-500 animate-pulse' : 'text-slate-400'} />
                  {view.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: AI Guidance & Alerts */}
        <div className="w-96 border-l border-slate-800 bg-slate-900/30 flex flex-col">
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-400" />
              Smart AI Suggestions
            </h2>
            <p className="text-xs text-slate-400 mt-1">Real-time behavioral analysis</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <AnimatePresence initial={false}>
              {alerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: 20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  className={`p-3 rounded-lg border text-sm ${
                    alert.type === 'critical' ? 'bg-red-500/10 border-red-500/30 text-red-200' :
                    alert.type === 'warning' ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' :
                    'bg-blue-500/10 border-blue-500/30 text-blue-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-mono opacity-70">{alert.time}</span>
                    {alert.type === 'critical' && <Bell size={12} className="animate-bounce text-red-400" />}
                  </div>
                  <p>{alert.message}</p>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {alerts.length === 0 && (
              <div className="text-center text-slate-500 text-sm py-10">
                System active. Monitoring floor...
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function StatBox({ icon, label, value }: { icon: React.ReactNode, label: string, value: number }) {
  return (
    <div className="flex items-center gap-3 bg-slate-900/80 px-4 py-2 rounded-lg border border-slate-800">
      <div className="text-slate-400">{icon}</div>
      <div>
        <div className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</div>
        <div className="text-xl font-bold font-mono">{value.toString().padStart(3, '0')}</div>
      </div>
    </div>
  );
}
