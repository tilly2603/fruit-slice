import { TrailPoint } from './types';

export function drawSlashTrail(
  ctx: CanvasRenderingContext2D,
  trail: TrailPoint[],
  currentTime: number,
  trailDurationMs: number = 180,
  glowColor: string = '#38bdf8'
) {
  if (trail.length < 2) return;

  // Filter points within trailDurationMs and cap at most recent 12 points
  const activePoints = trail
    .filter((p) => currentTime - p.time <= trailDurationMs)
    .slice(-12);
  if (activePoints.length < 2) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const len = activePoints.length;

  // Pass 1: Wide luminous outer aura (single connected polyline path)
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = 14;
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.moveTo(activePoints[0].x, activePoints[0].y);
  for (let i = 1; i < len; i++) {
    ctx.lineTo(activePoints[i].x, activePoints[i].y);
  }
  ctx.stroke();

  // Pass 2: Intense vibrant blade body (tapered towards tip via fast segmented stroke)
  ctx.lineWidth = 7;
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.moveTo(activePoints[0].x, activePoints[0].y);
  for (let i = 1; i < len; i++) {
    ctx.lineTo(activePoints[i].x, activePoints[i].y);
  }
  ctx.stroke();

  // Pass 3: Gleaming razor white hot core
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.moveTo(activePoints[0].x, activePoints[0].y);
  for (let i = 1; i < len; i++) {
    ctx.lineTo(activePoints[i].x, activePoints[i].y);
  }
  ctx.stroke();

  ctx.restore();
}

/**
 * Render glowing virtual sword / fingertip marker without expensive software shadowBlur
 */
export function drawFingertipMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  isSlashing: boolean,
  currentTime: number
) {
  ctx.save();

  // Pulse ring
  const pulse = Math.sin(currentTime * 0.01) * 0.5 + 0.5;
  const outerRadius = isSlashing ? 22 + pulse * 6 : 16 + pulse * 4;

  // Outer glowing aura ring (zero-overhead alternative to shadowBlur)
  ctx.beginPath();
  ctx.arc(x, y, outerRadius + 4, 0, Math.PI * 2);
  ctx.strokeStyle = isSlashing ? 'rgba(244, 63, 94, 0.3)' : 'rgba(56, 189, 248, 0.3)';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Vibrant blade edge ring
  ctx.beginPath();
  ctx.arc(x, y, outerRadius, 0, Math.PI * 2);
  ctx.strokeStyle = isSlashing ? 'rgba(244, 63, 94, 0.9)' : 'rgba(56, 189, 248, 0.9)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Inner solid core
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // "SLICE" or sword tag
  ctx.font = '800 12px "Fredoka", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Label tag above finger
  const tagY = y - outerRadius - 14;
  const tagWidth = isSlashing ? 54 : 48;
  const tagHeight = 20;

  ctx.fillStyle = isSlashing ? '#e11d48' : '#0284c7';
  ctx.beginPath();
  ctx.roundRect(x - tagWidth / 2, tagY - tagHeight / 2, tagWidth, tagHeight, 6);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.fillText(isSlashing ? '⚔ SLICE!' : '☝ SLICE', x, tagY);

  ctx.restore();
}
