import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { CAPTURE, captureState } from '../capture/flag';
import type { FlightFeed } from '../lib/flightFeed';
import { formatCap, type BandState } from '../lib/flightModel';
import type { SkyState } from '../lib/sky';
import type { ManualControls } from '../lib/manualControls';
import type { WalletState } from '../lib/useWallet';
import { COIN_POINTS, LANES, newRailGame, startRailGame, steer, type HazardKind, type RailGame } from '../lib/railGame';
import { hasBoard, keepBest, postScore, readBest, startRun } from '../lib/scoresApi';
import Wordmark from './Wordmark';
import DocsLink from './DocsLink';
import SplitFlapBoard from './SplitFlapBoard';
import Wasted from './Wasted';
import { DeckIcon } from './InstrumentDeck';

const RailLandingScene = lazy(() => import('./RailLandingScene'));
const RailGameScene = lazy(() => import('./RailGameScene'));
const ScoresDialog = lazy(() => import('./ScoresDialog'));
const PHRASES = [['SEAT RAILWAY', 'ALL ABOARD']];
const SOUND = (file: string) => `${import.meta.env.BASE_URL}${file}`;

/** Seconds of 3, 2, 1 before the train is handed over. */
const COUNT_FROM = 3;
/** How long after the hit the verdict comes up: WASTED lands 1.25 s in (see `.sa-wasted__word`). */
const VERDICT_AFTER = 1300;

/** What hit what, for the verdict. */
const HIT: Record<HazardKind, string> = {
  oncoming: 'Head-on with an oncoming train',
  wagons: 'Into a rake of standing wagons',
  rocks: 'Derailed by a rockfall',
  buffer: 'Through the buffer stops',
};

/* The crash sounds, as on Seat Airlines' landing: one at random, never the
   same twice running, each started so its big moment lands with WASTED. */
const LOSSES = [
  { sound: 'wasted', from: 1.2, wait: 0 },
  { sound: 'fahh', from: 0, wait: 1.05 },
  { sound: 'trombone', from: 0, wait: 1.2 },
] as const;
let lastLoss = -1;
const pickLoss = () => {
  let i = Math.floor(Math.random() * (lastLoss < 0 ? LOSSES.length : LOSSES.length - 1));
  if (lastLoss >= 0 && i >= lastLoss) i++;
  lastLoss = i;
  return LOSSES[i];
};

type Sounds = Record<'track' | 'horn' | 'bell' | 'wasted' | 'fahh' | 'trombone' | 'crowd', HTMLAudioElement>;

type Result = { score: number; seconds: number; coins: number; metres: number; speed: number; hit: HazardKind; best: boolean };

export default function RailwayLanding({ feed, sky, band, marketCap, controls, taken, wallet, onEnter, soundEnabled, onSoundToggle }: {
  feed: FlightFeed; sky: SkyState; band: BandState; marketCap: number; controls: ManualControls;
  taken: ReadonlySet<string>; wallet: WalletState; onEnter: () => void; soundEnabled: boolean; onSoundToggle: () => void;
}) {
  const [splash, setSplash] = useState(true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [count, setCount] = useState(0);
  const [crashed, setCrashed] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [runaway, setRunaway] = useState(false);
  const [lane, setLane] = useState(1);
  const [pops, setPops] = useState<number[]>([]);
  const [scores, setScores] = useState(false);
  const [runNumber, setRunNumber] = useState(0);
  const [post, setPost] = useState('');
  const game = useRef(newRailGame());
  const run = useRef<Promise<string | null>>(Promise.resolve(null));
  const scoreRead = useRef<HTMLSpanElement>(null);
  const speedRead = useRef<HTMLSpanElement>(null);
  const coinRead = useRef<HTMLSpanElement>(null);
  const sounds = useRef<Sounds | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const timers = useRef<number[]>([]);
  const gesture = useRef<{ x: number; y: number; done: boolean } | null>(null);
  const soundOn = useRef(soundEnabled);
  soundOn.current = soundEnabled;
  const onReady = useCallback(() => setReady(true), []);
  const onFail = useCallback(() => { setFailed(true); setPlaying(false); }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => setSplash(false), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1200 : 2600);
    return () => window.clearTimeout(timer);
  }, []);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
  useEffect(() => () => { timers.current.forEach((t) => window.clearTimeout(t)); sounds.current?.track.pause(); }, []);

  /* Made inside the click that starts a run, so the browser lets them play. */
  const makeSounds = () => {
    if (!audio.current) {
      try { audio.current = new AudioContext(); } catch { /* no Web Audio: no blips */ }
    }
    if (sounds.current) return;
    const load = (file: string, volume: number) => { const a = new Audio(SOUND(file)); a.preload = 'auto'; a.volume = volume; return a; };
    const track = load('rail/track-loop.mp3', 0.45);
    track.loop = true;
    sounds.current = {
      track,
      horn: load('rail/horn-2.mp3', 0.7),
      bell: load('rail/crossing-bell.mp3', 0.7),
      wasted: load('wasted.mp3', 1),
      fahh: load('fail-fahh.mp3', 0.7),
      trombone: load('fail-trombone.mp3', 0.9),
      crowd: load('crash-crowd.mp3', 0.8),
    };
  };
  const play = (name: keyof Sounds, from = 0) => {
    const a = sounds.current?.[name];
    if (!a || !soundOn.current) return;
    a.currentTime = from;
    void a.play().catch(() => {});
  };
  /** A token picked up: a bright two-note chime, made on the spot. */
  const chime = () => {
    const ctx = audio.current;
    if (!ctx || !soundOn.current) return;
    const t = ctx.currentTime;
    [880, 1318].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + i * 0.07);
      g.gain.exponentialRampToValueAtTime(0.18, t + i * 0.07 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.07 + 0.22);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.07);
      o.stop(t + i * 0.07 + 0.25);
    });
  };
  useEffect(() => {
    const track = sounds.current?.track;
    if (!track) return;
    if (soundEnabled && playing && !crashed && count === 0) void track.play().catch(() => {});
    else track.pause();
  }, [soundEnabled, playing, crashed, count]);

  const drive = useCallback(() => {
    makeSounds();
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    game.current = newRailGame();
    setResult(null); setCrashed(false); setRunaway(false); setLane(1); setPops([]); setPost('');
    setPlaying(true);
    setRunNumber((n) => n + 1);
    setCount(COUNT_FROM);
    for (let i = 1; i <= COUNT_FROM; i++) {
      later(() => {
        setCount(COUNT_FROM - i);
        if (i === COUNT_FROM) { startRailGame(game.current); run.current = startRun(); }
      }, i * 650);
    }
  }, []);
  const leave = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setPlaying(false); setCount(0);
  }, []);
  if (CAPTURE) Object.assign(captureState.app, { fly: drive, leave: onEnter });

  const turn = (dir: -1 | 1) => {
    steer(game.current, dir);
    setLane(game.current.lane);
  };
  useEffect(() => {
    if (!playing) return;
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.matches('input, textarea, select')) return;
      const k = e.key.toLowerCase();
      if (e.key === 'Escape') { leave(); return; }
      if (e.key === 'ArrowLeft' || k === 'a') { e.preventDefault(); turn(-1); }
      if (e.key === 'ArrowRight' || k === 'd') { e.preventDefault(); turn(1); }
      if ((e.key === 'Enter' || e.code === 'Space') && result) { e.preventDefault(); drive(); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [playing, result, drive, leave]);

  /* A swipe either way, or a tap on either side of the screen. */
  const onPointerDown = (e: React.PointerEvent) => { gesture.current = { x: e.clientX, y: e.clientY, done: false }; };
  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g || g.done) return;
    const dx = e.clientX - g.x;
    if (Math.abs(dx) > 34 && Math.abs(dx) > Math.abs(e.clientY - g.y)) { g.done = true; turn(dx > 0 ? 1 : -1); }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g || g.done) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    turn(e.clientX < r.left + r.width / 2 ? -1 : 1);
  };

  const onUpdate = (g: RailGame) => {
    if (scoreRead.current) scoreRead.current.textContent = g.score.toLocaleString('en-US');
    if (speedRead.current) speedRead.current.textContent = String(Math.round((g.phase === 'crashed' ? g.crashSpeed : g.speed) * 3.6));
    if (coinRead.current) coinRead.current.textContent = String(g.coins);
    if (!g.events.length) return;
    for (const ev of g.events) {
      if (ev === 'coin') { chime(); setPops((p) => [...p.slice(-3), g.coins]); }
      else if (ev === 'horn') play('horn');
      else if (ev === 'runaway') { setRunaway(true); play('bell'); later(() => setRunaway(false), 2600); }
      else if (ev === 'crash') {
        setCrashed(true);
        const loss = pickLoss();
        later(() => play(loss.sound, loss.from), loss.wait * 1000);
        later(() => play('crowd'), 1700);
        const best = g.score > readBest();
        if (best) keepBest(g.score);
        const done: Result = { score: g.score, seconds: g.seconds, coins: g.coins, metres: Math.floor(g.distance), speed: g.crashSpeed, hit: g.hitKind ?? 'buffer', best };
        later(() => setResult(done), VERDICT_AFTER);
      }
    }
    g.events.length = 0;
  };

  const publish = async () => {
    if (!result) return;
    try {
      setPost('Connecting…');
      const address = wallet.address ?? await wallet.connect();
      if (!address) throw new Error('Connect your Solana wallet to post.');
      const id = await run.current;
      if (!id) throw new Error('Leaderboard unavailable. Your best is saved on this device.');
      setPost('Check your wallet…');
      const posted = await postScore({ address, run: id, score: result.score, survived: result.seconds, climb: result.coins, sign: wallet.signMessage });
      setPost(`On the board${posted.rank ? ` · #${posted.rank}` : ''}`);
    } catch (e) { setPost(e instanceof Error ? e.message : 'Score could not be posted.'); }
  };
  const busy = post.startsWith('Connecting') || post.startsWith('Check');

  return (
    <div className={`sa-landing is-idle${playing ? ' rail-driving' : ''}`}>
      <div className="sa-landing__scene">
        {!failed && <Suspense fallback={null}>
          {playing ? <RailGameScene key={runNumber} feed={feed} sky={sky} band={band} game={game} onUpdate={onUpdate} onFail={onFail} /> :
            <RailLandingScene feed={feed} sky={sky} band={band} taken={taken} controls={controls} onReady={onReady} onFail={onFail} />}
        </Suspense>}
      </div>
      <div className="sa-landing__scrim" aria-hidden />
      <header className="sa-landing__top">
        <span className="sa-landing__brandbox"><Wordmark className="sa-landing__brand" /></span>
        <span className="sa-landing__live"><span className="sa-live" aria-hidden /><span>Live</span><span>{formatCap(marketCap)}</span></span>
        {!playing && <DocsLink night />}
      </header>
      {!playing ? <main className="sa-landing__hero">
        <h1 className="sa-landing__title">Hold more.<br />Ride longer.</h1>
        <p className="sa-landing__lead">Market cap is the length of the train. The biggest holders ride up front.</p>
        <div className="sa-landing__actions">
          <button className="sa-landing__enter" onClick={onEnter}>All aboard <span aria-hidden>→</span></button>
          {!failed && <button className="sa-landing__fly" onClick={drive} disabled={!ready}><DeckIcon name="train" /> Runaway</button>}
          <button className="sa-pilots" onClick={() => setScores(true)}><DeckIcon name="trophy" /> Scores</button>
          <button className="sa-pilots" onClick={onSoundToggle} aria-pressed={soundEnabled}><DeckIcon name={soundEnabled ? 'sound' : 'mute'} />{soundEnabled ? 'Sound' : 'Muted'}</button>
        </div>
      </main> : <>
        {/* The whole view takes a tap or a swipe; the readouts and buttons sit above it. */}
        {!result && <div className="rail-run__pad" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => { gesture.current = null; }} aria-hidden />}
        {!result && <div className="rail-run__hud" aria-live="off">
          <div className="rail-run__score"><span ref={scoreRead}>0</span><small>points</small></div>
          <div className="rail-run__reads">
            <span><b ref={speedRead}>0</b> km/h</span>
            <span className="rail-run__coins"><i aria-hidden /> <b ref={coinRead}>0</b></span>
          </div>
          <div className="rail-run__lanes" aria-label={`Track ${lane + 1} of ${LANES}`}>
            {Array.from({ length: LANES }, (_, i) => <span key={i} className={i === lane ? 'is-on' : ''} />)}
          </div>
          <button className="rail-run__quit" onClick={leave} aria-label="Leave Runaway">×</button>
        </div>}
        {pops.map((n) => <span key={n} className="rail-run__pop" aria-hidden>+{COIN_POINTS}</span>)}
        {count > 0 && <div className="rail-run__count" aria-live="assertive">
          <strong key={count}>{count}</strong>
          <p>No brakes. Switch tracks to stay alive.</p>
          <p className="rail-run__keys"><kbd>←</kbd> <kbd>→</kbd> or tap either side</p>
        </div>}
        {runaway && !crashed && <div className="rail-run__alarm" role="alert"><strong>Brakes gone</strong><span>Runaway!</span></div>}
        {crashed && <><div className="sa-landing__flash" aria-hidden /><div className="sa-landing__redout" aria-hidden /></>}
        {result && <div className="sa-landing__end sa-landing__end--crash" role="status">
          <div className="sa-wasted"><Wasted className="sa-wasted__word" /></div>
          <div className="sa-landing__end-after">
            <div className="sa-landing__tally">
              <p className="sa-landing__score">
                {result.score.toLocaleString('en-US')}
                {result.best && result.score > 0 && <span className="sa-landing__best">New best</span>}
              </p>
              <p className="sa-landing__end-note">
                {HIT[result.hit]} at {Math.round(result.speed * 3.6)} km/h · {(result.metres / 1000).toFixed(2)} km · {result.coins} token{result.coins === 1 ? '' : 's'} · {Math.round(result.seconds)} s
              </p>
            </div>
            {post && <p className={`sa-landing__posted${post.startsWith('On the board') || busy ? '' : ' is-error'}`} role="status">{post}</p>}
            <div className="sa-landing__end-actions">
              {hasBoard && <button className="sa-landing__post" onClick={() => void publish()} disabled={busy || post.startsWith('On the board')}>
                {busy ? post : wallet.address ? 'Sign & post' : 'Connect & post'}
              </button>}
              <button className="sa-landing__post" onClick={drive}>Again</button>
              <button className="sa-landing__enter" onClick={onEnter}>All aboard <span aria-hidden>→</span></button>
            </div>
            {hasBoard && !post && <p className="sa-landing__fine">Posting signs a message. No transaction.</p>}
          </div>
        </div>}
      </>}
      {splash && <div className="rail-splash" aria-label="SEAT RAILWAY. All aboard."><SplitFlapBoard phrases={PHRASES} loop={false} /><button onClick={() => setSplash(false)}>Skip</button></div>}
      {scores && <Suspense fallback={null}><ScoresDialog address={wallet.address} onClose={() => setScores(false)} /></Suspense>}
    </div>
  );
}
