import React, { useCallback, useEffect, useRef, useState, useReducer } from 'react';
import { ArrowLeft, BookOpen, FileText, Monitor, Contact, Menu, Settings, Crosshair, RotateCcw, Smartphone, Volume2, HelpCircle, ArrowUpRight, Scan } from 'lucide-react';
import type { Quaternion, Vector3 } from 'three';
import { workspaceReducer } from './workspaceState';
import { WorkspaceScene } from './WorkspaceScene';
import { useDeviceLook } from './useDeviceLook';
import { initialQuality, useQualityTier, type QualityTier } from './useQualityTier';
import { workspaceItems, type WorkspaceItemId } from '../../data/workspaceManifest';
import { closeWorkspaceView, navigateHash, parseWorkspaceRoute } from '../../utils/appRoutes';
import { WorkspaceAudio } from '../../utils/workspaceAudio';
import { DocumentReader } from '../documents/DocumentReader';
import { ProjectLibrary } from '../documents/ProjectLibrary';
import { ProjectDocument } from '../documents/ProjectDocument';
import { ContactCard } from '../documents/ContactCard';
import { ResumePage } from '../ResumePage';
import { getPreloadedIntroAudio } from '../../utils/audioPreloader';
import type { Language } from '../../data/portfolio';
import { motionStyle, workspaceMotion, WORKSPACE_COMPACT_MEDIA } from '../../data/motionTokens';
import '../documents/Documents.css';
import './Workspace.css';
import { useWorkspaceInput } from './useWorkspaceInput';
import { MovementPad } from './MovementPad';
import { roomViews, type RoomView, type MoveInput, type WorkspaceInput } from './workspaceNavigation';
let osModule: Promise<typeof import('../os/ZneyOS')> | null = null;
let lastOSPath = '#/workspace/os/home';
const preloadOS = () => osModule ??= import('../os/ZneyOS').catch(error => { osModule = null; throw error; });
const icons = { paper: FileText, bookshelf: BookOpen, lanyard: Contact, screen: Monitor };

class SceneBoundary extends React.Component<{ children: React.ReactNode; onError: () => void }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.error ? null : this.props.children; }
}
export function WorkspaceController({ onBackToIntro, lang = 'eng' }: { onBackToIntro?: () => void; lang?: Language }) {
  const [hash, setHash] = useState(window.location.hash), [loaded, setLoaded] = useState(false), [progress, setProgress] = useState<number | null>(null);
  const route = parseWorkspaceRoute(hash), overlay = route.kind !== 'room';
  const [phase, dispatch] = useReducer(workspaceReducer, overlay ? route.kind === 'os' ? 'osActive' : 'reading' : 'loading');
  const pose = useRef<Quaternion | null>(null), cameraReturning = useRef(false);
  const position = useRef<Vector3 | null>(null), drive = useRef<MoveInput>({ x:0,y:0 });
  const [controlPreference, setControlPreference] = useState<'auto' | WorkspaceInput>('auto');
  const input = useWorkspaceInput(controlPreference), touch = input === 'touch';
  const [navigation, setNavigation] = useState<{ view: RoomView; serial: number }>({ view:'desk',serial:0 });
  const [activeView, setActiveView] = useState<RoomView | 'free'>('desk'), [help, setHelp] = useState(false);
  const [moving, setMoving] = useState(false);
  const [mountRoom, setMountRoom] = useState(!overlay), [error, setError] = useState(false), [retry, setRetry] = useState(0);
  const [locked, setLocked] = useState(false), [target, setTarget] = useState<WorkspaceItemId | null>(null), [focusItem, setFocusItem] = useState<WorkspaceItemId | null>(null);
  const wasLocked = useRef(false);
  const [menu, setMenu] = useState(false), [settingsOpen, setSettingsOpen] = useState(false), [hint, setHint] = useState('');
  const [labelsHelp, setLabelsHelp] = useState(0), [showLabels, setShowLabels] = useState(true);
  const [slowLoad, setSlowLoad] = useState(false), [reduced, setReduced] = useState(window.matchMedia('(prefers-reduced-motion:reduce)').matches);
  const quality = useQualityTier(), tilt = useDeviceLook(reduced), audio = useRef(new WorkspaceAudio());
  const [sound, setSound] = useState(() => { try { return localStorage.getItem('zney-workspace-sound') === 'on'; } catch { return false; } });
  const [volume, setVolume] = useState(() => { try { const saved = localStorage.getItem('zney-workspace-volume'); return saved === null ? .5 : Math.max(0, Math.min(1, Number(saved) || 0)); } catch { return .5; } }); const focusPending = useRef<WorkspaceItemId | null>(null);
  const [OS, setOS] = useState<typeof import('../os/ZneyOS').ZneyOS | null>(null), [osFailure, setOSFailure] = useState(false), [osAttempt, setOSAttempt] = useState(0);
  const [surface, setSurface] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const monitorCue = useRef(false);
  useEffect(() => { audio.current.setVolume(volume); try { localStorage.setItem('zney-workspace-volume', String(volume)); } catch { /* Optional preference storage. */ } }, [volume]);
  useEffect(() => {
    if (route.kind !== 'os') return;
    lastOSPath = hash;
    let active = true; setOSFailure(false);
    const timeout = window.setTimeout(() => { if (active && !OS) setOSFailure(true); }, 10000);
    void preloadOS().then(module => { if (active) { clearTimeout(timeout); setOS(() => module.ZneyOS); setOSFailure(false); } }).catch(() => { if (active) setOSFailure(true); });
    return () => { active = false; clearTimeout(timeout); };
  }, [route.kind, hash, osAttempt]);
  const root = useRef<HTMLDivElement>(null), exploreButton = useRef<HTMLButtonElement>(null), contentsButton = useRef<HTMLButtonElement>(null);
  const lastQualityAt = useRef(-Infinity), [renderTier, setRenderTier] = useState<QualityTier>(quality.tier);
  useEffect(() => { const sync = () => setHash(window.location.hash); window.addEventListener('hashchange', sync); window.addEventListener('popstate', sync); return () => { window.removeEventListener('hashchange', sync); window.removeEventListener('popstate', sync); }; }, []);
  useEffect(() => { const media = window.matchMedia('(prefers-reduced-motion:reduce)'); const change = () => setReduced(media.matches); media.addEventListener('change', change); return () => media.removeEventListener('change', change); }, []);
  useEffect(() => { if (!loaded) return; setShowLabels(true); const timer = window.setTimeout(() => setShowLabels(false),6000); return () => clearTimeout(timer); }, [loaded,labelsHelp]);
  useEffect(() => { const confirm = () => audio.current.play('confirm'); document.addEventListener('zney-ui-feedback', confirm); return () => document.removeEventListener('zney-ui-feedback', confirm); }, []);
  useEffect(() => { const denied = () => { setHint('Drag to look · WASD to move. Explore is unavailable here.'); root.current?.querySelector('canvas')?.focus({ preventScroll:true }); }; document.addEventListener('pointerlockerror',denied); return () => document.removeEventListener('pointerlockerror',denied); }, []);
  useEffect(() => { dispatch({ type: 'route', kind: route.kind, ready: loaded, returning: !overlay && (!!focusItem || cameraReturning.current) }); if (!overlay) { setMountRoom(true); setFocusItem(null); focusPending.current = null; } else { setMenu(false); setSettingsOpen(false); setHelp(false); if (document.pointerLockElement) document.exitPointerLock(); } }, [hash]);
  useEffect(() => { if (!mountRoom) { setRenderTier(quality.tier); return; } if (!overlay && phase === 'overview' && !menu && !settingsOpen && renderTier !== quality.tier) { dispatch({ type: 'retry' }); setLoaded(false); setRenderTier(quality.tier); setProgress(null); } }, [quality.tier, overlay, phase, menu, settingsOpen, renderTier, mountRoom]);
  useEffect(() => { if (!loaded && mountRoom) { const timer = window.setTimeout(() => setSlowLoad(true), 10000); return () => clearTimeout(timer); } setSlowLoad(false); }, [loaded, mountRoom, retry]);
  useEffect(() => { const stop = () => { if (document.hidden) { audio.current.stop(); if (document.pointerLockElement) document.exitPointerLock(); } }; const blur = () => audio.current.stop(); document.addEventListener('visibilitychange', stop); window.addEventListener('blur', blur); return () => { document.removeEventListener('visibilitychange', stop); window.removeEventListener('blur', blur); audio.current.dispose(); const intro = getPreloadedIntroAudio(); intro.pause(); }; }, []);
  const onReady = useCallback(() => { dispatch({ type: 'ready' }); setLoaded(true); const intro = getPreloadedIntroAudio(); intro.pause(); }, []);
  const fail = useCallback(() => { dispatch({ type: 'error' }); setError(true); getPreloadedIntroAudio().pause(); }, []);
  const onLock = useCallback((value: boolean) => { const releasing = wasLocked.current && !value; wasLocked.current = value; setLocked(value); dispatch({ type: 'lock', value }); if (releasing) exploreButton.current?.focus({ preventScroll: true }); }, []);
  const select = useCallback((id: WorkspaceItemId) => {
    if (focusPending.current || phase === 'returning') return;
    setMenu(false); setTarget(null); audio.current.play('select');
    if (id === 'screen') { setSurface(null); monitorCue.current = true; void preloadOS().catch(() => {}); }
    if (loaded && !error && !reduced) { focusPending.current = id; dispatch({ type: 'focus', monitor: id === 'screen' }); setFocusItem(id); }
    else navigateHash(id === 'screen' ? lastOSPath : workspaceItems.find(item => item.id === id)!.path);
  }, [loaded, error, reduced, phase]);
  const beginReaderReturn = () => { if (focusItem && !reduced) { cameraReturning.current = true; setFocusItem(null); dispatch({ type: 'route', kind: 'room', ready: loaded, returning: true }); } };
  const onFocusComplete = useCallback(() => { const id = focusPending.current; focusPending.current = null; if (id) { if (id !== 'screen') audio.current.play(id === 'paper' ? 'paper' : 'book'); navigateHash(id === 'screen' ? lastOSPath : workspaceItems.find(item => item.id === id)!.path); } }, []);
  const previousTarget = useRef<WorkspaceItemId | null>(null);
  const onTarget = useCallback((id: WorkspaceItemId | null) => { if (previousTarget.current !== id && id) audio.current.play('focus'); previousTarget.current = id; setTarget(id); }, []);
  const onSlow = useCallback(() => {
    if (quality.preference !== 'auto' || overlay || focusItem || renderTier === 'low' || performance.now() - lastQualityAt.current < 20000) return;
    lastQualityAt.current = performance.now(); quality.setAutoTier(renderTier === 'high' ? 'medium' : 'low');
  }, [quality.preference, overlay, focusItem, renderTier]);
  const onHealthy = useCallback(() => {
    const order: QualityTier[] = ['low', 'medium', 'high'];
    if (quality.preference !== 'auto' || phase !== 'overview' || menu || settingsOpen || focusItem || performance.now() - lastQualityAt.current < 20000 || order.indexOf(renderTier) >= order.indexOf(initialQuality())) return;
    lastQualityAt.current = performance.now(); quality.setAutoTier(renderTier === 'low' ? 'medium' : 'high');
  }, [quality.preference, phase, menu, settingsOpen, focusItem, renderTier]);
  const explore = () => {
    if (locked) { document.exitPointerLock(); return; }
    const canvas = root.current?.querySelector('canvas'); if (!canvas) return;
    canvas.focus({ preventScroll:true });
    const fallback = () => { setHint('Drag to look · WASD to move. Explore is unavailable here.'); canvas.focus({ preventScroll:true }); };
    if (!('requestPointerLock' in canvas)) { fallback(); return; }
    try { const result = canvas.requestPointerLock(); Promise.resolve(result).catch(fallback); }
    catch { fallback(); }
  };
  const changeView = (view: RoomView) => {
    if (document.pointerLockElement) document.exitPointerLock();
    drive.current = { x:0,y:0 }; setTarget(null); setHint('');
    setNavigation(previous => ({ view,serial:previous.serial+1 })); audio.current.play('focus');
  };
  const canControl = loaded && !error && !menu && !settingsOpen && !help && (phase === 'overview' || phase === 'exploring');
  const toggleSound = async () => { const value = !sound; setSound(value); try { localStorage.setItem('zney-workspace-sound', value ? 'on' : 'off'); } catch { /* Storage optional. */ } if (value) getPreloadedIntroAudio().pause(); await audio.current.enable(value); if (value) audio.current.play('confirm'); };
  const settings = <section className="room-settings"><p className="reader-kicker">PREFERENCES</p><h1>Make yourself comfortable.</h1>
    <label>Controls <select aria-label="Room input controls" value={controlPreference} onChange={event => setControlPreference(event.target.value as typeof controlPreference)}><option value="auto">Auto</option><option value="touch">Touch / pen</option><option value="mouse">Mouse / keyboard</option></select></label>
    <label>Sound <button onClick={toggleSound} aria-pressed={sound}><Volume2 size={18}/>{sound ? 'On' : 'Off'}</button></label>
    <label>Volume <input type="range" min="0" max="1" step=".05" value={volume} onChange={event => { const value = Number(event.target.value); setVolume(value); audio.current.setVolume(value); }}/></label>
    <label>Graphics <select aria-label="Graphics quality" value={quality.preference} onChange={event => quality.setPreference(event.target.value as typeof quality.preference)}>{['auto','low','medium','high'].map(value => <option key={value}>{value}</option>)}</select></label>
    <p className="reader-note">Auto adapts graphics to frame time. Text and documents stay available at every quality level. Active: {renderTier}.</p>
    <div className="room-tilt-controls"><button onClick={tilt.toggle} aria-pressed={tilt.enabled}><Smartphone size={18}/>{tilt.enabled ? 'Disable tilt' : 'Enable tilt'}</button><button onClick={tilt.recenter}><RotateCcw size={18}/>Recenter</button></div>
    <p role="status">{tilt.notice}</p><p>{touch ? 'Drag to look. Use the left pad to move; tap an object or the Open button to read.' : 'Drag to look, click an object to open. Focus the room or enter Explore mode to move with WASD. Escape releases the cursor.'}</p><button onClick={() => { setLabelsHelp(value => value + 1); setSettingsOpen(false); }}>Show object labels</button>
    <p className="reader-note">{reduced ? 'Reduced motion is active. Camera transitions and tilt are disabled.' : 'Motion follows your operating system preference.'}</p></section>;
  const currentTarget = workspaceItems.find(item => item.id === target);
  return <div ref={root} style={motionStyle} onClickCapture={event => { const link = (event.target as HTMLElement).closest('a'); if (link?.classList.contains('library-book')) audio.current.play('book'); if (link?.matches('.document-back,.os-back')) audio.current.play('book-close'); }} onPointerDownCapture={() => { if (sound) { getPreloadedIntroAudio().pause(); void audio.current.enable(true); } }} className="workspace-experience" data-mode={phase} data-input={input}>
    <img className="room-poster" src="./img/workspace-poster.webp" alt="" aria-hidden="true"/>
    {mountRoom && !error && <SceneBoundary key={`${retry}-${renderTier}`} onError={fail}><WorkspaceScene showLabels={showLabels} moving={moving} pose={pose} position={position} navigation={navigation} activeView={activeView} drive={drive} input={input} onViewChange={setActiveView} onMonitorSurface={setSurface} onReturnComplete={() => { cameraReturning.current = false; dispatch({ type: 'returned' }); }} target={target} tier={renderTier} paused={overlay || menu || settingsOpen || help || phase === 'returning'} reduced={reduced} locked={locked} focusItem={focusItem} tilt={tilt.offset} onSelect={select} onTarget={onTarget} onLock={onLock} onReady={onReady} onProgress={setProgress} onError={fail} onFocusComplete={onFocusComplete} recenter={tilt.recenter} onSlow={onSlow} onHealthy={onHealthy}/></SceneBoundary>}
    {!overlay && <div className="room-hud"><header><button onClick={() => { if (document.pointerLockElement) document.exitPointerLock(); onBackToIntro?.(); }}><ArrowLeft size={18}/><span>Portfolio</span></button>
      <div><button ref={contentsButton} onClick={() => setMenu(value => !value)} aria-expanded={menu}><Menu size={18}/><span>Contents</span></button>{touch && <><button onClick={() => setHelp(true)} aria-label="Room controls"><HelpCircle size={18}/></button><button onClick={() => setSettingsOpen(true)} aria-label="Workspace settings"><Settings size={18}/></button></>}</div></header>
      {touch && loaded && !error && !locked && <nav className="room-views" aria-label="Room viewpoints">{roomViews.map(view => <button key={view.id} onClick={() => changeView(view.id)} disabled={!canControl} aria-pressed={activeView === view.id}>{view.title}</button>)}</nav>}
      {!loaded && !error && !slowLoad && <div className="room-loading" role="status"><p>Opening your workspace</p><progress max="1" value={progress ?? undefined}/><small>{progress === null ? 'Loading the room…' : progress >= .99 ? 'Preparing the 3D view…' : `${Math.round(progress * 100)}% downloaded`}</small><button onClick={() => setMenu(true)}>Read content while the room loads</button></div>}
      {(error || slowLoad) && <div className="room-fallback" role="status"><h1>{error ? 'Explore the content.' : 'The room is still loading.'}</h1><p>{error ? 'The 3D view is unavailable. Your projects, resume and contact details are here.' : 'You can read everything while the room loads.'}</p><button onClick={() => setMenu(true)}>Open Contents</button>{error && <button onClick={() => { dispatch({ type: 'retry' }); setError(false); setLoaded(false); setRenderTier(quality.tier); setProgress(null); setRetry(value => value + 1); }}>Retry 3D view</button>}</div>}
      {(locked || touch && canControl) && <div className={`room-reticle${target ? ' has-target' : ''}`} aria-hidden="true"><i/>{locked && currentTarget && <span>{currentTarget.title} · Click / E</span>}</div>}
      {loaded && !error && <footer className={locked ? 'is-exploring' : ''}>
        {!touch && <button ref={exploreButton} disabled={!canControl} className="room-explore" onClick={explore}><Crosshair size={18}/>{locked ? 'Exit explore · Esc' : 'Explore · mouse + WASD'}</button>}
        {touch && canControl && <div className="room-touch-dock"><MovementPad drive={drive} onActive={setMoving}/><div className="room-touch-actions">
          <button className={`room-open-target${currentTarget ? ' has-target' : ''}`} disabled={!currentTarget} onClick={() => { if (currentTarget) select(currentTarget.id); }}><span>{currentTarget ? <ArrowUpRight size={20}/> : <Scan size={20}/>}</span><span><small>{currentTarget ? 'OPEN' : 'LOOK AT AN OBJECT'}</small><strong>{currentTarget?.title ?? 'Aim or tap to select'}</strong></span></button>
          <div className="room-tilt-controls"><button onClick={tilt.toggle} aria-pressed={tilt.enabled}><Smartphone size={18}/>{tilt.enabled ? 'Tilt on' : 'Tilt'}</button><button onClick={() => changeView(navigation.view)} aria-label="Reset room view"><RotateCcw size={18}/></button></div>
        </div></div>}
        <p className="room-hint">{hint || (locked ? 'WASD move · mouse look · click / E open · Esc exit' : touch ? 'Left pad to move · drag to look · tap to open' : 'Drag / arrow keys to look · click to open')}</p>
        <p className="room-tilt-notice" role="status">{touch && tilt.notice}</p>
      </footer>}
    </div>}
    {menu && !overlay && <DocumentReader title="Contents" storageKey="contents" onClose={() => { setMenu(false); contentsButton.current?.focus(); }}><section className="room-contents"><p className="reader-kicker">YOUR WORKSPACE</p><h1>What would you like to explore?</h1>{workspaceItems.map(item => { const Icon = icons[item.id]; return <button key={item.id} onClick={() => select(item.id)}><Icon size={24}/><span><strong>{item.title}</strong><small>{item.description}</small></span><span>↗</span></button>; })}
      {!touch && loaded && !error && <><h2>Room viewpoints</h2><nav className="room-contents-views" aria-label="Room viewpoints">{roomViews.map(view => <button key={view.id} onClick={() => { setMenu(false); changeView(view.id); }} aria-pressed={activeView === view.id}>{view.title}</button>)}</nav></>}
      <div className="room-contents-tools"><button onClick={() => { setMenu(false); setHelp(true); }}><HelpCircle size={18}/>Room controls</button><button onClick={() => { setMenu(false); setSettingsOpen(true); }}><Settings size={18}/>Settings</button></div>
    </section></DocumentReader>}
    {settingsOpen && !overlay && <DocumentReader title="Settings" storageKey="settings" onClose={() => setSettingsOpen(false)}>{settings}</DocumentReader>}
    {help && !overlay && <DocumentReader title="Room controls" storageKey="room-controls" onClose={() => setHelp(false)}><section className="room-help"><p className="reader-kicker">EXPLORE AT YOUR PACE</p><h1>Find your way around.</h1><p>{touch ? 'Choose a viewpoint along the top to see the desk, library, resume or contact card.' : 'Open Contents to choose a room viewpoint, adjust Settings or read the controls.'} Contents opens every document directly.</p>
      <h2>Touch & pen</h2><p>Drag the scene to turn. Drag the left pad to walk. Tap an object to open it, or aim the center dot at it and use Open. Two fingers on the scene cancel selection. Tilt is optional and can be centered again from Settings.</p>
      <h2>Mouse & keyboard</h2><p>Drag to turn and click an object to open. After clicking the scene, use WASD to move and arrow keys to turn. Explore hides your cursor: move the mouse to look, click or press E to open, Escape to exit.</p>
      <p className="reader-note">Movement stays in the clear aisle. Viewpoint buttons and Contents also work with keyboard navigation. Motion settings follow your device.</p></section></DocumentReader>}
    {route.kind === 'resume' && <DocumentReader title="Resume" storageKey={`resume/${route.track}`} onReturnStart={beginReaderReturn} onClose={() => closeWorkspaceView()}><ResumePage track={route.track} lang={lang} basePath="#/workspace/resume" backPath="#/workspace"/></DocumentReader>}
    {route.kind === 'library' && <DocumentReader title={route.projectId ? 'Project notes' : 'Project library'} storageKey={route.projectId ? `${route.projectId}/${route.section}` : 'library'} onReturnStart={route.projectId ? undefined : beginReaderReturn} onClose={() => closeWorkspaceView(route.projectId ? '#/workspace/library' : '#/workspace')}>
      {route.projectId ? <><a className="document-back" href="#/workspace/library" onClick={event => { event.preventDefault(); closeWorkspaceView('#/workspace/library'); }}>← Project library</a><ProjectDocument projectId={route.projectId} section={route.section} lang={lang} onSection={section => navigateHash(`#/workspace/library/${route.projectId}/${section}`, true)}/></> : <ProjectLibrary lang={lang}/>}</DocumentReader>}
    {route.kind === 'contact' && <DocumentReader title="Contact" storageKey="contact" onReturnStart={beginReaderReturn} onClose={() => closeWorkspaceView()}><ContactCard/></DocumentReader>}
    {route.kind === 'missing' && <DocumentReader title="Not found" storageKey="missing" onClose={() => navigateHash('#/workspace', true)}><h1>This page isn't here.</h1><a href="#/workspace">Back to the workspace</a></DocumentReader>}
    {route.kind === 'os' && (OS && !osFailure ? <SceneBoundary key={osAttempt} onError={() => setOSFailure(true)}><OS enterDuration={focusItem === 'screen' ? workspaceMotion(window.matchMedia(WORKSPACE_COMPACT_MEDIA).matches,reduced).monitorEnter : reduced ? 150 : 300} surface={renderTier === 'high' ? surface : null} onReady={() => { if (monitorCue.current) { monitorCue.current = false; audio.current.play('monitor'); } }} route={route} lang={lang} onExit={() => navigateHash('#/workspace', true)} settings={settings} sound={sound} onSoundChange={toggleSound} onKeySound={code => audio.current.playKeyboard(code)}/></SceneBoundary> : <DocumentReader title="Zney OS" storageKey="os-loading" onClose={() => navigateHash('#/workspace', true)}><div role="status"><h1>{osFailure ? 'Zney OS could not open.' : 'Opening Zney OS…'}</h1><p>Your documents are still available from Contents.</p>{osFailure && <button className="reader-primary" onClick={() => { setOS(null); setOSAttempt(value => value + 1); }}>Retry</button>}<button className="reader-primary" onClick={() => navigateHash('#/workspace', true)}>Back to room</button></div></DocumentReader>)}
  </div>;
}
