// Fish Tankfully (缸好有鱼) — Cozy Sunlit Office Desk 3D Environment
import * as THREE from "three";

function createPosterTexture(title, subtitle, bgColor, accentColor) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 320;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 256, 320);

  ctx.strokeStyle = "#2b2620";
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, 236, 300);

  // Decorative branch silhouette
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(170, 110, 58, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2f2923";
  ctx.font = "900 44px Impact, sans-serif";
  const lines = title.split("\n");
  lines.forEach((line, i) => {
    ctx.fillText(line, 26, 95 + i * 50);
  });

  if (subtitle) {
    ctx.fillStyle = "#5a4d3f";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText(subtitle, 26, 275);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createRoomEnvironment() {
  const room = new THREE.Group();
  room.name = "office_room_env";

  // 1. L-Shaped Cozy Desk Surface (matches ss_03 & ss_04)
  const deskTopMat = new THREE.MeshStandardMaterial({
    color: "#a89882",
    roughness: 0.72,
    metalness: 0.05,
    flatShading: true
  });
  const deskEdgeMat = new THREE.MeshStandardMaterial({
    color: "#6e5d4b",
    roughness: 0.8,
    flatShading: true
  });

  const mainDesk = new THREE.Mesh(new THREE.BoxGeometry(15.5, 0.36, 6.8), deskTopMat);
  mainDesk.position.set(0, -0.22, 0.4);
  mainDesk.receiveShadow = true;
  room.add(mainDesk);

  const deskLip = new THREE.Mesh(new THREE.BoxGeometry(15.52, 0.38, 0.16), deskEdgeMat);
  deskLip.position.set(0, -0.23, 3.82);
  room.add(deskLip);

  // Right L-wing extension for keyboard & vinyl turntable
  const rightWing = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.36, 5.5), deskTopMat);
  rightWing.position.set(5.4, -0.22, 4.6);
  rightWing.receiveShadow = true;
  room.add(rightWing);

  // 2. Back Wall, Window Frame & Golden Sunbeams
  const wallMat = new THREE.MeshStandardMaterial({
    color: "#8e7b66",
    roughness: 0.9
  });
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(26, 14), wallMat);
  backWall.position.set(0, 4.5, -2.55);
  backWall.receiveShadow = true;
  room.add(backWall);

  // Left Window with warm golden sky glow
  const winFrameMat = new THREE.MeshStandardMaterial({ color: "#6e5338", roughness: 0.75, flatShading: true });
  const skyGlowMat = new THREE.MeshBasicMaterial({ color: "#f6d592" });
  const winGroup = new THREE.Group();
  winGroup.position.set(-6.1, 3.6, -2.48);
  room.add(winGroup);

  const winPane = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 4.6), skyGlowMat);
  winGroup.add(winPane);
  const winBorderTop = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.24, 0.18), winFrameMat);
  winBorderTop.position.y = 2.3;
  winGroup.add(winBorderTop);
  const winBorderMid = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.2, 0.16), winFrameMat);
  winBorderMid.position.y = 0.2;
  winGroup.add(winBorderMid);
  const winBorderBot = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.3, 0.22), winFrameMat);
  winBorderBot.position.y = -2.3;
  winGroup.add(winBorderBot);

  // Iconic Wall Posters ("BACK TO WORK" & "PROFITS") + Sticky Notes (ss_01, ss_04, ss_09)
  const posterBackToWork = new THREE.Mesh(
    new THREE.PlaneGeometry(1.55, 1.95),
    new THREE.MeshStandardMaterial({
      map: createPosterTexture("BACK\nTO\nWORK", "OFFICE VIBES", "#7c6548", "#d69e2e"),
      roughness: 0.85
    })
  );
  posterBackToWork.position.set(1.25, 4.55, -2.48);
  room.add(posterBackToWork);

  const posterProfits = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 1.65),
    new THREE.MeshStandardMaterial({
      map: createPosterTexture("PROFITS", "AUTUMN TOUR", "#4a433b", "#dd6b20"),
      roughness: 0.85
    })
  );
  posterProfits.position.set(2.3, 2.55, -2.49);
  room.add(posterProfits);

  // Yellow & Green Sticky Notes on the wall
  const stickyMatY = new THREE.MeshStandardMaterial({ color: "#d69e2e", roughness: 0.7, flatShading: true });
  const stickyMatG = new THREE.MeshStandardMaterial({ color: "#689f38", roughness: 0.7, flatShading: true });
  const sticky1 = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.45), stickyMatY);
  sticky1.position.set(0.85, 3.7, -2.46);
  sticky1.rotation.z = -0.08;
  room.add(sticky1);

  const sticky2 = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.55), stickyMatG);
  sticky2.position.set(4.1, 4.7, -2.46);
  sticky2.rotation.z = 0.05;
  room.add(sticky2);

  // 3. Sleeping Low-Poly Calico Cat (curled up beside the tank, ss_01, ss_03, ss_05!)
  const catGroup = new THREE.Group();
  catGroup.position.set(-4.35, -0.03, 1.55);
  catGroup.rotation.y = 0.48;
  room.add(catGroup);

  const catWhite = new THREE.MeshStandardMaterial({ color: "#ede6dc", roughness: 0.75, flatShading: true });
  const catOrange = new THREE.MeshStandardMaterial({ color: "#d96b27", roughness: 0.75, flatShading: true });
  const catBlack = new THREE.MeshStandardMaterial({ color: "#2b2623", roughness: 0.8, flatShading: true });

  const catBodyG = new THREE.DodecahedronGeometry(0.56, 1).toNonIndexed();
  catBodyG.scale(1.35, 0.62, 1.05);
  catBodyG.computeVertexNormals();
  const catBody = new THREE.Mesh(catBodyG, catWhite);
  catBody.position.set(0, 0.28, 0);
  catBody.castShadow = true;
  catGroup.add(catBody);

  const orangePatchG = new THREE.DodecahedronGeometry(0.38, 1).toNonIndexed();
  orangePatchG.scale(1.1, 0.65, 0.95);
  orangePatchG.computeVertexNormals();
  const orangePatch = new THREE.Mesh(orangePatchG, catOrange);
  orangePatch.position.set(-0.18, 0.34, -0.08);
  catGroup.add(orangePatch);

  const blackPatch = new THREE.Mesh(orangePatchG, catBlack);
  blackPatch.scale.setScalar(0.72);
  blackPatch.position.set(-0.38, 0.28, 0.14);
  catGroup.add(blackPatch);

  // Cat Head & Ears
  const catHeadG = new THREE.DodecahedronGeometry(0.34, 1).toNonIndexed();
  catHeadG.scale(1.05, 0.88, 1.0);
  catHeadG.computeVertexNormals();
  const catHead = new THREE.Mesh(catHeadG, catWhite);
  catHead.position.set(0.46, 0.3, 0.16);
  catGroup.add(catHead);

  for (const [side, mat] of [[-1, catOrange], [1, catBlack]]) {
    const earG = new THREE.ConeGeometry(0.12, 0.24, 4).toNonIndexed();
    earG.computeVertexNormals();
    const ear = new THREE.Mesh(earG, mat);
    ear.position.set(0.48, 0.56, 0.16 + side * 0.18);
    ear.rotation.x = side * 0.25;
    catGroup.add(ear);
  }

  // 4. Steaming Ceramic Coffee Mug on Orange Coaster (ss_03, ss_09, ref_1)
  const mugGroup = new THREE.Group();
  mugGroup.position.set(2.35, -0.03, 2.35);
  room.add(mugGroup);

  const coaster = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.36, 0.04, 12).toNonIndexed(),
    new THREE.MeshStandardMaterial({ color: "#dd6b20", roughness: 0.6, flatShading: true })
  );
  coaster.position.y = 0.02;
  mugGroup.add(coaster);

  const mugMat = new THREE.MeshStandardMaterial({ color: "#d8cbb8", roughness: 0.45, flatShading: true });
  const mugBody = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.52, 10).toNonIndexed(), mugMat);
  mugBody.position.y = 0.28;
  mugBody.castShadow = true;
  mugGroup.add(mugBody);

  const coffeeLiquid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.21, 0.21, 0.02, 10),
    new THREE.MeshStandardMaterial({ color: "#3b2314", roughness: 0.2 })
  );
  coffeeLiquid.position.y = 0.53;
  mugGroup.add(coffeeLiquid);

  const mugHandle = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.032, 6, 8, Math.PI), mugMat);
  mugHandle.rotation.z = -Math.PI / 2;
  mugHandle.position.set(0.23, 0.28, 0);
  mugGroup.add(mugHandle);

  // Animated rising steam wisps above coffee
  const steamGroup = new THREE.Group();
  steamGroup.position.set(0, 0.6, 0);
  mugGroup.add(steamGroup);
  const steamMat = new THREE.MeshBasicMaterial({
    color: "#ffffff",
    transparent: true,
    opacity: 0.28,
    depthWrite: false
  });
  for (let i = 0; i < 4; i++) {
    const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08 + i * 0.02, 0), steamMat);
    puff.position.set(Math.sin(i) * 0.05, i * 0.18, 0);
    steamGroup.add(puff);
  }

  // 5. Retro Blue Cassette Player (Walkman) & Cassette Tape + Headphones (ss_03, ss_05)
  const walkmanGroup = new THREE.Group();
  walkmanGroup.position.set(-2.55, -0.03, 2.45);
  walkmanGroup.rotation.y = 0.14;
  room.add(walkmanGroup);

  const blueCaseMat = new THREE.MeshStandardMaterial({ color: "#2b59c3", roughness: 0.45, flatShading: true });
  const darkCassetteMat = new THREE.MeshStandardMaterial({ color: "#1e242b", roughness: 0.6, flatShading: true });
  const walkmanBody = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.22, 0.68), blueCaseMat);
  walkmanBody.position.y = 0.11;
  walkmanBody.castShadow = true;
  walkmanGroup.add(walkmanBody);

  const walkmanWindow = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.04, 0.34), darkCassetteMat);
  walkmanWindow.position.set(0, 0.21, 0.04);
  walkmanGroup.add(walkmanWindow);

  // Spare Cassette Tape in front
  const tape = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.07, 0.34), darkCassetteMat);
  tape.position.set(-0.35, 0.035, 0.62);
  tape.rotation.y = -0.08;
  walkmanGroup.add(tape);

  // 6. 65% Mechanical Keyboard on Right Wing (ss_01, ss_03)
  const kbGroup = new THREE.Group();
  kbGroup.position.set(4.55, -0.03, 2.75);
  kbGroup.rotation.y = -0.42;
  room.add(kbGroup);

  const kbCaseMat = new THREE.MeshStandardMaterial({ color: "#d8d2c7", roughness: 0.55, flatShading: true });
  const keycapWhite = new THREE.MeshStandardMaterial({ color: "#f4f1ea", roughness: 0.5, flatShading: true });
  const keycapGrey = new THREE.MeshStandardMaterial({ color: "#9e9689", roughness: 0.55, flatShading: true });
  const keycapOrange = new THREE.MeshStandardMaterial({ color: "#e65c2e", roughness: 0.45, flatShading: true });

  const kbBase = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.14, 0.82), kbCaseMat);
  kbBase.position.y = 0.07;
  kbBase.rotation.x = 0.08;
  kbBase.castShadow = true;
  kbGroup.add(kbBase);

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 12; col++) {
      const isEsc = row === 0 && col === 0;
      const isEdge = col === 0 || col === 11 || (row === 3 && col > 3 && col < 8);
      const mat = isEsc ? keycapOrange : isEdge ? keycapGrey : keycapWhite;
      const key = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.07, 0.13), mat);
      key.position.set(-0.88 + col * 0.16, 0.16 - row * 0.012, -0.24 + row * 0.16);
      kbGroup.add(key);
    }
  }

  // 7. Vinyl Turntable on Right Wing (ss_04, frame_16)
  const turntableGroup = new THREE.Group();
  turntableGroup.position.set(4.85, -0.03, 1.05);
  turntableGroup.rotation.y = -0.25;
  room.add(turntableGroup);

  const ttPlinth = new THREE.Mesh(
    new THREE.BoxGeometry(1.45, 0.16, 1.18),
    new THREE.MeshStandardMaterial({ color: "#dfd8cc", roughness: 0.55, flatShading: true })
  );
  ttPlinth.position.y = 0.08;
  ttPlinth.castShadow = true;
  turntableGroup.add(ttPlinth);

  const vinylDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.48, 0.03, 20),
    new THREE.MeshStandardMaterial({ color: "#141619", roughness: 0.25 })
  );
  vinylDisc.position.set(-0.08, 0.175, 0);
  turntableGroup.add(vinylDisc);

  const vinylLabel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 0.035, 16),
    new THREE.MeshBasicMaterial({ color: "#d53f8c" })
  );
  vinylDisc.add(vinylLabel);

  // 8. Books, Spiral Notebook, Clipboard & Potted Low-Poly Plant (ss_03, ss_04)
  const bookGreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 1.15, 0.85),
    new THREE.MeshStandardMaterial({ color: "#3d6b2c", roughness: 0.7, flatShading: true })
  );
  bookGreen.position.set(4.35, 0.55, -0.85);
  room.add(bookGreen);

  const bookBrown = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 1.28, 0.9),
    new THREE.MeshStandardMaterial({ color: "#6e3b23", roughness: 0.7, flatShading: true })
  );
  bookBrown.position.set(4.6, 0.62, -0.85);
  room.add(bookBrown);

  const clipboard = new THREE.Mesh(
    new THREE.BoxGeometry(1.05, 1.45, 0.06),
    new THREE.MeshStandardMaterial({ color: "#8c6239", roughness: 0.75, flatShading: true })
  );
  clipboard.position.set(5.65, 0.68, -0.65);
  clipboard.rotation.x = -0.22;
  clipboard.rotation.y = -0.35;
  room.add(clipboard);

  const clipPaper = new THREE.Mesh(
    new THREE.PlaneGeometry(0.86, 1.18),
    new THREE.MeshBasicMaterial({ color: "#e2ded5" })
  );
  clipPaper.position.set(0, -0.04, 0.035);
  clipboard.add(clipPaper);

  room.userData = {
    catGroup,
    steamGroup,
    vinylDisc,
    walkmanGroup,
    update(time) {
      // Subtle cat breathing
      catBody.scale.y = 0.62 + Math.sin(time * 1.8) * 0.025;
      // Rising coffee steam wisps
      steamGroup.children.forEach((puff, i) => {
        const phase = (time * 0.55 + i * 0.25) % 1;
        puff.position.y = phase * 0.68;
        puff.position.x = Math.sin(time * 2 + i) * 0.06;
        puff.scale.setScalar(0.7 + phase * 0.7);
      });
      // Spinning vinyl record
      vinylDisc.rotation.y = time * 1.4;
    }
  };

  return room;
}
