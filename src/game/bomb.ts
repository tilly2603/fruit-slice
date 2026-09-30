import { Bomb, Particle } from './types';

let bombIdCounter = 0;

export function spawnBomb(canvasWidth: number, canvasHeight: number, gravity = 0.20): Bomb {
  bombIdCounter++;

  const radius = 42;
  const margin = Math.max(100, canvasWidth * 0.2);
  const x = margin + Math.random() * (canvasWidth - margin * 2);
  const y = canvasHeight + radius + 10;

  // Aim towards upper center
  const targetX = canvasWidth * 0.5 + (Math.random() - 0.5) * (canvasWidth * 0.4);
  const targetY = canvasHeight * (0.22 + Math.random() * 0.2);

  const apexDistance = y - targetY;
  const vy = -Math.sqrt(2 * gravity * apexDistance);
  const timeToApex = -vy / gravity;
  const vx = (targetX - x) / timeToApex;

  const vRot = (Math.random() - 0.5) * 0.04;

  return {
    id: `bomb_${bombIdCounter}`,
    x,
    y,
    vx,
    vy,
    radius,
    rotation: Math.random() * Math.PI * 2,
    vRot,
    sliced: false,
    gravity,
    fusePhase: Math.random() * 100,
  };
}

/**
 * Generate animated fuse spark particles while the bomb is flying
 */
export function generateFuseParticles(bomb: Bomb): Particle[] {
  const r = bomb.radius;
  // Calculate tip of the curved fuse in world coordinates
  const cos = Math.cos(bomb.rotation);
  const sin = Math.sin(bomb.rotation);

  // Fuse tip local coordinates: x ~ r * 0.35, y ~ -r * 1.35
  const localX = r * 0.35;
  const localY = -r * 1.35;

  const tipX = bomb.x + (localX * cos - localY * sin);
  const tipY = bomb.y + (localX * sin + localY * cos);

  const sparks: Particle[] = [];

  // Throttle spark emission to avoid clogging canvas with hundreds of particles
  if (Math.random() < 0.45) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.2 + Math.random() * 2.8;
    sparks.push({
      x: tipX,
      y: tipY,
      vx: Math.cos(angle) * speed + bomb.vx * 0.2,
      vy: Math.sin(angle) * speed - 1.2,
      color: Math.random() > 0.3 ? '#f59e0b' : '#ef4444',
      size: 2 + Math.random() * 2.5,
      life: 8 + Math.floor(Math.random() * 8),
      maxLife: 16,
      type: 'spark',
    });
  }

  // Tiny smoke puff occasionally
  if (Math.random() < 0.15) {
    sparks.push({
      x: tipX,
      y: tipY,
      vx: (Math.random() - 0.5) * 0.8,
      vy: -1.2 - Math.random() * 0.8,
      color: '#64748b',
      size: 4 + Math.random() * 3,
      life: 14,
      maxLife: 14,
      type: 'smoke',
    });
  }

  return sparks;
}

/**
 * Render arcade danger bomb with metallic sheen, danger skull emblem, and burning fuse
 */
export function drawBomb(ctx: CanvasRenderingContext2D, bomb: Bomb, time: number) {
  ctx.save();
  ctx.translate(bomb.x, bomb.y);
  ctx.rotate(bomb.rotation);

  const r = bomb.radius;

  // 1. Spherical Bomb Body with radial metallic sheen
  const bodyGrad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
  bodyGrad.addColorStop(0, '#475569');
  bodyGrad.addColorStop(0.3, '#1e293b');
  bodyGrad.addColorStop(0.8, '#0f172a');
  bodyGrad.addColorStop(1, '#020617');

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // 2. Specular highlight crescent
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, -r * 0.35, r * 0.28, r * 0.14, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fill();

  // 3. Danger Hazard Icon (Pulsing Red Skull / Crossbones)
  const pulse = (Math.sin(time * 0.012 + bomb.fusePhase) + 1) * 0.5;
  ctx.fillStyle = `rgba(239, 68, 68, ${0.8 + pulse * 0.2})`;

  // Skull forehead
  ctx.beginPath();
  ctx.arc(0, -r * 0.08, r * 0.32, 0, Math.PI * 2);
  ctx.fill();

  // Skull jaw
  ctx.beginPath();
  ctx.roundRect(-r * 0.18, r * 0.14, r * 0.36, r * 0.2, 4);
  ctx.fill();

  // Eye sockets (cut out dark)
  ctx.fillStyle = '#090d16';
  ctx.beginPath();
  ctx.arc(-r * 0.12, -r * 0.06, r * 0.08, 0, Math.PI * 2);
  ctx.arc(r * 0.12, -r * 0.06, r * 0.08, 0, Math.PI * 2);
  ctx.fill();

  // Nose triangle
  ctx.beginPath();
  ctx.moveTo(0, r * 0.04);
  ctx.lineTo(-r * 0.05, r * 0.14);
  ctx.lineTo(r * 0.05, r * 0.14);
  ctx.closePath();
  ctx.fill();

  // Crossbones marks
  ctx.strokeStyle = `rgba(239, 68, 68, ${0.7 + pulse * 0.3})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-r * 0.45, r * 0.4);
  ctx.lineTo(r * 0.45, -r * 0.4);
  ctx.moveTo(r * 0.45, r * 0.4);
  ctx.lineTo(-r * 0.45, -r * 0.4);
  ctx.stroke();
  ctx.restore();

  // 5. Brass Collar / Nozzle
  const collarGrad = ctx.createLinearGradient(-r * 0.2, -r, r * 0.2, -r);
  collarGrad.addColorStop(0, '#ca8a04');
  collarGrad.addColorStop(0.5, '#fde047');
  collarGrad.addColorStop(1, '#a16207');

  ctx.beginPath();
  ctx.roundRect(-r * 0.2, -r * 1.15, r * 0.4, r * 0.2, 3);
  ctx.fillStyle = collarGrad;
  ctx.fill();
  ctx.strokeStyle = '#713f12';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 6. Twisted Rope Fuse
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.15);
  ctx.quadraticCurveTo(r * 0.15, -r * 1.35, r * 0.35, -r * 1.35);
  ctx.lineWidth = 4.5;
  ctx.strokeStyle = '#92400e';
  ctx.lineCap = 'round';
  ctx.stroke();

  // 7. Active Burning Fuse Sparks at tip (local: r * 0.35, -r * 1.35)
  ctx.save();
  ctx.translate(r * 0.35, -r * 1.35);

  const sparkFlicker = Math.sin(time * 0.04) * 2;
  const sparkGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, 10 + sparkFlicker);
  sparkGrad.addColorStop(0, '#ffffff');
  sparkGrad.addColorStop(0.3, '#fef08a');
  sparkGrad.addColorStop(0.6, '#f97316');
  sparkGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');

  ctx.beginPath();
  ctx.arc(0, 0, 10 + sparkFlicker, 0, Math.PI * 2);
  ctx.fillStyle = sparkGrad;
  ctx.fill();

  // Micro spark cross
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.lineTo(6, 0);
  ctx.moveTo(0, -6);
  ctx.lineTo(0, 6);
  ctx.stroke();

  ctx.restore();

  ctx.restore();
}
