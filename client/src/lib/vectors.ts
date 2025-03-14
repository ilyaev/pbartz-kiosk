class Vec2 {
  x: number;
  y: number;

  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  set(x: number, y: number): Vec2 {
    this.x = x;
    this.y = y;
    return this;
  }

  copy(v: Vec2): Vec2 {
    this.x = v.x;
    this.y = v.y;
    return this;
  }

  clone(): Vec2 {
    return new Vec2(this.x, this.y);
  }

  add(v: Vec2): Vec2 {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  addScalar(s: number): Vec2 {
    this.x += s;
    this.y += s;
    return this;
  }

  sub(v: Vec2): Vec2 {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  subScalar(s: number): Vec2 {
    this.x -= s;
    this.y -= s;
    return this;
  }

  multiply(v: Vec2): Vec2 {
    this.x *= v.x;
    this.y *= v.y;
    return this;
  }

  fract(): Vec2 {
    this.x = this.x % 1;
    this.y = this.y % 1;
    return this;
  }

  multiplyScalar(scalar: number): Vec2 {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }

  divide(v: Vec2): Vec2 {
    this.x /= v.x;
    this.y /= v.y;
    return this;
  }

  divideScalar(scalar: number): Vec2 {
    if (scalar !== 0) {
      this.x /= scalar;
      this.y /= scalar;
    } else {
      this.x = 0;
      this.y = 0;
    }
    return this;
  }

  dot(v: Vec2): number {
    return this.x * v.x + this.y * v.y;
  }

  lengthSq(): number {
    return this.x * this.x + this.y * this.y;
  }

  length(): number {
    return Math.sqrt(this.lengthSq());
  }

  normalize(): Vec2 {
    return this.divideScalar(this.length() || 1); // Avoid division by zero
  }

  distanceTo(v: Vec2): number {
    return Math.sqrt(this.distanceToSquared(v));
  }

  distanceToSquared(v: Vec2): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return dx * dx + dy * dy;
  }

  lerp(v: Vec2, alpha: number): Vec2 {
    this.x += (v.x - this.x) * alpha;
    this.y += (v.y - this.y) * alpha;
    return this;
  }

  equals(v: Vec2): boolean {
    return v.x === this.x && v.y === this.y;
  }

  toArray(): number[] {
    return [this.x, this.y];
  }

  fromArray(array: number[], offset: number = 0): Vec2 {
    this.x = array[offset];
    this.y = array[offset + 1];
    return this;
  }
}

class Vec3 {
  x: number;
  y: number;
  z: number;

  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  set(x: number, y: number, z: number): Vec3 {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  copy(v: Vec3): Vec3 {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  clone(): Vec3 {
    return new Vec3(this.x, this.y, this.z);
  }

  add(v: Vec3): Vec3 {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }

  addScalar(s: number): Vec3 {
    this.x += s;
    this.y += s;
    this.z += s;
    return this;
  }

  sub(v: Vec3): Vec3 {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }

  subScalar(s: number): Vec3 {
    this.x -= s;
    this.y -= s;
    this.z -= s;
    return this;
  }

  multiply(v: Vec3): Vec3 {
    this.x *= v.x;
    this.y *= v.y;
    this.z *= v.z;
    return this;
  }

  multiplyScalar(scalar: number): Vec3 {
    this.x *= scalar;
    this.y *= scalar;
    this.z *= scalar;
    return this;
  }

  divide(v: Vec3): Vec3 {
    this.x /= v.x;
    this.y /= v.y;
    this.z /= v.z;
    return this;
  }

  divideScalar(scalar: number): Vec3 {
    if (scalar !== 0) {
      this.x /= scalar;
      this.y /= scalar;
      this.z /= scalar;
    } else {
      this.x = 0;
      this.y = 0;
      this.z = 0;
    }
    return this;
  }

  dot(v: Vec3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  lengthSq(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  length(): number {
    return Math.sqrt(this.lengthSq());
  }

  normalize(): Vec3 {
    return this.divideScalar(this.length() || 1); // Avoid division by zero
  }

  distanceTo(v: Vec3): number {
    return Math.sqrt(this.distanceToSquared(v));
  }

  distanceToSquared(v: Vec3): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    return dx * dx + dy * dy + dz * dz;
  }

  lerp(v: Vec3, alpha: number): Vec3 {
    this.x += (v.x - this.x) * alpha;
    this.y += (v.y - this.y) * alpha;
    this.z += (v.z - this.z) * alpha;

    return this;
  }

  equals(v: Vec3): boolean {
    return v.x === this.x && v.y === this.y && v.z === this.z;
  }

  toArray(): number[] {
    return [this.x, this.y, this.z];
  }

  fromArray(array: number[], offset: number = 0): Vec3 {
    this.x = array[offset];
    this.y = array[offset + 1];
    this.z = array[offset + 2];
    return this;
  }

  cross(v: Vec3): Vec3 {
    const x = this.y * v.z - this.z * v.y;
    const y = this.z * v.x - this.x * v.z;
    const z = this.x * v.y - this.y * v.x;

    this.x = x;
    this.y = y;
    this.z = z;

    return this;
  }
}

export { Vec2, Vec3 };
