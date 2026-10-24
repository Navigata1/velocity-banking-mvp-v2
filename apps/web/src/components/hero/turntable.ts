export const HERO_TURN_SECONDS = 8;
export const HERO_REST_ANGLE = -0.55;
export const HERO_CAMERA_FOV = 32;
export const HERO_CAMERA_OFFSET = [3.3, 1.35, 4.8] as const;
export const HERO_CAMERA_NEAR = 0.1;
export const HERO_CAMERA_FAR = 50;

export interface HeroRotationBounds {
  readonly minY: number;
  readonly maxY: number;
  readonly profile: ArrayLike<number>;
}

export function heroFrameDistance(bounds: HeroRotationBounds, aspect: number): number {
  if (!Number.isFinite(aspect) || aspect <= 0) throw new RangeError('Invalid hero aspect.');
  if (!bounds || !Number.isFinite(bounds.minY) || !Number.isFinite(bounds.maxY) || bounds.minY > bounds.maxY ||
    !bounds.profile || !Number.isInteger(bounds.profile.length) || !bounds.profile.length || bounds.profile.length % 2) {
    throw new RangeError('Invalid hero rotation bounds.');
  }
  const elevation = Math.atan2(HERO_CAMERA_OFFSET[1], Math.hypot(HERO_CAMERA_OFFSET[0], HERO_CAMERA_OFFSET[2]));
  const s = Math.sin(elevation), c = Math.cos(elevation), tangent = Math.tan(HERO_CAMERA_FOV * Math.PI / 360);
  const horizontal = Math.hypot(c, 1 / (tangent * aspect)), vertical = c / tangent;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  let sides = 0, maxDepth = -Infinity, minDepth = Infinity, radius = 0;
  // Each vertex sweeps a circle at fixed Y. These are its exact frustum support maxima.
  for (let i = 0; i < bounds.profile.length; i += 2) {
    const r = bounds.profile[i], worldY = bounds.profile[i + 1], y = worldY - centerY;
    if (!Number.isFinite(r) || r < 0 || !Number.isFinite(worldY) || worldY < bounds.minY || worldY > bounds.maxY) {
      throw new RangeError('Invalid hero rotation profile.');
    }
    radius = Math.max(radius, r);
    sides = Math.max(sides, s * y + horizontal * r,
      (s + vertical) * y + Math.abs(c - s / tangent) * r,
      (s - vertical) * y + Math.abs(c + s / tangent) * r);
    maxDepth = Math.max(maxDepth, s * y + c * r);
    minDepth = Math.min(minDepth, s * y - c * r);
  }
  if (!radius && bounds.minY === bounds.maxY) throw new RangeError('Empty hero extent.');
  const epsilon = 1e-6 * Math.max(1, radius, bounds.maxY - bounds.minY);
  const distance = Math.max(sides * 1.08, HERO_CAMERA_NEAR + maxDepth + epsilon);
  if (!Number.isFinite(distance) || distance - minDepth + epsilon >= HERO_CAMERA_FAR) {
    throw new RangeError('Hero cannot fit within the camera clip range.');
  }
  return distance;
}

// One revolution, zero endpoint velocity, then settle at the same orientation.
export function heroAngleAt(seconds: number): number {
  const t = Math.max(0, Math.min(1, Number.isFinite(seconds) ? seconds / HERO_TURN_SECONDS : 0));
  const eased = t * t * (3 - 2 * t);
  return HERO_REST_ANGLE + eased * Math.PI * 2;
}
