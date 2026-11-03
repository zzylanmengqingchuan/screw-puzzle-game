import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class InputControls {
  constructor(camera, canvas) {
    this.orbit = new OrbitControls(camera, canvas);
    this.orbit.enablePan = false;
    this.orbit.minDistance = 5;
    this.orbit.maxDistance = 18;
    this.orbit.minPolarAngle = 0.3;
    this.orbit.maxPolarAngle = 1.3;
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.08;
    this.orbit.target.set(0, 0.8, 0);

    this._downPos = null;
    this._downTime = 0;
    this._clickCb = null;

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    canvas.addEventListener('pointerdown', this._onPointerDown);
    canvas.addEventListener('pointerup', this._onPointerUp);
  }

  onClick(cb) { this._clickCb = cb; }

  _onPointerDown(e) {
    this._downPos = { x: e.clientX, y: e.clientY };
    this._downTime = performance.now();
  }

  _onPointerUp(e) {
    if (!this._downPos) return;
    const dx = e.clientX - this._downPos.x;
    const dy = e.clientY - this._downPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const elapsed = performance.now() - this._downTime;
    this._downPos = null;
    if (dist < 8 && elapsed < 400 && this._clickCb) {
      this._clickCb(e);
    }
  }

  update() { this.orbit.update(); }
}
