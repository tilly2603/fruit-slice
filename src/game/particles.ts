import { Particle, SplatDecal, ComboBanner, FRUIT_CONFIGS, FruitType } from './types';

export function createSliceJuiceParticles(
  x: number,
  y: number,
  fruitType: FruitType,
  sliceAngle: number
): Particle[] {
  const config = FRUIT_CONFIGS[fruitType];
  const particles: Particle[] = [];

  // Vibrant juice droplets (tuned for crisp punchy splash without GPU lag)
  const count = fruitType === 'starfruit' ? 12 : 9;
  const perp = sliceAngle + Math.PI / 2;

  for (let i = 0; i < count; i++) {
    // Fling outward along cut plane
    const dir = (Math.random() > 0.5 ? 1 : -1) * perp + (Math.random() - 0.5) * 0.8;
    const speed = 3.0 + Math.random() * 7.0;
    const vx = Math.cos(dir) * speed;
    const vy = Math.sin(dir) * speed - 1.2;
    const size = 3 + Math.random() * 4;
    const maxLife = 18 + Math.floor(Math.random() * 12);

    particles.push({
      x: x + (Math.random() - 0.5) * 16,
      y: y + (Math.random() - 0.5) * 16,
      vx,
      vy,
      color: Math.random() > 0.4 ? config.color : config.innerColor,
      size,
      life: maxLife,
      maxLife,
      type: 'juice',
    });
  }

  // Extra radiant starburst particles for Star Fruit!
  if (fruitType === 'starfruit') {
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const speed = 4.0 + Math.random() * 5.0;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.0,
        color: Math.random() > 0.3 ? '#fef08a' : '#facc15',
        size: 5 + Math.random() * 3,
        life: 20 + Math.floor(Math.random() * 10),
        maxLife: 30,
        type: 'star',
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2,
      });
    }
  }

  // Sword sparks / glints
  const sparkCount = fruitType === 'starfruit' ? 6 : 4;
  for (let i = 0; i < sparkCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 6;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: fruitType === 'starfruit' ? '#fef08a' : Math.random() > 0.5 ? '#ffffff' : '#67e8f9',
      size: 2.5 + Math.random() * 2.5,
      life: 12 + Math.floor(Math.random() * 8),
      maxLife: 20,
      type: 'spark',
    });
  }

  // Expanding shock ring
  particles.push({
    x,
    y,
    vx: 0,
    vy: 0,
    color: fruitType === 'starfruit' ? '#facc15' : '#ffffff',
    size: config.radius * 0.4,
    life: 12,
    maxLife: 12,
    type: 'ring',
  });

  return particles;
}

/**
 * Massive explosive fiery blast particles when a Bomb is sliced
 */
export function createExplosionParticles(x: number, y: number): Particle[] {
  const particles: Particle[] = [];

  // 1. Fiery explosion balls (expanding and burning)
  for (let i = 0; i < 35; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4.0 + Math.random() * 14.0;
    const colors = ['#ffffff', '#fef08a', '#f59e0b', '#ef4444', '#b91c1c'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const maxLife = 25 + Math.floor(Math.random() * 20);

    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2.5,
      color,
      size: 8 + Math.random() * 14,
      life: maxLife,
      maxLife,
      type: 'fire',
    });
  }

  // 2. High-speed white & orange shrapnel sparks
  for (let i = 0; i < 28; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 6.0 + Math.random() * 16.0;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: Math.random() > 0.4 ? '#ffffff' : '#fb923c',
      size: 3 + Math.random() * 4,
      life: 20 + Math.floor(Math.random() * 16),
      maxLife: 32,
      type: 'spark',
    });
  }

  // 3. Rolling dark smoke plumes
  for (let i = 0; i < 22; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 5.0;
    particles.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2.0,
      color: Math.random() > 0.5 ? '#334155' : '#1e293b',
      size: 14 + Math.random() * 20,
      life: 35 + Math.floor(Math.random() * 25),
      maxLife: 55,
      type: 'smoke',
    });
  }

  // 4. Double expanding shockwave rings
  particles.push(
    {
      x,
      y,
      vx: 0,
      vy: 0,
      color: '#ffffff',
      size: 15,
      life: 20,
      maxLife: 20,
      type: 'ring',
    },
    {
      x,
      y,
      vx: 0,
      vy: 0,
      color: '#f97316',
      size: 25,
      life: 24,
      maxLife: 24,
      type: 'ring',
    }
  );

  return particles;
}

export function createSplatDecal(x: number, y: number, fruitType: FruitType): SplatDecal {
  const config = FRUIT_CONFIGS[fruitType];
  const splatPoints: { x: number; y: number; r: number }[] = [];
  const blobs = 5 + Math.floor(Math.random() * 4);

  for (let i = 0; i < blobs; i++) {
    const ang = Math.random() * Math.PI * 2;
    const dist = 10 + Math.random() * 32;
    splatPoints.push({
      x: Math.cos(ang) * dist,
      y: Math.sin(ang) * dist,
      r: 6 + Math.random() * 12,
    });
  }

  return {
    x,
    y,
    radius: 35,
    color: config.color,
    alpha: 0.65,
    splatPoints,
  };
}

export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  if (particles.length === 0) return;

  for (const p of particles) {
    const progress = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = progress;

    if (p.type === 'juice') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * progress, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'spark') {
      // Fast glowing spark (outer halo + white hot core)
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 1.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'ring') {
      const ringRadius = p.size + (1 - progress) * 45;
      ctx.strokeStyle = `rgba(255, 255, 255, ${progress * 0.8})`;
      ctx.lineWidth = 2.5 * progress;
      ctx.beginPath();
      ctx.arc(p.x, p.y, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.type === 'fire') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * (1 - progress)), 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'smoke') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.8 + 0.8 * (1 - progress)), 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'star') {
      // Golden twinkling 4-point star
      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.rotation !== undefined) {
        ctx.rotate(p.rotation);
      }
      ctx.fillStyle = p.color;

      const starSize = p.size * progress;
      ctx.beginPath();
      ctx.moveTo(0, -starSize);
      ctx.quadraticCurveTo(0, 0, starSize, 0);
      ctx.quadraticCurveTo(0, 0, 0, starSize);
      ctx.quadraticCurveTo(0, 0, -starSize, 0);
      ctx.quadraticCurveTo(0, 0, 0, -starSize);
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.globalAlpha = 1.0;
}

export function drawSplats(ctx: CanvasRenderingContext2D, splats: SplatDecal[]) {
  if (splats.length === 0) return;

  for (const s of splats) {
    if (s.alpha <= 0.01) continue;
    ctx.save();
    ctx.globalAlpha = s.alpha * 0.35;
    ctx.fillStyle = s.color;

    // Batch all splat blobs into a single path to minimize canvas draw calls
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius * 0.5, 0, Math.PI * 2);
    for (const pt of s.splatPoints) {
      ctx.moveTo(s.x + pt.x + pt.r, s.y + pt.y);
      ctx.arc(s.x + pt.x, s.y + pt.y, pt.r, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.restore();
  }
}

export function drawComboBanners(ctx: CanvasRenderingContext2D, banners: ComboBanner[]) {
  for (const b of banners) {
    const progress = b.life / b.maxLife;
    ctx.save();
    ctx.translate(b.x, b.y);
    const scale = 1 + (1 - progress) * 0.35;
    ctx.scale(scale, scale);
    ctx.globalAlpha = Math.min(1, progress * 1.5);

    // Glow
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 18;

    // Main text
    ctx.font = '900 36px "Rubik Mono One", "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Dark stroke
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 6;
    ctx.strokeText(b.text, 0, 0);

    // Color fill
    ctx.fillStyle = b.color;
    ctx.fillText(b.text, 0, 0);

    if (b.subtext) {
      ctx.font = '700 20px "Fredoka", sans-serif';
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 4;
      ctx.strokeText(b.subtext, 0, 32);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(b.subtext, 0, 32);
    }

    ctx.restore();
  }
}
