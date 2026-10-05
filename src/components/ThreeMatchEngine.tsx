import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import confetti from 'canvas-confetti';
import { Play, Pause, FastForward, RotateCcw, Volume2, VolumeX, Eye, Shield, Zap, Target, Crosshair, Award } from 'lucide-react';
import { Team, Player, MatchEvent, MatchStats } from '../types';
import { sound } from '../utils/audio';

interface ThreeMatchEngineProps {
  homeTeam: Team;
  awayTeam: Team;
  onMatchFinish?: (stats: MatchStats, events: MatchEvent[]) => void;
  isPracticeMode?: boolean;
}

type CameraMode = 'broadcast' | 'tactical' | 'goal' | 'free';

interface Player3D {
  id: string;
  name: string;
  number: number;
  isHome: boolean;
  position: string;
  isGK: boolean;
  group: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  body: THREE.Mesh;
  targetPos: THREE.Vector3;
  currentPos: THREE.Vector3;
  baseHomePos: THREE.Vector3;
  speed: number;
  hasBall: boolean;
  animTimer: number;
  actionState: 'idle' | 'running' | 'kicking' | 'tackling' | 'celebrating' | 'diving';
}

export const ThreeMatchEngine: React.FC<ThreeMatchEngineProps> = ({
  homeTeam,
  awayTeam,
  onMatchFinish,
  isPracticeMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Match State
  const [isPlaying, setIsPlaying] = useState<boolean>(!isPracticeMode);
  const [matchSpeed, setMatchSpeed] = useState<number>(1);
  const [minute, setMinute] = useState<number>(0);
  const [second, setSecond] = useState<number>(0);
  const [homeScore, setHomeScore] = useState<number>(0);
  const [awayScore, setAwayScore] = useState<number>(0);
  const [cameraMode, setCameraMode] = useState<CameraMode>('broadcast');
  const [commentary, setCommentary] = useState<string>("Uchrashuv boshlanishiga tayyor!");
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [stats, setStats] = useState<MatchStats>({
    homeScore: 0,
    awayScore: 0,
    homeShots: 0,
    awayShots: 0,
    homeShotsOnTarget: 0,
    awayShotsOnTarget: 0,
    homePossession: 54,
    awayPossession: 46,
    homeCorners: 0,
    awayCorners: 0,
    homeFouls: 0,
    awayFouls: 0,
  });

  const [activeCarrier, setActiveCarrier] = useState<{ name: string; number: number; isHome: boolean } | null>(null);
  const [goalAlert, setGoalAlert] = useState<{ scorer: string; team: string; minute: number } | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(sound.isMuted);

  // Interactive Penalty / Free-kick drill state for practice mode
  const [aimX, setAimX] = useState<number>(0); // -4 to 4 (goal width)
  const [aimY, setAimY] = useState<number>(1.5); // 0.2 to 2.4 (goal height)
  const [shotPower, setShotPower] = useState<number>(75);
  const [shotCurve, setShotCurve] = useState<number>(0);
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const [practiceResult, setPracticeResult] = useState<string | null>(null);
  const [practiceStreak, setPracticeStreak] = useState<number>(0);

  // References to mutable Three.js objects
  const threeRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    ball: THREE.Mesh;
    ballVelocity: THREE.Vector3;
    ballPos: THREE.Vector3;
    players: Player3D[];
    carrierPlayer: Player3D | null;
    targetCarrier: Player3D | null;
    pitchWidth: number;
    pitchLength: number;
    isGoalScored: boolean;
    passTimer: number;
    shotTimer: number;
    orbitTarget: THREE.Vector3;
    isMouseDown: boolean;
    mouseX: number;
    mouseY: number;
    cameraAngle: number;
    cameraPitch: number;
    cameraDist: number;
    ballShadow: THREE.Mesh;
    activeRing: THREE.Mesh;
    ledTexture?: THREE.CanvasTexture;
    ledOffset: number;
    netHome?: THREE.Mesh;
    netAway?: THREE.Mesh;
  } | null>(null);

  // Toggle Sound
  const handleToggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  // Tactical Manager Shoutout command in-match
  const handleManagerCommand = (command: 'attack' | 'press' | 'shoot' | 'cross' | 'defend') => {
    if (!threeRef.current) return;
    const { players, carrierPlayer } = threeRef.current;

    if (command === 'shoot') {
      if (carrierPlayer && carrierPlayer.isHome) {
        sound.playKick(1.0);
        triggerShot(carrierPlayer, true);
        setCommentary(`Menejer buyrug'i: ${carrierPlayer.name} darvozaga zarba berdi!`);
      } else {
        setCommentary("To'p raqibda, hozir zarba berib bo'lmaydi!");
      }
    } else if (command === 'press') {
      sound.playWhistle(false);
      setCommentary("Menejer buyrug'i: Barcha o'yinchilar yuqori pressingga o'tdi!");
      players.filter(p => p.isHome && !p.isGK).forEach(p => {
        p.speed = 1.3;
        if (threeRef.current?.ballPos) {
          p.targetPos.lerp(threeRef.current.ballPos, 0.4);
        }
      });
    } else if (command === 'attack') {
      sound.playKick(0.7);
      setCommentary("Menejer buyrug'i: To'liq hujumga o'ting!");
      players.filter(p => p.isHome && !p.isGK).forEach(p => {
        p.targetPos.x += 12;
      });
    } else if (command === 'defend') {
      sound.playWhistle(false);
      setCommentary("Menejer buyrug'i: Barcha orqaga qaytadi, mustahkam himoya!");
      players.filter(p => p.isHome && !p.isGK).forEach(p => {
        p.targetPos.x = Math.min(p.targetPos.x - 15, -10);
      });
    } else if (command === 'cross') {
      if (carrierPlayer && carrierPlayer.isHome) {
        sound.playKick(0.8);
        setCommentary(`Menejer buyrug'i: ${carrierPlayer.name} jarima maydonchasiga to'p uzatdi!`);
        // aim at striker
        const striker = players.find(p => p.isHome && p.position === 'ST');
        if (striker && threeRef.current) {
          threeRef.current.targetCarrier = striker;
          const target = striker.currentPos.clone().add(new THREE.Vector3(2, 0, 0));
          threeRef.current.ballVelocity.subVectors(target, threeRef.current.ballPos).normalize().multiplyScalar(0.75);
          threeRef.current.ballVelocity.y = 0.35; // aerial cross
        }
      }
    }
  };

  // Helper: Trigger a shot towards a goal
  const triggerShot = useCallback((shooter: Player3D, isHomeAttacking: boolean) => {
    if (!threeRef.current) return;
    const { ballPos, ballVelocity } = threeRef.current;
    const goalX = isHomeAttacking ? 52.5 : -52.5;
    const targetY = 0.5 + Math.random() * 2.0;
    const targetZ = (Math.random() - 0.5) * 6.8;

    const shotVec = new THREE.Vector3(goalX, targetY, targetZ).sub(ballPos);
    const dist = shotVec.length();
    shotVec.normalize().multiplyScalar(Math.min(1.4, 0.7 + (shooter.isHome ? 0.4 : 0.3)));
    shotVec.y += 0.15;

    ballVelocity.copy(shotVec);
    shooter.actionState = 'kicking';
    setTimeout(() => {
      shooter.actionState = 'running';
    }, 400);

    // Update stats
    setStats(prev => ({
      ...prev,
      homeShots: isHomeAttacking ? prev.homeShots + 1 : prev.homeShots,
      awayShots: !isHomeAttacking ? prev.awayShots + 1 : prev.awayShots,
      homeShotsOnTarget: isHomeAttacking && Math.abs(targetZ) < 3.5 ? prev.homeShotsOnTarget + 1 : prev.homeShotsOnTarget,
      awayShotsOnTarget: !isHomeAttacking && Math.abs(targetZ) < 3.5 ? prev.awayShotsOnTarget + 1 : prev.awayShotsOnTarget,
    }));
  }, []);

  // Practice Mode: Kick free-kick
  const handlePracticeShoot = () => {
    if (!threeRef.current || isCharging) return;
    setIsCharging(true);
    setPracticeResult(null);

    sound.playKick(shotPower / 100);

    const { ballPos, ballVelocity, players } = threeRef.current;
    ballPos.set(28, 0.25, 0); // 24m from goal

    const targetGoal = new THREE.Vector3(52.5, Math.min(2.4, Math.max(0.2, aimY)), Math.min(3.6, Math.max(-3.6, aimX)));
    const dir = targetGoal.clone().sub(ballPos).normalize();
    const speed = 0.5 + (shotPower / 100) * 0.7;

    ballVelocity.copy(dir.multiplyScalar(speed));
    ballVelocity.y += 0.18 * (shotPower / 100);

    // Add curve
    if (shotCurve !== 0) {
      ballVelocity.z += (shotCurve / 100) * 0.25;
    }

    // GK AI diving
    const gk = players.find(p => !p.isHome && p.isGK);
    if (gk) {
      setTimeout(() => {
        gk.actionState = 'diving';
        gk.targetPos.z = aimX * 0.8 + (Math.random() - 0.5) * 1.5;
        gk.targetPos.y = aimY * 0.5;
      }, 150);
    }

    // Check outcome after ball travel
    setTimeout(() => {
      setIsCharging(false);
      const isInsideGoalY = aimY <= 2.4 && aimY >= 0.1;
      const isInsideGoalZ = Math.abs(aimX) <= 3.66;
      const gkSaved = Math.abs((gk?.targetPos.z || 0) - aimX) < 1.2 && Math.random() > 0.4;

      if (isInsideGoalY && isInsideGoalZ && !gkSaved) {
        sound.playGoalRoar();
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        setPracticeResult("GOOOOL! Ajoyib zarba!");
        setPracticeStreak(s => s + 1);
      } else if (gkSaved) {
        sound.playOohMiss();
        setPracticeResult("Darvozabon ajoyib seyv qildi!");
        setPracticeStreak(0);
      } else {
        sound.playWoodwork();
        setPracticeResult("Noaniq zarba! Biroz to'g'rilang.");
        setPracticeStreak(0);
      }

      if (gk) {
        setTimeout(() => {
          gk.actionState = 'idle';
          gk.targetPos.set(51, 0, 0);
          gk.targetPos.y = 0;
        }, 1200);
      }
    }, 1200);
  };

  // Initialize Three.js Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a101d);
    scene.fog = new THREE.FogExp2(0x0a101d, 0.0035);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 500);
    camera.position.set(0, 42, 60);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    // Sunlight
    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.4);
    sunLight.position.set(25, 65, 35);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 180;
    sunLight.shadow.camera.left = -60;
    sunLight.shadow.camera.right = 60;
    sunLight.shadow.camera.top = 45;
    sunLight.shadow.camera.bottom = -45;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // 4 Stadium Floodlight Towers
    const towerPositions = [
      [-62, 38, -42],
      [62, 38, -42],
      [-62, 38, 42],
      [62, 38, 42],
    ];

    towerPositions.forEach(([x, y, z]) => {
      const spotLight = new THREE.SpotLight(0xcfd8dc, 1.8, 140, Math.PI / 4, 0.4, 1.2);
      spotLight.position.set(x, y, z);
      spotLight.target.position.set(x * 0.2, 0, z * 0.2);
      scene.add(spotLight);
      scene.add(spotLight.target);

      // Tower structure
      const poleGeo = new THREE.CylinderGeometry(0.5, 0.9, y, 8);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(x, y / 2, z);
      scene.add(pole);

      // Light head
      const headGeo = new THREE.BoxGeometry(4.5, 2.5, 2.5);
      const headMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.set(x, y, z);
      scene.add(head);
    });

    // Pitch Dimensions: 105 x 68
    const pitchLength = 105;
    const pitchWidth = 68;

    // Procedural Pitch Texture Canvas
    const pitchCanvas = document.createElement('canvas');
    pitchCanvas.width = 2048;
    pitchCanvas.height = 1024;
    const ctx = pitchCanvas.getContext('2d')!;

    // Grass Mowing Stripes
    const stripeCount = 18;
    const stripeWidth = pitchCanvas.width / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#1b7a3e' : '#228d48';
      ctx.fillRect(i * stripeWidth, 0, stripeWidth, pitchCanvas.height);
    }

    // Pitch Line Markings
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.fillStyle = '#ffffff';

    const pPadX = 80;
    const pPadY = 50;
    const pW = pitchCanvas.width - pPadX * 2;
    const pH = pitchCanvas.height - pPadY * 2;
    const midX = pitchCanvas.width / 2;
    const midY = pitchCanvas.height / 2;

    // Outer boundary
    ctx.strokeRect(pPadX, pPadY, pW, pH);

    // Halfway line
    ctx.beginPath();
    ctx.moveTo(midX, pPadY);
    ctx.lineTo(midX, pitchCanvas.height - pPadY);
    ctx.stroke();

    // Center circle & spot
    ctx.beginPath();
    ctx.arc(midX, midY, pH * 0.15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(midX, midY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Penalty Areas (18-yard boxes)
    const penW = pW * 0.165;
    const penH = pH * 0.6;
    // Left Box
    ctx.strokeRect(pPadX, midY - penH / 2, penW, penH);
    // Left 6-yard box
    ctx.strokeRect(pPadX, midY - (penH * 0.45) / 2, penW * 0.35, penH * 0.45);
    // Left Penalty Spot
    ctx.beginPath();
    ctx.arc(pPadX + penW * 0.66, midY, 5, 0, Math.PI * 2);
    ctx.fill();
    // Left Penalty Arc
    ctx.beginPath();
    ctx.arc(pPadX + penW * 0.66, midY, pH * 0.14, -0.7, 0.7);
    ctx.stroke();

    // Right Box
    ctx.strokeRect(pitchCanvas.width - pPadX - penW, midY - penH / 2, penW, penH);
    // Right 6-yard box
    ctx.strokeRect(pitchCanvas.width - pPadX - penW * 0.35, midY - (penH * 0.45) / 2, penW * 0.35, penH * 0.45);
    // Right Penalty Spot
    ctx.beginPath();
    ctx.arc(pitchCanvas.width - pPadX - penW * 0.66, midY, 5, 0, Math.PI * 2);
    ctx.fill();
    // Right Penalty Arc
    ctx.beginPath();
    ctx.arc(pitchCanvas.width - pPadX - penW * 0.66, midY, pH * 0.14, Math.PI - 0.7, Math.PI + 0.7);
    ctx.stroke();

    // Corner Arcs
    const cornerR = 24;
    [[pPadX, pPadY], [pitchCanvas.width - pPadX, pPadY], [pPadX, pitchCanvas.height - pPadY], [pitchCanvas.width - pPadX, pitchCanvas.height - pPadY]].forEach(([cx, cy], idx) => {
      ctx.beginPath();
      ctx.arc(cx, cy, cornerR, 0, Math.PI * 2);
      ctx.stroke();
    });

    const pitchTexture = new THREE.CanvasTexture(pitchCanvas);
    pitchTexture.wrapS = THREE.ClampToEdgeWrapping;
    pitchTexture.wrapT = THREE.ClampToEdgeWrapping;

    const pitchGeo = new THREE.PlaneGeometry(pitchLength, pitchWidth);
    const pitchMat = new THREE.MeshStandardMaterial({
      map: pitchTexture,
      roughness: 0.85,
      metalness: 0.05,
    });
    const pitch = new THREE.Mesh(pitchGeo, pitchMat);
    pitch.rotation.x = -Math.PI / 2;
    pitch.receiveShadow = true;
    scene.add(pitch);

    // Turf Surrounding Apron
    const apronGeo = new THREE.PlaneGeometry(pitchLength + 16, pitchWidth + 16);
    const apronMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.95 });
    const apron = new THREE.Mesh(apronGeo, apronMat);
    apron.rotation.x = -Math.PI / 2;
    apron.position.y = -0.02;
    apron.receiveShadow = true;
    scene.add(apron);

    // Stadium Grandstands with Crowd
    const createStand = (x: number, z: number, rotY: number, len: number) => {
      const standGroup = new THREE.Group();
      // Concrete tiers
      const tiers = 5;
      for (let t = 0; t < tiers; t++) {
        const stepWidth = 4;
        const stepHeight = 2.4;
        const stepGeo = new THREE.BoxGeometry(len, stepHeight, stepWidth);
        const stepMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
        const step = new THREE.Mesh(stepGeo, stepMat);
        step.position.set(0, (t + 1) * stepHeight * 0.5, t * stepWidth);
        step.receiveShadow = true;
        standGroup.add(step);

        // Crowd rows (instanced-like colorful seats with waving fans)
        const rowGeo = new THREE.BoxGeometry(len - 4, 1.2, 1.8);
        const crowdColors = [0x059669, 0x2563eb, 0xdc2626, 0xf59e0b, 0xe2e8f0];
        const crowdColor = crowdColors[t % crowdColors.length];
        const crowdMat = new THREE.MeshStandardMaterial({ color: crowdColor, roughness: 0.5 });
        const crowdRow = new THREE.Mesh(rowGeo, crowdMat);
        crowdRow.position.set(0, (t + 1) * stepHeight * 0.5 + 1.2, t * stepWidth);
        standGroup.add(crowdRow);
      }

      // Roof
      const roofGeo = new THREE.BoxGeometry(len, 0.8, 22);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.6 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.set(0, 16, 7);
      standGroup.add(roof);

      standGroup.position.set(x, 0, z);
      standGroup.rotation.y = rotY;
      scene.add(standGroup);
    };

    // 4 Grandstands
    createStand(0, -pitchWidth / 2 - 14, 0, pitchLength + 10);
    createStand(0, pitchWidth / 2 + 14, Math.PI, pitchLength + 10);
    createStand(-pitchLength / 2 - 14, 0, Math.PI / 2, pitchWidth + 10);
    createStand(pitchLength / 2 + 14, 0, -Math.PI / 2, pitchWidth + 10);

    // Animated LED Perimeter Boards Canvas
    const ledCanvas = document.createElement('canvas');
    ledCanvas.width = 1024;
    ledCanvas.height = 64;
    const ledCtx = ledCanvas.getContext('2d')!;
    ledCtx.fillStyle = '#020617';
    ledCtx.fillRect(0, 0, ledCanvas.width, ledCanvas.height);
    ledCtx.fillStyle = '#10b981';
    ledCtx.font = 'bold 36px sans-serif';
    ledCtx.fillText('★ FOOTBALL CLUB 3D ★ TOSHKENT LIONS ★ SUPERLIGA ★ FAIR PLAY ★', 20, 44);

    const ledTexture = new THREE.CanvasTexture(ledCanvas);
    ledTexture.wrapS = THREE.RepeatWrapping;
    ledTexture.wrapT = THREE.ClampToEdgeWrapping;
    ledTexture.repeat.set(4, 1);

    const ledMat = new THREE.MeshBasicMaterial({ map: ledTexture });
    const ledGeoLong = new THREE.BoxGeometry(pitchLength + 4, 1.2, 0.4);
    const ledTop = new THREE.Mesh(ledGeoLong, ledMat);
    ledTop.position.set(0, 0.6, -pitchWidth / 2 - 2.5);
    scene.add(ledTop);

    const ledBottom = new THREE.Mesh(ledGeoLong, ledMat);
    ledBottom.position.set(0, 0.6, pitchWidth / 2 + 2.5);
    scene.add(ledBottom);

    // 3D Goals with Posts, Crossbar and Mesh Net
    const createGoal = (posX: number, facingLeft: boolean) => {
      const goalGroup = new THREE.Group();
      const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.8 });
      const postR = 0.18;
      const goalW = 7.32;
      const goalH = 2.44;
      const goalD = 2.2;

      // Left post
      const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(postR, postR, goalH, 16), postMat);
      leftPost.position.set(0, goalH / 2, -goalW / 2);
      leftPost.castShadow = true;
      goalGroup.add(leftPost);

      // Right post
      const rightPost = new THREE.Mesh(new THREE.CylinderGeometry(postR, postR, goalH, 16), postMat);
      rightPost.position.set(0, goalH / 2, goalW / 2);
      rightPost.castShadow = true;
      goalGroup.add(rightPost);

      // Crossbar
      const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(postR, postR, goalW, 16), postMat);
      crossbar.rotation.x = Math.PI / 2;
      crossbar.position.set(0, goalH, 0);
      crossbar.castShadow = true;
      goalGroup.add(crossbar);

      // 3D Net Box
      const netGeo = new THREE.BoxGeometry(goalD, goalH, goalW);
      const netMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.35,
      });
      const net = new THREE.Mesh(netGeo, netMat);
      net.position.set(facingLeft ? goalD / 2 : -goalD / 2, goalH / 2, 0);
      goalGroup.add(net);

      goalGroup.position.set(posX, 0, 0);
      scene.add(goalGroup);
      return net;
    };

    const netHome = createGoal(-pitchLength / 2, false);
    const netAway = createGoal(pitchLength / 2, true);

    // 3D Soccer Ball
    const ballRadius = 0.38;
    const ballGeo = new THREE.SphereGeometry(ballRadius, 32, 24);
    // Ball pattern canvas
    const ballCanvas = document.createElement('canvas');
    ballCanvas.width = 256;
    ballCanvas.height = 128;
    const bCtx = ballCanvas.getContext('2d')!;
    bCtx.fillStyle = '#ffffff';
    bCtx.fillRect(0, 0, 256, 128);
    bCtx.fillStyle = '#0f172a';
    for (let x = 20; x < 256; x += 60) {
      for (let y = 20; y < 128; y += 45) {
        bCtx.beginPath();
        bCtx.arc(x, y, 14, 0, Math.PI * 2);
        bCtx.fill();
      }
    }
    const ballTexture = new THREE.CanvasTexture(ballCanvas);
    const ballMat = new THREE.MeshStandardMaterial({
      map: ballTexture,
      roughness: 0.3,
      metalness: 0.1,
    });
    const ball = new THREE.Mesh(ballGeo, ballMat);
    ball.position.set(0, ballRadius, 0);
    ball.castShadow = true;
    scene.add(ball);

    // Ball contact shadow
    const shadowGeo = new THREE.CircleGeometry(ballRadius * 1.2, 16);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 });
    const ballShadow = new THREE.Mesh(shadowGeo, shadowMat);
    ballShadow.rotation.x = -Math.PI / 2;
    ballShadow.position.y = 0.02;
    scene.add(ballShadow);

    // Floating Active Ball Carrier Indicator Ring
    const ringGeo = new THREE.RingGeometry(1.2, 1.5, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide });
    const activeRing = new THREE.Mesh(ringGeo, ringMat);
    activeRing.rotation.x = -Math.PI / 2;
    activeRing.position.y = 0.04;
    scene.add(activeRing);

    // Helper: Create Articulated 3D Player Mesh
    const create3DPlayer = (
      id: string,
      name: string,
      number: number,
      posStr: string,
      isHome: boolean,
      isGK: boolean,
      kitColor: string
    ): Player3D => {
      const group = new THREE.Group();

      const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.8 });
      const kitMat = new THREE.MeshStandardMaterial({
        color: isGK ? 0x06b6d4 : new THREE.Color(kitColor),
        roughness: 0.5,
      });
      const shortsMat = new THREE.MeshStandardMaterial({
        color: isHome ? 0xffffff : 0x0f172a,
        roughness: 0.6,
      });
      const bootMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });

      // Torso
      const torsoGeo = new THREE.BoxGeometry(0.85, 1.1, 0.45);
      const torso = new THREE.Mesh(torsoGeo, kitMat);
      torso.position.y = 1.6;
      torso.castShadow = true;
      group.add(torso);

      // Head
      const headGeo = new THREE.SphereGeometry(0.32, 16, 12);
      const head = new THREE.Mesh(headGeo, skinMat);
      head.position.y = 2.35;
      head.castShadow = true;
      group.add(head);

      // Hair
      const hairGeo = new THREE.SphereGeometry(0.34, 16, 12);
      const hairMat = new THREE.MeshStandardMaterial({ color: 0x1e1b18, roughness: 0.9 });
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.set(0, 2.44, -0.05);
      group.add(hair);

      // Left Arm
      const leftArm = new THREE.Group();
      leftArm.position.set(-0.55, 2.0, 0);
      const armGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.85, 8);
      const leftArmMesh = new THREE.Mesh(armGeo, skinMat);
      leftArmMesh.position.y = -0.42;
      leftArmMesh.castShadow = true;
      leftArm.add(leftArmMesh);
      group.add(leftArm);

      // Right Arm
      const rightArm = new THREE.Group();
      rightArm.position.set(0.55, 2.0, 0);
      const rightArmMesh = new THREE.Mesh(armGeo, skinMat);
      rightArmMesh.position.y = -0.42;
      rightArmMesh.castShadow = true;
      rightArm.add(rightArmMesh);
      group.add(rightArm);

      // Left Leg
      const leftLeg = new THREE.Group();
      leftLeg.position.set(-0.25, 1.1, 0);
      const legGeo = new THREE.CylinderGeometry(0.15, 0.12, 1.0, 8);
      const leftLegMesh = new THREE.Mesh(legGeo, shortsMat);
      leftLegMesh.position.y = -0.45;
      leftLegMesh.castShadow = true;
      leftLeg.add(leftLegMesh);

      // Boot
      const bootGeo = new THREE.BoxGeometry(0.2, 0.15, 0.35);
      const leftBoot = new THREE.Mesh(bootGeo, bootMat);
      leftBoot.position.set(0, -0.95, 0.08);
      leftLeg.add(leftBoot);
      group.add(leftLeg);

      // Right Leg
      const rightLeg = new THREE.Group();
      rightLeg.position.set(0.25, 1.1, 0);
      const rightLegMesh = new THREE.Mesh(legGeo, shortsMat);
      rightLegMesh.position.y = -0.45;
      rightLegMesh.castShadow = true;
      rightLeg.add(rightLegMesh);

      const rightBoot = new THREE.Mesh(bootGeo, bootMat);
      rightBoot.position.set(0, -0.95, 0.08);
      rightLeg.add(rightBoot);
      group.add(rightLeg);

      scene.add(group);

      return {
        id,
        name,
        number,
        isHome,
        position: posStr,
        isGK,
        group,
        leftLeg,
        rightLeg,
        leftArm,
        rightArm,
        body: torso,
        targetPos: new THREE.Vector3(),
        currentPos: new THREE.Vector3(),
        baseHomePos: new THREE.Vector3(),
        speed: 1.0,
        hasBall: false,
        animTimer: Math.random() * 10,
        actionState: 'idle',
      };
    };

    // Calculate default tactical positions on pitch
    const getFormationPositions = (isHome: boolean, formation: string): THREE.Vector3[] => {
      const dir = isHome ? -1 : 1;
      const positions: THREE.Vector3[] = [];

      // 1. GK
      positions.push(new THREE.Vector3(dir * 48, 0, 0));

      // 4-3-3 formation coordinates
      // 4 Defenders (LB, CB, CB, RB)
      positions.push(new THREE.Vector3(dir * 32, 0, -20));
      positions.push(new THREE.Vector3(dir * 34, 0, -7));
      positions.push(new THREE.Vector3(dir * 34, 0, 7));
      positions.push(new THREE.Vector3(dir * 32, 0, 20));

      // 3 Midfielders (CDM, CM, CAM)
      positions.push(new THREE.Vector3(dir * 20, 0, 0));
      positions.push(new THREE.Vector3(dir * 14, 0, -14));
      positions.push(new THREE.Vector3(dir * 10, 0, 14));

      // 3 Attackers (LW, ST, RW)
      positions.push(new THREE.Vector3(dir * 4, 0, -22));
      positions.push(new THREE.Vector3(dir * 2, 0, 0));
      positions.push(new THREE.Vector3(dir * 4, 0, 22));

      return positions;
    };

    // Populate Home & Away Players
    const playersList: Player3D[] = [];

    // Home Team (11 players)
    const homePositions = getFormationPositions(true, homeTeam.tactics.formation);
    const homeXI = homeTeam.squad.slice(0, 11);
    homeXI.forEach((p, idx) => {
      const basePos = homePositions[idx] || new THREE.Vector3(-10, 0, 0);
      const isGK = idx === 0 || p.position === 'GK';
      const player3D = create3DPlayer(
        p.id,
        p.name,
        p.number,
        p.position,
        true,
        isGK,
        homeTeam.primaryColor
      );
      player3D.baseHomePos.copy(basePos);
      player3D.currentPos.copy(basePos);
      player3D.targetPos.copy(basePos);
      player3D.group.position.copy(basePos);
      player3D.group.rotation.y = Math.PI / 2; // Face towards opponent goal
      playersList.push(player3D);
    });

    // Away Team (11 players)
    const awayPositions = getFormationPositions(false, awayTeam.tactics?.formation || '4-3-3');
    const awayNames = [
      { name: 'N. Karimov', pos: 'GK', num: 1 },
      { name: 'S. Rahimov', pos: 'LB', num: 3 },
      { name: 'A. Ismailov', pos: 'CB', num: 4 },
      { name: 'B. Toirov', pos: 'CB', num: 5 },
      { name: 'Z. Qodirov', pos: 'RB', num: 2 },
      { name: 'M. Bekmurodov', pos: 'CDM', num: 6 },
      { name: 'J. Sobirov', pos: 'CM', num: 8 },
      { name: 'K. Alimov', pos: 'CAM', num: 10 },
      { name: 'D. Vohidov', pos: 'LW', num: 7 },
      { name: 'R. G\'aniyev', pos: 'ST', num: 9 },
      { name: 'T. Mirzayev', pos: 'RW', num: 11 },
    ];

    awayNames.forEach((item, idx) => {
      const basePos = awayPositions[idx] || new THREE.Vector3(10, 0, 0);
      const isGK = idx === 0;
      const player3D = create3DPlayer(
        `away_${idx}`,
        item.name,
        item.num,
        item.pos,
        false,
        isGK,
        awayTeam.primaryColor
      );
      player3D.baseHomePos.copy(basePos);
      player3D.currentPos.copy(basePos);
      player3D.targetPos.copy(basePos);
      player3D.group.position.copy(basePos);
      player3D.group.rotation.y = -Math.PI / 2; // Face left
      playersList.push(player3D);
    });

    // Pick kickoff ball carrier
    const kickoffPlayer = playersList.find(p => p.isHome && p.position === 'ST') || playersList[0];
    kickoffPlayer.hasBall = true;
    ball.position.set(kickoffPlayer.currentPos.x + 0.5, ballRadius, kickoffPlayer.currentPos.z);

    // Store references
    threeRef.current = {
      scene,
      camera,
      renderer,
      ball,
      ballVelocity: new THREE.Vector3(),
      ballPos: ball.position,
      players: playersList,
      carrierPlayer: kickoffPlayer,
      targetCarrier: null,
      pitchWidth,
      pitchLength,
      isGoalScored: false,
      passTimer: 0,
      shotTimer: 0,
      orbitTarget: new THREE.Vector3(0, 0, 0),
      isMouseDown: false,
      mouseX: 0,
      mouseY: 0,
      cameraAngle: 0,
      cameraPitch: 0.55,
      cameraDist: 65,
      ballShadow,
      activeRing,
      ledTexture,
      ledOffset: 0,
      netHome,
      netAway,
    };

    // Mouse drag controls for interactive camera rotation
    const onMouseDown = (e: MouseEvent) => {
      if (!threeRef.current) return;
      threeRef.current.isMouseDown = true;
      threeRef.current.mouseX = e.clientX;
      threeRef.current.mouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!threeRef.current || !threeRef.current.isMouseDown) return;
      const deltaX = e.clientX - threeRef.current.mouseX;
      const deltaY = e.clientY - threeRef.current.mouseY;
      threeRef.current.mouseX = e.clientX;
      threeRef.current.mouseY = e.clientY;

      threeRef.current.cameraAngle -= deltaX * 0.006;
      threeRef.current.cameraPitch = Math.max(0.1, Math.min(1.4, threeRef.current.cameraPitch + deltaY * 0.006));
    };

    const onMouseUp = () => {
      if (threeRef.current) threeRef.current.isMouseDown = false;
    };

    const onWheel = (e: WheelEvent) => {
      if (!threeRef.current) return;
      threeRef.current.cameraDist = Math.max(15, Math.min(120, threeRef.current.cameraDist + e.deltaY * 0.05));
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: true });

    // Window resize observer
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(container);

    // Cleanup on unmount
    return () => {
      resizeObserver.disconnect();
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      renderer.dispose();
      if (container.contains(dom)) {
        container.removeChild(dom);
      }
    };
  }, [homeTeam, awayTeam]);

  // Main 3D Animation and Game Simulation Loop
  useEffect(() => {
    let animationId: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      animationId = requestAnimationFrame(animate);

      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const ref = threeRef.current;
      if (!ref) return;

      const {
        scene,
        camera,
        renderer,
        ball,
        ballVelocity,
        ballPos,
        players,
        ballShadow,
        activeRing,
        ledTexture,
        pitchLength,
        pitchWidth,
      } = ref;

      // Rotate LED boards texture for stadium atmosphere
      if (ledTexture) {
        ref.ledOffset += delta * 0.05;
        ledTexture.offset.x = ref.ledOffset;
      }

      // Match Simulation Tick (if playing and not paused)
      if (isPlaying && !isPracticeMode) {
        const simSpeed = matchSpeed;

        // Ball Physics
        ballPos.addScaledVector(ballVelocity, delta * 45 * simSpeed);

        // Friction & Gravity
        ballVelocity.x *= 0.985;
        ballVelocity.z *= 0.985;
        if (ballPos.y > 0.38) {
          ballVelocity.y -= 0.015 * simSpeed; // gravity
        } else {
          ballPos.y = 0.38;
          if (Math.abs(ballVelocity.y) > 0.05) {
            ballVelocity.y = -ballVelocity.y * 0.6; // bounce
          } else {
            ballVelocity.y = 0;
          }
        }

        // Ball rotation
        ball.rotation.x += ballVelocity.z * 1.5;
        ball.rotation.z -= ballVelocity.x * 1.5;

        // Ball shadow projection
        ballShadow.position.set(ballPos.x, 0.02, ballPos.z);
        const shadowScale = Math.max(0.4, 1.2 - ballPos.y * 0.2);
        ballShadow.scale.set(shadowScale, shadowScale, 1);

        // Check Goal Scored
        const goalThresholdX = pitchLength / 2;
        if (Math.abs(ballPos.x) >= goalThresholdX && ballPos.y <= 2.5 && Math.abs(ballPos.z) <= 3.7) {
          if (!ref.isGoalScored) {
            ref.isGoalScored = true;
            const isHomeScored = ballPos.x > 0;
            const scorer = isHomeScored
              ? ref.carrierPlayer?.isHome ? ref.carrierPlayer.name : 'Eldor Shomurodov'
              : 'R. G\'aniyev';

            const teamName = isHomeScored ? homeTeam.name : awayTeam.name;

            sound.playGoalRoar();
            confetti({
              particleCount: 120,
              spread: 80,
              origin: { y: 0.5 },
            });

            if (isHomeScored) {
              setHomeScore(s => s + 1);
            } else {
              setAwayScore(s => s + 1);
            }

            setGoalAlert({ scorer, team: teamName, minute });
            setCommentary(`GOOOOOOL! ${scorer} (${teamName}) hisobni o'zgartirdi!`);

            setEvents(prev => [
              ...prev,
              {
                id: `goal_${Date.now()}`,
                minute,
                type: 'goal',
                teamId: isHomeScored ? homeTeam.id : awayTeam.id,
                teamName,
                playerName: scorer,
                description: `${minute}' - GOOOL! ${scorer} (${teamName}) to'pni darvoza to'riga yo'lladi!`,
              },
            ]);

            // Celebrate!
            players.forEach(p => {
              if (p.isHome === isHomeScored) {
                p.actionState = 'celebrating';
              }
            });

            // Reset after 3 seconds
            setTimeout(() => {
              setGoalAlert(null);
              ref.isGoalScored = false;
              ballPos.set(0, 0.38, 0);
              ballVelocity.set(0, 0, 0);
              players.forEach(p => {
                p.actionState = 'idle';
                p.targetPos.copy(p.baseHomePos);
              });
              const striker = players.find(p => p.isHome !== isHomeScored && p.position === 'ST') || players[0];
              ref.carrierPlayer = striker;
            }, 3500);
          }
        }

        // Out of bounds reset
        if (Math.abs(ballPos.x) > pitchLength / 2 + 3 || Math.abs(ballPos.z) > pitchWidth / 2 + 2) {
          ballPos.set(
            Math.max(-pitchLength / 2 + 2, Math.min(pitchLength / 2 - 2, ballPos.x)),
            0.38,
            Math.max(-pitchWidth / 2 + 2, Math.min(pitchWidth / 2 - 2, ballPos.z))
          );
          ballVelocity.set(0, 0, 0);
        }

        // Autonomous AI Passing and Action Timers
        ref.passTimer += delta * simSpeed;
        ref.shotTimer += delta * simSpeed;

        // Player AI logic & Movement
        players.forEach(player => {
          player.animTimer += delta * 6 * player.speed;

          // If player has the ball
          if (ref.carrierPlayer === player) {
            player.hasBall = true;
            // Ball sticks closely to carrier
            if (ballVelocity.length() < 0.15) {
              const forwardDir = player.isHome ? 1 : -1;
              ballPos.x = THREE.MathUtils.lerp(ballPos.x, player.currentPos.x + forwardDir * 0.7, 0.3);
              ballPos.z = THREE.MathUtils.lerp(ballPos.z, player.currentPos.z, 0.3);
            }

            // Driible towards opponent goal
            const attackDir = player.isHome ? 1 : -1;
            player.targetPos.x = player.currentPos.x + attackDir * 8;
            player.targetPos.z = player.baseHomePos.z + Math.sin(player.animTimer * 0.5) * 4;

            // In shot range?
            const distToGoal = Math.abs(player.currentPos.x - (player.isHome ? 52.5 : -52.5));
            if (distToGoal < 26 && ref.shotTimer > 3.0) {
              ref.shotTimer = 0;
              ref.passTimer = 0;
              sound.playKick(0.9);
              triggerShot(player, player.isHome);
              setCommentary(`${player.name} xavfli masofadan zarba berdi!`);
            } else if (ref.passTimer > 2.5) {
              // Pass to a teammate forward
              ref.passTimer = 0;
              const teammates = players.filter(
                p => p.isHome === player.isHome && p !== player && !p.isGK
              );
              if (teammates.length > 0) {
                // Select teammate in best position
                const bestPassOption = teammates.sort((a, b) => {
                  const distA = Math.abs(a.currentPos.x - (player.isHome ? 50 : -50));
                  const distB = Math.abs(b.currentPos.x - (player.isHome ? 50 : -50));
                  return distA - distB;
                })[Math.floor(Math.random() * Math.min(3, teammates.length))];

                sound.playKick(0.5);
                ref.carrierPlayer = bestPassOption;
                const passDir = bestPassOption.currentPos.clone().sub(ballPos).normalize();
                ballVelocity.copy(passDir.multiplyScalar(0.75));
                player.actionState = 'kicking';
                setTimeout(() => {
                  player.actionState = 'running';
                }, 300);
                setCommentary(`${player.name} to'pni ${bestPassOption.name}ga uzatdi`);
              }
            }
          } else {
            player.hasBall = false;

            // Goalkeeper logic: stay on goal line and track ball Z
            if (player.isGK) {
              const goalX = player.isHome ? -50 : 50;
              player.targetPos.set(goalX, 0, Math.max(-3.2, Math.min(3.2, ballPos.z * 0.5)));
            } else {
              // Outfield players shift with ball & maintain formation
              const ballShiftX = ballPos.x * 0.35;
              const ballShiftZ = ballPos.z * 0.3;
              player.targetPos.set(
                player.baseHomePos.x + ballShiftX,
                0,
                player.baseHomePos.z + ballShiftZ
              );

              // Close defender pressures ball carrier
              const distToBall = player.currentPos.distanceTo(ballPos);
              if (distToBall < 10 && ref.carrierPlayer?.isHome !== player.isHome) {
                player.targetPos.lerp(ballPos, 0.7);
                // Tackle attempt
                if (distToBall < 1.6 && Math.random() < 0.08) {
                  sound.playKick(0.6);
                  ref.carrierPlayer = player;
                  player.actionState = 'tackling';
                  setTimeout(() => {
                    player.actionState = 'running';
                  }, 400);
                  setCommentary(`${player.name} to'pni mohirona olib qo'ydi!`);
                }
              }
            }
          }

          // Move player towards target
          const moveStep = delta * 6 * player.speed * simSpeed;
          player.currentPos.lerp(player.targetPos, Math.min(1, moveStep));
          player.group.position.copy(player.currentPos);

          // Face movement direction
          const velocityVec = player.targetPos.clone().sub(player.currentPos);
          if (velocityVec.lengthSq() > 0.01) {
            const angle = Math.atan2(velocityVec.x, velocityVec.z);
            player.group.rotation.y = angle;
          }

          // Skeletal Leg & Arm Swing Animation
          if (player.actionState === 'celebrating') {
            player.leftArm.rotation.x = -Math.PI * 0.8;
            player.rightArm.rotation.x = -Math.PI * 0.8;
            player.group.position.y = Math.abs(Math.sin(player.animTimer * 2)) * 0.8;
          } else if (player.actionState === 'diving') {
            player.group.rotation.z = player.isHome ? 1.2 : -1.2;
            player.leftArm.rotation.z = 1.0;
            player.rightArm.rotation.z = -1.0;
          } else {
            const swing = Math.sin(player.animTimer) * 0.65;
            player.leftLeg.rotation.x = swing;
            player.rightLeg.rotation.x = -swing;
            player.leftArm.rotation.x = -swing * 0.7;
            player.rightArm.rotation.x = swing * 0.7;
            player.group.position.y = 0;
          }
        });

        // Update active carrier HUD state
        if (ref.carrierPlayer) {
          setActiveCarrier({
            name: ref.carrierPlayer.name,
            number: ref.carrierPlayer.number,
            isHome: ref.carrierPlayer.isHome,
          });
          activeRing.position.set(ref.carrierPlayer.currentPos.x, 0.04, ref.carrierPlayer.currentPos.z);
          activeRing.visible = true;
        } else {
          activeRing.visible = false;
        }
      }

      // Camera Controls based on CameraMode
      if (cameraMode === 'broadcast') {
        const targetCamX = THREE.MathUtils.lerp(camera.position.x, ballPos.x * 0.45, 0.05);
        const targetCamZ = THREE.MathUtils.lerp(camera.position.z, 38 + ballPos.z * 0.25, 0.05);
        camera.position.set(targetCamX, 28, targetCamZ);
        camera.lookAt(ballPos.x, 1.2, ballPos.z * 0.35);
      } else if (cameraMode === 'tactical') {
        camera.position.lerp(new THREE.Vector3(0, 75, 25), 0.05);
        camera.lookAt(0, 0, 0);
      } else if (cameraMode === 'goal') {
        camera.position.lerp(new THREE.Vector3(62, 12, 0), 0.05);
        camera.lookAt(ballPos.x, 1, ballPos.z);
      } else if (cameraMode === 'free') {
        // Orbital around orbit target
        const dist = ref.cameraDist;
        const camX = ref.orbitTarget.x + Math.sin(ref.cameraAngle) * Math.cos(ref.cameraPitch) * dist;
        const camY = ref.orbitTarget.y + Math.sin(ref.cameraPitch) * dist;
        const camZ = ref.orbitTarget.z + Math.cos(ref.cameraAngle) * Math.cos(ref.cameraPitch) * dist;
        camera.position.set(camX, Math.max(2, camY), camZ);
        camera.lookAt(ref.orbitTarget);
      }

      renderer.render(scene, camera);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isPlaying, matchSpeed, cameraMode, isPracticeMode, homeTeam, awayTeam, triggerShot, minute]);

  // Match Clock Timer (90 minutes simulation)
  useEffect(() => {
    if (!isPlaying || isPracticeMode) return;

    const interval = setInterval(() => {
      setSecond(prevSec => {
        if (prevSec >= 59) {
          setMinute(prevMin => {
            const nextMin = prevMin + 1;
            if (nextMin === 45) {
              sound.playWhistle(true);
              setCommentary("Birinchi bo'lim yakunlandi (45')!");
            } else if (nextMin >= 90) {
              sound.playWhistle(true);
              setIsPlaying(false);
              setCommentary("O'yin yakunlandi! Hakam uchrashuv tugaganini bildirdi.");
              if (onMatchFinish) {
                onMatchFinish(stats, events);
              }
            }
            return nextMin;
          });
          return 0;
        }
        return prevSec + 1;
      });
    }, 1000 / matchSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, matchSpeed, isPracticeMode, onMatchFinish, stats, events]);

  return (
    <div className="relative w-full h-[620px] rounded-3xl overflow-hidden bg-[#0a0b0e] border border-white/10 shadow-2xl flex flex-col select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Match Scoreboard Banner */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-3 pointer-events-none z-10">
        {/* Scorecard */}
        <div className="bg-[#0d0f14]/90 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-4 pointer-events-auto">
          {/* Home Team */}
          <div className="flex items-center gap-2.5">
            <span
              className="w-3.5 h-3.5 rounded-full ring-2 ring-emerald-400 shrink-0"
              style={{ backgroundColor: homeTeam.primaryColor }}
            />
            <span className="font-bold text-white tracking-wide text-sm sm:text-base italic uppercase">
              {homeTeam.name}
            </span>
          </div>

          {/* Scores & Clock */}
          <div className="flex items-center gap-2.5 px-3 py-1 bg-black/40 rounded-xl border border-white/5">
            <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
              {homeScore}
            </span>
            <span className="text-slate-600 font-bold">:</span>
            <span className="text-xl sm:text-2xl font-black text-rose-400 font-mono">
              {awayScore}
            </span>
            <div className="ml-2 pl-2 border-l border-white/10 flex items-center gap-1">
              <span className="text-xs font-mono font-bold text-slate-300">
                {String(minute).padStart(2, '0')}:{String(second).padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Away Team */}
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-white tracking-wide text-sm sm:text-base italic uppercase">
              {awayTeam.name}
            </span>
            <span
              className="w-3.5 h-3.5 rounded-full ring-2 ring-rose-400 shrink-0"
              style={{ backgroundColor: awayTeam.primaryColor }}
            />
          </div>
        </div>

        {/* Camera Views & Sound */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-[#0d0f14]/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/10 shadow-xl">
          <div className="flex items-center text-xs text-slate-400 font-medium mr-1">
            <Eye className="w-3.5 h-3.5 mr-1 text-emerald-400" />
            <span className="hidden sm:inline">Kamera:</span>
          </div>
          {(['broadcast', 'tactical', 'goal', 'free'] as CameraMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setCameraMode(mode)}
              className={`px-3 py-1 text-xs font-semibold rounded-xl transition-all ${
                cameraMode === mode
                  ? 'bg-emerald-500 text-black shadow-md font-black'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {mode === 'broadcast' && 'TV Efir'}
              {mode === 'tactical' && 'Taktik'}
              {mode === 'goal' && 'Darvoza'}
              {mode === 'free' && 'Erkin 3D'}
            </button>
          ))}
          <button
            onClick={handleToggleSound}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition ml-1"
            title={isMuted ? "Ovozni yoqish" : "Ovozni o'chirish"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Goal Celebration Popup Animation */}
      {goalAlert && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-800 text-white px-9 py-6 rounded-3xl shadow-2xl border border-white/20 transform scale-110 animate-bounce flex flex-col items-center">
            <span className="text-3xl sm:text-4xl font-black italic tracking-widest uppercase">
              ⚽ GOOOOOOL! ⚽
            </span>
            <span className="text-xl font-black mt-1 text-white">{goalAlert.scorer}</span>
            <span className="text-xs text-emerald-200 mt-0.5">{goalAlert.team} • {goalAlert.minute}&apos;-daqiqa</span>
          </div>
        </div>
      )}

      {/* Ball Carrier Badge on Bottom Left */}
      {activeCarrier && (
        <div className="absolute bottom-20 left-4 bg-[#0d0f14]/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-xs flex items-center gap-2.5 z-10 pointer-events-none shadow-xl">
          <span
            className="w-2.5 h-2.5 rounded-full ring-1 ring-white/20"
            style={{ backgroundColor: activeCarrier.isHome ? homeTeam.primaryColor : awayTeam.primaryColor }}
          />
          <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">To&apos;p egasi:</span>
          <span className="font-bold text-white">#{activeCarrier.number} {activeCarrier.name}</span>
        </div>
      )}

      {/* Interactive Practice / Free-Kick Overlay (if practice mode) */}
      {isPracticeMode && (
        <div className="absolute top-16 right-4 w-72 bg-[#0d0f14]/95 backdrop-blur-md p-5 rounded-3xl border border-white/10 z-20 shadow-2xl text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <span className="font-black text-sm text-emerald-400 flex items-center gap-1.5 italic uppercase tracking-tight">
              <Crosshair className="w-4 h-4" /> 3D Jarima Mashg&apos;uloti
            </span>
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-lg font-mono font-bold text-[10px]">
              KETMA-KET: {practiceStreak}
            </span>
          </div>

          <div>
            <div className="flex justify-between text-slate-300 mb-1">
              <span className="text-slate-400">Nishon Gorizontal (X):</span>
              <span className="font-mono font-bold text-emerald-400">{aimX.toFixed(1)}m</span>
            </div>
            <input
              type="range"
              min="-3.5"
              max="3.5"
              step="0.1"
              value={aimX}
              onChange={e => setAimX(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-300 mb-1">
              <span className="text-slate-400">Nishon Balandlik (Y):</span>
              <span className="font-mono font-bold text-emerald-400">{aimY.toFixed(1)}m</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="2.4"
              step="0.1"
              value={aimY}
              onChange={e => setAimY(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-300 mb-1">
              <span className="text-slate-400">Zarba kuchi:</span>
              <span className="font-mono font-bold text-emerald-400">{shotPower}%</span>
            </div>
            <input
              type="range"
              min="40"
              max="100"
              value={shotPower}
              onChange={e => setShotPower(parseInt(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-300 mb-1">
              <span className="text-slate-400">To&apos;p aylanishi:</span>
              <span className="font-mono font-bold text-emerald-400">{shotCurve > 0 ? `+${shotCurve}` : shotCurve}%</span>
            </div>
            <input
              type="range"
              min="-50"
              max="50"
              value={shotCurve}
              onChange={e => setShotCurve(parseInt(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <button
            onClick={handlePracticeShoot}
            disabled={isCharging}
            className="w-full py-2.5 bg-emerald-500 hover:brightness-110 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/10 transition active:scale-95 disabled:opacity-50"
          >
            {isCharging ? "Zarba berilmoqda..." : "🚀 ZARBA BERISH!"}
          </button>

          {practiceResult && (
            <div className="p-2.5 rounded-xl bg-white/5 text-center font-bold text-white border border-white/10 animate-pulse">
              {practiceResult}
            </div>
          )}
        </div>
      )}

      {/* Bottom Control Bar: Commentary & Tactical In-Match Orders */}
      <div className="absolute bottom-0 inset-x-0 bg-[#0a0b0e]/95 backdrop-blur-md p-3.5 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 z-10">
        {/* Live Commentary Ticker */}
        <div className="flex items-center gap-2 overflow-hidden w-full sm:w-auto">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest shrink-0 border border-emerald-500/30">
            JONLI EFIR
          </span>
          <p className="text-xs text-slate-300 truncate font-medium">
            {commentary}
          </p>
        </div>

        {/* Tactical Manager In-Game Orders */}
        {!isPracticeMode && (
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mr-1 hidden lg:inline">
              Menejer:
            </span>
            <button
              onClick={() => handleManagerCommand('shoot')}
              className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-xs font-bold rounded-xl transition active:scale-95 flex items-center gap-1 border border-rose-500/30"
              title="Darvozaga zarba berish buyrug'i"
            >
              <Target className="w-3.5 h-3.5" /> Zarba!
            </button>
            <button
              onClick={() => handleManagerCommand('attack')}
              className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-bold rounded-xl transition active:scale-95 flex items-center gap-1 border border-emerald-500/30"
              title="Oldinga o'tish"
            >
              <Zap className="w-3.5 h-3.5" /> Hujum
            </button>
            <button
              onClick={() => handleManagerCommand('press')}
              className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 text-xs font-bold rounded-xl transition active:scale-95 flex items-center gap-1 border border-amber-500/30"
              title="Yuqori pressing"
            >
              <Award className="w-3.5 h-3.5" /> Pressing
            </button>
            <button
              onClick={() => handleManagerCommand('defend')}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold rounded-xl transition active:scale-95 flex items-center gap-1 border border-white/10"
              title="Himoyani mustahkamlash"
            >
              <Shield className="w-3.5 h-3.5" /> Himoya
            </button>

            {/* Match Play/Pause & Speed */}
            <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-white/10">
              <button
                onClick={() => setIsPlaying(p => !p)}
                className="p-2 rounded-xl bg-emerald-500 hover:brightness-110 text-black font-black transition active:scale-95"
                title={isPlaying ? "To'xtatish" : "Davom ettirish"}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setMatchSpeed(s => (s === 1 ? 2 : s === 2 ? 4 : 1))}
                className="px-2.5 py-1.5 text-xs font-mono font-bold rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10 transition"
                title="Tezlikni o'zgartirish"
              >
                {matchSpeed}x
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
