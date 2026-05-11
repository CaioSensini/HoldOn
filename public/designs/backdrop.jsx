/* global React */
const { useMemo } = React;

// ============================================================
// Forest biome — stylized, dramatic, more concept-art
// ============================================================
function ForestBiome({ density = 'rich', skyMood = 'dramatic' }) {
  const sparkleCount = density === 'sparse' ? 0 : density === 'normal' ? 5 : 8;
  const leafCount    = density === 'sparse' ? 0 : density === 'normal' ? 3 : 4;

  const sparkles = useMemo(() => Array.from({ length: sparkleCount }).map(() => ({
    left: 200 + Math.random() * 900,
    top: 90 + Math.random() * 360,
    delay: Math.random() * 2.6,
    dx: -20 + Math.random() * 40,
    dy: -30 - Math.random() * 60,
    size: 8 + Math.random() * 6,
  })), [sparkleCount]);

  const leaves = useMemo(() => Array.from({ length: leafCount }).map(() => ({
    left: Math.random() * 1280,
    top: 140 + Math.random() * 320,
    delay: Math.random() * 6,
    color: ['#3d6b32', '#2a4d24', '#5a9a4a'][Math.floor(Math.random() * 3)],
    scale: 0.5 + Math.random() * 0.4,
  })), [leafCount]);

  const skies = {
    dramatic: 'linear-gradient(180deg, #1f3a8a 0%, #3b6db8 28%, #5a9bcf 50%, #6ba85a 78%, #2a4d24 100%)',
    warm:     'linear-gradient(180deg, #2a4d8c 0%, #5a8bd0 30%, #b8d8e8 55%, #6ba85a 78%, #2a4d24 100%)',
    dusk:     'linear-gradient(180deg, #2a1d4e 0%, #6b3a8c 30%, #d97a5a 55%, #5a7a3a 80%, #1a2d14 100%)',
  };

  return (
    <div className="biome" style={{ background: skies[skyMood] || skies.dramatic }}>
      {/* god-ray light shafts upper-left */}
      <svg style={{ position: 'absolute', top: 0, left: 0, width: 720, height: 540, pointerEvents: 'none', mixBlendMode: 'screen', opacity: 0.45 }}
           viewBox="0 0 720 540" preserveAspectRatio="none">
        <defs>
          <linearGradient id="ray" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff7c0" stopOpacity="0.85"></stop>
            <stop offset="100%" stopColor="#fff7c0" stopOpacity="0"></stop>
          </linearGradient>
        </defs>
        <polygon points="0,0 240,0 380,540 100,540" fill="url(#ray)"></polygon>
        <polygon points="120,0 280,0 460,540 280,540" fill="url(#ray)" opacity="0.6"></polygon>
        <polygon points="240,0 360,0 540,540 420,540" fill="url(#ray)" opacity="0.4"></polygon>
      </svg>

      {/* sun glow */}
      <div className="sun-glow"></div>
      <div className="sun-disc"></div>

      {/* distant cloud strips — fewer, flatter, more graphic */}
      <svg style={{ position: 'absolute', top: 90, left: 380, opacity: 0.85 }} width="220" height="36" viewBox="0 0 220 36">
        <path d="M10 22 C 10 12, 24 8, 36 14 C 48 4, 80 6, 92 18 C 110 8, 150 10, 162 22 C 180 16, 210 22, 210 30 L 10 30 Z"
              fill="#fff" stroke="#1a1d2e" strokeWidth="2.5" strokeLinejoin="round"></path>
      </svg>
      <svg style={{ position: 'absolute', top: 160, right: 320, opacity: 0.7 }} width="180" height="32" viewBox="0 0 180 32">
        <path d="M8 20 C 8 10, 24 6, 36 14 C 50 4, 86 6, 100 18 C 130 12, 170 18, 172 26 L 8 26 Z"
              fill="#fff" stroke="#1a1d2e" strokeWidth="2.5" strokeLinejoin="round"></path>
      </svg>

      {/* Distant mountain ridge — sharp, atmospheric */}
      <svg style={{ position: 'absolute', bottom: 220, left: 0, width: '100%', filter: 'blur(0.4px)' }}
           viewBox="0 0 1280 240" preserveAspectRatio="none" height="240">
        <path d="M0 200 L 80 80 L 140 130 L 230 30 L 330 110 L 430 60 L 540 130 L 640 40 L 760 120 L 870 70 L 980 130 L 1080 60 L 1180 120 L 1280 90 L 1280 240 L 0 240 Z"
              fill="#3a5a78" opacity="0.7" stroke="#1a1d2e" strokeWidth="3.5" strokeLinejoin="round"></path>
      </svg>

      {/* atmospheric fog band */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 280, height: 110,
        background: 'linear-gradient(180deg, rgba(180,210,220,0) 0%, rgba(180,210,220,0.45) 50%, rgba(180,210,220,0) 100%)',
        pointerEvents: 'none',
        mixBlendMode: 'screen',
      }}></div>

      {/* Mid mountain ridge — dramatic green */}
      <svg style={{ position: 'absolute', bottom: 180, left: 0, width: '100%' }}
           viewBox="0 0 1280 200" preserveAspectRatio="none" height="200">
        <path d="M0 180 L 60 100 L 130 150 L 230 60 L 330 130 L 440 90 L 560 150 L 680 70 L 800 140 L 920 80 L 1040 140 L 1160 90 L 1280 130 L 1280 200 L 0 200 Z"
              fill="#2d5a32" stroke="#1a1d2e" strokeWidth="4" strokeLinejoin="round"></path>
        <path d="M230 60 L 200 110 L 260 110 Z" fill="#5a8a4a" opacity="0.7"></path>
        <path d="M680 70 L 650 120 L 710 120 Z" fill="#5a8a4a" opacity="0.7"></path>
      </svg>

      {/* Rolling hills */}
      <svg style={{ position: 'absolute', bottom: 100, left: 0, width: '100%' }}
           viewBox="0 0 1280 180" preserveAspectRatio="none" height="180">
        <path d="M0 130 C 200 50, 400 170, 640 90 C 880 30, 1080 160, 1280 80 L 1280 180 L 0 180 Z"
              fill="#3d6b32" stroke="#1a1d2e" strokeWidth="4"></path>
      </svg>

      {/* Foreground grass plateau — darker, richer */}
      <svg style={{ position: 'absolute', bottom: 0, left: 0, width: '100%' }}
           viewBox="0 0 1280 180" preserveAspectRatio="none" height="180">
        <path d="M0 70 C 160 40, 360 90, 640 60 C 920 30, 1100 90, 1280 70 L 1280 180 L 0 180 Z"
              fill="#2a4d24" stroke="#1a1d2e" strokeWidth="5"></path>
        <path d="M0 70 C 160 40, 360 90, 640 60 C 920 30, 1100 90, 1280 70 L 1280 88 C 1100 110, 920 50, 640 80 C 360 110, 160 60, 0 90 Z"
              fill="#4a7c3a"></path>
      </svg>

      {/* Grass blades — sharper, denser */}
      <svg style={{ position: 'absolute', bottom: 0, left: 0, width: '100%' }}
           viewBox="0 0 1280 80" preserveAspectRatio="none" height="80" pointerEvents="none">
        {Array.from({ length: 80 }).map((_, i) => {
          const x = i * 16 + (i % 3) * 3;
          const h = 12 + (i % 7) * 5;
          return (
            <path key={i}
                  d={`M${x} 80 L ${x + 3} ${80 - h} L ${x + 6} 80 Z`}
                  fill={i % 2 ? '#2a4d24' : '#1f3a1c'} />
          );
        })}
      </svg>

      {/* Cartoon trees — darker, more graphic */}
      <Tree x={50} y={400} scale={1.2} variant="round" />
      <Tree x={200} y={450} scale={0.9} variant="pine" />
      <Tree x={1130} y={410} scale={1.1} variant="round" />
      <Tree x={1010} y={460} scale={0.8} variant="pine" />

      <Bush x={10} y={580} scale={1} />
      <Bush x={1190} y={595} scale={0.95} />

      {/* drifting leaves */}
      {leaves.map((l, i) => (
        <svg key={i} className="leaf"
             style={{
               left: l.left, top: l.top,
               width: 22 * l.scale, height: 22 * l.scale,
               animationDelay: `${l.delay}s`,
             }}
             viewBox="0 0 22 22">
          <path d="M11 2 C 4 4, 2 12, 6 18 C 12 22, 20 16, 20 8 C 20 4, 16 2, 11 2 Z"
                fill={l.color} stroke="#1a1d2e" strokeWidth="1.5"></path>
        </svg>
      ))}

      {/* atmosphere sparkles — fewer, smaller */}
      {sparkles.map((s, i) => (
        <svg key={i} className="sparkle"
             style={{
               left: s.left, top: s.top,
               width: s.size, height: s.size,
               animationDelay: `${s.delay}s`,
               '--dx': `${s.dx}px`, '--dy': `${s.dy}px`,
             }}
             viewBox="0 0 14 14">
          <path d="M7 0 L 8.4 5.6 L 14 7 L 8.4 8.4 L 7 14 L 5.6 8.4 L 0 7 L 5.6 5.6 Z"
                fill="#fff7c0"></path>
        </svg>
      ))}

      {/* Stronger vignette + foreground darken so UI dominates */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background:
          'radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.35) 100%),' +
          'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.25) 100%)',
      }}></div>
    </div>
  );
}

// ============ Tree ============ (darker, thicker outlines)
function Tree({ x, y, scale = 1, variant = 'round' }) {
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      transform: `scale(${scale})`, transformOrigin: 'bottom center',
      filter: 'drop-shadow(0 6px 0 rgba(0,0,0,0.3))',
    }}>
      <svg viewBox="0 0 140 200" width="140" height="200">
        <rect x="60" y="120" width="20" height="60" rx="6"
              fill="#5a3a1f" stroke="#1a1d2e" strokeWidth="4"></rect>
        <rect x="60" y="120" width="6" height="60" rx="3" fill="#2a1d0f" opacity="0.6"></rect>
        {variant === 'round' ? (
          <>
            <ellipse cx="70" cy="80" rx="60" ry="55"
                     fill="#2d5a32" stroke="#1a1d2e" strokeWidth="4"></ellipse>
            <ellipse cx="50" cy="60" rx="22" ry="18" fill="#4a7c3a" opacity="0.85"></ellipse>
            <ellipse cx="92" cy="100" rx="20" ry="14" fill="#1f3a1c" opacity="0.7"></ellipse>
          </>
        ) : (
          <>
            <path d="M70 10 L 110 70 L 90 70 L 120 110 L 100 110 L 130 150 L 10 150 L 40 110 L 20 110 L 50 70 L 30 70 Z"
                  fill="#1f3a1c" stroke="#1a1d2e" strokeWidth="4" strokeLinejoin="round"></path>
            <path d="M70 10 L 90 38 L 75 38 Z" fill="#3d6b32" opacity="0.95"></path>
            <path d="M50 80 L 90 80 L 100 100 L 40 100 Z" fill="#2d5a32" opacity="0.7"></path>
          </>
        )}
      </svg>
    </div>
  );
}

// ============ Bush ============
function Bush({ x, y, scale = 1 }) {
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      transform: `scale(${scale})`, transformOrigin: 'bottom center',
      filter: 'drop-shadow(0 4px 0 rgba(0,0,0,0.25))',
    }}>
      <svg viewBox="0 0 120 70" width="120" height="70">
        <path d="M10 60 C 10 40, 20 30, 32 32 C 36 18, 56 16, 62 28 C 70 14, 92 18, 96 34 C 110 34, 112 50, 110 60 Z"
              fill="#2d5a32" stroke="#1a1d2e" strokeWidth="4" strokeLinejoin="round"></path>
        <path d="M30 36 Q 36 30 44 36" stroke="#4a7c3a" strokeWidth="2.5" fill="none"></path>
        <path d="M70 32 Q 78 28 86 34" stroke="#4a7c3a" strokeWidth="2.5" fill="none"></path>
      </svg>
    </div>
  );
}

// ============================================================
// Rock character — confident, weathered, attitude
// ============================================================
function RockChar({ size = 220, expression = 'confident' }) {
  return (
    <div style={{
      position: 'relative',
      width: size, height: size,
      filter: 'drop-shadow(0 12px 0 rgba(0,0,0,0.3))',
    }}>
      <svg viewBox="0 0 220 220" width={size} height={size}>
        <defs>
          <radialGradient id="rockShade2" cx="32%" cy="28%" r="85%">
            <stop offset="0%" stopColor="#a8a8a8"></stop>
            <stop offset="50%" stopColor="#727275"></stop>
            <stop offset="100%" stopColor="#3e3e44"></stop>
          </radialGradient>
        </defs>

        {/* Body — slightly angular, irregular silhouette */}
        <path d="
          M 96 18
          L 138 22
          L 174 42
          L 196 78
          L 200 118
          L 188 160
          L 162 188
          L 130 200
          L 86 196
          L 52 178
          L 28 142
          L 22 102
          L 32 64
          L 60 32
          Z"
          fill="url(#rockShade2)"
          stroke="#1a1d2e" strokeWidth="6" strokeLinejoin="round"></path>

        {/* angular top highlight (chiseled) */}
        <path d="M62 38 L 96 26 L 138 30 L 168 50 L 152 56 L 110 44 L 78 56 Z"
              fill="#c8c8c8" opacity="0.55"></path>

        {/* deep cracks */}
        <path d="M40 80 L 56 96 L 50 116 L 64 134" stroke="#1a1d2e" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7"></path>
        <path d="M170 90 L 162 108 L 178 124" stroke="#1a1d2e" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.65"></path>
        <path d="M120 178 L 130 188" stroke="#1a1d2e" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.6"></path>

        {/* chipped edges */}
        <path d="M28 142 L 38 138 L 36 152 Z" fill="#3e3e44" stroke="#1a1d2e" strokeWidth="2.5" strokeLinejoin="round"></path>
        <path d="M196 78 L 188 84 L 200 92 Z" fill="#3e3e44" stroke="#1a1d2e" strokeWidth="2.5" strokeLinejoin="round"></path>

        {/* surface speckles & pits */}
        <ellipse cx="60" cy="158" rx="7" ry="3.5" fill="#3e3e44"></ellipse>
        <ellipse cx="158" cy="166" rx="9" ry="4" fill="#3e3e44"></ellipse>
        <ellipse cx="108" cy="184" rx="6" ry="2.5" fill="#3e3e44"></ellipse>
        <circle cx="148" cy="78" r="2.5" fill="#1a1d2e" opacity="0.55"></circle>
        <circle cx="78" cy="92" r="2" fill="#1a1d2e" opacity="0.5"></circle>

        {/* eyes — confident, almond shape with determined slant */}
        {/* whites */}
        <path d="M68 100 Q 84 88 102 102 Q 90 116 70 110 Z"
              fill="#fff" stroke="#1a1d2e" strokeWidth="4" strokeLinejoin="round"></path>
        <path d="M122 102 Q 138 88 156 100 Q 152 114 134 116 Q 122 110 122 102 Z"
              fill="#fff" stroke="#1a1d2e" strokeWidth="4" strokeLinejoin="round"></path>

        {/* pupils — slight inward tilt = focused */}
        <circle cx="86" cy="104" r="6" fill="#1a1d2e"></circle>
        <circle cx="138" cy="104" r="6" fill="#1a1d2e"></circle>
        <circle cx="88" cy="102" r="2" fill="#fff"></circle>
        <circle cx="140" cy="102" r="2" fill="#fff"></circle>

        {/* eyebrows — angled down toward center for attitude */}
        <path d="M62 86 L 102 90" stroke="#1a1d2e" strokeWidth="6" strokeLinecap="round"></path>
        <path d="M122 90 L 162 86" stroke="#1a1d2e" strokeWidth="6" strokeLinecap="round"></path>

        {/* mouth — slight smirk, confident */}
        {expression === 'confident' && (
          <path d="M92 152 L 124 152 Q 134 152 138 144"
                stroke="#1a1d2e" strokeWidth="5" fill="none" strokeLinecap="round"></path>
        )}
        {expression === 'determined' && (
          <path d="M94 156 L 138 156"
                stroke="#1a1d2e" strokeWidth="6" fill="none" strokeLinecap="round"></path>
        )}
        {expression === 'smile' && (
          <path d="M94 150 Q 114 164 138 150"
                stroke="#1a1d2e" strokeWidth="5" fill="none" strokeLinecap="round"></path>
        )}
      </svg>
    </div>
  );
}

Object.assign(window, { ForestBiome, Tree, Bush, RockChar });
