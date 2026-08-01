/**
 * DaVinci Resolve–style waveform sync (client-side).
 * Decode audio from master + angle, downsample, cross-correlate to find
 * the best offset (ms). Positive offset = angle started AFTER master.
 */

const TARGET_RATE = 200; // samples per second for correlation
const MAX_ANALYZE_SEC = 90; // first N seconds — enough for live show sync

function downsample(channel: Float32Array, fromRate: number, seconds: number): Float32Array {
  const use = Math.min(channel.length, Math.floor(fromRate * seconds));
  const outLen = Math.max(1, Math.floor((use / fromRate) * TARGET_RATE));
  const out = new Float32Array(outLen);
  const step = use / outLen;
  for (let i = 0; i < outLen; i++) {
    const start = Math.floor(i * step);
    const end = Math.min(use, Math.floor((i + 1) * step));
    let sum = 0;
    for (let j = start; j < end; j++) sum += channel[j] * channel[j];
    out[i] = Math.sqrt(sum / Math.max(1, end - start)); // RMS energy
  }
  // Normalize
  let max = 0;
  for (let i = 0; i < out.length; i++) max = Math.max(max, out[i]);
  if (max > 0) for (let i = 0; i < out.length; i++) out[i] /= max;
  return out;
}

async function loadMonoChannel(
  url: string,
  ctx: AudioContext,
): Promise<{ data: Float32Array; sampleRate: number }> {
  const res = await fetch(url, { mode: "cors", cache: "force-cache" });
  if (!res.ok) throw new Error(`Could not fetch audio (${res.status})`);
  const buf = await res.arrayBuffer();
  const audio = await ctx.decodeAudioData(buf.slice(0));
  const ch0 = audio.getChannelData(0);
  if (audio.numberOfChannels === 1) {
    return { data: ch0, sampleRate: audio.sampleRate };
  }
  // Mixdown
  const mixed = new Float32Array(ch0.length);
  for (let c = 0; c < audio.numberOfChannels; c++) {
    const ch = audio.getChannelData(c);
    for (let i = 0; i < mixed.length; i++) mixed[i] += ch[i] / audio.numberOfChannels;
  }
  return { data: mixed, sampleRate: audio.sampleRate };
}

/**
 * Cross-correlation peak search.
 * Returns lag in samples of `angle` relative to `master` (at TARGET_RATE).
 * Positive lag = angle is delayed (starts later).
 */
function bestLag(master: Float32Array, angle: Float32Array): { lag: number; score: number } {
  const n = Math.min(master.length, angle.length);
  const maxLag = Math.floor(n * 0.4); // ±40% of analyzed window
  let best = 0;
  let bestScore = -Infinity;

  for (let lag = -maxLag; lag <= maxLag; lag++) {
    let score = 0;
    let count = 0;
    for (let i = 0; i < n; i++) {
      const j = i + lag;
      if (j < 0 || j >= n) continue;
      score += master[i] * angle[j];
      count++;
    }
    if (count > 0) score /= count;
    if (score > bestScore) {
      bestScore = score;
      best = lag;
    }
  }
  return { lag: best, score: bestScore };
}

export type WaveformSyncResult = {
  offsetMs: number;
  confidence: number; // 0–1 rough
  analyzedSec: number;
};

/**
 * Estimate how much later the angle starts vs master (ms).
 * Uses CORS-friendly public Blob URLs.
 */
export async function syncByWaveform(
  masterUrl: string,
  angleUrl: string,
  opts?: { maxSeconds?: number },
): Promise<WaveformSyncResult> {
  const maxSec = opts?.maxSeconds ?? MAX_ANALYZE_SEC;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  const ctx = new Ctx();
  try {
    const [m, a] = await Promise.all([
      loadMonoChannel(masterUrl, ctx),
      loadMonoChannel(angleUrl, ctx),
    ]);
    const master = downsample(m.data, m.sampleRate, maxSec);
    const angle = downsample(a.data, a.sampleRate, maxSec);
    const { lag, score } = bestLag(master, angle);
    // lag samples at TARGET_RATE: positive lag means angle delayed
    const offsetMs = Math.round((lag / TARGET_RATE) * 1000);
    const confidence = Math.max(0, Math.min(1, (score + 0.05) / 0.35));
    return {
      offsetMs,
      confidence,
      analyzedSec: Math.min(
        maxSec,
        m.data.length / m.sampleRate,
        a.data.length / a.sampleRate,
      ),
    };
  } finally {
    await ctx.close().catch(() => {});
  }
}
