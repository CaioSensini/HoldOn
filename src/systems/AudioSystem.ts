import { GameState } from '../data/GameState';

/**
 * Áudio procedural mínimo via Web Audio API.
 * Gera tons curtos para coin/woosh/impact até termos arquivos reais.
 *
 * TODO: substituir por Phaser sound manager quando arquivos estiverem em
 * public/assets/audio/. Manter a mesma interface (playCoin, playPowerUp, etc.).
 */
export class AudioSystem {
  private static _instance: AudioSystem | null = null;
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  static instance(): AudioSystem {
    if (!this._instance) this._instance = new AudioSystem();
    return this._instance;
  }

  private ensureCtx(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const Ctor =
        (window as unknown as { AudioContext: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
          .AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.ctx.destination);
      this.sfxGain.connect(this.ctx.destination);
      this.applyVolumes();
      return this.ctx;
    } catch {
      return null;
    }
  }

  applyVolumes(): void {
    const settings = GameState.instance().get().settings;
    if (this.musicGain) this.musicGain.gain.value = settings.musicVolume;
    if (this.sfxGain) this.sfxGain.gain.value = settings.sfxVolume;
  }

  /** Toca uma nota simples (oscilador). */
  private tone(opts: {
    freq: number;
    durationMs: number;
    type?: OscillatorType;
    volume?: number;
    decay?: number;
  }): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxGain) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type ?? 'sine';
    osc.frequency.value = opts.freq;
    gain.gain.value = (opts.volume ?? 0.25);
    gain.gain.setValueAtTime(opts.volume ?? 0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (opts.decay ?? opts.durationMs / 1000));
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(ctx.currentTime + opts.durationMs / 1000);
  }

  /** Coin com nota crescente baseada no combo. */
  playCoin(combo = 1): void {
    const base = 660;
    const freq = base * Math.pow(2, (combo - 1) * 0.08);
    this.tone({ freq, durationMs: 90, type: 'triangle', volume: 0.18 });
  }

  /** Power-up: harmônica curta. */
  playPowerUp(): void {
    this.tone({ freq: 440, durationMs: 90, type: 'sawtooth', volume: 0.18 });
    setTimeout(() => this.tone({ freq: 660, durationMs: 100, type: 'sawtooth', volume: 0.18 }), 60);
    setTimeout(() => this.tone({ freq: 880, durationMs: 140, type: 'triangle', volume: 0.2 }), 120);
  }

  /** Impacto/morte. */
  playImpact(): void {
    this.tone({ freq: 110, durationMs: 220, type: 'sawtooth', volume: 0.35, decay: 0.18 });
  }

  /** Whoosh — usado em rocket / boost. */
  playWoosh(): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxGain) return;
    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
    noise.buffer = buf;
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 600;
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start();
    noise.stop(ctx.currentTime + 0.3);
  }

  /** Click/UI tap. */
  playClick(): void {
    this.tone({ freq: 800, durationMs: 60, type: 'square', volume: 0.1 });
  }

  /** Near miss — sutil. */
  playNearMiss(): void {
    this.tone({ freq: 1320, durationMs: 80, type: 'triangle', volume: 0.12 });
  }
}
