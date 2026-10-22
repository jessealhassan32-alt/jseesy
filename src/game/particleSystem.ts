import * as THREE from 'three';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  scaleGrowth: number;
}

export class ParticleSystem {
  public scene: THREE.Scene;
  private particles: Particle[] = [];
  private smokeMaterial: THREE.MeshBasicMaterial;
  private sparkMaterial: THREE.MeshBasicMaterial;
  private smokeGeo: THREE.SphereGeometry;
  private sparkGeo: THREE.BoxGeometry;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.smokeGeo = new THREE.SphereGeometry(0.3, 6, 6);
    this.sparkGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);

    this.smokeMaterial = new THREE.MeshBasicMaterial({
      color: 0xcccccc,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });

    this.sparkMaterial = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
  }

  // Exhaust smoke puffs while driving
  public emitExhaust(leftPos: THREE.Vector3, rightPos: THREE.Vector3, isBoosting: boolean) {
    const rate = isBoosting ? 2 : 1;
    for (let i = 0; i < rate; i++) {
      this.spawnParticle(
        leftPos,
        new THREE.Vector3((Math.random() - 0.5) * 1.5, Math.random() * 1.5, 8 + Math.random() * 5),
        isBoosting ? 0.4 : 0.6,
        isBoosting ? 0x00ffff : 0x8899aa,
        isBoosting ? 0.45 : 0.25,
        1.5
      );
      this.spawnParticle(
        rightPos,
        new THREE.Vector3((Math.random() - 0.5) * 1.5, Math.random() * 1.5, 8 + Math.random() * 5),
        isBoosting ? 0.4 : 0.6,
        isBoosting ? 0xff00aa : 0x8899aa,
        isBoosting ? 0.45 : 0.25,
        1.5
      );
    }
  }

  // Thick underbody gas / vapor clouds (As seen in video 00:01 - 00:03!)
  public emitUnderbodyGasPuffs(centerPos: THREE.Vector3) {
    for (let i = 0; i < 4; i++) {
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 1.6,
        -0.3,
        (Math.random() - 0.5) * 2.2
      );
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        -1.5 - Math.random() * 2,
        3 + Math.random() * 4
      );
      this.spawnParticle(
        centerPos.clone().add(offset),
        vel,
        0.7 + Math.random() * 0.4,
        0xeeeeff,
        0.5 + Math.random() * 0.4,
        2.2
      );
    }
  }

  // Explosion burst when smashing cars
  public emitSmashExplosion(pos: THREE.Vector3) {
    const count = 28;
    for (let i = 0; i < count; i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 24,
        Math.random() * 18 + 4,
        (Math.random() - 0.5) * 24
      );
      const isSpark = Math.random() > 0.4;
      const col = Math.random() > 0.5 ? 0xffea00 : (Math.random() > 0.5 ? 0xff0055 : 0x00f0ff);
      this.spawnParticle(pos, vel, 0.8 + Math.random() * 0.5, col, isSpark ? 0.2 : 0.6, isSpark ? 0.5 : 2.5);
    }
  }

  // Jump cloud ring
  public emitJumpPuff(pos: THREE.Vector3) {
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 4 + Math.random() * 2;
      const vel = new THREE.Vector3(Math.cos(angle) * speed, 0.5, Math.sin(angle) * speed);
      this.spawnParticle(pos, vel, 0.5, 0x00f0ff, 0.35, 1.8);
    }
  }

  private spawnParticle(
    origin: THREE.Vector3,
    velocity: THREE.Vector3,
    maxLife: number,
    colorHex: number,
    initScale: number,
    scaleGrowth: number
  ) {
    const mat = this.smokeMaterial.clone();
    mat.color.setHex(colorHex);

    const mesh = new THREE.Mesh(this.smokeGeo, mat);
    mesh.position.copy(origin);
    mesh.scale.setScalar(initScale);
    this.scene.add(mesh);

    this.particles.push({
      mesh,
      velocity,
      life: maxLife,
      maxLife,
      scaleGrowth,
    });
  }

  public update(delta: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }

      const progress = 1 - (p.life / p.maxLife); // 0 to 1
      p.mesh.position.addScaledVector(p.velocity, delta);
      p.mesh.scale.setScalar(p.mesh.scale.x + p.scaleGrowth * delta);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.7 * (1 - progress));
    }
  }

  public clear() {
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
      (p.mesh.material as THREE.Material).dispose();
    }
    this.particles = [];
  }
}
