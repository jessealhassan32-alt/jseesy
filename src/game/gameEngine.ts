import * as THREE from 'three';
import { HeroCar, CarOptions } from './heroCar';
import { HighwayEnvironment } from './environment';
import { TrafficManager, TrafficCar } from './trafficManager';
import { ParticleSystem } from './particleSystem';
import { soundManager } from '../audio/soundManager';
import { GameStats, GameStatus, StuntNotification } from '../types/game';

export class GameEngine {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public heroCar: HeroCar;
  public environment: HighwayEnvironment;
  public trafficManager: TrafficManager;
  public particleSystem: ParticleSystem;

  private clock: THREE.Clock;
  private animFrameId: number = 0;
  private isSoftwareGl: boolean = false;
  private container: HTMLDivElement;

  // Game state
  public status: GameStatus = 'idle';
  private introTimer: number = 0; // Countdown 3.6s
  private introCountText: string | null = null;

  public stats: GameStats = {
    score: 0,
    distance: 0,
    carsPassed: 0,
    stuntCount: 0,
    timeElapsed: 0,
    speedKmh: 160,
    boostFuel: 60,
    isBoosting: false,
    isGliding: false,
    isAirborne: false,
    streak: 0,
    maxStreak: 0,
    multiplier: 1,
    weather: 'sunset',
  };

  // Car kinematics
  private currentLane: number = 1; // 0, 1, 2, 3
  private carTargetX: number = -1.6;
  private carCurrentX: number = -1.6;
  private carY: number = 0;
  private carZ: number = 0;
  private carVelocityY: number = 0;
  private targetSpeedKmh: number = 160;
  private currentSpeedKmh: number = 160;

  // Stunt rotation state (in air)
  private rollAngle: number = 0;
  private pitchAngle: number = 0;
  private stuntRollTarget: number = 0;
  private stuntPitchTarget: number = 0;
  private airborneTime: number = 0;
  private stuntsCompletedInAir: number = 0;

  // Input states
  private keys: Record<string, boolean> = {};

  // Touch & Swipe Gesture tracking
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private touchStartTime: number = 0;
  private lastTapTime: number = 0;
  private isTouchHolding: boolean = false;

  // Camera settings
  private baseFov: number = 66;
  private cameraOffset = new THREE.Vector3(0, 3.4, 7.8);
  private cameraLookOffset = new THREE.Vector3(0, 1.2, -8.0);
  private cameraShake: number = 0;

  // Callbacks
  public onStatsUpdate?: (stats: GameStats) => void;
  public onStuntNotify?: (stunt: StuntNotification) => void;
  public onGameOver?: (stats: GameStats) => void;
  public onCountdownUpdate?: (text: string | null) => void;

  constructor(container: HTMLDivElement, options: CarOptions) {
    this.container = container;

    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // Setup Three.js Scene, Camera, Renderer (High brightness, crystal clear visibility!)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a0d2b);
    this.scene.fog = new THREE.FogExp2(0x2a0d42, 0.0016);

    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(this.baseFov, aspect, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25; // Bright, high-clarity exposure
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // Warm Key Light + Rich Fill Light so cars and road are never dark
    const hemiLight = new THREE.HemisphereLight(0x9d4edd, 0xff9100, 1.2);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffbe6b, 2.8);
    dirLight.position.set(-25, 45, -35);
    dirLight.castShadow = !this.isSoftwareGl;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 140;
    dirLight.shadow.camera.left = -25;
    dirLight.shadow.camera.right = 25;
    dirLight.shadow.camera.top = 25;
    dirLight.shadow.camera.bottom = -25;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    // Subsystems
    this.environment = new HighwayEnvironment(this.scene, dirLight, hemiLight);
    this.trafficManager = new TrafficManager(this.scene);
    this.particleSystem = new ParticleSystem(this.scene);
    this.heroCar = new HeroCar(options);
    this.scene.add(this.heroCar.group);

    this.clock = new THREE.Clock();
    this.setupInputs();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.resetCarToRamp();
    this.updateCamera(0.016);
  }

  private setupInputs() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    this.container.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.container.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.container.addEventListener('touchend', this.handleTouchEnd, { passive: false });

    this.container.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;

    if (this.status === 'idle') {
      if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        this.startGame();
      }
      return;
    }

    if (this.status === 'intro') {
      // Tap space to skip straight to GO!
      if (e.code === 'Space') {
        this.finishIntro();
      }
      return;
    }

    if (this.status === 'crashed') {
      if (e.code === 'Space') {
        this.restartGame();
      }
      return;
    }

    if (this.status !== 'playing') return;

    // A/D ALWAYS changes lane (even while airborne!)
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
      this.changeLane(-1);
    } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
      this.changeLane(1);
    }

    // Space = Jump, W/S = Mid-air Flips
    if (e.code === 'Space') {
      if (!this.stats.isAirborne) {
        this.triggerJump();
      }
    } else if (e.code === 'KeyW' || e.code === 'ArrowUp') {
      if (this.stats.isAirborne) {
        this.triggerFlip(1);
      }
    } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
      if (this.stats.isAirborne) {
        this.triggerFlip(-1);
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  // FULL SCREEN TOUCH GESTURES
  private handleTouchStart = (e: TouchEvent) => {
    if (this.status === 'idle') {
      this.startGame();
      return;
    }
    if (this.status === 'intro') {
      this.finishIntro();
      return;
    }
    if (this.status === 'crashed') {
      this.restartGame();
      return;
    }
    if (this.status !== 'playing') return;

    const touch = e.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchStartTime = Date.now();
    this.isTouchHolding = true;

    // Check for DOUBLE TAP in mid-air -> Corkscrew Stunt Flip!
    const now = Date.now();
    if (now - this.lastTapTime < 320) {
      if (this.stats.isAirborne) {
        this.triggerDoubleTapAcrobaticFlip();
      } else {
        this.triggerJump();
      }
      this.lastTapTime = 0;
      return;
    }
    this.lastTapTime = now;

    if (this.stats.isAirborne) {
      this.setGliding(true);
    }

    if (e.touches.length >= 2) {
      this.setBoosting(true);
    }
  };

  private handleTouchMove = (e: TouchEvent) => {
    if (this.status !== 'playing') return;
    e.preventDefault();
  };

  private handleTouchEnd = (e: TouchEvent) => {
    if (this.status !== 'playing') return;

    this.isTouchHolding = false;
    this.setGliding(false);
    this.setBoosting(false);

    if (e.changedTouches.length === 0) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    const minSwipeDist = 24;

    if (absX > minSwipeDist || absY > minSwipeDist) {
      if (absX > absY) {
        // Horizontal swipe: ALWAYS change lane (both on road & in air!)
        if (deltaX < 0) {
          this.changeLane(-1);
        } else {
          this.changeLane(1);
        }
      } else {
        // Vertical swipe
        if (deltaY < 0) {
          // Swipe Up
          if (!this.stats.isAirborne) {
            this.triggerJump();
          } else {
            this.triggerFlip(1); // Front flip
          }
        } else {
          // Swipe Down
          if (this.stats.isAirborne) {
            this.triggerFlip(-1); // Back flip
          } else {
            this.targetSpeedKmh = Math.max(90, this.currentSpeedKmh - 40);
          }
        }
      }
    }
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (this.status === 'idle') {
      this.startGame();
      return;
    }
    if (this.status === 'intro') {
      this.finishIntro();
      return;
    }
    if (this.status === 'crashed') {
      this.restartGame();
      return;
    }
    this.touchStartX = e.clientX;
    this.touchStartY = e.clientY;
    this.touchStartTime = Date.now();

    const now = Date.now();
    if (now - this.lastTapTime < 320 && this.stats.isAirborne) {
      this.triggerDoubleTapAcrobaticFlip();
      this.lastTapTime = 0;
      return;
    }
    this.lastTapTime = now;
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (this.status !== 'playing') return;
    const deltaX = e.clientX - this.touchStartX;
    const deltaY = e.clientY - this.touchStartY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX > 25 || absY > 25) {
      if (absX > absY) {
        if (deltaX < 0) this.changeLane(-1);
        else this.changeLane(1);
      } else {
        if (deltaY < 0) {
          if (!this.stats.isAirborne) this.triggerJump();
          else this.triggerFlip(1);
        } else {
          if (this.stats.isAirborne) this.triggerFlip(-1);
        }
      }
    }
  };

  // Lane switching works seamlessly BOTH on ground AND in mid-air!
  public changeLane(direction: -1 | 1) {
    if (this.status !== 'playing') return;
    const newLane = THREE.MathUtils.clamp(this.currentLane + direction, 0, 3);
    if (newLane !== this.currentLane) {
      this.currentLane = newLane;
      this.carTargetX = this.trafficManager.lanePositions[this.currentLane];

      // If in air, add a gentle barrel roll tilt in that direction
      if (this.stats.isAirborne) {
        this.stuntRollTarget += direction * 0.8;
      }
    }
  }

  public triggerJump() {
    if (this.status !== 'playing' || this.stats.isAirborne) return;
    this.stats.isAirborne = true;
    this.carVelocityY = 22;
    this.airborneTime = 0;
    this.stuntsCompletedInAir = 0;
    soundManager.playJump();
    this.particleSystem.emitJumpPuff(new THREE.Vector3(this.carCurrentX, 0.2, this.carZ));
    this.particleSystem.emitUnderbodyGasPuffs(new THREE.Vector3(this.carCurrentX, 0.4, this.carZ));
  }

  public triggerFlip(direction: 1 | -1) {
    if (!this.stats.isAirborne) return;
    this.stuntPitchTarget += direction * Math.PI * 2;
    this.stuntsCompletedInAir++;
    const name = direction === 1 ? 'FRONT FLIP' : 'BACK FLIP';
    this.addScore(120 * this.stats.multiplier, direction === 1 ? 'front_flip' : 'back_flip', `${name} +${120 * this.stats.multiplier}`);
    this.stats.boostFuel = Math.min(100, this.stats.boostFuel + 20);
    soundManager.playStuntChime(this.stuntsCompletedInAir);
    this.particleSystem.emitUnderbodyGasPuffs(new THREE.Vector3(this.carCurrentX, this.carY, this.carZ));
  }

  public triggerDoubleTapAcrobaticFlip() {
    if (!this.stats.isAirborne) return;
    this.stuntRollTarget += Math.PI * 2;
    this.stuntPitchTarget += Math.PI * 2;
    this.stuntsCompletedInAir += 2;
    this.carVelocityY = Math.max(this.carVelocityY, 12);
    this.addScore(360 * this.stats.multiplier, 'front_flip', `DOUBLE-TAP ACROBATICS +${360 * this.stats.multiplier}`);
    this.stats.boostFuel = Math.min(100, this.stats.boostFuel + 30);
    soundManager.playDoubleTapFlip();
    this.particleSystem.emitJumpPuff(new THREE.Vector3(this.carCurrentX, this.carY, this.carZ));
    this.particleSystem.emitUnderbodyGasPuffs(new THREE.Vector3(this.carCurrentX, this.carY, this.carZ));
  }

  public setBoosting(boosting: boolean) {
    if (this.stats.boostFuel <= 5 && boosting) return;
    if (boosting && !this.stats.isBoosting) {
      soundManager.playBoostIgnite();
      this.cameraShake = 0.45;
    }
    this.stats.isBoosting = boosting;
  }

  public setGliding(gliding: boolean) {
    this.stats.isGliding = gliding && this.stats.isAirborne;
  }

  // CINEMATIC LAUNCH RAMP INTRO: Exactly as seen in video!
  public startGame() {
    this.status = 'intro';
    this.introTimer = 3.6;
    this.resetCarToRamp();
    soundManager.startEngine();
    soundManager.startMusic();
    this.startLoop();
  }

  public restartGame() {
    this.status = 'intro';
    this.introTimer = 3.6;
    this.resetCarToRamp();
    this.stats = {
      score: 0,
      distance: 0,
      carsPassed: 0,
      stuntCount: 0,
      timeElapsed: 0,
      speedKmh: 180,
      boostFuel: 60,
      isBoosting: false,
      isGliding: false,
      isAirborne: false,
      streak: 0,
      maxStreak: 0,
      multiplier: 1,
      weather: 'sunset',
    };
    soundManager.startEngine();
    soundManager.startMusic();
    this.particleSystem.clear();
  }

  private finishIntro() {
    this.status = 'playing';
    this.carY = 0;
    this.carZ = 0;
    this.carVelocityY = 0;
    this.rollAngle = 0;
    this.pitchAngle = 0;
    this.stuntRollTarget = 0;
    this.stuntPitchTarget = 0;
    this.stats.isAirborne = false;
    this.introCountText = null;
    if (this.onCountdownUpdate) this.onCountdownUpdate(null);
    soundManager.playLanding(true);
    this.particleSystem.emitJumpPuff(new THREE.Vector3(this.carCurrentX, 0.2, 0));
  }

  private resetCarToRamp() {
    this.currentLane = 1;
    this.carTargetX = this.trafficManager.lanePositions[1];
    this.carCurrentX = this.carTargetX;
    // Positioned on the launch loop ramp arch in the sky
    this.carZ = 28;
    this.carY = 10.5;
    this.carVelocityY = 0;
    this.rollAngle = 0;
    this.pitchAngle = -0.4;
    this.stuntRollTarget = 0;
    this.stuntPitchTarget = 0;
    this.heroCar.group.position.set(this.carCurrentX, this.carY, this.carZ);
    this.heroCar.group.rotation.set(this.pitchAngle, 0, 0);
  }

  public updateCarCustomization(options: CarOptions) {
    this.heroCar.updateColor(options.paintColor, options.underglowColor);
  }

  public startLoop() {
    if (this.animFrameId) return;
    this.clock.start();

    const tick = () => {
      const delta = Math.min(this.clock.getDelta(), 0.1);
      this.update(delta);
      this.renderer.render(this.scene, this.camera);

      this.animFrameId = requestAnimationFrame(tick);
    };

    this.animFrameId = requestAnimationFrame(tick);
  }

  public stopLoop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }
    soundManager.stopEngine();
    soundManager.stopMusic();
  }

  private update(delta: number) {
    // 1. INTRO LAUNCH SEQUENCE (Matches video 00:00 - 00:04)
    if (this.status === 'intro') {
      this.introTimer -= delta;

      // Update countdown text
      let text = '3';
      if (this.introTimer > 2.5) {
        text = '3';
      } else if (this.introTimer > 1.5) {
        text = '2';
      } else if (this.introTimer > 0.5) {
        text = '1';
      } else {
        text = 'GO!';
      }

      if (text !== this.introCountText) {
        this.introCountText = text;
        if (this.onCountdownUpdate) this.onCountdownUpdate(text);
      }

      // Car kinematics down ramp and launch
      if (this.introTimer > 2.5) {
        // Accelerating down loop arch
        this.carZ -= 12 * delta;
        this.carY = 10.5 - ((3.6 - this.introTimer) / 1.1) * 3;
        this.pitchAngle = -0.45;
      } else if (this.introTimer > 0.4) {
        // Crested lip and flying through air!
        this.carZ -= 38 * delta;
        this.carY -= 7 * delta;
        this.pitchAngle += 3.2 * delta; // flip in mid-air
        // Emit underbody gas vapor clouds!
        this.particleSystem.emitUnderbodyGasPuffs(this.heroCar.group.position);
      } else if (this.introTimer <= 0) {
        // Touchdown on highway at full speed!
        this.finishIntro();
      }

      this.heroCar.group.position.set(this.carCurrentX, Math.max(0, this.carY), this.carZ);
      this.heroCar.group.rotation.set(this.pitchAngle, 0, 0);
      this.heroCar.update(delta, 180, true, false, false);

      this.environment.update(delta, 80, this.carZ, 0);
      this.particleSystem.update(delta);
      this.updateCamera(delta);
      return;
    }

    // 2. ACTIVE GAMEPLAY
    if (this.status === 'playing') {
      this.stats.timeElapsed += delta;

      const keyboardGlide = (this.keys['Space'] || false) && this.stats.isAirborne;
      this.stats.isGliding = keyboardGlide || (this.isTouchHolding && this.stats.isAirborne);

      const wantsBoost = (this.keys['ShiftLeft'] || this.keys['ShiftRight'] || false) && this.stats.boostFuel > 0;
      if (wantsBoost) this.setBoosting(true);

      if (this.stats.isBoosting) {
        this.stats.boostFuel = Math.max(0, this.stats.boostFuel - 28 * delta);
        if (this.stats.boostFuel <= 0) {
          this.stats.isBoosting = false;
        }
      } else {
        this.stats.boostFuel = Math.min(100, this.stats.boostFuel + 3.5 * delta);
      }

      const baseTopSpeed = 190 + Math.min(this.stats.distance * 0.05, 80);
      this.targetSpeedKmh = this.stats.isBoosting ? baseTopSpeed + 130 : baseTopSpeed;
      this.currentSpeedKmh = THREE.MathUtils.damp(this.currentSpeedKmh, this.targetSpeedKmh, 5, delta);
      this.stats.speedKmh = Math.round(this.currentSpeedKmh);

      const speedMps = this.currentSpeedKmh / 3.6;
      const traveled = speedMps * delta;
      this.carZ -= traveled;
      this.stats.distance = Math.round(Math.abs(this.carZ));
      this.stats.score += Math.round(traveled * 0.8 * this.stats.multiplier);

      soundManager.updateEngine(this.stats.speedKmh, this.stats.isBoosting);

      // Lateral movement (Lane switching works everywhere, smoothly damped)
      this.carCurrentX = THREE.MathUtils.damp(this.carCurrentX, this.carTargetX, 14, delta);
      const lateralDiff = this.carTargetX - this.carCurrentX;
      const bankAngle = THREE.MathUtils.clamp(-lateralDiff * 0.25, -0.32, 0.32);

      // Airborne & Jump kinematics
      if (this.stats.isAirborne) {
        this.airborneTime += delta;
        const gravity = this.stats.isGliding ? 14 : 38;
        this.carVelocityY -= gravity * delta;
        this.carY += this.carVelocityY * delta;

        this.rollAngle = THREE.MathUtils.damp(this.rollAngle, this.stuntRollTarget + bankAngle, 12, delta);
        this.pitchAngle = THREE.MathUtils.damp(this.pitchAngle, this.stuntPitchTarget, 12, delta);

        if (this.carY <= 0) {
          this.carY = 0;
          this.carVelocityY = 0;
          this.stats.isAirborne = false;
          this.stats.isGliding = false;

          const normalizedRoll = Math.abs((this.rollAngle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2));
          const isUpright = normalizedRoll < 0.4 || normalizedRoll > (Math.PI * 2 - 0.4);

          if (isUpright) {
            const isPerfect = Math.abs(normalizedRoll) < 0.2;
            const landingPts = isPerfect ? 120 : 60;
            this.stats.streak++;
            this.stats.maxStreak = Math.max(this.stats.maxStreak, this.stats.streak);
            this.stats.multiplier = Math.min(10, 1 + Math.floor(this.stats.streak / 2));
            this.stats.boostFuel = Math.min(100, this.stats.boostFuel + (isPerfect ? 25 : 15));

            soundManager.playLanding(isPerfect);
            this.addScore(
              landingPts * this.stats.multiplier,
              isPerfect ? 'perfect_landing' : 'clean_landing',
              `${isPerfect ? 'PERFECT LANDING' : 'CLEAN LANDING'} +${landingPts * this.stats.multiplier}`
            );
          } else {
            if (!this.stats.isBoosting) {
              this.triggerCrash();
              return;
            } else {
              this.stats.streak = 0;
              this.stats.multiplier = 1;
            }
          }

          this.rollAngle = 0;
          this.pitchAngle = 0;
          this.stuntRollTarget = 0;
          this.stuntPitchTarget = 0;
        }
      } else {
        this.carY = 0;
        this.rollAngle = THREE.MathUtils.damp(this.rollAngle, bankAngle, 14, delta);
        this.pitchAngle = THREE.MathUtils.damp(this.pitchAngle, 0, 14, delta);
      }

      this.heroCar.group.position.set(this.carCurrentX, this.carY, this.carZ);
      this.heroCar.group.rotation.set(this.pitchAngle, 0, this.rollAngle);
      this.heroCar.update(delta, this.currentSpeedKmh, this.stats.isAirborne, this.stats.isGliding, this.stats.isBoosting);

      const leftExhaust = new THREE.Vector3(this.carCurrentX - 0.55, this.carY + 0.38, this.carZ + 2.2);
      const rightExhaust = new THREE.Vector3(this.carCurrentX + 0.55, this.carY + 0.38, this.carZ + 2.2);
      this.particleSystem.emitExhaust(leftExhaust, rightExhaust, this.stats.isBoosting);

      this.environment.update(delta, this.currentSpeedKmh, this.carZ, this.stats.distance);
      this.stats.weather = this.environment.currentWeather;

      const trafficResult = this.trafficManager.update(delta, this.carZ);
      this.stats.carsPassed += trafficResult.carsPassed;

      this.checkCollisions();
      this.checkCollectibles();

      if (this.onStatsUpdate) {
        this.onStatsUpdate({ ...this.stats });
      }
    } else if (this.status === 'crashed') {
      this.carY = Math.max(0, this.carY - 10 * delta);
      this.heroCar.group.rotation.y += 3 * delta;
      this.heroCar.group.rotation.z += 2 * delta;
      this.environment.update(delta, 10, this.carZ, this.stats.distance);
    }

    this.particleSystem.update(delta);
    this.updateCamera(delta);
  }

  private checkCollisions() {
    const heroBox = {
      minX: this.carCurrentX - 0.95,
      maxX: this.carCurrentX + 0.95,
      minY: this.carY,
      maxY: this.carY + 1.35,
      minZ: this.carZ - 2.2,
      maxZ: this.carZ + 2.2,
    };

    for (const car of this.trafficManager.traffic) {
      if (car.isSmashed) continue;

      const cPos = car.group.position;
      const cBox = {
        minX: cPos.x - car.width * 0.5,
        maxX: cPos.x + car.width * 0.5,
        minY: cPos.y,
        maxY: cPos.y + car.height,
        minZ: cPos.z - car.length * 0.5,
        maxZ: cPos.z + car.length * 0.5,
      };

      const overlapX = heroBox.minX < cBox.maxX && heroBox.maxX > cBox.minX;
      const overlapY = heroBox.minY < cBox.maxY && heroBox.maxY > cBox.minY;
      const overlapZ = heroBox.minZ < cBox.maxZ && heroBox.maxZ > cBox.minZ;

      if (overlapX && overlapY && overlapZ) {
        if (this.stats.isBoosting) {
          this.trafficManager.smashCar(car, 1.4);
          this.particleSystem.emitSmashExplosion(cPos);
          this.cameraShake = 0.6;
          soundManager.playSmash();
          this.addScore(200 * this.stats.multiplier, 'smash', `SMASH +${200 * this.stats.multiplier}`);
          this.stats.stuntCount++;
        } else {
          this.triggerCrash();
          return;
        }
      }

      if (!overlapZ && Math.abs(cPos.z - this.carZ) < 3.2 && Math.abs(cPos.x - this.carCurrentX) < 2.5 && !car.passedPlayer && !car.isSmashed) {
        soundManager.playCloseCall();
        this.addScore(50 * this.stats.multiplier, 'close_call', `CLOSE CALL +${50 * this.stats.multiplier}`);
      }

      if (overlapX && overlapZ && this.carY > cBox.maxY && !car.passedPlayer && !car.isSmashed) {
        car.passedPlayer = true;
        this.addScore(100 * this.stats.multiplier, 'flyby', `FLYBY +${100 * this.stats.multiplier}`);
      }
    }
  }

  private checkCollectibles() {
    for (const col of this.environment.collectibles) {
      if (!col.active) continue;

      const dist = col.mesh.position.distanceTo(this.heroCar.group.position);
      if (dist < 2.5) {
        col.active = false;
        col.mesh.visible = false;

        this.stats.boostFuel = Math.min(100, this.stats.boostFuel + 35);
        this.addScore(150 * this.stats.multiplier, 'air_glide', `NITRO BOOST +${150 * this.stats.multiplier}`);
        soundManager.playNitroPickup();
        this.particleSystem.emitJumpPuff(col.mesh.position);
      }
    }
  }

  private addScore(points: number, type: any, text: string) {
    this.stats.score += points;
    this.stats.stuntCount++;
    if (this.onStuntNotify) {
      this.onStuntNotify({
        id: Math.random().toString(),
        points,
        type,
        text,
        timestamp: Date.now(),
      });
    }
  }

  public triggerCrash() {
    this.status = 'crashed';
    soundManager.stopEngine();
    soundManager.stopMusic();
    soundManager.playCrash();
    this.cameraShake = 1.0;
    this.particleSystem.emitSmashExplosion(this.heroCar.group.position);

    if (this.onGameOver) {
      this.onGameOver({ ...this.stats });
    }
  }

  private updateCamera(delta: number) {
    const targetCamZ = this.carZ + this.cameraOffset.z + (this.stats.isBoosting ? 1.5 : 0);
    const targetCamY = this.carY * 0.4 + this.cameraOffset.y;
    const targetCamX = this.carCurrentX * 0.65;

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetCamX, 8, delta);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, targetCamY, 8, delta);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, targetCamZ, 12, delta);

    const targetFov = this.stats.isBoosting ? this.baseFov + 16 : (this.stats.isAirborne ? this.baseFov + 6 : this.baseFov);
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 6, delta);
    this.camera.updateProjectionMatrix();

    const lookTarget = new THREE.Vector3(
      this.carCurrentX * 0.3,
      this.carY * 0.3 + this.cameraLookOffset.y,
      this.carZ + this.cameraLookOffset.z
    );

    if (this.cameraShake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.cameraShake;
      this.camera.position.y += (Math.random() - 0.5) * this.cameraShake;
      this.cameraShake = Math.max(0, this.cameraShake - 2.5 * delta);
    }

    this.camera.lookAt(lookTarget);
  }

  public resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public dispose() {
    this.stopLoop();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.container.removeEventListener('touchstart', this.handleTouchStart);
    this.container.removeEventListener('touchmove', this.handleTouchMove);
    this.container.removeEventListener('touchend', this.handleTouchEnd);
    this.container.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    this.renderer.dispose();
  }
}
