let audio: AudioContext | null = null;

function context() {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audio) audio = new Ctx();
  if (audio.state === "suspended") void audio.resume();
  return audio;
}

export function playTone(freq: number, dur = 0.07, type: OscillatorType = "triangle", gain = 0.035) {
  try {
    playToneUnsafe(freq, dur, type, gain);
  } catch {
    /* 소리가 막혀도 게임은 계속된다 */
  }
}

function playToneUnsafe(freq: number, dur: number, type: OscillatorType, gain: number) {
  const ctx = context();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(gain, ctx.currentTime);
  amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + dur);
}

export function playMark(valid: boolean, combo: number) {
  if (!valid) {
    playTone(150, 0.1, "square", 0.03);
    return;
  }
  playTone(640, 0.06);
  if (combo >= 2) playTone(640 * (1 + combo * 0.08), 0.09);
}

export function playSlash(grade: "MISS" | "HIT" | "CRITICAL" | "PERFECT") {
  if (grade === "MISS") {
    playTone(220, 0.12, "sawtooth", 0.025);
    return;
  }
  playTone(520, 0.05);
  window.setTimeout(() => playTone(grade === "PERFECT" ? 1040 : 780, 0.1), 70);
}
