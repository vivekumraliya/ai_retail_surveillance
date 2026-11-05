'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CameraId, CameraDefinition, ViewLayoutMode, VisionFilterMode, ShopperAgent, PlaybackState } from './types';
import { buildSupermarketWorld, SupermarketSceneObjects } from './supermarket-world';
import { AudienceManager } from './audience-manager';
import { surveillanceAudio } from '@/lib/surveillance-audio';
import {
  Maximize2,
  Grid,
  RotateCw,
  Sun,
  Shield,
  Thermometer,
  Moon,
  Volume2,
  VolumeX,
  Compass,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Plus,
  Minus,
  Flame,
} from 'lucide-react';

export const CAMERA_CONFIGS: CameraDefinition[] = [
  {
    id: 'cam1',
    name: 'Entrance Foyer Wide',
    code: 'CAM-01',
    zone: 'South Portal & Ingress',
    lens: '2.8mm Wide Ultra-HD',
    resolution: '3840x2160',
    fps: 60,
    position: [-13, 7.5, 11],
    target: [-7, 1.2, 8],
    fov: 65,
    description: 'Monitors customer ingress, shopping baskets, and entrance turnstiles.',
    riskRating: 'LOW',
  },
  {
    id: 'cam2',
    name: 'Aisle 02 Electronics',
    code: 'CAM-02',
    zone: 'High-Value Merchandise',
    lens: '4.0mm High Dynamic Range',
    resolution: '3840x2160',
    fps: 60,
    position: [-1, 7.2, 7.5],
    target: [-0.5, 1.4, -1],
    fov: 60,
    description: 'Overlooks premium electronics, smartphones, and audio gear shelves.',
    riskRating: 'HIGH',
  },
  {
    id: 'cam3',
    name: 'POS Checkout Lanes',
    code: 'CAM-03',
    zone: 'Cashier & Conveyor Belt',
    lens: '3.6mm Low Distortion',
    resolution: '3840x2160',
    fps: 60,
    position: [12.2, 5.8, 3],
    target: [9.5, 1.2, 0.5],
    fov: 58,
    description: 'Scrutinizes cashier barcode scanning, conveyor bagging, and card transactions.',
    riskRating: 'MEDIUM',
  },
  {
    id: 'cam4',
    name: 'Security EAS Exit Gate',
    code: 'CAM-04',
    zone: 'Anti-Theft Chokepoint',
    lens: '2.8mm Low-Light Surveillance',
    resolution: '3840x2160',
    fps: 60,
    position: [12.8, 6.4, 11.5],
    target: [8.8, 1.4, 8.5],
    fov: 62,
    description: 'Critical intercept gate with dual RF EAS pedestals and sliding exterior doors.',
    riskRating: 'CRITICAL',
  },
  {
    id: 'camFree',
    name: 'Tactical Drone Orbit',
    code: 'TACTICAL-3D',
    zone: 'Full Facility Overview',
    lens: 'Virtual 3D Free Pan',
    resolution: '3840x2160',
    fps: 60,
    position: [0, 16, 18],
    target: [0, 1, 0],
    fov: 50,
    description: 'Free orbital tactical perspective with 360-degree pan and tilt capabilities.',
    riskRating: 'LOW',
  },
];

interface CameraViewportProps {
  selectedCameraId: CameraId;
  onSelectCamera: (id: CameraId) => void;
  layoutMode: ViewLayoutMode;
  onChangeLayout: (mode: ViewLayoutMode) => void;
  visionMode: VisionFilterMode;
  onChangeVisionMode: (mode: VisionFilterMode) => void;
  isAlarmActive: boolean;
  onAgentsUpdate: (agents: ShopperAgent[]) => void;
  audienceManagerRef: React.MutableRefObject<AudienceManager | null>;
  playback?: PlaybackState;
  onUpdatePlayback?: (partial: Partial<PlaybackState>) => void;
  onCurrentTimestampUpdate?: (timeStr: string) => void;
  onOpenHeatmap?: () => void;
  onNewAlert?: (alert: SecurityAlert) => void;
}

export const CameraViewport: React.FC<CameraViewportProps> = ({
  selectedCameraId,
  onSelectCamera,
  layoutMode,
  onChangeLayout,
  visionMode,
  onChangeVisionMode,
  isAlarmActive,
  onAgentsUpdate,
  audienceManagerRef,
  playback = { isPlaying: true, isLive: true, playbackSpeed: 1, currentTimeOffset: 0, maxHistoryDuration: 90 },
  onUpdatePlayback,
  onCurrentTimestampUpdate,
  onOpenHeatmap,
  onNewAlert,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hudCanvasRef = useRef<HTMLCanvasElement>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [autoPatrol, setAutoPatrol] = useState(false);
  const [ptzOffsets, setPtzOffsets] = useState({ pan: 0, tilt: 0, zoom: 1 });

  // Playback refs to maintain continuous animation loop without teardowns
  const playbackRef = useRef(playback);
  const onUpdatePlaybackRef = useRef(onUpdatePlayback);
  const onCurrentTimestampUpdateRef = useRef(onCurrentTimestampUpdate);
  const onNewAlertRef = useRef(onNewAlert);

  useEffect(() => {
    playbackRef.current = playback;
    onUpdatePlaybackRef.current = onUpdatePlayback;
    onCurrentTimestampUpdateRef.current = onCurrentTimestampUpdate;
    onNewAlertRef.current = onNewAlert;
  });

  // Engine references
  const engineRef = useRef<{
    renderer: THREE.WebGLRenderer;
    world: SupermarketSceneObjects;
    cameras: Map<CameraId, THREE.PerspectiveCamera>;
    audience: AudienceManager;
    clock: THREE.Clock;
    isDragging: boolean;
    prevMouseX: number;
    prevMouseY: number;
    orbitAngle: number;
    lastTelemetrySync: number;
    // Offscreen render targets for 4 CCTV feeds
    offscreenTargets: {
      cam1: THREE.WebGLRenderTarget;
      cam2: THREE.WebGLRenderTarget;
      cam3: THREE.WebGLRenderTarget;
      cam4: THREE.WebGLRenderTarget;
    };
    // Compositing orthographic pass
    compScene: THREE.Scene;
    compCamera: THREE.OrthographicCamera;
    quadMeshes: THREE.Mesh[];
    singleQuadMesh: THREE.Mesh;
    singleQuadMat: THREE.MeshBasicMaterial;
    // Offscreen 2D canvas buffer for HUD
    offscreenHudCanvas: HTMLCanvasElement;
    offscreenHudCtx: CanvasRenderingContext2D | null;
  } | null>(null);

  // Initialize Three.js scene, offscreen buffers, and compositor
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      precision: 'mediump',
      depth: true,
      stencil: false,
    });
    renderer.setPixelRatio(1.0);
    renderer.autoClear = false;

    // Build 3D Supermarket Scene
    const world = buildSupermarketWorld();

    // 3D Cameras
    const cameras = new Map<CameraId, THREE.PerspectiveCamera>();
    CAMERA_CONFIGS.forEach((cfg) => {
      const cam = new THREE.PerspectiveCamera(cfg.fov, 16 / 9, 0.2, 70);
      cam.position.set(cfg.position[0], cfg.position[1], cfg.position[2]);
      cam.lookAt(cfg.target[0], cfg.target[1], cfg.target[2]);
      cameras.set(cfg.id, cam);
    });

    // Create 4 Dedicated Offscreen WebGL Render Targets for CCTV Camera Feeds
    const bufferWidth = 640;
    const bufferHeight = 360;
    const rtOptions: THREE.RenderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthBuffer: true,
      stencilBuffer: false,
    };

    const offscreenTargets = {
      cam1: new THREE.WebGLRenderTarget(bufferWidth, bufferHeight, rtOptions),
      cam2: new THREE.WebGLRenderTarget(bufferWidth, bufferHeight, rtOptions),
      cam3: new THREE.WebGLRenderTarget(bufferWidth, bufferHeight, rtOptions),
      cam4: new THREE.WebGLRenderTarget(bufferWidth, bufferHeight, rtOptions),
    };

    // Compositing Orthographic Quad Pass (Blits offscreen buffers to screen in 1 pass)
    const compScene = new THREE.Scene();
    const compCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const quad1Mat = new THREE.MeshBasicMaterial({ map: offscreenTargets.cam1.texture });
    const quad2Mat = new THREE.MeshBasicMaterial({ map: offscreenTargets.cam2.texture });
    const quad3Mat = new THREE.MeshBasicMaterial({ map: offscreenTargets.cam3.texture });
    const quad4Mat = new THREE.MeshBasicMaterial({ map: offscreenTargets.cam4.texture });

    const quadGeo = new THREE.PlaneGeometry(1, 1);
    // Top-Left (Cam 1)
    const quad1Mesh = new THREE.Mesh(quadGeo, quad1Mat);
    quad1Mesh.position.set(-0.5, 0.5, 0);
    compScene.add(quad1Mesh);

    // Top-Right (Cam 2)
    const quad2Mesh = new THREE.Mesh(quadGeo, quad2Mat);
    quad2Mesh.position.set(0.5, 0.5, 0);
    compScene.add(quad2Mesh);

    // Bottom-Left (Cam 3)
    const quad3Mesh = new THREE.Mesh(quadGeo, quad3Mat);
    quad3Mesh.position.set(-0.5, -0.5, 0);
    compScene.add(quad3Mesh);

    // Bottom-Right (Cam 4)
    const quad4Mesh = new THREE.Mesh(quadGeo, quad4Mat);
    quad4Mesh.position.set(0.5, -0.5, 0);
    compScene.add(quad4Mesh);

    // Single mode Fullscreen Quad
    const singleQuadGeo = new THREE.PlaneGeometry(2, 2);
    const singleQuadMat = new THREE.MeshBasicMaterial({ map: offscreenTargets.cam1.texture });
    const singleQuadMesh = new THREE.Mesh(singleQuadGeo, singleQuadMat);
    singleQuadMesh.position.set(0, 0, 0);
    singleQuadMesh.visible = false;
    compScene.add(singleQuadMesh);

    // Offscreen 2D Canvas Buffer for CCTV HUD & AI Bounding Boxes
    const offscreenHudCanvas = document.createElement('canvas');
    offscreenHudCanvas.width = container.clientWidth || 800;
    offscreenHudCanvas.height = container.clientHeight || 500;
    const offscreenHudCtx = offscreenHudCanvas.getContext('2d', { alpha: true });

    // Audience Manager
    const audience = new AudienceManager(world.scene, (alert) => {
      onNewAlertRef.current?.(alert);
    });
    audienceManagerRef.current = audience;

    const clock = new THREE.Clock();

    engineRef.current = {
      renderer,
      world,
      cameras,
      audience,
      clock,
      isDragging: false,
      prevMouseX: 0,
      prevMouseY: 0,
      orbitAngle: 0,
      lastTelemetrySync: 0,
      offscreenTargets,
      compScene,
      compCamera,
      quadMeshes: [quad1Mesh, quad2Mesh, quad3Mesh, quad4Mesh],
      singleQuadMesh,
      singleQuadMat,
      offscreenHudCanvas,
      offscreenHudCtx,
    };

    const handleResize = () => {
      if (!container || !renderer) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height, false);

      if (hudCanvasRef.current) {
        hudCanvasRef.current.width = width;
        hudCanvasRef.current.height = height;
      }
      if (offscreenHudCanvas) {
        offscreenHudCanvas.width = width;
        offscreenHudCanvas.height = height;
      }

      // Update offscreen buffer dimensions
      const halfW = Math.max(320, Math.floor(width / 2));
      const halfH = Math.max(180, Math.floor(height / 2));
      offscreenTargets.cam1.setSize(halfW, halfH);
      offscreenTargets.cam2.setSize(halfW, halfH);
      offscreenTargets.cam3.setSize(halfW, halfH);
      offscreenTargets.cam4.setSize(halfW, halfH);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      offscreenTargets.cam1.dispose();
      offscreenTargets.cam2.dispose();
      offscreenTargets.cam3.dispose();
      offscreenTargets.cam4.dispose();
      engineRef.current = null;
    };
  }, [audienceManagerRef]);

  // Main Render Loop (Throttled requestAnimationFrame + Offscreen Buffers for 60FPS Smoothness)
  useEffect(() => {
    let animId: number;

    const TARGET_FPS = 60;
    const FRAME_DURATION = 1000 / TARGET_FPS; // ~16.666 ms
    let lastFrameTimestamp = 0;

    const renderLoop = (timestamp: number) => {
      animId = requestAnimationFrame(renderLoop);

      // 1. Precise requestAnimationFrame throttle (Preserves rock-solid 60.0 FPS on 120Hz/144Hz monitors)
      const elapsed = timestamp - lastFrameTimestamp;
      if (elapsed < FRAME_DURATION - 1.2) {
        return;
      }
      lastFrameTimestamp = timestamp - (elapsed % FRAME_DURATION);

      const engine = engineRef.current;
      if (!engine || !containerRef.current) return;

      const {
        renderer,
        world,
        cameras,
        audience,
        clock,
        offscreenTargets,
        compScene,
        compCamera,
        quadMeshes,
        singleQuadMesh,
        singleQuadMat,
        offscreenHudCanvas,
        offscreenHudCtx,
      } = engine;

      const delta = Math.min(clock.getDelta(), 0.04);
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      const now = performance.now();

      // Update 3D Store fixtures & EAS Strobe
      world.update(delta, isAlarmActive);

      // Auto-Patrol oscillation
      if (autoPatrol) {
        engine.orbitAngle += delta * 0.7;
      }

      // 2. Physics & 3D Kinematics step for all avatars (Driven by Playback Mode)
      const baseCameras = new Map<CameraId, THREE.Camera>();
      cameras.forEach((c, id) => baseCameras.set(id, c));

      let effectiveTimeStr = '';
      let effectiveAlarm = isAlarmActive;
      const currentPlayback = playbackRef.current;

      if (currentPlayback.isLive) {
        if (currentPlayback.isPlaying) {
          const { gateAlarmTriggered } = audience.update(delta * currentPlayback.playbackSpeed, baseCameras, isAlarmActive);
          if (gateAlarmTriggered && !isMuted) {
            surveillanceAudio.startAlarm();
          }
        }
        const nowD = new Date();
        effectiveTimeStr = `${nowD.toTimeString().split(' ')[0]}.${Math.floor(nowD.getMilliseconds() / 10)
          .toString()
          .padStart(2, '0')}`;
      } else {
        // Historical Playback Mode: advance playhead when playing
        if (currentPlayback.isPlaying) {
          const nextOffset = currentPlayback.currentTimeOffset + delta * currentPlayback.playbackSpeed;
          if (nextOffset >= 0) {
            onUpdatePlaybackRef.current?.({ currentTimeOffset: 0, isLive: true });
          } else {
            onUpdatePlaybackRef.current?.({ currentTimeOffset: nextOffset });
          }
        }
        const histResult = audience.applyHistoricalOffset(currentPlayback.currentTimeOffset, baseCameras);
        effectiveTimeStr = `${histResult.timeStr} [REC ${currentPlayback.currentTimeOffset.toFixed(1)}s]`;
        effectiveAlarm = histResult.isAlarmActive;
      }

      onCurrentTimestampUpdateRef.current?.(effectiveTimeStr);

      // Throttled Sidebar Telemetry sync (2.5 Hz to keep React thread free)
      if (now - engine.lastTelemetrySync > 400) {
        engine.lastTelemetrySync = now;
        onAgentsUpdate([...audience.agents]);
      }

      // PTZ camera adjustments
      const activeCam = cameras.get(selectedCameraId);
      const activeConfig = CAMERA_CONFIGS.find((c) => c.id === selectedCameraId);
      if (activeCam && activeConfig) {
        if (selectedCameraId === 'camFree') {
          const radius = 22 / ptzOffsets.zoom;
          const angle = engine.orbitAngle + (ptzOffsets.pan * Math.PI) / 180;
          activeCam.position.x = Math.sin(angle) * radius;
          activeCam.position.z = Math.cos(angle) * radius;
          activeCam.position.y = 16 + ptzOffsets.tilt * 0.15;
          activeCam.lookAt(0, 1.5, 0);
        } else {
          const basePos = activeConfig.position;
          const baseTarget = activeConfig.target;
          activeCam.position.set(basePos[0], basePos[1], basePos[2]);

          const panRad = ((ptzOffsets.pan + (autoPatrol ? Math.sin(engine.orbitAngle) * 12 : 0)) * Math.PI) / 180;
          const tiltRad = (ptzOffsets.tilt * Math.PI) / 180;

          const targetX = baseTarget[0] + Math.sin(panRad) * 4;
          const targetY = baseTarget[1] + Math.sin(tiltRad) * 3;
          const targetZ = baseTarget[2] + (1 - Math.cos(panRad)) * 2;

          activeCam.lookAt(targetX, targetY, targetZ);
          activeCam.fov = activeConfig.fov / ptzOffsets.zoom;
          activeCam.updateProjectionMatrix();
        }
      }

      // 3. RENDER 3D FEEDS INTO DEDICATED OFFSCREEN CANVASES / BUFFERS
      if (layoutMode === 'quad') {
        // Render Cam 1 into offscreen buffer 1
        renderer.setRenderTarget(offscreenTargets.cam1);
        renderer.clear();
        renderer.render(world.scene, cameras.get('cam1')!);

        // Render Cam 2 into offscreen buffer 2
        renderer.setRenderTarget(offscreenTargets.cam2);
        renderer.clear();
        renderer.render(world.scene, cameras.get('cam2')!);

        // Render Cam 3 into offscreen buffer 3
        renderer.setRenderTarget(offscreenTargets.cam3);
        renderer.clear();
        renderer.render(world.scene, cameras.get('cam3')!);

        // Render Cam 4 into offscreen buffer 4
        renderer.setRenderTarget(offscreenTargets.cam4);
        renderer.clear();
        renderer.render(world.scene, cameras.get('cam4')!);

        // Reset to main frame buffer & composite 4 offscreen buffers in 1 pass
        renderer.setRenderTarget(null);
        renderer.clear();

        quadMeshes.forEach((mesh) => (mesh.visible = true));
        singleQuadMesh.visible = false;
        renderer.render(compScene, compCamera);
      } else {
        // Single Camera Mode: Render active camera directly to screen for maximum crispness
        renderer.setRenderTarget(null);
        renderer.clear();
        if (activeCam) {
          activeCam.aspect = width / height;
          activeCam.updateProjectionMatrix();
          renderer.setViewport(0, 0, width, height);
          renderer.render(world.scene, activeCam);
        }
      }

      // 4. OFFSCREEN 2D CANVAS BUFFER FOR CCTV OSD & AI BOUNDING BOXES (60FPS Smooth)
      if (offscreenHudCtx && hudCanvasRef.current) {
        offscreenHudCtx.clearRect(0, 0, width, height);
        const hudCtx = hudCanvasRef.current.getContext('2d');

        if (layoutMode === 'quad') {
          const halfW = width / 2;
          const halfH = height / 2;

          // Quadrant 1: CAM 1 Top-Left
          drawCctvQuadrantHud(offscreenHudCtx, 0, 0, halfW, halfH, CAMERA_CONFIGS[0], effectiveTimeStr, audience.agents, 'cam1', effectiveAlarm);
          // Quadrant 2: CAM 2 Top-Right
          drawCctvQuadrantHud(offscreenHudCtx, halfW, 0, halfW, halfH, CAMERA_CONFIGS[1], effectiveTimeStr, audience.agents, 'cam2', effectiveAlarm);
          // Quadrant 3: CAM 3 Bottom-Left
          drawCctvQuadrantHud(offscreenHudCtx, 0, halfH, halfW, halfH, CAMERA_CONFIGS[2], effectiveTimeStr, audience.agents, 'cam3', effectiveAlarm);
          // Quadrant 4: CAM 4 Bottom-Right
          drawCctvQuadrantHud(offscreenHudCtx, halfW, halfH, halfW, halfH, CAMERA_CONFIGS[3], effectiveTimeStr, audience.agents, 'cam4', effectiveAlarm);

          // Grid divider lines
          offscreenHudCtx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
          offscreenHudCtx.lineWidth = 1.5;
          offscreenHudCtx.beginPath();
          offscreenHudCtx.moveTo(halfW, 0);
          offscreenHudCtx.lineTo(halfW, height);
          offscreenHudCtx.moveTo(0, halfH);
          offscreenHudCtx.lineTo(width, halfH);
          offscreenHudCtx.stroke();
        } else {
          // Single Maximize Camera HUD
          const cfg = CAMERA_CONFIGS.find((c) => c.id === selectedCameraId) || CAMERA_CONFIGS[0];
          drawSingleCameraHud(
            offscreenHudCtx,
            width,
            height,
            cfg,
            effectiveTimeStr,
            audience.agents,
            selectedCameraId,
            effectiveAlarm,
            ptzOffsets
          );
        }

        // Blit offscreen HUD canvas to visible HUD canvas in 1 atomic GPU call
        if (hudCtx) {
          hudCtx.clearRect(0, 0, width, height);
          hudCtx.drawImage(offscreenHudCanvas, 0, 0);
        }
      }
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [layoutMode, selectedCameraId, isAlarmActive, autoPatrol, ptzOffsets, isMuted, onAgentsUpdate]);

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    surveillanceAudio.setMuted(nextMuted);
  };

  const handlePtz = (direction: 'up' | 'down' | 'left' | 'right' | 'zoomIn' | 'zoomOut' | 'reset') => {
    setPtzOffsets((prev) => {
      switch (direction) {
        case 'up':
          return { ...prev, tilt: Math.min(25, prev.tilt + 4) };
        case 'down':
          return { ...prev, tilt: Math.max(-25, prev.tilt - 4) };
        case 'left':
          return { ...prev, pan: Math.max(-45, prev.pan - 5) };
        case 'right':
          return { ...prev, pan: Math.min(45, prev.pan + 5) };
        case 'zoomIn':
          return { ...prev, zoom: Math.min(3.0, prev.zoom + 0.25) };
        case 'zoomOut':
          return { ...prev, zoom: Math.max(0.75, prev.zoom - 0.25) };
        case 'reset':
          return { pan: 0, tilt: 0, zoom: 1 };
      }
    });
    surveillanceAudio.playTelemetryChirp();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!engineRef.current) return;
    engineRef.current.isDragging = true;
    engineRef.current.prevMouseX = e.clientX;
    engineRef.current.prevMouseY = e.clientY;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const engine = engineRef.current;
    if (!engine || !engine.isDragging) return;

    const dx = e.clientX - engine.prevMouseX;
    const dy = e.clientY - engine.prevMouseY;
    engine.prevMouseX = e.clientX;
    engine.prevMouseY = e.clientY;

    if (selectedCameraId === 'camFree') {
      engine.orbitAngle -= dx * 0.008;
      setPtzOffsets((prev) => ({
        ...prev,
        tilt: Math.max(-30, Math.min(30, prev.tilt - dy * 0.4)),
      }));
    } else {
      setPtzOffsets((prev) => ({
        ...prev,
        pan: Math.max(-50, Math.min(50, prev.pan + dx * 0.25)),
        tilt: Math.max(-30, Math.min(30, prev.tilt - dy * 0.25)),
      }));
    }
  };

  const handleMouseUp = () => {
    if (engineRef.current) {
      engineRef.current.isDragging = false;
    }
  };

  // Click on quadrant in Quad mode to switch to that camera
  const handleViewportClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (layoutMode !== 'quad') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const halfW = rect.width / 2;
    const halfH = rect.height / 2;

    let targetCam: CameraId = 'cam1';
    if (clickX < halfW && clickY < halfH) targetCam = 'cam1';
    else if (clickX >= halfW && clickY < halfH) targetCam = 'cam2';
    else if (clickX < halfW && clickY >= halfH) targetCam = 'cam3';
    else targetCam = 'cam4';

    surveillanceAudio.playCameraSwitch();
    onSelectCamera(targetCam);
    onChangeLayout('single');
    setPtzOffsets({ pan: 0, tilt: 0, zoom: 1 });
  };

  const handleSelectCam = (id: CameraId) => {
    surveillanceAudio.playCameraSwitch();
    onSelectCamera(id);
    if (layoutMode === 'quad') {
      onChangeLayout('single');
    }
    setPtzOffsets({ pan: 0, tilt: 0, zoom: 1 });
  };

  const getVisionFilterStyle = () => {
    switch (visionMode) {
      case 'thermal':
        return 'invert(1) hue-rotate(185deg) contrast(1.8) saturate(2.2)';
      case 'night':
        return 'sepia(1) hue-rotate(85deg) saturate(2.5) contrast(1.5) brightness(1.2)';
      default:
        return 'none';
    }
  };

  return (
    <div className="relative flex flex-col h-full bg-slate-950 select-none overflow-hidden rounded-xl border border-slate-800 shadow-2xl">
      {/* Top Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md z-30">
        {/* Left: Camera Selector Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          {CAMERA_CONFIGS.map((cfg) => {
            const isSelected = selectedCameraId === cfg.id && layoutMode !== 'quad';
            return (
              <button
                key={cfg.id}
                onClick={() => handleSelectCam(cfg.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-sky-600 text-white shadow-[0_0_12px_rgba(2,132,199,0.5)] border border-sky-400'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-700/60'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    cfg.riskRating === 'CRITICAL'
                      ? 'bg-red-400 animate-ping'
                      : cfg.riskRating === 'HIGH'
                      ? 'bg-amber-400'
                      : 'bg-sky-400'
                  }`}
                />
                <span>{cfg.code}</span>
                <span className="hidden lg:inline text-[10px] opacity-75">({cfg.name.split(' ')[0]})</span>
              </button>
            );
          })}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Layout Mode Toggle */}
          <div className="flex items-center bg-slate-800/80 rounded border border-slate-700/80 p-0.5">
            <button
              onClick={() => {
                surveillanceAudio.playCameraSwitch();
                onChangeLayout('quad');
              }}
              title="Quad 4-Camera Grid View"
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono font-semibold transition-all cursor-pointer ${
                layoutMode === 'quad' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Grid size={13} />
              <span>QUAD 4-CAM</span>
            </button>
            <button
              onClick={() => {
                surveillanceAudio.playCameraSwitch();
                onChangeLayout('single');
              }}
              title="Single Focused Camera View"
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono font-semibold transition-all cursor-pointer ${
                layoutMode === 'single' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Maximize2 size={13} />
              <span>SINGLE</span>
            </button>
          </div>

          {/* Store Layout Density Heatmap Overlay Launcher */}
          {onOpenHeatmap && (
            <button
              onClick={() => {
                surveillanceAudio.playTelemetryChirp();
                onOpenHeatmap();
              }}
              title="Switch to Store Layout Density Heatmap Canvas Overlay"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/90 hover:bg-slate-750 text-amber-400 hover:text-amber-300 border border-amber-500/50 text-xs font-mono font-bold transition-all cursor-pointer shadow-[0_0_10px_rgba(245,158,11,0.25)]"
            >
              <Flame size={13} className="text-amber-400" />
              <span className="hidden xl:inline">STORE</span>
              <span>HEATMAP</span>
            </button>
          )}

          {/* Vision Modes Toggle */}
          <div className="flex items-center bg-slate-800/80 rounded border border-slate-700/80 p-0.5">
            <button
              onClick={() => onChangeVisionMode('normal')}
              title="Standard High-Definition CCTV Color"
              className={`p-1.5 rounded transition-all cursor-pointer ${
                visionMode === 'normal' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sun size={13} />
            </button>
            <button
              onClick={() => onChangeVisionMode('ai')}
              title="AI Computer Vision & Tracking Bounding Boxes"
              className={`p-1.5 rounded transition-all cursor-pointer ${
                visionMode === 'ai' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield size={13} />
            </button>
            <button
              onClick={() => onChangeVisionMode('thermal')}
              title="FLIR Infrared Thermal Vision"
              className={`p-1.5 rounded transition-all cursor-pointer ${
                visionMode === 'thermal' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Thermometer size={13} />
            </button>
            <button
              onClick={() => onChangeVisionMode('night')}
              title="Phosphor Green Night Vision with Scanlines"
              className={`p-1.5 rounded transition-all cursor-pointer ${
                visionMode === 'night' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Moon size={13} />
            </button>
          </div>

          {/* Audio Mute Button */}
          <button
            onClick={toggleMute}
            title={isMuted ? 'Unmute Security SFX & Siren' : 'Mute Security Audio'}
            className={`p-1.5 rounded border transition-all cursor-pointer ${
              isMuted
                ? 'bg-slate-800 border-slate-700 text-slate-500'
                : 'bg-slate-800/80 border-slate-700 text-sky-400 hover:bg-slate-700'
            }`}
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
        </div>
      </div>

      {/* 3D Canvas Viewport + Overlay HUD Canvas */}
      <div
        ref={containerRef}
        onClick={handleViewportClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="relative flex-1 w-full h-full overflow-hidden cursor-crosshair"
      >
        {/* Three.js Compositing Display Canvas */}
        <canvas
          ref={canvasRef}
          style={{ filter: getVisionFilterStyle() }}
          className="absolute inset-0 w-full h-full object-cover will-change-transform"
        />

        {/* 60FPS Hardware Accelerated 2D HUD Canvas (Zero DOM overhead) */}
        <canvas
          ref={hudCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* PTZ Console */}
        {layoutMode === 'single' && (
          <div className="absolute bottom-12 right-3 z-30 flex flex-col items-center p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 backdrop-blur-md shadow-2xl pointer-events-auto">
            <div className="text-[9px] font-mono font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Compass size={11} className="text-sky-400" />
              <span>PTZ CONSOLE</span>
            </div>

            <div className="grid grid-cols-3 gap-1 w-24">
              <span />
              <button
                onClick={(e) => { e.stopPropagation(); handlePtz('up'); }}
                title="Tilt Up"
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex justify-center items-center cursor-pointer active:scale-95 transition-transform"
              >
                <ArrowUp size={12} />
              </button>
              <span />

              <button
                onClick={(e) => { e.stopPropagation(); handlePtz('left'); }}
                title="Pan Left"
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex justify-center items-center cursor-pointer active:scale-95 transition-transform"
              >
                <ArrowLeft size={12} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handlePtz('reset'); }}
                title="Reset PTZ Home"
                className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-sky-400 text-[9px] font-bold font-mono flex justify-center items-center cursor-pointer"
              >
                CTR
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handlePtz('right'); }}
                title="Pan Right"
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex justify-center items-center cursor-pointer active:scale-95 transition-transform"
              >
                <ArrowRight size={12} />
              </button>

              <span />
              <button
                onClick={(e) => { e.stopPropagation(); handlePtz('down'); }}
                title="Tilt Down"
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex justify-center items-center cursor-pointer active:scale-95 transition-transform"
              >
                <ArrowDown size={12} />
              </button>
              <span />
            </div>

            <div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-slate-800 w-full justify-between">
              <button
                onClick={(e) => { e.stopPropagation(); handlePtz('zoomOut'); }}
                title="Zoom Out"
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                <Minus size={11} />
              </button>
              <span className="text-[9px] font-mono text-sky-400">{ptzOffsets.zoom.toFixed(1)}x</span>
              <button
                onClick={(e) => { e.stopPropagation(); handlePtz('zoomIn'); }}
                title="Zoom In"
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                <Plus size={11} />
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); setAutoPatrol(!autoPatrol); }}
                title={autoPatrol ? 'Stop Auto-Patrol' : 'Start Auto-Patrol Sweep'}
                className={`p-1 rounded border cursor-pointer ml-1 ${
                  autoPatrol
                    ? 'bg-sky-600 text-white border-sky-400 animate-pulse'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                <RotateCw size={11} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// =========================================================================
// HIGH-PERFORMANCE 2D CANVAS DRAWING ROUTINES FOR ZERO-DOM HUD OVERLAYS
// =========================================================================

function drawCctvQuadrantHud(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  qw: number,
  qh: number,
  camera: CameraDefinition,
  timeStr: string,
  agents: ShopperAgent[],
  camId: CameraId,
  isAlarmActive: boolean
) {
  ctx.save();
  ctx.translate(ox, oy);

  // Top OSD Header
  // REC Badge
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(8, 8, 46, 18);
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(16, 17, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f87171';
  ctx.font = 'bold 9px monospace';
  ctx.fillText('REC', 24, 20);

  // Camera Name Tag
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(58, 8, 140, 18);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(58, 8, 140, 18);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 9px monospace';
  ctx.fillText(`${camera.code} | ${camera.name.split(' ')[0]}`, 64, 20);

  // Timestamp
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(qw - 110, 8, 102, 18);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 9px monospace';
  ctx.fillText(timeStr, qw - 104, 20);

  // Bottom Resolution & FPS
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(8, qh - 22, 110, 16);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '8.5px monospace';
  ctx.fillText(`3840x2160 @ 60fps`, 12, qh - 10);

  // Draw 2D Projected AI Bounding Boxes for this camera quadrant
  agents.forEach((agent) => {
    const proj = agent.screenProjections[camId];
    if (!proj || !proj.visible) return;

    const bx = (proj.x - proj.boxWidth / 2) * qw;
    const by = (proj.y - proj.boxHeight / 2) * qh;
    const bw = proj.boxWidth * qw;
    const bh = proj.boxHeight * qh;

    const isThief = agent.isThief;
    const isRisk = agent.riskScore > 60;

    ctx.strokeStyle = isThief ? '#ef4444' : isRisk ? '#f59e0b' : '#38bdf8';
    ctx.lineWidth = isThief ? 2.0 : 1.2;
    ctx.strokeRect(bx, by, bw, bh);

    // Corner brackets
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    const cornerSize = 4;
    // top-left
    ctx.beginPath();
    ctx.moveTo(bx, by + cornerSize);
    ctx.lineTo(bx, by);
    ctx.lineTo(bx + cornerSize, by);
    ctx.stroke();
    // top-right
    ctx.beginPath();
    ctx.moveTo(bx + bw - cornerSize, by);
    ctx.lineTo(bx + bw, by);
    ctx.lineTo(bx + bw, by + cornerSize);
    ctx.stroke();

    // ID Tag
    ctx.fillStyle = isThief ? '#dc2626' : isRisk ? '#d97706' : 'rgba(2, 132, 199, 0.9)';
    ctx.fillRect(bx, by - 12, Math.max(bw, 44), 11);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 7.5px monospace';
    ctx.fillText(`${agent.id} ${agent.riskScore}%`, bx + 2, by - 3);
  });

  ctx.restore();
}

function drawSingleCameraHud(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  camera: CameraDefinition,
  timeStr: string,
  agents: ShopperAgent[],
  camId: CameraId,
  isAlarmActive: boolean,
  ptzValues: { pan: number; tilt: number; zoom: number }
) {
  // Top OSD
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(12, 12, 54, 22);
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(22, 23, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f87171';
  ctx.font = 'bold 10px monospace';
  ctx.fillText('REC', 32, 27);

  // Camera Title
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(72, 12, 220, 22);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(72, 12, 220, 22);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(`${camera.code} | ${camera.name}`, 80, 27);

  // Clock
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(w - 130, 12, 118, 22);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(timeStr, w - 122, 27);

  // Center Reticle Crosshair
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 22, 0, Math.PI * 2);
  ctx.moveTo(w / 2 - 32, h / 2);
  ctx.lineTo(w / 2 + 32, h / 2);
  ctx.moveTo(w / 2, h / 2 - 32);
  ctx.lineTo(w / 2, h / 2 + 32);
  ctx.stroke();

  // Bottom PTZ Bar
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(12, h - 30, 240, 20);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px monospace';
  ctx.fillText(
    `PAN: ${ptzValues.pan > 0 ? '+' : ''}${ptzValues.pan}°  TILT: ${ptzValues.tilt > 0 ? '+' : ''}${ptzValues.tilt}°  ZOOM: ${ptzValues.zoom.toFixed(1)}x`,
    18,
    h - 16
  );

  // Alarm Banner
  if (isAlarmActive) {
    ctx.fillStyle = 'rgba(220, 38, 38, 0.9)';
    ctx.fillRect(w / 2 - 180, 44, 360, 32);
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(w / 2 - 180, 44, 360, 32);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ POTENTIAL THEFT DETECTED - EAS GATE BREACH', w / 2, 64);
    ctx.textAlign = 'left';
  }

  // Draw Full-Res Bounding Boxes
  agents.forEach((agent) => {
    const proj = agent.screenProjections[camId];
    if (!proj || !proj.visible) return;

    const bx = (proj.x - proj.boxWidth / 2) * w;
    const by = (proj.y - proj.boxHeight / 2) * h;
    const bw = proj.boxWidth * w;
    const bh = proj.boxHeight * h;

    const isThief = agent.isThief;
    const isRisk = agent.riskScore > 60;

    ctx.strokeStyle = isThief ? '#ef4444' : isRisk ? '#f59e0b' : '#38bdf8';
    ctx.lineWidth = isThief ? 2.5 : 1.5;
    ctx.strokeRect(bx, by, bw, bh);

    // Header badge
    ctx.fillStyle = isThief ? '#dc2626' : isRisk ? '#d97706' : 'rgba(2, 132, 199, 0.9)';
    ctx.fillRect(bx, by - 16, Math.max(bw, 64), 14);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`${agent.id} [RISK: ${agent.riskScore}%]`, bx + 3, by - 5);

    // Footer action label
    if (isThief || isRisk) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(bx, by + bh + 2, Math.max(bw, 70), 13);
      ctx.fillStyle = isThief ? '#f87171' : '#fcd34d';
      ctx.font = 'bold 8.5px monospace';
      ctx.fillText(agent.hasConcealedItem ? 'CONCEALMENT' : agent.state.replace('_', ' '), bx + 3, by + bh + 12);
    }
  });
}
