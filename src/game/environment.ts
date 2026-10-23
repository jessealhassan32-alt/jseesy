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
  private roadBumpTexture: THREE.CanvasTexture;
  private waterNormalTexture: THREE.CanvasTexture;
  private billboardTextures: THREE.CanvasTexture[] = [];
  private roadMaterials: THREE.MeshStandardMaterial[] = [];

  constructor(scene: THREE.Scene, dirLight?: THREE.DirectionalLight, hemiLight?: THREE.HemisphereLight) {
    this.scene = scene;
    this.dirLightRef = dirLight || null;
    this.hemiLightRef = hemiLight || null;

    // Create procedural textures
    this.roadTexture = this.createRoadTexture();
    this.roadBumpTexture = this.createRoadBumpTexture();
    this.waterNormalTexture = this.createWaterNormalTexture();
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
    const waterGeo = new THREE.PlaneGeometry(1600, 1600, 1, 1);
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x120a24,
      roughness: 0.06,
      metalness: 0.0,
      ior: 1.33,
      normalMap: this.waterNormalTexture,
      normalScale: new THREE.Vector2(0.6, 0.6),
      envMapIntensity: 1.4,
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

  // High-resolution asphalt: aggregate grain, tyre polish, tar seams and worn paint
  private createRoadTexture(): THREE.CanvasTexture {
    const W = 1024;
    const H = 4096;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#23252d';
    ctx.fillRect(0, 0, W, H);

    // Aggregate grain at several scales
    const grain = ctx.getImageData(0, 0, W, H);
    const d = grain.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 26 + (Math.random() > 0.985 ? 30 : 0) - (Math.random() > 0.97 ? 18 : 0);
      d[i] = Math.max(0, Math.min(255, d[i] + n));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n * 1.05));
    }
    ctx.putImageData(grain, 0, 0);

    // Large-scale tonal patches (repairs, sun bleaching)
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      const r = 60 + Math.random() * 220;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const tone = Math.random() > 0.5 ? '255,255,255' : '0,0,0';
      g.addColorStop(0, `rgba(${tone},0.05)`);
      g.addColorStop(1, `rgba(${tone},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // Darker polished tyre tracks in each lane
    const laneW = W / 4;
    for (let l = 0; l < 4; l++) {
      for (const off of [0.28, 0.72]) {
        const cx = l * laneW + laneW * off;
        const g = ctx.createLinearGradient(cx - 40, 0, cx + 40, 0);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(0.5, 'rgba(0,0,0,0.22)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(cx - 40, 0, 80, H);
      }
    }

    // Tar-sealed cracks
    ctx.strokeStyle = 'rgba(8,8,12,0.75)';
    for (let i = 0; i < 26; i++) {
      ctx.lineWidth = 1.5 + Math.random() * 2.5;
      ctx.beginPath();
      let x = Math.random() * W;
      let y = Math.random() * H;
      ctx.moveTo(x, y);
      const segs = 6 + Math.floor(Math.random() * 10);
      for (let k = 0; k < segs; k++) {
        x += (Math.random() - 0.5) * 70;
        y += (Math.random() - 0.3) * 90;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Worn lane paint with slight edge breakup
    const paint = (x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(35,37,45,0.55)';
      for (let i = 0; i < (w * h) / 60; i++) {
        ctx.fillRect(x + Math.random() * w, y + Math.random() * h, 2, 2);
      }
    };

    const dividers = [256, 512, 768];
    for (const x of dividers) {
      for (let y = 0; y < H; y += 512) {
        paint(x - 7, y + 96, 14, 320, 'rgba(240,240,232,0.92)');
      }
    }

    // Edge lines + neon accent strip
    paint(52, 0, 16, H, 'rgba(250,250,245,0.9)');
    paint(W - 68, 0, 16, H, 'rgba(250,250,245,0.9)');
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ff007f';
    ctx.shadowColor = '#ff007f';
    ctx.fillRect(22, 0, 10, H);
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.fillRect(W - 32, 0, 10, H);
    ctx.shadowBlur = 0;

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;
    return texture;
  }

  // Fine bump detail so low-angle light catches the asphalt surface
  private createRoadBumpTexture(): THREE.CanvasTexture {
    const S = 512;
    const canvas = document.createElement('canvas');
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext('2d')!;
    const img = ctx.createImageData(S, S);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() > 0.6 ? 150 + Math.random() * 105 : 60 + Math.random() * 80;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 34);
    tex.anisotropy = 16;
    return tex;
  }

  // Tileable ripple normal map for the bay water
  private createWaterNormalTexture(): THREE.CanvasTexture {
    const S = 256;
    const height = new Float32Array(S * S);
    const waves = Array.from({ length: 10 }, () => ({
      kx: Math.round((Math.random() - 0.5) * 12),
      ky: Math.round((Math.random() - 0.5) * 12) || 1,
      a: 0.4 + Math.random(),
      p: Math.random() * Math.PI * 2,
    }));
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        let h = 0;
        for (const w of waves) {
          h += w.a * Math.sin(((w.kx * x + w.ky * y) / S) * Math.PI * 2 + w.p);
        }
        height[y * S + x] = h;
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext('2d')!;
    const img = ctx.createImageData(S, S);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const hx = height[y * S + ((x + 1) % S)] - height[y * S + ((x - 1 + S) % S)];
        const hy = height[((y + 1) % S) * S + x] - height[((y - 1 + S) % S) * S + x];
        const n = new THREE.Vector3(-hx * 0.35, -hy * 0.35, 1).normalize();
        const i = (y * S + x) * 4;
        img.data[i] = (n.x * 0.5 + 0.5) * 255;
        img.data[i + 1] = (n.y * 0.5 + 0.5) * 255;
        img.data[i + 2] = (n.z * 0.5 + 0.5) * 255;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(60, 60);
    tex.anisotropy = 16;
    return tex;
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

    // Gradient sky dome with atmospheric horizon glow
    const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), createSkyMaterial());
    sky.renderOrder = -1;
    sky.frustumCulled = false;
    group.add(sky);

    // Stars
    const starCount = 1600;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(0.15 + Math.random() * 0.85);
      starPos[i * 3] = 850 * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = 850 * Math.cos(phi);
      starPos[i * 3 + 2] = 850 * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.8, fog: false })
    );
    group.add(stars);

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
      new THREE.MeshBasicMaterial({ map: sunTex, transparent: true, fog: false, color: new THREE.Color(1.6, 1.4, 1.4) })
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
      bumpMap: this.roadBumpTexture,
      bumpScale: 1.2,
      roughness: 0.5,
      metalness: 0.15,
      envMapIntensity: 0.6,
    });
    this.roadMaterials.push(roadMat);

    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    group.add(road);

    // Barrier walls with neon strips
    const barrierMat = new THREE.MeshStandardMaterial({
      color: 0x6b6d75,
      roughness: 0.85,
      metalness: 0.0,
      bumpMap: this.roadBumpTexture,
      bumpScale: 0.8,
    });
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
    // Keep ripples anchored to the world while the plane follows the player
    this.waterNormalTexture.offset.set(Date.now() * 0.000012, -heroZ / 1600 * 60 + Date.now() * 0.00002);
  }
}

// Synthwave dusk sky: deep violet zenith fading into a hot pink / amber horizon
export function createSkyMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      zenith: { value: new THREE.Color(0x07031a) },
      mid: { value: new THREE.Color(0x3a0f5e) },
      horizon: { value: new THREE.Color(0xff5a7a) },
      glow: { value: new THREE.Color(0xffb347) },
      ground: { value: new THREE.Color(0x0b0516) },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 zenith; uniform vec3 mid; uniform vec3 horizon; uniform vec3 glow; uniform vec3 ground;
      varying vec3 vDir;
      void main() {
        float h = vDir.y;
        vec3 col = mix(horizon, mid, smoothstep(0.0, 0.22, h));
        col = mix(col, zenith, smoothstep(0.22, 0.75, h));
        // Warm sun glow toward the -Z horizon
        float sunAmt = pow(max(dot(normalize(vec3(vDir.x, 0.0, vDir.z)), vec3(0.0, 0.0, -1.0)), 0.0), 6.0);
        col += glow * sunAmt * (1.0 - smoothstep(0.0, 0.35, abs(h))) * 0.9;
        col = mix(col, ground, smoothstep(0.0, -0.08, h));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

// Scene used to pre-filter an environment map so reflections match the sky
export function createSkyEnvironmentScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), createSkyMaterial()));

  const sun = new THREE.Mesh(new THREE.CircleGeometry(6, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 4, 2) }));
  sun.position.set(0, 5, -45);
  scene.add(sun);

  // Soft overhead light strips (streetlights) for crisp highlights on paint
  const stripMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3.2), side: THREE.DoubleSide });
  for (let i = -2; i <= 2; i++) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 30), stripMat);
    strip.rotation.x = Math.PI / 2;
    strip.position.set(i * 8, 30, 0);
    scene.add(strip);
  }
  return scene;
}
