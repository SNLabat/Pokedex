import { useState, useEffect, useMemo, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════
//  CONSTANTS & THEME
// ═══════════════════════════════════════════════════════════

const TYPE_COLORS = {
  normal: "#A8A77A", fire: "#EE8130", water: "#6390F0", electric: "#F7D02C",
  grass: "#7AC74C", ice: "#96D9D6", fighting: "#C22E28", poison: "#A33EA1",
  ground: "#E2BF65", flying: "#A98FF3", psychic: "#F95587", bug: "#A6B91A",
  rock: "#B6A136", ghost: "#735797", dragon: "#6F35FC", dark: "#705746",
  steel: "#B7B7CE", fairy: "#D685AD",
};

const STAT_COLORS = {
  hp: "#FF5959", attack: "#F5AC78", defense: "#FAE078",
  "special-attack": "#9DB7F5", "special-defense": "#A7DB8D", speed: "#FA92B2",
};

const STAT_LABELS = {
  hp: "HP", attack: "ATK", defense: "DEF",
  "special-attack": "SP.ATK", "special-defense": "SP.DEF", speed: "SPD",
};

const VERSION_COLORS = {
  red: "#FF1111", blue: "#1111FF", yellow: "#FFD733", gold: "#DAA520",
  silver: "#C0C0C0", crystal: "#4FD9FF", ruby: "#A00000", sapphire: "#0000A0",
  emerald: "#00A000", firered: "#FF7327", leafgreen: "#00DD00", diamond: "#AAAAFF",
  pearl: "#FFAAAA", platinum: "#999999", heartgold: "#B69E00", soulsilver: "#C0C0E1",
  black: "#444444", white: "#E1E1E1", "black-2": "#424B50", "white-2": "#E3CED0",
  x: "#025DA6", y: "#EA1A3E", "omega-ruby": "#CF3025", "alpha-sapphire": "#26649C",
  sun: "#F1912B", moon: "#5599CA", "ultra-sun": "#E95B2B", "ultra-moon": "#226DB5",
  sword: "#00A1E9", shield: "#BF004F", "brilliant-diamond": "#44A2F6",
  "shining-pearl": "#DA7D99", "legends-arceus": "#336DB5", scarlet: "#F34D36",
  violet: "#7A26B0", "lets-go-pikachu": "#F5DA26", "lets-go-eevee": "#C88D32",
};

// Origin marks — the icon a Pokemon receives based on which game it was caught in.
// Pokemon from Gen III–V games have no origin mark. Gen I–II only get the Game Boy
// mark when transferred from Virtual Console releases via Pokemon Bank.
const ORIGIN_MARKS = [
  { id: "gameboy",  symbol: "\u{1F3AE}", name: "Game Boy",   color: "#8bac0f", games: "RBY / GSC (Virtual Console)", versions: ["red","blue","yellow","gold","silver","crystal"] },
  { id: "go",       symbol: "G",          name: "GO",         color: "#1a73e8", games: "Pokemon GO",                 versions: [] },
  { id: "letsgo",   symbol: "\u2B50",     name: "Let's Go",   color: "#f5da26", games: "Let's Go Pikachu / Eevee",   versions: ["lets-go-pikachu","lets-go-eevee"] },
  { id: "pentagon", symbol: "\u2B53",     name: "Kalos",      color: "#025DA6", games: "X / Y, Omega Ruby / Alpha Sapphire", versions: ["x","y","omega-ruby","alpha-sapphire"] },
  { id: "clover",   symbol: "\u2663",     name: "Alola",      color: "#f59c1a", games: "Sun / Moon, Ultra Sun / Ultra Moon",  versions: ["sun","moon","ultra-sun","ultra-moon"] },
  { id: "galar",    symbol: "\u{1F310}",  name: "Galar",      color: "#00A1E9", games: "Sword / Shield",             versions: ["sword","shield"] },
  { id: "sinnoh",   symbol: "\u25C6",     name: "Sinnoh",     color: "#AAAAFF", games: "Brilliant Diamond / Shining Pearl", versions: ["brilliant-diamond","shining-pearl"] },
  { id: "hisui",    symbol: "\u2B21",     name: "Hisui",      color: "#336DB5", games: "Legends: Arceus",            versions: ["legends-arceus"] },
  { id: "paldea",   symbol: "\u2726",     name: "Paldea",     color: "#F34D36", games: "Scarlet / Violet",           versions: ["scarlet","violet"] },
  { id: "lumiose",  symbol: "\u25B2",     name: "Lumiose",    color: "#7A26B0", games: "Legends: Z-A",               versions: ["legends-z-a"] },
];

// Maps PokeAPI generation names to native origin marks
const GEN_TO_MARKS = {
  "generation-i":   ["gameboy"],
  "generation-ii":  ["gameboy"],
  "generation-iii": [],           // No origin mark for Gen III–V
  "generation-iv":  [],
  "generation-v":   [],
  "generation-vi":  ["pentagon"],
  "generation-vii": ["clover"],
  "generation-viii": ["galar", "sinnoh", "hisui"],
  "generation-ix":  ["paldea", "lumiose"],
};

function getOriginMarks(species, encounters) {
  const markIds = new Set();
  // Native marks from the Pokemon's generation
  const genName = species?.generation?.name;
  if (genName && GEN_TO_MARKS[genName]) {
    GEN_TO_MARKS[genName].forEach(m => markIds.add(m));
  }
  // Marks derived from encounter data (which game versions it appears in)
  if (encounters?.length) {
    encounters.forEach(enc => {
      enc.version_details?.forEach(vd => {
        const ver = vd.version.name;
        ORIGIN_MARKS.forEach(mark => {
          if (mark.versions.includes(ver)) markIds.add(mark.id);
        });
      });
    });
  }
  // Pokemon GO mark — most Pokemon up to Gen VIII are in GO
  const pokemonId = species?.id;
  if (pokemonId && pokemonId <= 905) markIds.add("go");
  return ORIGIN_MARKS.filter(m => markIds.has(m.id));
}

const GENERATIONS = [
  { label: "I", name: "Kanto", start: 1, end: 151 },
  { label: "II", name: "Johto", start: 152, end: 251 },
  { label: "III", name: "Hoenn", start: 252, end: 386 },
  { label: "IV", name: "Sinnoh", start: 387, end: 493 },
  { label: "V", name: "Unova", start: 494, end: 649 },
  { label: "VI", name: "Kalos", start: 650, end: 721 },
  { label: "VII", name: "Alola", start: 722, end: 809 },
  { label: "VIII", name: "Galar", start: 810, end: 905 },
  { label: "IX", name: "Paldea", start: 906, end: 1025 },
];

const API = "https://pokeapi.co/api/v2";
const HOME = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home";

const spriteUrl = (id, shiny) => `${HOME}${shiny ? "/shiny" : ""}/${id}.png`;
const fmtId = (id) => `#${String(id).padStart(3, "0")}`;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const fmtName = (n) => n.split("-").map(cap).join(" ");

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// ═══════════════════════════════════════════════════════════
//  LOCAL STORAGE HELPERS
// ═══════════════════════════════════════════════════════════

const STORAGE_KEY = "pokedex-tracker-caught";
const GEN_KEY = "pokedex-tracker-gen";

function loadCaught() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch { return {}; }
}

function saveCaught(caught) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(caught)); } catch {}
}

function loadGen() {
  try {
    const g = localStorage.getItem(GEN_KEY);
    const parsed = g !== null ? parseInt(g, 10) : 0;
    return parsed >= 0 && parsed < GENERATIONS.length ? parsed : 0;
  } catch { return 0; }
}

function saveGen(gen) {
  try { localStorage.setItem(GEN_KEY, String(gen)); } catch {}
}

// ═══════════════════════════════════════════════════════════
//  SMALL COMPONENTS
// ═══════════════════════════════════════════════════════════

const PokeballIcon = ({ caught, size = 22, onClick }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" onClick={onClick}
    style={{ cursor: "pointer", filter: caught ? "drop-shadow(0 0 6px rgba(255,215,0,.7))" : "none", transition: "all .3s ease" }}>
    <circle cx="50" cy="50" r="48" fill={caught ? "#ff4444" : "transparent"} stroke={caught ? "#333" : "rgba(255,255,255,.25)"} strokeWidth="4"/>
    <rect x="2" y="47" width="96" height="6" fill={caught ? "#333" : "rgba(255,255,255,.25)"}/>
    <circle cx="50" cy="50" r="15" fill={caught ? "#fff" : "transparent"} stroke={caught ? "#333" : "rgba(255,255,255,.25)"} strokeWidth="4"/>
    <circle cx="50" cy="50" r="8" fill={caught ? "#fff" : "transparent"} stroke={caught ? "#333" : "rgba(255,255,255,.25)"} strokeWidth="3"/>
    {!caught && <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="2"/>}
  </svg>
);

const TypeBadge = ({ type, small }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: small ? "2px 8px" : "3px 12px",
    borderRadius: 20, fontSize: small ? 10 : 11, fontWeight: 700, letterSpacing: .5,
    color: "#fff", textTransform: "uppercase",
    background: `linear-gradient(135deg, ${TYPE_COLORS[type] || "#888"}, ${TYPE_COLORS[type] || "#888"}cc)`,
    boxShadow: `0 2px 8px ${TYPE_COLORS[type] || "#888"}44`,
    textShadow: "0 1px 2px rgba(0,0,0,.3)",
  }}>
    {type}
  </span>
);

const StatBar = ({ name, value, delay = 0, animate }) => {
  const pct = Math.min((value / 255) * 100, 100);
  const color = STAT_COLORS[name] || "#888";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <span style={{ width: 52, fontSize: 11, fontWeight: 700, color, textAlign: "right", letterSpacing: .5 }}>
        {STAT_LABELS[name] || name}
      </span>
      <span style={{ width: 32, fontSize: 13, fontWeight: 600, color: "#fff", textAlign: "right" }}>{value}</span>
      <div style={{ flex: 1, height: 8, borderRadius: 4, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 4, width: animate ? `${pct}%` : "0%",
          background: `linear-gradient(90deg, ${color}, ${color}dd)`,
          boxShadow: `0 0 10px ${color}66`,
          transition: `width 1s cubic-bezier(.4,0,.2,1) ${delay}ms`,
        }}/>
      </div>
    </div>
  );
};

const Skeleton = ({ count = 12 }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16, padding: "0 20px 20px" }}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} style={{
        height: 220, borderRadius: 16,
        background: "linear-gradient(90deg, rgba(255,255,255,.03) 25%, rgba(255,255,255,.06) 50%, rgba(255,255,255,.03) 75%)",
        backgroundSize: "200% 100%", animation: "shimmer 1.5s ease-in-out infinite",
      }}/>
    ))}
  </div>
);

// ═══════════════════════════════════════════════════════════
//  POKEMON CARD
// ═══════════════════════════════════════════════════════════

const PokemonCard = ({ data, caught, showShiny, onClick, onToggleCaught }) => {
  const [hover, setHover] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgKey, setImgKey] = useState(0);
  const primaryType = data.types?.[0]?.type?.name || "normal";
  const typeColor = TYPE_COLORS[primaryType] || "#888";

  useEffect(() => { setImgLoaded(false); setImgKey(k => k + 1); }, [showShiny, data.id]);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative", borderRadius: 18, padding: 16, cursor: "pointer",
        background: hover
          ? `linear-gradient(145deg, rgba(${hexToRgb(typeColor)},.15), rgba(255,255,255,.05))`
          : `linear-gradient(145deg, rgba(${hexToRgb(typeColor)},.06), rgba(255,255,255,.02))`,
        border: `1px solid ${hover ? typeColor + "55" : "rgba(255,255,255,.06)"}`,
        boxShadow: caught
          ? "0 0 20px rgba(255,215,0,.15), 0 4px 20px rgba(0,0,0,.3)"
          : hover ? `0 8px 30px rgba(0,0,0,.4), 0 0 20px ${typeColor}22` : "0 4px 15px rgba(0,0,0,.2)",
        transition: "all .3s cubic-bezier(.4,0,.2,1)",
        transform: hover ? "translateY(-4px)" : "translateY(0)",
        animation: "slideUp .4s ease forwards",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        overflow: "hidden",
      }}
    >
      {caught && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: "linear-gradient(90deg, #ffd700, #ffaa00, #ffd700)",
          animation: "glow 2s ease infinite",
        }}/>
      )}
      <div style={{ position: "absolute", top: 8, left: 10, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.3)" }}>
        {fmtId(data.id)}
      </div>
      <div style={{ position: "absolute", top: 6, right: 6, zIndex: 2 }}
        onClick={(e) => { e.stopPropagation(); onToggleCaught(); }}>
        <PokeballIcon caught={caught} size={24}/>
      </div>

      <div style={{ width: 100, height: 100, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 8 }}>
        {!imgLoaded && (
          <div style={{ width: 60, height: 60, borderRadius: "50%",
            background: "linear-gradient(90deg, rgba(255,255,255,.03) 25%, rgba(255,255,255,.08) 50%, rgba(255,255,255,.03) 75%)",
            backgroundSize: "200% 100%", animation: "shimmer 1s ease infinite" }}/>
        )}
        <img
          key={imgKey}
          src={spriteUrl(data.id, showShiny)}
          alt={data.name}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          onError={(e) => { e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${data.id}.png`; }}
          style={{
            width: 96, height: 96, objectFit: "contain",
            display: imgLoaded ? "block" : "none",
            filter: hover ? `drop-shadow(0 4px 12px ${typeColor}66)` : "drop-shadow(0 2px 6px rgba(0,0,0,.3))",
            transition: "filter .3s ease, transform .3s ease",
            transform: hover ? "scale(1.08)" : "scale(1)",
            animation: imgLoaded ? "spriteSwap .4s ease" : "none",
          }}
        />
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", textTransform: "capitalize", marginTop: 2, textAlign: "center" }}>
        {fmtName(data.name)}
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center" }}>
        {data.types?.map(t => <TypeBadge key={t.type.name} type={t.type.name} small/>)}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  DETAIL MODAL
// ═══════════════════════════════════════════════════════════

const DetailModal = ({ pokemon, species, encounters, loading, onClose, caught, onToggleCaught, showShiny }) => {
  const [activeTab, setActiveTab] = useState("stats");
  const [animateStats, setAnimateStats] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimateStats(true), 200);
    document.body.style.overflow = "hidden";
    return () => { clearTimeout(t); document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!pokemon) return null;

  const primaryType = pokemon.types?.[0]?.type?.name || "normal";
  const typeColor = TYPE_COLORS[primaryType];
  const totalStats = pokemon.stats?.reduce((sum, s) => sum + s.base_stat, 0) || 0;

  const flavorText = species?.flavor_text_entries
    ?.filter(e => e.language.name === "en")
    ?.slice(-1)[0]?.flavor_text?.replace(/[\n\f\r]/g, " ") || "No description available.";

  const genus = species?.genera?.find(g => g.language.name === "en")?.genus || "";

  const groupedEncounters = useMemo(() => {
    if (!encounters?.length) return {};
    const grouped = {};
    encounters.forEach(enc => {
      const loc = fmtName(enc.location_area.name.replace(/-area$/, "").replace(/-/g, " "));
      enc.version_details.forEach(vd => {
        const ver = vd.version.name;
        if (!grouped[ver]) grouped[ver] = [];
        const methods = vd.encounter_details.map(ed =>
          `${fmtName(ed.method.name)} (Lv.${ed.min_level}${ed.max_level !== ed.min_level ? `-${ed.max_level}` : ""}, ${ed.chance}%)`
        );
        grouped[ver].push({ location: loc, methods });
      });
    });
    return grouped;
  }, [encounters]);

  const tabs = [
    { id: "stats", label: "Stats" },
    { id: "about", label: "About" },
    { id: "locations", label: "Locations" },
  ];

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,.7)", backdropFilter: "blur(12px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, animation: "fadeIn .2s ease",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto",
        borderRadius: 24, animation: "modalIn .35s cubic-bezier(.4,0,.2,1)",
        background: `linear-gradient(170deg, rgba(${hexToRgb(typeColor)},.15) 0%, rgba(15,15,30,.97) 40%)`,
        border: `1px solid ${typeColor}33`,
        boxShadow: `0 20px 60px rgba(0,0,0,.5), 0 0 40px ${typeColor}15`,
      }}>
        {/* Header */}
        <div style={{ padding: "24px 24px 0", position: "relative" }}>
          <button onClick={onClose} style={{
            position: "absolute", top: 16, right: 16, width: 36, height: 36, borderRadius: "50%",
            background: "rgba(255,255,255,.1)", border: "none", color: "#fff", fontSize: 18,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background .2s",
          }}>&#10005;</button>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ position: "relative" }}>
              <div style={{
                width: 130, height: 130, borderRadius: "50%",
                background: `radial-gradient(circle, ${typeColor}22 0%, transparent 70%)`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <img src={spriteUrl(pokemon.id, showShiny)} alt={pokemon.name}
                  onError={(e) => { e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`; }}
                  style={{ width: 120, height: 120, objectFit: "contain", animation: "spriteSwap .4s ease, float 3s ease infinite",
                    filter: `drop-shadow(0 4px 15px ${typeColor}55)` }}/>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.4)", marginBottom: 2 }}>{fmtId(pokemon.id)}</div>
              <h2 style={{ fontSize: 26, fontWeight: 800, color: "#fff", textTransform: "capitalize", margin: 0 }}>
                {fmtName(pokemon.name)}
              </h2>
              {genus && <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginTop: 2 }}>{genus}</div>}
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                {pokemon.types?.map(t => <TypeBadge key={t.type.name} type={t.type.name}/>)}
                <div style={{ marginLeft: 8 }} onClick={(e) => { e.stopPropagation(); onToggleCaught(); }}>
                  <PokeballIcon caught={caught} size={28}/>
                </div>
              </div>
              {species?.is_legendary && (
                <span style={{ display: "inline-block", marginTop: 6, padding: "2px 10px", borderRadius: 10, fontSize: 10,
                  fontWeight: 700, background: "linear-gradient(135deg, #ffd700, #ff8c00)", color: "#333", letterSpacing: .5 }}>
                  LEGENDARY
                </span>
              )}
              {species?.is_mythical && (
                <span style={{ display: "inline-block", marginTop: 6, padding: "2px 10px", borderRadius: 10, fontSize: 10,
                  fontWeight: 700, background: "linear-gradient(135deg, #e040fb, #7c4dff)", color: "#fff", letterSpacing: .5 }}>
                  MYTHICAL
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, padding: "16px 24px 0", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: "8px 18px", border: "none", borderRadius: "10px 10px 0 0", cursor: "pointer",
              fontSize: 13, fontWeight: 600, transition: "all .2s",
              background: activeTab === tab.id ? `${typeColor}22` : "transparent",
              color: activeTab === tab.id ? "#fff" : "rgba(255,255,255,.4)",
              borderBottom: activeTab === tab.id ? `2px solid ${typeColor}` : "2px solid transparent",
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ padding: 24, minHeight: 200 }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
              <div style={{ width: 40, height: 40, border: "3px solid rgba(255,255,255,.1)", borderTopColor: typeColor,
                borderRadius: "50%", animation: "spin .8s linear infinite" }}/>
            </div>
          ) : activeTab === "stats" ? (
            <div>
              {pokemon.stats?.map((s, i) => (
                <StatBar key={s.stat.name} name={s.stat.name} value={s.base_stat} delay={i * 100} animate={animateStats}/>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16,
                padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,.04)" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.5)", letterSpacing: 1 }}>TOTAL</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{totalStats}</span>
              </div>
            </div>
          ) : activeTab === "about" ? (
            <div>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,.75)", marginBottom: 20, fontStyle: "italic" }}>
                &ldquo;{flavorText}&rdquo;
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Height", value: `${(pokemon.height / 10).toFixed(1)} m` },
                  { label: "Weight", value: `${(pokemon.weight / 10).toFixed(1)} kg` },
                  { label: "Base Exp", value: pokemon.base_experience || "\u2014" },
                  { label: "Habitat", value: species?.habitat ? cap(species.habitat.name) : "Unknown" },
                  { label: "Shape", value: species?.shape ? cap(species.shape.name) : "Unknown" },
                  { label: "Growth Rate", value: species?.growth_rate ? fmtName(species.growth_rate.name) : "Unknown" },
                  { label: "Capture Rate", value: species?.capture_rate || "\u2014" },
                  { label: "Base Happiness", value: species?.base_happiness ?? "\u2014" },
                ].map(item => (
                  <div key={item.label} style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,.04)" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.4)", letterSpacing: .5, marginBottom: 4, textTransform: "uppercase" }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{item.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.4)", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>
                  Abilities
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {pokemon.abilities?.map(a => (
                    <span key={a.ability.name} style={{
                      padding: "6px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                      background: a.is_hidden ? "linear-gradient(135deg, rgba(156,39,176,.2), rgba(103,58,183,.2))" : "rgba(255,255,255,.06)",
                      border: a.is_hidden ? "1px solid rgba(156,39,176,.3)" : "1px solid rgba(255,255,255,.08)",
                      color: a.is_hidden ? "#ce93d8" : "rgba(255,255,255,.8)",
                    }}>
                      {fmtName(a.ability.name)} {a.is_hidden && <span style={{ fontSize: 9, opacity: .6 }}>(Hidden)</span>}
                    </span>
                  ))}
                </div>
              </div>
              {species?.egg_groups && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.4)", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>
                    Egg Groups
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {species.egg_groups.map(eg => (
                      <span key={eg.name} style={{
                        padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                        background: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.7)",
                      }}>
                        {fmtName(eg.name)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* Origin Marks */}
              {species && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.4)", letterSpacing: 1, textTransform: "uppercase" }}>
                      Origin Marks
                    </div>
                    <div style={{
                      position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: 16, height: 16, borderRadius: "50%", background: "rgba(255,255,255,.08)",
                      fontSize: 10, color: "rgba(255,255,255,.4)", cursor: "help",
                    }} title="Origin marks are icons shown on a Pokemon's summary screen indicating which game it was caught in. A Pokemon can only have one origin mark, determined by its game of origin.">
                      ?
                    </div>
                  </div>
                  {(() => {
                    const marks = getOriginMarks(species, encounters);
                    if (marks.length === 0) {
                      return (
                        <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,.03)",
                          fontSize: 12, color: "rgba(255,255,255,.4)", fontStyle: "italic" }}>
                          No origin mark &mdash; Pokemon from Gen III&ndash;V games do not receive an origin mark.
                        </div>
                      );
                    }
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {marks.map(mark => (
                          <div key={mark.id} style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "8px 12px", borderRadius: 10,
                            background: `linear-gradient(135deg, ${mark.color}12, rgba(255,255,255,.02))`,
                            border: `1px solid ${mark.color}22`,
                          }}>
                            <div style={{
                              width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                              background: `${mark.color}22`, fontSize: 16, flexShrink: 0,
                            }}>
                              {mark.symbol}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: mark.color }}>{mark.name} Mark</div>
                              <div style={{ fontSize: 10, color: "rgba(255,255,255,.45)", marginTop: 1 }}>{mark.games}</div>
                            </div>
                          </div>
                        ))}
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", marginTop: 4, lineHeight: 1.5, fontStyle: "italic" }}>
                          A Pokemon can only carry one origin mark, set by the game it was caught or hatched in. Marks cannot be changed.
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : (
            <div>
              {Object.keys(groupedEncounters).length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>&#128274;</div>
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,.5)", lineHeight: 1.6 }}>
                    This Pokemon cannot be caught in the wild.<br/>
                    <span style={{ fontSize: 12, opacity: .7 }}>It may be obtained through events, trades, or evolution.</span>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {Object.entries(groupedEncounters).map(([version, locations]) => (
                    <div key={version} style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,.06)" }}>
                      <div style={{
                        padding: "8px 14px", fontWeight: 700, fontSize: 12, letterSpacing: .5,
                        textTransform: "capitalize",
                        background: `linear-gradient(90deg, ${VERSION_COLORS[version] || "#555"}33, transparent)`,
                        color: VERSION_COLORS[version] || "#aaa",
                        borderBottom: "1px solid rgba(255,255,255,.04)",
                      }}>
                        Pokemon {fmtName(version)}
                      </div>
                      {locations.map((loc, i) => (
                        <div key={i} style={{ padding: "10px 14px", borderBottom: i < locations.length - 1 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 4, textTransform: "capitalize" }}>
                            {loc.location}
                          </div>
                          {loc.methods.map((m, j) => (
                            <div key={j} style={{ fontSize: 11, color: "rgba(255,255,255,.5)", paddingLeft: 10, marginTop: 2 }}>
                              &bull; {m}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════════════════

export default function App() {
  const [pokemon, setPokemon] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGen, setSelectedGen] = useState(loadGen);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [caughtFilter, setCaughtFilter] = useState("all");
  const [showShiny, setShowShiny] = useState(false);
  const [caught, setCaught] = useState(loadCaught);
  const [modalPokemon, setModalPokemon] = useState(null);
  const [modalSpecies, setModalSpecies] = useState(null);
  const [modalEncounters, setModalEncounters] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const cache = useRef({ pokemon: {}, species: {}, encounters: {} });

  // Persist caught state to localStorage
  useEffect(() => { saveCaught(caught); }, [caught]);
  useEffect(() => { saveGen(selectedGen); }, [selectedGen]);

  // Fetch generation data
  const fetchGen = useCallback(async (genIndex) => {
    const gen = GENERATIONS[genIndex];
    setLoading(true);
    setError(null);
    try {
      const ids = Array.from({ length: gen.end - gen.start + 1 }, (_, i) => gen.start + i);
      const uncached = ids.filter(id => !cache.current.pokemon[id]);

      if (uncached.length > 0) {
        const batchSize = 40;
        for (let i = 0; i < uncached.length; i += batchSize) {
          const batch = uncached.slice(i, i + batchSize);
          const results = await Promise.all(
            batch.map(id => fetch(`${API}/pokemon/${id}`).then(r => {
              if (!r.ok) throw new Error(`Failed to fetch Pokemon ${id}`);
              return r.json();
            }))
          );
          results.forEach(p => { cache.current.pokemon[p.id] = p; });
          const allLoaded = ids.map(id => cache.current.pokemon[id]).filter(Boolean);
          setPokemon(allLoaded);
        }
      }
      const allPokemon = ids.map(id => cache.current.pokemon[id]).filter(Boolean);
      setPokemon(allPokemon);
    } catch (err) {
      setError(`Failed to load Pokemon data. ${err.message}`);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchGen(selectedGen); }, [selectedGen, fetchGen]);

  // Open detail modal
  const openDetail = useCallback(async (poke) => {
    setModalPokemon(poke);
    setModalSpecies(null);
    setModalEncounters(null);
    setModalLoading(true);

    try {
      const [speciesData, encounterData] = await Promise.all([
        cache.current.species[poke.id]
          ? Promise.resolve(cache.current.species[poke.id])
          : fetch(`${API}/pokemon-species/${poke.id}`).then(r => r.json()).then(d => { cache.current.species[poke.id] = d; return d; }),
        cache.current.encounters[poke.id]
          ? Promise.resolve(cache.current.encounters[poke.id])
          : fetch(`${API}/pokemon/${poke.id}/encounters`).then(r => r.json()).then(d => { cache.current.encounters[poke.id] = d; return d; }),
      ]);
      setModalSpecies(speciesData);
      setModalEncounters(encounterData);
    } catch (err) {
      console.error("Error fetching details:", err);
    }
    setModalLoading(false);
  }, []);

  const toggleCaught = useCallback((id) => {
    setCaught(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const availableTypes = useMemo(() => {
    const types = new Set();
    pokemon.forEach(p => p.types?.forEach(t => types.add(t.type.name)));
    return Array.from(types).sort();
  }, [pokemon]);

  const filtered = useMemo(() => {
    return pokemon.filter(p => {
      if (search && !p.name.includes(search.toLowerCase()) && !String(p.id).includes(search)) return false;
      if (typeFilter !== "all" && !p.types?.some(t => t.type.name === typeFilter)) return false;
      if (caughtFilter === "caught" && !caught[p.id]) return false;
      if (caughtFilter === "uncaught" && caught[p.id]) return false;
      return true;
    });
  }, [pokemon, search, typeFilter, caughtFilter, caught]);

  const gen = GENERATIONS[selectedGen];
  const totalInGen = gen.end - gen.start + 1;
  const caughtInGen = Array.from({ length: totalInGen }, (_, i) => gen.start + i).filter(id => caught[id]).length;
  const caughtPct = totalInGen > 0 ? (caughtInGen / totalInGen) * 100 : 0;

  const totalPokemon = 1025;
  const totalCaught = Object.values(caught).filter(Boolean).length;
  const totalPct = totalPokemon > 0 ? (totalCaught / totalPokemon) * 100 : 0;

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* ═══ HEADER ═══ */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "linear-gradient(180deg, rgba(10,10,26,.98) 0%, rgba(10,10,26,.92) 100%)",
        backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,.05)",
        padding: "16px 20px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{
              fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: -1,
              background: "linear-gradient(135deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3, #54a0ff)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              Pokedex Tracker
            </h1>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 2 }}>
              {gen.name} Region &mdash; Gen {gen.label}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ textAlign: "right", paddingRight: 12, borderRight: "1px solid rgba(255,255,255,.1)" }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>
                <span style={{ color: "#48dbfb" }}>{totalCaught}</span>
                <span style={{ color: "rgba(255,255,255,.25)", fontWeight: 400 }}> / {totalPokemon}</span>
              </div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,.35)", letterSpacing: 1, textTransform: "uppercase" }}>Total</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>
                <span style={{ color: "#ffd700" }}>{caughtInGen}</span>
                <span style={{ color: "rgba(255,255,255,.3)", fontWeight: 400 }}> / {totalInGen}</span>
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", letterSpacing: 1, textTransform: "uppercase" }}>{gen.name}</div>
            </div>
            <button onClick={() => setShowShiny(!showShiny)} style={{
              padding: "8px 16px", borderRadius: 12, border: "none", cursor: "pointer",
              background: showShiny ? "linear-gradient(135deg, #ffd700, #ff8c00)" : "rgba(255,255,255,.08)",
              color: showShiny ? "#1a1a2e" : "rgba(255,255,255,.6)",
              fontWeight: 700, fontSize: 12, transition: "all .3s ease",
              boxShadow: showShiny ? "0 4px 15px rgba(255,215,0,.3)" : "none",
            }}>
              {showShiny ? "\u2605 Shiny Mode" : "\u2726 Normal Mode"}
            </button>
          </div>
        </div>

        {/* Progress bars */}
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,.3)", letterSpacing: .5, width: 42, textAlign: "right" }}>{gen.name}</span>
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 3, transition: "width .8s cubic-bezier(.4,0,.2,1)",
                width: `${caughtPct}%`,
                background: caughtPct >= 100
                  ? "linear-gradient(90deg, #ffd700, #ff8c00, #ffd700)"
                  : "linear-gradient(90deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3)",
                boxShadow: caughtPct >= 100 ? "0 0 15px rgba(255,215,0,.5)" : "0 0 10px rgba(72,219,251,.3)",
              }}/>
            </div>
            <span style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,.3)", width: 32 }}>{Math.round(caughtPct)}%</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,.3)", letterSpacing: .5, width: 42, textAlign: "right" }}>Total</span>
            <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,.04)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 2, transition: "width .8s cubic-bezier(.4,0,.2,1)",
                width: `${totalPct}%`,
                background: totalPct >= 100
                  ? "linear-gradient(90deg, #ffd700, #ff8c00, #ffd700)"
                  : "linear-gradient(90deg, #48dbfb, #54a0ff, #9b59b6)",
                boxShadow: totalPct >= 100 ? "0 0 15px rgba(255,215,0,.5)" : "none",
              }}/>
            </div>
            <span style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,.3)", width: 32 }}>{Math.round(totalPct)}%</span>
          </div>
        </div>

        {/* Gen selector */}
        <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
          {GENERATIONS.map((g, i) => (
            <button key={g.label} onClick={() => setSelectedGen(i)} style={{
              padding: "6px 14px", borderRadius: 10, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 700, transition: "all .2s",
              background: selectedGen === i ? "linear-gradient(135deg, #4d96ff, #9b59b6)" : "rgba(255,255,255,.06)",
              color: selectedGen === i ? "#fff" : "rgba(255,255,255,.4)",
              boxShadow: selectedGen === i ? "0 4px 12px rgba(77,150,255,.3)" : "none",
            }}>
              Gen {g.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 200px" }}>
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or number..."
              style={{
                width: "100%", padding: "10px 16px 10px 38px", borderRadius: 12,
                border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)",
                color: "#fff", fontSize: 13, outline: "none", transition: "border .2s",
              }}
              onFocus={e => e.target.style.borderColor = "rgba(255,255,255,.2)"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,.08)"}
            />
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, opacity: .4 }}>&#128269;</span>
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{
            padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,.08)",
            background: "rgba(255,255,255,.04)", color: "#fff", fontSize: 12, cursor: "pointer", outline: "none",
          }}>
            <option value="all">All Types</option>
            {availableTypes.map(t => (
              <option key={t} value={t} style={{ textTransform: "capitalize" }}>{cap(t)}</option>
            ))}
          </select>
          <div style={{ display: "flex", gap: 4 }}>
            {["all", "caught", "uncaught"].map(f => (
              <button key={f} onClick={() => setCaughtFilter(f)} style={{
                padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer",
                fontSize: 11, fontWeight: 700, textTransform: "capitalize", transition: "all .2s",
                background: caughtFilter === f ? (f === "caught" ? "rgba(255,215,0,.15)" : f === "uncaught" ? "rgba(255,100,100,.15)" : "rgba(255,255,255,.1)") : "rgba(255,255,255,.04)",
                color: caughtFilter === f ? (f === "caught" ? "#ffd700" : f === "uncaught" ? "#ff6b6b" : "#fff") : "rgba(255,255,255,.4)",
              }}>
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div style={{ padding: "20px 20px 40px" }}>
        {error ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>&#128546;</div>
            <div style={{ color: "rgba(255,255,255,.6)", marginBottom: 16 }}>{error}</div>
            <button onClick={() => fetchGen(selectedGen)} style={{
              padding: "10px 24px", borderRadius: 12, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #4d96ff, #9b59b6)", color: "#fff", fontWeight: 700,
            }}>Retry</button>
          </div>
        ) : loading && pokemon.length === 0 ? (
          <Skeleton count={24}/>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>&#128270;</div>
            <div style={{ color: "rgba(255,255,255,.5)" }}>No Pokemon match your filters</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(164px, 1fr))", gap: 14 }}>
            {filtered.map(p => (
              <PokemonCard
                key={p.id} data={p} caught={!!caught[p.id]}
                showShiny={showShiny}
                onClick={() => openDetail(p)}
                onToggleCaught={() => toggleCaught(p.id)}
              />
            ))}
          </div>
        )}
        {loading && pokemon.length > 0 && (
          <div style={{ textAlign: "center", padding: 20 }}>
            <div style={{ width: 30, height: 30, margin: "0 auto", border: "3px solid rgba(255,255,255,.1)",
              borderTopColor: "#4d96ff", borderRadius: "50%", animation: "spin .8s linear infinite" }}/>
          </div>
        )}
      </div>

      {/* ═══ MODAL ═══ */}
      {modalPokemon && (
        <DetailModal
          pokemon={modalPokemon} species={modalSpecies} encounters={modalEncounters}
          loading={modalLoading} onClose={() => setModalPokemon(null)}
          caught={!!caught[modalPokemon.id]} onToggleCaught={() => toggleCaught(modalPokemon.id)}
          showShiny={showShiny}
        />
      )}
    </div>
  );
}
