// Fish Tankfully (缸好有鱼) — 3D Aquarium Tank, Water Optics, Caustics, Algae & DIY Grid
import * as THREE from "three";
import { createDecorMesh } from "./meshes_generator.js";

function createSubstrateTexture(style = "layered_nature") {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = style === "layered_nature" ? "#b89f74" : "#d6ae72";
  ctx.fillRect(0, 0, 512, 512);

  // Organic river gravel, sand ripples & moss specks (matches ss_02, ss_04, ss_08)
  let seed = 42;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  for (let i = 0; i < 1800; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const r = 1.5 + rand() * 6.5;
    const tone = rand();
    if (tone < 0.35) ctx.fillStyle = "rgba(115, 92, 62, 0.35)";
    else if (tone < 0.7) ctx.fillStyle = "rgba(232, 205, 158, 0.38)";
    else if (style === "layered_nature" && tone > 0.9) ctx.fillStyle = "rgba(108, 138, 52, 0.28)";
    else ctx.fillStyle = "rgba(82, 68, 48, 0.28)";

    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.2, r * 0.85, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSoilCrossSectionTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");

  // Top golden sand layer, bottom dark aqua-soil pebbles (matches ss_08 & ss_04!)
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, "#c8ad7d");
  grad.addColorStop(0.28, "#9e845b");
  grad.addColorStop(0.35, "#3b3228");
  grad.addColorStop(1, "#221d17");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 128);

  let s = 99;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  for (let i = 0; i < 420; i++) {
    const x = rand() * 512;
    const y = 38 + rand() * 86;
    const r = 3 + rand() * 6;
    ctx.fillStyle = rand() > 0.5 ? "#2e2720" : "#181410";
    ctx.strokeStyle = "#4a3f33";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class TankSceneBuilder {
  constructor(parentScene) {
    this.parentScene = parentScene;
    this.root = new THREE.Group();
    this.root.name = "active_tank_root";
    this.parentScene.add(this.root);

    this.decorGroup = new THREE.Group();
    this.decorGroup.name = "decor_group";
    this.root.add(this.decorGroup);

    this.fishGroup = new THREE.Group();
    this.fishGroup.name = "fish_group";
    this.root.add(this.fishGroup);

    this.fxGroup = new THREE.Group();
    this.fxGroup.name = "fx_group";
    this.root.add(this.fxGroup);

    this.decorMeshesByUid = new Map();
    this.waterSurfaceMesh = null;
    this.waterVolumeMesh = null;
    this.frontGlassMesh = null;
    this.substrateFloorMesh = null;
    this.diyGridGroup = null;
    this.selectionOutlineBox = null;

    // Interactive Front Glass Algae Canvas
    this.algaeCanvas = document.createElement("canvas");
    this.algaeCanvas.width = 512;
    this.algaeCanvas.height = 256;
    this.algaeCtx = this.algaeCanvas.getContext("2d");
    this.algaeTexture = new THREE.CanvasTexture(this.algaeCanvas);

    // 3D Magnetic Algae Scraper Brush (follows cursor when scrubbing)
    this.scraperMesh = this.buildMagneticScraperMesh();
    this.scraperMesh.visible = false;
    this.root.add(this.scraperMesh);

    // Rising micro-bubbles & sinking food pellets
    this.bubbles = [];
    this.pellets = [];
    this.initBubbleParticles();
  }

  buildMagneticScraperMesh() {
    const g = new THREE.Group();
    const bluePlastic = new THREE.MeshStandardMaterial({ color: "#3b82f6", roughness: 0.35, flatShading: true });
    const whitePad = new THREE.MeshStandardMaterial({ color: "#e2e8f0", roughness: 0.6, flatShading: true });
    const greenSpongy = new THREE.MeshStandardMaterial({ color: "#22c55e", roughness: 0.7, flatShading: true });

    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.26, 0.08), whitePad);
    g.add(pad);
    const sponge = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.28, 0.05), greenSpongy);
    sponge.position.z = -0.05;
    g.add(sponge);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.12), bluePlastic);
    handle.position.z = 0.08;
    g.add(handle);
    g.rotation.z = -0.25;
    return g;
  }

  initBubbleParticles() {
    const bubbleGeom = new THREE.SphereGeometry(0.025, 6, 6);
    const bubbleMat = new THREE.MeshBasicMaterial({
      color: "#e0f7fa",
      transparent: true,
      opacity: 0.65
    });
    for (let i = 0; i < 48; i++) {
      const m = new THREE.Mesh(bubbleGeom, bubbleMat);
      m.userData = {
        vx: (Math.random() - 0.5) * 0.08,
        vy: 0.45 + Math.random() * 0.55,
        phase: Math.random() * Math.PI * 2
      };
      this.fxGroup.add(m);
      this.bubbles.push(m);
    }
  }

  buildTankGeometry(tank) {
    // Clear previous structural meshes while preserving groups
    const toRemove = [];
    for (const child of this.root.children) {
      if (
        child !== this.decorGroup &&
        child !== this.fishGroup &&
        child !== this.fxGroup &&
        child !== this.scraperMesh
      ) {
        toRemove.push(child);
      }
    }
    toRemove.forEach((c) => this.root.remove(c));

    const W = tank.width;
    const H = tank.height;
    const D = tank.depth;
    const subH = 0.42;

    // 1. Black Cushion Mat Base under the Tank
    const matBase = new THREE.Mesh(
      new THREE.BoxGeometry(W + 0.08, 0.08, D + 0.08),
      new THREE.MeshStandardMaterial({ color: "#1a1817", roughness: 0.9 })
    );
    matBase.position.set(0, -0.04, 0);
    this.root.add(matBase);

    // 2. Sculpted Multi-Layered Substrate Bed (matches ss_08 & ss_04)
    const subSideMat = new THREE.MeshStandardMaterial({
      map: createSoilCrossSectionTexture(),
      roughness: 0.9
    });
    const subTopMat = new THREE.MeshStandardMaterial({
      map: createSubstrateTexture(tank.substrateStyle),
      roughness: 0.85,
      flatShading: true
    });

    const subBox = new THREE.Mesh(
      new THREE.BoxGeometry(W - 0.06, subH, D - 0.06),
      [subSideMat, subSideMat, subTopMat, subSideMat, subSideMat, subSideMat]
    );
    subBox.position.set(0, subH * 0.5, 0);
    subBox.receiveShadow = true;
    this.root.add(subBox);

    // Sculpted low-poly sand dunes on top of substrate for raycasting & shadows
    const floorGeom = new THREE.PlaneGeometry(W - 0.08, D - 0.08, 24, 12);
    floorGeom.rotateX(-Math.PI / 2);
    const pos = floorGeom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const pz = pos.getZ(i);
      // Gentle natural slope higher in the back & around edges
      const mound = Math.max(0, -pz * 0.06) + Math.sin(px * 1.3) * Math.cos(pz * 1.5) * 0.045;
      pos.setY(i, mound);
    }
    floorGeom.computeVertexNormals();
    this.substrateFloorMesh = new THREE.Mesh(floorGeom, subTopMat);
    this.substrateFloorMesh.position.set(0, subH + 0.005, 0);
    this.substrateFloorMesh.receiveShadow = true;
    this.root.add(this.substrateFloorMesh);

    // 3. Water Volume & Animated Rippled Water Surface
    const waterMaxH = H - subH - 0.18;
    const currentWaterH = waterMaxH * (tank.waterLevel || 1.0);

    const waterVolMat = new THREE.MeshBasicMaterial({
      color: tank.doseMethyleneTimer > 0 ? "#38bdf8" : "#c8e6d0",
      transparent: true,
      opacity: tank.doseMethyleneTimer > 0 ? 0.18 : 0.09,
      depthWrite: false,
      side: THREE.BackSide
    });
    this.waterVolumeMesh = new THREE.Mesh(new THREE.BoxGeometry(W - 0.05, currentWaterH, D - 0.05), waterVolMat);
    this.waterVolumeMesh.position.set(0, subH + currentWaterH * 0.5, 0);
    this.root.add(this.waterVolumeMesh);

    const surfGeom = new THREE.PlaneGeometry(W - 0.05, D - 0.05, 32, 16);
    surfGeom.rotateX(-Math.PI / 2);
    const surfMat = new THREE.MeshStandardMaterial({
      color: "#d8f3fa",
      roughness: 0.12,
      metalness: 0.15,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      flatShading: true
    });
    this.waterSurfaceMesh = new THREE.Mesh(surfGeom, surfMat);
    this.waterSurfaceMesh.position.set(0, subH + currentWaterH, 0);
    this.root.add(this.waterSurfaceMesh);

    // 4. Volumetric Sunbeam / God-Ray Cones (matches ss_01 & ss_08)
    const rayMat = new THREE.MeshBasicMaterial({
      color: "#fef08a",
      transparent: true,
      opacity: 0.075,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    for (let r = 0; r < 3; r++) {
      const rayG = new THREE.ConeGeometry(0.95 + r * 0.25, H * 1.25, 12, 1, true);
      const ray = new THREE.Mesh(rayG, rayMat);
      ray.position.set(-W * 0.25 + r * 1.35, H * 0.58, -0.15);
      ray.rotation.z = -0.38;
      this.root.add(ray);
    }

    // 5. Rimless Aquarium Glass Walls & Edge Silicone Highlights
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: "#e6f7fa",
      transparent: true,
      opacity: 0.14,
      roughness: 0.05,
      transmission: 0.2,
      reflectivity: 0.8,
      depthWrite: false
    });

    // Back & Side panes
    const backPane = new THREE.Mesh(new THREE.PlaneGeometry(W, H), glassMat);
    backPane.position.set(0, H * 0.5, -D * 0.5);
    this.root.add(backPane);

    for (const side of [-1, 1]) {
      const sidePane = new THREE.Mesh(new THREE.PlaneGeometry(D, H), glassMat);
      sidePane.rotation.y = side * (Math.PI / 2);
      sidePane.position.set(side * W * 0.5, H * 0.5, 0);
      this.root.add(sidePane);
    }

    // Front Glass Pane with Interactive Algae Overlay Texture!
    this.redrawAlgaeCanvas(tank.algaeLevel);
    const frontAlgaeMat = new THREE.MeshBasicMaterial({
      map: this.algaeTexture,
      transparent: true,
      opacity: 0.92,
      depthWrite: false
    });
    this.frontGlassMesh = new THREE.Mesh(new THREE.PlaneGeometry(W, H), frontAlgaeMat);
    this.frontGlassMesh.position.set(0, H * 0.5, D * 0.5 + 0.01);
    this.root.add(this.frontGlassMesh);

    // Crisp cyan-white rimless glass edge wireframe (iconic look in ss_02, ss_03, ss_04, ref_4)
    const boxEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, D));
    const edgeLines = new THREE.LineSegments(
      boxEdges,
      new THREE.LineBasicMaterial({ color: "#a5d8e6", transparent: true, opacity: 0.72 })
    );
    edgeLines.position.set(0, H * 0.5, 0);
    this.root.add(edgeLines);

    // 6. 3D DIY Aquascaping Placement Grid (hidden until DIY mode is active, matches ss_02 & ref_4!)
    this.diyGridGroup = new THREE.Group();
    this.diyGridGroup.visible = false;
    this.root.add(this.diyGridGroup);

    const floorGrid = new THREE.GridHelper(Math.max(W, D), Math.round(Math.max(W, D) * 3), "#4fd1c5", "#cbd5e0");
    floorGrid.scale.set(W / Math.max(W, D), 1, D / Math.max(W, D));
    floorGrid.position.set(0, subH + 0.03, 0);
    floorGrid.material.transparent = true;
    floorGrid.material.opacity = 0.42;
    this.diyGridGroup.add(floorGrid);

    const backGrid = new THREE.GridHelper(Math.max(W, H), Math.round(Math.max(W, H) * 3), "#4fd1c5", "#cbd5e0");
    backGrid.rotation.x = Math.PI / 2;
    backGrid.scale.set(W / Math.max(W, H), 1, H / Math.max(W, H));
    backGrid.position.set(0, H * 0.5, -D * 0.5 + 0.02);
    backGrid.material.transparent = true;
    backGrid.material.opacity = 0.25;
    this.diyGridGroup.add(backGrid);

    //Rebuild all decor meshes for this tank
    this.syncDecorMeshes(tank);
  }

  redrawAlgaeCanvas(algaeLevel = 0.15) {
    const ctx = this.algaeCtx;
    const w = this.algaeCanvas.width;
    const h = this.algaeCanvas.height;
    ctx.clearRect(0, 0, w, h);

    // Subtle glass reflection sheen at corners
    const sheen = ctx.createLinearGradient(0, 0, w, h);
    sheen.addColorStop(0, "rgba(255, 255, 255, 0.08)");
    sheen.addColorStop(0.5, "rgba(255, 255, 255, 0.0)");
    sheen.addColorStop(1, "rgba(210, 245, 255, 0.06)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, w, h);

    if (algaeLevel <= 0.01) {
      this.algaeTexture.needsUpdate = true;
      return;
    }

    // Draw organic green-olive algae patches matching frame_25 ("清洁 CLEAN UP")
    const blotchCount = Math.floor(algaeLevel * 85);
    let s = 31415;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    for (let i = 0; i < blotchCount; i++) {
      const cx = 45 + rand() * (w - 90);
      const cy = 40 + rand() * (h - 80);
      const rad = 22 + rand() * 55;
      const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, rad);
      g.addColorStop(0, `rgba(92, 128, 38, ${Math.min(0.68, algaeLevel * 0.95)})`);
      g.addColorStop(0.6, `rgba(116, 148, 46, ${Math.min(0.42, algaeLevel * 0.6)})`);
      g.addColorStop(1, "rgba(92, 128, 38, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    this.algaeTexture.needsUpdate = true;
  }

  eraseAlgaeAtUv(uv) {
    if (!uv) return;
    const ctx = this.algaeCtx;
    const x = uv.x * this.algaeCanvas.width;
    const y = (1 - uv.y) * this.algaeCanvas.height;
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    const g = ctx.createRadialGradient(x, y, 10, x, y, 52);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    this.algaeTexture.needsUpdate = true;
  }

  syncDecorMeshes(tank) {
    // Clear existing decor
    while (this.decorGroup.children.length > 0) {
      this.decorGroup.remove(this.decorGroup.children[0]);
    }
    this.decorMeshesByUid.clear();

    const subH = 0.42;
    for (const d of tank.decor) {
      const mesh = createDecorMesh(d.itemId);
      const isTopRim = d.itemId.startsWith("light_");
      const isSideMount = d.itemId.startsWith("filter_") || d.itemId.startsWith("pump_") || d.itemId.startsWith("co2_");
      const baseY = isTopRim ? tank.height : isSideMount ? d.y || 1.5 : subH + (d.y || 0);
      mesh.position.set(d.x, baseY, d.z);
      mesh.scale.setScalar(d.scale || 1.0);
      mesh.rotation.y = d.rotY || 0;
      mesh.userData.decorUid = d.uid;
      mesh.userData.decorData = d;
      this.decorGroup.add(mesh);
      this.decorMeshesByUid.set(d.uid, mesh);
    }
  }

  spawnFoodPellets(tank, isGolden = false, count = 14) {
    const W = tank.width * 0.65;
    const D = tank.depth * 0.55;
    const topY = 0.42 + (tank.height - 0.6) * (tank.waterLevel || 1.0);

    const geom = new THREE.DodecahedronGeometry(0.036, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: isGolden ? "#fbbf24" : "#b45309",
      emissive: isGolden ? "#f59e0b" : "#000000",
      emissiveIntensity: isGolden ? 0.5 : 0,
      roughness: 0.5
    });

    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(geom, mat);
      p.position.set(
        (Math.random() - 0.5) * W,
        topY - Math.random() * 0.15,
        (Math.random() - 0.5) * D
      );
      p.userData = {
        isGolden,
        vy: 0.28 + Math.random() * 0.18,
        eaten: false,
        life: 16
      };
      this.fxGroup.add(p);
      this.pellets.push(p);
    }
  }

  update(time, dt, tank) {
    const subH = 0.42;
    const waterMaxH = tank.height - subH - 0.18;
    const currentWaterH = waterMaxH * (tank.waterLevel || 1.0);

    // 1. Animate water surface waves & dynamic water level (during water change!)
    if (this.waterSurfaceMesh && this.waterVolumeMesh) {
      this.waterSurfaceMesh.position.y = subH + currentWaterH;
      this.waterVolumeMesh.scale.y = Math.max(0.1, tank.waterLevel || 1.0);
      this.waterVolumeMesh.position.y = subH + currentWaterH * 0.5;
      this.waterVolumeMesh.material.color.set(tank.doseMethyleneTimer > 0 ? "#38bdf8" : "#c8e6d0");
      this.waterVolumeMesh.material.opacity = tank.doseMethyleneTimer > 0 ? 0.19 : 0.085;

      const pos = this.waterSurfaceMesh.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const wave = Math.sin(x * 2.2 + time * 2.4) * 0.018 + Math.cos(z * 2.8 - time * 1.9) * 0.014;
        pos.setY(i, wave);
      }
      pos.needsUpdate = true;
    }

    // 2. Sway aquatic plants gently in the filter current
    for (const mesh of this.decorGroup.children) {
      if (mesh.userData.sways) {
        mesh.rotation.z = Math.sin(time * 1.6 + mesh.position.x) * 0.045;
      }
    }

    // 3. Update rising O2 / CO2 bubbles
    const maxY = subH + currentWaterH - 0.05;
    for (const b of this.bubbles) {
      b.position.y += b.userData.vy * dt;
      b.position.x += Math.sin(time * 3 + b.userData.phase) * 0.002;
      if (b.position.y > maxY || b.position.y < subH) {
        b.position.set(
          (Math.random() - 0.5) * (tank.width - 0.5),
          subH + 0.08,
          (Math.random() - 0.5) * (tank.depth - 0.5)
        );
      }
    }

    // 4. Update sinking food pellets
    for (let i = this.pellets.length - 1; i >= 0; i--) {
      const p = this.pellets[i];
      p.userData.life -= dt;
      if (p.userData.eaten || p.userData.life <= 0) {
        this.fxGroup.remove(p);
        this.pellets.splice(i, 1);
        continue;
      }
      if (p.position.y > subH + 0.06) {
        p.position.y -= p.userData.vy * dt;
        p.position.x += Math.sin(time * 4 + i) * 0.002;
        p.rotation.x += dt * 2;
        p.rotation.y += dt * 1.5;
      }
    }
  }
}
