/**
 * 効果音（WebAudio で合成。外部アセット不要）。
 *  - draw   : ツモ（軽いクリック）
 *  - discard: 打牌（コツッ）
 *  - call   : ポン/チー/カン（アクセント）
 *  - riichi : 立直（下降ベル）
 *  - win    : ロン/ツモ和了（明るい和音）
 *  - yakuman: 役満（ファンファーレ）
 *
 * ミュート状態は localStorage に保存。AudioContext はユーザー操作後に解錠する。
 */

const MUTE_KEY = "donjara_muted_v1";
let ctx = null;
let muted = false;

try {
  muted = localStorage.getItem(MUTE_KEY) === "1";
} catch (_) {
  muted = false;
}

function ac() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

/** 単音（周波数・長さ・波形・音量・遅延）を鳴らす。 */
function beep(freq, dur, { type = "sine", gain = 0.2, at = 0, sweepTo = null } = {}) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + at;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** ノイズ短音（打牌のコツッ音向け）。 */
function click(gain = 0.25) {
  const a = ac();
  if (!a) return;
  const len = Math.floor(a.sampleRate * 0.05);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  const g = a.createGain();
  g.gain.value = gain;
  src.buffer = buf;
  const filt = a.createBiquadFilter();
  filt.type = "bandpass";
  filt.frequency.value = 1800;
  src.connect(filt).connect(g).connect(a.destination);
  src.start();
}

export const sfx = {
  isMuted() {
    return muted;
  },
  setMuted(v) {
    muted = !!v;
    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch (_) {}
  },
  toggle() {
    this.setMuted(!muted);
    return muted;
  },
  /** 最初のユーザー操作で AudioContext を解錠する。 */
  unlock() {
    ac();
  },
  draw() {
    if (muted) return;
    beep(880, 0.06, { type: "triangle", gain: 0.12 });
  },
  discard() {
    if (muted) return;
    click(0.28);
  },
  call() {
    if (muted) return;
    beep(520, 0.12, { type: "square", gain: 0.16 });
    beep(780, 0.14, { type: "square", gain: 0.14, at: 0.06 });
  },
  riichi() {
    if (muted) return;
    beep(1046, 0.14, { type: "sine", gain: 0.2 });
    beep(784, 0.18, { type: "sine", gain: 0.2, at: 0.12 });
    beep(523, 0.28, { type: "sine", gain: 0.2, at: 0.26 });
  },
  win() {
    if (muted) return;
    // C E G C（明るいアルペジオ）
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => beep(f, 0.3, { type: "triangle", gain: 0.18, at: i * 0.08 }));
  },
  yakuman() {
    if (muted) return;
    const seq = [523, 659, 784, 1046, 1318, 1568];
    seq.forEach((f, i) => beep(f, 0.4, { type: "sawtooth", gain: 0.14, at: i * 0.11 }));
    // 上昇スイープで締め
    beep(784, 0.6, { type: "triangle", gain: 0.16, at: 0.7, sweepTo: 2093 });
  },
};
