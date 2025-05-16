import * as THREE from "three";

class CameraFlyBy {
  private flyByStartTime: number = performance.now();
  private flyByPhase: number = 0; // 0 = high, 1 = low
  private flyByDuration: number = 1; // seconds for each phase
  private flyByTransitionTime: number = 0;
  private flyByTransitionDuration: number = 0.5; // seconds
  private flyByPrevY: number = 40;
  private yHigh: number = 40;
  private yLow: number = 5;
  public radius = 40;
  public speed = Math.PI / 8; // radians/sec

  updateHeight(camera: THREE.PerspectiveCamera, iTime: number, step: number) {
    const y = this.yLow + step * (this.yHigh - this.yLow);
    const angle = iTime * this.speed;
    camera.position.x = Math.cos(angle) * (this.radius - y * 0.8);
    camera.position.z = Math.sin(angle) * (this.radius - y * 0.8);
    camera.position.y = y;
    camera.lookAt(0, 0, 0);
  }

  update(camera: THREE.PerspectiveCamera, iTime: number) {
    const now = performance.now();
    const elapsed = (now - this.flyByStartTime) / 1000.0;
    let phase = this.flyByPhase;
    let targetY = phase === 0 ? this.yHigh : this.yLow;
    let y = targetY;
    if (elapsed > this.flyByDuration) {
      // Start transition
      this.flyByPhase = (this.flyByPhase + 1) % 2;
      this.flyByStartTime = now;
      this.flyByTransitionTime = now;
      this.flyByPrevY = targetY;
      phase = this.flyByPhase;
      targetY = phase === 0 ? this.yHigh : this.yLow;
    }
    // Handle transition
    let transitionProgress = 0;
    if (this.flyByTransitionTime > 0) {
      transitionProgress = Math.min(
        (now - this.flyByTransitionTime) /
          1000.0 /
          this.flyByTransitionDuration,
        1
      );
      if (transitionProgress < 1) {
        // Interpolate Y
        const fromY = this.flyByPrevY;
        const toY = phase === 0 ? this.yHigh : this.yLow;
        y = fromY + (toY - fromY) * transitionProgress;
      } else {
        // End transition
        this.flyByTransitionTime = 0;
        y = targetY;
      }
    }
    // Orbit parameters
    const angle = iTime * this.speed;
    camera.position.x = Math.cos(angle) * (this.radius - y);
    camera.position.z = Math.sin(angle) * (this.radius - y);
    camera.position.y = y;
    camera.lookAt(0, 0, 0);
  }
}

export default CameraFlyBy;
