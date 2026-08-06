/* ============================================================
 * Web Audio 合成吉他音色
 * 用于播放分解和弦
 * ============================================================ */
const GuitarAudio = (() => {
  let ctx = null;
  let master = null;

  function ensureCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* 播放单个音符（模拟吉他拨弦音色） */
  function playNote(freq, time, duration) {
    const c = ensureCtx();
    // 主振荡器（锯齿波，模拟拨弦）
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    // 低通滤波，模拟吉他箱体
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1800;
    filter.Q.value = 1;
    // 增益包络（快速起音，指数衰减）
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.6, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    // 谐波层（增加音色厚度）
    const osc2 = c.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = freq * 2;
    const gain2 = c.createGain();
    gain2.gain.setValueAtTime(0.0001, time);
    gain2.gain.exponentialRampToValueAtTime(0.2, time + 0.005);
    gain2.gain.exponentialRampToValueAtTime(0.0001, time + duration * 0.7);

    osc.connect(filter);
    osc2.connect(gain2);
    gain2.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    osc.start(time);
    osc2.start(time);
    osc.stop(time + duration + 0.05);
    osc2.stop(time + duration + 0.05);
  }

  /* 根据弦号获取该弦空弦频率 */
  function stringFreq(stringNum) {
    const base = { 6: 82.41, 5: 110.00, 4: 146.83, 3: 196.00, 2: 246.94, 1: 329.63 };
    return base[stringNum];
  }

  /* 播放分解和弦
   * chord: 和弦对象（含 fingering）
   * pattern: 弦序字符串，如 '5321'
   * bpm: 每分钟节拍数（决定分解速度）
   */
  function playArpeggio(chord, pattern, bpm) {
    const c = ensureCtx();
    const now = c.currentTime + 0.05;
    const noteDur = 60 / (bpm || 80) * 0.9; // 每个音符时长
    const strings = pattern.split('').map(Number);
    strings.forEach((s, i) => {
      const f = chord.fingering.find(x => x.string === s);
      if (!f || f.fret === -1) return; // 跳过不弹的弦
      const freq = stringFreq(s) * Math.pow(2, f.fret / 12);
      playNote(freq, now + i * noteDur, noteDur);
    });
  }

  /* 播放单个和弦（同时弹响所有弦） */
  function playChord(chord) {
    const c = ensureCtx();
    const now = c.currentTime + 0.05;
    chord.fingering.forEach(f => {
      if (f.fret === -1) return;
      const freq = stringFreq(f.string) * Math.pow(2, f.fret / 12);
      playNote(freq, now, 1.2);
    });
  }

  return { playArpeggio, playChord };
})();
