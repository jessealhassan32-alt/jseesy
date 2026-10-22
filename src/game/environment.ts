import * as THREE from 'three';
import { WeatherType } from '../types/game';
import { soundManager } from '../audio/soundManager';

export interface GantrySign {
  group: THREE.Group;
  z: number;
}

export interface CollectibleItem {
  mesh: THREE.Group;
  z: number;
  laneX: number;
  type: 'boost' | 'coin';
  active: boolean;
}

export class HighwayEnvironment {
  public scene: THREE.Scene;
  public roadSegments: THREE.Group[] = [];
  public palmTrees: THREE.Group[] = [];
  public streetLamps: THREE.Group[] = [];
  public gantrySigns: GantrySign[] = [];
  public collectibles: CollectibleItem[] = [];
  public waterMesh: THREE.Mesh;
  public sunGroup: THREE.Group;
  public launchRampGroup: THREE.Group;

  // Rain system
  public rainGroup: THREE.Group;
  public rainPositions!: Float32Array;
  public rainGeometry!: THREE.BufferGeometry;
  public rainLines!: THREE.LineSegments;
  public rainMaterial!: THREE.LineBasicMaterial;
  public rainCount = 450;

  // Weather state (Vivid, high-visibility synthwave palette)
  public currentWeather: WeatherType = 'sunset';
  private lightningTimer: number = 0;
  private dirLightRef: THREE.DirectionalLight | null = null;
  private hemiLightRef: THREE.HemisphereLight | null = null;

  public readonly roadWidth = 14;
  public readonly laneWidth = 3.2;
  public readonly segmentLength = 80;
  public readonly numSegments = 10; // 800m continuous road buffer
  private furthestForwardZ: number = 0;

  private roadTexture: THREE.CanvasTexture;
  private oceanTexture: THREE.CanvasTexture;
  private billboardTextures: THREE.CanvasTexture[] = [];
  private roadMaterials: THREE.MeshStandardMaterial[] = [];

  constructor(scene: THREE.Scene, dirLight?: THREE.DirectionalLight, hemiLight?: THREE.HemisphereLight) {
    this.scene = scene;
    this.dirLightRef = dirLight || null;
    this.hemiLightRef = hemiLight || null;

    // Create procedural textures
    this.roadTexture = this.createRoadTexture();
    this.oceanTexture = this.createOceanTexture();
    this.billboardTextures = this.createBillboardTextures();

    // 1. Sky & Sun Backdrop (Bright, high-visibility synthwave sunset)
    this.sunGroup = this.createSunsetBackdrop();
    this.scene.add(this.sunGroup);

    // 2. Continuous Highway Segments (800m buffer)
    this.furthestForwardZ = 0;
    for (let i = 0; i < this.numSegments; i++) {
      const seg = this.createRoadSegment();
      const zPos = 40 - i * this.segmentLength;
      seg.position.z = zPos;
      this.roadSegments.push(seg);
      this.scene.add(seg);
      if (zPos < this.furthestForwardZ) {
        this.furthestForwardZ = zPos;
      }
    }

    // 3. Elevated Launch Ramp / Loop Track (As seen in the video intro!)
    this.launchRampGroup = this.createLaunchRamp();
    this.scene.add(this.launchRampGroup);

    // 4. Ocean / Bay Water
    const waterGeo = new THREE.PlaneGeometry(1600, 1600, 32, 32);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x220c38,
      roughness: 0.25,
      metalness: 0.85,
      map: this.oceanTexture,
    });
    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.rotation.x = -Math.PI / 2;
    this.waterMesh.position.y = -2.5;
    this.scene.add(this.waterMesh);

    // 5. Scenery: Palm trees, cyber streetlamps, and gantries
    this.initPalmTrees();
    this.initStreetLamps();
    this.initGantries();
    this.initCollectibles();

    // 6. Rain System
    this.rainGroup = new THREE.Group();
    this.initRain();
    this.scene.add(this.rainGroup);
  }

  // Elevated curved launch ramp matching video 00:00 - 00:03
  private createLaunchRamp(): THREE.Group {
    const group = new THREE.Group();

    // Curved parabolic ramp arch
    const curvePoints = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      // Z goes from +45 down to 0, Y goes from 0 up to 14 then ramps down into launch
      const z = 45 * (1 - t);
      const y = Math.sin(t * Math.PI) * 11 + (1 - t) * 2;
      curvePoints.push(new THREE.Vector3(0, y, z));
    }
    const curve = new THREE.CatmullRomCurve3(curvePoints);

    // Track deck
    const trackGeo = new THREE.TubeGeometry(curve, 32, 2.8, 4, false);
    trackGeo.scale(2.2, 0.15, 1);
    const trackMat = new THREE.MeshStandardMaterial({
      color: 0x252a3d,
      roughness: 0.4,
      metalness: 0.7,
    });
    const trackMesh = new THREE.Mesh(trackGeo, trackMat);
    group.add(trackMesh);

    // Glowing Neon Rails on ramp
    const railMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const railGeoL = new THREE.TubeGeometry(curve, 32, 0.12, 6, false);
    const railMeshL = new THREE.Mesh(railGeoL, railMat);
    railMeshL.position.x = -3.2;
    group.add(railMeshL);

    const railMeshR = new THREE.Mesh(railGeoL.clone(), new THREE.MeshBasicMaterial({ color: 0xff007f }));
    railMeshR.position.x = 3.2;
    group.add(railMeshR);

    // Steel Gantry Support Towers
    const towerGeo = new THREE.BoxGeometry(0.8, 14, 0.8);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x181c28, metalness: 0.8, roughness: 0.3 });

    for (let z = 10; z <= 40; z += 15) {
      const towerL = new THREE.Mesh(towerGeo, towerMat);
      towerL.position.set(-4.5, 6, z);
      group.add(towerL);

      const towerR = new THREE.Mesh(towerGeo, towerMat);
      towerR.position.set(4.5, 6, z);
      group.add(towerR);
    }

    return group;
  }

  private initRain() {
    this.rainGeometry = new THREE.BufferGeometry();
    this.rainPositions = new Float32Array(this.rainCount * 6);
    const halfWidth = 24;
    const heightRange = 32;
    const depthRange = 120;

    for (let i = 0; i < this.rainCount; i++) {
      const idx = i * 6;
      const x = (Math.random() - 0.5) * halfWidth * 2;
      const y = Math.random() * heightRange + 1;
      const z = (Math.random() - 0.5) * depthRange;

      this.rainPositions[idx] = x;
      this.rainPositions[idx + 1] = y;
      this.rainPositions[idx + 2] = z;

      this.rainPositions[idx + 3] = x;
      this.rainPositions[idx + 4] = y - 1.8;
      this.rainPositions[idx + 5] = z + 0.4;
    }

    this.rainGeometry.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    this.rainMaterial = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    this.rainLines = new THREE.LineSegments(this.rainGeometry, this.rainMaterial);
    this.rainGroup.add(this.rainLines);
  }

  private initStreetLamps() {
    const spacing = 36;
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x222738, metalness: 0.8, roughness: 0.2 });
    const cyanLightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x00f0ff,
      emissiveIntensity: 4.0,
    });
    const pinkLightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xff007f,
      emissiveIntensity: 4.0,
    });

    for (let z = 20; z > -600; z -= spacing) {
      const lampL = this.createStreetLamp(lampMat, pinkLightMat, -1);
      lampL.position.set(-this.roadWidth / 2 - 0.5, 0, z);
      this.streetLamps.push(lampL);
      this.scene.add(lampL);

      const lampR = this.createStreetLamp(lampMat, cyanLightMat, 1);
      lampR.position.set(this.roadWidth / 2 + 0.5, 0, z);
      this.streetLamps.push(lampR);
      this.scene.add(lampR);
    }
  }

  private createStreetLamp(poleMat: THREE.Material, headMat: THREE.Material, side: number): THREE.Group {
    const group = new THREE.Group();
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 5.2, 0),
      new THREE.Vector3(side * -1.6, 6.4, 0),
    ]);
    const pole = new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.12, 8, false), poleMat);
    pole.castShadow = true;
    group.add(pole);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.14, 0.85), headMat);
    head.position.set(side * -1.6, 6.35, 0);
    group.add(head);

    return group;
  }

  private createRoadTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Asphalt base (Clean dark asphalt)
    ctx.fillStyle = '#181b26';
    ctx.fillRect(0, 0, 512, 1024);

    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#202433' : '#141620';
      ctx.fillRect(Math.random() * 512, Math.random() * 1024, 2, 2);
    }

    // Lane dashes
    const dividers = [128, 256, 384];
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;

    for (const x of dividers) {
      for (let y = 0; y < 1024; y += 128) {
        ctx.fillRect(x - 3, y + 24, 6, 80);
      }
    }

    // Neon edge stripes
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#ff007f';
    ctx.shadowColor = '#ff007f';
    ctx.fillRect(16, 0, 8, 1024);

    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.fillRect(488, 0, 8, 1024);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createOceanTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#421252');
    grad.addColorStop(0.5, '#1b0c30');
    grad.addColorStop(1, '#0e051a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = 'rgba(255, 120, 200, 0.35)';
    ctx.lineWidth = 2.5;
    for (let y = 0; y < 512; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(128, y - 6, 384, y + 6, 512, y);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(16, 16);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createBillboardTextures(): THREE.CanvasTexture[] {
    const slogans = [
      { top: "JESSE'S HIGHWAY", bot: "FOLLOW @jessej6228 ON INSTAGRAM", col: "#ff007f" },
      { top: "TESLA CYBERTRUCK", bot: "CREATED BY JESSE • @jessej6228", col: "#00f0ff" },
      { top: "SUBWAY SURFERS ❌", bot: "HIGHWAY ROADSTER ✅ BY JESSE", col: "#ffea00" },
      { top: "SWIPE & DODGE", bot: "DOUBLE-TAP IN AIR TO FLIP", col: "#00ff66" },
    ];

    return slogans.map((s) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = '#0c0f1d';
      ctx.fillRect(0, 0, 1024, 256);

      ctx.strokeStyle = s.col;
      ctx.lineWidth = 12;
      ctx.strokeRect(10, 10, 1004, 236);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = s.col;
      ctx.shadowBlur = 24;
      ctx.font = 'bold 74px Orbitron, sans-serif';
      ctx.fillText(s.top, 512, 110);

      ctx.shadowBlur = 12;
      ctx.fillStyle = s.col;
      ctx.font = 'bold 44px Rajdhani, monospace';
      ctx.fillText(s.bot, 512, 195);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    });
  }

  private createSunsetBackdrop(): THREE.Group {
    const group = new THREE.Group();

    // Giant Glowing Sunset Sun (Vivid & Clear)
    const sunCanvas = document.createElement('canvas');
    sunCanvas.width = 512;
    sunCanvas.height = 512;
    const ctx = sunCanvas.getContext('2d')!;

    const sunGrad = ctx.createLinearGradient(0, 0, 0, 512);
    sunGrad.addColorStop(0, '#ffff77');
    sunGrad.addColorStop(0.35, '#ff7700');
    sunGrad.addColorStop(0.7, '#ff0077');
    sunGrad.addColorStop(1, '#aa0077');

    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(256, 256, 240, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#120a24';
    for (let y = 260; y < 490; y += 22) {
      const h = ((y - 250) / 240) * 14;
      ctx.fillRect(0, y, 512, h);
    }

    const sunTex = new THREE.CanvasTexture(sunCanvas);
    sunTex.colorSpace = THREE.SRGBColorSpace;

    const sunMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(360, 360),
      new THREE.MeshBasicMaterial({ map: sunTex, transparent: true })
    );
    sunMesh.position.set(0, 55, -520);
    group.add(sunMesh);

    // Mountain silhouettes
    const mountainGeo = new THREE.ConeGeometry(85, 75, 4);
    mountainGeo.rotateY(Math.PI / 4);
    const mountainMat = new THREE.MeshBasicMaterial({ color: 0x240e3b });

    for (let x = -450; x <= 450; x += 110) {
      const m = new THREE.Mesh(mountainGeo, mountainMat);
      m.position.set(x + (Math.random() * 20 - 10), 18, -500);
      m.scale.set(1 + Math.random() * 0.4, 0.8 + Math.random() * 0.5, 1);
      group.add(m);
    }

    return group;
  }

  private createRoadSegment(): THREE.Group {
    const group = new THREE.Group();

    // Asphalt Deck
    const roadGeo = new THREE.PlaneGeometry(this.roadWidth, this.segmentLength);
    const roadMat = new THREE.MeshStandardMaterial({
      map: this.roadTexture,
      roughness: 0.5,
      metalness: 0.15,
    });
    this.roadMaterials.push(roadMat);

    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    group.add(road);

    // Barrier walls with neon strips
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0x222738, roughness: 0.4, metalness: 0.4 });
    const neonLeftMat = new THREE.MeshBasicMaterial({ color: 0xff007f });
    const neonRightMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

    const barrierGeo = new THREE.BoxGeometry(0.5, 1.2, this.segmentLength);
    const neonStripGeo = new THREE.BoxGeometry(0.1, 0.14, this.segmentLength);

    const leftBarrier = new THREE.Mesh(barrierGeo, barrierMat);
    leftBarrier.position.set(-this.roadWidth / 2 - 0.25, 0.6, 0);
    group.add(leftBarrier);

    const leftNeon = new THREE.Mesh(neonStripGeo, neonLeftMat);
    leftNeon.position.set(-this.roadWidth / 2 + 0.05, 1.15, 0);
    group.add(leftNeon);

    const rightBarrier = new THREE.Mesh(barrierGeo, barrierMat);
    rightBarrier.position.set(this.roadWidth / 2 + 0.25, 0.6, 0);
    group.add(rightBarrier);

    const rightNeon = new THREE.Mesh(neonStripGeo, neonRightMat);
    rightNeon.position.set(this.roadWidth / 2 - 0.05, 1.15, 0);
    group.add(rightNeon);

    // Concrete bridge pier
    const pier = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 8, 12), new THREE.MeshStandardMaterial({ color: 0x141824, roughness: 0.8 }));
    pier.position.set(0, -4.0, 0);
    group.add(pier);

    return group;
  }

  private initPalmTrees() {
    const treeSpacing = 30;
    for (let z = 20; z > -600; z -= treeSpacing) {
      const palmL = this.createPalmTree();
      palmL.position.set(-this.roadWidth / 2 - 3.0, 0, z);
      this.palmTrees.push(palmL);
      this.scene.add(palmL);

      const palmR = this.createPalmTree();
      palmR.position.set(this.roadWidth / 2 + 3.0, 0, z);
      palmR.rotation.y = Math.PI;
      this.palmTrees.push(palmR);
      this.scene.add(palmR);
    }
  }

  private createPalmTree(): THREE.Group {
    const tree = new THREE.Group();
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.5, 3.6, 0),
      new THREE.Vector3(1.3, 7.8, 0),
    ]);
    const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.3, 8, false), new THREE.MeshStandardMaterial({ color: 0x221733, roughness: 0.9 }));
    tree.add(trunk);

    const frondMat = new THREE.MeshStandardMaterial({
      color: 0x1f0b38,
      emissive: 0x3d0e66,
      emissiveIntensity: 0.5,
      roughness: 0.7,
      side: THREE.DoubleSide,
    });

    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      const frondGeo = new THREE.PlaneGeometry(0.95, 4.2);
      frondGeo.translate(0, 2.1, 0);
      const frond = new THREE.Mesh(frondGeo, frondMat);
      frond.position.set(1.3, 7.8, 0);
      frond.rotation.y = angle;
      frond.rotation.z = 0.9 + Math.random() * 0.2;
      tree.add(frond);
    }

    return tree;
  }

  private initGantries() {
    const gantryPositions = [-120, -280, -440, -600];
    gantryPositions.forEach((z, idx) => {
      const gantryGroup = new THREE.Group();
      gantryGroup.position.set(0, 0, z);

      const trussMat = new THREE.MeshStandardMaterial({ color: 0x22273a, metalness: 0.8, roughness: 0.3 });
      const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 8, 0.8), trussMat);
      leftPillar.position.set(-this.roadWidth / 2 - 1, 4, 0);
      gantryGroup.add(leftPillar);

      const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 8, 0.8), trussMat);
      rightPillar.position.set(this.roadWidth / 2 + 1, 4, 0);
      gantryGroup.add(rightPillar);

      const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(this.roadWidth + 4, 0.8, 0.8), trussMat);
      crossBeam.position.set(0, 7.8, 0);
      gantryGroup.add(crossBeam);

      const tex = this.billboardTextures[idx % this.billboardTextures.length];
      const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(12, 3), new THREE.MeshBasicMaterial({ map: tex }));
      signMesh.position.set(0, 6.4, 0.45);
      gantryGroup.add(signMesh);

      const signBack = new THREE.Mesh(new THREE.BoxGeometry(12.1, 3.1, 0.2), new THREE.MeshStandardMaterial({ color: 0x141824, metalness: 0.8 }));
      signBack.position.set(0, 6.4, 0.3);
      gantryGroup.add(signBack);

      this.gantrySigns.push({ group: gantryGroup, z });
      this.scene.add(gantryGroup);
    });
  }

  private initCollectibles() {
    const laneXs = [-4.8, -1.6, 1.6, 4.8];
    for (let i = 0; i < 8; i++) {
      const orbGroup = new THREE.Group();
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.7, 0),
        new THREE.MeshStandardMaterial({
          color: 0x00f0ff,
          emissive: 0x00f0ff,
          emissiveIntensity: 3.0,
          metalness: 0.9,
          roughness: 0.1,
        })
      );
      orbGroup.add(crystal);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.95, 0.07, 8, 16),
        new THREE.MeshBasicMaterial({ color: 0xff00aa })
      );
      ring.rotation.x = Math.PI / 2;
      orbGroup.add(ring);

      const laneX = laneXs[Math.floor(Math.random() * laneXs.length)];
      const z = -60 - i * 55;
      orbGroup.position.set(laneX, 1.2, z);

      this.scene.add(orbGroup);
      this.collectibles.push({ mesh: orbGroup, z, laneX, type: 'boost', active: true });
    }
  }

  // Periodic weather cycle (Clear, vivid, high-visibility!)
  public updateWeather(distance: number, delta: number) {
    const cycleDistance = 600;
    const cycle = Math.floor(distance / cycleDistance) % 4;

    const weatherTypes: WeatherType[] = ['sunset', 'neon_rain', 'synthwave_fog', 'cyber_aurora'];
    const targetWeather = weatherTypes[cycle];
    this.currentWeather = targetWeather;

    const fog = this.scene.fog as THREE.FogExp2;
    if (targetWeather === 'neon_rain') {
      // Vivid cyber rain storm (Never pitch black! Always clear road visibility)
      fog.density = THREE.MathUtils.damp(fog.density, 0.0022, 2, delta);
      fog.color.lerp(new THREE.Color(0x1a1235), 2 * delta);
      this.rainMaterial.opacity = THREE.MathUtils.damp(this.rainMaterial.opacity, 0.85, 4, delta);

      for (const mat of this.roadMaterials) {
        mat.roughness = THREE.MathUtils.damp(mat.roughness, 0.18, 2, delta);
        mat.metalness = THREE.MathUtils.damp(mat.metalness, 0.65, 2, delta);
      }

      this.lightningTimer -= delta;
      if (this.lightningTimer <= 0) {
        this.lightningTimer = 6 + Math.random() * 8;
        this.triggerLightning();
      }
    } else if (targetWeather === 'synthwave_fog') {
      // Atmospheric magenta mist with high visibility
      fog.density = THREE.MathUtils.damp(fog.density, 0.003, 2, delta);
      fog.color.lerp(new THREE.Color(0x35144b), 2 * delta);
      this.rainMaterial.opacity = THREE.MathUtils.damp(this.rainMaterial.opacity, 0.0, 4, delta);

      for (const mat of this.roadMaterials) {
        mat.roughness = THREE.MathUtils.damp(mat.roughness, 0.45, 2, delta);
        mat.metalness = THREE.MathUtils.damp(mat.metalness, 0.25, 2, delta);
      }
    } else if (targetWeather === 'cyber_aurora') {
      // Deep midnight aurora
      fog.density = THREE.MathUtils.damp(fog.density, 0.0018, 2, delta);
      fog.color.lerp(new THREE.Color(0x0e1b2e), 2 * delta);
      this.rainMaterial.opacity = THREE.MathUtils.damp(this.rainMaterial.opacity, 0.0, 4, delta);

      for (const mat of this.roadMaterials) {
        mat.roughness = THREE.MathUtils.damp(mat.roughness, 0.5, 2, delta);
        mat.metalness = THREE.MathUtils.damp(mat.metalness, 0.2, 2, delta);
      }
    } else {
      // Golden Sunset
      fog.density = THREE.MathUtils.damp(fog.density, 0.0016, 2, delta);
      fog.color.lerp(new THREE.Color(0x2a0d42), 2 * delta);
      this.rainMaterial.opacity = THREE.MathUtils.damp(this.rainMaterial.opacity, 0.0, 4, delta);

      for (const mat of this.roadMaterials) {
        mat.roughness = THREE.MathUtils.damp(mat.roughness, 0.55, 2, delta);
        mat.metalness = THREE.MathUtils.damp(mat.metalness, 0.15, 2, delta);
      }
    }
  }

  private triggerLightning() {
    if (!this.dirLightRef) return;
    const origIntensity = this.dirLightRef.intensity;
    this.dirLightRef.intensity = 5.5;
    soundManager.playThunder();

    setTimeout(() => {
      if (this.dirLightRef) this.dirLightRef.intensity = origIntensity;
    }, 120);
  }

  // GUARANTEED INFINITE CONTIGUOUS ROAD LOOP - NEVER LEAVES EMPTY VOID
  public update(delta: number, carSpeedKmh: number, heroZ: number, distance: number) {
    this.updateWeather(distance, delta);

    // Continuous contiguous road tiling
    for (const seg of this.roadSegments) {
      if (seg.position.z > heroZ + 80) {
        // Move behind the furthest forward segment
        seg.position.z = this.furthestForwardZ - this.segmentLength;
        this.furthestForwardZ = seg.position.z;
      }
    }

    // Loop palm trees
    for (const palm of this.palmTrees) {
      if (palm.position.z > heroZ + 40) {
        palm.position.z -= 600;
      }
    }

    // Loop streetlamps
    for (const lamp of this.streetLamps) {
      if (lamp.position.z > heroZ + 40) {
        lamp.position.z -= 600;
      }
    }

    // Loop gantries
    for (const gantry of this.gantrySigns) {
      if (gantry.group.position.z > heroZ + 40) {
        gantry.group.position.z -= 640;
      }
    }

    // Animate collectibles
    const laneXs = [-4.8, -1.6, 1.6, 4.8];
    for (const orb of this.collectibles) {
      orb.mesh.rotation.y += 2.5 * delta;
      orb.mesh.rotation.x = Math.sin(Date.now() * 0.003) * 0.3;

      if (orb.mesh.position.z > heroZ + 30) {
        orb.mesh.position.z = heroZ - 180 - Math.random() * 100;
        orb.mesh.position.x = laneXs[Math.floor(Math.random() * laneXs.length)];
        orb.active = true;
        orb.mesh.visible = true;
      }
    }

    // Animate Rain Particles
    if (this.rainMaterial.opacity > 0.01) {
      this.rainGroup.position.z = heroZ;
      const rainPositions = this.rainGeometry.attributes.position.array as Float32Array;
      const rainFallSpeed = 52 * delta;

      for (let i = 0; i < this.rainCount; i++) {
        const idx = i * 6;
        rainPositions[idx + 1] -= rainFallSpeed;
        rainPositions[idx + 4] -= rainFallSpeed;

        if (rainPositions[idx + 4] < 0) {
          const newY = 28 + Math.random() * 8;
          rainPositions[idx + 1] = newY;
          rainPositions[idx + 4] = newY - 1.8;
        }
      }
      this.rainGeometry.attributes.position.needsUpdate = true;
    }

    // Move backdrop with player
    this.sunGroup.position.z = heroZ;
    this.waterMesh.position.z = heroZ;
  }
}
