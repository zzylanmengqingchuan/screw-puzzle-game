import * as THREE from 'three';

export const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const activeTweens = [];
let _clock = new THREE.Clock();

export function updateAnimations() {
  const dt = _clock.getDelta();
  for (let i = activeTweens.length - 1; i >= 0; i--) {
    if (activeTweens[i].update(dt)) {
      activeTweens.splice(i, 1);
    }
  }
}

function tween(duration, easeFn, onUpdate) {
  const d = prefersReducedMotion ? duration * 0.25 : duration;
  return new Promise(resolve => {
    let elapsed = 0;
    const t = {
      update(dt) {
        elapsed += dt;
        const raw = Math.min(elapsed / d, 1);
        const e = easeFn(raw);
        onUpdate(e, raw);
        if (raw >= 1) { resolve(); return true; }
        return false;
      }
    };
    activeTweens.push(t);
  });
}

const ease = {
  inOutCubic: t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2,
  outCubic: t => 1 - Math.pow(1-t,3),
  inQuad: t => t*t,
  outBack: t => { const c = 1.70158; const c3 = c+1; return 1+c3*Math.pow(t-1,3)+c*Math.pow(t-1,2); },
  inOutQuad: t => t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2,
  outQuad: t => 1-(1-t)*(1-t),
  inOutSine: t => -(Math.cos(Math.PI*t)-1)/2,
};

export async function animateScrewOut(screwGroup) {
  const startY = screwGroup.position.y;
  const targetY = startY + 1.2;
  await tween(0.6, ease.inOutCubic, (e) => {
    screwGroup.position.y = startY + (targetY - startY) * e;
    screwGroup.rotation.y = e * Math.PI * 4;
    const s = 1 + 0.08 * Math.sin(e * Math.PI);
    screwGroup.scale.set(s, s, s);
  });
  screwGroup.scale.set(1, 1, 1);
}

export async function animateFlyTo(screwGroup, targetPos) {
  const start = screwGroup.position.clone();
  const mid = new THREE.Vector3().lerpVectors(start, targetPos, 0.5);
  mid.y += 1.5;
  await tween(0.4, ease.outCubic, (e) => {
    const p1 = new THREE.Vector3().lerpVectors(start, mid, e);
    const p2 = new THREE.Vector3().lerpVectors(mid, targetPos, e);
    const pt = new THREE.Vector3().lerpVectors(p1, p2, e);
    screwGroup.position.copy(pt);
    screwGroup.rotation.y = e * Math.PI * 2;
  });
  screwGroup.position.copy(targetPos);
}

export async function animateBoxFlash(ringMeshes, color) {
  const originalIntensities = ringMeshes.map(r => r.material.emissiveIntensity);
  await tween(0.3, ease.outQuad, (e) => {
    const intensity = 0.3 + 0.7 * Math.sin(e * Math.PI);
    ringMeshes.forEach(r => { r.material.emissiveIntensity = intensity; });
  });
  ringMeshes.forEach((r, i) => { r.material.emissiveIntensity = originalIntensities[i]; });
}

export async function animateEliminate(screwGroups) {
  const promises = screwGroups.map(g =>
    tween(0.5, ease.inOutQuad, (e) => {
      const s = 1 - e;
      g.scale.set(s, s, s);
      g.traverse(c => { if (c.material) c.material.opacity = 1 - e; });
    })
  );
  await Promise.all(promises);
}

export async function animateColorChange(ringMeshes, newColor) {
  const startColors = ringMeshes.map(r => r.material.color.clone());
  const target = new THREE.Color(newColor);
  const targetEmissive = new THREE.Color(newColor);
  await tween(0.4, ease.inOutQuad, (e) => {
    ringMeshes.forEach((r, i) => {
      r.material.color.lerpColors(startColors[i], target, e);
      r.material.emissive.lerpColors(startColors[i], targetEmissive, e);
    });
  });
}

export async function animateAutoReturn(screwGroup, targetPos) {
  const start = screwGroup.position.clone();
  await tween(0.35, ease.outBack, (e) => {
    screwGroup.position.lerpVectors(start, targetPos, e);
  });
  screwGroup.position.copy(targetPos);
}

export async function animatePlateFall(plateMesh) {
  const startY = plateMesh.position.y;
  const startOpacity = plateMesh.material.opacity;
  const rotAxis = Math.random() > 0.5 ? 'x' : 'z';
  const rotDir = (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.15);
  await tween(0.8, ease.inQuad, (e) => {
    plateMesh.position.y = startY - e * 6;
    plateMesh.rotation[rotAxis] += rotDir * 0.03;
    plateMesh.material.opacity = startOpacity * (1 - e);
  });
}

export async function animateFailShake(container) {
  const startX = container.position.x;
  await tween(0.4, ease.inOutSine, (e) => {
    container.position.x = startX + Math.sin(e * Math.PI * 6) * 0.08 * (1 - e);
  });
  container.position.x = startX;
}

export async function animateVictory(boxGroups) {
  // Launch confetti (non-blocking) unless reduced motion
  if (!prefersReducedMotion) {
    _launchConfetti();
  }
  // Box bounce
  for (const box of boxGroups) {
    const startY = box.position.y;
    await tween(0.3, ease.outBack, (e) => {
      box.position.y = startY + Math.sin(e * Math.PI) * 0.4;
    });
    box.position.y = startY;
  }
}

/* ---- confetti particle system ---- */
function _launchConfetti() {
  const COLORS = ['#E07A5F','#5B98D4','#6BAF8D','#E8B84B','#9B7EC8','#E8985E'];
  const COUNT = 50;
  const DURATION = 1500; // ms

  const canvas = document.createElement('canvas');
  canvas.id = 'confetti-canvas';
  const container = document.getElementById('game-container') || document.body;
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const particles = [];
  for (let i = 0; i < COUNT; i++) {
    particles.push({
      x: canvas.width * (0.3 + Math.random() * 0.4),
      y: canvas.height * 0.5,
      vx: (Math.random() - 0.5) * 8,
      vy: -(4 + Math.random() * 6),
      r: 3 + Math.random() * 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      life: 1,
    });
  }

  const start = performance.now();
  function frame(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / DURATION, 1);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.vy += 0.15; // gravity
      p.x += p.vx;
      p.y += p.vy;
      p.life = 1 - progress;
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      canvas.remove();
    }
  }
  requestAnimationFrame(frame);
}
