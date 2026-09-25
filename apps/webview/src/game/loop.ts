import { haptic } from '../bridge';
import { RESTART_DELAY_MS, TICK_MS } from './constants';
import { beginRun, createGame, resultOf, step, type GameOptions, type GameResult, type GameState, type Input } from './engine';
import { Renderer, type Overlay } from './render/draw';
import { newSeed } from './rng';
import { loadHighScore, saveHighScore } from './score';

export type Phase = 'ready' | 'running' | 'paused' | 'crashed';

export interface LoopCallbacks {
  onPhase(phase: Phase): void;
  /** A new run begins — the first one or a restart, not a resume from pause. */
  onRunStart(): void;
  /** One place every finished run passes through; a leaderboard submit hooks in here. */
  onGameOver(result: GameResult, best: { hi: number; isNew: boolean }): void;
}

/** Longest stretch simulated after a stall, so a hitch does not fast-forward into a crash. */
const MAX_FRAME_MS = 250;

/**
 * Runs the simulation at a fixed 60 Hz whatever the display rate, and draws in
 * between with interpolation. The fixed step is what makes a run replayable from
 * its seed and inputs; drawing at the display rate is what keeps a 120 Hz phone
 * smooth.
 */
export class GameLoop {
  private state: GameState;
  private readonly renderer: Renderer;
  private queue: Input[] = [];
  private acc = 0;
  private last = 0;
  private raf = 0;
  private phase: Phase = 'ready';
  private readonly overlay: Overlay;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly callbacks: LoopCallbacks,
    private readonly options: GameOptions & { debug?: boolean } = {},
  ) {
    this.renderer = new Renderer(canvas);
    this.state = createGame(newSeed(), options);
    this.overlay = { hi: loadHighScore(), flashUntil: 0, crashedAt: null, doubleJump: null, debug: !!options.debug };
  }

  start(): void {
    this.last = performance.now();
    const frame = (now: number) => {
      this.frame(now);
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
  }

  resize(w: number, h: number, dpr: number): void {
    this.renderer.resize(w, h, dpr);
    this.renderer.render(this.state, 1, performance.now(), this.overlay);
  }

  /** Every press and release from the player comes through here. */
  input(i: Input): void {
    const pressed = i === 'jump' || i === 'duck';
    if (this.phase === 'crashed') {
      if (pressed) this.restart();
      return;
    }
    if (this.phase === 'paused') {
      if (pressed) this.resume();
      return;
    }
    if (this.phase === 'ready') {
      // The first press starts the run and also counts, so a jump press jumps.
      if (!pressed) return;
      this.run();
    }
    this.queue.push(i);
  }

  private run(): void {
    beginRun(this.state);
    this.callbacks.onRunStart();
    this.last = performance.now();
    this.acc = 0;
    this.setPhase('running');
  }

  /** Start over, if the crash has had its moment. */
  restart(): void {
    const at = this.overlay.crashedAt;
    if (at !== null && performance.now() - at < RESTART_DELAY_MS) return;
    this.state = createGame(newSeed(), this.options);
    this.renderer.reset();
    this.overlay.crashedAt = null;
    this.overlay.doubleJump = null;
    this.queue = [];
    // Straight back into a run, as in the original; the title is for the first one.
    this.run();
  }

  /** The app went to the background mid-run. */
  pause(): void {
    if (this.phase !== 'running') return;
    // Whatever was held is released; the fingers are gone by the time it resumes.
    step(this.state, ['jumpEnd', 'duckEnd']);
    this.setPhase('paused');
  }

  private resume(): void {
    this.last = performance.now();
    this.acc = 0;
    this.setPhase('running');
  }

  private setPhase(phase: Phase): void {
    if (this.phase === phase) return;
    this.phase = phase;
    this.callbacks.onPhase(phase);
  }

  private frame(now: number): void {
    const dt = Math.min(now - this.last, MAX_FRAME_MS);
    this.last = now;

    if (this.phase === 'running') {
      this.acc += dt;
      while (this.acc >= TICK_MS && this.phase === 'running') {
        this.tick(now);
        this.acc -= TICK_MS;
      }
    }
    const alpha = this.phase === 'running' ? this.acc / TICK_MS : 1;
    this.renderer.render(this.state, alpha, now, this.overlay);
  }

  private tick(now: number): void {
    const inputs = this.queue;
    this.queue = [];
    step(this.state, inputs);
    for (const e of this.state.events) {
      switch (e.type) {
        case 'milestone':
          this.overlay.flashUntil = now + 900;
          haptic('light');
          break;
        case 'crash':
          this.crash(now);
          break;
        case 'jump':
          if (e.double) this.overlay.doubleJump = { at: now, y: this.state.player.jumpBase };
          break;
      }
    }
  }

  private crash(now: number): void {
    this.overlay.crashedAt = now;
    haptic('heavy');
    const result = resultOf(this.state);
    // A run started partway in (`?score=`, `?speed=`) did not earn its score.
    const rigged =
      this.options.startScore !== undefined || this.options.startSpeed !== undefined || this.options.only !== undefined;
    const isNew = !rigged && result.score > this.overlay.hi;
    if (isNew) {
      this.overlay.hi = result.score;
      saveHighScore(result.score);
    }
    this.setPhase('crashed');
    this.callbacks.onGameOver(result, { hi: this.overlay.hi, isNew });
  }
}
