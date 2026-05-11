/**
 * Configurações globais do jogo Float.
 * Todas as constantes mágicas vivem aqui — não espalhar valores numéricos pelo código.
 */

/** Liga overlay com FPS, contagens de pool e flag de leaks. Use em dev. */
export const DEBUG_MODE = false;

/** Limite duro de partículas simultâneas por emitter. */
export const PARTICLE_CAPS = {
  TRAIL: 60,
  SPARK: 24,
  COIN_POP: 16,
  POWERUP_FLASH: 36,
  DEATH_EXPLOSION: 80
} as const;

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** Cor de fundo padrão antes do bioma carregar. */
export const BG_COLOR = 0x0b0f1a;

/** Física do player. */
export const PLAYER = {
  /** Posição X fixa do player na tela (mundo rola, player não). */
  X: 280,
  X_MIN: 70,
  X_MAX: 1210,
  /**
   * Range vertical (Y mínimo no topo da área jogável, máximo no chão).
   * Y_MIN=80 dá ~40px extra de "fase aérea" — mais espaço pra manobrar
   * acima das armadilhas low (ceilingCurtainHitbox se adapta sozinho).
   */
  Y_MIN: 80,
  Y_MAX: 600,
  /** Largura/altura do hitbox base. */
  WIDTH: 56,
  HEIGHT: 56,
  PRONE_WIDTH: 84,
  PRONE_HEIGHT: 28,
  /** Aceleração ao subir (touch ativo), px/s². */
  ASCEND_ACCEL: 1800,
  /** Velocidade vertical máxima ao subir. */
  ASCEND_MAX_VEL: 600,
  /** Gravidade quando solta o touch, px/s². */
  GRAVITY: 1700,
  /** Velocidade vertical máxima ao cair. */
  FALL_MAX_VEL: 900,
  /** Range de ajuste lateral baseado em movimento de dedo (% da largura). */
  HORIZ_RANGE_PCT: 0.3,
  /** Velocidade de interpolação lateral (legado, atualmente X é travado). */
  HORIZ_LERP: 0.18,
  /** Lerp factor para seguir o dedo no eixo Y (0..1, maior = mais "grudado"). */
  HORIZ_LERP_FOLLOW: 0.26,
  FREE_MOVE_LERP_X: 0.24,
  /** Duração do tween inicial tap → centro. */
  TAP_TWEEN_DURATION_MS: 150
} as const;

/** Velocidade do scroll do mundo. */
export const WORLD = {
  BASE_SPEED: 440,
  MAX_SPEED: 1000,
  /**
   * Crescimento por 100m. Calibrado pra atingir MAX_SPEED em ~18000m
   * (entrada do Space, fase TERMINAL). Após isso, velocidade fica
   * capped — só dificuldade dos obstáculos sobe (+12% a cada 3km).
   * Math: 440 * (1 + 180 * 0.0071) = 440 * 2.278 ≈ 1002 ≈ MAX.
   */
  SPEED_GROWTH_PER_100M: 0.0071,
  /** Y do chão (linha de baseline). */
  GROUND_Y: 620,
  /**
   * Altura visual da rua/chão. ROAD_TOP_Y=604, ROAD_HEIGHT=116 → cobre
   * y=604..720 (até o fim da tela). O subsolo agora fica oculto por
   * default (mostrado só em bonus tunnel / Sea), então a estrada precisa
   * preencher até a borda inferior pra não deixar gap vazio.
   */
  ROAD_TOP_Y: 604,
  ROAD_HEIGHT: 116,
  /**
   * Quanto a câmera desce ao entrar no atalho subterrâneo (BONUS tunnel).
   * Parcial — vê surface no topo + cave embaixo simultaneamente.
   */
  SUBTERRANEAN_CAMERA_SCROLL: 360,
  /** Limites verticais jogáveis dentro do subsolo. */
  SUBTERRANEAN_TOP_Y: 656,
  /** Floor mais profundo — dá ar pro jogador manobrar e visual de profundidade. */
  SUBTERRANEAN_FLOOR_Y: 1080,
  /**
   * Offset Y das FASES PERMANENTES (Sea, Space). Diferente do bonus tunnel:
   * a câmera vai pra DENTRO do offset por completo (full screen height),
   * a surface some da tela, é uma nova fase mesmo.
   *   • Sea:   +720 (camera desce uma tela inteira → underwater)
   *   • Space: −720 (camera sobe uma tela inteira → cosmos)
   * Player + obstáculos + moedas são todos shiftados pelo offset.
   */
  SEA_PHASE_OFFSET: 720,
  SPACE_PHASE_OFFSET: -720,
  /**
   * Multiplicador aplicado ao worldSpeed quando o player está se arrastando
   * (state prone). 0.8 = 20% mais lento — recompensa por slide preciso.
   */
  PRONE_SPEED_MULTIPLIER: 0.8
} as const;

/** Score & combos. */
export const SCORE = {
  /** Pontos por metro. */
  POINTS_PER_METER: 1,
  /** Distância (px) abaixo da qual considera near miss. */
  NEAR_MISS_DISTANCE: 30,
  /** Slow-mo em ms ao detectar near miss. */
  NEAR_MISS_SLOWMO_MS: 80,
  /** Incremento do multiplicador a cada near miss. */
  NEAR_MISS_STEP: 0.1,
  NEAR_MISS_CAP: 3.0,
  /** Tempo (ms) para resetar near miss multiplier sem novo near miss. */
  NEAR_MISS_DECAY_MS: 4000
  // Constantes antigas COIN_COMBO_STEP/COIN_COMBO_CAP removidas — o
  // sistema de combo agora dá BÔNUS DE MOEDAS a cada múltiplo de 10
  // (1, 2, 3, ...), sem multiplicador de score.
} as const;

/** Spawner de obstáculos — distâncias progressivas (em metros). */
export const PROGRESSION = {
  /** Bioma ativo a partir destas distâncias (8 fases). */
  BIOME_THRESHOLDS: [0, 2000, 4500, 7000, 10000, 12500, 15000, 18000],
  /** Densidade base de obstáculos (gap em px entre spawns). */
  GAP_PX_BASE: 520,
  /** Quanto o gap diminui (mais difícil) a cada 500m. */
  GAP_PX_REDUCTION: 18,
  GAP_PX_MIN: 240,
  /** Frequência de moedas (gap em px). */
  COIN_GAP_PX: 280
} as const;

/** Configuração de áudio padrão. */
export const AUDIO_DEFAULTS = {
  MUSIC_VOLUME: 0.55,
  SFX_VOLUME: 0.8,
  MUTED: false
} as const;

/**
 * Cores de UI legadas.
 * @deprecated Use `Colors` de `theme/colors.ts` em código novo.
 *             Estes tokens ainda existem para manter as scenes antigas
 *             até serem migradas, mas apontam para a paleta nova.
 */
export const UI_COLORS = {
  PRIMARY: 0x4ecdc4, // ciano (era 0x4dd6ff)
  PRIMARY_DARK: 0x2ea49b,
  ACCENT: 0xffd23f, // amarelo (era 0xffd166)
  DANGER: 0xff6b6b, // coral (era 0xff5b5b)
  SUCCESS: 0x6bcb77, // verde (era 0x66e08c)
  TEXT: 0xffffff,
  TEXT_DIM: 0xc4c8d8,
  BG_PANEL: 0x1a1d2e,
  BG_PANEL_LIGHT: 0x2a2f4a
} as const;

/** Multiplicadores de equipável por nível. */
export const EQUIPPABLE = {
  MAX_LEVEL: 10,
  /** Custo base do upgrade (multiplicado por N^1.8). */
  UPGRADE_COST_BASE: 500,
  UPGRADE_COST_EXP: 1.8,
  /** Slots de equipável: 2º desbloqueia em metros, 3º em metros. */
  SLOT_2_UNLOCK_METERS: 5000,
  SLOT_3_UNLOCK_METERS: 10000
} as const;

/** Eventos do bus interno (evita strings mágicas). */
export const EVENTS = {
  COIN_COLLECTED: 'coin_collected',
  POWERUP_COLLECTED: 'powerup_collected',
  POWERUP_EXPIRED: 'powerup_expired',
  NEAR_MISS: 'near_miss',
  PLAYER_HIT: 'player_hit',
  PLAYER_DIED: 'player_died',
  PLAYER_REVIVED: 'player_revived',
  DISTANCE_UPDATE: 'distance_update',
  SCORE_UPDATE: 'score_update',
  BIOME_CHANGED: 'biome_changed',
  /** Streak atual (número de moedas consecutivas coletadas). */
  COMBO_CHANGED: 'combo_changed',
  /** Disparado a cada múltiplo de 10 moedas: { tier, bonus, streak }. */
  COMBO_BONUS: 'combo_bonus',
  /** Disparado quando o combo quebra (moeda escapou pela esquerda). */
  COMBO_BROKEN: 'combo_broken',
  NEAR_MISS_MULTIPLIER: 'near_miss_multiplier',
  OBSTACLE_BROKEN: 'obstacle_broken'
} as const;

/** Chaves de scenes — evitar strings mágicas. */
export const SCENES = {
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  HOME: 'HomeScene',
  GAME: 'GameScene',
  GAME_OVER: 'GameOverScene',
  SHOP: 'ShopScene',
  INVENTORY: 'InventoryScene',
  MISSIONS: 'MissionsScene',
  SETTINGS: 'SettingsScene',
  LEADERBOARD: 'LeaderboardScene'
} as const;
