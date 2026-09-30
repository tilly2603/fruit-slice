import { Fruit, FruitType, FRUIT_CONFIGS, SlicedHalf } from './types';

let fruitIdCounter = 0;

export interface PacingConfig {
  gravity: number;
  spawnInterval: number;
  count: number;
  maxSimultaneousFruits: number;
  paceLabel: string;
  paceColor: string;
  progressPercent: number;
  bombProbability: number;
}

/**
 * Dynamic pacing based on current score:
 * - At the start (score 0-40): Slow, floaty fruits (gravity ~0.18), gentle spawn interval (2400ms),
 *   strictly 1 fruit at a time, and 0 bombs so the player can comfortably slash them.
 * - As score increases: Gravity gradually increases (up to 0.35), waves come faster (down to 1250ms),
 *   multi-fruit waves appear, and occasional danger bombs begin to spawn.
 */
export function getPacingForScore(score: number): PacingConfig {
  // Score progress from 0 (gentle start) to 250+ (frenzy)
  const progress = Math.min(1, Math.max(0, score / 250));
  const progressPercent = Math.round(progress * 100);

  // Gravity: starts floaty and readable at 0.19, scales gently up to 0.30
  const gravity = 0.19 + progress * 0.11;

  // Wave spawn interval: comfortable spacing so the screen never gets overcrowded
  const spawnInterval = 2600 - progress * 800; // 2600ms -> 1800ms

  let count = 1;
  let paceLabel = 'Gentle';
  let paceColor = '#34d399'; // emerald
  let bombProbability = 0;

  if (score >= 240) {
    // High arcade frenzy: clean 2-3 fruit volleys
    count = Math.random() < 0.65 ? 2 : 3;
    paceLabel = 'Frenzy';
    paceColor = '#f43f5e'; // rose
    bombProbability = 0.26;
  } else if (score >= 140) {
    count = Math.random() < 0.5 ? 1 : 2;
    paceLabel = 'Brisk';
    paceColor = '#fb923c'; // orange
    bombProbability = 0.20;
  } else if (score >= 55) {
    count = Math.random() < 0.35 ? 2 : 1;
    paceLabel = 'Steady';
    paceColor = '#facc15'; // amber/yellow
    bombProbability = 0.14;
  } else {
    // Score 0 - 54: Strictly 1 fruit at a time with clean, satisfying arches
    count = 1;
    paceLabel = 'Gentle';
    paceColor = '#34d399'; // emerald
    bombProbability = 0.08;
  }

  // Maximum simultaneous unsliced fruits allowed on screen:
  // Strictly prevents cluttered screen and frame drops
  const maxSimultaneousFruits = score < 55 ? 1 : score < 140 ? 2 : 3;

  return {
    gravity,
    spawnInterval,
    count,
    maxSimultaneousFruits,
    paceLabel,
    paceColor,
    progressPercent,
    bombProbability,
  };
}

export function spawnFruit(
  canvasWidth: number,
  canvasHeight: number,
  gravity = 0.19,
  forcedType?: FruitType,
  slotIndex?: number,
  totalSlots?: number
): Fruit {
  fruitIdCounter++;
  const types: FruitType[] = ['apple', 'orange', 'banana', 'watermelon', 'pineapple', 'starfruit'];
  // Starfruit has ~18% spawn rate so players get to slice special glowing fruits frequently!
  const weights = [0.22, 0.20, 0.17, 0.13, 0.10, 0.18];
  const rand = Math.random();
  let cumulative = 0;
  let selectedType: FruitType = forcedType || 'apple';
  if (!forcedType) {
    for (let i = 0; i < types.length; i++) {
      cumulative += weights[i];
      if (rand < cumulative) {
        selectedType = types[i];
        break;
      }
    }
  }

  const config = FRUIT_CONFIGS[selectedType];

  // Calculate clean, well-spaced launch coordinates to prevent fruit clumping
  let x: number;
  let targetX: number;

  if (totalSlots && totalSlots > 1 && slotIndex !== undefined) {
    // Distribute horizontally across distinct launch sectors
    const slotWidth = canvasWidth / totalSlots;
    const minX = slotWidth * slotIndex + slotWidth * 0.2;
    const maxX = slotWidth * (slotIndex + 1) - slotWidth * 0.2;
    x = minX + Math.random() * (maxX - minX);

    // Aim toward center area with slight inward bias for picturesque crossing arcs
    const centerOffset = (slotIndex - (totalSlots - 1) / 2) * (canvasWidth * 0.16);
    targetX = canvasWidth * 0.5 + centerOffset + (Math.random() - 0.5) * (canvasWidth * 0.1);
  } else {
    const margin = Math.max(90, canvasWidth * 0.2);
    x = margin + Math.random() * (canvasWidth - margin * 2);
    targetX = canvasWidth * 0.5 + (Math.random() - 0.5) * (canvasWidth * 0.32);
  }

  const y = canvasHeight + config.radius + 10;
  const targetY = canvasHeight * (0.22 + Math.random() * 0.18); // comfortable apex height

  const apexDistance = y - targetY;
  // vy^2 = 2 * g * h  => vy = -sqrt(2 * g * h)
  const vy = -Math.sqrt(2 * gravity * apexDistance);

  // Time to apex: t = -vy / g
  const timeToApex = -vy / gravity;
  const vx = (targetX - x) / timeToApex;

  // Gentle rotational drift
  const vRot = (Math.random() - 0.5) * 0.05;

  return {
    id: `fruit_${fruitIdCounter}`,
    type: selectedType,
    x,
    y,
    vx,
    vy,
    radius: config.radius,
    rotation: Math.random() * Math.PI * 2,
    vRot,
    points: config.points,
    sliced: false,
    gravity,
  };
}

export function createSlicedHalves(fruit: Fruit, sliceAngle: number): [SlicedHalf, SlicedHalf] {
  const config = FRUIT_CONFIGS[fruit.type];
  
  // Normal vector perpendicular to slice
  const perpAngle = sliceAngle + Math.PI / 2;
  const impulse = 3.0 + Math.random() * 1.5;
  const fruitGravity = fruit.gravity ?? 0.20;

  const leftVx = fruit.vx - Math.cos(perpAngle) * impulse;
  const leftVy = fruit.vy - Math.sin(perpAngle) * impulse - 1.2;
  const rightVx = fruit.vx + Math.cos(perpAngle) * impulse;
  const rightVy = fruit.vy + Math.sin(perpAngle) * impulse - 1.2;

  const leftHalf: SlicedHalf = {
    id: `${fruit.id}_left`,
    type: fruit.type,
    x: fruit.x,
    y: fruit.y,
    vx: leftVx,
    vy: leftVy,
    radius: config.radius,
    rotation: fruit.rotation,
    vRot: (Math.random() - 0.5) * 0.2 - 0.08,
    sliceAngle,
    side: 'left',
    alpha: 1,
    gravity: fruitGravity,
  };

  const rightHalf: SlicedHalf = {
    id: `${fruit.id}_right`,
    type: fruit.type,
    x: fruit.x,
    y: fruit.y,
    vx: rightVx,
    vy: rightVy,
    radius: config.radius,
    rotation: fruit.rotation,
    vRot: (Math.random() - 0.5) * 0.2 + 0.08,
    sliceAngle,
    side: 'right',
    alpha: 1,
    gravity: fruitGravity,
  };

  return [leftHalf, rightHalf];
}

/**
 * Render whole fruit with custom canvas vector shapes
 */
export function drawFruit(ctx: CanvasRenderingContext2D, fruit: Fruit, time: number = performance.now()) {
  ctx.save();
  ctx.translate(fruit.x, fruit.y);
  ctx.rotate(fruit.rotation);

  const r = fruit.radius;

  switch (fruit.type) {
    case 'apple': {
      // Apple body (slightly indented top and bottom)
      ctx.beginPath();
      const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
      grad.addColorStop(0, '#f87171');
      grad.addColorStop(0.7, '#dc2626');
      grad.addColorStop(1, '#991b1b');
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.moveTo(0, -r * 0.75);
      ctx.bezierCurveTo(r * 0.7, -r * 1.1, r * 1.15, -r * 0.2, r * 0.95, r * 0.6);
      ctx.bezierCurveTo(r * 0.8, r * 1.05, 0, r * 0.85, 0, r * 0.85);
      ctx.bezierCurveTo(0, r * 0.85, -r * 0.8, r * 1.05, -r * 0.95, r * 0.6);
      ctx.bezierCurveTo(-r * 1.15, -r * 0.2, -r * 0.7, -r * 1.1, 0, -r * 0.75);
      ctx.fill();

      // Specular highlight
      ctx.beginPath();
      ctx.ellipse(-r * 0.35, -r * 0.35, r * 0.28, r * 0.14, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fill();

      // Stem
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.75);
      ctx.quadraticCurveTo(r * 0.2, -r * 1.1, r * 0.1, -r * 1.25);
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = '#78350f';
      ctx.lineCap = 'round';
      ctx.stroke();

      // Green Leaf
      ctx.beginPath();
      ctx.moveTo(r * 0.05, -r * 0.95);
      ctx.quadraticCurveTo(r * 0.6, -r * 1.3, r * 0.85, -r * 0.95);
      ctx.quadraticCurveTo(r * 0.45, -r * 0.75, r * 0.05, -r * 0.95);
      ctx.fillStyle = '#22c55e';
      ctx.fill();
      break;
    }

    case 'orange': {
      // Orange body
      const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
      grad.addColorStop(0, '#fb923c');
      grad.addColorStop(0.7, '#f97316');
      grad.addColorStop(1, '#c2410c');
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // Orange peel pores
      ctx.fillStyle = 'rgba(194, 65, 12, 0.35)';
      for (let i = 0; i < 14; i++) {
        const ang = (i / 14) * Math.PI * 2 + 0.3;
        const dist = r * (0.35 + (i % 3) * 0.2);
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * dist, Math.sin(ang) * dist, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Specular highlight
      ctx.beginPath();
      ctx.ellipse(-r * 0.35, -r * 0.35, r * 0.25, r * 0.14, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fill();

      // Small stem & leaf
      ctx.beginPath();
      ctx.arc(0, -r + 2, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#15803d';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, -r + 2);
      ctx.quadraticCurveTo(r * 0.4, -r - 12, r * 0.6, -r + 2);
      ctx.quadraticCurveTo(r * 0.3, -r + 8, 0, -r + 2);
      ctx.fillStyle = '#16a34a';
      ctx.fill();
      break;
    }

    case 'banana': {
      // Curved yellow banana
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, -r * 0.3);
      ctx.bezierCurveTo(-r * 0.4, r * 0.8, r * 0.5, r * 0.8, r * 0.95, -r * 0.15);
      ctx.bezierCurveTo(r * 0.6, r * 0.35, -r * 0.2, r * 0.35, -r * 0.75, -r * 0.45);
      ctx.closePath();

      const grad = ctx.createLinearGradient(-r * 0.8, -r * 0.2, r * 0.8, r * 0.4);
      grad.addColorStop(0, '#84cc16'); // green stem end
      grad.addColorStop(0.2, '#fde047');
      grad.addColorStop(0.6, '#eab308');
      grad.addColorStop(1, '#ca8a04');
      ctx.fillStyle = grad;
      ctx.fill();

      // Ridge highlight
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, -r * 0.15);
      ctx.quadraticCurveTo(0, r * 0.45, r * 0.8, 0);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fef08a';
      ctx.stroke();

      // Stem tips
      ctx.beginPath();
      ctx.arc(-r * 0.88, -r * 0.35, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#4d7c0f';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(r * 0.93, -r * 0.15, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#78350f';
      ctx.fill();
      ctx.restore();
      break;
    }

    case 'watermelon': {
      // Large striped green watermelon
      const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
      grad.addColorStop(0, '#22c55e');
      grad.addColorStop(0.6, '#15803d');
      grad.addColorStop(1, '#14532d');
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // Dark green stripes
      ctx.strokeStyle = '#052e16';
      ctx.lineWidth = 6.5;
      ctx.lineCap = 'round';
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        const offsetX = i * (r * 0.28);
        ctx.moveTo(offsetX, -Math.sqrt(Math.max(0, r * r - offsetX * offsetX)));
        ctx.bezierCurveTo(
          offsetX + (i % 2 === 0 ? 10 : -10),
          -r * 0.3,
          offsetX - (i % 2 === 0 ? 8 : -8),
          r * 0.3,
          offsetX,
          Math.sqrt(Math.max(0, r * r - offsetX * offsetX))
        );
        ctx.stroke();
      }

      // Glossy shine
      ctx.beginPath();
      ctx.ellipse(-r * 0.4, -r * 0.4, r * 0.3, r * 0.16, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fill();
      break;
    }

    case 'pineapple': {
      // Oval golden body
      ctx.beginPath();
      ctx.ellipse(0, r * 0.15, r * 0.75, r * 0.9, 0, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(-r * 0.2, 0, r * 0.1, 0, r * 0.15, r * 0.9);
      grad.addColorStop(0, '#fbbf24');
      grad.addColorStop(0.6, '#d97706');
      grad.addColorStop(1, '#92400e');
      ctx.fillStyle = grad;
      ctx.fill();

      // Diamond scale pattern
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2.2;
      for (let d = -2; d <= 2; d++) {
        ctx.beginPath();
        ctx.moveTo(-r * 0.6, d * 18);
        ctx.lineTo(r * 0.6, d * 18 + 25);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(r * 0.6, d * 18);
        ctx.lineTo(-r * 0.6, d * 18 + 25);
        ctx.stroke();
      }

      // Spiky green crown on top
      ctx.fillStyle = '#15803d';
      const crownLeaves = [-0.4, -0.2, 0, 0.2, 0.4];
      crownLeaves.forEach((spread) => {
        ctx.beginPath();
        ctx.moveTo(spread * r * 0.5, -r * 0.55);
        ctx.quadraticCurveTo(spread * r * 1.1, -r * 1.1, spread * r * 0.8, -r * 1.35);
        ctx.quadraticCurveTo(spread * r * 0.4, -r * 0.9, spread * r * 0.2, -r * 0.55);
        ctx.fill();
      });
      break;
    }

    case 'starfruit': {
      // Radiant Glowing Aura (hardware-accelerated radial gradient, 20x faster than shadowBlur)
      ctx.save();
      const auraGrad = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 1.55);
      auraGrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
      auraGrad.addColorStop(0.6, 'rgba(250, 204, 21, 0.25)');
      auraGrad.addColorStop(1, 'rgba(250, 204, 21, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.55, 0, Math.PI * 2);
      ctx.fill();

      // Draw 5-pointed star body
      const starPoints = 5;
      const outerR = r * 1.05;
      const innerR = r * 0.52;

      ctx.beginPath();
      for (let i = 0; i < starPoints * 2; i++) {
        const radius = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / starPoints - Math.PI / 2;
        const sx = Math.cos(angle) * radius;
        const sy = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();

      const starGrad = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, outerR);
      starGrad.addColorStop(0, '#ffffff'); // radiant white-gold core
      starGrad.addColorStop(0.3, '#fef08a');
      starGrad.addColorStop(0.7, '#facc15'); // vibrant star gold
      starGrad.addColorStop(0.92, '#eab308');
      starGrad.addColorStop(1, '#65a30d'); // green ridge tips like real star fruit
      ctx.fillStyle = starGrad;
      ctx.fill();

      // Golden contour
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Translucent star ridges radiating outward
      ctx.save();
      for (let i = 0; i < starPoints; i++) {
        const angle = (i * 2 * Math.PI) / starPoints - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
        ctx.strokeStyle = 'rgba(101, 163, 13, 0.45)';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Inner flesh highlight bead
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * r * 0.48, Math.sin(angle) * r * 0.48, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.fill();
      }
      ctx.restore();

      // Rotating sparkle glints orbiting the glowing starfruit
      const glintCount = 4;
      for (let g = 0; g < glintCount; g++) {
        const glintAngle = time * 0.003 + (g * Math.PI * 2) / glintCount;
        const glintDist = r * (1.18 + Math.sin(time * 0.005 + g) * 0.12);
        const gx = Math.cos(glintAngle) * glintDist;
        const gy = Math.sin(glintAngle) * glintDist;
        const glintScale = 4.5 + Math.sin(time * 0.01 + g * 2) * 2;

        ctx.save();
        ctx.translate(gx, gy);
        ctx.rotate(time * 0.006 + g);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(0, -glintScale);
        ctx.quadraticCurveTo(0, 0, glintScale, 0);
        ctx.quadraticCurveTo(0, 0, 0, glintScale);
        ctx.quadraticCurveTo(0, 0, -glintScale, 0);
        ctx.quadraticCurveTo(0, 0, 0, -glintScale);
        ctx.fill();
        ctx.restore();
      }

      // Glowing "★ SPECIAL ★" floating badge
      ctx.save();
      ctx.font = '900 11px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#090d16';
      ctx.fillText('★ SPECIAL ★', 0, -r * 1.25 + 1);
      ctx.fillStyle = '#fef08a';
      ctx.fillText('★ SPECIAL ★', 0, -r * 1.25);
      ctx.restore();
      break;
    }
  }

  ctx.restore();
}

/**
 * High-performance direct semicircle helper (bypasses costly GPU ctx.clip rasterization)
 */
function fillHalfCircle(
  ctx: CanvasRenderingContext2D,
  radius: number,
  side: 'left' | 'right',
  color: string
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  if (side === 'left') {
    ctx.arc(0, 0, radius, Math.PI / 2, (Math.PI * 3) / 2);
  } else {
    ctx.arc(0, 0, radius, -Math.PI / 2, Math.PI / 2);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * Render sliced halves moving apart (zero-clip high performance canvas paths)
 */
export function drawSlicedHalf(ctx: CanvasRenderingContext2D, half: SlicedHalf) {
  ctx.save();
  ctx.globalAlpha = half.alpha;
  ctx.translate(half.x, half.y);
  ctx.rotate(half.rotation);

  const r = half.radius;
  const isLeft = half.side === 'left';

  switch (half.type) {
    case 'apple': {
      // Outer peel
      fillHalfCircle(ctx, r, half.side, '#dc2626');
      // Pale flesh
      fillHalfCircle(ctx, r * 0.85, half.side, '#fef9c3');
      // Seed
      ctx.beginPath();
      ctx.ellipse(isLeft ? -r * 0.22 : r * 0.22, 0, 3, 6, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#451a03';
      ctx.fill();
      break;
    }

    case 'orange': {
      // Outer peel
      fillHalfCircle(ctx, r, half.side, '#f97316');
      // Pale rind
      fillHalfCircle(ctx, r * 0.88, half.side, '#ffedd5');
      // Juicy flesh core
      fillHalfCircle(ctx, r * 0.80, half.side, '#ea580c');

      // Orange wedge radial segment lines
      ctx.strokeStyle = '#ffedd5';
      ctx.lineWidth = 1.5;
      const startAngle = isLeft ? Math.PI / 2 : -Math.PI / 2;
      for (let w = 1; w < 4; w++) {
        const ang = startAngle + (w / 4) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(ang) * r * 0.78, Math.sin(ang) * r * 0.78);
        ctx.stroke();
      }
      break;
    }

    case 'watermelon': {
      // Dark green outer rind
      fillHalfCircle(ctx, r, half.side, '#15803d');
      // Pale inner rind
      fillHalfCircle(ctx, r * 0.90, half.side, '#bbf7d0');
      // Crimson flesh
      fillHalfCircle(ctx, r * 0.82, half.side, '#e11d48');

      // Black seeds
      ctx.fillStyle = '#0f172a';
      const baseSeedAngle = isLeft ? Math.PI * 0.75 : -Math.PI * 0.25;
      for (let s = 0; s < 3; s++) {
        const ang = baseSeedAngle + (s - 1) * 0.45;
        const dist = r * 0.52;
        ctx.beginPath();
        ctx.ellipse(Math.cos(ang) * dist, Math.sin(ang) * dist, 2.5, 4.5, ang, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'banana': {
      fillHalfCircle(ctx, r, half.side, '#eab308');
      fillHalfCircle(ctx, r * 0.82, half.side, '#fef08a');
      ctx.beginPath();
      ctx.arc(isLeft ? -r * 0.15 : r * 0.15, 0, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#854d0e';
      ctx.fill();
      break;
    }

    case 'pineapple': {
      fillHalfCircle(ctx, r, half.side, '#b45309');
      fillHalfCircle(ctx, r * 0.86, half.side, '#fde047');
      fillHalfCircle(ctx, r * 0.32, half.side, '#ca8a04');
      break;
    }

    case 'starfruit': {
      // Golden starfruit flesh
      fillHalfCircle(ctx, r, half.side, '#facc15');
      // Pale inner translucent core
      fillHalfCircle(ctx, r * 0.85, half.side, '#fef9c3');
      fillHalfCircle(ctx, r * 0.35, half.side, '#fef08a');

      // Star ridges
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 1.5;
      const startAngle = isLeft ? Math.PI * 0.65 : -Math.PI * 0.35;
      for (let i = 0; i < 3; i++) {
        const ang = startAngle + i * 0.35;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(ang) * r * 0.5, Math.sin(ang) * r * 0.5);
        ctx.stroke();
      }

      // Small seed
      ctx.beginPath();
      const seedX = isLeft ? -r * 0.22 : r * 0.22;
      ctx.ellipse(seedX, -r * 0.1, 3, 5, 0.4, 0, Math.PI * 2);
      ctx.fillStyle = '#78350f';
      ctx.fill();
      break;
    }
  }

  // Draw crisp slice cut line edge highlight
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(0, r);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}
