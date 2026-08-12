/* ============================================================
 * Web Audio 吉他音色（真实采样）
 * 使用 tonejs-instruments 吉他采样，本地打包于 audio/samples/
 * 注意：需通过本地服务器打开（如 start.sh 或 Live Server），
 *       直接 file:// 打开时浏览器禁止 fetch 本地文件。
 * ============================================================ */
const GuitarAudio = (() => {
  let ctx = null;
  let master = null;

  const sampler = {
    tone: null,    // 'nylon' | 'acoustic' | 'electric'
    loading: false,
    ready: false,
    buffers: null, // Map: 采样音名 -> { buffer, freq }
    token: 0
  };

  const SAMPLER_DIR = 'audio/samples/';
  const SAMPLER_FOLDERS = { nylon: 'guitar-nylon', acoustic: 'guitar-acoustic', electric: 'guitar-electric' };
  const SAMPLE_LISTS = {
    nylon: ['A2','A3','A4','A5','As5','B1','B2','B3','B4','Cs3','Cs4','Cs5','D2','D3','D5','Ds4','E2','E3','E4','E5','Fs2','Fs3','Fs4','Fs5','G3','G5','Gs2','Gs4','Gs5'],
    acoustic: ['A2','A3','A4','As2','As3','As4','B2','B3','B4','C3','C4','C5','Cs3','Cs4','Cs5','D2','D3','D4','D5','Ds2','Ds3','Ds4','E2','E3','E4','F2','F3','F4','Fs2','Fs3','Fs4','G2','G3','G4','Gs2','Gs3','Gs4'],
    electric: ['A2','A3','A4','A5','C3','C4','C5','C6','Cs2','Ds3','Ds4','Ds5','E2','Fs2','Fs3','Fs4','Fs5']
  };
  const NOTE_PCS = ['C','Cs','D','Ds','E','F','Fs','G','Gs','A','As','B'];
  const OPEN_MIDI = { 6: 40, 5: 45, 4: 50, 3: 55, 2: 59, 1: 64 }; // E2 A2 D3 G3 B3 E4

  function ensureCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      // 压缩限幅，防多弦同响削波
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 20;
      comp.ratio.value = 6;
      comp.attack.value = 0.003;
      comp.release.value = 0.25;
      master.connect(comp);
      comp.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* 弦的空弦频率 */
  function stringFreq(stringNum) {
    return { 6: 82.41, 5: 110.00, 4: 146.83, 3: 196.00, 2: 246.94, 1: 329.63 }[stringNum];
  }

  /* 音名 → 频率（升号写法，如 As2=A#2、Fs3=F#3） */
  function noteFreq(name) {
    const m = /^([A-G][s]?)(-?\d)$/.exec(name);
    if (!m) return 0;
    const pc = NOTE_PCS.indexOf(m[1]);
    const oct = +m[2];
    return 440 * Math.pow(2, ((oct + 1) * 12 + pc - 69) / 12);
  }

  /* 弦+品位 → 科学音名（升号写法） */
  function noteName(string, fret) {
    const midi = OPEN_MIDI[string] + fret;
    return NOTE_PCS[midi % 12] + (Math.floor(midi / 12) - 1);
  }

  /* 取与目标音高最近的采样 */
  function findNearest(note) {
    if (!sampler.buffers) return null;
    const target = noteFreq(note);
    let best = null, bestDiff = Infinity;
    sampler.buffers.forEach((entry, key) => {
      const diff = Math.abs(entry.freq - target);
      if (diff < bestDiff) { bestDiff = diff; best = entry; }
    });
    return best;
  }

  /* 采样播放：变速匹配目标音高，让采样自然衰减（不强制截断） */
  function playSample(string, fret, time) {
    const c = ensureCtx();
    const entry = findNearest(noteName(string, fret));
    if (!entry) return false;
    const targetFreq = stringFreq(string) * Math.pow(2, fret / 12);
    const src = c.createBufferSource();
    src.buffer = entry.buffer;
    src.playbackRate.value = targetFreq / entry.freq;
    // 变速后的实际采样时长（真实吉他音符自然衰减，通常 2~3 秒）
    const sampleDur = entry.buffer.duration / src.playbackRate.value;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.9, time + 0.006);
    // 起音后保持 0.9，让采样自然衰减，末尾加短 release 收尾
    const releaseStart = time + Math.max(0, sampleDur - 0.08);
    gain.gain.setValueAtTime(0.9, releaseStart);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + sampleDur);
    src.connect(gain);
    gain.connect(master);
    src.start(time);
    src.stop(time + sampleDur + 0.05);
    src.onended = () => { try { gain.disconnect(); } catch (e) {} };
    return true;
  }

  /* 按当前音色播放一根弦 */
  function playString(string, fret, time, sustain) {
    playSample(string, fret, time);
  }

  /* 播放分解和弦 */
  function playArpeggio(chord, pattern, bpm) {
    const c = ensureCtx();
    const now = c.currentTime + 0.05;
    const noteDur = 60 / (bpm || 80) * 0.9; // 音符开始间隔
    [...pattern].map(Number).forEach((s, i) => {
      const f = chord.fingering.find(x => x.string === s);
      if (!f || f.fret === -1) return;
      playString(f.string, f.fret, now + i * noteDur);
    });
  }

  /* 播放单个和弦（同时弹响所有弦） */
  function playChord(chord) {
    const c = ensureCtx();
    const now = c.currentTime + 0.05;
    chord.fingering.forEach(f => {
      if (f.fret === -1) return;
      playSample(f.string, f.fret, now);
    });
  }

  /* 播放扫弦节奏：下扫 6弦→1弦、上扫 1弦→6弦，真实采样 */
  function playStrum(chord, slots, bpm) {
    const c = ensureCtx();
    const now = c.currentTime + 0.05;
    const sixteenth = 60 / (bpm || 80) / 4; // 每个十六分音符时长
    [...slots].forEach((dir, i) => {
      if (dir !== 'd' && dir !== 'u') return;
      const t = now + i * sixteenth;
      const order = dir === 'd' ? [6,5,4,3,2,1] : [1,2,3,4,5,6];
      order.forEach((s, k) => {
        const f = chord.fingering.find(x => x.string === s);
        if (!f || f.fret === -1) return;
        playSample(f.string, f.fret, t + k * 0.015);
      });
    });
  }

  /* ---------- 音色与采样加载 ---------- */
  function isSamplerReady() { return sampler.ready; }
  function isSamplerLoading() { return sampler.loading; }
  function currentTone() { return sampler.tone; }

  function loadSampler(tone, onProgress, onDone, onError) {
    const c = ensureCtx();
    if (sampler.tone === tone && sampler.ready) { if (onDone) onDone(); return; }
    // 本地 file:// 打开时浏览器禁止 fetch 本地文件，直接报错提示
    if (typeof location !== 'undefined' && location.protocol === 'file:') {
      if (onError) onError();
      return;
    }
    const token = ++sampler.token;
    sampler.loading = true;
    const dir = SAMPLER_DIR + (SAMPLER_FOLDERS[tone] || SAMPLER_FOLDERS.nylon) + '/';
    const files = SAMPLE_LISTS[tone] || SAMPLE_LISTS.nylon;
    const buffers = new Map();
    let loaded = 0;
    files.forEach(name => {
      fetch(dir + name + '.mp3')
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
        .then(buf => c.decodeAudioData(buf))
        .then(audioBuf => { buffers.set(name, { buffer: audioBuf, freq: noteFreq(name) }); })
        .catch(() => {})
        .then(() => {
          if (token !== sampler.token) return; // 已被新的加载请求取代
          loaded++;
          if (onProgress) onProgress(loaded / files.length);
          if (loaded >= files.length) {
            sampler.loading = false;
            if (buffers.size > 0) {
              sampler.buffers = buffers;
              sampler.tone = tone;
              sampler.ready = true;
              if (onDone) onDone();
            } else {
              sampler.ready = false;
              if (onError) onError();
            }
          }
        });
    });
  }

  return { playArpeggio, playChord, playStrum, isSamplerReady, isSamplerLoading, currentTone, loadSampler };
})();
