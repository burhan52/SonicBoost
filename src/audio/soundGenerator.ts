/**
 * In-memory Procedural Audio Generator for AuraBoost.
 * Creates clean, high-fidelity AudioBuffers for testing EQ, volume booster, and dialogue clarity.
 */

export function generatePodcastSample(ctx: AudioContext): AudioBuffer {
  // 12-second seamless audio with voice-like cadence + ambient background
  const sampleRate = ctx.sampleRate;
  const duration = 12;
  const numFrames = sampleRate * duration;
  const buffer = ctx.createBuffer(2, numFrames, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Formant frequencies for vocal simulation (vowels: /a/, /i/, /u/, /e/, /o/)
  const formantPairs = [
    { f1: 730, f2: 1090 }, // /a/
    { f1: 270, f2: 2290 }, // /i/
    { f1: 300, f2: 870 },  // /u/
    { f1: 530, f2: 1840 }, // /e/
    { f1: 570, f2: 840 },  // /o/
  ];

  // Syllable timing and pitch contour
  const basePitch = 130; // Hz (male/neutral speaking voice)

  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate;
    
    // Sentence pauses: speak for ~2.5s, pause 0.4s, speak 2.8s, pause 0.3s...
    const cycle = t % 4.0;
    const isSpeaking = cycle < 3.2 && (cycle % 0.35) < 0.28;
    
    let speechSample = 0;
    if (isSpeaking) {
      // Intonation pitch inflection
      const pitchMod = Math.sin(t * 3.5) * 15 + Math.sin(t * 7.2) * 8;
      const pitch = basePitch + pitchMod;
      const fundamental = Math.sin(2 * Math.PI * pitch * t);
      
      // Formant filtering approximation via dual resonant sines
      const formantIdx = Math.floor((t * 2.5) % formantPairs.length);
      const { f1, f2 } = formantPairs[formantIdx];
      const formant1 = Math.sin(2 * Math.PI * f1 * t) * 0.4;
      const formant2 = Math.sin(2 * Math.PI * f2 * t) * 0.25;
      const consonantShaper = (Math.random() * 2 - 1) * (Math.sin(t * 18) > 0.85 ? 0.2 : 0.02);

      speechSample = (fundamental * 0.35 + formant1 + formant2 + consonantShaper) * 0.5;
    }

    // Ambient background track: warm low acoustic chord bed
    const chordTime = t * 0.8;
    const bassNote = Math.sin(2 * Math.PI * 110 * t) * 0.04;
    const midNote1 = Math.sin(2 * Math.PI * 220 * t) * 0.03 * (0.8 + 0.2 * Math.sin(chordTime));
    const midNote2 = Math.sin(2 * Math.PI * 277.18 * t) * 0.025 * (0.8 + 0.2 * Math.cos(chordTime));
    const midNote3 = Math.sin(2 * Math.PI * 329.63 * t) * 0.02;
    
    // Very gentle room tone
    const roomTone = (Math.random() * 2 - 1) * 0.005;

    const musicBed = bassNote + midNote1 + midNote2 + midNote3 + roomTone;

    // Intentionally keep raw level around -12dB so the volume booster has plenty of headroom!
    const l = (speechSample * 0.85 + musicBed * 0.6) * 0.4;
    const r = (speechSample * 0.85 + (musicBed + roomTone * 0.5) * 0.6) * 0.4;

    left[i] = l;
    right[i] = r;
  }

  return buffer;
}

export function generateBeatsAndBassSample(ctx: AudioContext): AudioBuffer {
  // 8-second punchy electronic groove with sub bass, punchy kick, snappy snare, crisp hi-hats
  const sampleRate = ctx.sampleRate;
  const duration = 8;
  const numFrames = sampleRate * duration;
  const buffer = ctx.createBuffer(2, numFrames, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const bpm = 120;
  const beatDuration = 60 / bpm; // 0.5s per beat
  const sixteenth = beatDuration / 4;

  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate;
    const beatPhase = (t % beatDuration);
    const sixteenthPhase = (t % sixteenth);
    const barPhase = (t % (beatDuration * 4));

    // Kick on beat 1 and 3 (and syncopated)
    const isKick = (t % 1.0 < 0.2) || (barPhase > 1.75 && barPhase < 1.95);
    let kick = 0;
    if (isKick) {
      const kickT = (t % 1.0 < 0.2) ? (t % 1.0) : (barPhase - 1.75);
      const kickPitch = Math.max(45, 140 * Math.exp(-kickT * 35));
      kick = Math.sin(2 * Math.PI * kickPitch * kickT) * Math.exp(-kickT * 12) * 0.5;
    }

    // Snare on beat 2 and 4
    const isSnare = (t % 1.0 >= 0.5 && t % 1.0 < 0.7);
    let snare = 0;
    if (isSnare) {
      const snareT = (t % 1.0) - 0.5;
      const tone = Math.sin(2 * Math.PI * 185 * snareT) * Math.exp(-snareT * 22) * 0.3;
      const noise = (Math.random() * 2 - 1) * Math.exp(-snareT * 16) * 0.35;
      snare = tone + noise;
    }

    // Hi-hats on sixteenth notes
    const hihatT = sixteenthPhase;
    const hihat = (Math.random() * 2 - 1) * Math.exp(-hihatT * 40) * 0.08;

    // Sub-bass groove (synth bass note every half beat)
    const bassNoteFreq = (barPhase < 2.0) ? 55 : (barPhase < 3.0 ? 65.41 : 48.99); // A1, C2, G1
    const bassPhase = (t % 0.5);
    const bassEnv = Math.exp(-bassPhase * 3.5);
    const bass = (Math.sin(2 * Math.PI * bassNoteFreq * t) + 0.3 * Math.sin(2 * Math.PI * bassNoteFreq * 2 * t)) * bassEnv * 0.25;

    // Synth pluck arpeggio
    const arpFreq = [220, 261.63, 329.63, 392, 440, 523.25][Math.floor((t / sixteenth) % 6)];
    const arpEnv = Math.exp(-sixteenthPhase * 18);
    const arp = Math.sin(2 * Math.PI * arpFreq * t) * arpEnv * 0.06;

    const mono = kick + snare + bass;
    left[i] = (mono + hihat * 0.9 + arp * 1.2) * 0.45;
    right[i] = (mono + hihat * 1.1 + arp * 0.8) * 0.45;
  }

  return buffer;
}

export function generateAcousticSample(ctx: AudioContext): AudioBuffer {
  // 10-second melodic acoustic guitar / piano chords
  const sampleRate = ctx.sampleRate;
  const duration = 10;
  const numFrames = sampleRate * duration;
  const buffer = ctx.createBuffer(2, numFrames, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Chords: Cmaj7, Am7, Fmaj7, G7
  const chords = [
    [130.81, 164.81, 196.00, 246.94, 329.63], // C, E, G, B, E
    [110.00, 164.81, 220.00, 261.63, 329.63], // A, E, A, C, E
    [87.31, 130.81, 174.61, 220.00, 261.63],  // F, C, F, A, C
    [98.00, 146.83, 196.00, 246.94, 293.66],  // G, D, G, B, D
  ];

  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate;
    const chordIdx = Math.floor((t / 2.5) % chords.length);
    const chord = chords[chordIdx];
    const tInChord = t % 2.5;

    let soundL = 0;
    let soundR = 0;

    for (let stringIdx = 0; stringIdx < chord.length; stringIdx++) {
      const freq = chord[stringIdx];
      // Strum delay: 30ms per string
      const strumDelay = stringIdx * 0.035;
      const noteT = tInChord - strumDelay;

      if (noteT > 0) {
        // Pluck decay envelope
        const env = Math.exp(-noteT * 1.6);
        // Harmonics
        const fundamental = Math.sin(2 * Math.PI * freq * noteT);
        const harm2 = Math.sin(2 * Math.PI * freq * 2 * noteT) * 0.4;
        const harm3 = Math.sin(2 * Math.PI * freq * 3 * noteT) * 0.15;
        const bodyTone = Math.sin(2 * Math.PI * 180 * noteT) * Math.exp(-noteT * 3.5) * 0.05;

        const stringSignal = (fundamental + harm2 + harm3 + bodyTone) * env;
        // Stereo spread
        const pan = (stringIdx / (chord.length - 1)) * 0.6 + 0.2; // 0.2 to 0.8
        soundL += stringSignal * (1 - pan);
        soundR += stringSignal * pan;
      }
    }

    left[i] = soundL * 0.2;
    right[i] = soundR * 0.2;
  }

  return buffer;
}

export function generateMuffledTestSample(ctx: AudioContext): AudioBuffer {
  // A muffled, quiet audio track specifically designed to show how dramatic AuraBoost is!
  // Heavy low-pass filtering + lower volume + dialogue + music bed
  const sampleRate = ctx.sampleRate;
  const duration = 10;
  const numFrames = sampleRate * duration;
  const buffer = ctx.createBuffer(2, numFrames, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  let prevL = 0;
  let prevR = 0;

  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate;
    
    // Voice cadence
    const voiceCadence = Math.sin(t * 4.2) > 0.1;
    const voicePitch = 120 + Math.sin(t * 3) * 10;
    const voice = voiceCadence ? (Math.sin(2 * Math.PI * voicePitch * t) + 0.3 * Math.sin(2 * Math.PI * voicePitch * 2.5 * t)) * 0.2 : 0;
    
    // Music chord
    const music = (Math.sin(2 * Math.PI * 165 * t) + Math.sin(2 * Math.PI * 220 * t)) * 0.08;
    
    // Low rumble (like air conditioning / laptop chassis hum)
    const rumble = (Math.sin(2 * Math.PI * 52 * t) + Math.sin(2 * Math.PI * 65 * t)) * 0.12;

    const raw = (voice + music + rumble) * 0.2; // intentionally quiet

    // Single-pole low-pass filter to make it sound like a muddy, low-quality speaker recording
    const alpha = 0.08;
    prevL = prevL + alpha * (raw - prevL);
    prevR = prevR + alpha * (raw - prevR);

    left[i] = prevL;
    right[i] = prevR;
  }

  return buffer;
}

export function generateSineSweepSample(ctx: AudioContext): AudioBuffer {
  // 6-second sweep from 20 Hz to 20,000 Hz logarithmically
  const sampleRate = ctx.sampleRate;
  const duration = 6;
  const numFrames = sampleRate * duration;
  const buffer = ctx.createBuffer(2, numFrames, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const startFreq = 20;
  const endFreq = 18000;
  const k = Math.pow(endFreq / startFreq, 1 / duration);

  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate;
    // Frequency at time t: f(t) = f0 * k^t
    // Phase integral: 2 * pi * f0 * (k^t - 1) / ln(k)
    const phase = 2 * Math.PI * startFreq * (Math.pow(k, t) - 1) / Math.log(k);
    const sample = Math.sin(phase) * 0.25;

    left[i] = sample;
    right[i] = sample;
  }

  return buffer;
}
