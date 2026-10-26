// Fish Tankfully (缸好有鱼) — Main Application Orchestrator
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  FISH_CATALOG,
  ITEM_CATALOG,
  TANK_PRESETS,
  FORAGING_SPOTS,
  NEIGHBOR_DIALOGUES,
  getFishSpecies,
  getCatalogItem
} from "./catalog.js";
import { EcosystemState, nextUid } from "./ecosystem.js";
import { createRoomEnvironment } from "./scene_room.js";
import { TankSceneBuilder } from "./scene_tank.js";
import { FishBoidsManager } from "./boids_fish.js";
import { WildForagingScene } from "./wild_foraging.js";
import { SoundEffects } from "./audio.js";
import { renderFishSvg, renderItemSvg, renderShopkeeperSvg } from "./ui_illustrations.js";

class FishTankfullyApp {
  constructor() {
    this.state = new EcosystemState();
    this.sfx = new SoundEffects();
    this.mode = "title"; // "title" | "tank" | "diy" | "camera" | "stream"

    // Shop state
    this.activeShopTab = "deals"; // "deals" | "fish" | "supplies"
    this.activeShopCat = "all";
    this.selectedShopEntry = { kind: "item", id: "algae_scraper" };
    this.shopBuyQty = 1;

    // Tank Info state
    this.rosterSort = "quality";
    this.selectedFishUid = null;

    // DIY Editor state
    this.diyCategory = "all";
    this.selectedDecorUid = null;
    this.isDraggingDecor = false;
    this.selectionBoxHelper = null;

    // Water change animation state
    this.waterChangePhase = "idle"; // "draining" | "refilling" | "idle"

    // Wild foraging state
    this.activeForageSpot = FORAGING_SPOTS[0];
    this.lastCaughtWildFish = null;

    // Dialogue index
    this.dialogueIdx = 0;

    this.initThreeScene();
    this.initDomReferences();
    this.bindEvents();
    this.switchTank(this.state.activeTankId, true);
    this.updateClockWidget();
    setInterval(() => this.updateClockWidget(), 15000);

    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThreeScene() {
    this.canvas = document.getElementById("tank-canvas");
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#6b5844");
    this.scene.fog = new THREE.FogExp2("#6b5844", 0.028);

    this.camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 80);
    this.camera.position.set(0.35, 2.35, 6.85);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.target.set(0.15, 1.45, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 2.2;
    this.controls.maxDistance = 11.5;
    this.controls.maxPolarAngle = Math.PI * 0.52;
    this.controls.minPolarAngle = 0.25;

    // Warm Golden-Hour Window Light + Tank Overhead Studio LED Light
    this.ambientLight = new THREE.HemisphereLight("#fff7ed", "#574838", 0.95);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight("#fde68a", 2.1);
    this.sunLight.position.set(-6.5, 6.8, 3.8);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 22;
    const d = 6.5;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.scene.add(this.sunLight);

    this.tankTopLight = new THREE.PointLight("#e0f2fe", 2.2, 10, 1.2);
    this.tankTopLight.position.set(0, 3.6, 0.2);
    this.scene.add(this.tankTopLight);

    // 1. Cozy Office Desk Room Environment
    this.roomGroup = createRoomEnvironment();
    this.scene.add(this.roomGroup);

    // 2. Active Aquarium Tank & Fish Boids
    this.tankBuilder = new TankSceneBuilder(this.scene);
    this.boids = new FishBoidsManager(this.tankBuilder.fishGroup);

    // 3. 3D Wild Foraging Stream Scene
    this.foragingScene = new WildForagingScene(this.scene);

    // Green Selection Outline Box for DIY Aquascaping (matches ref_4 & ss_02)
    this.selectionBoxHelper = new THREE.BoxHelper(new THREE.Mesh(), 0x22ff44);
    this.selectionBoxHelper.visible = false;
    this.scene.add(this.selectionBoxHelper);

    this.raycaster = new THREE.Raycaster();
    this.pointerNdc = new THREE.Vector2();
    this.isPointerDown = false;
  }

  initDomReferences() {
    // Render static SVG icons into quick slots & shopkeeper
    document.getElementById("slot-icon-1").innerHTML = renderItemSvg("algae_scraper");
    document.getElementById("slot-icon-2").innerHTML = renderItemSvg("sinking_pellets");
    document.getElementById("slot-icon-3").innerHTML = renderItemSvg("golden_food");
    document.getElementById("slot-icon-4").innerHTML = renderItemSvg("methylene_blue");
    document.getElementById("shopkeeper-illustration").innerHTML = renderShopkeeperSvg();

    this.bannerEl = document.getElementById("action-banner");
    this.bannerTimer = null;
  }

  showActionBanner(text, durationMs = 1500) {
    if (!this.bannerEl) return;
    this.bannerEl.textContent = text;
    this.bannerEl.classList.remove("hidden");
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      this.bannerEl.classList.add("hidden");
    }, durationMs);
  }

  switchTank(tankId, initial = false) {
    if (!this.state.tanks[tankId]) return;
    this.state.activeTankId = tankId;
    const tank = this.state.activeTank;

    this.tankBuilder.buildTankGeometry(tank);
    this.boids.syncWithTank(tank);

    // Frame camera nicely for the selected tank width & surrounding desk props (ss_03, ss_04)
    const camZ = tank.width > 6.5 ? 7.35 : tank.width > 5 ? 6.35 : 5.05;
    this.camera.position.set(0.25, 2.32, camZ);
    this.controls.target.set(0, 1.42, 0);
    this.controls.update();

    this.refreshHud();
    if (!initial) {
      this.sfx.playPop(620, 0.09);
      this.state.save();
    }
  }

  refreshHud() {
    const tank = this.state.activeTank;
    const m = this.state.computeTankMetrics(tank);

    document.getElementById("hud-tank-name").textContent = `${tank.nameZh} · ${tank.nameEn.split(" (")[0]}`;
    const moneyFormatted = Math.floor(this.state.money).toLocaleString("en-US");
    document.getElementById("hud-money").textContent = moneyFormatted;
    document.getElementById("shop-money").textContent = moneyFormatted;
    document.getElementById("forage-money").textContent = moneyFormatted;
    document.getElementById("hud-income-rate").textContent = `+${m.hourlyIncome}/h`;

    // Quick-slot counts
    document.getElementById("slot-count-1").textContent = `x${this.state.inventory.algae_scraper || 0}`;
    document.getElementById("slot-count-2").textContent = `x${this.state.inventory.sinking_pellets || 0}`;
    document.getElementById("slot-count-3").textContent = `x${this.state.inventory.golden_food || 0}`;
    document.getElementById("slot-count-4").textContent = `x${this.state.inventory.methylene_blue || 0}`;

    document.querySelectorAll(".quick-slot").forEach((btn) => {
      const slot = Number(btn.dataset.slot);
      btn.classList.toggle("active", slot === this.state.activeToolSlot);
    });

    // Live Ecosystem Telemetry Card
    document.getElementById("eco-stocking").textContent = `${m.fishCount} / ${m.maxFishCapacity}`;
    document.getElementById("eco-gas").textContent = `${m.o2MgL} mg/L · ${m.co2Ppm} ppm`;
    document.getElementById("eco-ph-temp").textContent = `pH ${m.ph} · ${m.tempC}°C`;
    document.getElementById("eco-gear").textContent = `${m.filtration} L/h · ${m.lightWatts}W`;
    document.getElementById("eco-clarity").textContent = `${m.waterQualityPct}% (藻 ${m.algaePct}%)`;
    document.getElementById("eco-harmony").textContent = `${m.harmonyPct}%`;
    document.getElementById("eco-harmony-note").textContent = `${m.harmonyNoteZh} (${m.harmonyNoteEn})`;
  }

  updateClockWidget() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    document.getElementById("phone-time").textContent = `${hh}:${mm}`;
  }

  // ==========================================================================
  // MODAL & MODE CONTROLLERS
  // ==========================================================================
  enterGameplayFromTitle() {
    this.mode = "tank";
    document.getElementById("title-overlay").classList.add("hidden");
    document.getElementById("main-hud").classList.remove("hidden");
    this.sfx.playCoinChime();
    this.refreshHud();
  }

  openShopModal(defaultTab = "deals") {
    this.activeShopTab = defaultTab;
    document.getElementById("shop-modal").classList.remove("hidden");
    document.getElementById("buy-target-tank-select").value = this.state.activeTankId;
    this.renderShopModal();
    this.sfx.playPop(680, 0.08);
  }

  renderShopModal() {
    document.querySelectorAll(".shop-tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.tab === this.activeShopTab);
    });

    const track = document.getElementById("shop-category-track");
    track.style.display = this.activeShopTab === "fish" ? "none" : "flex";

    const grid = document.getElementById("shop-shelf-grid");
    grid.innerHTML = "";

    if (this.activeShopTab === "fish") {
      for (const sp of FISH_CATALOG) {
        const card = document.createElement("div");
        card.className = "shop-card";
        card.innerHTML = `
          <div class="shop-card-box">
            <div class="shop-card-title">${sp.nameZh}</div>
            <div class="shop-card-art">${renderFishSvg(sp.id)}</div>
            <div style="font-size:11px;font-weight:800;color:#475569;">收益 +${sp.incomePerHour}/h</div>
          </div>
          <div class="shop-price-pill">$:${sp.price}</div>
        `;
        card.addEventListener("click", () => {
          this.selectShopEntry("fish", sp.id);
        });
        grid.appendChild(card);
      }
      if (this.selectedShopEntry.kind !== "fish") {
        this.selectShopEntry("fish", FISH_CATALOG[0].id);
      } else {
        this.updateShopBuyPopover();
      }
    } else {
      const items = ITEM_CATALOG.filter((item) => {
        if (this.activeShopTab === "deals") return Boolean(item.isHot) || item.price <= 35;
        if (this.activeShopCat === "all") return true;
        if (this.activeShopCat === "care") {
          return item.category === "tools" || item.category === "food" || item.category === "medicine";
        }
        return item.category === this.activeShopCat;
      });

      for (const item of items) {
        const card = document.createElement("div");
        card.className = "shop-card";
        card.innerHTML = `
          <div class="shop-card-box">
            <div class="shop-card-title">${item.nameZh}</div>
            <div class="shop-card-art">${renderItemSvg(item.id)}</div>
            ${item.isHot ? `<div class="hot-ribbon">HOT</div>` : ""}
          </div>
          <div class="shop-price-pill">$:${item.price}</div>
        `;
        card.addEventListener("click", () => {
          this.selectShopEntry("item", item.id);
        });
        grid.appendChild(card);
      }

      if (items.length > 0 && (this.selectedShopEntry.kind !== "item" || !items.some((i) => i.id === this.selectedShopEntry.id))) {
        this.selectShopEntry("item", items[0].id);
      } else {
        this.updateShopBuyPopover();
      }
    }
  }

  selectShopEntry(kind, id) {
    this.selectedShopEntry = { kind, id };
    this.shopBuyQty = 1;
    this.sfx.playPop(740, 0.05);
    this.updateShopBuyPopover();
  }

  updateShopBuyPopover() {
    const { kind, id } = this.selectedShopEntry;
    const targetRow = document.getElementById("buy-tank-target-row");
    if (kind === "fish") {
      const sp = getFishSpecies(id);
      document.getElementById("buy-pop-title").textContent = sp.nameZh;
      document.getElementById("buy-pop-preview").innerHTML = renderFishSvg(sp.id);
      document.getElementById("buy-pop-desc").textContent = `${sp.nameEn} · ${sp.descZh}`;
      document.getElementById("buy-qty-val").textContent = String(this.shopBuyQty);
      document.getElementById("buy-total-price").textContent = String(sp.price * this.shopBuyQty);
      targetRow.style.display = "flex";
    } else {
      const item = getCatalogItem(id);
      document.getElementById("buy-pop-title").textContent = item.nameZh;
      document.getElementById("buy-pop-preview").innerHTML = renderItemSvg(item.id);
      document.getElementById("buy-pop-desc").textContent = `${item.nameEn} · ${item.descZh}`;
      document.getElementById("buy-qty-val").textContent = String(this.shopBuyQty);
      document.getElementById("buy-total-price").textContent = String(item.price * this.shopBuyQty);
      targetRow.style.display = "none";
    }
  }

  openInfoModal() {
    document.getElementById("info-modal").classList.remove("hidden");
    document.getElementById("info-tank-select").value = this.state.activeTankId;
    this.renderInfoModal();
    this.sfx.playPop(640, 0.07);
  }

  renderInfoModal() {
    const tank = this.state.activeTank;
    const fishes = [...tank.fish];

    if (this.rosterSort === "price") fishes.sort((a, b) => b.sellPrice - a.sellPrice);
    else if (this.rosterSort === "income") fishes.sort((a, b) => b.incomePerHour - a.incomePerHour);
    else if (this.rosterSort === "stage") fishes.sort((a, b) => (a.stage === "adult" ? -1 : 1));
    else fishes.sort((a, b) => (Number(b.isKing) * 2 + Number(b.isShiny)) - (Number(a.isKing) * 2 + Number(a.isShiny)));

    if (!this.selectedFishUid || !fishes.some((f) => f.uid === this.selectedFishUid)) {
      this.selectedFishUid = fishes[0] ? fishes[0].uid : null;
    }

    const grid = document.getElementById("roster-slot-grid");
    grid.innerHTML = "";
    const totalSlots = Math.max(24, Math.ceil((fishes.length + 6) / 6) * 6);

    for (let i = 0; i < totalSlots; i++) {
      const f = fishes[i];
      const slot = document.createElement("div");
      if (f) {
        slot.className = `fish-slot-card ${f.uid === this.selectedFishUid ? "selected" : ""}`;
        slot.innerHTML = `
          ${f.isKing ? `<span class="slot-king-badge">🏆</span>` : f.isShiny ? `<span class="slot-king-badge" style="background:#0284c7">✨</span>` : ""}
          ${renderFishSvg(f.speciesId, { isShiny: f.isShiny })}
        `;
        slot.addEventListener("click", () => {
          this.selectedFishUid = f.uid;
          this.sfx.playPop(780, 0.05);
          this.renderInfoModal();
        });
      } else {
        slot.className = "fish-slot-card empty";
        slot.textContent = "🐟";
      }
      grid.appendChild(slot);
    }

    document.getElementById("info-density-text").textContent = `${tank.fish.length}/${tank.maxFishCapacity}`;
    const densityStatus = document.getElementById("info-density-status");
    if (tank.fish.length > tank.maxFishCapacity) {
      densityStatus.textContent = "密度偏高";
      densityStatus.style.background = "#dc2626";
    } else {
      densityStatus.textContent = "密度适宜";
      densityStatus.style.background = "#16a34a";
    }

    const selected = fishes.find((f) => f.uid === this.selectedFishUid);
    if (selected) {
      const sp = getFishSpecies(selected.speciesId);
      const stageZh = selected.stage === "adult" ? "成鱼" : "鱼苗";
      const stars = "★".repeat(sp.stars || 3);
      document.getElementById("detail-fish-title").innerHTML = `${sp.nameZh} ${stageZh} <span class="stars">${stars}</span>`;
      document.getElementById("detail-fish-tags").innerHTML = `
        ${selected.isKing ? `<span class="tag-king">【鱼王】</span>` : ""}
        ${selected.isShiny ? `<span class="tag-shiny">【闪光】</span>` : ""}
        ${!selected.isKing && !selected.isShiny ? `<span style="color:#cbd5e1">【原生品系】</span>` : ""}
      `;
      document.getElementById("detail-trophy").style.display = selected.isKing ? "flex" : "none";
      document.getElementById("detail-fish-illustration").innerHTML = renderFishSvg(sp.id, { isShiny: selected.isShiny });

      document.getElementById("sheet-fish-name").textContent = `${sp.nameZh} · ${sp.nameEn} (${sp.scientific})`;
      document.getElementById("sheet-length").textContent = `${selected.lengthCm}cm`;
      document.getElementById("sheet-date").textContent = selected.acquiredDate;
      document.getElementById("sheet-source").textContent = selected.source;
      document.getElementById("sheet-temp").textContent = `${sp.idealTemp[0]}–${sp.idealTemp[1]}°C`;
      document.getElementById("sheet-price").textContent = `$${selected.sellPrice}`;
      document.getElementById("sheet-income").textContent = `$${selected.incomePerHour}/h`;
      document.getElementById("sheet-storage").textContent = `${selected.maxStorage}`;
      document.getElementById("sheet-health").textContent = `${selected.health}% 极佳`;
      document.getElementById("sheet-desc").textContent = `${sp.descZh} (${sp.descEn})`;
    }
  }

  // ==========================================================================
  // DIY AQUASCAPE 3D EDITOR (Matches ss_02, ref_4, frame_07)
  // ==========================================================================
  enterDiyMode() {
    this.mode = "diy";
    document.getElementById("main-hud").classList.add("hidden");
    document.getElementById("diy-hud").classList.remove("hidden");
    if (this.tankBuilder.diyGridGroup) {
      this.tankBuilder.diyGridGroup.visible = true;
    }

    const tank = this.state.activeTank;
    if (tank.decor.length > 0 && !this.selectedDecorUid) {
      this.selectDiyDecor(tank.decor[0].uid);
    }
    this.renderDiyTray();
    this.sfx.playPop(700, 0.08);
  }

  exitDiyMode() {
    this.mode = "tank";
    document.getElementById("diy-hud").classList.add("hidden");
    document.getElementById("main-hud").classList.remove("hidden");
    if (this.tankBuilder.diyGridGroup) {
      this.tankBuilder.diyGridGroup.visible = false;
    }
    this.selectionBoxHelper.visible = false;
    this.state.save();
    this.refreshHud();
  }

  selectDiyDecor(uid) {
    this.selectedDecorUid = uid;
    const tank = this.state.activeTank;
    const dec = tank.decor.find((d) => d.uid === uid);
    const mesh = this.tankBuilder.decorMeshesByUid.get(uid);
    if (dec && mesh) {
      this.selectionBoxHelper.setFromObject(mesh);
      this.selectionBoxHelper.visible = true;
      document.getElementById("diy-slider-height").value = String(dec.y || 0);
      document.getElementById("diy-slider-scale").value = String(dec.scale || 1.0);
    } else {
      this.selectionBoxHelper.visible = false;
    }
  }

  renderDiyTray() {
    const tray = document.getElementById("diy-cards-tray");
    tray.innerHTML = "";

    const placeable = ITEM_CATALOG.filter((item) => {
      if (item.category === "tools" || item.category === "food" || item.category === "medicine") return false;
      if (this.diyCategory === "all") return true;
      return item.category === this.diyCategory;
    });

    for (const item of placeable) {
      const count = this.state.inventory[item.id] || 0;
      const card = document.createElement("div");
      card.className = "diy-item-card";
      card.innerHTML = `
        <div class="art">${renderItemSvg(item.id)}</div>
        <span class="stock">x${count}</span>
        <div class="name">${item.nameZh.split("·")[0]}</div>
      `;
      card.addEventListener("click", () => {
        this.placeDecorFromTray(item.id);
      });
      tray.appendChild(card);
    }
  }

  placeDecorFromTray(itemId) {
    const stock = this.state.inventory[itemId] || 0;
    if (stock <= 0) {
      // Automatically grant 1 or buy if player has money so DIY is frictionless!
      this.state.inventory[itemId] = 1;
    }
    this.state.inventory[itemId] = Math.max(0, (this.state.inventory[itemId] || 1) - 1);

    const tank = this.state.activeTank;
    const newDec = {
      uid: nextUid("dec"),
      itemId,
      x: (Math.random() - 0.5) * (tank.width * 0.45),
      y: 0,
      z: (Math.random() - 0.5) * (tank.depth * 0.45),
      scale: 1.0,
      rotY: 0
    };
    tank.decor.push(newDec);
    this.tankBuilder.syncDecorMeshes(tank);
    this.selectDiyDecor(newDec.uid);
    this.renderDiyTray();
    this.sfx.playPop(820, 0.08);
  }

  // ==========================================================================
  // DSLR CAMERA VIEWFINDER MODE (Matches ss_01 & ss_05)
  // ==========================================================================
  enterCameraMode() {
    this.mode = "camera";
    document.getElementById("title-overlay").classList.add("hidden");
    document.getElementById("main-hud").classList.add("hidden");
    document.getElementById("camera-hud").classList.remove("hidden");
    this.applyCameraOptics();
    this.sfx.playPop(880, 0.06);
  }

  exitCameraMode() {
    this.mode = "tank";
    document.getElementById("camera-hud").classList.add("hidden");
    document.getElementById("main-hud").classList.remove("hidden");
    this.camera.fov = 38;
    this.camera.updateProjectionMatrix();
    document.getElementById("dof-vignette").style.boxShadow = "none";
  }

  applyCameraOptics() {
    const fStop = Number(document.getElementById("cam-slider-aperture").value);
    const focalMm = Number(document.getElementById("cam-slider-zoom").value);
    const iso = Number(document.getElementById("cam-slider-iso").value);

    document.getElementById("cam-aperture-val").textContent = `f/${fStop.toFixed(1)}`;
    document.getElementById("cam-zoom-val").textContent = `${focalMm}mm`;
    document.getElementById("cam-iso-val").textContent = `ISO ${iso}`;

    // Map focal length (24mm..300mm) to camera FOV (54°..14°)
    const tZoom = (focalMm - 24) / (300 - 24);
    this.camera.fov = 52 - tZoom * 36;
    this.camera.updateProjectionMatrix();

    // Map ISO (100..1600) to exposure
    this.renderer.toneMappingExposure = 0.85 + ((iso - 100) / 1500) * 0.65;

    // Map shallow aperture (f/1.4) to soft bokeh vignette
    const blurStrength = Math.max(0, (12 - fStop) / 10.6);
    const dofEl = document.getElementById("dof-vignette");
    dofEl.style.boxShadow = `inset 0 0 ${Math.round(blurStrength * 95)}px rgba(245, 222, 179, ${blurStrength * 0.35})`;
  }

  // ==========================================================================
  // WILD FORAGING MAP & 3D STREAM DIP-NETTING (Matches frame_37, 40, ss_10)
  // ==========================================================================
  openForagingMap() {
    document.getElementById("title-overlay").classList.add("hidden");
    document.getElementById("foraging-modal").classList.remove("hidden");
    this.renderForagingMap();
    this.sfx.playPop(660, 0.08);
  }

  renderForagingMap() {
    document.getElementById("forage-lv").textContent = String(this.state.foragingLevel);
    document.getElementById("forage-xp-text").textContent = `${this.state.foragingXp}/${this.state.foragingXpMax}`;
    document.getElementById("forage-xp-fill").style.width = `${Math.min(100, (this.state.foragingXp / this.state.foragingXpMax) * 100)}%`;
    document.getElementById("forage-stamina").textContent = `${Math.floor(this.state.stamina)}/${this.state.staminaMax}`;

    const layer = document.getElementById("forage-polaroid-layer");
    layer.innerHTML = "";

    for (const spot of FORAGING_SPOTS) {
      const sampleFish = spot.possibleCatches[0];
      const card = document.createElement("div");
      card.className = "polaroid-card";
      card.style.left = `${spot.mapPos.x}%`;
      card.style.top = `${spot.mapPos.y}%`;
      card.innerHTML = `
        <div class="polaroid-tag">${spot.nameZh} · ${spot.nameEn.split(" ").pop()}</div>
        <div class="polaroid-art">
          ${renderFishSvg(sampleFish)}
        </div>
        <div class="polaroid-foot">
          <span>🌿 ${spot.discoveryPct}%</span>
          <span>⚡ -${spot.staminaCost}</span>
        </div>
      `;
      card.addEventListener("click", () => {
        this.startStreamForaging(spot);
      });
      layer.appendChild(card);
    }
  }

  startStreamForaging(spot) {
    this.activeForageSpot = spot;
    this.mode = "stream";
    document.getElementById("foraging-modal").classList.add("hidden");
    document.getElementById("main-hud").classList.add("hidden");
    document.getElementById("stream-hud").classList.remove("hidden");
    document.getElementById("caught-reward-card").classList.add("hidden");
    document.getElementById("stream-spot-title").textContent = `${spot.nameZh} (${spot.nameEn}) — 移动鼠标瞄准溪鱼，左键点击抄网捕捞！`;

    // Hide indoor room & tank, show outdoor mountain stream
    this.roomGroup.visible = false;
    this.tankBuilder.root.visible = false;
    this.selectionBoxHelper.visible = false;
    this.foragingScene.enterStream(spot);

    this.camera.fov = 40;
    this.camera.position.set(0, 1.52, 4.2);
    this.controls.target.set(0, 0.75, 0);
    this.controls.enabled = false;
    this.camera.updateProjectionMatrix();
    this.controls.update();

    this.sfx.playSplash();
  }

  exitStreamForaging() {
    this.mode = "tank";
    this.foragingScene.exitStream();
    this.roomGroup.visible = true;
    this.tankBuilder.root.visible = true;
    this.controls.enabled = true;

    document.getElementById("stream-hud").classList.add("hidden");
    document.getElementById("main-hud").classList.remove("hidden");
    this.switchTank(this.state.activeTankId, true);
  }

  // ==========================================================================
  // EVENT BINDINGS
  // ==========================================================================
  bindEvents() {
    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Title Screen buttons
    document.getElementById("btn-start-game").addEventListener("click", () => this.enterGameplayFromTitle());
    document.getElementById("btn-continue-game").addEventListener("click", () => this.enterGameplayFromTitle());
    document.getElementById("btn-title-camera").addEventListener("click", () => this.enterCameraMode());
    document.getElementById("btn-title-forage").addEventListener("click", () => this.openForagingMap());

    // Tank Switcher cycles through the 4 signature tanks
    const tankOrder = Object.keys(TANK_PRESETS);
    document.getElementById("btn-tank-switcher").addEventListener("click", () => {
      const idx = tankOrder.indexOf(this.state.activeTankId);
      const nextId = tankOrder[(idx + 1) % tankOrder.length];
      this.switchTank(nextId);
    });

    // Top-right Navigation Icons
    document.getElementById("btn-open-shop").addEventListener("click", () => this.openShopModal("deals"));
    document.getElementById("btn-open-info").addEventListener("click", () => this.openInfoModal());
    document.getElementById("btn-dock-roster").addEventListener("click", () => this.openInfoModal());
    document.getElementById("btn-open-diy").addEventListener("click", () => this.enterDiyMode());
    document.getElementById("btn-dock-backpack").addEventListener("click", () => this.enterDiyMode());
    document.getElementById("btn-open-foraging").addEventListener("click", () => this.openForagingMap());

    // Left Strip & Smartphone Dialogue
    document.getElementById("btn-toggle-eco").addEventListener("click", () => {
      document.getElementById("eco-telemetry-card").classList.toggle("hidden");
    });
    document.getElementById("btn-close-eco").addEventListener("click", () => {
      document.getElementById("eco-telemetry-card").classList.add("hidden");
    });

    const openNeighborDialogue = () => {
      const d = NEIGHBOR_DIALOGUES[this.dialogueIdx % NEIGHBOR_DIALOGUES.length];
      this.dialogueIdx += 1;
      document.getElementById("vn-speaker-name").textContent = `${d.speakerZh} · ${d.speakerEn}`;
      document.getElementById("vn-dialogue-text").textContent = `${d.textZh}\n${d.textEn}`;
      document.getElementById("dialogue-overlay").classList.remove("hidden");
      this.sfx.playPop(580, 0.07);
    };
    document.getElementById("btn-open-dialogue").addEventListener("click", openNeighborDialogue);
    document.getElementById("smartphone-widget").addEventListener("click", openNeighborDialogue);
    document.getElementById("dialogue-overlay").addEventListener("click", () => {
      document.getElementById("dialogue-overlay").classList.add("hidden");
    });

    // Right Utility Strip
    document.getElementById("btn-toggle-title").addEventListener("click", () => {
      document.getElementById("title-overlay").classList.remove("hidden");
      document.getElementById("main-hud").classList.add("hidden");
      this.mode = "title";
    });
    document.getElementById("btn-toggle-idle").addEventListener("click", () => {
      document.getElementById("main-hud").classList.add("hidden");
      document.getElementById("btn-exit-idle").classList.remove("hidden");
    });
    document.getElementById("btn-exit-idle").addEventListener("click", () => {
      document.getElementById("btn-exit-idle").classList.add("hidden");
      document.getElementById("main-hud").classList.remove("hidden");
    });
    document.getElementById("btn-open-camera").addEventListener("click", () => this.enterCameraMode());
    document.getElementById("btn-toggle-music").addEventListener("click", (e) => {
      const on = this.sfx.toggleLofiMusic();
      e.currentTarget.classList.toggle("active", on);
      this.showActionBanner(on ? "🎵 桌面轻音乐 ON" : "🎵 桌面轻音乐 OFF", 1100);
    });

    // Siphon Water Change Button (Matches frame_28!)
    document.getElementById("btn-water-change").addEventListener("click", () => {
      if (this.waterChangePhase !== "idle") return;
      this.waterChangePhase = "draining";
      this.sfx.playSplash();
      this.showActionBanner("💧 换水净缸 WATER CHANGE", 2200);
    });

    // Quick-Use Item Slots [1] [2] [3] [4]
    document.querySelectorAll(".quick-slot").forEach((btn) => {
      btn.addEventListener("click", () => {
        const slot = Number(btn.dataset.slot);
        this.activateToolSlot(slot);
      });
    });

    window.addEventListener("keydown", (e) => {
      if (["1", "2", "3", "4"].includes(e.key) && this.mode === "tank") {
        this.activateToolSlot(Number(e.key));
      } else if ((e.key === "b" || e.key === "B") && this.mode === "tank") {
        this.enterDiyMode();
      } else if (e.key === "Escape") {
        document.getElementById("shop-modal").classList.add("hidden");
        document.getElementById("info-modal").classList.add("hidden");
        document.getElementById("foraging-modal").classList.add("hidden");
        document.getElementById("dialogue-overlay").classList.add("hidden");
        if (this.mode === "diy") this.exitDiyMode();
        if (this.mode === "camera") this.exitCameraMode();
        if (this.mode === "stream") this.exitStreamForaging();
      }
    });

    // Shop Modal Events
    document.getElementById("btn-close-shop").addEventListener("click", () => {
      document.getElementById("shop-modal").classList.add("hidden");
    });
    document.querySelectorAll(".shop-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        this.activeShopTab = tab.dataset.tab;
        this.renderShopModal();
      });
    });
    document.querySelectorAll("#shop-category-track .track-node").forEach((node) => {
      node.addEventListener("click", () => {
        document.querySelectorAll("#shop-category-track .track-node").forEach((n) => n.classList.remove("active"));
        node.classList.add("active");
        this.activeShopCat = node.dataset.cat;
        this.renderShopModal();
      });
    });
    document.getElementById("btn-qty-minus").addEventListener("click", () => {
      this.shopBuyQty = Math.max(1, this.shopBuyQty - 1);
      this.updateShopBuyPopover();
    });
    document.getElementById("btn-qty-plus").addEventListener("click", () => {
      this.shopBuyQty = Math.min(20, this.shopBuyQty + 1);
      this.updateShopBuyPopover();
    });
    document.getElementById("btn-confirm-buy").addEventListener("click", () => {
      const targetTankId = document.getElementById("buy-target-tank-select").value || this.state.activeTankId;
      const res = this.state.buyItem(this.selectedShopEntry.kind, this.selectedShopEntry.id, this.shopBuyQty, targetTankId);
      if (res.ok) {
        this.sfx.playCoinChime();
        document.getElementById("shop-speech").textContent = "谢谢惠顾！喜欢您常来~";
        if (targetTankId === this.state.activeTankId) {
          this.boids.syncWithTank(this.state.activeTank);
        }
        this.refreshHud();
      } else {
        document.getElementById("shop-speech").textContent = "余额不足哦，快去卖鱼或收收益吧！";
      }
    });

    // Tank Info Modal Events
    document.getElementById("btn-close-info").addEventListener("click", () => {
      document.getElementById("info-modal").classList.add("hidden");
    });
    document.getElementById("info-tank-select").addEventListener("change", (e) => {
      this.switchTank(e.target.value);
      this.renderInfoModal();
    });
    document.querySelectorAll(".filter-pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        document.querySelectorAll(".filter-pill").forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        this.rosterSort = pill.dataset.sort;
        this.renderInfoModal();
      });
    });
    document.getElementById("btn-sell-fish").addEventListener("click", () => {
      if (!this.selectedFishUid) return;
      if (this.state.activeTank.fish.length <= 1) {
        this.showActionBanner("留一条镇缸之宝吧！", 1400);
        return;
      }
      const sold = this.state.sellFish(this.selectedFishUid);
      if (sold) {
        this.sfx.playCoinChime();
        this.boids.syncWithTank(this.state.activeTank);
        this.refreshHud();
        this.renderInfoModal();
      }
    });

    // DIY Editor Events
    document.getElementById("btn-close-diy").addEventListener("click", () => this.exitDiyMode());
    document.getElementById("btn-diy-confirm").addEventListener("click", () => this.exitDiyMode());
    document.getElementById("btn-diy-rotate").addEventListener("click", () => {
      const dec = this.state.activeTank.decor.find((d) => d.uid === this.selectedDecorUid);
      const mesh = this.tankBuilder.decorMeshesByUid.get(this.selectedDecorUid);
      if (dec && mesh) {
        dec.rotY = (dec.rotY || 0) + Math.PI / 4;
        mesh.rotation.y = dec.rotY;
        this.selectionBoxHelper.update();
        this.sfx.playPop(720, 0.05);
      }
    });
    document.getElementById("btn-diy-remove").addEventListener("click", () => {
      const tank = this.state.activeTank;
      const idx = tank.decor.findIndex((d) => d.uid === this.selectedDecorUid);
      if (idx !== -1) {
        const [removed] = tank.decor.splice(idx, 1);
        this.state.inventory[removed.itemId] = (this.state.inventory[removed.itemId] || 0) + 1;
        this.tankBuilder.syncDecorMeshes(tank);
        this.selectedDecorUid = tank.decor[0]?.uid || null;
        this.selectDiyDecor(this.selectedDecorUid);
        this.renderDiyTray();
        this.sfx.playPop(520, 0.06);
      }
    });
    document.getElementById("diy-slider-height").addEventListener("input", (e) => {
      const dec = this.state.activeTank.decor.find((d) => d.uid === this.selectedDecorUid);
      const mesh = this.tankBuilder.decorMeshesByUid.get(this.selectedDecorUid);
      if (dec && mesh) {
        dec.y = Number(e.target.value);
        mesh.position.y = 0.42 + dec.y;
        this.selectionBoxHelper.update();
      }
    });
    document.getElementById("diy-slider-scale").addEventListener("input", (e) => {
      const dec = this.state.activeTank.decor.find((d) => d.uid === this.selectedDecorUid);
      const mesh = this.tankBuilder.decorMeshesByUid.get(this.selectedDecorUid);
      if (dec && mesh) {
        dec.scale = Number(e.target.value);
        mesh.scale.setScalar(dec.scale);
        this.selectionBoxHelper.update();
      }
    });
    document.querySelectorAll(".diy-cat-node").forEach((node) => {
      node.addEventListener("click", () => {
        document.querySelectorAll(".diy-cat-node").forEach((n) => n.classList.remove("active"));
        node.classList.add("active");
        this.diyCategory = node.dataset.cat;
        this.renderDiyTray();
      });
    });

    // DSLR Camera Events
    document.getElementById("btn-close-camera").addEventListener("click", () => this.exitCameraMode());
    ["cam-slider-aperture", "cam-slider-zoom", "cam-slider-iso"].forEach((id) => {
      document.getElementById(id).addEventListener("input", () => this.applyCameraOptics());
    });
    document.getElementById("btn-cam-shutter").addEventListener("click", () => {
      this.sfx.playShutter();
      this.showActionBanner("📸 美照已保存 SNAPSHOT SAVED!", 1600);
    });

    // Wild Foraging Map & 3D Stream Events
    document.getElementById("btn-close-foraging").addEventListener("click", () => {
      document.getElementById("foraging-modal").classList.add("hidden");
    });
    document.getElementById("btn-exit-stream").addEventListener("click", () => this.exitStreamForaging());
    document.getElementById("btn-keep-caught").addEventListener("click", () => {
      if (this.lastCaughtWildFish) {
        const inst = this.state.createFishInstance(this.lastCaughtWildFish.speciesId, {
          stage: "adult",
          isKing: this.lastCaughtWildFish.isKing,
          isShiny: this.lastCaughtWildFish.isShiny,
          source: `野采·${this.activeForageSpot.nameZh}`
        });
        this.state.activeTank.fish.push(inst);
        this.state.foragingXp += 5;
        if (this.state.foragingXp >= this.state.foragingXpMax) {
          this.state.foragingLevel += 1;
          this.state.foragingXp = 0;
        }
        this.state.save();
      }
      document.getElementById("caught-reward-card").classList.add("hidden");
      document.querySelector(".stream-watermark")?.classList.remove("hidden");
      this.foragingScene.hideHandReveal();
      this.sfx.playCoinChime();
    });

    // 3D Canvas Pointer Interactions (Scrubbing Algae, Dropping Food, Dragging DIY Decor, Dip-Netting)
    this.canvas.addEventListener("pointerdown", (e) => this.onCanvasPointerDown(e));
    window.addEventListener("pointermove", (e) => this.onCanvasPointerMove(e));
    window.addEventListener("pointerup", () => {
      this.isPointerDown = false;
      this.isDraggingDecor = false;
      this.tankBuilder.scraperMesh.visible = false;
      if (this.mode !== "stream") {
        this.controls.enabled = true;
      }
    });
  }

  activateToolSlot(slot) {
    this.state.activeToolSlot = slot;
    this.refreshHud();

    if (slot === 1) {
      this.showActionBanner("清洁 CLEAN UP (按住左键擦拭鱼缸玻璃)", 1600);
      this.sfx.playScrub();
    } else if (slot === 2) {
      const res = this.state.feedFish("sinking_pellets");
      if (res.ok) {
        this.tankBuilder.spawnFoodPellets(this.state.activeTank, false, 14);
        this.boids.syncWithTank(this.state.activeTank);
        this.showActionBanner("喂食 FEEDING", 1500);
        this.sfx.playSplash();
        this.refreshHud();
      }
    } else if (slot === 3) {
      const res = this.state.feedFish("golden_food");
      if (res.ok) {
        this.tankBuilder.spawnFoodPellets(this.state.activeTank, true, 16);
        this.boids.syncWithTank(this.state.activeTank);
        const msg = res.shinyUnlocked > 0 ? "✨ 触发【闪光】异色进化！ COLOR MORPH!" : res.grownCount > 0 ? "🐟 鱼苗成长为成鱼！ GROWTH!" : "✨ 增色喂食 GOLDEN FEEDING";
        this.showActionBanner(msg, 1800);
        this.sfx.playCoinChime();
        this.refreshHud();
      }
    } else if (slot === 4) {
      const res = this.state.doseMethyleneBlue();
      if (res.ok) {
        this.tankBuilder.redrawAlgaeCanvas(this.state.activeTank.algaeLevel);
        this.showActionBanner("💧 亚甲基蓝净水净化 STABILIZED!", 1600);
        this.sfx.playSplash();
        this.refreshHud();
      }
    }
  }

  updatePointerNdc(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  onCanvasPointerDown(e) {
    if (e.button !== 0) return;
    this.isPointerDown = true;
    this.updatePointerNdc(e);
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);

    // 1. Wild Foraging 3D Stream Scoop!
    if (this.mode === "stream") {
      if (!document.getElementById("caught-reward-card").classList.contains("hidden")) return;
      this.sfx.playSplash();
      const caught = this.foragingScene.scoopAtCurrentNet();
      if (caught) {
        this.lastCaughtWildFish = caught;
        const sp = getFishSpecies(caught.speciesId);
        document.getElementById("caught-fish-svg").innerHTML = renderFishSvg(sp.id, { isShiny: caught.isShiny });
        document.getElementById("caught-fish-name").textContent = `${sp.nameZh} · ${sp.nameEn}`;
        document.getElementById("caught-fish-tags").innerHTML = `
          ${caught.isKing ? `<span class="tag-king" style="background:#1e293b;padding:2px 8px;border-radius:6px;">🏆 野生鱼王</span>` : ""}
          ${caught.isShiny ? `<span class="tag-shiny" style="background:#1e293b;padding:2px 8px;border-radius:6px;">✨ 闪光异色</span>` : ""}
        `;
        document.getElementById("caught-reward-card").classList.remove("hidden");
        document.querySelector(".stream-watermark")?.classList.add("hidden");
        this.sfx.playCoinChime();
      }
      return;
    }

    // 2. DIY Aquascaping Prop Selection & Floor Dragging
    if (this.mode === "diy") {
      const hits = this.raycaster.intersectObjects(this.tankBuilder.decorGroup.children, true);
      if (hits.length > 0) {
        let obj = hits[0].object;
        while (obj && !obj.userData.decorUid && obj.parent) {
          obj = obj.parent;
        }
        if (obj && obj.userData.decorUid) {
          this.selectDiyDecor(obj.userData.decorUid);
          this.isDraggingDecor = true;
          this.controls.enabled = false;
          return;
        }
      }
    }

    // 3. Magnetic Glass Algae Scraper (Slot 1)
    if (this.mode === "tank" && this.state.activeToolSlot === 1 && this.tankBuilder.frontGlassMesh) {
      const glassHits = this.raycaster.intersectObject(this.tankBuilder.frontGlassMesh, false);
      if (glassHits.length > 0) {
        this.controls.enabled = false;
        this.scrubGlassHit(glassHits[0]);
      }
    }
  }

  onCanvasPointerMove(e) {
    this.updatePointerNdc(e);

    if (this.mode === "stream") {
      this.foragingScene.aimDipNet(this.pointerNdc.x, this.pointerNdc.y);
      return;
    }

    if (!this.isPointerDown) return;
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);

    // Dragging selected 3D decor across the substrate floor in DIY mode
    if (this.mode === "diy" && this.isDraggingDecor && this.selectedDecorUid && this.tankBuilder.substrateFloorMesh) {
      const floorHits = this.raycaster.intersectObject(this.tankBuilder.substrateFloorMesh, false);
      if (floorHits.length > 0) {
        const pt = floorHits[0].point;
        const tank = this.state.activeTank;
        const dec = tank.decor.find((d) => d.uid === this.selectedDecorUid);
        const mesh = this.tankBuilder.decorMeshesByUid.get(this.selectedDecorUid);
        if (dec && mesh) {
          const limX = tank.width * 0.42;
          const limZ = tank.depth * 0.42;
          dec.x = Math.max(-limX, Math.min(limX, pt.x));
          dec.z = Math.max(-limZ, Math.min(limZ, pt.z));
          mesh.position.x = dec.x;
          mesh.position.z = dec.z;
          this.selectionBoxHelper.update();
        }
      }
      return;
    }

    // Dragging Magnetic Algae Scraper across front glass (Matches frame_25 "清洁 CLEAN UP")
    if (this.mode === "tank" && this.state.activeToolSlot === 1 && this.tankBuilder.frontGlassMesh) {
      const glassHits = this.raycaster.intersectObject(this.tankBuilder.frontGlassMesh, false);
      if (glassHits.length > 0) {
        this.scrubGlassHit(glassHits[0]);
      }
    }
  }

  scrubGlassHit(hit) {
    this.tankBuilder.scraperMesh.visible = true;
    this.tankBuilder.scraperMesh.position.copy(hit.point);
    this.tankBuilder.scraperMesh.position.z += 0.04;
    this.tankBuilder.eraseAlgaeAtUv(hit.uv);
    if (this.state.scrubAlgae(0.012)) {
      this.showActionBanner("清洁 CLEAN UP", 900);
      if (Math.random() < 0.25) this.sfx.playScrub();
      this.refreshHud();
    }
  }

  // ==========================================================================
  // MAIN ANIMATION LOOP
  // ==========================================================================
  animate(now) {
    requestAnimationFrame(this.animate);
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    const elapsed = now * 0.001;

    const tank = this.state.activeTank;

    // Water change siphon drain & refill animation (Matches frame_28!)
    if (this.waterChangePhase === "draining") {
      tank.waterLevel = Math.max(0.48, (tank.waterLevel || 1.0) - dt * 0.45);
      if (tank.waterLevel <= 0.485) {
        this.waterChangePhase = "refilling";
      }
    } else if (this.waterChangePhase === "refilling") {
      tank.waterLevel = Math.min(1.0, (tank.waterLevel || 0.48) + dt * 0.5);
      if (tank.waterLevel >= 0.999) {
        tank.waterLevel = 1.0;
        tank.algaeLevel = Math.max(0, tank.algaeLevel * 0.35);
        this.tankBuilder.redrawAlgaeCanvas(tank.algaeLevel);
        this.waterChangePhase = "idle";
        this.sfx.playCoinChime();
        this.refreshHud();
      }
    }

    // Ecosystem passive tick
    this.state.tick(dt);

    if (this.mode === "stream") {
      this.foragingScene.update(elapsed, dt);
    } else {
      if (this.roomGroup.userData.update) {
        this.roomGroup.userData.update(elapsed);
      }
      this.tankBuilder.update(elapsed, dt, tank);
      this.boids.update(elapsed, dt, tank, this.tankBuilder.pellets, () => {
        this.sfx.playPop(940, 0.04);
      });
      this.controls.update();
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  window.__FISH_TANKFULLY__ = new FishTankfullyApp();
});
