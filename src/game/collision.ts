/**
 * Collision detection algorithms for fast slicing swipes
 * Checks line segment (p1 -> p2) against circle (cx, cy, radius)
 */

export interface SliceHit {
  hit: boolean;
  sliceAngle: number;
  hitX: number;
  hitY: number;
}

export function checkSegmentCircleCollision(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  cx: number,
  cy: number,
  radius: number
): SliceHit {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  let closestX: number;
  let closestY: number;

  if (lenSq === 0) {
    closestX = x1;
    closestY = y1;
  } else {
    // Project circle center onto segment, clamped between 0 and 1
    const t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cy - y1) * dy) / lenSq));
    closestX = x1 + t * dx;
    closestY = y1 + t * dy;
  }

  const distX = cx - closestX;
  const distY = cy - closestY;
  const distSq = distX * distX + distY * distY;

  if (distSq <= radius * radius) {
    const sliceAngle = lenSq > 0 ? Math.atan2(dy, dx) : 0;
    return {
      hit: true,
      sliceAngle,
      hitX: closestX,
      hitY: closestY,
    };
  }

  return {
    hit: false,
    sliceAngle: 0,
    hitX: 0,
    hitY: 0,
  };
}

/**
 * Calculates speed of swipe between two points over delta time (ms)
 */
export function calculateSpeed(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dtMs: number
): number {
  if (dtMs <= 0) return 0;
  const dist = Math.hypot(x2 - x1, y2 - y1);
  return (dist / dtMs) * 1000; // pixels per second
}
