/* ============================================================
 * 预制任务 - 单一数据源
 * 浏览器环境挂到 window，Node 环境挂到 globalThis，
 * 便于用 `buildPresetTasks()` 生成初始配置文件 / 一键重置预制。
 * ============================================================ */
(function(global) {
  'use strict';

  function ch(key, name) { return { key, name }; }

  function presetTask(id, name, key, chords, opts) {
    return Object.assign({
      id,
      name,
      key,
      chords,
      mode: 'sequential',
      speed: 60,
      preview: true,
      previewContent: ['name'],
      displayMode: 'detail',
      displayContent: ['basic', 'detail', 'arpeggio', 'strum'],
      playTone: 'nylon',
      playChord: true,
      desc: '',   // 和弦走向介绍（风格/场景/情感），为空则不显示
      common: true // 是否出现在「常用练习任务」列表
    }, opts || {});
  }

  /* 调内级数 → 和弦名（三和弦） */
  const DEGREE_MAP = {
    C: { '1':'C', '2':'Dm', '3':'Em', '4':'F', '5':'G', '6':'Am' },
    G: { '1':'G', '2':'Am', '3':'Bm', '4':'C', '5':'D', '6':'Em' }
  };

  /* 和弦走向定义：
   * [级数串, 名称后缀, 介绍, 速度, 是否默认进入常用]
   * 介绍描述该走向的特色、使用场合、场景、风格与感情色彩。 */
  const C_PROGRESSIONS = [
    ['1345',      'I-iii-IV-V',  '主→中音→下属→属，和声由安静逐渐开阔，情绪明朗坚定；适合陈述性主歌与情绪层层推进的段落。', 60, false],
    ['1436',      'I-IV-iii-vi', '主→下属→中音→下中音，和声温柔下行，带淡淡忧郁与叙事感；民谣主歌、抒情段落的常用走向。', 62, false],
    ['1451',      'I-IV-V-I',    '最经典的完全终止进行，主→下属→属→主形成稳定闭环，明亮且有结束感；常用于乐句收束、副歌结尾。', 60, false],
    ['1564',      'I-V-vi-IV',   '流行音乐黄金四和弦，先强烈后柔软回甘，朗朗上口；几乎能适配一切流行/民谣歌曲，万能走向。', 60, true],
    ['15634145',  '卡农进行',    '经典卡农和声（I-V-vi-iii-IV-I-IV-V），和声层层递进而绵延不绝，优雅且富有歌唱性；最万能的流行循环。', 50, true],
    ['15634125',  '卡农变体',    '卡农进行的变体，末段改为 ii-V 收束，多一分爵士韵味与起伏感；适合需要转折的段落。', 50, false],
    ['1625',      'I-vi-ii-V',   '经典回转进行，小调色彩一闪后回归主功能，复古圆润；老歌、爵士与流行抒情常用。', 60, true],
    ['1645',      'I-vi-IV-V',   '万能四和弦，忧伤中带希望，情感层次丰富；民谣、流行通吃的高频走向。', 60, true],
    ['4536251',   'IV-V-iii-vi-ii-V-I', '流行情歌经典长走向，从下属逐级下行再 ii-V-I 收束，层次丰富、煽情动人；副歌神器。', 50, true],
    ['5634125',   'V-vi-iii-IV-I-ii-V', '以属和弦起句，张力十足，中间起伏后 ii-V 收束，色彩多变；适合情绪铺垫与高潮前段。', 52, false],
    ['6251',      'vi-ii-V-I',   '小调色彩浓厚，忧郁开场逐步转向明亮收束，情感层次分明；适合抒情与民谣段落。', 60, false],
    ['6415',      'vi-IV-I-V',   '下中音起句的流行四和弦，温柔开场、明亮收束，清新自然；副歌与主歌均常用。', 60, true],
    ['6451',      'vi-IV-V-I',   '小调开篇、属主收束，由温柔推向坚定；流行与摇滚皆宜的稳定走向。', 60, false],
    ['145',       'I-IV-V',      '正格进行，基础而有力、明亮坚定；摇滚、进行曲与儿歌常用，根音稳固。', 80, true],
    ['1364',      'I-iii-vi-IV', '下行三度进行，情绪持续下沉，淡淡伤感与怀旧；抒情主歌的常见走向。', 55, false],
    ['1465',      'I-IV-vi-V',   '温暖民谣进行，和声缠绵柔和、治愈感强；民谣弹唱最顺手的走向之一。', 60, true],
    ['154',       'I-V-IV',      '主→属→下属，摇滚感十足、简单直接有力量；经典民谣摇滚走向。', 80, false],
    ['1456',      'I-IV-V-vi',   '四和弦循环推进，明亮中夹小调色彩，节奏感强；适合快节奏弹唱。', 65, false],
    ['123456',    'I-ii-iii-IV-V-vi', '覆盖自然大调全部六个三和弦，和声循序递进；适合和弦转换与综合训练。', 55, false]
  ];

  /* G 调：精选 7 套（避免 19×9 爆炸，保留高频实用走向） */
  const G_PROGRESSIONS = [
    ['1645',      'I-vi-IV-V',   '万能四和弦，忧伤中带希望，情感层次丰富；民谣、流行通吃的高频走向。', 60, true],
    ['145',       'I-IV-V',      '正格进行，基础而有力、明亮坚定；摇滚、进行曲与儿歌常用，根音稳固。', 80, true],
    ['15634145',  '卡农进行',    '经典卡农和声（I-V-vi-iii-IV-I-IV-V），和声层层递进而绵延不绝，优雅且富有歌唱性。', 50, false],
    ['6415',      'vi-IV-I-V',   '下中音起句的流行四和弦，温柔开场、明亮收束，清新自然；副歌与主歌均常用。', 60, true],
    ['4536251',   'IV-V-iii-vi-ii-V-I', '流行情歌经典长走向，从下属逐级下行再 ii-V-I 收束，层次丰富、煽情动人。', 50, true],
    ['1465',      'I-IV-vi-V',   '温暖民谣进行，和声缠绵柔和、治愈感强；民谣弹唱最顺手的走向之一。', 60, false],
    ['1564',      'I-V-vi-IV',   '流行音乐黄金四和弦，先强烈后柔软回甘，朗朗上口；万能走向。', 60, false]
  ];

  function buildTasks(key, progressions) {
    const map = DEGREE_MAP[key];
    return progressions.map(([code, suffix, desc, speed, common]) => {
      const nums = code.split('');
      const chords = nums.map(n => ch(key, map[n]));
      const id = 'preset-' + key.toLowerCase() + '-' + code;
      const name = key + '调·' + (suffix.indexOf('进行') >= 0 ? suffix : suffix + '（' + nums.join('-') + '）');
      return presetTask(id, name, key, chords, { speed, desc, common });
    });
  }

  const PRESET_TASKS = buildTasks('C', C_PROGRESSIONS).concat(buildTasks('G', G_PROGRESSIONS));

  /* 返回预制任务的深拷贝，用于重置/生成配置文件 */
  function buildPresetTasks() {
    return JSON.parse(JSON.stringify(PRESET_TASKS));
  }

  global.PRESET_TASKS = PRESET_TASKS;
  global.buildPresetTasks = buildPresetTasks;
})(typeof window !== 'undefined' ? window : globalThis);