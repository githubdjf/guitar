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
  let isRunning = false;    // 是否正在训练
  let editingId = null;     // 正在编辑的任务 id
  let shuffledOrder = [];   // 随机模式的乱序集合（和弦索引数组）
  let shuffledIdx = 0;      // 当前在乱序集合中的位置


  const STORAGE_KEY = 'guitar_practice_tasks';

  /* ---------- DOM 引用 ---------- */
  const $ = id => document.getElementById(id);
  const els = {
    navbarTaskName: $('navbarTaskName'),
    previewSection: $('previewSection'),
    previewList: $('previewList'),
    contentArea: $('contentArea'),
    startBtn: $('startBtn'),
    speedTag: $('speedTag'),
    modeTag: $('modeTag'),



    taskList: $('taskList'),
    sidePanel: $('sidePanel'),
    hamburgerBtn: $('hamburgerBtn'),
    closeDrawerBtn: $('closeDrawerBtn'),
    newTaskBtn: $('newTaskBtn'),
    exportBtn: $('exportBtn'),
    importBtn: $('importBtn'),
    importFile: $('importFile'),
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

  /* 根据和弦名查找和弦对象 */
  function findChord(key, name) {
    const k = KEYS[key];
    if (!k) return null;
    return k.chords.find(c => c.name === name) || null;
  }

  /* 获取任务的和弦完整对象列表 */
  function getTaskChords(task) {
    return task.chords.map(c => findChord(c.key, c.name)).filter(Boolean);
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

  /* ---------- 渲染：任务列表 ---------- */
  function renderTaskList() {
    if (!tasks.length) {
      els.taskList.innerHTML = '<div class="task-empty"><div class="icon">🎸</div>暂无任务<br>点击「新建任务」开始</div>';
      return;
    }
    els.taskList.innerHTML = tasks.map(t => {
      const active = t.id === currentTaskId ? ' active' : '';
      const chips = t.chords.slice(0, 6).map(c => `<span class="chip">${esc(c.name)}</span>`).join('');
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
    }).join('');
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

    // 预览顺序：顺序模式按编排顺序，随机模式按乱序集合
    const order = task.mode === 'random' ? shuffledOrder.map(idx => chords[idx]) : chords;
    const activeIdx = task.mode === 'random' ? shuffledIdx : currentChordIdx;
    const items = order.map((c, i) => {
      const active = isRunning && i === activeIdx ? ' active' : '';
      const name = showName ? `<div class="p-name">${esc(c.name)}</div>` : '';
      const finger = showFinger ? `<div class="p-finger">${buildChordDiagramSVG(c)}</div>` : '';
      return `<div class="preview-item${active}">${name}${finger}</div>`;
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
  function buildChordDiagramSVG(chord) {
    const f = chord.fingering; // 6个对象，string 6..1
    const frets = f.map(x => x.fret);
    const maxFret = Math.max(...frets.filter(x => x > 0), 0);
    const minFret = Math.min(...frets.filter(x => x > 0), 0);

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
    const marginLeft = 22;     // 左侧留白（放品位数字）
    const nameSpace = 26;      // 底部留白（放和弦名称）
    const dotR = 8.5;          // 按弦圆点半径
    const W = marginLeft + stringGap * 5 + 20;
    const H = marginTop + fretGap * fretCount + nameSpace;

    // 弦的 x 坐标（6弦在左）
    const stringX = i => marginLeft + i * stringGap; // i=0..5 对应 6..1 弦
    // 品线 y 坐标（第 n 品线，n=0 为上弦枕）
    const fretY = n => marginTop + n * fretGap;

    let svg = '';
    svg += `<svg class="chord-diagram" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;

    // 品位数字（左侧）
    if (startFret > 1) {
      svg += `<text x="${marginLeft - 8}" y="${fretY(1) + fretGap/2 + 4}" text-anchor="end" class="cd-fretnum">${startFret}fr</text>`;
    }

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

    // 和弦名称（下方居中）
    svg += `<text x="${W/2}" y="${H - 8}" text-anchor="middle" class="cd-name">${esc(chord.name)}</text>`;

    svg += '</svg>';
    return svg;
  }

  /* ---------- 渲染：和弦详情 ---------- */
  function renderChord(task, chord) {
    const key = KEYS[task.key];

    // 简化模式：仅显示名称、调式、级数、属性，居中放大
    if (task.displayMode === 'simple') {
      els.contentArea.innerHTML = `<div class="simple-card">
        <div class="simple-name">${esc(chord.name)}</div>
        <div class="simple-meta">
          <span class="tag">${esc(key.name)}</span>
          <span class="tag">${esc(chord.degree)}级</span>
          <span class="tag">${CHORD_TYPES[chord.type].label}</span>
        </div>
      </div>`;
      return;
    }

    const display = task.displayContent || ['basic','detail','arpeggio'];
    const has = v => display.includes(v);
    let html = '';


    // 竖向根音弦位指示器：6根竖线，从左到右 6弦→1弦，从粗到细，根音弦高亮
    function buildRootStringsHTML() {
      const rootStr = chord.root.string; // 根音所在弦（1-6）
      const strings = [6,5,4,3,2,1].map(n => {
        const isRoot = n === rootStr;
        return `<div class="rsv-string${isRoot ? ' active' : ''}">
          <div class="rsv-line"></div>
          <div class="rsv-label">${n}弦</div>
          ${isRoot ? `<div class="rsv-mark">🎯</div>` : ''}
        </div>`;
      }).join('');
      return `<div class="root-strings-v">${strings}</div>
        <div class="root-tip">🎯 先拨 <span class="strong">第 ${rootStr} 弦</span>（根音 ${esc(chord.root.note)}）</div>`;
    }

    // ===== ① 基本属性卡片（顶部横向）：调式、级数、属性、调式音阶 =====
    if (has('basic')) {
      const scaleChips = key.scale.map(n =>
        `<span class="scale-chip${n === chord.root.note ? ' root' : ''}">${esc(n)}</span>`).join('');
      html += `<div class="basic-card">
        <div class="basic-head">
          <div class="chord-name">${esc(chord.name)}</div>
          <div class="chord-meta">
            <span class="tag">${esc(key.name)}</span>
            <span class="tag">${esc(chord.degree)}级</span>
            <span class="tag">${CHORD_TYPES[chord.type].label}</span>
          </div>
        </div>
        <div class="basic-scale">
          <span class="bs-label">${esc(key.name)}调式音阶</span>
          <div class="scale-chips">${scaleChips}</div>
        </div>
      </div>`;
    }

    // ===== ② 详细解析卡片：构成音、根音、指法 =====
    let detailCard = '';
    if (has('detail')) {
      const diagram = buildChordDiagramSVG(chord);
      const toneChips = chord.tones.map((n, i) =>
        `<span class="tone-chip"><span class="t-note">${esc(n)}</span><span class="t-num">${esc(chord.toneNums[i])}</span></span>`).join('');
      detailCard = `<div class="info-card detail-card"><div class="ic-title"><span class="ic-icon">🔍</span>详细解析</div>
        <div class="detail-body">
          <div class="detail-finger">
            <div class="df-title">指法</div>
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
          <div class="detail-tones">
            <div class="dt-title">构成音</div>
            <div class="tone-chips">${toneChips}</div>
          </div>
          <div class="fingering-root">
            <div class="fr-title"><span class="ic-icon">🎯</span>先拨哪根弦</div>
            ${buildRootStringsHTML()}
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

    els.contentArea.innerHTML = html;

    // 绑定分解和弦播放
    els.contentArea.querySelectorAll('.play-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.arp, 10);
        const a = chord.arpeggio[i];
        GuitarAudio.playArpeggio(chord, a.pattern, 80);
        btn.classList.add('playing');
        setTimeout(() => btn.classList.remove('playing'), 1500);
      });
    });
  }


  /* ---------- 渲染：内容区 ---------- */
  function renderContent() {
    const task = tasks.find(t => t.id === currentTaskId);
    if (!task) {
      els.contentArea.innerHTML = '<div class="content-empty"><div class="big-icon">🎸</div><p>请从右侧选择一个训练任务<br>或新建一个任务开始练习</p></div>';
      els.startBtn.disabled = true;
      els.speedTag.textContent = '--次/分钟';
      els.modeTag.textContent = '';
      return;
    }
    const chords = getTaskChords(task);
    if (!chords.length) {
      els.contentArea.innerHTML = '<div class="content-empty"><div class="big-icon">🎸</div><p>该任务没有可选和弦</p></div>';
      els.startBtn.disabled = true;
      els.speedTag.textContent = '--次/分钟';
      els.modeTag.textContent = '';
      return;
    }
    els.startBtn.disabled = false;
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

  /* ---------- 训练控制 ---------- */
  function startTraining() {
    const task = tasks.find(t => t.id === currentTaskId);
    if (!task) return;
    const chords = getTaskChords(task);
    if (!chords.length) return;

    isRunning = true;
    currentChordIdx = 0;
    // 随机模式：生成乱序集合
    if (task.mode === 'random') {
      shuffledOrder = shuffle(chords.map((_, i) => i));
      shuffledIdx = 0;
    }
    els.startBtn.classList.add('paused');
    els.startBtn.querySelector('.btn-text').textContent = '⏸ 暂停练习';
    renderNavbar();
    renderContent();

    const interval = 60000 / task.speed;
    timer = setInterval(() => {
      if (task.mode === 'random') {
        // 随机模式：按乱序集合顺序转换；本轮完成后重新生成
        shuffledIdx++;
        if (shuffledIdx >= shuffledOrder.length) {
          shuffledOrder = shuffle(chords.map((_, i) => i));
          shuffledIdx = 0;
        }
        currentChordIdx = shuffledOrder[shuffledIdx];
      } else {
        // 顺序模式：按编排顺序循环
        currentChordIdx = (currentChordIdx + 1) % chords.length;
      }
      renderNavbar();
      renderContent();
    }, interval);
  }


  function pauseTraining() {
    isRunning = false;
    clearInterval(timer);
    timer = null;
    els.startBtn.classList.remove('paused');
    els.startBtn.querySelector('.btn-text').textContent = '▶ 开始练习';
    renderNavbar();
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
    const dc = task ? (task.displayContent || ['basic','detail','arpeggio']) : ['basic','detail','arpeggio'];
    els.displayContentField.querySelectorAll('input').forEach(cb => {
      cb.checked = dc.includes(cb.value);
    });




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
    return `<span class="cs-chord${sel}" data-key="${key}" data-name="${c.name}">${esc(c.name)}</span>`;
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
        <div class="o-name">${esc(c.name)}</div>
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
      displayContent
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
              pauseTraining();
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
      pauseTraining();
      renderTaskList();
      renderNavbar();
      renderContent();
    });

    // 开始/暂停
    els.startBtn.addEventListener('click', () => {
      if (isRunning) pauseTraining();
      else startTraining();
    });

    // 汉堡菜单（窄屏）
    els.hamburgerBtn.addEventListener('click', () => els.sidePanel.classList.add('open'));
    els.closeDrawerBtn.addEventListener('click', () => els.sidePanel.classList.remove('open'));

    // 导入导出
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
    bindEvents();
    renderTaskList();
    renderNavbar();
    renderContent();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
