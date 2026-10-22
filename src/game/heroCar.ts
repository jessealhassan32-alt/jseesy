import * as THREE from 'three';

export interface CarOptions {
  paintColor: string;
  underglowColor: string;
  plateText: string;
  creatorHandle: string;
}

export class HeroCar {
  public group: THREE.Group;
  public wheels: THREE.Mesh[] = [];
  public wheelGroups: THREE.Group[] = [];
  public wingsLeft: THREE.Group;
  public wingsRight: THREE.Group;
  public thrusterFlames: THREE.Mesh[] = [];
  public underglowLight: THREE.PointLight;
  public underglowMesh: THREE.Mesh;
  public bodyMesh: THREE.Mesh;
  public bodyMaterial: THREE.MeshStandardMaterial;

  private currentWingDeploy: number = 0;

  constructor(options: CarOptions) {
    this.group = new THREE.Group();

    const length = 4.6;
    const width = 2.0;
    const height = 1.35;

    // Body material: Ultra-clean cold-rolled stainless steel / synthwave finish
    this.bodyMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(options.paintColor || '#f06292'),
      metalness: 0.88,
      roughness: 0.22,
    });

    const blackTrimMat = new THREE.MeshStandardMaterial({
      color: 0x12141a,
      roughness: 0.85,
      metalness: 0.2,
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x05070d,
      metalness: 0.95,
      roughness: 0.05,
      transparent: true,
      opacity: 0.92,
    });

    // 1. Primary Exoskeleton: Lower Chassis & Doors
    const lowerBodyGeo = new THREE.BoxGeometry(width, 0.55, length);
    this.bodyMesh = new THREE.Mesh(lowerBodyGeo, this.bodyMaterial);
    this.bodyMesh.position.y = 0.5;
    this.bodyMesh.castShadow = true;
    this.bodyMesh.receiveShadow = true;
    this.group.add(this.bodyMesh);

    // 2. Iconic Cybertruck Triangular Peak Roof (Apex at B-pillar)
    // Sloped Front Hood & Windshield (from nose at Z=length/2 up to roof apex at Z=0.2, Y=height)
    const hoodSlopeLength = Math.hypot(0.65, length * 0.42);
    const hoodGeo = new THREE.BoxGeometry(width * 0.94, 0.08, hoodSlopeLength);
    hoodGeo.rotateX(0.38);
    const hoodMesh = new THREE.Mesh(hoodGeo, this.bodyMaterial);
    hoodMesh.position.set(0, 0.92, length * 0.22);
    hoodMesh.castShadow = true;
    this.group.add(hoodMesh);

    // Front Windshield Glass
    const windshieldGeo = new THREE.BoxGeometry(width * 0.88, 0.06, hoodSlopeLength * 0.7);
    windshieldGeo.rotateX(0.42);
    const windshield = new THREE.Mesh(windshieldGeo, glassMat);
    windshield.position.set(0, 1.05, length * 0.12);
    this.group.add(windshield);

    // Sloped Rear Bed Vault & Glass (from peak down to rear tailgate)
    const bedSlopeLength = Math.hypot(0.6, length * 0.5);
    const bedCoverGeo = new THREE.BoxGeometry(width * 0.94, 0.08, bedSlopeLength);
    bedCoverGeo.rotateX(-0.35);
    const bedCover = new THREE.Mesh(bedCoverGeo, this.bodyMaterial);
    bedCover.position.set(0, 0.95, -length * 0.24);
    bedCover.castShadow = true;
    this.group.add(bedCover);

    // Triangular Side Windows
    const sideGlassGeo = new THREE.BoxGeometry(width * 0.96, 0.45, length * 0.52);
    const sideGlass = new THREE.Mesh(sideGlassGeo, glassMat);
    sideGlass.position.set(0, 0.95, -0.05);
    this.group.add(sideGlass);

    // 3. Front Full-Width Cybertruck Lightbar (Clean bright white LED)
    const headLightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xeeffff,
      emissiveIntensity: 4.0,
      roughness: 0.1,
    });
    const frontLightbar = new THREE.Mesh(new THREE.BoxGeometry(width * 0.98, 0.05, 0.08), headLightMat);
    frontLightbar.position.set(0, 0.65, length * 0.505);
    this.group.add(frontLightbar);

    // Lower auxiliary bumper foglights
    const lowerBumperMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.8 });
    const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(width * 1.02, 0.25, 0.35), lowerBumperMat);
    frontBumper.position.set(0, 0.28, length * 0.48);
    this.group.add(frontBumper);

    // 4. Rear Full-Width Red LED Taillight Bar
    const tailLightMat = new THREE.MeshStandardMaterial({
      color: 0xff0044,
      emissive: 0xff0033,
      emissiveIntensity: 4.5,
      roughness: 0.1,
    });
    const rearLightbar = new THREE.Mesh(new THREE.BoxGeometry(width * 0.98, 0.05, 0.08), tailLightMat);
    rearLightbar.position.set(0, 0.72, -length * 0.505);
    this.group.add(rearLightbar);

    // Rear bumper & diffuser
    const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(width * 1.02, 0.28, 0.35), lowerBumperMat);
    rearBumper.position.set(0, 0.28, -length * 0.48);
    this.group.add(rearBumper);

    // 5. Angular Geometric Wheel Arch Flares
    const flareGeo = new THREE.BoxGeometry(0.12, 0.25, 1.1);
    const flarePositions = [
      [-width * 0.51, 0.48, length * 0.28],
      [width * 0.51, 0.48, length * 0.28],
      [-width * 0.51, 0.48, -length * 0.28],
      [width * 0.51, 0.48, -length * 0.28],
    ];
    flarePositions.forEach(([fx, fy, fz]) => {
      const flare = new THREE.Mesh(flareGeo, blackTrimMat);
      flare.position.set(fx, fy, fz);
      this.group.add(flare);
    });

    // 6. PROMINENT CUSTOM LICENSE PLATE: "JESSE" + "@jessej6228"
    const plateTexture = this.generateLicensePlateTexture(options.plateText || 'JESSE', options.creatorHandle || '@jessej6228');
    const plateMat = new THREE.MeshBasicMaterial({ map: plateTexture });
    const plateMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.32), plateMat);
    plateMesh.position.set(0, 0.42, -length * 0.508);
    plateMesh.rotation.y = Math.PI; // Face backwards towards chasing camera
    this.group.add(plateMesh);

    // 7. Cyber Aerocover Wheels (Realistic Cybertruck polygonal geometric wheels)
    const wheelRadius = 0.46;
    const wheelWidth = 0.34;
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.9, metalness: 0.1 });
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x242833,
      metalness: 0.95,
      roughness: 0.2,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.5,
    });

    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 24);
    wheelGeo.rotateZ(Math.PI / 2);

    const wheelPositions = [
      { x: -width * 0.52, y: wheelRadius * 0.95, z: length * 0.28 },
      { x: width * 0.52, y: wheelRadius * 0.95, z: length * 0.28 },
      { x: -width * 0.52, y: wheelRadius * 0.95, z: -length * 0.28 },
      { x: width * 0.52, y: wheelRadius * 0.95, z: -length * 0.28 },
    ];

    wheelPositions.forEach((pos) => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(pos.x, pos.y, pos.z);

      const tire = new THREE.Mesh(wheelGeo, tireMat);
      tire.castShadow = true;
      wheelGroup.add(tire);

      // Aerocover cap (Cybertruck 7-spoke cover)
      const capGeo = new THREE.CylinderGeometry(wheelRadius * 0.72, wheelRadius * 0.72, 0.04, 7);
      capGeo.rotateZ(Math.PI / 2);
      const cap = new THREE.Mesh(capGeo, rimMat);
      cap.position.x = (pos.x > 0 ? 1 : -1) * (wheelWidth * 0.5 + 0.01);
      wheelGroup.add(cap);

      this.wheels.push(tire);
      this.wheelGroups.push(wheelGroup);
      this.group.add(wheelGroup);
    });

    // 8. Deployable Aerofoil Cyber Wings (for in-air gliding)
    this.wingsLeft = new THREE.Group();
    this.wingsRight = new THREE.Group();

    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x111625,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.8,
      metalness: 0.85,
      roughness: 0.2,
    });
    const bladeGeo = new THREE.BoxGeometry(1.3, 0.04, 0.55);

    const bladeL = new THREE.Mesh(bladeGeo, wingMat);
    bladeL.position.x = -0.65;
    this.wingsLeft.add(bladeL);
    this.wingsLeft.position.set(-width * 0.48, 0.65, -0.2);
    this.wingsLeft.scale.set(0.01, 1, 1);

    const bladeR = new THREE.Mesh(bladeGeo, wingMat);
    bladeR.position.x = 0.65;
    this.wingsRight.add(bladeR);
    this.wingsRight.position.set(width * 0.48, 0.65, -0.2);
    this.wingsRight.scale.set(0.01, 1, 1);

    this.group.add(this.wingsLeft);
    this.group.add(this.wingsRight);

    // 9. Rocket Thrusters (Dual plasma nozzles at rear)
    const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x1f222e, metalness: 0.9, roughness: 0.2 });
    const nozzleGeo = new THREE.CylinderGeometry(0.16, 0.2, 0.4, 16);
    nozzleGeo.rotateX(Math.PI / 2);

    const flameMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.9 });
    const flameGeo = new THREE.ConeGeometry(0.2, 1.2, 12);
    flameGeo.rotateX(-Math.PI / 2);

    const nozzleL = new THREE.Mesh(nozzleGeo, nozzleMat);
    nozzleL.position.set(-0.55, 0.38, -length * 0.5);
    const nozzleR = new THREE.Mesh(nozzleGeo, nozzleMat);
    nozzleR.position.set(0.55, 0.38, -length * 0.5);
    this.group.add(nozzleL);
    this.group.add(nozzleR);

    const flameL = new THREE.Mesh(flameGeo, flameMat);
    flameL.position.set(-0.55, 0.38, -length * 0.5 - 0.6);
    flameL.scale.set(0, 0, 0);

    const flameR = new THREE.Mesh(flameGeo.clone(), flameMat.clone());
    flameR.position.set(0.55, 0.38, -length * 0.5 - 0.6);
    flameR.scale.set(0, 0, 0);

    this.thrusterFlames.push(flameL, flameR);
    this.group.add(flameL);
    this.group.add(flameR);

    // 10. Neon Underglow
    const underglowColor = new THREE.Color(options.underglowColor || '#00f0ff');
    this.underglowLight = new THREE.PointLight(underglowColor, 3, 5);
    this.underglowLight.position.set(0, 0.18, 0);
    this.group.add(this.underglowLight);

    const glowPlaneMat = new THREE.MeshBasicMaterial({
      color: underglowColor,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    this.underglowMesh = new THREE.Mesh(new THREE.PlaneGeometry(width * 1.3, length * 1.1), glowPlaneMat);
    this.underglowMesh.rotation.x = -Math.PI / 2;
    this.underglowMesh.position.y = 0.05;
    this.group.add(this.underglowMesh);
  }

  private generateLicensePlateTexture(plateText: string, handleText: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 200;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, 512, 200);
    grad.addColorStop(0, '#0a0d18');
    grad.addColorStop(0.5, '#151c2e');
    grad.addColorStop(1, '#0a0d18');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 200);

    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, 492, 180);

    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, 472, 160);

    ctx.fillStyle = '#ff77aa';
    ctx.font = 'bold 24px Rajdhani, Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TESLA CYBERTRUCK', 256, 48);

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 12;
    ctx.font = '900 78px Orbitron, sans-serif';
    ctx.fillText(plateText.toUpperCase(), 256, 128);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 28px Rajdhani, monospace';
    ctx.fillText(handleText, 256, 168);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  public updateColor(paintColor: string, underglowColor: string) {
    this.bodyMaterial.color.set(paintColor);
    const glowCol = new THREE.Color(underglowColor);
    this.underglowLight.color.copy(glowCol);
    (this.underglowMesh.material as THREE.MeshBasicMaterial).color.copy(glowCol);
  }

  public update(delta: number, speedKmh: number, isAirborne: boolean, isGliding: boolean, isBoosting: boolean) {
    const wheelAngularSpeed = (speedKmh / 3.6) / 0.46;
    for (const wheel of this.wheels) {
      wheel.rotation.x += wheelAngularSpeed * delta;
    }

    const targetWingDeploy = isGliding ? 1 : 0;
    this.currentWingDeploy = THREE.MathUtils.damp(this.currentWingDeploy, targetWingDeploy, 8, delta);
    this.wingsLeft.scale.x = Math.max(0.01, this.currentWingDeploy);
    this.wingsRight.scale.x = Math.max(0.01, this.currentWingDeploy);

    const flameScale = isBoosting ? 1.0 + Math.random() * 0.4 : 0.0;
    for (const flame of this.thrusterFlames) {
      flame.scale.set(flameScale, flameScale, flameScale * 1.5);
      if (isBoosting) {
        (flame.material as THREE.MeshBasicMaterial).color.set(Math.random() > 0.5 ? 0x00f0ff : 0xff007f);
      }
    }

    this.underglowLight.intensity = isBoosting ? 6.0 : 2.5 + Math.sin(Date.now() * 0.005) * 0.5;
  }
}
