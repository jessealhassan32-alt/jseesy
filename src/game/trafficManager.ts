import * as THREE from 'three';

export interface TrafficCar {
  group: THREE.Group;
  lane: number;
  speedKmh: number;
  length: number;
  width: number;
  height: number;
  isSmashed: boolean;
  smashVelocity: THREE.Vector3;
  smashAngularVelocity: THREE.Vector3;
  passedPlayer: boolean;
  type: 'sedan' | 'taxi' | 'truck' | 'suv';
}

export class TrafficManager {
  public scene: THREE.Scene;
  public traffic: TrafficCar[] = [];
  public lanePositions = [-4.8, -1.6, 1.6, 4.8];

  private carColors = [0xef4444, 0x3b82f6, 0x10b981, 0xa855f7, 0xeab308, 0xf97316, 0x94a3b8];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initTraffic();
  }

  private initTraffic() {
    // Spawn 14 initial traffic cars spread along the highway
    for (let i = 0; i < 14; i++) {
      const lane = Math.floor(Math.random() * 4);
      const z = -40 - i * 32 - Math.random() * 15;
      const types: ('sedan' | 'taxi' | 'truck' | 'suv')[] = ['sedan', 'sedan', 'taxi', 'suv', 'truck'];
      const type = types[Math.floor(Math.random() * types.length)];
      this.spawnCar(lane, z, type);
    }
  }

  private spawnCar(lane: number, z: number, type: 'sedan' | 'taxi' | 'truck' | 'suv') {
    const group = new THREE.Group();
    let length = 4.0;
    let width = 1.8;
    let height = 1.0;
    let speed = 70 + Math.random() * 30; // km/h

    const color = type === 'taxi' ? 0xfacc15 : this.carColors[Math.floor(Math.random() * this.carColors.length)];
    const carMat = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.7,
      roughness: 0.3,
    });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x151520, roughness: 0.8 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0a0e17, metalness: 0.9, roughness: 0.1 });

    if (type === 'truck') {
      length = 7.5;
      width = 2.4;
      height = 2.6;
      speed = 60 + Math.random() * 20;

      // Cab
      const cab = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.9, 2.2), carMat);
      cab.position.set(0, height * 0.55, 2.4);
      cab.castShadow = true;
      group.add(cab);

      // Cargo Container
      const cargoMat = new THREE.MeshStandardMaterial({ color: 0x222638, metalness: 0.5, roughness: 0.4 });
      const container = new THREE.Mesh(new THREE.BoxGeometry(width * 1.02, height, length - 2.4), cargoMat);
      container.position.set(0, height * 0.6, -1.0);
      container.castShadow = true;
      group.add(container);
    } else {
      // Body
      const body = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.5, length), carMat);
      body.position.y = height * 0.35;
      body.castShadow = true;
      group.add(body);

      // Cabin / Roof
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(width * 0.8, height * 0.45, length * 0.5), glassMat);
      cabin.position.set(0, height * 0.75, -0.2);
      cabin.castShadow = true;
      group.add(cabin);

      // Taxi sign
      if (type === 'taxi') {
        const signGeo = new THREE.BoxGeometry(0.7, 0.22, 0.3);
        const signMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffdd00, emissiveIntensity: 1.5 });
        const taxiSign = new THREE.Mesh(signGeo, signMat);
        taxiSign.position.set(0, height * 1.05, -0.2);
        group.add(taxiSign);
      }
    }

    // Taillights (Red LED)
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xff0033, emissive: 0xff0033, emissiveIntensity: 2.5 });
    const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.08), tailMat);
    tailL.position.set(-width * 0.35, height * 0.4, -length * 0.5);
    const tailR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.08), tailMat);
    tailR.position.set(width * 0.35, height * 0.4, -length * 0.5);
    group.add(tailL);
    group.add(tailR);

    // Headlights (Warm Yellow/White)
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.8 });
    const headL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.08), headMat);
    headL.position.set(-width * 0.35, height * 0.4, length * 0.5);
    const headR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.08), headMat);
    headR.position.set(width * 0.35, height * 0.4, length * 0.5);
    group.add(headL);
    group.add(headR);

    // Wheels
    const wGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.25, 12);
    wGeo.rotateZ(Math.PI / 2);
    const wPositions = [
      [-width * 0.5, 0.35, length * 0.3],
      [width * 0.5, 0.35, length * 0.3],
      [-width * 0.5, 0.35, -length * 0.3],
      [width * 0.5, 0.35, -length * 0.3],
    ];
    wPositions.forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(wGeo, darkMat);
      wheel.position.set(wx, wy, wz);
      wheel.castShadow = true;
      group.add(wheel);
    });

    group.position.set(this.lanePositions[lane], 0, z);
    this.scene.add(group);

    this.traffic.push({
      group,
      lane,
      speedKmh: speed,
      length,
      width,
      height,
      isSmashed: false,
      smashVelocity: new THREE.Vector3(),
      smashAngularVelocity: new THREE.Vector3(),
      passedPlayer: false,
      type,
    });
  }

  public smashCar(car: TrafficCar, impactForce: number = 1.0) {
    if (car.isSmashed) return;
    car.isSmashed = true;
    const signX = (Math.random() - 0.5) * 2;
    car.smashVelocity.set(signX * 18 * impactForce, 24 * impactForce, -20 * impactForce);
    car.smashAngularVelocity.set(
      (Math.random() - 0.5) * 15,
      (Math.random() - 0.5) * 15,
      (Math.random() - 0.5) * 15
    );
  }

  public update(delta: number, heroZ: number): { carsPassed: number } {
    let carsPassed = 0;

    for (const car of this.traffic) {
      if (car.isSmashed) {
        // Physical projectile flight
        car.group.position.x += car.smashVelocity.x * delta;
        car.group.position.y += car.smashVelocity.y * delta;
        car.group.position.z += car.smashVelocity.z * delta;

        car.smashVelocity.y -= 45 * delta; // Gravity

        car.group.rotation.x += car.smashAngularVelocity.x * delta;
        car.group.rotation.y += car.smashAngularVelocity.y * delta;
        car.group.rotation.z += car.smashAngularVelocity.z * delta;
      } else {
        // Normal driving forward (negative Z)
        const forwardSpeedMps = (car.speedKmh / 3.6);
        car.group.position.z -= forwardSpeedMps * delta;

        // Check if passed player
        if (!car.passedPlayer && car.group.position.z > heroZ + 2) {
          car.passedPlayer = true;
          carsPassed++;
        }
      }

      // Recycle car if far behind player or flew way up/down
      if (car.group.position.z > heroZ + 30 || car.group.position.y < -15 || car.group.position.y > 60) {
        this.recycleCar(car, heroZ);
      }
    }

    return { carsPassed };
  }

  private recycleCar(car: TrafficCar, heroZ: number) {
    car.lane = Math.floor(Math.random() * 4);
    car.group.position.set(
      this.lanePositions[car.lane],
      0,
      heroZ - 200 - Math.random() * 80
    );
    car.group.rotation.set(0, 0, 0);
    car.isSmashed = false;
    car.passedPlayer = false;
    car.speedKmh = 70 + Math.random() * 35;
  }
}
