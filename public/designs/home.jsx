/* global React, ReactDOM, ForestBiome, RockChar, TweaksPanel, useTweaks, TweakSection, TweakRadio, TweakSelect, TweakToggle, TweakSlider */
const { useState, useEffect } = React;

// asset url helper: prefers bundled blob URLs (set by the standalone bundler
// via window.__resources) and falls back to the on-disk path when running
// from the source tree.
const _R = (id, fallback) => (window.__resources && window.__resources[id]) || fallback;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "expression": "confident",
  "skyMood": "dramatic",
  "density": "rich",
  "showAuraBeams": true,
  "characterScale": 220
}/*EDITMODE-END*/;

// ============================================================
// "HOLD ON" — inflated 3D cartoon wordmark, stacked, offset
// ============================================================
function HoldOnLogo() {
  // Reusable letter renderer:
  //   each letter is text drawn 3 times to fake an inflated 3D look:
  //     1. dark outline (thick stroke)
  //     2. yellow extrusion (offset down/right)
  //     3. white front face (with gloss gradient)
  // We draw ONE <text> per element and let SVG paint-order do the work.
  const front = '#ffffff';
  const extrusion = '#ffd23f';
  const outline = '#1a1d2e';
  const depth = 6;

  // shared text style props
  const baseText = {
    fontFamily: 'Fredoka, sans-serif',
    fontWeight: 700,
    fontSize: 130,
    letterSpacing: '-0.02em',
    textAnchor: 'start',
    dominantBaseline: 'alphabetic',
  };

  return (
    <div style={{
      display: 'inline-block',
      transform: 'rotate(-3deg)',
      transformOrigin: 'left bottom',
      filter: 'drop-shadow(0 8px 0 rgba(26,29,46,0.55)) drop-shadow(0 14px 18px rgba(0,0,0,0.35))',
    }}>
      <svg width="420" height="240" viewBox="0 0 420 240" style={{ overflow: 'visible' }}>
        <defs>
          {/* glossy front-face gradient: white top → soft yellow tint bottom */}
          <linearGradient id="frontGloss" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff"></stop>
            <stop offset="55%" stopColor="#fff8dc"></stop>
            <stop offset="100%" stopColor="#ffe98a"></stop>
          </linearGradient>
          {/* deeper yellow for extrusion shading */}
          <linearGradient id="extrudeShade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffd23f"></stop>
            <stop offset="100%" stopColor="#c98c00"></stop>
          </linearGradient>
        </defs>

        {/* === HOLD === top line */}
        <g transform="translate(8 122)">
          {/* extrusion stack: draw word offset multiple times for depth */}
          {Array.from({ length: depth }).map((_, i) => (
            <text key={`e1-${i}`} {...baseText}
              x={i * 1.0} y={i * 1.0}
              fill="url(#extrudeShade)"
              stroke={outline} strokeWidth="6"
              paintOrder="stroke fill"
            >HOLD</text>
          ))}
          {/* front face */}
          <text {...baseText}
            x={-1} y={-1}
            fill="url(#frontGloss)"
            stroke={outline} strokeWidth="6"
            paintOrder="stroke fill"
          >HOLD</text>
          {/* top gloss highlight stripe */}
          <text {...baseText}
            x={-1} y={-1}
            fill="rgba(255,255,255,0.9)"
            style={{ clipPath: 'inset(0 0 70% 0)' }}
          >HOLD</text>
        </g>

        {/* === ON === bottom line, offset right + slight tilt down */}
        <g transform="translate(118 230) rotate(2)">
          {Array.from({ length: depth }).map((_, i) => (
            <text key={`e2-${i}`} {...baseText}
              x={i * 1.0} y={i * 1.0}
              fill="url(#extrudeShade)"
              stroke={outline} strokeWidth="6"
              paintOrder="stroke fill"
            >ON</text>
          ))}
          <text {...baseText}
            x={-1} y={-1}
            fill="url(#frontGloss)"
            stroke={outline} strokeWidth="6"
            paintOrder="stroke fill"
          >ON</text>
        </g>

        {/* tasteful motion spark off the upper-right of HOLD */}
        <g transform="translate(308 36)">
          <path d="M0 8 L 6 0 L 8 6 L 16 4 L 10 12 L 18 18 L 8 18 L 6 26 L 0 18 L -8 22 L -2 12 L -10 8 Z"
                fill="#ffd23f" stroke="#1a1d2e" strokeWidth="2.5" strokeLinejoin="round"></path>
          <path d="M-4 4 Q 0 8 4 4" stroke="#1a1d2e" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6"></path>
        </g>
      </svg>
    </div>
  );
}

function NavItem({ icon, label, onClick }) {
  return (
    <button className="nav-item" onClick={onClick} aria-label={label}
            style={{ background: 'none', border: 'none', padding: 0 }}>
      <div className="nav-circle">
        <img src={_R(`icon_${icon.replace('.svg','')}`, `assets/icons/${icon}`)} alt="" />
      </div>
      <div className="nav-label">{label}</div>
    </button>
  );
}

// rotating energy beams behind the character
function AuraBeams() {
  return (
    <svg className="aura-beams" viewBox="0 0 360 360">
      <defs>
        <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe168" stopOpacity="0"></stop>
          <stop offset="50%" stopColor="#ffd23f" stopOpacity="0.85"></stop>
          <stop offset="100%" stopColor="#ffe168" stopOpacity="0"></stop>
        </linearGradient>
      </defs>
      {Array.from({ length: 8 }).map((_, i) => (
        <polygon key={i}
          points="180,20 192,180 168,180"
          fill="url(#beam)"
          transform={`rotate(${i * 45} 180 180)`}
        ></polygon>
      ))}
    </svg>
  );
}

function Home() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        setPressed(true);
        setTimeout(() => setPressed(false), 140);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="stage" data-screen-label="Home">
      <ForestBiome density={t.density} skyMood={t.skyMood} />

      {/* TOP-LEFT */}
      <div style={{ position: 'absolute', top: 18, left: 32, zIndex: 6 }}>
        <HoldOnLogo />
        <div style={{ marginTop: -10, marginLeft: 16 }}>
          <div className="hpill small">
            <img src={_R('icon_trophy', 'assets/icons/trophy.svg')} alt="" />
            <span className="num">
              <span style={{ color: 'var(--text-secondary)', fontSize: 13, letterSpacing: '0.08em', WebkitTextStroke: 0, marginRight: 8, fontWeight: 600 }}>BEST</span>
              12,450<span style={{ fontSize: 14, opacity: 0.85, marginLeft: 2 }}>m</span>
            </span>
          </div>
        </div>
      </div>

      {/* TOP-RIGHT */}
      <div style={{ position: 'absolute', top: 32, right: 32, zIndex: 6,
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 14 }}>
        <div className="hpill">
          <img src={_R('icon_coin', 'assets/icons/coin.svg')} alt="" />
          <span className="num">12,450</span>
        </div>
        <div className="daily-badge" role="button" tabIndex={0}>
          <img src={_R('icon_gift', 'assets/icons/gift.svg')} alt="" />
          <span className="label">Daily!</span>
        </div>
      </div>

      {/* HERO — character */}
      <div style={{
        position: 'absolute', left: 140, top: 220, zIndex: 4,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28,
      }}>
        <div style={{ position: 'relative', width: t.characterScale, height: t.characterScale }}>
          {t.showAuraBeams && <AuraBeams />}
          <div className="aura"></div>
          <div className="bob" style={{ position: 'absolute', inset: 0 }}>
            <RockChar size={t.characterScale} expression={t.expression} />
          </div>
          <div className="shadow-blob" style={{ left: (t.characterScale - 180) / 2, bottom: -14 }}></div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div className="slots-row">
            <div className="slot filled-rare" title="Magnet">
              <img src={_R('icon_magnet', 'assets/icons/magnet.svg')} alt="Magnet" />
            </div>
            <div className="slot empty">+</div>
            <div className="slot empty">+</div>
          </div>
          <div className="slots-caption">Tap to equip</div>
        </div>
      </div>

      {/* PLAY */}
      <div style={{
        position: 'absolute', right: 130, top: 252, zIndex: 4,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div className="play-wrap">
          <div className="play-halo"></div>
          <button
            className="btn-play"
            style={pressed ? {
              transform: 'translateY(6px)',
              boxShadow:
                '0 2px 0 var(--accent-yellow-shadow), inset 0 5px 0 rgba(255,255,255,0.55), inset 0 -3px 0 rgba(180,130,0,0.45)',
            } : undefined}
          >
            <span className="play-icon"></span>
            Play
          </button>
        </div>
        <div className="play-caption">Tap to start</div>
      </div>

      {/* BOTTOM NAV */}
      <div className="bottom-nav">
        <NavItem icon="shop.svg" label="Shop" />
        <NavItem icon="backpack.svg" label="Inventory" />
        <NavItem icon="checklist.svg" label="Missions" />
        <NavItem icon="podium.svg" label="Leaderboard" />
        <NavItem icon="settings.svg" label="Settings" />
      </div>

      <TweaksPanel>
        <TweakSection label="Character" />
        <TweakRadio label="Expression" value={t.expression}
          options={['confident', 'determined', 'smile']}
          onChange={(v) => setTweak('expression', v)} />
        <TweakSlider label="Size" value={t.characterScale} min={160} max={280} step={10} unit="px"
          onChange={(v) => setTweak('characterScale', v)} />
        <TweakToggle label="Energy beams" value={t.showAuraBeams}
          onChange={(v) => setTweak('showAuraBeams', v)} />
        <TweakSection label="Backdrop" />
        <TweakRadio label="Sky" value={t.skyMood}
          options={['dramatic', 'warm', 'dusk']}
          onChange={(v) => setTweak('skyMood', v)} />
        <TweakRadio label="Density" value={t.density}
          options={['sparse', 'normal', 'rich']}
          onChange={(v) => setTweak('density', v)} />
      </TweaksPanel>
    </div>
  );
}

function fitStage() {
  const stage = document.querySelector('.stage');
  if (!stage) return;
  const sx = window.innerWidth / 1280;
  const sy = window.innerHeight / 720;
  const s = Math.min(sx, sy);
  stage.style.transform = `scale(${s})`;
}

window.addEventListener('resize', fitStage);
ReactDOM.createRoot(document.getElementById('root')).render(<Home />);
requestAnimationFrame(fitStage);
setTimeout(fitStage, 50);
