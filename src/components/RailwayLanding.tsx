import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { CAPTURE, captureState } from '../capture/flag';
import type { FlightFeed } from '../lib/flightFeed';
import { formatCap, type BandState } from '../lib/flightModel';
import type { SkyState } from '../lib/sky';
import type { ManualControls } from '../lib/manualControls';
import type { WalletState } from '../lib/useWallet';
import { newRailGame, STOP_DISTANCE, type RailGame } from '../lib/railGame';
import { hasBoard, keepBest, postScore, readBest, startRun } from '../lib/scoresApi';
import Wordmark from './Wordmark';
import DocsLink from './DocsLink';
import SplitFlapBoard from './SplitFlapBoard';
import { DeckIcon } from './InstrumentDeck';

const RailLandingScene = lazy(() => import('./RailLandingScene'));
const RailGameScene = lazy(() => import('./RailGameScene'));
const ScoresDialog = lazy(() => import('./ScoresDialog'));
const PHRASES = [['SEAT RAILWAY', 'ALL ABOARD']];

export default function RailwayLanding({ feed, sky, band, marketCap, controls, taken, wallet, onEnter, soundEnabled, onSoundToggle }: {
  feed: FlightFeed; sky: SkyState; band: BandState; marketCap: number; controls: ManualControls;
  taken: ReadonlySet<string>; wallet: WalletState; onEnter: () => void; soundEnabled: boolean; onSoundToggle: () => void;
}) {
  const [splash, setSplash] = useState(true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [result, setResult] = useState<RailGame | null>(null);
  const [scores, setScores] = useState(false);
  const [power, setPower] = useState(0);
  const [runNumber, setRunNumber] = useState(0);
  const [post, setPost] = useState('');
  const game = useRef(newRailGame());
  const run = useRef<Promise<string | null>>(Promise.resolve(null));
  const speedRead = useRef<HTMLSpanElement>(null);
  const distanceRead = useRef<HTMLSpanElement>(null);
  const brakeRead = useRef<HTMLSpanElement>(null);
  const onReady = useCallback(() => setReady(true), []);
  const onFail = useCallback(() => { setFailed(true); setPlaying(false); }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => setSplash(false), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1200 : 2600);
    return () => window.clearTimeout(timer);
  }, []);
  const drive = useCallback(() => {
    game.current = { ...newRailGame(), phase: 'driving' }; setResult(null); setPlaying(true); setPower(0); setPost('');
    setRunNumber((n) => n + 1);
    run.current = startRun();
  }, []);
  if (CAPTURE) Object.assign(captureState.app, { fly: drive, leave: onEnter });
  const setLever = (value: number) => { const next = Math.max(-1, Math.min(1, value)); game.current.power = next; setPower(next); };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!playing || game.current.phase !== 'driving') return;
      if (e.key === 'Escape') { setPlaying(false); return; }
      if ((e.target as HTMLElement)?.matches('input, textarea, select')) return;
      if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') { e.preventDefault(); setLever(game.current.power + 0.2); }
      if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') { e.preventDefault(); setLever(game.current.power - 0.2); }
      if (e.code === 'Space') { e.preventDefault(); setLever(-1); }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [playing]);
  const onUpdate = (g: RailGame) => {
    if (speedRead.current) speedRead.current.textContent = String(Math.round(g.speed * 3.6));
    if (distanceRead.current) distanceRead.current.textContent = String(Math.round(STOP_DISTANCE - g.distance));
    if (brakeRead.current) brakeRead.current.textContent = String(Math.round(g.speed * g.speed / (2 * 2.545)));
    if (!result && (g.phase === 'complete' || g.phase === 'missed')) {
      if (g.score > readBest()) keepBest(g.score);
      setResult({ ...g });
    }
  };
  const publish = async () => {
    if (!result || result.phase !== 'complete') return;
    try {
      setPost('Connecting...');
      const address = wallet.address ?? await wallet.connect();
      if (!address) throw new Error('Connect your Solana wallet to post.');
      const id = await run.current;
      if (!id) throw new Error('Leaderboard unavailable. Your best is saved on this device.');
      setPost('Sign your score in your wallet');
      const posted = await postScore({ address, run: id, score: result.score, survived: result.seconds, climb: Math.abs(result.error), sign: wallet.signMessage });
      setPost(`Posted${posted.rank ? ` / #${posted.rank}` : ''}`);
    } catch (e) { setPost(e instanceof Error ? e.message : 'Score could not be posted.'); }
  };
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
          {!failed && <button className="sa-landing__fly" onClick={drive} disabled={!ready}><DeckIcon name="train" /> Drive</button>}
          <button className="sa-pilots" onClick={() => setScores(true)}><DeckIcon name="trophy" /> Scores</button>
          <button className="sa-pilots" onClick={onSoundToggle} aria-pressed={soundEnabled}><DeckIcon name={soundEnabled ? 'sound' : 'mute'} />{soundEnabled ? 'Sound' : 'Muted'}</button>
        </div>
      </main> : <>
        <div className="rail-game-top">
          <div><span>Speed</span><strong><span ref={speedRead}>0</span><small> km/h</small></strong></div>
          <div><span>Stop marker</span><strong><span ref={distanceRead}>{Math.round(STOP_DISTANCE)}</span><small> m</small></strong></div>
          <div><span>Braking distance</span><strong><span ref={brakeRead}>0</span><small> m</small></strong></div>
          <button onClick={() => setPlaying(false)} aria-label="Leave the driving challenge">×</button>
        </div>
        {!result && <div className="rail-game-controls">
          <div className="rail-game-lever"><label htmlFor="rail-power">{power < 0 ? 'Brake' : power > 0 ? 'Power' : 'Coast'} · {Math.round(Math.abs(power) * 100)}%</label>
            <input id="rail-power" type="range" min="-1" max="1" step="0.05" value={power} onChange={(e) => setLever(Number(e.target.value))} aria-label="Train power and brake" />
            <div><span>Brake</span><span>Coast</span><span>Power</span></div>
          </div>
          <button onClick={() => setLever(-1)} className="rail-emergency">Emergency brake</button>
        </div>}
        {result && <div className="rail-result" role="status">
          <p className="sa-modal__eyebrow">Station stop</p>
          <h2>{result.phase === 'complete' ? 'Doors released.' : 'Stop missed.'}</h2>
          <p>{result.phase === 'complete' ? `${Math.abs(result.error).toFixed(1)} m from the marker · ${Math.round(result.seconds)} s` : 'The platform is behind you.'}</p>
          <strong>{result.score.toLocaleString()}<small> points</small></strong>
          <div className="sa-landing__actions">
            <button className="sa-landing__enter" onClick={drive}>Again</button>
            <button className="sa-pilots" onClick={onEnter}>All aboard</button>
            {hasBoard && result.phase === 'complete' && <button className="sa-pilots" onClick={() => void publish()} disabled={post.startsWith('Posted') || post.startsWith('Connecting') || post.startsWith('Sign')}>Post score</button>}
          </div>
          {post && <p>{post}</p>}
        </div>}
      </>}
      {splash && <div className="rail-splash" aria-label="SEAT RAILWAY. All aboard."><SplitFlapBoard phrases={PHRASES} loop={false} /><button onClick={() => setSplash(false)}>Skip</button></div>}
      {scores && <Suspense fallback={null}><ScoresDialog address={wallet.address} onClose={() => setScores(false)} /></Suspense>}
    </div>
  );
}
