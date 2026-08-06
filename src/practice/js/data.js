/* ============================================================
 * 吉他和弦知识库
 * 包含：常见调的音阶、各级数和弦构成音、和弦属性、指法、根音、分解和弦
 * 使用紧凑格式定义，运行时展开为完整对象
 * ============================================================ */

// 音名频率映射（用于 Web Audio 合成）
const NOTE_FREQ = {
  'C':261.63,'C#':277.18,'Db':277.18,'D':293.66,'D#':311.13,'Eb':311.13,
  'E':329.63,'F':349.23,'F#':369.99,'Gb':369.99,'G':392.00,'G#':415.30,
  'Ab':415.30,'A':440.00,'A#':466.16,'Bb':466.16,'B':493.88
};

// 和弦属性
const CHORD_TYPES = {
  major:     { label:'大三和弦', short:'三和弦' },
  minor:     { label:'小三和弦', short:'三和弦' },
  dim:       { label:'减三和弦', short:'三和弦' },
  major7:    { label:'大七和弦', short:'七和弦' },
  minor7:    { label:'小七和弦', short:'七和弦' },
  dominant7: { label:'属七和弦', short:'七和弦' },
  dim7:      { label:'减七和弦', short:'七和弦' }
};

// 各调音阶（自然大调）
const SCALES = {
  C:['C','D','E','F','G','A','B'],
  G:['G','A','B','C','D','E','F#'],
  D:['D','E','F#','G','A','B','C#'],
  A:['A','B','C#','D','E','F#','G#'],
  E:['E','F#','G#','A','B','C#','D#'],
  F:['F','G','A','Bb','C','D','E']
};

// 级数标记（三和弦 + 七和弦）
const DEGREES = ['I','ii','iii','IV','V','vi','vii°'];

/* 和弦紧凑定义：
 * [name, degree, type, rootNote, rootString, fingeringStr, arpeggioPatterns]
 * fingeringStr: 6弦到1弦的品位，x=不弹，0=空弦，数字=品位
 * arpeggioPatterns: 分解和弦弦序数组，如 ['5321','532353']
 */
const CHORD_DEFS = {
  C: [
    ['C','I','major','C',5,'x32010',['5321','532353','532123']],
    ['Dm','ii','minor','D',4,'xx0231',['4321','432343']],
    ['Em','iii','minor','E',6,'022000',['6321','632363']],
    ['F','IV','major','F',6,'133211',['6321','632363']],
    ['G','V','major','G',6,'320003',['6321','632363']],
    ['Am','vi','minor','A',5,'x02210',['5321','532353']],
    ['Bdim','vii°','dim','B',5,'x23101',['5321']],
    ['Cmaj7','I7','major7','C',5,'x32000',['5321']],
    ['Dm7','ii7','minor7','D',4,'xx0211',['4321']],
    ['Em7','iii7','minor7','E',6,'020000',['6321']],
    ['Fmaj7','IV7','major7','F',6,'132010',['6321']],
    ['G7','V7','dominant7','G',6,'320001',['6321']],
    ['Am7','vi7','minor7','A',5,'x02010',['5321']]
  ],
  G: [
    ['G','I','major','G',6,'320003',['6321','632363']],
    ['Am','ii','minor','A',5,'x02210',['5321']],
    ['Bm','iii','minor','B',5,'x24432',['5321']],
    ['C','IV','major','C',5,'x32010',['5321']],
    ['D','V','major','D',4,'xx0232',['4321']],
    ['Em','vi','minor','E',6,'022000',['6321']],
    ['F#dim','vii°','dim','F#',6,'243211',['6321']],
    ['G7','I7','dominant7','G',6,'320001',['6321']],
    ['Am7','ii7','minor7','A',5,'x02010',['5321']],
    ['Bm7','iii7','minor7','B',5,'x24232',['5321']],
    ['Cmaj7','IV7','major7','C',5,'x32000',['5321']],
    ['D7','V7','dominant7','D',4,'xx0212',['4321']],
    ['Em7','vi7','minor7','E',6,'020000',['6321']]
  ],
  D: [
    ['D','I','major','D',4,'xx0232',['4321','432343']],
    ['Em','ii','minor','E',6,'022000',['6321']],
    ['F#m','iii','minor','F#',6,'244222',['6321']],
    ['G','IV','major','G',6,'320003',['6321']],
    ['A','V','major','A',5,'x02220',['5321']],
    ['Bm','vi','minor','B',5,'x24432',['5321']],
    ['C#dim','vii°','dim','C#',5,'x45321',['5321']],
    ['D7','I7','dominant7','D',4,'xx0212',['4321']],
    ['Em7','ii7','minor7','E',6,'020000',['6321']],
    ['F#m7','iii7','minor7','F#',6,'242222',['6321']],
    ['Gmaj7','IV7','major7','G',6,'320002',['6321']],
    ['A7','V7','dominant7','A',5,'x02020',['5321']],
    ['Bm7','vi7','minor7','B',5,'x24232',['5321']]
  ],
  A: [
    ['A','I','major','A',5,'x02220',['5321','532353']],
    ['Bm','ii','minor','B',5,'x24432',['5321']],
    ['C#m','iii','minor','C#',5,'x46654',['5321']],
    ['D','IV','major','D',4,'xx0232',['4321']],
    ['E','V','major','E',6,'022100',['6321']],
    ['F#m','vi','minor','F#',6,'244222',['6321']],
    ['G#dim','vii°','dim','G#',6,'453231',['6321']],
    ['A7','I7','dominant7','A',5,'x02020',['5321']],
    ['Bm7','ii7','minor7','B',5,'x24232',['5321']],
    ['C#m7','iii7','minor7','C#',5,'x46454',['5321']],
    ['Dmaj7','IV7','major7','D',4,'xx0222',['4321']],
    ['E7','V7','dominant7','E',6,'020100',['6321']],
    ['F#m7','vi7','minor7','F#',6,'242222',['6321']]
  ],
  E: [
    ['E','I','major','E',6,'022100',['6321','632363']],
    ['F#m','ii','minor','F#',6,'244222',['6321']],
    ['G#m','iii','minor','G#',6,'466444',['6321']],
    ['A','IV','major','A',5,'x02220',['5321']],
    ['B','V','major','B',5,'x24442',['5321']],
    ['C#m','vi','minor','C#',5,'x46654',['5321']],
    ['D#dim','vii°','dim','D#',6,'x45321',['6321']],
    ['E7','I7','dominant7','E',6,'020100',['6321']],
    ['F#m7','ii7','minor7','F#',6,'242222',['6321']],
    ['G#m7','iii7','minor7','G#',6,'464444',['6321']],
    ['Amaj7','IV7','major7','A',5,'x02120',['5321']],
    ['B7','V7','dominant7','B',5,'x24242',['5321']],
    ['C#m7','vi7','minor7','C#',5,'x46454',['5321']]
  ],
  F: [
    ['F','I','major','F',6,'133211',['6321','632363']],
    ['Gm','ii','minor','G',6,'355333',['6321']],
    ['Am','iii','minor','A',5,'x02210',['5321']],
    ['Bb','IV','major','Bb',6,'x13331',['6321']],
    ['C','V','major','C',5,'x32010',['5321']],
    ['Dm','vi','minor','D',4,'xx0231',['4321']],
    ['Edim','vii°','dim','E',6,'x23101',['6321']],
    ['F7','I7','dominant7','F',6,'131211',['6321']],
    ['Gm7','ii7','minor7','G',6,'353333',['6321']],
    ['Am7','iii7','minor7','A',5,'x02010',['5321']],
    ['Bbmaj7','IV7','major7','Bb',6,'x13231',['6321']],
    ['C7','V7','dominant7','C',5,'x32310',['5321']],
    ['Dm7','vi7','minor7','D',4,'xx0211',['4321']]
  ]
};

/* 分解和弦名称与描述 */
const ARPEGGIO_INFO = {
  '5321':   { name:'T-3-2-1', desc:'根音→3弦→2弦→1弦，最常用分解' },
  '532353': { name:'T-3-2-3-1-3', desc:'根音→3弦→2弦→3弦→1弦→3弦，民谣经典节奏' },
  '532123': { name:'T-3-2-1-2-3', desc:'根音→3弦→2弦→1弦→2弦→3弦，抒情分解' },
  '4321':   { name:'T-3-2-1', desc:'根音→3弦→2弦→1弦' },
  '432343': { name:'T-3-2-3-1-3', desc:'根音→3弦→2弦→3弦→1弦→3弦' },
  '6321':   { name:'T-3-2-1', desc:'根音→3弦→2弦→1弦' },
  '632363': { name:'T-3-2-3-1-3', desc:'根音→3弦→2弦→3弦→1弦→3弦' }
};

/* 解析指法字符串为对象数组 */
function parseFingering(str) {
  // str 为 6弦到1弦，如 'x32010'
  const result = [];
  const chars = str.split('');
  for (let i = 0; i < 6; i++) {
    const string = 6 - i; // 弦号 6..1
    const c = chars[i];
    if (c === 'x') {
      result.push({ string, fret: -1, finger: -1 });
    } else {
      const fret = parseInt(c, 10);
      result.push({ string, fret, finger: 0 });
    }
  }
  return result;
}

/* 根据根音和和弦类型计算构成音 */
function buildTones(rootNote, type) {
  const semitones = {
    major: [0,4,7],
    minor: [0,3,7],
    dim: [0,3,6],
    major7: [0,4,7,11],
    minor7: [0,3,7,10],
    dominant7: [0,4,7,10],
    dim7: [0,3,6,9]
  }[type];
  const order = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const idx = order.indexOf(rootNote);
  return semitones.map(s => order[(idx + s) % 12]);
}

/* 根据和弦类型计算构成音级数 */
function buildToneNums(type) {
  return {
    major: ['1','3','5'],
    minor: ['1','b3','5'],
    dim: ['1','b3','b5'],
    major7: ['1','3','5','7'],
    minor7: ['1','b3','5','b7'],
    dominant7: ['1','3','5','b7'],
    dim7: ['1','b3','b5','bb7']
  }[type];
}

/* 展开完整和弦对象 */
function expandChord(def) {
  const [name, degree, type, rootNote, rootString, fingeringStr, arpPatterns] = def;
  const arpeggio = arpPatterns.map(p => {
    const info = ARPEGGIO_INFO[p] || { name:p, desc:'' };
    return { name: info.name, pattern: p, desc: info.desc };
  });
  return {
    name, degree, type,
    root: { note: rootNote, string: rootString },
    tones: buildTones(rootNote, type),
    toneNums: buildToneNums(type),
    fingering: parseFingering(fingeringStr),
    arpeggio
  };
}

/* 构建完整 KEYS 数据 */
const KEYS = {};
for (const key in CHORD_DEFS) {
  KEYS[key] = {
    name: key + ' 大调',
    scale: SCALES[key],
    chords: CHORD_DEFS[key].map(expandChord)
  };
}
