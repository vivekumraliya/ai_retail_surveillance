import * as THREE from 'three';
import { CameraId, ShopperAgent, SecurityAlert, HistorySnapshot, AgeBracket, GenderGroup } from './types';
import { consumerJourneyTracker } from '@/lib/consumer-journey-tracker';

interface HumanoidMeshRefs {
  root: THREE.Group;
  torso: THREE.Mesh;
  head: THREE.Mesh;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  basket: THREE.Mesh;
  stolenItem: THREE.Mesh;
  boundingWire: THREE.BoxHelper;
}

export class AudienceManager {
  public agents: ShopperAgent[] = [];
  public historySnapshots: HistorySnapshot[] = [];
  private meshMap = new Map<string, HumanoidMeshRefs>();
  private scene: THREE.Scene;
  private nextBadge = 101;
  private spawnCooldown = 0;
  private alertCallback: (alert: SecurityAlert) => void;
  private isTheftRunning = false;
  private theftCooldown = 0;
  private lastSnapshotTime = 0;

  constructor(scene: THREE.Scene, alertCallback: (alert: SecurityAlert) => void) {
    this.scene = scene;
    this.alertCallback = alertCallback;

    // Seed initial 5-6 shoppers inside store
    this.spawnInitialPopulation();
  }

  private createHumanoidMesh(shirtColor: string, pantsColor: string): HumanoidMeshRefs {
    const root = new THREE.Group();

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf6d5b8, roughness: 0.6 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.5 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.7 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });

    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.55, 0.75, 0.32);
    const torso = new THREE.Mesh(torsoGeo, shirtMat);
    torso.position.y = 1.25;
    torso.castShadow = true;
    root.add(torso);

    // Head
    const headGeo = new THREE.BoxGeometry(0.32, 0.35, 0.32);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.set(0, 1.85, 0);
    head.castShadow = true;
    root.add(head);

    // Hair cap
    const hairGeo = new THREE.BoxGeometry(0.34, 0.12, 0.34);
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.9 });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 1.98, 0);
    root.add(hair);

    // Left Arm (pivot at shoulder)
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.38, 1.55, 0);
    const leftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.65, 0.16), shirtMat);
    leftArmMesh.position.y = -0.3;
    leftArm.add(leftArmMesh);
    root.add(leftArm);

    // Right Arm (pivot at shoulder)
    const rightArm = new THREE.Group();
    rightArm.position.set(0.38, 1.55, 0);
    const rightArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.65, 0.16), shirtMat);
    rightArmMesh.position.y = -0.3;
    rightArm.add(rightArmMesh);
    root.add(rightArm);

    // Shopping Basket in left hand
    const basketGeo = new THREE.BoxGeometry(0.4, 0.28, 0.32);
    const basketMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 });
    const basket = new THREE.Mesh(basketGeo, basketMat);
    basket.position.set(-0.45, 0.9, 0.2);
    root.add(basket);

    // Stolen Item (hidden until shoplifter conceals it)
    const stolenGeo = new THREE.BoxGeometry(0.25, 0.18, 0.15);
    const stolenMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.2 });
    const stolenItem = new THREE.Mesh(stolenGeo, stolenMat);
    stolenItem.position.set(0.15, 1.25, 0.18);
    stolenItem.visible = false;
    root.add(stolenItem);

    // Left Leg (pivot at hip)
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.16, 0.85, 0);
    const leftLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.85, 0.2), pantsMat);
    leftLegMesh.position.y = -0.42;
    const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.32), shoeMat);
    leftShoe.position.set(0, -0.85, 0.05);
    leftLeg.add(leftLegMesh);
    leftLeg.add(leftShoe);
    root.add(leftLeg);

    // Right Leg (pivot at hip)
    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.16, 0.85, 0);
    const rightLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.85, 0.2), pantsMat);
    rightLegMesh.position.y = -0.42;
    const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.32), shoeMat);
    rightShoe.position.set(0, -0.85, 0.05);
    rightLeg.add(rightLegMesh);
    rightLeg.add(rightShoe);
    root.add(rightLeg);

    // 3D Bounding Box visual helper
    const boundBox = new THREE.Box3(new THREE.Vector3(-0.4, 0, -0.4), new THREE.Vector3(0.4, 2.05, 0.4));
    const boundingWire = new THREE.BoxHelper(new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.05, 0.8)), 0x38bdf8);
    boundingWire.visible = false; // rendered in 2D HUD or AI mode
    root.add(boundingWire);

    this.scene.add(root);

    return { root, torso, head, leftArm, rightArm, leftLeg, rightLeg, basket, stolenItem, boundingWire };
  }

  private spawnInitialPopulation() {
    const waypoints: [number, number, number][] = [
      [-12, 0, 4],
      [-5, 0, -3],
      [-1, 0, 2],
      [1, 0, -5],
      [4, 0, 1],
      [7, 0, -3],
      [11, 0, 2],
    ];

    waypoints.forEach(wp => {
      this.spawnAgent(wp, false);
    });
  }

  public spawnAgent(initialPos?: [number, number, number], forceThief = false): ShopperAgent {
    const id = `CUST-${this.nextBadge++}`;
    const gender: GenderGroup = Math.random() > 0.48 ? 'M' : 'F';

    // AI Demographic Estimation (age bracket distribution matching retail shopper demographics)
    const ageRoll = Math.random();
    let ageBracket: AgeBracket;
    let estimatedAge: number;
    if (ageRoll < 0.28) {
      ageBracket = '18-25';
      estimatedAge = 18 + Math.floor(Math.random() * 8);
    } else if (ageRoll < 0.65) {
      ageBracket = '26-35';
      estimatedAge = 26 + Math.floor(Math.random() * 10);
    } else if (ageRoll < 0.88) {
      ageBracket = '36-50';
      estimatedAge = 36 + Math.floor(Math.random() * 15);
    } else {
      ageBracket = '50+';
      estimatedAge = 51 + Math.floor(Math.random() * 18);
    }

    const shirtPalettes = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#dc2626', '#475569', '#0891b2'];
    const pantsPalettes = ['#1e293b', '#334155', '#1e1b4b', '#0f172a'];
    const shirtColor = forceThief ? '#dc2626' : shirtPalettes[Math.floor(Math.random() * shirtPalettes.length)];
    const pantsColor = pantsPalettes[Math.floor(Math.random() * pantsPalettes.length)];

    const pos: [number, number, number] = initialPos || [-7 + (Math.random() - 0.5) * 2, 0, 12];

    const meshRefs = this.createHumanoidMesh(shirtColor, pantsColor);
    this.meshMap.set(id, meshRefs);

    const agent: ShopperAgent = {
      id,
      badgeNumber: this.nextBadge - 1,
      gender,
      ageBracket,
      estimatedAge,
      shirtColor,
      pantsColor,
      position: pos,
      rotationY: Math.PI,
      velocity: [0, 0, 0],
      speed: forceThief ? 3.4 : 1.6 + Math.random() * 0.6,
      state: initialPos ? 'WALKING_AISLE' : 'ENTERING',
      stateTimer: 0,
      isThief: forceThief,
      hasConcealedItem: false,
      itemCount: 0,
      dwellTimeNearElectronics: 0,
      riskScore: forceThief ? 72 : Math.floor(Math.random() * 15),
      targetDestination: null,
      pathTrail: [pos],
      currentActionText: 'Entering storefront entrance',
      screenProjections: {},
    };

    if (forceThief) {
      this.isTheftRunning = true;
      this.alertCallback({
        id: `ALT-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        cameraId: 'cam1',
        cameraName: 'CAM-01 Entrance Foyer',
        shopperId: id,
        severity: 'warning',
        title: 'Suspect Match Ingress',
        description: `Subject ${id} entered with elevated risk profile (Score: ${agent.riskScore}%). Camera tracking engaged.`,
        indicators: ['Facial recognition watchlist query', 'High ingress velocity'],
      });
    }

    this.agents.push(agent);
    consumerJourneyTracker.registerNewCustomer(agent);
    return agent;
  }

  public triggerTheftScenario() {
    // Check if an existing agent can become a thief or spawn one
    const eligible = this.agents.find(a => !a.isThief && a.state !== 'EXITING');
    if (eligible) {
      eligible.isThief = true;
      eligible.riskScore = 75;
      eligible.speed = 3.2;
      eligible.state = 'LOITERING_HIGH_VALUE';
      eligible.targetDestination = [-0.5, 0, -2]; // Electronics shelf
      eligible.currentActionText = 'Re-routing toward High-Value Electronics';

      const mesh = this.meshMap.get(eligible.id);
      if (mesh) {
        (mesh.torso.material as THREE.MeshStandardMaterial).color.setHex(0xdc2626);
      }

      this.isTheftRunning = true;
      this.alertCallback({
        id: `ALT-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        cameraId: 'cam2',
        cameraName: 'CAM-02 Aisle Electronics',
        shopperId: eligible.id,
        severity: 'warning',
        title: 'Anomalous Path Redirection',
        description: `Subject ${eligible.id} diverted abruptly toward Aisle 02 Electronics with high intent pattern.`,
        indicators: ['Trajectory anomaly', 'Targeting premium shelf'],
      });
    } else {
      this.spawnAgent(undefined, true);
    }
  }

  public update(delta: number, cameras: Map<CameraId, THREE.Camera>, isAlarmActive: boolean): { gateAlarmTriggered: boolean } {
    let gateAlarmTriggered = false;
    this.spawnCooldown += delta;
    this.theftCooldown += delta;

    // Automated periodic thief spawn every 45-60s if none running
    if (this.theftCooldown > 45 && !this.isTheftRunning) {
      this.theftCooldown = 0;
      this.triggerTheftScenario();
    }

    // Natural ambient customer influx
    if (this.spawnCooldown > 6 && this.agents.length < 12) {
      this.spawnCooldown = 0;
      this.spawnAgent();
    }

    // Update each customer
    for (let i = this.agents.length - 1; i >= 0; i--) {
      const agent = this.agents[i];
      const mesh = this.meshMap.get(agent.id);
      if (!mesh) continue;

      agent.stateTimer += delta;

      // Update AI State Machine
      this.updateAgentBehavior(agent, delta);

      // Physics / Movement towards destination
      if (agent.targetDestination) {
        const dx = agent.targetDestination[0] - agent.position[0];
        const dz = agent.targetDestination[2] - agent.position[2];
        const dist = Math.hypot(dx, dz);

        if (dist > 0.25) {
          const moveStep = Math.min(agent.speed * delta, dist);
          agent.position[0] += (dx / dist) * moveStep;
          agent.position[2] += (dz / dist) * moveStep;

          // Face movement direction
          const targetRot = Math.atan2(dx, dz);
          agent.rotationY = THREE.MathUtils.lerp(agent.rotationY, targetRot, 0.15);

          // Animate walking limbs
          const walkCycle = performance.now() * 0.008 * agent.speed;
          mesh.leftLeg.rotation.x = Math.sin(walkCycle) * 0.55;
          mesh.rightLeg.rotation.x = -Math.sin(walkCycle) * 0.55;
          mesh.leftArm.rotation.x = -Math.sin(walkCycle) * 0.45;
          mesh.rightArm.rotation.x = Math.sin(walkCycle) * 0.45;
          mesh.torso.position.y = 1.25 + Math.abs(Math.sin(walkCycle * 2)) * 0.04;
        } else {
          // Reached destination
          agent.targetDestination = null;
          mesh.leftLeg.rotation.x = 0;
          mesh.rightLeg.rotation.x = 0;
          mesh.leftArm.rotation.x = 0;
          mesh.rightArm.rotation.x = 0;
          mesh.torso.position.y = 1.25;
        }
      }

      // Record path trails
      // Record path trails
      const lastTrail = agent.pathTrail[agent.pathTrail.length - 1];
      if (!lastTrail || Math.hypot(agent.position[0] - lastTrail[0], agent.position[2] - lastTrail[2]) > 0.8) {
        agent.pathTrail.push([...agent.position]);
        if (agent.pathTrail.length > 15) agent.pathTrail.shift();
      }

      // Record live buying behavior & spatial waypoint trajectory for persistent offline intelligence
      consumerJourneyTracker.recordAgentMotion(agent, delta);

      // Sync 3D Mesh
      mesh.root.position.set(agent.position[0], agent.position[1], agent.position[2]);
      mesh.root.rotation.y = agent.rotationY;

      // Anti-Theft EAS Gate Intercept Check (Exit portal at Z > 11, X between 7 and 11)
      if (agent.isThief && agent.hasConcealedItem && agent.position[2] > 10.5 && agent.position[0] > 7 && agent.position[0] < 12) {
        if (agent.state !== 'INTERCEPTED') {
          agent.state = 'INTERCEPTED';
          agent.riskScore = 100;
          gateAlarmTriggered = true;
          consumerJourneyTracker.finalizeCustomerJourney(agent.id, 'THEFT');
          this.alertCallback({
            id: `ALT-EAS-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            cameraId: 'cam4',
            cameraName: 'CAM-04 Security EAS Exit',
            shopperId: agent.id,
            severity: 'critical',
            title: 'POTENTIAL THEFT DETECTED - EAS GATE BREACH',
            description: `CRITICAL ALARM: Subject ${agent.id} attempted unauthorized egress past EAS barrier with unpaid concealed merchandise!`,
            indicators: [
              'Concealment in Aisle 02 confirmed',
              'Checkout lane bypassed (No POS record)',
              'EAS RF Tag triggered at Exit Sensor',
              'High escape velocity (4.2 m/s)',
            ],
          });
        }
      }

      // Remove agents that have completely exited
      if (agent.state === 'EXITING' && agent.position[2] > 14) {
        consumerJourneyTracker.finalizeCustomerJourney(agent.id, agent.itemCount > 0 ? 'PURCHASED' : 'WALKOUT_EMPTY');
        this.scene.remove(mesh.root);
        this.meshMap.delete(agent.id);
        this.agents.splice(i, 1);
        if (agent.isThief) this.isTheftRunning = false;
        continue;
      }

      if (agent.state === 'INTERCEPTED' && agent.stateTimer > 7) {
        // Apprehended & despawned
        this.scene.remove(mesh.root);
        this.meshMap.delete(agent.id);
        this.agents.splice(i, 1);
        this.isTheftRunning = false;
        continue;
      }

      // Project 3D bounding box to 2D screen coordinates for each camera
      this.computeScreenProjections(agent, mesh, cameras);
    }

    // Periodic snapshot recording for timeline DVR playback (every 150ms)
    const nowMs = performance.now();
    if (nowMs - this.lastSnapshotTime > 150) {
      this.lastSnapshotTime = nowMs;
      this.recordSnapshot(isAlarmActive || gateAlarmTriggered);
    }

    return { gateAlarmTriggered };
  }

  private recordSnapshot(isAlarmActive: boolean) {
    const now = new Date();
    const timeStr = `${now.toTimeString().split(' ')[0]}.${Math.floor(now.getMilliseconds() / 10)
      .toString()
      .padStart(2, '0')}`;

    const snapshot: HistorySnapshot = {
      timestamp: Date.now(),
      timeOffset: 0,
      timeStr,
      isAlarmActive,
      agents: this.agents.map((a) => ({
        id: a.id,
        gender: a.gender,
        ageBracket: a.ageBracket,
        estimatedAge: a.estimatedAge,
        position: [a.position[0], a.position[1], a.position[2]],
        rotationY: a.rotationY,
        state: a.state,
        isThief: a.isThief,
        hasConcealedItem: a.hasConcealedItem,
        riskScore: a.riskScore,
        speed: a.speed,
        actionText: a.currentActionText,
      })),
    };

    this.historySnapshots.push(snapshot);
    if (this.historySnapshots.length > 600) {
      this.historySnapshots.shift();
    }
  }

  public applyHistoricalOffset(
    offsetSeconds: number,
    cameras: Map<CameraId, THREE.Camera>
  ): { timeStr: string; isAlarmActive: boolean } {
    if (this.historySnapshots.length === 0) {
      return { timeStr: new Date().toLocaleTimeString(), isAlarmActive: false };
    }

    const snapshotsAgo = Math.round(Math.abs(offsetSeconds) / 0.15);
    const targetIdx = Math.max(0, this.historySnapshots.length - 1 - snapshotsAgo);
    const snapshot = this.historySnapshots[targetIdx];
    if (!snapshot) {
      return { timeStr: new Date().toLocaleTimeString(), isAlarmActive: false };
    }

    snapshot.agents.forEach((histAgent) => {
      let agent = this.agents.find((a) => a.id === histAgent.id);
      let mesh = this.meshMap.get(histAgent.id);

      if (!agent || !mesh) {
        agent = {
          id: histAgent.id,
          badgeNumber: parseInt(histAgent.id.replace('CUST-', '')) || 101,
          gender: histAgent.gender || 'M',
          ageBracket: histAgent.ageBracket || '26-35',
          estimatedAge: histAgent.estimatedAge || 28,
          shirtColor: histAgent.isThief ? '#dc2626' : '#2563eb',
          pantsColor: '#1e293b',
          position: [...histAgent.position],
          rotationY: histAgent.rotationY,
          velocity: [0, 0, 0],
          speed: histAgent.speed,
          state: histAgent.state,
          stateTimer: 0,
          isThief: histAgent.isThief,
          hasConcealedItem: histAgent.hasConcealedItem,
          itemCount: 1,
          dwellTimeNearElectronics: 0,
          riskScore: histAgent.riskScore,
          targetDestination: null,
          pathTrail: [[...histAgent.position]],
          currentActionText: histAgent.actionText,
          screenProjections: {},
        };
        mesh = this.createHumanoidMesh(agent.shirtColor, agent.pantsColor);
        this.meshMap.set(agent.id, mesh);
        this.agents.push(agent);
      }

      agent.position[0] = histAgent.position[0];
      agent.position[1] = histAgent.position[1];
      agent.position[2] = histAgent.position[2];
      agent.rotationY = histAgent.rotationY;
      agent.state = histAgent.state;
      agent.isThief = histAgent.isThief;
      agent.hasConcealedItem = histAgent.hasConcealedItem;
      agent.riskScore = histAgent.riskScore;
      agent.currentActionText = histAgent.actionText;

      mesh.root.position.set(agent.position[0], agent.position[1], agent.position[2]);
      mesh.root.rotation.y = agent.rotationY;

      if (agent.state === 'PICKING_ITEM') {
        mesh.rightArm.rotation.x = -1.2;
        mesh.rightArm.rotation.z = 0.3;
      } else if (agent.state === 'CONCEALMENT') {
        mesh.rightArm.rotation.x = -1.5;
        mesh.rightArm.rotation.z = -0.5;
        mesh.stolenItem.visible = !agent.hasConcealedItem;
      } else if (agent.state === 'INTERCEPTED') {
        mesh.leftArm.rotation.z = 1.2;
        mesh.rightArm.rotation.z = -1.2;
      } else {
        mesh.rightArm.rotation.x = 0;
        mesh.rightArm.rotation.z = 0;
        mesh.leftArm.rotation.z = 0;
        mesh.stolenItem.visible = false;
      }

      this.computeScreenProjections(agent, mesh, cameras);
    });

    return {
      timeStr: snapshot.timeStr,
      isAlarmActive: snapshot.isAlarmActive,
    };
  }

  private updateAgentBehavior(agent: ShopperAgent, delta: number) {
    const mesh = this.meshMap.get(agent.id);
    if (!mesh) return;

    switch (agent.state) {
      case 'ENTERING': {
        agent.currentActionText = 'Entering store via main sliding doors';
        if (!agent.targetDestination) {
          // Head toward shopping area
          const nextTargetX = -6 + (Math.random() - 0.5) * 6;
          const nextTargetZ = 6 + (Math.random() - 0.5) * 4;
          agent.targetDestination = [nextTargetX, 0, nextTargetZ];
        } else if (agent.stateTimer > 4) {
          agent.state = agent.isThief ? 'LOITERING_HIGH_VALUE' : 'WALKING_AISLE';
          agent.stateTimer = 0;
        }
        break;
      }

      case 'WALKING_AISLE': {
        agent.currentActionText = 'Browsing grocery & merchandise corridors';
        if (!agent.targetDestination) {
          // Choose an aisle coordinate
          const aisleOptions: [number, number, number][] = [
            [-7, 0, (Math.random() - 0.5) * 10],
            [-0.5, 0, (Math.random() - 0.5) * 10],
            [6, 0, (Math.random() - 0.5) * 10],
            [-14, 0, -2 + (Math.random() - 0.5) * 4], // Produce
          ];
          agent.targetDestination = aisleOptions[Math.floor(Math.random() * aisleOptions.length)];
        } else if (agent.stateTimer > 6) {
          agent.state = 'BROWSING_SHELF';
          agent.stateTimer = 0;
        }
        break;
      }

      case 'BROWSING_SHELF': {
        agent.currentActionText = 'Inspecting product labels and pricing';
        // Head turn animation
        mesh.head.rotation.y = Math.sin(agent.stateTimer * 2) * 0.4;

        if (agent.stateTimer > 4) {
          agent.state = 'PICKING_ITEM';
          agent.stateTimer = 0;
        }
        break;
      }

      case 'PICKING_ITEM': {
        agent.currentActionText = 'Reaching arm to shelf to take item';
        // Raise right arm towards shelf
        mesh.rightArm.rotation.x = -1.2;
        mesh.rightArm.rotation.z = 0.3;

        if (agent.stateTimer > 3) {
          mesh.rightArm.rotation.x = 0;
          mesh.rightArm.rotation.z = 0;
          agent.itemCount += 1;
          consumerJourneyTracker.recordProductInteraction(agent.id, 'added_to_cart');
          agent.stateTimer = 0;

          if (agent.itemCount >= 2 && !agent.isThief) {
            agent.state = 'HEADING_CHECKOUT';
          } else {
            agent.state = 'WALKING_AISLE';
          }
        }
        break;
      }

      case 'LOITERING_HIGH_VALUE': {
        agent.currentActionText = 'Loitering near high-value Electronics shelf';
        agent.dwellTimeNearElectronics += delta;
        agent.riskScore = Math.min(88, agent.riskScore + delta * 3);

        // Position in front of Electronics Aisle 2
        if (!agent.targetDestination && Math.hypot(agent.position[0] - (-0.5), agent.position[2] - (-2)) > 1.5) {
          agent.targetDestination = [-0.5, 0, -2];
        }

        // Suspicious head turning (checking for guards / cameras)
        mesh.head.rotation.y = Math.sin(agent.stateTimer * 4) * 0.7;

        if (agent.stateTimer > 5 && !agent.hasConcealedItem) {
          agent.state = 'CONCEALMENT';
          agent.stateTimer = 0;
          this.alertCallback({
            id: `ALT-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            cameraId: 'cam2',
            cameraName: 'CAM-02 Aisle Electronics',
            shopperId: agent.id,
            severity: 'warning',
            title: 'Suspicious Dwell Time & Scanning',
            description: `Subject ${agent.id} exceeded normal dwell threshold (Dwell: ${agent.dwellTimeNearElectronics.toFixed(1)}s). Head scanning pattern detected.`,
            indicators: ['Excessive shelf dwell time', 'Surveillance avoidance gaze'],
          });
        }
        break;
      }

      case 'CONCEALMENT': {
        agent.currentActionText = 'Concealing high-value item inside coat/bag!';
        agent.riskScore = 95;

        // Concealment arm animation: pull hand to chest, show stolen item then hide in jacket
        mesh.rightArm.rotation.x = -1.5;
        mesh.rightArm.rotation.z = -0.5;
        mesh.stolenItem.visible = true;

        if (agent.stateTimer > 3) {
          mesh.stolenItem.visible = false;
          mesh.rightArm.rotation.x = 0;
          mesh.rightArm.rotation.z = 0;
          agent.hasConcealedItem = true;
          consumerJourneyTracker.recordProductInteraction(agent.id, 'concealed');
          agent.state = 'SPRINT_THEFT';
          agent.speed = 4.2; // Sudden sprint towards exit
          agent.stateTimer = 0;

          this.alertCallback({
            id: `ALT-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            cameraId: 'cam2',
            cameraName: 'CAM-02 Aisle Electronics',
            shopperId: agent.id,
            severity: 'critical',
            title: 'SUSPICIOUS CONCEALMENT DETECTED',
            description: `AI Pose Estimator detected hand-to-pocket concealment gesture by ${agent.id} at Electronics rack. Item not in basket!`,
            indicators: [
              'Concealment gesture (Confidence: 96.8%)',
              'Object removed from shelf without scan',
              'Pocket/jacket ingress motion',
            ],
          });
        }
        break;
      }

      case 'SPRINT_THEFT': {
        agent.currentActionText = 'Bypassing checkout and sprinting to Exit Gate!';
        // Head straight to exit gate (X: 9, Z: 13.5), bypassing checkout counters completely!
        agent.targetDestination = [9, 0, 14];
        break;
      }

      case 'HEADING_CHECKOUT': {
        agent.currentActionText = 'Walking to checkout counter conveyor';
        const laneX = Math.random() > 0.5 ? 10.5 : 13.5;
        agent.targetDestination = [laneX, 0, 1.5];

        if (agent.stateTimer > 8) {
          agent.state = 'CHECKOUT_PAYING';
          agent.stateTimer = 0;
        }
        break;
      }

      case 'CHECKOUT_PAYING': {
        agent.currentActionText = 'Scanning items & completing POS payment';
        if (agent.stateTimer > 5) {
          agent.state = 'EXITING';
          agent.stateTimer = 0;
          agent.targetDestination = [9, 0, 14.5];
        }
        break;
      }

      case 'EXITING': {
        agent.currentActionText = 'Exiting store through authorized checkout portal';
        if (!agent.targetDestination) {
          agent.targetDestination = [9, 0, 15];
        }
        break;
      }

      case 'INTERCEPTED': {
        agent.currentActionText = 'HELD BY SECURITY - EAS ALARM SOUNDING';
        agent.targetDestination = null;
        mesh.leftArm.rotation.z = 1.2;
        mesh.rightArm.rotation.z = -1.2;
        break;
      }
    }
  }

  private static _tempVec = new THREE.Vector3();
  private static _headVec = new THREE.Vector3();
  private static _dirToAgent = new THREE.Vector3();
  private static _camDir = new THREE.Vector3();

  private computeScreenProjections(
    agent: ShopperAgent,
    mesh: HumanoidMeshRefs,
    cameras: Map<CameraId, THREE.Camera>
  ) {
    const tempVec = AudienceManager._tempVec;
    const headVec = AudienceManager._headVec;
    const dirToAgent = AudienceManager._dirToAgent;
    const camDir = AudienceManager._camDir;

    cameras.forEach((camera, camId) => {
      // World position of feet and head
      tempVec.set(agent.position[0], agent.position[1], agent.position[2]);
      headVec.set(agent.position[0], agent.position[1] + 2.1, agent.position[2]);

      // Check if in front of camera without allocating new vectors
      dirToAgent.copy(tempVec).sub(camera.position).normalize();
      camera.getWorldDirection(camDir);
      const dot = dirToAgent.dot(camDir);

      if (dot <= 0.2) {
        // Behind or beside camera
        agent.screenProjections[camId] = {
          x: 0,
          y: 0,
          boxWidth: 0,
          boxHeight: 0,
          visible: false,
          depth: 999,
        };
        return;
      }

      // Project to NDC [-1, 1]
      tempVec.project(camera);
      headVec.project(camera);

      // Check if inside frustum
      const inFrustum =
        tempVec.x >= -1.2 &&
        tempVec.x <= 1.2 &&
        tempVec.y >= -1.2 &&
        tempVec.y <= 1.2 &&
        tempVec.z >= 0 &&
        tempVec.z <= 1;

      if (!inFrustum) {
        agent.screenProjections[camId] = {
          x: 0,
          y: 0,
          boxWidth: 0,
          boxHeight: 0,
          visible: false,
          depth: 999,
        };
        return;
      }

      // Convert NDC to normalized 0-1 screen coordinates
      const screenX = (tempVec.x + 1) / 2;
      const screenFootY = (1 - tempVec.y) / 2;
      const screenHeadY = (1 - headVec.y) / 2;

      const boxHeight = Math.max(0.04, Math.abs(screenFootY - screenHeadY));
      const boxWidth = boxHeight * 0.52;
      const centerY = (screenFootY + screenHeadY) / 2;

      agent.screenProjections[camId] = {
        x: screenX,
        y: centerY,
        boxWidth,
        boxHeight,
        visible: true,
        depth: tempVec.z,
      };
    });
  }
}
