import * as THREE from 'three';

const COLORS = {
  red:0xF05D74, blue:0x3C94F1, green:0x86CF46,
  yellow:0xF4C647, purple:0xAE72E4, orange:0xF39C4A,
};
export function getColor(name) { return COLORS[name]; }

export function createScrew(colorName) {
  const group = new THREE.Group();
  const color = new THREE.Color(COLORS[colorName] || 0xcccccc);
  const mat = new THREE.MeshStandardMaterial({color, roughness:.32, metalness:.08});
  // 倒角圆帽与同色深十字；不使用浮在螺丝上方的调试符号。
  const profile = [new THREE.Vector2(.0,-.02),new THREE.Vector2(.29,-.02),new THREE.Vector2(.35,.02),new THREE.Vector2(.37,.10),new THREE.Vector2(.34,.20),new THREE.Vector2(.28,.24),new THREE.Vector2(.0,.24)];
  const cap = new THREE.Mesh(new THREE.LatheGeometry(profile,32),mat);
  cap.castShadow=true; group.add(cap);
  const slotMat = new THREE.MeshStandardMaterial({color:color.clone().multiplyScalar(.35),roughness:.7});
  [[.43,.075],[.075,.43]].forEach(([w,h])=>{
    const bar=new THREE.Mesh(new THREE.BoxGeometry(w,.023,h),slotMat);
    bar.position.y=.242;group.add(bar);
  });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.115,.1,.55,16),mat);
  shaft.position.y=-.28;shaft.castShadow=true;group.add(shaft);
  for(let i=0;i<4;i++){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.12,.022,6,20),mat);
    ring.rotation.x=Math.PI/2;ring.position.y=-.12-i*.12;group.add(ring);
  }
  // 透明命中面扩大指尖操作区，实际交互仍仅限已露出的螺丝。
  const hit=new THREE.Mesh(new THREE.CylinderGeometry(.46,.46,.10,20),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
  hit.position.y=.18;group.add(hit);
  group.userData.colorName=colorName;
  return group;
}

const PLATE_SHAPES = {
  rect: (w, h) => {
    const s = new THREE.Shape(), x=w/2, y=h/2;
    // 内收的四边与圆角构成参考图中的软质异形板件。
    s.moveTo(-x*.65,-y);
    s.quadraticCurveTo(0,-y*.77,x*.65,-y);
    s.quadraticCurveTo(x*1.02,-y*1.02,x,-y*.60);
    s.quadraticCurveTo(x*.78,0,x,y*.60);
    s.quadraticCurveTo(x*1.02,y*1.02,x*.65,y);
    s.quadraticCurveTo(0,y*.77,-x*.65,y);
    s.quadraticCurveTo(-x*1.02,y*1.02,-x,y*.60);
    s.quadraticCurveTo(-x*.78,0,-x,-y*.60);
    s.quadraticCurveTo(-x*1.02,-y*1.02,-x*.65,-y);
    return s;
  },
  heart: (w,h) => {
    const s=new THREE.Shape();
    s.moveTo(0,-h*.52);
    s.bezierCurveTo(-w*.20,-h*.28,-w*.59,h*.03,-w*.46,h*.34);
    s.bezierCurveTo(-w*.34,h*.62,-w*.10,h*.55,0,h*.30);
    s.bezierCurveTo(w*.10,h*.55,w*.34,h*.62,w*.46,h*.34);
    s.bezierCurveTo(w*.59,h*.03,w*.20,-h*.28,0,-h*.52);
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
    s.lineTo(w / 2, h*.18);
    s.lineTo(w*.15, h*.18);
    s.lineTo(w*.15, h / 2);
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
  const baseColor = new THREE.Color(tintColor || 0xF798B4);
  const mat = new THREE.MeshPhysicalMaterial({
    color:baseColor,transparent:true,opacity:.90,roughness:.35,
    metalness:0,clearcoat:.65,clearcoatRoughness:.25,side:THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo,mat);
  mesh.castShadow=true;mesh.receiveShadow=true;mesh.rotation.x=-Math.PI/2;
  // 同一轮廓放大形成白色包边，保留真实开孔和板件厚度。
  const borderGeo=new THREE.ExtrudeGeometry(shape,{depth:.13,bevelEnabled:true,bevelThickness:.035,bevelSize:.035,bevelSegments:3});
  const border=new THREE.Mesh(borderGeo,new THREE.MeshStandardMaterial({color:0xffffff,roughness:.5,transparent:true}));
  border.scale.set(1.055,1.055,1);border.position.z=-.055;
  border.castShadow=true;mesh.add(border);
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
