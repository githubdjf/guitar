/* ============================================================
 * 吉他和弦转换练习 - 主逻辑
 * ============================================================ */
(function() {
  'use strict';

  /* ---------- 状态 ---------- */
  let tasks = [];          // 任务列表
  let currentTaskId = null; // 当前选中任务
  let currentChordIdx = 0;  // 当前显示的和弦索引
  let timer = null;         // 训练计时器
  let trainingState = 'idle'; // 训练状态：idle 未开始 / running 转换中 / paused 已暂停
  let editingId = null;     // 正在编辑的任务 id
  let shuffledOrder = [];   // 随机模式的乱序集合（和弦索引数组）
  let shuffledIdx = 0;      // 当前在乱序集合中的位置


  const STORAGE_KEY = 'guitar_practice_tasks';
  const PRESET_SEEDED_KEY = 'guitar_presets_seeded_v2';

  /* ---------- 预制任务（民谣主流三和弦） ---------- */
  function presetTask(id, name, chords, opts) {
    return Object.assign({
      id,
      name,
      key: chords[0].key,
      chords,
      mode: 'sequential',
      speed: 60,
      preview: true,
      previewContent: ['name'],
      displayMode: 'detail',
      displayContent: ['basic', 'detail', 'arpeggio', 'strum'],
      playTone: 'nylon',
      playChord: true
    }, opts || {});
  }
  function ch(key, name) { return { key, name }; }

  const PRESET_TASKS = [
    /* ===== C 调 10 套 ===== */
    presetTask('preset-c-1', 'C调·万能四和弦 I-vi-IV-V（1-6-4-5）',
      [ch('C','C'), ch('C','Am'), ch('C','F'), ch('C','G')], { speed: 60 }),
    presetTask('preset-c-2', 'C调·正格进行 I-IV-V（1-4-5）',
      [ch('C','C'), ch('C','F'), ch('C','G')], { speed: 80 }),
    presetTask('preset-c-3', 'C调·卡农进行 I-V-vi-iii-IV-I-IV-V（1-5-6-3-4-1-4-5）',
      [ch('C','C'), ch('C','G'), ch('C','Am'), ch('C','Em'), ch('C','F'), ch('C','C'), ch('C','F'), ch('C','G')], { speed: 50 }),
    presetTask('preset-c-4', 'C调·流行四和弦 vi-IV-I-V（6-4-1-5）',
      [ch('C','Am'), ch('C','F'), ch('C','C'), ch('C','G')], { speed: 60 }),
    presetTask('preset-c-5', 'C调·伤感下行 I-iii-vi-IV（1-3-6-4）',
      [ch('C','C'), ch('C','Em'), ch('C','Am'), ch('C','F')], { speed: 60 }),
    presetTask('preset-c-6', 'C调·民谣温暖 I-IV-vi-V（1-4-6-5）',
      [ch('C','C'), ch('C','F'), ch('C','Am'), ch('C','G')], { speed: 60 }),
    presetTask('preset-c-7', 'C调·老派进行 I-vi-ii-V（1-6-2-5）',
      [ch('C','C'), ch('C','Am'), ch('C','Dm'), ch('C','G')], { speed: 60 }),
    presetTask('preset-c-8', 'C调·民谣摇滚 I-V-IV（1-5-4）',
      [ch('C','C'), ch('C','G'), ch('C','F')], { speed: 80 }),
    presetTask('preset-c-9', 'C调·循环推进 I-IV-V-vi（1-4-5-6）',
      [ch('C','C'), ch('C','F'), ch('C','G'), ch('C','Am')], { speed: 70 }),
    presetTask('preset-c-10', 'C调·全六和弦综合 I-ii-iii-IV-V-vi（1-2-3-4-5-6）',
      [ch('C','C'), ch('C','Dm'), ch('C','Em'), ch('C','F'), ch('C','G'), ch('C','Am')], { speed: 60, mode: 'random' }),

    /* ===== G 调 5 套 ===== */
    presetTask('preset-g-1', 'G调·万能四和弦 I-vi-IV-V（1-6-4-5）',
      [ch('G','G'), ch('G','Em'), ch('G','C'), ch('G','D')], { speed: 60 }),
    presetTask('preset-g-2', 'G调·正格进行 I-IV-V（1-4-5）',
      [ch('G','G'), ch('G','C'), ch('G','D')], { speed: 80 }),
    presetTask('preset-g-3', 'G调·卡农进行 I-V-vi-iii-IV-I-IV-V（1-5-6-3-4-1-4-5）',
      [ch('G','G'), ch('G','D'), ch('G','Em'), ch('G','Bm'), ch('G','C'), ch('G','G'), ch('G','C'), ch('G','D')], { speed: 50 }),
    presetTask('preset-g-4', 'G调·流行四和弦 vi-IV-I-V（6-4-1-5）',
      [ch('G','Em'), ch('G','C'), ch('G','G'), ch('G','D')], { speed: 60 }),
    presetTask('preset-g-5', 'G调·温暖民谣 I-IV-vi-V（1-4-6-5）',
      [ch('G','G'), ch('G','C'), ch('G','Em'), ch('G','D')], { speed: 60 })
  ];

  /* ---------- DOM 引用 ---------- */
  const $ = id => document.getElementById(id);
  const els = {
    navbarTaskName: $('navbarTaskName'),
    previewSection: $('previewSection'),
    previewList: $('previewList'),
    contentArea: $('contentArea'),
    startBtn: $('startBtn'),
    restartBtn: $('restartBtn'),
    speedTag: $('speedTag'),
    modeTag: $('modeTag'),



    taskList: $('taskList'),
    sidePanel: $('sidePanel'),
    hamburgerBtn: $('hamburgerBtn'),
    closeDrawerBtn: $('closeDrawerBtn'),
    drawerBackdrop: $('drawerBackdrop'),
    playToneField: $('playToneField'),
    newTaskBtn: $('newTaskBtn'),
    exportBtn: $('exportBtn'),
    importBtn: $('importBtn'),
    importFile: $('importFile'),
    restorePresetsBtn: $('restorePresetsBtn'),
    taskModal: $('taskModal'),
    modalTitle: $('modalTitle'),
    modalClose: $('modalClose'),
    modalCancel: $('modalCancel'),
    modalSave: $('modalSave'),
    fName: $('f-name'),
    chordSelector: $('chordSelector'),
    orderField: $('orderField'),
    orderList: $('orderList'),
    fSpeed: $('f-speed'),
    previewContentField: $('previewContentField'),

    previewContentGroup: $('previewContentGroup'),
    displayContentField: $('displayContentField'),
    displayContentFieldGroup: $('displayContentFieldGroup'),
    toast: $('toast')


  };

  /* ---------- 工具函数 ---------- */
  function toast(msg, isError) {
    els.toast.textContent = msg;
    els.toast.classList.toggle('error', !!isError);
    els.toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => els.toast.classList.remove('show'), 2200);
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&','<':'<','>':'>','"':'"',"'":'&#39;'
    }[c]));
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* 将音名/和弦名拆分为：基础字母 + 升降号（#/b）+ 后缀 */
  function splitNote(name) {
    const m = /^([A-Ga-g])([#b]?)(.*)$/.exec(String(name));
    if (!m) return { letter: String(name), acc: '', suffix: '' };
    return { letter: m[1], acc: m[2], suffix: m[3] };
  }

  /* HTML：把升降号渲染为基础字母左上角的 ♯/♭（不放在右边） */
  function noteHTML(name) {
    const { letter, acc, suffix } = splitNote(name);
    if (!acc) return esc(name);
    const sym = acc === '#' ? '♯' : '♭';
    return `<span class="note-w"><span class="note-acc">${sym}</span><span class="note-base">${esc(letter)}</span></span><span class="note-suffix">${esc(suffix)}</span>`;
  }

  /* SVG 文本：和弦图底部名称中的升降号同样置于左上角 */
  function svgNameTspans(name) {
    const { letter, acc, suffix } = splitNote(name);
    if (!acc) return esc(name);
    const sym = acc === '#' ? '♯' : '♭';
    return `<tspan class="cd-acc" dx="-10" dy="-5">${sym}</tspan><tspan dx="2">${esc(letter)}</tspan><tspan class="cd-suffix">${esc(suffix)}</tspan>`;
  }

  /* ---------- 和弦音位指板（根音区）辅助 ---------- */
  const OPEN_PC = { 6: 4, 5: 9, 4: 2, 3: 7, 2: 11, 1: 4 }; // 空弦音半音序号（E A D G B E）
  const CHROMATIC_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const CHROMATIC_FLAT = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
  const FLAT_KEYS = ['F','Bb','Eb','Ab'];

  /* 按调拼写音名：降号调用降号、升号调用升号，自然音永远用本名 */
  function noteAt(key, string, fret) {
    const pc = (OPEN_PC[string] + fret) % 12;
    return (FLAT_KEYS.includes(key) ? CHROMATIC_FLAT : CHROMATIC_SHARP)[pc];
  }

  /* SVG 文本：指板音名，字母精确居中在弦上，升降号固定于字母左上旁 */
  function svgNoteTspans(note, x) {
    const { letter, acc } = splitNote(note);
    if (!acc) return esc(note);
    const sym = acc === '#' ? '♯' : '♭';
    return `<tspan class="rf-acc" x="${x - 8}" dy="-3.5">${sym}</tspan><tspan x="${x}" dy="0">${esc(letter)}</tspan>`;
  }

  /* 扫弦方向 SVG 箭头（下扫 / 上扫，随 currentColor 变色） */
  function strumArrowSVG(dir) {
    return dir === 'd'
      ? '<svg class="strum-arrow" viewBox="0 0 15 24"><path d="M7.5 2 L7.5 20 M7.5 20 L3 15 M7.5 20 L12 15" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : '<svg class="strum-arrow" viewBox="0 0 15 24"><path d="M7.5 22 L7.5 4 M7.5 4 L3 9 M7.5 4 L12 9" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  /* 和弦级数 → 悬停提示（罗马数字含义） */
  const DEGREE_TIPS = {
    I: '一级和弦（主和弦）：大调主音上的大三和弦，和声最稳定',
    ii: '二级和弦（上主和弦）：小三和弦',
    iii: '三级和弦（中音和弦）：小三和弦',
    IV: '四级和弦（下属和弦）：大三和弦',
    V: '五级和弦（属和弦）：大三和弦，常带紧张感',
    vi: '六级和弦（下中音和弦）：小三和弦',
    'vii°': '七级和弦：导音上构建的减三和弦（° 是减和弦记号，音程 1-♭3-♭5）',
    I7: '一级大七和弦（主和弦加七音）',
    ii7: '二级小七和弦',
    iii7: '三级小七和弦',
    IV7: '四级大七和弦',
    V7: '五级属七和弦（属和弦加小七度，收束感强）',
    vi7: '六级小七和弦'
  };
  function degreeTitle(degree) {
    return DEGREE_TIPS[degree] || '和弦级数：罗马数字表示该和弦建立在音阶的第几级音上（大写=大三和弦，小写=小三和弦，°=减和弦）';
  }

  /* 和弦属性 → 悬停提示（构成音说明） */
  const TYPE_TIPS = {
    major: '大三和弦：根音+大三度+纯五度，音色明亮稳定',
    minor: '小三和弦：根音+小三度+纯五度，音色柔和忧伤',
    dim: '减三和弦：根音+小三度+减五度，音色紧张（常用记号 °）',
    major7: '大七和弦：大三和弦+大七度，音色梦幻爵士',
    minor7: '小七和弦：小三和弦+小七度，音色慵懒',
    dominant7: '属七和弦：大三和弦+小七度，音色有推进感',
    dim7: '减七和弦：减三和弦+减七度，音色尖锐'
  };
  function typeTitle(type) {
    return TYPE_TIPS[type] || '';
  }

  /* 根据和弦名查找和弦对象 */
  function findChord(key, name) {
    const k = KEYS[key];
    if (!k) return null;
    return k.chords.find(c => c.name === name) || null;
  }

  /* 获取任务的和弦完整对象列表（附带各自所属调 _key，供显示使用） */
  function getTaskChords(task) {
    return task.chords.map(c => {
      const ch = findChord(c.key, c.name);
      return ch ? Object.assign({}, ch, { _key: c.key }) : null;
    }).filter(Boolean);
  }

  /* ---------- 持久化 ---------- */
  function saveTasks() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
    catch (e) { /* ignore */ }
  }
  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      tasks = raw ? JSON.parse(raw) : [];
    } catch (e) { tasks = []; }
  }

  /* 补齐缺失的预制任务（按 id 去重，不会覆盖用户自己改过的同 id 任务以外的内容） */
  function mergePresets() {
    const existing = new Set(tasks.map(t => t.id));
    let added = 0;
    PRESET_TASKS.forEach(p => {
      if (!existing.has(p.id)) {
        tasks.push(JSON.parse(JSON.stringify(p)));
        added++;
      }
    });
    if (added) saveTasks();
    return added;
  }

  /* 是否为预制任务 */
  function isPreset(task) {
    return !!(task && typeof task.id === 'string' && task.id.indexOf('preset-') === 0);
  }

  /* 启动时幂等校验：
   * - 一条预制任务都没有（被导入覆盖 / localStorage 清空 / 全删光）→ 自动补回全部
   * - 只删了其中几条 → 不自动加回（尊重用户删除，可用侧栏按钮手动恢复） */
  function ensurePresets() {
    if (!tasks.some(isPreset)) mergePresets();
    try { localStorage.setItem(PRESET_SEEDED_KEY, '1'); } catch (e) { /* ignore */ }
    if (!currentTaskId && tasks.length) currentTaskId = PRESET_TASKS[0].id;
  }

  /* 手动恢复预制任务（侧栏按钮） */
  function restorePresets() {
    const added = mergePresets();
    renderTaskList();
    if (!currentTaskId && tasks.length) {
      currentTaskId = tasks[0].id;
      applyAudioMode(tasks[0]);
    }
    renderNavbar();
    renderContent();
    toast(added ? `已恢复 ${added} 个预制任务` : '预制任务已齐全');
  }

  /* ---------- 渲染：任务列表 ---------- */
  function taskItemHTML(t) {
    const active = t.id === currentTaskId ? ' active' : '';
    const chips = t.chords.slice(0, 6).map(c => `<span class="chip">${noteHTML(c.name)}</span>`).join('');
    const more = t.chords.length > 6 ? `<span class="chip">+${t.chords.length - 6}</span>` : '';
    return `<div class="task-item${active}" data-id="${t.id}">
      <div class="t-head">
        <div class="t-name">${esc(t.name)}</div>
        <div class="t-actions">
          <button class="edit" data-action="edit" title="编辑">✏️</button>
          <button class="del" data-action="del" title="删除">🗑</button>
        </div>
      </div>
      <div class="t-meta">
        ${t.mode === 'random' ? '随机转换' : '顺序转换'} · ${t.speed}次/分
        <div class="chips">${chips}${more}</div>
      </div>
    </div>`;
  }

  function renderTaskList() {
    if (!tasks.length) {
      els.taskList.innerHTML = '<div class="task-empty"><div class="icon">🎸</div>暂无任务<br>点击「新建任务」开始</div>';
      return;
    }
    // 分组：C 调预制 / G 调预制 / 其它调预制 / 我的任务
    const presetRest = tasks.filter(t => isPreset(t) && t.key !== 'C' && t.key !== 'G');
    const groups = [
      { title: '🎸 C 调·民谣预制', list: tasks.filter(t => isPreset(t) && t.key === 'C') },
      { title: '🎸 G 调·民谣预制', list: tasks.filter(t => isPreset(t) && t.key === 'G') },
      { title: '🎸 其它调·预制', list: presetRest },
      { title: '✍️ 我的任务', list: tasks.filter(t => !isPreset(t)) }
    ];
    els.taskList.innerHTML = groups.filter(g => g.list.length).map(g =>
      `<div class="task-group-head">${g.title}<span class="tg-count">${g.list.length}</span></div>` +
      g.list.map(taskItemHTML).join('')
    ).join('');
  }

  /* ---------- 渲染：导航栏任务名 + 模式tag + 预览 ---------- */
  function renderNavbar() {
    const task = tasks.find(t => t.id === currentTaskId);
    if (!task) {
      els.navbarTaskName.innerHTML = '<span class="icon">🎸</span><span class="name">吉他和弦转换练习</span>';
      els.modeTag.textContent = '';
      els.previewSection.style.display = 'none';
      els.previewList.innerHTML = '';
      return;
    }
    els.navbarTaskName.innerHTML = `<span class="icon">🎸</span><span class="name">${esc(task.name)}</span>`;
    els.modeTag.textContent = task.mode === 'random' ? '随机' : '顺序';

    // 预览内容：勾选什么显示什么
    const showName = task.previewContent && task.previewContent.includes('name');
    const showFinger = task.previewContent && task.previewContent.includes('fingering');
    // 都不勾选 → 视为预览为否，隐藏预览区
    if (!task.preview || (!showName && !showFinger)) {
      els.previewSection.style.display = 'none';
      els.previewList.innerHTML = '';
      return;
    }
    els.previewSection.style.display = 'block';
    const chords = getTaskChords(task);

    // 预览顺序：顺序模式按编排顺序，随机模式按乱序集合（集合未就绪或与和弦数不匹配时回退编排顺序）
    const randomReady = task.mode === 'random' && shuffledOrder.length === chords.length;
    const order = randomReady ? shuffledOrder.map(idx => chords[idx]) : chords;
    const activeIdx = randomReady ? shuffledIdx : currentChordIdx;
    const items = order.map((c, i) => {
      const active = i === activeIdx ? ' active' : '';
      const name = showName ? `<div class="p-name">${noteHTML(c.name)}</div>` : '';
      const finger = showFinger ? `<div class="p-finger">${buildChordDiagramSVG(c, { preview: true })}</div>` : '';
      return `<div class="preview-item${active}" data-idx="${i}">${name}${finger}</div>`;
    }).join('');
    els.previewList.innerHTML = items;
    scrollPreviewToActive();
  }


  /* 预览区自动滑动：确保当前和弦完全显示且尽可能居中 */
  function scrollPreviewToActive() {
    const list = els.previewList;
    const active = list.querySelector('.preview-item.active');
    if (!active) return;
    const listRect = list.getBoundingClientRect();
    const itemRect = active.getBoundingClientRect();
    // 若当前项已完全可见，则不滚动
    if (itemRect.left >= listRect.left && itemRect.right <= listRect.right) return;
    // 计算目标 scrollLeft，使当前项居中
    const target = active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2;
    list.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }


  /* 指法字符串（如 x32010） */
  function fingerStr(chord) {
    return chord.fingering.map(f => f.fret === -1 ? 'x' : String(f.fret)).join('');
  }

  /* ============================================================
   * 标准和弦图（SVG）生成
   * 竖线=6根弦（左→右：6弦→1弦），横线=品丝，圆点=按弦位置
   * 顶部 X=不弹，O=空弦；自动确定起始品位；名称在下方居中
   * ============================================================ */
  function buildChordDiagramSVG(chord, opts) {
    const isPreview = !!(opts && opts.preview); // 预览紧凑模式：指板居中、不带品号/箭头/名称
    const f = chord.fingering; // 6个对象，string 6..1
    const frets = f.map(x => x.fret);
    const posFrets = frets.filter(x => x > 0);
    const maxFret = posFrets.length ? Math.max(...posFrets) : 0;
    const minFret = posFrets.length ? Math.min(...posFrets) : 0;

    // 确定起始品位：若最大品位<=4 从1品开始；否则从最小品位开始
    let startFret = 1;
    if (maxFret > 4) {
      startFret = minFret;
    }
    // 显示品数：从 startFret 到 maxFret，至少 4 品
    const fretCount = Math.max(4, maxFret - startFret + 1);

    // 几何参数
    const stringGap = 22;      // 弦间距
    const fretGap = 26;        // 品间距
    const marginTop = 24;      // 顶部留白（放 X/O 标记）
    // 预览：左右留白对称、底部留白小，指板在视口中居中；详情：右侧留白放品号、底部放箭头与名称
    const marginLeft = isPreview ? 14 : 22;
    const rightMargin = isPreview ? 14 : 42;
    const nameSpace = isPreview ? 24 : 58;
    const dotR = 8.5;          // 按弦圆点半径
    const W = marginLeft + stringGap * 5 + rightMargin;
    const H = marginTop + fretGap * fretCount + nameSpace;

    // 弦的 x 坐标（6弦在左）
    const stringX = i => marginLeft + i * stringGap; // i=0..5 对应 6..1 弦
    // 品线 y 坐标（第 n 品线，n=0 为上弦枕）
    const fretY = n => marginTop + n * fretGap;

    let svg = '';
    svg += `<svg class="chord-diagram" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;

    // 上弦枕（粗线）
    svg += `<line x1="${stringX(0)}" y1="${fretY(0)}" x2="${stringX(5)}" y2="${fretY(0)}" class="cd-nut"/>`;

    // 品线
    for (let n = 1; n <= fretCount; n++) {
      svg += `<line x1="${stringX(0)}" y1="${fretY(n)}" x2="${stringX(5)}" y2="${fretY(n)}" class="cd-fret"/>`;
    }

    // 弦线
    for (let i = 0; i < 6; i++) {
      svg += `<line x1="${stringX(i)}" y1="${fretY(0)}" x2="${stringX(i)}" y2="${fretY(fretCount)}" class="cd-string"/>`;
    }

    // 每品品号（1弦右侧，标在各品间，避免品位跨度大时看不清；预览紧凑模式不显示）
    if (!isPreview) {
      for (let n = 0; n < fretCount; n++) {
        svg += `<text x="${stringX(5) + 13}" y="${fretY(n) + fretGap/2 + 3}" class="cd-fretnum">${startFret + n}</text>`;
      }
    }

    // 顶部 X / O 标记
    for (let i = 0; i < 6; i++) {
      const fret = frets[i];
      const x = stringX(i);
      const y = fretY(0) - 12;
      if (fret === -1) {
        svg += `<text x="${x}" y="${y}" text-anchor="middle" class="cd-xo cd-x">✕</text>`;
      } else if (fret === 0) {
        svg += `<text x="${x}" y="${y}" text-anchor="middle" class="cd-xo cd-o">○</text>`;
      }
    }

    // 按弦圆点 + 手指编号
    for (let i = 0; i < 6; i++) {
      const fret = frets[i];
      if (fret <= 0) continue;
      const x = stringX(i);
      const y = fretY(fret - startFret) + fretGap / 2;
      svg += `<circle cx="${x}" cy="${y}" r="${dotR}" class="cd-dot"/>`;
      // 手指编号（根据品位推断：1品=1食指，2品=2中指，3品=3无名指，4品=4小指）
      const finger = Math.min(fret - startFret + 1, 4);
      svg += `<text x="${x}" y="${y + 3.5}" text-anchor="middle" class="cd-finger">${finger}</text>`;
    }

    // 1弦→6弦 方向箭头 + 弦名 + 和弦名称（仅详情模式；预览用 .p-name 显示名称）
    if (!isPreview) {
      const arrowY = fretY(fretCount) + 18;
      const headSize = 4.5;
      svg += `<line x1="${stringX(5)}" y1="${arrowY}" x2="${stringX(0)}" y2="${arrowY}" class="cd-arrow"/>`;
      svg += `<path d="M ${stringX(0)} ${arrowY} L ${stringX(0) + headSize} ${arrowY - headSize} L ${stringX(0) + headSize} ${arrowY + headSize} Z" class="cd-arrow-head"/>`;
      svg += `<text x="${stringX(5) - 2}" y="${arrowY - 8}" text-anchor="end" class="cd-stringtag">1弦</text>`;
      svg += `<text x="${stringX(0) + 2}" y="${arrowY - 8}" text-anchor="start" class="cd-stringtag">6弦</text>`;

      svg += `<text x="${W/2}" y="${fretY(maxFret) + 14}" text-anchor="middle" class="cd-name">${svgNameTspans(chord.name)}</text>`;
    }

    svg += '</svg>';
    return svg;
  }

  /* ---------- 渲染：和弦详情 ---------- */
  function renderChord(task, chord) {
    const key = KEYS[chord._key] || KEYS[task.key]; // 跟随当前和弦所属调（兼容旧数据回退任务 key）

    // 简化模式：名称、调式、级数、属性、组成音、根音所在弦，居中放大
    if (task.displayMode === 'simple') {
      const toneChips = chord.tones.map(n =>
        `<span class="st-chip">${noteHTML(n)}</span>`).join('');
      els.contentArea.innerHTML = `<div class="simple-card">
        <div class="simple-name">${noteHTML(chord.name)}</div>
        <div class="simple-meta">
          <span class="tag">${esc(key.name)}</span>
          <span class="tag" title="${degreeTitle(chord.degree)}">${esc(chord.degree)}级</span>
          <span class="tag" title="${typeTitle(chord.type)}">${CHORD_TYPES[chord.type].label}</span>
        </div>
        <div class="simple-divider"></div>
        <div class="simple-tones">
          <span class="st-label" title="和弦由哪些音构成（从根音开始排列）">组成音</span>
          <div class="st-chips">${toneChips}</div>
        </div>
        <div class="simple-root" title="根音：和弦中最基础的音，弹奏时先拨这根弦">🎯 根音所在弦：<strong class="sr-str">第 ${chord.root.string} 弦</strong>（<span class="sr-note">${noteHTML(chord.root.note)}</span>）</div>
      </div>`;
      return;
    }

    const display = task.displayContent || ['basic','detail','arpeggio','strum'];
    const has = v => display.includes(v);
    let html = '';


    // 和弦音位指板：固定 0-8 品，弦按粗细，标全部音名，和弦音高亮、根音圆章
    function buildRootFretboardSVG() {
      const rootStr = chord.root.string;
      const rootPC = NOTE_PC[chord.root.note];
      const tonePCs = new Set(chord.tones.map(n => NOTE_PC[n]));
      const rootFret = chord.fingering.find(f => f.string === rootStr).fret;
      const maxFret = 8; // 固定 0-8 品，视觉稳定 + 便于记忆指板
      // 实际按下的位置（品位>0）
      const pressed = new Set();
      chord.fingering.forEach(f => { if (f.fret > 0) pressed.add(f.string + ':' + f.fret); });

      const stringGap = 28;
      const fretGap = 24;
      const marginTop = 30;
      const marginBottom = 16;
      const marginLeft = 20;
      const stripW = 44; // 左侧竖条名牌宽度
      const stringWidth = [6, 5, 4, 3.2, 2.4, 1.8]; // 6弦→1弦 粗细
      const stringX = i => stripW + marginLeft + i * stringGap;
      const fretY = n => marginTop + n * fretGap;
      const fretNumX = stringX(5) + 14;
      const W = fretNumX + 14;
      const H = marginTop + fretGap * (maxFret + 1) + marginBottom;

      let svg = `<svg class="rf-board" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
      // 左侧竖条名牌：和弦名 / 所属调 / 级数（水平居中、自上而下，名无底色，分隔线区分）
      const stripCX = stripW / 2;
      const nameLen = chord.name.length;
      const nameFont = nameLen >= 6 ? 11 : nameLen >= 5 ? 12 : 13.5;
      svg += `<g>
        <rect x="0" y="0" width="${stripW}" height="${H}" class="rf-strip"/>
        <line x1="${stripW}" y1="0" x2="${stripW}" y2="${H}" class="rf-strip-line"/>
        <text x="${stripCX}" y="30" text-anchor="middle" class="rf-strip-name" style="font-size:${nameFont}px">${esc(chord.name)}</text>
        <line x1="${stripCX - 12}" y1="46" x2="${stripCX + 12}" y2="46" class="rf-strip-div"/>
        <text x="${stripCX}" y="66" text-anchor="middle" class="rf-strip-key">${esc(key.name)}</text>
        <text x="${stripCX}" y="96" text-anchor="middle" class="rf-strip-deg">${esc(chord.degree)}级</text>
      </g>`;






      // 按品范围矩形框：圈住和弦弹奏区间
      const fretted = chord.fingering.filter(f => f.fret > 0);
      const minF = fretted.length ? Math.min(...fretted.map(f => f.fret)) : 0;
      const maxF = fretted.length ? Math.max(...fretted.map(f => f.fret)) : 0;
      const hasOpen = chord.fingering.some(f => f.fret === 0);
      const boxMin = hasOpen ? 0 : minF; // 框内品范围（框内和弦音加粗、框外统一显示）
      const boxMax = maxF;
      if (fretted.length) {
        const rx = stringX(0) - 11;            // 左：6弦外留白
        const rw = (W - 2) - rx;               // 右：包到品号列外侧
        const ry = hasOpen ? fretY(0) - 24 : fretY(minF - 1) + 2; // 上：有空弦从空弦行上方起，否则从最上按品的上一品间起
        const rh = fretY(maxF) - 2 - ry;       // 下：最末按品与下一品之间
        svg += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" class="rf-range"/>`;
      }

      // 弦（先画，音名骑在弦上）
      for (let i = 0; i < 6; i++) {
        const str = 6 - i;
        const f = chord.fingering.find(x => x.string === str);
        const muted = !f || f.fret < 0;
        const cls = muted ? 'rf-string muted' : (str === rootStr ? 'rf-string root' : 'rf-string');
        svg += `<line x1="${stringX(i)}" y1="${fretY(0)}" x2="${stringX(i)}" y2="${fretY(maxFret)}" stroke-width="${stringWidth[i]}" class="${cls}"/>`;
      }

      // 弦枕与品线
      svg += `<line x1="${stringX(0)}" y1="${fretY(0)}" x2="${stringX(5)}" y2="${fretY(0)}" class="rf-nut"/>`;
      for (let n = 1; n <= maxFret; n++) {
        svg += `<line x1="${stringX(0)}" y1="${fretY(n)}" x2="${stringX(5)}" y2="${fretY(n)}" class="rf-fret"/>`;
      }

      // 品号（右侧，0-8）
      for (let n = 0; n <= maxFret; n++) {
        const y = n === 0 ? fretY(0) - 4 : fretY(n) - fretGap / 2 + 4;
        svg += `<text x="${fretNumX}" y="${y}" text-anchor="middle" class="rf-fretnum">${n}</text>`;
      }

      // 音名（骑在弦上；闷弦只画 ✕ 不标音）
      for (let i = 0; i < 6; i++) {
        const str = 6 - i;
        const f = chord.fingering.find(x => x.string === str);
        const muted = !f || f.fret < 0;
        const x = stringX(i);
        if (muted) {
          svg += `<text x="${x}" y="${fretY(0) - 10}" text-anchor="middle" class="rf-x">✕</text>`;
          continue;
        }
        for (let n = 0; n <= maxFret; n++) {
          const note = noteAt(key, str, n);
          const isRootPos = str === rootStr && n === rootFret;
          const isTone = tonePCs.has(NOTE_PC[note]);
          const isInside = n >= boxMin && n <= boxMax; // 框外音统一显示，仅框内和弦音加粗
          const isPressed = isTone && pressed.has(str + ':' + n);
          const y = n === 0 ? fretY(0) - 4 : fretY(n) - fretGap / 2 + 4;
          if (isRootPos) {
            const cy = n === 0 ? fretY(0) - 11 : fretY(n) - fretGap / 2;
            svg += `<g><circle cx="${x}" cy="${cy}" r="11" class="rf-rootbadge"/><text x="${x}" y="${y}" text-anchor="middle" class="rf-note root">${svgNoteTspans(note, x)}</text></g>`;
          } else if (isPressed) {
            const cy = fretY(n) - fretGap / 2;
            svg += `<g><circle cx="${x}" cy="${cy}" r="11" class="rf-tonebadge"/><text x="${x}" y="${y}" text-anchor="middle" class="rf-note tone">${svgNoteTspans(note, x)}</text></g>`;
          } else {
            const cls = (isTone && isInside) ? ' tone' : '';
            svg += `<text x="${x}" y="${y}" text-anchor="middle" class="rf-note${cls}">${svgNoteTspans(note, x)}</text>`;
          }
        }
      }

      // 底部弦号
      for (let i = 0; i < 6; i++) {
        const str = 6 - i;
        svg += `<text x="${stringX(i)}" y="${fretY(maxFret) + 20}" text-anchor="middle" class="rf-strlabel${str === rootStr ? ' root' : ''}">${str}弦</text>`;
      }

      svg += '</svg>';
      return svg;
    }

    // ===== ① 基本属性卡片（顶部横向）：调式、级数、属性、调式音阶、构成音 =====
    if (has('basic')) {
      const scaleChips = key.scale.map(n =>
        `<span class="scale-chip${n === chord.root.note ? ' root' : ''}">${noteHTML(n)}</span>`).join('');
      const toneChips = chord.tones.map((n, i) =>
        `<span class="tone-chip" title="构成音级数：${esc(chord.toneNums[i])}"><span class="t-note">${noteHTML(n)}</span><span class="t-num">${esc(chord.toneNums[i])}</span></span>`).join('');
      html += `<div class="basic-card">
        <div class="basic-layout">
          <div class="chord-name">${noteHTML(chord.name)}</div>
          <div class="basic-right">
            <div class="basic-scale">
              <span class="bs-label">${esc(key.name)}调式音阶</span>
              <div class="scale-chips">${scaleChips}</div>
            </div>
            <div class="basic-tones">
              <span class="bs-label">构成音</span>
              ${toneChips}
            </div>
            <div class="chord-meta">
              <span class="tag">${esc(key.name)}</span>
              <span class="tag" title="${degreeTitle(chord.degree)}">${esc(chord.degree)}级</span>
              <span class="tag" title="${typeTitle(chord.type)}">${CHORD_TYPES[chord.type].label}</span>
            </div>
          </div>
        </div>
      </div>`;
    }

    // ===== ② 详细解析卡片：根音、指法 =====
    let detailCard = '';
    if (has('detail')) {
      const diagram = buildChordDiagramSVG(chord);
      detailCard = `<div class="info-card detail-card">
        <div class="detail-body">
          <div class="detail-cols">
            <div class="detail-finger">
              <div class="df-head">
                <div class="df-title">指法</div>
              </div>
              <div class="fingering-wrap">
                ${diagram}
                <div class="fingering-legend">
                  <div class="fl-title">指法说明</div>
                  <div class="fl-row"><span class="fl-sym cd-x">✕</span> 不弹</div>
                  <div class="fl-row"><span class="fl-sym cd-o">○</span> 空弦</div>
                  <div class="fl-row"><span class="fl-sym cd-dot-s">●</span> 按弦（数字=手指）</div>
                  <div class="fl-row"><span class="fl-sym">1</span>食指 <span class="fl-sym">2</span>中指 <span class="fl-sym">3</span>无名指 <span class="fl-sym">4</span>小指</div>
                  <div class="fl-text">${esc(fingerStr(chord))}（6弦→1弦）</div>
                </div>
              </div>
            </div>
            <div class="fingering-root">
              <div class="fr-title"><span class="ic-icon">🎯</span>和弦音位（根音）</div>
              ${buildRootFretboardSVG()}
            </div>
          </div>
        </div>
      </div>`;
    }

    // ===== ③ 分解和弦卡片 =====
    let arpeggioCard = '';
    if (has('arpeggio') && chord.arpeggio.length) {
      const list = chord.arpeggio.map((a, i) =>
        `<div class="arpeggio-item">
          <div class="a-head">
            <div class="a-name">${esc(a.name)}</div>
            <button class="play-btn" data-arp="${i}">▶ 播放</button>
          </div>
          <div class="a-desc">${esc(a.desc)}</div>
        </div>`).join('');
      arpeggioCard = `<div class="info-card arpeggio-card"><div class="ic-title"><span class="ic-icon">🎸</span>分解和弦</div><div class="arpeggio-list">${list}</div></div>`;
    }

    // ===== ④ 扫弦节奏卡片 =====
    let strumCard = '';
    if (has('strum') && typeof STRUM_PATTERNS !== 'undefined' && STRUM_PATTERNS.length) {
      const list = STRUM_PATTERNS.map((p, i) => {
        let grid = '';
        for (let b = 0; b < 4; b++) {
          let beatCells = '';
          for (let s = 0; s < 4; s++) {
            const k = b * 4 + s;
            const d = p.slots[k];
            const cls = d === 'd' ? 'down' : (d === 'u' ? 'up' : 'rest');
            const content = (d === 'd' || d === 'u') ? strumArrowSVG(d) : '<span class="rest-tick"></span>';
            beatCells += `<div class="strum-cell ${cls}${s === 0 ? ' strong' : ''}" data-slot="${k}">${content}</div>`;
          }
          grid += `<div class="strum-beat"><div class="strum-beats">${beatCells}</div><div class="strum-beat-label">${b + 1}</div></div>`;
        }
        return `<div class="strum-pattern" data-strum="${i}">
          <button class="play-btn strum-play" data-strum="${i}" title="播放">▶</button>
          <div class="sp-info">
            <div class="sp-name">${esc(p.name)}</div>
            <div class="sp-desc">${esc(p.desc)}</div>
          </div>
          <div class="strum-grid">${grid}</div>
        </div>`;
      }).join('');
      strumCard = `<div class="info-card strum-card"><div class="ic-title"><span class="ic-icon">🎸</span>扫弦节奏</div>
        <div class="strum-legend">
          <span class="lg-item"><span class="lg-sym">${strumArrowSVG('d')}</span> 下扫（6弦→1弦）</span>
          <span class="lg-item"><span class="lg-sym lg-up">${strumArrowSVG('u')}</span> 上扫（1弦→6弦）</span>
          <span class="lg-item">每大格 = 1 拍（内含 4 小格 = 十六分）</span>
          <span class="lg-item">空格 = 不扫（声音延续）</span>
        </div>
        <div class="strum-list">${list}</div></div>`;
    }

    // ===== 布局：详细解析 + 分解和弦 =====
    const showDetail = !!detailCard;
    const showArp = !!arpeggioCard;
    if (showDetail && showArp) {
      // 两个同时显示：详解居左（较大），分解居右（较小）
      html += `<div class="detail-layout two">
        <div class="dl-left">${detailCard}</div>
        <div class="dl-right">${arpeggioCard}</div>
      </div>`;
    } else if (showDetail) {
      // 只显示详细解析：居中放大
      html += `<div class="detail-layout single"><div class="dl-center">${detailCard}</div></div>`;
    } else if (showArp) {
      // 只显示分解和弦：居中放大
      html += `<div class="detail-layout single"><div class="dl-center">${arpeggioCard}</div></div>`;
    }

    // 扫弦节奏卡片：全宽置于下方
    if (strumCard) html += strumCard;

    els.contentArea.innerHTML = html;

    // 绑定分解和弦播放
    els.contentArea.querySelectorAll('.play-btn[data-arp]').forEach(btn => {
      btn.addEventListener('click', () => {
        // 播放时暂停自动转换，避免"画面切走、声音还在放旧和弦"
        if (trainingState === 'running') pauseTraining();
        const i = parseInt(btn.dataset.arp, 10);

        const a = chord.arpeggio[i];
        GuitarAudio.playArpeggio(chord, a.pattern, 80);
        btn.classList.add('playing');
        setTimeout(() => btn.classList.remove('playing'), 1500);
      });
    });

    // 绑定扫弦节奏播放（含逐格高亮动画，直观展现扫弦过程）
    els.contentArea.querySelectorAll('.strum-play').forEach(btn => {
      btn.addEventListener('click', () => {
        if (trainingState === 'running') pauseTraining();
        const i = parseInt(btn.dataset.strum, 10);
        const p = STRUM_PATTERNS[i];
        if (!p) return;
        GuitarAudio.playStrum(chord, p.slots, 80);
        btn.classList.add('playing');
        // 逐格高亮：与播放节拍同步
        const cells = els.contentArea.querySelectorAll(`.strum-pattern[data-strum="${i}"] .strum-cell`);
        const sixteenthMs = 60000 / 80 / 4;
        [...p.slots].forEach((d, k) => {
          if (d === '-') return;
          setTimeout(() => {
            cells[k].classList.add('active');
            setTimeout(() => cells[k].classList.remove('active'), Math.max(160, sixteenthMs * 0.85));
          }, 60 + k * sixteenthMs);
        });
        setTimeout(() => btn.classList.remove('playing'), p.slots.length * sixteenthMs + 500);
      });
    });
  }


  /* ---------- 渲染：内容区 ---------- */
  function renderContent() {
    const task = tasks.find(t => t.id === currentTaskId);
    if (!task) {
      els.contentArea.innerHTML = '<div class="content-empty"><div class="big-icon">🎸</div><p>请从右侧选择一个训练任务<br>或新建一个任务开始练习</p></div>';
      updateControls();
      els.speedTag.textContent = '--次/分钟';
      els.modeTag.textContent = '';
      return;
    }
    const chords = getTaskChords(task);
    if (!chords.length) {
      els.contentArea.innerHTML = '<div class="content-empty"><div class="big-icon">🎸</div><p>该任务没有可选和弦</p></div>';
      updateControls();
      els.speedTag.textContent = '--次/分钟';
      els.modeTag.textContent = '';
      return;
    }
    updateControls();
    els.speedTag.textContent = task.speed + '次/分钟';
    els.modeTag.textContent = task.mode === 'random' ? '随机' : '顺序';

    const chord = chords[currentChordIdx % chords.length];
    renderChord(task, chord);
  }

  /* 生成乱序集合（Fisher-Yates 洗牌） */
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* 生成本轮随机序列：尽量让首元素不等于上一轮最后一个和弦，避免相邻轮出现相同和弦 */
  function buildRandomOrder(length, prevLastIdx) {
    if (length <= 0) return [];
    if (length === 1) return [0];
    let order = shuffle(Array.from({ length }, (_, i) => i));
    // 重试若干次，避免首元素与上一轮末尾相同
    for (let guard = 0; order[0] === prevLastIdx && guard < 20; guard++) {
      order = shuffle(Array.from({ length }, (_, i) => i));
    }
    // 兜底：仍相同则强制把首元素与任一不同元素交换
    if (order[0] === prevLastIdx) {
      const p = order.findIndex(v => v !== prevLastIdx);
      if (p > 0) [order[0], order[p]] = [order[p], order[0]];
    }
    return order;
  }

  /* ---------- 训练控制 ---------- */
  /* 是否存在可选任务 */
  function hasValidTask() {
    const task = tasks.find(t => t.id === currentTaskId);
    return !!task && getTaskChords(task).length > 0;
  }

  /* 更新控制按钮状态（开始 / 暂停 / 继续 / 重新开始） */
  function updateControls() {
    const enabled = hasValidTask();
    const txt = els.startBtn.querySelector('.btn-text');
    els.startBtn.disabled = !enabled;
    els.startBtn.classList.toggle('paused', trainingState === 'running');
    els.startBtn.classList.toggle('resuming', trainingState === 'paused');
    if (trainingState === 'running') txt.textContent = '⏸ 暂停';
    else if (trainingState === 'paused') txt.textContent = '▶ 继续';
    else txt.textContent = '▶ 开始';
    els.restartBtn.disabled = !enabled || trainingState === 'idle';
  }

  /* 启动自动转换定时器 */
  function startTimer() {
    const task = tasks.find(t => t.id === currentTaskId);
    if (!task) return;
    const chords = getTaskChords(task);
    const interval = 60000 / task.speed;
    timer = setInterval(() => {
      if (task.mode === 'random') {
        // 随机模式：按乱序集合顺序转换；本轮完成后重新洗牌（避开上一轮末尾和弦）
        shuffledIdx++;
        if (!shuffledOrder.length || shuffledOrder.length !== chords.length || shuffledIdx >= shuffledOrder.length) {
          shuffledOrder = buildRandomOrder(chords.length, currentChordIdx);
          shuffledIdx = 0;
        }
        currentChordIdx = shuffledOrder[shuffledIdx];
      } else {
        // 顺序模式：按编排顺序循环
        currentChordIdx = (currentChordIdx + 1) % chords.length;
      }
      renderNavbar();
      renderContent();
      // 转换后按任务开关播响所有弦（真实采样）
      if (task.playChord !== false) {
        GuitarAudio.playChord(chords[currentChordIdx % chords.length]);
      }
    }, interval);
  }

  /* 开始练习（idle → running，从头开始） */
  function startTraining() {
    const task = tasks.find(t => t.id === currentTaskId);
    if (!task) return;
    const chords = getTaskChords(task);
    if (!chords.length) return;

    clearInterval(timer);
    timer = null;
    // 随机模式：每轮开始都生成全新乱序集合，并从洗牌后的第一个和弦开始
    if (task.mode === 'random') {
      shuffledOrder = buildRandomOrder(chords.length, -1);
      shuffledIdx = 0;
      currentChordIdx = shuffledOrder[0];
    } else {
      currentChordIdx = 0;
    }
    trainingState = 'running';
    updateControls();
    renderNavbar();
    renderContent();
    startTimer();
  }

  /* 暂停（running → paused，保持当前位置） */
  function pauseTraining() {
    trainingState = 'paused';
    clearInterval(timer);
    timer = null;
    updateControls();
    renderNavbar();
  }

  /* 继续（paused → running，从当前和弦继续转换） */
  function resumeTraining() {
    trainingState = 'running';
    updateControls();
    startTimer();
  }

  /* 重新开始（任意状态 → running，从头开始） */
  function restartTraining() {
    startTraining();
    toast('已重新开始');
  }

  /* 重置（清空计时器回到初始状态，并清空随机状态） */
  function resetTraining() {
    trainingState = 'idle';
    clearInterval(timer);
    timer = null;
    shuffledOrder = [];
    shuffledIdx = 0;
    updateControls();
  }

  /* ---------- 音频：加载真实采样 ---------- */
  function applyAudioMode(task) {
    const tone = (task && task.playTone) || 'nylon';
    if (GuitarAudio.currentTone() !== tone || !GuitarAudio.isSamplerReady()) {
      GuitarAudio.loadSampler(tone,
        () => {},
        () => { toast('采样已就绪'); },
        () => { toast('真实采样加载失败：请用本地服务器打开（Live Server 或 python -m http.server）', true); }
      );
    }
  }


  /* ---------- 任务编辑弹窗 ---------- */
  function openModal(task) {
    editingId = task ? task.id : null;
    els.modalTitle.textContent = task ? '编辑任务' : '新建任务';
    els.fName.value = task ? task.name : '';
    els.fSpeed.value = task ? task.speed : 60;
    // 转换模式
    const modeVal = task ? (task.mode || 'sequential') : 'sequential';
    document.querySelectorAll('input[name="f-mode"]').forEach(r => {
      r.checked = r.value === modeVal;
    });
    // 预览
    const previewVal = task ? String(task.preview) : 'true';
    document.querySelectorAll('input[name="f-preview"]').forEach(r => {
      r.checked = r.value === previewVal;
    });
    // 预览内容：新建默认全选，编辑回显
    const pc = task ? (task.previewContent || ['name','fingering']) : ['name','fingering'];
    els.previewContentGroup.querySelectorAll('input').forEach(cb => {
      cb.checked = pc.includes(cb.value);
    });
    // 显示模式（简化/详细）
    const dmVal = task ? (task.displayMode || 'detail') : 'detail';
    document.querySelectorAll('input[name="f-displayMode"]').forEach(r => {
      r.checked = r.value === dmVal;
    });
    // 显示内容（详细模式 checkbox）
    const dc = task ? (task.displayContent || ['basic','detail','arpeggio','strum']) : ['basic','detail','arpeggio','strum'];
    els.displayContentField.querySelectorAll('input').forEach(cb => {
      cb.checked = dc.includes(cb.value);
    });
    // 吉他音色
    const ptVal = task ? (task.playTone || 'nylon') : 'nylon';
    document.querySelectorAll('input[name="f-playTone"]').forEach(r => { r.checked = r.value === ptVal; });
    // 和弦播放（转换后播响所有弦，默认开）
    const pcVal = task ? task.playChord !== false : true;
    document.querySelectorAll('input[name="f-playChord"]').forEach(r => { r.checked = (r.value === 'true') === pcVal; });





    // 选择和弦集合
    renderChordSelector(task);
    // 编排顺序
    renderOrderList(task);

    updateModalVisibility();
    els.taskModal.classList.add('open');
  }

  function closeModal() {
    els.taskModal.classList.remove('open');
    editingId = null;
  }

  /* 渲染和弦选择器（按调分组，三和弦/七和弦子组） */
  function renderChordSelector(task) {
    const selected = task ? task.chords.map(c => c.key + ':' + c.name) : [];
    let html = '';
    for (const key in KEYS) {
      const k = KEYS[key];
      const triads = k.chords.filter(c => CHORD_TYPES[c.type].short === '三和弦');
      const sevenths = k.chords.filter(c => CHORD_TYPES[c.type].short === '七和弦');
      html += `<div class="cs-group" data-key="${key}">
        <div class="cs-group-head">
          <span class="g-label">${esc(k.name)}<span class="g-sub">${k.scale.join(' ')}</span></span>
          <span class="g-select-all" data-key="${key}" data-type="all">全选</span>
        </div>
        ${subgroupHTML(key, '三和弦', triads, selected)}
        ${subgroupHTML(key, '七和弦', sevenths, selected)}
      </div>`;
    }
    els.chordSelector.innerHTML = html;

    // 绑定点击
    els.chordSelector.querySelectorAll('.cs-chord').forEach(chip => {
      chip.addEventListener('click', () => {
        chip.classList.toggle('selected');
        updateOrderListFromSelection();
        updateSubgroupSelectAll();
      });
    });
    // 全选（调级 + 子组级）
    els.chordSelector.querySelectorAll('.g-select-all').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        const scope = type === 'all'
          ? btn.closest('.cs-group')
          : btn.closest('.cs-subgroup');
        const allSelected = scope.querySelectorAll('.cs-chord:not(.selected)').length === 0;
        scope.querySelectorAll('.cs-chord').forEach(chip => {
          chip.classList.toggle('selected', !allSelected);
        });
        updateOrderListFromSelection();
        updateSubgroupSelectAll();
      });
    });
    updateSubgroupSelectAll();
  }

  /* 渲染一个子组（三和弦 / 七和弦） */
  function subgroupHTML(key, label, chords, selected) {
    return `<div class="cs-subgroup" data-key="${key}" data-type="${label}">
      <div class="cs-subgroup-head">
        <span class="sg-label">${label}</span>
        <span class="g-select-all" data-key="${key}" data-type="${label}">全选</span>
      </div>
      <div class="cs-chords">
        ${chords.map(c => chordChip(key, c, selected)).join('')}
      </div>
    </div>`;
  }

  /* 更新子组全选按钮状态（全选/部分/全不选） */
  function updateSubgroupSelectAll() {
    els.chordSelector.querySelectorAll('.cs-subgroup').forEach(sg => {
      const chips = sg.querySelectorAll('.cs-chord');
      const sel = sg.querySelectorAll('.cs-chord.selected').length;
      const btn = sg.querySelector('.g-select-all');
      btn.classList.remove('sg-all', 'sg-part', 'sg-none');
      if (sel === 0) btn.classList.add('sg-none');
      else if (sel === chips.length) btn.classList.add('sg-all');
      else btn.classList.add('sg-part');
    });
    // 调级全选按钮状态
    els.chordSelector.querySelectorAll('.cs-group').forEach(g => {
      const chips = g.querySelectorAll('.cs-chord');
      const sel = g.querySelectorAll('.cs-chord.selected').length;
      const btn = g.querySelector('.cs-group-head .g-select-all');
      btn.classList.remove('sg-all', 'sg-part', 'sg-none');
      if (sel === 0) btn.classList.add('sg-none');
      else if (sel === chips.length) btn.classList.add('sg-all');
      else btn.classList.add('sg-part');
    });
  }

  function chordChip(key, c, selected) {
    const sel = selected.includes(key + ':' + c.name) ? ' selected' : '';
    return `<span class="cs-chord${sel}" data-key="${key}" data-name="${c.name}">${noteHTML(c.name)}</span>`;
  }

  /* 从选择器获取选中的和弦 */
  function getSelectedChords() {
    const result = [];
    els.chordSelector.querySelectorAll('.cs-chord.selected').forEach(chip => {
      result.push({ key: chip.dataset.key, name: chip.dataset.name });
    });
    return result;
  }

  /* 更新编排顺序列表 */
  function updateOrderListFromSelection() {
    const selected = getSelectedChords();
    renderOrderListFromArray(selected);
  }

  function renderOrderList(task) {
    const selected = task ? task.chords : getSelectedChords();
    renderOrderListFromArray(selected);
  }

  function renderOrderListFromArray(arr) {
    if (!arr.length) {
      els.orderList.innerHTML = '<div class="order-empty">请先选择和弦</div>';
      return;
    }
    els.orderList.innerHTML = arr.map((c, i) => `
      <div class="order-item" data-idx="${i}">
        <div class="o-index">${i + 1}</div>
        <div class="o-name">${noteHTML(c.name)}</div>
        <div class="o-arrows">
          <button data-move="up" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button data-move="down" ${i === arr.length - 1 ? 'disabled' : ''}>↓</button>
        </div>
      </div>`).join('');

    els.orderList.querySelectorAll('.o-arrows button').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.order-item');
        const idx = parseInt(item.dataset.idx, 10);
        const move = btn.dataset.move;
        const selected = getSelectedChords();
        const target = move === 'up' ? idx - 1 : idx + 1;
        if (target < 0 || target >= selected.length) return;
        [selected[idx], selected[target]] = [selected[target], selected[idx]];
        // 同步选择器选中状态
        syncSelectorFromArray(selected);
        renderOrderListFromArray(selected);
      });
    });
  }

  /* 根据数组同步选择器选中状态 */
  function syncSelectorFromArray(arr) {
    const keys = arr.map(c => c.key + ':' + c.name);
    els.chordSelector.querySelectorAll('.cs-chord').forEach(chip => {
      chip.classList.toggle('selected', keys.includes(chip.dataset.key + ':' + chip.dataset.name));
    });
    updateSubgroupSelectAll();
  }

  /* 更新弹窗中条件显示字段 */
  function updateModalVisibility() {
    const mode = document.querySelector('input[name="f-mode"]:checked').value;
    els.orderField.classList.toggle('hidden-field', mode !== 'sequential');
    const preview = document.querySelector('input[name="f-preview"]:checked').value === 'true';
    els.previewContentField.classList.toggle('hidden-field', !preview);
    // 显示模式：简化隐藏"选择具体内容"字段，详细显示
    const dm = document.querySelector('input[name="f-displayMode"]:checked').value;
    els.displayContentFieldGroup.classList.toggle('hidden-field', dm !== 'detail');
    // 吉他音色始终显示（真实采样方案）
    els.playToneField.classList.remove('hidden-field');
  }



  /* 保存任务 */
  function saveTask() {
    const name = els.fName.value.trim();
    if (!name) { toast('请输入任务名称', true); return; }
    const selected = getSelectedChords();
    if (!selected.length) { toast('请至少选择一个和弦', true); return; }

    const mode = document.querySelector('input[name="f-mode"]:checked').value;
    const preview = document.querySelector('input[name="f-preview"]:checked').value === 'true';
    const speed = parseInt(els.fSpeed.value, 10) || 60;

    const previewContent = [...els.previewContentGroup.querySelectorAll('input:checked')].map(cb => cb.value);
    const displayMode = document.querySelector('input[name="f-displayMode"]:checked').value;
    const displayContent = [...els.displayContentField.querySelectorAll('input:checked')].map(cb => cb.value);
    const playTone = document.querySelector('input[name="f-playTone"]:checked').value;
    const playChord = document.querySelector('input[name="f-playChord"]:checked').value === 'true';



    const task = {
      id: editingId || uid(),
      name,
      key: selected[0].key,
      chords: selected,
      mode,
      speed,
      preview,
      previewContent,
      displayMode,
      displayContent,
      playTone,
      playChord
    };




    if (editingId) {
      const idx = tasks.findIndex(t => t.id === editingId);
      tasks[idx] = task;
    } else {
      tasks.push(task);
    }
    saveTasks();
    renderTaskList();
    if (!currentTaskId) {
      currentTaskId = task.id;
    }
    renderNavbar();
    renderContent();
    if (currentTaskId === task.id) applyAudioMode(task);
    closeModal();
    toast('任务已保存');
  }

  /* ---------- 导入导出 ---------- */
  function exportTasks() {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'guitar_practice_tasks.json';
    a.click();
    URL.revokeObjectURL(url);
    toast('已导出');
  }

  function importTasks(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data)) throw new Error('格式错误');
        tasks = data;
        saveTasks();
        renderTaskList();
        renderNavbar();
        renderContent();
        toast('导入成功');
      } catch (err) {
        toast('导入失败：' + err.message, true);
      }
    };
    reader.readAsText(file);
  }

  /* ---------- 事件绑定 ---------- */
  function bindEvents() {
    // 新建任务
    els.newTaskBtn.addEventListener('click', () => openModal(null));
    // 关闭弹窗
    els.modalClose.addEventListener('click', closeModal);
    els.modalCancel.addEventListener('click', closeModal);
    els.taskModal.addEventListener('click', e => {
      if (e.target === els.taskModal) closeModal();
    });
    // 保存
    els.modalSave.addEventListener('click', saveTask);
    // 模式/显示模式切换
    document.querySelectorAll('input[name="f-mode"]').forEach(r => r.addEventListener('change', updateModalVisibility));
    document.querySelectorAll('input[name="f-displayMode"]').forEach(r => {

      r.addEventListener('change', () => {
        // 从简化切换到详细：默认全选"选择具体内容"下的所有选项
        if (r.checked && r.value === 'detail') {
          els.displayContentField.querySelectorAll('input').forEach(cb => { cb.checked = true; });
        }
        updateModalVisibility();
      });
    });
    // 详细内容：全部取消勾选时自动切换为"简化"
    els.displayContentField.querySelectorAll('input').forEach(cb => {
      cb.addEventListener('change', () => {
        const checked = els.displayContentField.querySelectorAll('input:checked').length;
        if (checked === 0) {
          document.querySelectorAll('input[name="f-displayMode"]').forEach(r => {
            r.checked = r.value === 'simple';
          });
          updateModalVisibility();
        }
      });
    });
    // 预览切换：切"是"时预览内容默认全选
    document.querySelectorAll('input[name="f-preview"]').forEach(r => {
      r.addEventListener('change', () => {
        if (r.value === 'true' && r.checked) {
          els.previewContentGroup.querySelectorAll('input').forEach(cb => { cb.checked = true; });
        }
        updateModalVisibility();
      });
    });
    // 预览内容：全部取消勾选时自动将预览设为"否"
    els.previewContentGroup.querySelectorAll('input').forEach(cb => {
      cb.addEventListener('change', () => {
        const checked = els.previewContentGroup.querySelectorAll('input:checked').length;
        if (checked === 0) {
          document.querySelectorAll('input[name="f-preview"]').forEach(r => {
            r.checked = r.value === 'false';
          });
          updateModalVisibility();
        }
      });
    });



    // 任务列表点击
    els.taskList.addEventListener('click', e => {
      const item = e.target.closest('.task-item');
      if (!item) return;
      const id = item.dataset.id;
      const actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        const action = actionBtn.dataset.action;
        if (action === 'edit') {
          const task = tasks.find(t => t.id === id);
          if (task) openModal(task);
        } else if (action === 'del') {
          if (confirm('确定删除该任务？')) {
            tasks = tasks.filter(t => t.id !== id);
            if (currentTaskId === id) {
              currentTaskId = null;
              resetTraining();
            }
            saveTasks();
            renderTaskList();
            renderNavbar();
            renderContent();
          }
        }
        return;
      }
      // 选中任务
      currentTaskId = id;
      currentChordIdx = 0;
      resetTraining();
      applyAudioMode(tasks.find(t => t.id === id));
      renderTaskList();
      renderNavbar();
      renderContent();
    });

    // 开始 / 暂停 / 继续
    els.startBtn.addEventListener('click', () => {
      if (trainingState === 'running') pauseTraining();
      else if (trainingState === 'paused') resumeTraining();
      else startTraining();
    });

    // 重新开始
    els.restartBtn.addEventListener('click', restartTraining);

    // 预览区拖拽滚动（鼠标/触摸统一用 Pointer Events）
    const previewDrag = { active: false, startX: 0, startScroll: 0, moved: false };
    els.previewList.addEventListener('pointerdown', e => {
      previewDrag.active = true;
      previewDrag.startX = e.clientX;
      previewDrag.startScroll = els.previewList.scrollLeft;
      previewDrag.moved = false;
      els.previewList.classList.add('dragging');
      e.preventDefault();
    });
    window.addEventListener('pointermove', e => {
      if (!previewDrag.active) return;
      const dx = e.clientX - previewDrag.startX;
      if (Math.abs(dx) > 5) previewDrag.moved = true;
      els.previewList.scrollLeft = previewDrag.startScroll - dx;
    });
    window.addEventListener('pointerup', () => {
      previewDrag.active = false;
      els.previewList.classList.remove('dragging');
    });
    window.addEventListener('pointercancel', () => {
      previewDrag.active = false;
      els.previewList.classList.remove('dragging');
    });

    // 预览和弦点击：暂停自动转换并立即切换到该和弦（拖拽滑动后忽略本次点击）
    els.previewList.addEventListener('click', e => {
      if (previewDrag.moved) { previewDrag.moved = false; return; }
      const item = e.target.closest('.preview-item');
      if (!item) return;
      const idx = parseInt(item.dataset.idx, 10);
      if (isNaN(idx)) return;
      const task = tasks.find(t => t.id === currentTaskId);
      if (!task) return;
      const chords = getTaskChords(task);
      if (!chords.length) return;
      // 随机模式按乱序集合、顺序模式按编排顺序换算实际索引
      if (task.mode === 'random' && shuffledOrder.length === chords.length) {
        shuffledIdx = ((idx % shuffledOrder.length) + shuffledOrder.length) % shuffledOrder.length;
        currentChordIdx = shuffledOrder[shuffledIdx];
      } else {
        currentChordIdx = idx % chords.length;
      }
      // 若正在自动转换则先暂停，停在当前选中的和弦
      if (trainingState === 'running') pauseTraining();
      renderNavbar();
      renderContent();
    });

    // 汉堡菜单：打开抽屉并显示遮罩
    const openDrawer = () => {
      els.sidePanel.classList.add('open');
      els.drawerBackdrop.classList.add('show');
    };
    const closeDrawer = () => {
      els.sidePanel.classList.remove('open');
      els.drawerBackdrop.classList.remove('show');
    };
    els.hamburgerBtn.addEventListener('click', openDrawer);
    els.closeDrawerBtn.addEventListener('click', closeDrawer);
    // 点击任务栏以外的区域关闭
    els.drawerBackdrop.addEventListener('click', closeDrawer);

    // 导入导出 + 恢复预制任务
    if (els.restorePresetsBtn) els.restorePresetsBtn.addEventListener('click', restorePresets);
    els.exportBtn.addEventListener('click', exportTasks);
    els.importBtn.addEventListener('click', () => els.importFile.click());
    els.importFile.addEventListener('change', e => {
      if (e.target.files[0]) importTasks(e.target.files[0]);
      e.target.value = '';
    });
  }

  /* ---------- 初始化 ---------- */
  function init() {
    loadTasks();
    ensurePresets();
    bindEvents();
    renderTaskList();
    renderNavbar();
    renderContent();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
