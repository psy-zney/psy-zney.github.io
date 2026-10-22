/** Original A-minor score and a shared sonic vocabulary, rendered once on demand. */
export type PortfolioScene = 'intro' | 'journey' | 'showcase' | 'contact';
export type PortfolioSfxType = 'hover' | 'click' | 'warp' | 'drawerOpen' | 'drawerClose'
  | 'modalOpen' | 'modalClose' | 'singularityEnter' | 'singularityExit' | 'cardSlide'
  | 'muteOn' | 'muteOff' | 'loaderComplete';

export const dbGain = (db: number): number => 10 ** (db / 20);
// Scene changes preserve the intended balance in decibels.
export const SCENE_MIX = {
  intro: { music: -6.4, pulse: -19 },
  journey: { music: -5.7, pulse: -4 },
  showcase: { music: -6, pulse: 0 },
  contact: { music: -9, pulse: -16 },
} satisfies Record<PortfolioScene, { music: number; pulse: number }>;

const RATE = 12000;
const BEAT = .8; // 75 BPM; sixteen bars, with a different answer in the second phrase.
const SCORE_SECONDS = BEAT * 64;
const TAU = Math.PI * 2;
const midi = (note: number): number => 440 * 2 ** ((note - 69) / 12);

function randomGenerator() {
  let seed = 41729;
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 2147483648 - 1; };
}

/** Wrap the note's release/reflections into the next loop instead of cutting the tail. */
function addNote(channels: Float32Array[], at: number, seconds: number, frequency: number, level: number, pan = 0, attack = .008) {
  const length = channels[0].length, offset = Math.round(at * RATE);
  const left = Math.sqrt((1 - pan) / 2), right = Math.sqrt((1 + pan) / 2);
  for (let i = 0; i < seconds * RATE; i++) {
    const t = i / RATE, phase = TAU * frequency * t;
    const envelope = Math.min(1, t / attack) * Math.exp(-t * 3.2) * Math.min(1, (seconds - t) / .1);
    const sample = level * envelope * (Math.sin(phase) + .22 * Math.sin(phase * 2) * Math.exp(-t * 5));
    const index = (offset + i) % length;
    channels[0][index] += sample * left; channels[1][index] += sample * right;
    const echo = (index + Math.round(BEAT * .75 * RATE)) % length;
    channels[0][echo] += sample * right * .23; channels[1][echo] += sample * left * .23;
  }
}

export type PortfolioScoreSamples = { bed: Float32Array[]; pulse: Float32Array[]; rate: number };

export function synthesizePortfolioScore(): PortfolioScoreSamples {
  const length = Math.round(SCORE_SECONDS * RATE);
  const beds = [new Float32Array(length), new Float32Array(length)];
  const pulses = [new Float32Array(length), new Float32Array(length)];
  // Am9 (open fifth) → Fmaj7 → Cmaj9 → G6. Two bars per harmony.
  const chords = [[45, 52, 55, 59, 64], [41, 48, 52, 57, 60], [48, 55, 59, 62, 64], [43, 50, 55, 59, 64]];
  const chordSeconds = BEAT * 8, random = randomGenerator();
  let air = 0;
  const loopFrequency = (frequency: number) => Math.round(frequency * SCORE_SECONDS) / SCORE_SECONDS;
  const frequencies = chords.map(chord => chord.map(note => loopFrequency(midi(note))));
  for (let i = 0; i < length; i++) {
    const t = i / RATE, chordIndex = Math.floor(t / chordSeconds) % 4;
    const blend = Math.min(1, (t % chordSeconds) / 1.4);
    const current = Math.sin(blend * Math.PI / 2) ** 2, previous = 1 - current;
    air = air * .96 + random() * .04;
    for (let channel = 0; channel < 2; channel++) {
      let sample = 0;
      for (const [index, weight] of [[chordIndex, current], [(chordIndex + 3) % 4, previous]]) {
        if (weight === 0) continue;
        for (let voice = 0; voice < 5; voice++) {
          const phase = TAU * frequencies[index][voice] * t;
          const drift = .11 * Math.sin(TAU * t * (voice + 1) / SCORE_SECONDS + channel * .8);
          const breath = .92 + .08 * Math.sin(TAU * t / (BEAT * 8) + voice);
          const tone = Math.sin(phase + drift) + .14 * Math.sin(phase * 2 + drift);
          sample += weight * tone * breath * (voice === 0 ? .105 : .042);
        }
      }
      beds[channel][i] = sample;
      const beatTime = t % BEAT, phase = TAU * 55 * beatTime;
      const throb = Math.sin(phase) * Math.min(1, beatTime / .014) * Math.exp(-beatTime * 13);
      pulses[channel][i] = throb * .07 + air * .008 * Math.sin(Math.PI * t / SCORE_SECONDS) ** 2;
    }
  }
  const phrases = [
    [[0, 76], [1.5, 79], [3, 83], [5.5, 79]],
    [[0, 76], [2, 72], [4.5, 69], [6, 72]],
    [[.5, 79], [2, 76], [4, 74], [6.5, 71]],
    [[0, 74], [2.5, 71], [4.5, 67], [6, 71]],
  ];
  for (let bar = 0; bar < 8; bar++) {
    const start = bar * chordSeconds, chord = chords[bar % 4];
    for (const [beat, note] of phrases[bar % 4]) {
      addNote(beds, start + beat * BEAT, 2.3, midi(note - (bar >= 4 ? 12 : 0)), .105, Math.sin(beat + bar) * .45, .018);
    }
    for (let step = 0; step < 16; step++) {
      if (step % 4 === 3) continue;
      addNote(pulses, start + step * BEAT / 2, .65, midi(chord[1 + step % 4] + 12), step % 4 === 0 ? .065 : .038, step % 2 ? -.55 : .55);
    }
  }
  return { bed: beds, pulse: pulses, rate: RATE };
}

export function scoreFromSamples(ctx: BaseAudioContext, samples: PortfolioScoreSamples): { bed: AudioBuffer; pulse: AudioBuffer } {
  const makeBuffer = (channels: Float32Array[]) => {
    const buffer = ctx.createBuffer(2, channels[0].length, samples.rate);
    channels.forEach((data, channel) => buffer.getChannelData(channel).set(data));
    return buffer;
  };
  return { bed: makeBuffer(samples.bed), pulse: makeBuffer(samples.pulse) };
}

export function renderPortfolioScore(ctx: BaseAudioContext): { bed: AudioBuffer; pulse: AudioBuffer } {
  return scoreFromSamples(ctx, synthesizePortfolioScore());
}

const CUE_SECONDS: Record<PortfolioSfxType | 'typing', number> = {
  hover: .1, click: .15, warp: 1.35, drawerOpen: .35, drawerClose: .3,
  modalOpen: .65, modalClose: .3, singularityEnter: 1.2, singularityExit: 1.15,
  cardSlide: .25, muteOn: .55, muteOff: .4, loaderComplete: 1.3, typing: .045,
};

/** Layer body, transient and air in one bounded source; every cue owns its tail. */
export function renderPortfolioCue(ctx: BaseAudioContext, cue: PortfolioSfxType | 'typing'): AudioBuffer {
  const duration = CUE_SECONDS[cue], length = Math.ceil(duration * RATE);
  const buffer = ctx.createBuffer(2, length, RATE), channels = [buffer.getChannelData(0), buffer.getChannelData(1)];
  const random = randomGenerator();
  const tone = (at: number, seconds: number, from: number, to: number, level: number, attack = .004, pan = 0) => {
    let phase = 0;
    for (let i = 0; i < seconds * RATE; i++) {
      const index = Math.round(at * RATE) + i;
      if (index >= length) break;
      const t = i / RATE, progress = t / seconds;
      phase += TAU * from * (to / from) ** progress / RATE;
      const envelope = Math.min(1, t / attack) * (1 - progress) ** 2;
      const sample = level * envelope * (Math.sin(phase) + .16 * Math.sin(phase * 2) * (1 - progress));
      channels[0][index] += sample * Math.sqrt((1 - pan) / 2);
      channels[1][index] += sample * Math.sqrt((1 + pan) / 2);
    }
  };
  const air = (at: number, seconds: number, level: number, swell = false) => {
    let low = 0;
    for (let i = 0; i < seconds * RATE; i++) {
      const index = Math.round(at * RATE) + i;
      if (index >= length) break;
      const t = i / RATE, progress = t / seconds, white = random();
      low += .18 * (white - low);
      const envelope = swell ? Math.sin(Math.PI * progress) ** 2 : Math.min(1, t / .002) * (1 - progress) ** 3;
      const sample = (white - low) * level * envelope;
      channels[0][index] += sample * .78; channels[1][index] += sample * .72;
    }
  };
  const chime = (notes: number[], spacing: number, level: number) => notes.forEach((note, index) => {
    const at = index * spacing, frequency = midi(note);
    tone(at, duration - at, frequency, frequency, level * (1 - index * .1), .008, (index % 2 ? 1 : -1) * .25);
  });
  switch (cue) {
    case 'hover': tone(0, .09, 1320, 1760, .085); break;
    case 'click': tone(0, .12, 660, 220, .24); air(0, .025, .1); break;
    case 'typing': tone(0, .04, 460, 280, .07); air(0, .025, .22); air(.014, .02, .07); break;
    case 'cardSlide': air(0, .22, .14, true); tone(.02, .2, 330, 660, .17, .012); break;
    case 'drawerOpen': air(0, .3, .12, true); tone(0, .32, 220, 440, .2, .018); break;
    case 'drawerClose': air(0, .23, .1, true); tone(0, .27, 440, 220, .18, .008); break;
    case 'modalOpen': chime([69, 76, 83], .055, .18); air(0, .25, .07, true); break;
    case 'modalClose': tone(0, .27, 440, 165, .22); air(0, .09, .09); break;
    case 'warp':
      air(0, .85, .26, true); tone(0, .8, 110, 880, .27, .18, -.2);
      tone(.55, .8, 110, 55, .34, .012); tone(.65, .65, 660, 880, .14, .025, .3); break;
    case 'singularityEnter':
      air(0, .9, .3, true); tone(0, 1.15, 165, 41.25, .38, .045);
      tone(.05, .75, 880, 110, .14, .04, -.3); break;
    case 'singularityExit': chime([57, 64, 71, 76], .07, .23); air(0, .65, .18, true); break;
    case 'muteOn': chime([69, 76], .1, .22); break;
    case 'muteOff': chime([76, 69], .08, .17); break;
    case 'loaderComplete': chime([69, 72, 76, 81], .09, .23); break;
  }
  for (const channel of channels) for (let i = Math.max(0, length - 60); i < length; i++) channel[i] *= (length - 1 - i) / 60;
  return buffer;
}
