const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

/** A short, bounded release glide; the rendered angle follows input in seconds. */
export class DragRotation {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  private velocityX = 0;
  private velocityY = 0;
  private sampledAt = 0;

  constructor(x: number, y: number, private pitchLimit = 1.25) {
    this.x = this.targetX = x;
    this.y = this.targetY = y;
  }

  begin(now: number) {
    this.stop();
    this.sampledAt = now;
  }

  drag(dx: number, dy: number, now: number, reduced: boolean) {
    if (![dx, dy, now].every(Number.isFinite)) return;
    const dt = Math.max(.008, Math.min(.05, (now - this.sampledAt) / 1000));
    const blend = 1 - Math.exp(-dt * 30);
    this.velocityX += (dx / dt - this.velocityX) * blend;
    this.velocityY += (dy / dt - this.velocityY) * blend;
    this.sampledAt = now;
    this.targetX += dx;
    this.targetY = clamp(this.targetY + dy, this.pitchLimit);
    if (reduced) this.snap(this.targetX, this.targetY);
  }

  release(now: number, reduced: boolean) {
    if (!reduced && now - this.sampledAt < 80) {
      this.targetX += clamp(this.velocityX * .055, .16);
      this.targetY = clamp(this.targetY + clamp(this.velocityY * .055, .055), this.pitchLimit);
    }
    this.velocityX = this.velocityY = 0;
  }

  /** Cancel, blur and entry freeze the visible pose instead of replaying stale input. */
  stop() {
    this.targetX = this.x;
    this.targetY = this.y;
    this.velocityX = this.velocityY = 0;
  }

  snap(x: number, y: number) {
    this.x = this.targetX = x;
    this.y = this.targetY = clamp(y, this.pitchLimit);
    this.velocityX = this.velocityY = 0;
  }

  step(dt: number, reduced: boolean) {
    const beforeX = this.x, beforeY = this.y;
    const blend = reduced ? 1 : 1 - Math.exp(-Math.max(0, Math.min(.05, dt)) * 26);
    this.x += (this.targetX - this.x) * blend;
    this.y += (this.targetY - this.y) * blend;
    if (Math.abs(this.targetX - this.x) < .00001) this.x = this.targetX;
    if (Math.abs(this.targetY - this.y) < .00001) this.y = this.targetY;
    return this.x !== beforeX || this.y !== beforeY;
  }
}
