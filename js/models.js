import * as THREE from 'three';

const COLORS = {
  red:    0xE07A5F,
  blue:   0x5B98D4,
  green:  0x6BAF8D,
  yellow: 0xE8B84B,
  purple: 0x9B7EC8,
  orange: 0xE8985E,
};

const SYMBOLS = {
  red: '●', blue: '◆', green: '▲',
  yellow: '★', purple: '■', orange: '⬟',
};

export function getColor(name) { return COLORS[name]; }

export function createScrew(colorName) {
  const group = new THREE.Group();
  const color = COLORS[colorName] || 0xcccccc;
  const mat = new THREE.MeshStandardMaterial({
    color, metalness: 0.35, roughness: 0.38,
  });

  const capGeo = new THREE.CylinderGeometry(0.36, 0.38, 0.18, 24);
  const cap = new THREE.Mesh(capGeo, mat);
  cap.position.y = 0.09;
  cap.castShadow = true;
  group.add(cap);

  const slotMat = new THREE.MeshStandardMaterial({
    color: 0x333333, metalness: 0.2, roughness: 0.6,
  });
  const slotH = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.04, 0.09), slotMat);
  slotH.position.y = 0.19;
  group.add(slotH);
  const slotV = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.46), slotMat);
  slotV.position.y = 0.19;
  group.add(slotV);

  const shaftGeo = new THREE.CylinderGeometry(0.14, 0.13, 0.6, 16);
  const shaft = new THREE.Mesh(shaftGeo, mat);
  shaft.position.y = -0.3;
  shaft.castShadow = true;
  group.add(shaft);

  const tipGeo = new THREE.SphereGeometry(0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const tip = new THREE.Mesh(tipGeo, mat);
  tip.rotation.x = Math.PI;
  tip.position.y = -0.6;
  group.add(tip);

  for (let i = 0; i < 5; i++) {
    const ringGeo = new THREE.TorusGeometry(0.145, 0.018, 6, 24);
    const ring = new THREE.Mesh(ringGeo, mat);
    ring.position.y = -0.1 - i * 0.11;
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  }

  const symSprite = makeSymbolSprite(colorName);
  if (symSprite) {
    symSprite.position.y = 0.24;
    symSprite.scale.set(0.24, 0.24, 1);
    group.add(symSprite);
  }

  group.userData.colorName = colorName;
  return group;
}

function makeSymbolSprite(colorName) {
  const sym = SYMBOLS[colorName];
  if (!sym) return null;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${size * 0.7}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sym, size / 2, size / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  return new THREE.Sprite(spriteMat);
}

const PLATE_SHAPES = {
  rect: (w, h) => {
    const s = new THREE.Shape();
    const hw = w / 2, hh = h / 2, r = 0.15;
    s.moveTo(-hw + r, -hh);
    s.lineTo(hw - r, -hh);
    s.quadraticCurveTo(hw, -hh, hw, -hh + r);
    s.lineTo(hw, hh - r);
    s.quadraticCurveTo(hw, hh, hw - r, hh);
    s.lineTo(-hw + r, hh);
    s.quadraticCurveTo(-hw, hh, -hw, hh - r);
    s.lineTo(-hw, -hh + r);
    s.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
    return s;
  },
  triangle: (size) => {
    const s = new THREE.Shape();
    const h = size * Math.sqrt(3) / 2;
    s.moveTo(0, h * 0.6);
    s.lineTo(-size / 2, -h * 0.4);
    s.lineTo(size / 2, -h * 0.4);
    s.closePath();
    return s;
  },
  pentagon: (r) => {
    const s = new THREE.Shape();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
    }
    s.closePath();
    return s;
  },
  lshape: (w, h) => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, -h / 2);
    s.lineTo(w / 2, -h / 2);
    s.lineTo(w / 2, 0);
    s.lineTo(0, 0);
    s.lineTo(0, h / 2);
    s.lineTo(-w / 2, h / 2);
    s.closePath();
    return s;
  },
  hexagon: (r) => {
    const s = new THREE.Shape();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
    }
    s.closePath();
    return s;
  },
};

export function createPlate(shapeType, shapeParams, holePositions, tintColor) {
  const shapeFn = PLATE_SHAPES[shapeType];
  if (!shapeFn) return new THREE.Group();
  const shape = shapeFn(...shapeParams);

  holePositions.forEach(([hx, hy]) => {
    const hole = new THREE.Path();
    const segments = 20;
    const radius = 0.22;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const x = hx + Math.cos(a) * radius;
      const y = hy + Math.sin(a) * radius;
      if (i === 0) hole.moveTo(x, y); else hole.lineTo(x, y);
    }
    shape.holes.push(hole);
  });

  const extrudeSettings = {
    depth: 0.18,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 3,
  };
  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  const baseColor = tintColor ? new THREE.Color(0xF0EAE0).lerp(new THREE.Color(tintColor), 0.15) : new THREE.Color(0xF0EAE0);
  const mat = new THREE.MeshPhysicalMaterial({
    color: baseColor,
    transparent: true,
    opacity: 0.55,
    roughness: 0.12,
    metalness: 0.0,
    clearcoat: 0.5,
    clearcoatRoughness: 0.1,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

export function createCollectorBox(colorName) {
  const group = new THREE.Group();
  const boxMat = new THREE.MeshStandardMaterial({
    color: 0xF0E8DD, roughness: 0.55, metalness: 0.02,
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.45, 0.9), boxMat);
  base.receiveShadow = true;
  group.add(base);

  const slotColor = COLORS[colorName] || 0xcccccc;
  const slotPositions = [-0.8, 0, 0.8];
  slotPositions.forEach((sx, i) => {
    const ringGeo = new THREE.TorusGeometry(0.34, 0.055, 12, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: slotColor,
      emissive: slotColor,
      emissiveIntensity: 0.5,
      metalness: 0.1,
      roughness: 0.3,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(sx, 0.23, 0);
    ring.userData.slotIndex = i;
    ring.userData.isSlotRing = true;
    group.add(ring);

    const wellGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.25, 24);
    const wellMat = new THREE.MeshStandardMaterial({ color: 0xC8BBAE, roughness: 0.8 });
    const well = new THREE.Mesh(wellGeo, wellMat);
    well.position.set(sx, 0.05, 0);
    group.add(well);
  });

  group.userData.colorName = colorName;
  group.userData.slotPositions = slotPositions;
  return group;
}

export function createBufferSlot() {
  const group = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: 0xD9CFC2, roughness: 0.7 });
  const baseGeo = new THREE.CylinderGeometry(0.32, 0.34, 0.08, 24);
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.receiveShadow = true;
  group.add(base);

  const innerMat = new THREE.MeshStandardMaterial({ color: 0xC1B6A8, roughness: 0.9 });
  const innerGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.02, 24);
  const inner = new THREE.Mesh(innerGeo, innerMat);
  inner.position.y = 0.04;
  group.add(inner);

  return group;
}
