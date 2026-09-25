import { useEffect, useRef, useState } from 'react';
import type { GameResult } from './game/engine';
import type { ObstacleKind } from './game/obstacles';
import { bindInput } from './game/input';
import { GameLoop, type Phase } from './game/loop';
import { formatScore, loadHighScore } from './game/score';

/**
 * `?debug=1` draws hitboxes; `?speed=` and `?score=` start partway into a run;
 * `?only=bus` (or ripple, wave) spawns a single kind of obstacle.
 */
function debugOptions() {
  const q = new URLSearchParams(window.location.search);
  const num = (key: string) => {
    const v = Number(q.get(key));
    return q.has(key) && Number.isFinite(v) ? v : undefined;
  };
  const only = q.get('only');
  const kinds: readonly ObstacleKind[] = ['ripple', 'wave', 'bus'];
  return {
    debug: q.get('debug') === '1',
    startSpeed: num('speed'),
    startScore: num('score'),
    only: kinds.find((k) => k === only),
  };
}

/** The result card's headline, by what ended the run. */
const CRASH_LINE: Record<ObstacleKind, string> = {
  ripple: '파도에 휩쓸렸어요!',
  wave: '큰 파도에 휩쓸렸어요!',
  bus: '인자셔틀에 실려 갔어요!',
};

interface Over {
  result: GameResult;
  hi: number;
  isNew: boolean;
}

/** Must match the `.fade` animation in index.css. */
const HINT_MS = 2500;

export default function App() {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loopRef = useRef<GameLoop | null>(null);
  const [phase, setPhase] = useState<Phase>('ready');
  const [over, setOver] = useState<Over | null>(null);
  const [hi, setHi] = useState(loadHighScore);
  /** Counts run starts, so each one remounts the hint and replays its fade. */
  const [runs, setRuns] = useState(0);
  const [hint, setHint] = useState(false);

  useEffect(() => {
    const stage = stageRef.current!;
    const loop = new GameLoop(
      canvasRef.current!,
      {
        onPhase: setPhase,
        onRunStart: () => {
          setRuns((n) => n + 1);
          setHint(true);
        },
        onGameOver: (result, best) => {
          setOver({ result, ...best });
          setHi(best.hi);
        },
      },
      debugOptions(),
    );
    loopRef.current = loop;

    const fit = () => {
      const r = stage.getBoundingClientRect();
      loop.resize(r.width, r.height, window.devicePixelRatio || 1);
    };
    const observer = new ResizeObserver(fit);
    observer.observe(stage);
    fit();

    const unbind = bindInput(stage, (i) => loop.input(i));
    const onVisibility = () => {
      if (document.hidden) loop.pause();
    };
    document.addEventListener('visibilitychange', onVisibility);
    loop.start();

    return () => {
      loop.stop();
      unbind();
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // The controls flash up at the start of every run, restarts included.
  useEffect(() => {
    if (!hint) return;
    const id = setTimeout(() => setHint(false), HINT_MS);
    return () => clearTimeout(id);
  }, [hint, runs]);

  return (
    <div className="page">
      <div className="stage" ref={stageRef}>
        <canvas ref={canvasRef} className="canvas" />

        {phase === 'ready' && (
          <>
            <header className="sky title">
              <p className="eyebrow">2026 ESKARA 미니게임</p>
              <h1>초록의 파도</h1>
              <p className="sub">파도와 인자셔틀을 넘어 끝까지 달려요</p>
              {hi > 0 && <p className="best">최고 기록 {formatScore(hi)}</p>}
            </header>
            <div className="field">
              <Controls />
              <p className="blink">화면을 눌러 시작</p>
            </div>
          </>
        )}

        {phase === 'running' && hint && (
          <div key={runs} className="field fade">
            <Controls />
          </div>
        )}

        {phase === 'paused' && (
          <div className="sky">
            <div className="card">
              <p className="card-title">잠깐 멈췄어요</p>
              <p className="card-sub">화면을 눌러 이어 달리기</p>
            </div>
          </div>
        )}

        {phase === 'crashed' && over && (
          <div className="sky">
            <div className="card">
              <p className="card-title">{over.result.hit ? CRASH_LINE[over.result.hit] : '파도에 휩쓸렸어요!'}</p>
              <p className="score">{over.result.score.toLocaleString('ko-KR')}</p>
              <p className="card-sub">
                최고 기록 {formatScore(over.hi)}
                {over.isNew && <span className="new">NEW</span>}
              </p>
              <button
                type="button"
                className="again"
                // The stage treats any press as game input; this one is a button.
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => loopRef.current?.restart()}
              >
                다시 달리기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Controls() {
  return (
    <div className="controls" aria-hidden>
      <div className="zone">
        <span className="key">꾹</span>
        <span>
          누르고 있으면 숙이기
          <br />
          공중에선 빨리 착지
        </span>
      </div>
      <div className="divider" />
      <div className="zone">
        <span className="key">탭</span>
        <span>
          누르면 점프 · 길게 누르면 높이
          <br />
          공중에서 또 누르면 이단 점프
        </span>
      </div>
    </div>
  );
}
