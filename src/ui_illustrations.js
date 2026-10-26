// Fish Tankfully (缸好有鱼) — Comic/Cel-Shaded SVG Illustrations for Fish, Gear & Characters
import { getFishSpecies, getCatalogItem } from "./catalog.js";

export function renderFishSvg(speciesId, opts = {}) {
  const sp = getFishSpecies(speciesId);
  const c = opts.isShiny && sp.shinyColors ? sp.shinyColors : sp.colors;
  const uid = `${sp.id}_${opts.isShiny ? "s" : "n"}`;

  if (sp.shape === "shrimp") {
    return `
      <svg viewBox="0 0 120 80" class="species-svg">
        <g stroke="#1a2421" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M 35 45 Q 58 26 84 42 Q 92 50 86 58 Q 70 48 42 54 Z" fill="${c.body}" />
          <path d="M 52 36 L 56 50 M 66 37 L 68 51 M 78 41 L 78 53" stroke="${c.stripe}" stroke-width="4" />
          <path d="M 35 45 L 14 32 M 35 47 L 12 48" stroke="${c.fin}" stroke-width="2" fill="none" />
          <polygon points="86,54 102,48 98,64" fill="${c.tail}" />
          <circle cx="38" cy="43" r="3.2" fill="#111" stroke="none" />
        </g>
      </svg>`;
  }

  if (sp.shape === "angelfish") {
    return `
      <svg viewBox="0 0 120 90" class="species-svg">
        <g stroke="#1a2421" stroke-width="3" stroke-linejoin="round">
          <polygon points="52,22 76,6 68,36" fill="${c.fin}" />
          <polygon points="54,64 78,86 68,54" fill="${c.fin}" />
          <polygon points="78,44 104,32 98,44 104,56" fill="${c.tail}" />
          <polygon points="24,44 55,22 82,44 55,66" fill="${c.body}" />
          <path d="M 44 30 L 44 58 M 58 25 L 58 63 M 70 33 L 70 55" stroke="${c.stripe}" stroke-width="4.5" />
          <circle cx="36" cy="42" r="4" fill="#fff" />
          <circle cx="35" cy="42" r="2" fill="#111" stroke="none" />
        </g>
      </svg>`;
  }

  if (sp.shape === "guppy") {
    return `
      <svg viewBox="0 0 120 80" class="species-svg">
        <g stroke="#1a2421" stroke-width="3" stroke-linejoin="round">
          <path d="M 68 40 L 106 20 Q 112 40 106 60 Z" fill="${c.tail}" />
          <path d="M 48 31 L 68 20 L 66 35 Z" fill="${c.fin}" />
          <path d="M 18 42 Q 42 26 74 38 Q 74 46 42 52 Q 24 50 18 42 Z" fill="${c.body}" />
          <path d="M 26 41 L 70 39" stroke="${c.stripe}" stroke-width="4" />
          <circle cx="28" cy="39" r="3.5" fill="#fff" />
          <circle cx="27" cy="39" r="1.8" fill="#111" stroke="none" />
        </g>
      </svg>`;
  }

  // Tetra, Barb, Minnow, Cory, Goby
  const isStriped = sp.shape === "barb" || sp.id === "pale_chub";
  return `
    <svg viewBox="0 0 120 80" class="species-svg">
      <defs>
        <linearGradient id="grad_${uid}" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${c.body}" />
          <stop offset="65%" stop-color="${c.stripe}" />
          <stop offset="100%" stop-color="${c.tail}" />
        </linearGradient>
      </defs>
      <g stroke="#1a2421" stroke-width="3" stroke-linejoin="round">
        <polygon points="80,40 105,25 97,40 105,55" fill="${c.tail}" />
        <polygon points="46,28 62,15 64,29" fill="${c.fin}" />
        <polygon points="48,51 58,62 64,50" fill="${c.fin}" />
        <path d="M 16 40 Q 45 20 84 36 L 84 44 Q 45 60 16 40 Z" fill="url(#grad_${uid})" />
        ${
          isStriped
            ? `<path d="M 38 29 L 38 51 M 52 27 L 52 53 M 66 30 L 66 50" stroke="${c.stripe}" stroke-width="4.5" />`
            : `<path d="M 24 38 L 76 37" stroke="${c.stripe}" stroke-width="4.5" stroke-linecap="round" />
               <path d="M 52 43 L 82 41" stroke="${c.tail}" stroke-width="4.5" stroke-linecap="round" />`
        }
        <circle cx="28" cy="38" r="4.2" fill="#fff" />
        <circle cx="27" cy="38" r="2.1" fill="#111" stroke="none" />
      </g>
    </svg>`;
}

export function renderItemSvg(itemId) {
  const item = getCatalogItem(itemId);
  switch (item.id) {
    case "algae_scraper":
      return `
        <svg viewBox="0 0 100 100" class="item-svg">
          <g stroke="#1b262c" stroke-width="3" stroke-linejoin="round">
            <polygon points="22,60 58,28 84,48 48,80" fill="#cbd5e1" />
            <polygon points="18,54 54,22 80,42 44,74" fill="#60a5fa" />
            <polygon points="32,48 52,30 66,41 46,59" fill="#2563eb" />
            <line x1="40" y1="47" x2="54" y2="35" stroke="#f97316" stroke-width="4" stroke-linecap="round"/>
          </g>
        </svg>`;
    case "sinking_pellets":
      return `
        <svg viewBox="0 0 100 100" class="item-svg">
          <g stroke="#1b262c" stroke-width="3" stroke-linejoin="round">
            <rect x="28" y="26" width="44" height="54" rx="8" fill="#f59e0b" />
            <rect x="28" y="40" width="44" height="24" fill="#fef3c7" />
            <rect x="25" y="18" width="50" height="12" rx="4" fill="#dc2626" />
            <circle cx="50" cy="52" r="7" fill="#ea580c" />
          </g>
        </svg>`;
    case "golden_food":
      return `
        <svg viewBox="0 0 100 100" class="item-svg">
          <g stroke="#1b262c" stroke-width="3" stroke-linejoin="round">
            <polygon points="26,20 74,20 80,82 20,82" fill="#1f2937" />
            <polygon points="30,28 70,28 73,68 27,68" fill="#d97706" />
            <circle cx="50" cy="50" r="12" fill="#fde047" />
            <path d="M 42 50 L 58 50 M 50 42 L 50 58" stroke="#b45309" stroke-width="3" />
          </g>
        </svg>`;
    case "methylene_blue":
      return `
        <svg viewBox="0 0 100 100" class="item-svg">
          <g stroke="#1b262c" stroke-width="3" stroke-linejoin="round">
            <rect x="33" y="32" width="34" height="50" rx="6" fill="#3b82f6" />
            <rect x="33" y="46" width="34" height="24" fill="#dbeafe" />
            <rect x="38" y="18" width="24" height="14" rx="3" fill="#1d4ed8" />
            <path d="M 50 51 C 55 58 55 64 50 64 C 45 64 45 58 50 51 Z" fill="#0284c7" stroke="none" />
          </g>
        </svg>`;
    case "light_studio_led":
      return `
        <svg viewBox="0 0 100 100" class="item-svg">
          <g stroke="#1b262c" stroke-width="3" stroke-linejoin="round">
            <polygon points="16,42 62,22 74,32 28,52" fill="#94a3b8" />
            <polyline points="66,28 74,58 58,76" fill="none" stroke="#475569" stroke-width="6" />
            <rect x="50" y="68" width="22" height="14" rx="2" fill="#64748b" />
          </g>
        </svg>`;
    case "pump_wavemaker":
      return `
        <svg viewBox="0 0 100 100" class="item-svg">
          <g stroke="#1b262c" stroke-width="3" stroke-linejoin="round">
            <ellipse cx="46" cy="52" rx="22" ry="18" fill="#475569" />
            <circle cx="36" cy="52" r="10" fill="#1e293b" />
            <rect x="64" y="44" width="16" height="16" rx="4" fill="#334155" />
          </g>
        </svg>`;
    case "filter_sponge":
    case "filter_canister":
      return `
        <svg viewBox="0 0 100 100" class="item-svg">
          <g stroke="#1b262c" stroke-width="3" stroke-linejoin="round">
            <rect x="34" y="30" width="32" height="52" rx="5" fill="#475569" />
            <rect x="32" y="24" width="36" height="12" rx="3" fill="#2563eb" />
            <path d="M 42 24 L 42 14 L 62 14" fill="none" stroke="#64748b" stroke-width="5" />
          </g>
        </svg>`;
    case "ornament_mecha_head":
      return `
        <svg viewBox="0 0 100 100" class="item-svg">
          <g stroke="#1b262c" stroke-width="3" stroke-linejoin="round">
            <polygon points="28,46 50,26 72,46 66,76 34,76" fill="#e2e8f0" />
            <polygon points="50,44 14,18 24,42" fill="#facc15" />
            <polygon points="50,44 86,18 76,42" fill="#facc15" />
            <rect x="35" y="50" width="11" height="6" fill="#00f0ff" stroke="none" />
            <rect x="54" y="50" width="11" height="6" fill="#00f0ff" stroke="none" />
            <circle cx="36" cy="36" r="8" fill="#4ade80" stroke="none" opacity="0.85" />
          </g>
        </svg>`;
    default:
      if (item.category === "plants") {
        const leafColor = item.id.includes("red") ? "#ef4444" : "#22c55e";
        return `
          <svg viewBox="0 0 100 100" class="item-svg">
            <g stroke="#1b262c" stroke-width="3" stroke-linejoin="round">
              <path d="M 50 82 Q 32 54 26 26 Q 44 42 50 82 Z" fill="${leafColor}" />
              <path d="M 50 82 Q 68 54 74 26 Q 56 42 50 82 Z" fill="${leafColor}" />
              <path d="M 50 84 Q 50 45 50 18 Q 62 45 50 84 Z" fill="#4ade80" />
            </g>
          </svg>`;
      }
      if (item.category === "driftwood") {
        return `
          <svg viewBox="0 0 100 100" class="item-svg">
            <g stroke="#1b262c" stroke-width="3" stroke-linejoin="round">
              <path d="M 22 76 Q 46 52 54 22 L 66 26 Q 58 54 78 76 L 62 78 Q 52 60 46 60 Q 38 64 32 78 Z" fill="#9a5229" />
            </g>
          </svg>`;
      }
      return `
        <svg viewBox="0 0 100 100" class="item-svg">
          <g stroke="#1b262c" stroke-width="3" stroke-linejoin="round">
            <polygon points="20,76 36,28 58,22 80,52 74,76" fill="#64748b" />
            <polygon points="36,28 58,22 52,54 28,58" fill="#94a3b8" />
          </g>
        </svg>`;
  }
}

export function renderShopkeeperSvg() {
  // Cheerful Aquarium Shopkeeper Coco in denim apron & orange headband waving (matches ref_2!)
  return `
    <svg viewBox="0 0 320 460" class="shopkeeper-svg">
      <g stroke="#18181b" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
        <!-- Fluffy curly dark-brown afro hair -->
        <circle cx="155" cy="115" r="68" fill="#4a332a" />
        <circle cx="105" cy="105" r="44" fill="#4a332a" />
        <circle cx="205" cy="105" r="44" fill="#4a332a" />
        <circle cx="155" cy="70" r="48" fill="#4a332a" />
        <!-- Orange bandana headband -->
        <path d="M 105 118 Q 155 82 206 118 Q 198 134 155 112 Q 112 134 105 118 Z" fill="#f97316" />
        <path d="M 122 104 Q 155 88 188 104" stroke="#fed7aa" stroke-width="3" fill="none" />
        <!-- Warm brown face & cheerful smile -->
        <path d="M 116 125 Q 116 196 155 202 Q 194 196 194 125 Z" fill="#c6865c" />
        <!-- Eyes -->
        <ellipse cx="136" cy="152" rx="7" ry="10" fill="#271811" />
        <circle cx="134" cy="148" r="2.5" fill="#fff" stroke="none" />
        <ellipse cx="174" cy="152" rx="7" ry="10" fill="#271811" />
        <circle cx="172" cy="148" r="2.5" fill="#fff" stroke="none" />
        <!-- Happy open smile -->
        <path d="M 143 172 Q 155 186 167 172 Z" fill="#f87171" />
        <!-- Cream rolled-sleeve shirt -->
        <path d="M 88 232 Q 155 212 222 232 L 248 310 L 212 320 L 198 272 L 112 272 L 98 320 L 62 310 Z" fill="#f5f5f4" />
        <!-- Waving Left Arm (viewer's right) -->
        <path d="M 225 248 L 265 182 L 284 192 L 244 275 Z" fill="#c6865c" />
        <!-- Hand on hip (viewer's left) -->
        <path d="M 76 295 L 112 332 L 104 348 L 62 312 Z" fill="#c6865c" />
        <!-- Blue Denim Apron with Pocket -->
        <path d="M 118 228 L 132 292 L 178 292 L 192 228" fill="#3b82f6" />
        <path d="M 102 290 L 208 290 L 222 448 L 88 448 Z" fill="#4f83cc" />
        <rect x="116" y="345" width="44" height="52" rx="8" fill="#60a5fa" />
        <path d="M 116 355 L 160 348" stroke="#f97316" stroke-width="5" />
      </g>
    </svg>`;
}
