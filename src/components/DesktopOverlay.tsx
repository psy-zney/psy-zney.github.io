import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

type KeySpec = { label: string; code: string; width?: number };

const KEY_ROWS: KeySpec[][] = [
  [
    { label: 'ESC', code: 'Escape' }, { label: '1', code: 'Digit1' },
    { label: '2', code: 'Digit2' }, { label: '3', code: 'Digit3' },
    { label: '4', code: 'Digit4' }, { label: '5', code: 'Digit5' },
    { label: '6', code: 'Digit6' }, { label: '7', code: 'Digit7' },
    { label: '8', code: 'Digit8' }, { label: '9', code: 'Digit9' },
    { label: '0', code: 'Digit0' }, { label: 'DEL', code: 'Backspace', width: 1.6 },
  ],
  [
    { label: 'TAB', code: 'Tab', width: 1.35 },
    ...'QWERTYUIOP'.split('').map((label) => ({ label, code: `Key${label}` })),
    { label: '\\', code: 'Backslash', width: 1.25 },
  ],
  [
    { label: 'CAPS', code: 'CapsLock', width: 1.65 },
    ...'ASDFGHJKL'.split('').map((label) => ({ label, code: `Key${label}` })),
    { label: 'ENTER', code: 'Enter', width: 1.85 },
  ],
  [
    { label: 'SHIFT', code: 'ShiftLeft', width: 2.1 },
    ...'ZXCVBNM'.split('').map((label) => ({ label, code: `Key${label}` })),
    { label: 'SHIFT', code: 'ShiftRight', width: 2.1 },
  ],
  [
    { label: 'CTRL', code: 'ControlLeft', width: 1.3 },
    { label: 'ALT', code: 'AltLeft', width: 1.2 },
    { label: 'SPACE', code: 'Space', width: 6.2 },
    { label: 'ALT', code: 'AltRight', width: 1.2 },
    { label: 'CTRL', code: 'ControlRight', width: 1.3 },
  ],
];

const LEFT_PAW_CODES = new Set([
  'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT',
  'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG',
  'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB',
  'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5',
  'ShiftLeft', 'ControlLeft', 'AltLeft', 'Tab', 'CapsLock', 'Escape'
]);

const KEY_CODES = new Set(KEY_ROWS.flatMap((row) => row.map((key) => key.code)));
const KEY_COORDINATES = new Map(KEY_ROWS.flatMap((row, rowIndex) =>
  row.map((key, columnIndex) => [key.code, { row: rowIndex, column: columnIndex }] as const)
));
const GAME_COLUMNS = 10;
const GAME_ROWS = 5;
const CAT_PIXELS = ['10001', '11111', '10101', '11111', '01110'];
const ORB_PIXELS = ['00100', '01110', '11111', '01110', '00100'];

type MechanicalSoundPackConfig = {
  sound: string;
  defines: Record<string, [number, number]>;
};

const MECHANICAL_SOUND_PACK_BASE = './sound/cherrymx-black-pbt';
const CODE_TO_SCAN_CODE: Record<string, string> = {
  Escape: '1',
  Digit1: '2', Digit2: '3', Digit3: '4', Digit4: '5', Digit5: '6',
  Digit6: '7', Digit7: '8', Digit8: '9', Digit9: '10', Digit0: '11',
  Backspace: '14', Tab: '15',
  KeyQ: '16', KeyW: '17', KeyE: '18', KeyR: '19', KeyT: '20',
  KeyY: '21', KeyU: '22', KeyI: '23', KeyO: '24', KeyP: '25',
  Enter: '28', ControlLeft: '29',
  KeyA: '30', KeyS: '31', KeyD: '32', KeyF: '33', KeyG: '34',
  KeyH: '35', KeyJ: '36', KeyK: '37', KeyL: '38',
  ShiftLeft: '42', Backslash: '43',
  KeyZ: '44', KeyX: '45', KeyC: '46', KeyV: '47',
  KeyB: '48', KeyN: '49', KeyM: '50',
  ShiftRight: '54', AltLeft: '56', Space: '57', CapsLock: '58',
  ControlRight: '3613', AltRight: '3640',
};

type LedMode = 'wave' | 'reactive' | 'ripple' | 'off';

const LED_MODES: Array<{ id: LedMode; label: string; color: string }> = [
  { id: 'wave', label: 'Starlight', color: '#38bdf8' },
  { id: 'reactive', label: 'Ice Blue', color: '#7dd3fc' },
  { id: 'ripple', label: 'Pulsar', color: '#fde047' },
  { id: 'off', label: 'Stealth', color: 'transparent' },
];

interface DesktopOverlayProps {
  onExit: () => void;
  lang: 'vie' | 'eng';
  embedded?: boolean;
  initialSound?: boolean;
  onSoundChange?: () => void;
  onKeySound?: (code: string) => void;
}
let playgroundSession = { player: { x: 1, y: 3 }, orb: { x: 7, y: 1 }, score: 0, moves: 0, led: 'wave' as LedMode };

export function DesktopOverlay({ onExit, lang, embedded = false, initialSound = false, onSoundChange, onKeySound }: DesktopOverlayProps) {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(() => new Set());
  const [playerPosition, setPlayerPosition] = useState(embedded ? playgroundSession.player : { x: 1, y: 3 });
  const [orbPosition, setOrbPosition] = useState(embedded ? playgroundSession.orb : { x: 7, y: 1 });
  const [gameScore, setGameScore] = useState(embedded ? playgroundSession.score : 0);
  const [gameMoves, setGameMoves] = useState(embedded ? playgroundSession.moves : 0);
  const [mouseButton, setMouseButton] = useState<'left' | 'right' | null>(null);
  const [ledMode, setLedMode] = useState<LedMode>(embedded ? playgroundSession.led : 'wave');
  useEffect(() => { if (embedded) playgroundSession = { player: playerPosition, orb: orbPosition, score: gameScore, moves: gameMoves, led: ledMode }; }, [embedded, playerPosition, orbPosition, gameScore, gameMoves, ledMode]);
  const [soundEnabled, setSoundEnabled] = useState(initialSound);
  const pointerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const keyboardShellRef = useRef<HTMLDivElement>(null);
  const pawsLayerRef = useRef<HTMLDivElement>(null);
  const leftPawRef = useRef<HTMLDivElement>(null);
  const rightPawRef = useRef<HTMLDivElement>(null);
  const keyNodeRefs = useRef(new Map<string, HTMLDivElement>());
  const audioContextRef = useRef<AudioContext | null>(null);
  const playerPositionRef = useRef(playerPosition);
  const orbPositionRef = useRef(orbPosition);
  const gameScoreRef = useRef(gameScore);
  const fallbackClickBufferRef = useRef<AudioBuffer | null>(null);
  const mechanicalPackBufferRef = useRef<AudioBuffer | null>(null);
  const mechanicalPackConfigRef = useRef<MechanicalSoundPackConfig | null>(null);
  const soundEnabledRef = useRef(soundEnabled);
  const ledModeRef = useRef<LedMode>(ledMode);
  const ledColorRef = useRef(LED_MODES[0].color);
  soundEnabledRef.current = soundEnabled;
  useEffect(() => { if (embedded) setSoundEnabled(initialSound); }, [initialSound, embedded]);
  ledModeRef.current = ledMode;
  playerPositionRef.current = playerPosition;
  orbPositionRef.current = orbPosition;
  gameScoreRef.current = gameScore;

  const playMechanicalClick = React.useCallback((phase: 'down' | 'up', code: string) => {
    if (phase === 'up' || !soundEnabledRef.current || typeof AudioContext === 'undefined') return;
    if (embedded) { onKeySound?.(code); return; }

    const context = audioContextRef.current ?? new AudioContext();
    audioContextRef.current = context;
    if (context.state === 'suspended') void context.resume();

    const scanCode = CODE_TO_SCAN_CODE[code];
    const definition = scanCode ? mechanicalPackConfigRef.current?.defines[scanCode] : undefined;
    const soundPackBuffer = mechanicalPackBufferRef.current;
    if (soundPackBuffer && definition) {
      const [offsetMs, durationMs] = definition;
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = soundPackBuffer;
      gain.gain.setValueAtTime(1, context.currentTime);
      source.connect(gain).connect(context.destination);
      source.start(context.currentTime, offsetMs / 1000, durationMs / 1000);
      return;
    }

    if (!fallbackClickBufferRef.current) {
      const sampleCount = Math.floor(context.sampleRate * 0.04);
      const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let index = 0; index < sampleCount; index += 1) {
        const envelope = 1 - index / sampleCount;
        samples[index] = (Math.random() * 2 - 1) * envelope * envelope;
      }
      fallbackClickBufferRef.current = buffer;
    }

    const now = context.currentTime;
    const isLargeKey = code === 'Space' || code === 'Enter' || code === 'Backspace';
    const noise = context.createBufferSource();
    const noiseFilter = context.createBiquadFilter();
    const noiseGain = context.createGain();
    noise.buffer = fallbackClickBufferRef.current;
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1850 + Math.random() * 520;
    noiseFilter.Q.value = 1.15;
    noiseGain.gain.setValueAtTime(0.11, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.034);
    noise.connect(noiseFilter).connect(noiseGain).connect(context.destination);

    const switchTone = context.createOscillator();
    const toneGain = context.createGain();
    switchTone.type = 'triangle';
    switchTone.frequency.setValueAtTime((isLargeKey ? 92 : 126) + Math.random() * 18, now);
    switchTone.frequency.exponentialRampToValueAtTime(68, now + 0.052);
    toneGain.gain.setValueAtTime(isLargeKey ? 0.07 : 0.052, now);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.054);
    switchTone.connect(toneGain).connect(context.destination);

    noise.start(now);
    noise.stop(now + 0.038);
    switchTone.start(now);
    switchTone.stop(now + 0.058);
  }, [embedded, onKeySound]);

  const triggerLedRipple = React.useCallback((code: string) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const origin = KEY_COORDINATES.get(code);
    if (!origin) return;
    const color = ledColorRef.current;

    keyNodeRefs.current.forEach((node, keyCode) => {
      const point = KEY_COORDINATES.get(keyCode);
      if (!point) return;
      const distance = Math.abs(point.row - origin.row) + Math.abs(point.column - origin.column);
      if (distance > 3) return;
      const glow = Math.max(5, 15 - distance * 3);
      node.animate(
        [
          { filter: 'brightness(1)' },
          { filter: 'brightness(1.9) drop-shadow(0 0 ' + glow + 'px ' + color + ')' },
          { filter: 'brightness(1)' },
        ],
        { duration: 430, delay: distance * 52, easing: 'cubic-bezier(.16, 1, .3, 1)' }
      );
    });
  }, []);

  const movePixelPlayer = React.useCallback((code: string) => {
    const movement: Record<string, { x: number; y: number }> = {
      KeyW: { x: 0, y: -1 },
      KeyA: { x: -1, y: 0 },
      KeyS: { x: 0, y: 1 },
      KeyD: { x: 1, y: 0 },
    };
    const direction = movement[code];
    if (!direction && code !== 'Space') return;

    setGameMoves((value) => value + 1);
    setPlayerPosition((current) => {
      const orb = orbPositionRef.current;
      const step = code === 'Space'
        ? { x: Math.sign(orb.x - current.x), y: Math.sign(orb.y - current.y) }
        : direction!;
      const next = {
        x: Math.max(0, Math.min(GAME_COLUMNS - 1, current.x + step.x)),
        y: Math.max(0, Math.min(GAME_ROWS - 1, current.y + step.y)),
      };

      if (next.x === orb.x && next.y === orb.y) {
        const nextScore = gameScoreRef.current + 1;
        gameScoreRef.current = nextScore;
        setGameScore(nextScore);
        const nextOrb = {
          x: (next.x + 3 + nextScore * 2) % GAME_COLUMNS,
          y: (next.y + 2 + nextScore) % GAME_ROWS,
        };
        if (nextOrb.x === next.x && nextOrb.y === next.y) nextOrb.x = (nextOrb.x + 4) % GAME_COLUMNS;
        orbPositionRef.current = nextOrb;
        setOrbPosition(nextOrb);
      }

      playerPositionRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (!(event.target instanceof HTMLElement) || event.target.closest('input,textarea,[contenteditable=true],[data-native-cursor]')) return;
      if (embedded && !workspaceRef.current?.contains(document.activeElement)) return;

      const modifierPressed = event.ctrlKey || event.metaKey;
      if (!modifierPressed && ['Space','KeyW','KeyA','KeyS','KeyD'].includes(event.code)) {
        event.preventDefault();
      }

      if (KEY_CODES.has(event.code)) {
        setPressedKeys((current) => new Set(current).add(event.code));
        if (!event.repeat || event.code === 'Backspace') {
          playMechanicalClick('down', event.code);
          if (ledModeRef.current === 'ripple') triggerLedRipple(event.code);
        }
      }

      if (modifierPressed) return;
      if (!event.repeat || event.code !== 'Space') movePixelPlayer(event.code);
    };

    const keyUp = (event: KeyboardEvent) => {
      setPressedKeys((current) => {
        const next = new Set(current);
        next.delete(event.code);
        return next;
      });
    };

    const clearKeys = () => setPressedKeys(new Set());
    const visibility = () => { if (document.hidden) clearKeys(); };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', clearKeys);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', clearKeys);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [movePixelPlayer, playMechanicalClick, triggerLedRipple, embedded]);

  useEffect(() => {
    if (embedded || !soundEnabled || typeof AudioContext === 'undefined') return;
    const controller = new AbortController();
    let cancelled = false;

    const loadSoundPack = async () => {
      try {
        const configResponse = await fetch(MECHANICAL_SOUND_PACK_BASE + '/config.json', { signal: controller.signal });
        if (!configResponse.ok) throw new Error('Unable to load mechanical sound pack config');
        const config = await configResponse.json() as MechanicalSoundPackConfig;
        const soundResponse = await fetch(MECHANICAL_SOUND_PACK_BASE + '/' + config.sound, { signal: controller.signal });
        if (!soundResponse.ok) throw new Error('Unable to load mechanical sound pack audio');
        const audioData = await soundResponse.arrayBuffer();
        const context = audioContextRef.current ?? new AudioContext();
        audioContextRef.current = context;
        const decoded = await context.decodeAudioData(audioData);
        if (cancelled) return;
        mechanicalPackConfigRef.current = config;
        mechanicalPackBufferRef.current = decoded;
      } catch {
        // The generated switch sound remains available as a format/network fallback.
      }
    };

    void loadSoundPack();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [soundEnabled, embedded]);

  useEffect(() => {
    return () => {
      const context = audioContextRef.current;
      if (context && context.state !== 'closed') void context.close();
    };
  }, []);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = workspaceRef.current?.getBoundingClientRect();
    if (!bounds || !pointerRef.current) return;
    pointerRef.current.style.transform = `translate3d(${event.clientX - bounds.left}px, ${event.clientY - bounds.top}px, 0)`;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('[data-native-cursor]')) return;
    setMouseButton(event.button === 2 ? 'right' : 'left');
  };

  const activeLed = LED_MODES.find((mode) => mode.id === ledMode) ?? LED_MODES[0];
  ledColorRef.current = activeLed.color;
  const ledStyle = {
    '--keyboard-led': activeLed.color,
    '--led-strength': ledMode === 'off' ? '0%' : '76%',
    '--led-blur': '14px',
  } as React.CSSProperties;

  const pressedCodes = Array.from(pressedKeys);
  const leftPressedCodes = pressedCodes.filter((code) => LEFT_PAW_CODES.has(code));
  const rightPressedCodes = pressedCodes.filter((code) => KEY_CODES.has(code) && !LEFT_PAW_CODES.has(code));
  const leftActiveCode = leftPressedCodes[leftPressedCodes.length - 1];
  const rightActiveCode = rightPressedCodes[rightPressedCodes.length - 1];
  const leftPawPressed = Boolean(leftActiveCode);
  const rightPawPressed = Boolean(rightActiveCode);
  const isVie = lang === 'vie';

  useLayoutEffect(() => {
    const shell = keyboardShellRef.current;
    const layer = pawsLayerRef.current;
    if (!shell || !layer) return;

    const positionPaw = (paw: HTMLDivElement | null, code?: string) => {
      if (!paw || !code) return;
      const keyNode = keyNodeRefs.current.get(code);
      const pad = paw.querySelector<HTMLElement>('.cat-pad');
      if (!keyNode || !pad) return;

      const keyCenterX = keyNode.offsetLeft + keyNode.offsetWidth / 2;
      const keyCenterY = keyNode.offsetTop + keyNode.offsetHeight / 2 + 4 + keyNode.offsetHeight * 0.01;
      const baseX = layer.offsetLeft + paw.offsetLeft + paw.offsetWidth / 2;
      const baseY = layer.offsetTop + paw.offsetTop + paw.offsetHeight;
      const contactY = pad.offsetTop + pad.offsetHeight * 0.61;
      const naturalReach = Math.max(1, paw.offsetHeight - contactY);
      const deltaX = keyCenterX - baseX;
      const deltaY = keyCenterY - baseY;
      const reach = Math.hypot(deltaX, deltaY);
      const reachScale = reach / naturalReach;
      const angle = Math.atan2(deltaX, -deltaY) * 180 / Math.PI;

      paw.style.setProperty('--paw-angle', angle + 'deg');
      paw.style.setProperty('--paw-reach-scale', String(reachScale));
      paw.style.setProperty('--paw-pad-counter-scale', String(1 / reachScale));
    };

    positionPaw(leftPawRef.current, leftActiveCode);
    positionPaw(rightPawRef.current, rightActiveCode);
  }, [leftActiveCode, rightActiveCode]);

  return (
    <div className="desktop-overlay" aria-label={isVie ? 'Không gian desktop tương tác' : 'Interactive desktop workspace'}>
      <div
        ref={workspaceRef}
        className="desktop-workspace"
        tabIndex={embedded ? 0 : undefined}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={() => setMouseButton(null)}
        onPointerCancel={() => setMouseButton(null)}
        onContextMenu={(event) => event.preventDefault()}
      >
        {!embedded && <div ref={pointerRef} className={`virtual-pointer ${mouseButton ? 'is-clicking' : ''}`} aria-hidden="true"><span /></div>}

        <header className="desktop-topbar">
          <div className="desktop-brand">
            <span className="desktop-brand-mark">✦</span>
            <span><b>ZNEY</b><small>ORBITAL OBSERVATORY</small></span>
          </div>
          <div className="desktop-status"><i /><span>LINK STABLE</span><span>SPICA // 01</span></div>
          <button type="button" className="desktop-exit" onClick={onExit} data-native-cursor>
            <span>←</span>{isVie ? 'Trở lại phòng' : 'Back to room'}
          </button>
        </header>

        <main className="desktop-monitor">
          <nav className="desktop-dock" aria-label="Pixel arcade">
            <button type="button" className="is-active" data-native-cursor><b>01</b><span>RADAR</span></button>
            <div className="desktop-dock-line" aria-hidden="true" />
            <small>NODE<br />ACTIVE</small>
          </nav>

          <section className="desktop-content">
            <div className="desktop-heading">
              <p><i /> ASTRO-RADAR // MINI GAME</p>
              <div className="desktop-heading-row">
                <h1>{isVie ? 'Bắt tín hiệu.' : 'Catch the signal.'}<br /><em>{isVie ? 'Đánh thức lưới sao.' : 'Wake the celestial grid.'}</em></h1>
                <span>WASD: MOVE<br />SPACE: DASH</span>
              </div>
            </div>

            <div className="terminal-grid pixel-terminal-grid">
              <article className="terminal-panel pixel-game">
                <div className="terminal-bar">
                  <span><i /> RADAR // NEKO BYTE RUN</span>
                  <span>CORE COUNT&nbsp; <b>{String(gameScore).padStart(3, '0')}</b></span>
                </div>
                <div
                  className="pixel-stage"
                  tabIndex={0}
                  role="application"
                  aria-label="Move the pixel cat with W A S D. Press Space to dash toward the signal."
                  style={{ '--game-columns': GAME_COLUMNS, '--game-rows': GAME_ROWS } as React.CSSProperties}
                >
                  <div className="pixel-grid-lines" aria-hidden="true" />
                  <div
                    className="pixel-entity pixel-orb"
                    style={{ '--game-x': (orbPosition.x * 100 / GAME_COLUMNS) + '%', '--game-y': (orbPosition.y * 100 / GAME_ROWS) + '%' } as React.CSSProperties}
                    aria-label="Signal target"
                  >
                    <span className="pixel-sprite pixel-orb-sprite" aria-hidden="true">
                      {ORB_PIXELS.flatMap((row, rowIndex) => row.split('').map((pixel, columnIndex) => (
                        <i key={'orb-' + rowIndex + '-' + columnIndex} className={pixel === '1' ? 'is-filled' : ''} />
                      )))}
                    </span>
                  </div>
                  <div
                    className="pixel-entity pixel-player"
                    style={{ '--game-x': (playerPosition.x * 100 / GAME_COLUMNS) + '%', '--game-y': (playerPosition.y * 100 / GAME_ROWS) + '%' } as React.CSSProperties}
                    aria-label="Pixel cat"
                  >
                    <span className="pixel-sprite pixel-cat-sprite" aria-hidden="true">
                      {CAT_PIXELS.flatMap((row, rowIndex) => row.split('').map((pixel, columnIndex) => (
                        <i key={'cat-' + rowIndex + '-' + columnIndex} className={pixel === '1' ? 'is-filled' : ''} />
                      )))}
                    </span>
                  </div>
                  <div className="pixel-game-hud">
                    <span><kbd>WASD</kbd> {isVie ? 'DI CHUYỂN' : 'MOVE'}</span>
                    <span><kbd>SPACE</kbd> DASH</span>
                    <span>{String(gameMoves).padStart(3, '0')} {isVie ? 'BƯỚC' : 'STEPS'}</span>
                  </div>
                </div>
                <div className="game-touch-controls" aria-label="Game controls">
                  {([['KeyW','↑'],['KeyA','←'],['KeyS','↓'],['KeyD','→'],['Space','Dash']] as const).map(([code,label]) => <button key={code} type="button" onClick={() => { movePixelPlayer(code); playMechanicalClick('down', code); }} aria-label={label}>{label}</button>)}
                </div>
              </article>

              <aside className="terminal-panel system-panel">
                <div className="terminal-bar"><span>SIGNAL DATA</span><span><i /> LIVE</span></div>
                <dl>
                  <div><dt>PLAYER</dt><dd>NEKO-01</dd></div>
                  <div><dt>CORES</dt><dd>{String(gameScore).padStart(2, '0')}</dd></div>
                  <div><dt>INPUT</dt><dd>WASD</dd></div>
                </dl>
                <p className="system-mission">{isVie ? 'Đi tới nguồn sáng để thu thập lõi tín hiệu.' : 'Reach the light source to collect signal cores.'}</p>
                <div className="led-controller">
                  <div className="led-controller-heading">
                    <span>KEYBOARD FX</span>
                    <button
                      type="button"
                      className={'sound-toggle ' + (soundEnabled ? 'is-on' : '')}
                      onClick={() => embedded ? onSoundChange?.() : setSoundEnabled((value) => !value)}
                      aria-pressed={soundEnabled}
                      data-native-cursor
                    >
                      {soundEnabled ? 'SOUND ON' : 'SOUND OFF'}
                    </button>
                  </div>
                  <div className="led-presets" aria-label="Keyboard LED effect">
                    {LED_MODES.map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        className={ledMode === mode.id ? 'is-active' : ''}
                        onClick={() => setLedMode(mode.id)}
                        aria-label={mode.label + ' LED effect'}
                        aria-pressed={ledMode === mode.id}
                        data-mode={mode.id}
                        data-native-cursor
                      >
                        <span style={{ background: mode.color }} />
                        <b>{mode.label}</b>
                      </button>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </section>
        </main>

        <section className="device-deck" data-led-mode={ledMode} style={ledStyle} aria-label={isVie ? 'Bàn phím và chuột mô phỏng' : 'Simulated keyboard and mouse'}>
          <div ref={keyboardShellRef} className="keyboard-shell">
            <div className="keyboard-grid">
              {KEY_ROWS.map((row, rowIndex) => (
                <div className="keyboard-row" key={rowIndex}>
                  {row.map((key, keyIndex) => (
                    <div
                      key={`${key.code}-${keyIndex}`}
                      ref={(node) => {
                        if (node) keyNodeRefs.current.set(key.code, node);
                        else keyNodeRefs.current.delete(key.code);
                      }}
                      className={`key-node ${pressedKeys.has(key.code) ? 'key-pressed' : ''}`}
                      style={{
                        '--key-width': key.width ?? 1,
                        '--key-index': rowIndex * 16 + keyIndex,
                        '--key-delay': -((rowIndex * 16 + keyIndex) * 52) + 'ms',
                        '--key-led': activeLed.color,
                      } as React.CSSProperties}
                    >{key.label}</div>
                  ))}
                </div>
              ))}
            </div>

            <div ref={pawsLayerRef} className="cat-paws" aria-hidden="true">
              <div ref={leftPawRef} className={'cat-paw cat-paw-left ' + (leftPawPressed ? 'is-pressing' : '')}>
                <span className="cat-arm" />
                <span className="cat-pad">
                  <i className="cat-toe toe-one" />
                  <i className="cat-toe toe-two" />
                  <i className="cat-toe toe-three" />
                  <i className="cat-bean" />
                </span>
              </div>
              <div ref={rightPawRef} className={'cat-paw cat-paw-right ' + (rightPawPressed ? 'is-pressing' : '')}>
                <span className="cat-arm" />
                <span className="cat-pad">
                  <i className="cat-toe toe-one" />
                  <i className="cat-toe toe-two" />
                  <i className="cat-toe toe-three" />
                  <i className="cat-bean" />
                </span>
              </div>
            </div>
          </div>

          <div className="mouse-shell" aria-hidden="true">
            <div className={`mouse-button mouse-left ${mouseButton === 'left' ? 'is-active' : ''}`} />
            <div className={`mouse-button mouse-right ${mouseButton === 'right' ? 'is-active' : ''}`} />
            <div className="mouse-wheel" /><div className="mouse-led" />
          </div>
        </section>
      </div>
    </div>
  );
}
