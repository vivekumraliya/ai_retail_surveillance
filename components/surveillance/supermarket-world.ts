import * as THREE from 'three';

export interface SupermarketSceneObjects {
  scene: THREE.Scene;
  easStrobeLights: THREE.PointLight[];
  easGateMeshList: THREE.Mesh[];
  cctvMeshes: THREE.Group[];
  update: (delta: number, isAlarmActive: boolean) => void;
}

export function buildSupermarketWorld(): SupermarketSceneObjects {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0f18);
  scene.fog = new THREE.FogExp2(0x0a0f18, 0.015);

  const easStrobeLights: THREE.PointLight[] = [];
  const easGateMeshList: THREE.Mesh[] = [];
  const cctvMeshes: THREE.Group[] = [];

  // ==========================================
  // 1. LIGHTING (Optimized: 0 expensive shadow pre-passes, minimal dynamic point lights)
  // ==========================================
  const ambientLight = new THREE.AmbientLight(0xdce7f5, 1.1);
  scene.add(ambientLight);

  const mainDirectional = new THREE.DirectionalLight(0xffffff, 1.0);
  mainDirectional.position.set(-6, 20, 8);
  scene.add(mainDirectional);

  // Soft secondary fill light
  const secondaryDir = new THREE.DirectionalLight(0x7dd3fc, 0.4);
  secondaryDir.position.set(8, 15, -8);
  scene.add(secondaryDir);

  // Fluorescent Store Fixtures (Using Emissive meshes instead of 6 expensive PointLights!)
  const fixtureGeo = new THREE.BoxGeometry(3.5, 0.15, 0.8);
  const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x22262e, roughness: 0.5 });
  const tubeGeo = new THREE.BoxGeometry(3.2, 0.05, 0.5);
  const tubeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 1.0,
    roughness: 0.2,
  });

  const lightPositions: [number, number, number][] = [
    [-8, 7.8, 6],
    [-8, 7.8, -4],
    [0, 7.8, 6],
    [0, 7.8, -4],
    [8, 7.8, 6],
    [8, 7.8, -4],
  ];

  lightPositions.forEach(([lx, ly, lz]) => {
    const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
    fixture.position.set(lx, ly + 0.1, lz);
    scene.add(fixture);

    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    tube.position.set(lx, ly - 0.02, lz);
    scene.add(tube);
  });

  // ==========================================
  // 2. FLOOR & CEILING
  // ==========================================
  const floorCanvas = document.createElement('canvas');
  floorCanvas.width = 256;
  floorCanvas.height = 256;
  const fCtx = floorCanvas.getContext('2d');
  if (fCtx) {
    fCtx.fillStyle = '#18202f';
    fCtx.fillRect(0, 0, 256, 256);
    fCtx.strokeStyle = '#273449';
    fCtx.lineWidth = 2;
    const tileSize = 64;
    for (let x = 0; x <= 256; x += tileSize) {
      fCtx.beginPath();
      fCtx.moveTo(x, 0);
      fCtx.lineTo(x, 256);
      fCtx.stroke();
    }
    for (let y = 0; y <= 256; y += tileSize) {
      fCtx.beginPath();
      fCtx.moveTo(0, y);
      fCtx.lineTo(256, y);
      fCtx.stroke();
    }
  }

  const floorTexture = new THREE.CanvasTexture(floorCanvas);
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(16, 12);

  const floorGeo = new THREE.PlaneGeometry(36, 28);
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTexture,
    roughness: 0.3,
    metalness: 0.1,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // Ceiling
  const ceilingGeo = new THREE.PlaneGeometry(36, 28);
  const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x111620, roughness: 0.9 });
  const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 8;
  scene.add(ceiling);

  // Structural ceiling beams (Instanced for speed)
  const beamGeo = new THREE.BoxGeometry(36, 0.4, 0.5);
  const beamMat = new THREE.MeshStandardMaterial({ color: 0x1b2331, roughness: 0.8 });
  const beamMesh = new THREE.InstancedMesh(beamGeo, beamMat, 5);
  const dummy = new THREE.Object3D();
  let bIdx = 0;
  for (let bz = -12; bz <= 12; bz += 6) {
    dummy.position.set(0, 7.8, bz);
    dummy.updateMatrix();
    beamMesh.setMatrixAt(bIdx++, dummy.matrix);
  }
  beamMesh.instanceMatrix.needsUpdate = true;
  scene.add(beamMesh);

  // ==========================================
  // 3. WALLS & ENTRANCE / EXIT PORTALS
  // ==========================================
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x192130, roughness: 0.7 });

  // North, West, East Walls
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(36, 8, 0.6), wallMat);
  backWall.position.set(0, 4, -14);
  scene.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 8, 28), wallMat);
  leftWall.position.set(-18, 4, 0);
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 8, 28), wallMat);
  rightWall.position.set(18, 4, 0);
  scene.add(rightWall);

  // South front wall sections
  const frontLeft = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 0.6), wallMat);
  frontLeft.position.set(-14, 4, 14);
  scene.add(frontLeft);

  const frontMid = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 0.6), wallMat);
  frontMid.position.set(0, 4, 14);
  scene.add(frontMid);

  const frontRight = new THREE.Mesh(new THREE.BoxGeometry(6, 8, 0.6), wallMat);
  frontRight.position.set(15, 4, 14);
  scene.add(frontRight);

  // Top headers
  const headerEntrance = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 0.6), wallMat);
  headerEntrance.position.set(-7, 6.5, 14);
  scene.add(headerEntrance);

  const headerExit = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 0.6), wallMat);
  headerExit.position.set(9, 6.5, 14);
  scene.add(headerExit);

  // Entrance Signage
  const entranceSign = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 0.8, 0.1),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
  );
  entranceSign.position.set(-7, 4.2, 13.6);
  scene.add(entranceSign);

  // Exit Signage
  const exitSign = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 0.8, 0.1),
    new THREE.MeshBasicMaterial({ color: 0x10b981 })
  );
  exitSign.position.set(9, 4.2, 13.6);
  scene.add(exitSign);

  // Welcome Mat
  const welcomeMat = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 4),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.95 })
  );
  welcomeMat.rotation.x = -Math.PI / 2;
  welcomeMat.position.set(-7, 0.01, 11);
  scene.add(welcomeMat);

  // Fast Transparent Glass (Standard Material instead of heavy Physical Material transmission)
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x88ccff,
    transparent: true,
    opacity: 0.35,
    roughness: 0.1,
  });

  const doorGeo = new THREE.BoxGeometry(2.4, 4.2, 0.08);
  const doorL = new THREE.Mesh(doorGeo, glassMat);
  doorL.position.set(-8.2, 2.1, 13.9);
  scene.add(doorL);

  const doorR = new THREE.Mesh(doorGeo, glassMat);
  doorR.position.set(-5.8, 2.1, 13.9);
  scene.add(doorR);

  // ==========================================
  // 4. AISLES & PRODUCT SHELVES (High-Performance Instancing)
  // ==========================================
  const shelfXCoords = [-7, -0.5, 6];
  const shelfLength = 14;
  const shelfDepth = 1.6;
  const shelfHeight = 3.6;

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.3, roughness: 0.4 });
  const shelfPlateMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4 });
  const shelfTiers = [0.6, 1.4, 2.2, 3.0];

  // We will instance ALL product items into 1 Box InstancedMesh and 1 Cylinder InstancedMesh
  const totalBoxItems = 3 * shelfTiers.length * 2 * 12; // ~288 instances
  const itemBoxGeo = new THREE.BoxGeometry(0.35, 0.45, 0.38);
  const itemBoxMat = new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.2 });
  const instancedBoxes = new THREE.InstancedMesh(itemBoxGeo, itemBoxMat, totalBoxItems);
  let boxInstanceIdx = 0;

  const productColors = [
    new THREE.Color(0xef4444),
    new THREE.Color(0x10b981),
    new THREE.Color(0xf59e0b),
    new THREE.Color(0x38bdf8),
    new THREE.Color(0xa855f7),
    new THREE.Color(0xec4899),
  ];

  shelfXCoords.forEach((sx, idx) => {
    const aisleGroup = new THREE.Group();
    aisleGroup.position.set(sx, 0, 0);

    // Central backboard
    const backboard = new THREE.Mesh(new THREE.BoxGeometry(0.1, shelfHeight, shelfLength), frameMat);
    backboard.position.y = shelfHeight / 2;
    aisleGroup.add(backboard);

    // End caps
    const endMat = new THREE.MeshStandardMaterial({
      color: idx === 1 ? 0x0284c7 : 0x475569,
      roughness: 0.3,
    });
    [-shelfLength / 2, shelfLength / 2].forEach((ez) => {
      const endPost = new THREE.Mesh(new THREE.BoxGeometry(shelfDepth + 0.2, shelfHeight, 0.2), endMat);
      endPost.position.set(0, shelfHeight / 2, ez);
      aisleGroup.add(endPost);
    });

    // Multi-tier shelves
    shelfTiers.forEach((ty) => {
      [-shelfDepth / 4, shelfDepth / 4].forEach((tx) => {
        const shelfPlate = new THREE.Mesh(
          new THREE.BoxGeometry(shelfDepth / 2, 0.08, shelfLength - 0.2),
          shelfPlateMat
        );
        shelfPlate.position.set(tx, ty, 0);
        aisleGroup.add(shelfPlate);

        // Populate instanced items along shelf
        const numItems = 12;
        const itemStep = (shelfLength - 1.4) / numItems;
        for (let i = 0; i < numItems; i++) {
          if (boxInstanceIdx < totalBoxItems) {
            const worldX = sx + tx;
            const worldY = ty + 0.25;
            const worldZ = -shelfLength / 2 + 0.7 + i * itemStep;

            dummy.position.set(worldX, worldY, worldZ);
            dummy.scale.set(1, 1, 1);
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();

            instancedBoxes.setMatrixAt(boxInstanceIdx, dummy.matrix);
            instancedBoxes.setColorAt(
              boxInstanceIdx,
              productColors[(i + idx * 2) % productColors.length]
            );
            boxInstanceIdx++;
          }
        }
      });
    });

    // Overhead Category Banner
    const bannerNames = ['AISLE 01 - ORGANIC & PANTRY', 'AISLE 02 - ELECTRONICS & AUDIO', 'AISLE 03 - APPAREL & HOME'];
    const bannerCanvas = document.createElement('canvas');
    bannerCanvas.width = 256;
    bannerCanvas.height = 64;
    const bCtx = bannerCanvas.getContext('2d');
    if (bCtx) {
      bCtx.fillStyle = idx === 1 ? '#0369a1' : '#1e293b';
      bCtx.fillRect(0, 0, 256, 64);
      bCtx.fillStyle = '#ffffff';
      bCtx.font = 'bold 15px monospace';
      bCtx.textAlign = 'center';
      bCtx.fillText(bannerNames[idx], 128, 38);
    }
    const bannerTex = new THREE.CanvasTexture(bannerCanvas);
    const bannerMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.8, 3.8),
      new THREE.MeshBasicMaterial({ map: bannerTex })
    );
    bannerMesh.position.set(0, shelfHeight + 0.7, 0);
    aisleGroup.add(bannerMesh);

    scene.add(aisleGroup);
  });

  instancedBoxes.instanceMatrix.needsUpdate = true;
  if (instancedBoxes.instanceColor) instancedBoxes.instanceColor.needsUpdate = true;
  scene.add(instancedBoxes);

  // ==========================================
  // 5. FRESH PRODUCE ISLAND
  // ==========================================
  const produceGroup = new THREE.Group();
  produceGroup.position.set(-14, 0, -2);
  const produceStand = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 1.2, 5.5),
    new THREE.MeshStandardMaterial({ color: 0x3f2e1e, roughness: 0.8 })
  );
  produceStand.position.y = 0.6;
  produceGroup.add(produceStand);

  const crateColors = [0x16a34a, 0xea580c, 0xd97706, 0x84cc16];
  crateColors.forEach((cc, cIdx) => {
    const cx = cIdx % 2 === 0 ? -1.1 : 1.1;
    const cz = cIdx < 2 ? -1.4 : 1.4;
    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.35, 2.2),
      new THREE.MeshStandardMaterial({ color: cc, roughness: 0.6 })
    );
    crate.position.set(cx, 1.35, cz);
    produceGroup.add(crate);
  });
  scene.add(produceGroup);

  // ==========================================
  // 6. CHILLED REFRIGERATION UNITS
  // ==========================================
  const fridgeCaseGeo = new THREE.BoxGeometry(4.2, 4.2, 1.2);
  const fridgeCaseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
  const fridgeGlowMat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9 });

  for (let rz = -12; rz <= 12; rz += 4.5) {
    const fridgeGroup = new THREE.Group();
    fridgeGroup.position.set(rz, 0, -13.2);

    const fridgeCase = new THREE.Mesh(fridgeCaseGeo, fridgeCaseMat);
    fridgeCase.position.y = 2.1;
    fridgeGroup.add(fridgeCase);

    // Subtle cyan backlight strip instead of point light
    const glowStrip = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.1, 0.05), fridgeGlowMat);
    glowStrip.position.set(0, 3.8, 0.5);
    fridgeGroup.add(glowStrip);

    const fridgeGlass = new THREE.Mesh(new THREE.BoxGeometry(3.9, 3.8, 0.05), glassMat);
    fridgeGlass.position.set(0, 2.1, 0.62);
    fridgeGroup.add(fridgeGlass);

    scene.add(fridgeGroup);
  }

  // ==========================================
  // 7. POS CHECKOUT COUNTERS (CAM 3 FOCUS)
  // ==========================================
  const counterGeo = new THREE.BoxGeometry(1.6, 1.1, 5.5);
  const counterMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.4 });
  const beltMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
  const screenMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
  const laneMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });

  [10.5, 13.5].forEach((cx) => {
    const checkoutGroup = new THREE.Group();
    checkoutGroup.position.set(cx, 0, 1);

    const counter = new THREE.Mesh(counterGeo, counterMat);
    counter.position.y = 0.55;
    checkoutGroup.add(counter);

    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 4.8), beltMat);
    belt.position.set(0, 1.13, 0);
    checkoutGroup.add(belt);

    // Register screen
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 0.05), screenMat);
    screen.position.set(0.5, 1.75, 0.8);
    screen.rotation.y = -Math.PI / 4;
    checkoutGroup.add(screen);

    // Lane indicator sign
    const laneSign = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.2), laneMat);
    laneSign.position.set(0, 3.2, 0);
    checkoutGroup.add(laneSign);

    scene.add(checkoutGroup);
  });

  // ==========================================
  // 8. SECURITY EAS GATES (ANTI-THEFT SENSORS - CAM 4 FOCUS)
  // ==========================================
  const easGroup = new THREE.Group();
  easGroup.position.set(9, 0, 11.5);

  const towerMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.2 });

  [-1.4, 1.4].forEach((px) => {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.4, 0.7), towerMat);
    tower.position.set(px, 1.25, 0);
    easGroup.add(tower);

    const strobeMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.15, 8),
      new THREE.MeshBasicMaterial({ color: 0x0284c7 })
    );
    strobeMesh.position.set(px, 2.5, 0);
    easGroup.add(strobeMesh);
    easGateMeshList.push(strobeMesh);

    // Single strobe light that is only active when alarming
    const strobeLight = new THREE.PointLight(0xef4444, 0, 10);
    strobeLight.position.set(px, 2.7, 0);
    easGroup.add(strobeLight);
    easStrobeLights.push(strobeLight);
  });

  scene.add(easGroup);

  // ==========================================
  // 9. DOME CCTV FIXTURES
  // ==========================================
  const cctvBaseGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 10);
  const cctvBaseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
  const cctvDomeGeo = new THREE.SphereGeometry(0.24, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const cctvDomeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });
  const ledGeo = new THREE.SphereGeometry(0.035, 6, 6);
  const ledMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

  [
    [-13, 7.6, 11],
    [-1, 7.6, 8],
    [11, 7.6, 3],
    [12.5, 7.6, 12],
  ].forEach(([cx, cy, cz]) => {
    const cam = new THREE.Group();
    cam.position.set(cx, cy, cz);

    const base = new THREE.Mesh(cctvBaseGeo, cctvBaseMat);
    cam.add(base);

    const dome = new THREE.Mesh(cctvDomeGeo, cctvDomeMat);
    dome.rotation.x = Math.PI;
    cam.add(dome);

    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(0.16, -0.05, 0.14);
    cam.add(led);

    scene.add(cam);
    cctvMeshes.push(cam);
  });

  // ==========================================
  // ANIMATION UPDATE
  // ==========================================
  let strobeTimer = 0;
  const update = (delta: number, isAlarmActive: boolean) => {
    if (isAlarmActive) {
      strobeTimer += delta * 12;
      const flash = Math.sin(strobeTimer) > 0 ? 1 : 0;
      easStrobeLights.forEach((light) => {
        light.intensity = flash * 3.5;
      });
      easGateMeshList.forEach((mesh) => {
        (mesh.material as THREE.MeshBasicMaterial).color.setHex(flash ? 0xef4444 : 0x450a0a);
      });
    } else {
      if (easStrobeLights[0].intensity > 0) {
        easStrobeLights.forEach((light) => {
          light.intensity = 0;
        });
        easGateMeshList.forEach((mesh) => {
          (mesh.material as THREE.MeshBasicMaterial).color.setHex(0x0284c7);
        });
      }
    }
  };

  return {
    scene,
    easStrobeLights,
    easGateMeshList,
    cctvMeshes,
    update,
  };
}
