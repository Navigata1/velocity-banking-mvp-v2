export const HERO_TURN_SECONDS = 8;
export const HERO_REST_ANGLE = -0.55;
export const HERO_CAMERA_FOV = 32;

export function heroFrameDistance(radius: number, aspect: number): number {
  const halfFov = Math.atan(Math.tan(HERO_CAMERA_FOV * Math.PI / 360) * Math.min(1, Math.max(0.25, aspect)));
  return Math.max(0.1, radius) / Math.sin(halfFov) * 1.08;
}

// One revolution, zero endpoint velocity, then settle at the same orientation.
export function heroAngleAt(seconds: number): number {
  const t = Math.max(0, Math.min(1, Number.isFinite(seconds) ? seconds / HERO_TURN_SECONDS : 0));
  const eased = t * t * (3 - 2 * t);
  return HERO_REST_ANGLE + eased * Math.PI * 2;
}
