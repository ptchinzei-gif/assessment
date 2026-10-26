/**
 * RehaMetrics - リハビリ計測支援アプリ
 * 10m歩行テスト & SPPB（高齢者身体機能バッテリー）ロジック
 */

// ========================================================
// 状態管理 (State)
// ========================================================
const appState = {
  currentAssessment: 'walk10m', // 'walk10m' | 'sppb'
  soundEnabled: true,
  vibrateEnabled: true,

  // 10m歩行テストのデータ
  walk: {
    mode: 'comfortable', // 'comfortable' | 'maximum'
    trial: 1,           // 1 | 2
    isRunning: false,
    startTime: 0,
    elapsedTime: 0,
    timerInterval: null,
    records: {
      comfortable: {
        1: { time: null, speed: null, steps: null, stepLength: null },
        2: { time: null, speed: null, steps: null, stepLength: null }
      },
      maximum: {
        1: { time: null, speed: null, steps: null, stepLength: null },
        2: { time: null, speed: null, steps: null, stepLength: null }
      }
    },
    patient: {
      gender: 'female',
      ageGroup: '70'
    }
  },

  // SPPBのデータ
  sppb: {
    balance: {
      side: null,   // 'pass' | 'fail'
      semi: null,   // 'pass' | 'fail'
      tandem: null, // 'pass10' | 'pass3_9' | 'fail3'
      score: 0
    },
    gait: {
      slot: 1,
      1: null, // time in sec
      2: null,
      isUnable: false,
      score: 0,
      isRunning: false,
      startTime: 0,
      elapsedTime: 0,
      timerInterval: null
    },
    chair: {
      precheck: true, // true (可能) | false (不可)
      time: null,     // time in sec
      isUnable: false,
      score: 0,
      isRunning: false,
      startTime: 0,
      elapsedTime: 0,
      timerInterval: null
    },
    totalScore: 0
  }
};

// ========================================================
// 基準データベース
// ========================================================
const BENCHMARKS_10M = {
  male: {
    young: { comf: 1.45, max: 2.05 },
    60:    { comf: 1.38, max: 1.88 },
    70:    { comf: 1.28, max: 1.68 },
    80:    { comf: 1.08, max: 1.35 }
  },
  female: {
    young: { comf: 1.40, max: 1.95 },
    60:    { comf: 1.34, max: 1.76 },
    70:    { comf: 1.23, max: 1.58 },
    80:    { comf: 1.02, max: 1.24 }
  }
};

// ========================================================
// 効果音（Web Audio API） & 振動（Vibration API）
// ========================================================
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playStartBeep() {
  if (!appState.soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (e) {
    console.warn(e);
  }
}

function playStopBeep() {
  if (!appState.soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.frequency.setValueAtTime(1046, now);
    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.08);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.frequency.setValueAtTime(1318, now + 0.1);
    gain2.gain.setValueAtTime(0.35, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.22);
  } catch (e) {
    console.warn(e);
  }
}

function triggerVibration(pattern) {
  if (!appState.vibrateEnabled) return;
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      console.warn(e);
    }
  }
}

// ========================================================
// 初期化 & イベント設定
// ========================================================
function initApp() {
  try {
    setupHeaderEvents();
    setupWalk10mEvents();
    setupSppbEvents();
    setupCommonModalEvents();

    updateWalkUI();
    updateWalkFeedback();
    updateSppbUI();
    console.log('RehaMetrics: アプリの初期化が完了しました。');
  } catch (error) {
    console.error('RehaMetrics 初期化エラー:', error);
  }
}

// DOM読み込みが進行中の場合はイベント待ち、既に完了している場合は即時実行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

window.appState = appState;
window.initApp = initApp;

// --------------------------------------------------------
// ヘッダー & 評価スイッチャー
// --------------------------------------------------------
function setupHeaderEvents() {
  const assessmentSelect = document.getElementById('assessment-select');
  assessmentSelect.addEventListener('change', (e) => {
    switchAssessment(e.target.value);
  });

  // 音トグル
  const soundBtn = document.getElementById('sound-toggle-btn');
  soundBtn.addEventListener('click', () => {
    appState.soundEnabled = !appState.soundEnabled;
    soundBtn.classList.toggle('active', appState.soundEnabled);
    soundBtn.classList.toggle('inactive', !appState.soundEnabled);
    if (appState.soundEnabled) playStartBeep();
  });

  // 振動トグル
  const vibrateBtn = document.getElementById('vibrate-toggle-btn');
  vibrateBtn.addEventListener('click', () => {
    appState.vibrateEnabled = !appState.vibrateEnabled;
    vibrateBtn.classList.toggle('active', appState.vibrateEnabled);
    vibrateBtn.classList.toggle('inactive', !appState.vibrateEnabled);
    if (appState.vibrateEnabled) triggerVibration(60);
  });

  // リセットボタン
  const resetBtn = document.getElementById('reset-all-btn');
  resetBtn.addEventListener('click', () => {
    if (appState.currentAssessment === 'walk10m') {
      if (confirm('10m歩行テストの全記録をリセットしますか？')) {
        resetWalkData();
      }
    } else {
      if (confirm('SPPBの全記録をリセットしますか？')) {
        resetSppbData();
      }
    }
  });

  // 各ビュー内のタブ切り替え
  document.querySelectorAll('.nav-tabs').forEach(tabNav => {
    const tabs = tabNav.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTabId = tab.getAttribute('data-tab');
        const view = tab.closest('.assessment-view');
        
        view.querySelectorAll('.tab-btn').forEach(b => {
          b.classList.toggle('active', b === tab);
          b.setAttribute('aria-selected', b === tab);
        });
        view.querySelectorAll('.tab-pane').forEach(p => {
          p.classList.toggle('active', p.id === `tab-${targetTabId}`);
        });

        if (targetTabId === 'walk-feedback') updateWalkFeedback();
        if (targetTabId === 'sppb-feedback') updateSppbFeedback();
      });
    });
  });
}

function switchAssessment(assessmentId) {
  appState.currentAssessment = assessmentId;
  document.getElementById('view-walk10m').classList.toggle('active', assessmentId === 'walk10m');
  document.getElementById('view-sppb').classList.toggle('active', assessmentId === 'sppb');
  if (assessmentId === 'sppb') {
    updateSppbUI();
  }
}

// ========================================================
// 10m歩行テスト モジュール
// ========================================================
function setupWalk10mEvents() {
  const modeComfBtn = document.getElementById('mode-comfortable');
  const modeMaxBtn = document.getElementById('mode-maximum');
  const trial1Btn = document.getElementById('trial-1-btn');
  const trial2Btn = document.getElementById('trial-2-btn');
  const timerCard = document.getElementById('timer-touch-area');
  const stepInput = document.getElementById('step-count-input');
  const btnStepMinus = document.getElementById('btn-step-minus');
  const btnStepPlus = document.getElementById('btn-step-plus');
  const btnClearMode = document.getElementById('btn-clear-current-mode');
  const quickCopyBtn = document.getElementById('quick-copy-btn');
  const filterGender = document.getElementById('filter-gender');
  const filterAge = document.getElementById('filter-age');

  modeComfBtn.addEventListener('click', () => setWalkMode('comfortable'));
  modeMaxBtn.addEventListener('click', () => setWalkMode('maximum'));

  trial1Btn.addEventListener('click', () => setWalkTrial(1));
  trial2Btn.addEventListener('click', () => setWalkTrial(2));

  timerCard.addEventListener('click', toggleWalkTimer);

  stepInput.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10);
    saveWalkSteps(isNaN(v) ? null : v);
  });
  btnStepMinus.addEventListener('click', () => adjustWalkSteps(-1));
  btnStepPlus.addEventListener('click', () => adjustWalkSteps(1));

  btnClearMode.addEventListener('click', () => {
    const m = appState.walk.mode;
    const name = m === 'comfortable' ? '快適歩行' : '最大歩行';
    if (confirm(`${name}の1回目・2回目の記録を消去しますか？`)) {
      appState.walk.records[m][1] = { time: null, speed: null, steps: null, stepLength: null };
      appState.walk.records[m][2] = { time: null, speed: null, steps: null, stepLength: null };
      appState.walk.trial = 1;
      updateWalkUI();
      updateWalkFeedback();
    }
  });

  quickCopyBtn.addEventListener('click', () => {
    openChartModal('【10m歩行テスト】カルテ転記', generateWalkChartText());
  });

  filterGender.addEventListener('change', (e) => {
    appState.walk.patient.gender = e.target.value;
    updateWalkFeedback();
  });
  filterAge.addEventListener('change', (e) => {
    appState.walk.patient.ageGroup = e.target.value;
    updateWalkFeedback();
  });
}

function setWalkMode(mode) {
  if (appState.walk.isRunning) return;
  appState.walk.mode = mode;
  document.getElementById('mode-comfortable').classList.toggle('active', mode === 'comfortable');
  document.getElementById('mode-maximum').classList.toggle('active', mode === 'maximum');
  document.getElementById('summary-section-title').textContent = mode === 'comfortable' ? '快適歩行の記録' : '最大歩行の記録';

  const cur = appState.walk.records[mode];
  if (cur[1].time === null) appState.walk.trial = 1;
  else if (cur[2].time === null) appState.walk.trial = 2;
  updateWalkUI();
}

function setWalkTrial(trial) {
  if (appState.walk.isRunning) return;
  appState.walk.trial = trial;
  updateWalkUI();
}

function toggleWalkTimer() {
  if (!appState.walk.isRunning) {
    startWalkTimer();
  } else {
    stopWalkTimer();
  }
}

function startWalkTimer() {
  const w = appState.walk;
  w.isRunning = true;
  w.startTime = performance.now();
  w.elapsedTime = 0;

  playStartBeep();
  triggerVibration(80);

  const card = document.getElementById('timer-touch-area');
  const badge = document.getElementById('timer-status-badge');
  const display = document.getElementById('timer-display');
  const speedEl = document.getElementById('current-speed');

  card.classList.add('running');
  card.classList.toggle('max-mode', w.mode === 'maximum');
  badge.textContent = '計測中... タップで停止';

  w.timerInterval = setInterval(() => {
    const now = performance.now();
    w.elapsedTime = (now - w.startTime) / 1000;
    display.innerHTML = `${w.elapsedTime.toFixed(2)}<span class="timer-unit">秒</span>`;
    if (w.elapsedTime > 0.5) {
      speedEl.textContent = (10 / w.elapsedTime).toFixed(2);
    }
  }, 30);
}

function stopWalkTimer() {
  const w = appState.walk;
  w.isRunning = false;
  clearInterval(w.timerInterval);

  playStopBeep();
  triggerVibration([80, 50, 120]);

  const card = document.getElementById('timer-touch-area');
  const badge = document.getElementById('timer-status-badge');
  card.classList.remove('running');
  badge.textContent = '測定完了！';

  const finalTime = Math.round(w.elapsedTime * 100) / 100;
  const speed = Math.round((10 / finalTime) * 100) / 100;
  const currentRec = w.records[w.mode][w.trial];
  currentRec.time = finalTime;
  currentRec.speed = speed;

  if (currentRec.steps) {
    currentRec.stepLength = Math.round((1000 / currentRec.steps) * 10) / 10;
  }

  if (w.trial === 1 && w.records[w.mode][2].time === null) {
    setTimeout(() => {
      w.trial = 2;
      updateWalkUI();
    }, 700);
  }

  updateWalkUI();
  updateWalkFeedback();
}

function adjustWalkSteps(delta) {
  const input = document.getElementById('step-count-input');
  let cur = parseInt(input.value, 10);
  if (isNaN(cur)) cur = 0;
  const next = Math.max(0, cur + delta);
  input.value = next === 0 ? '' : next;
  saveWalkSteps(next === 0 ? null : next);
}

function saveWalkSteps(steps) {
  const w = appState.walk;
  const cur = w.records[w.mode][w.trial];
  cur.steps = steps;
  if (steps && cur.time) {
    cur.stepLength = Math.round((1000 / steps) * 10) / 10;
  } else {
    cur.stepLength = null;
  }
  updateWalkUI();
}

function updateWalkUI() {
  const w = appState.walk;
  document.getElementById('trial-1-btn').classList.toggle('active', w.trial === 1);
  document.getElementById('trial-2-btn').classList.toggle('active', w.trial === 2);

  const curMode = w.records[w.mode];
  const b1 = document.getElementById('trial-1-badge');
  const b2 = document.getElementById('trial-2-badge');

  b1.textContent = curMode[1].time !== null ? `${curMode[1].time.toFixed(2)}s` : '未測定';
  b1.classList.toggle('done', curMode[1].time !== null);
  b2.textContent = curMode[2].time !== null ? `${curMode[2].time.toFixed(2)}s` : '未測定';
  b2.classList.toggle('done', curMode[2].time !== null);

  const activeRec = curMode[w.trial];
  if (!w.isRunning) {
    const disp = document.getElementById('timer-display');
    const badge = document.getElementById('timer-status-badge');
    const spd = document.getElementById('current-speed');
    const stepIn = document.getElementById('step-count-input');

    if (activeRec.time !== null) {
      disp.innerHTML = `${activeRec.time.toFixed(2)}<span class="timer-unit">秒</span>`;
      spd.textContent = activeRec.speed.toFixed(2);
      badge.textContent = `第${w.trial}回 記録済（タップで再測定）`;
    } else {
      disp.innerHTML = `00.00<span class="timer-unit">秒</span>`;
      spd.textContent = '-';
      badge.textContent = `第${w.trial}回 タップして開始`;
    }
    stepIn.value = activeRec.steps !== null ? activeRec.steps : '';
  }

  // カード描画
  document.getElementById('card-trial-1').classList.toggle('active', w.trial === 1);
  document.getElementById('card-trial-2').classList.toggle('active', w.trial === 2);
  renderWalkCard('card-1', curMode[1]);
  renderWalkCard('card-2', curMode[2]);

  // 採用値
  const adopt = getWalkAdoptionData(w.mode);
  const adoptEl = document.getElementById('adoption-summary');
  if (!adopt) {
    adoptEl.textContent = '2回計測すると自動計算されます';
  } else if (adopt.type === '2回平均') {
    adoptEl.innerHTML = `平均速度: <strong>${adopt.speed.toFixed(2)} m/s</strong> (${adopt.time.toFixed(2)}秒 / 最速: ${adopt.bestSpeed.toFixed(2)}m/s)`;
  } else {
    adoptEl.innerHTML = `測定値: <strong>${adopt.speed.toFixed(2)} m/s</strong> (${adopt.time.toFixed(2)}秒)`;
  }
}

function renderWalkCard(prefix, rec) {
  const status = document.getElementById(`${prefix}-status`);
  const time = document.getElementById(`${prefix}-time`);
  const speed = document.getElementById(`${prefix}-speed`);
  const steps = document.getElementById(`${prefix}-steps`);
  const length = document.getElementById(`${prefix}-step-length`);

  if (rec.time !== null) {
    status.textContent = '記録済';
    status.classList.add('recorded');
    time.innerHTML = `${rec.time.toFixed(2)}<small>秒</small>`;
    speed.textContent = rec.speed.toFixed(2);
    steps.textContent = rec.steps !== null ? rec.steps : '--';
    length.textContent = rec.stepLength !== null ? rec.stepLength : '--';
  } else {
    status.textContent = '未';
    status.classList.remove('recorded');
    time.innerHTML = `--.--<small>秒</small>`;
    speed.textContent = '--';
    steps.textContent = '--';
    length.textContent = '--';
  }
}

function getWalkAdoptionData(mode) {
  const r1 = appState.walk.records[mode][1];
  const r2 = appState.walk.records[mode][2];
  if (r1.time === null && r2.time === null) return null;
  if (r1.time !== null && r2.time === null) return { ...r1, type: '1回目のみ' };
  if (r1.time === null && r2.time !== null) return { ...r2, type: '2回目のみ' };

  const avgTime = Math.round(((r1.time + r2.time) / 2) * 100) / 100;
  const avgSpeed = Math.round(((r1.speed + r2.speed) / 2) * 100) / 100;
  const bestSpeed = Math.max(r1.speed, r2.speed);
  let avgSteps = null, avgStepLength = null;
  if (r1.steps !== null && r2.steps !== null) {
    avgSteps = Math.round((r1.steps + r2.steps) / 2);
    avgStepLength = Math.round(((r1.stepLength + r2.stepLength) / 2) * 10) / 10;
  }
  return { time: avgTime, speed: avgSpeed, bestSpeed, steps: avgSteps, stepLength: avgStepLength, type: '2回平均' };
}

function updateWalkFeedback() {
  const p = appState.walk.patient;
  const bench = BENCHMARKS_10M[p.gender][p.ageGroup];
  const comf = getWalkAdoptionData('comfortable');
  const max = getWalkAdoptionData('maximum');

  // 快適歩行
  document.getElementById('comf-benchmark-text').textContent = `同年代平均: ${bench.comf} m/s`;
  const comfBenchPercent = Math.min(100, Math.max(0, (bench.comf / 2.0) * 100));
  document.getElementById('comf-benchmark-line').style.left = `${comfBenchPercent}%`;

  const comfValEl = document.getElementById('meter-comf-val');
  const comfBarEl = document.getElementById('comf-bar-fill');
  const comfEvalEl = document.getElementById('comf-evaluation-text');

  if (comf) {
    comfValEl.textContent = `${comf.speed.toFixed(2)} m/s`;
    comfBarEl.style.width = `${Math.min(100, (comf.speed / 2.0) * 100)}%`;
    const diff = comf.speed - bench.comf;
    if (diff >= 0.1) {
      comfEvalEl.innerHTML = `🌟 同年代平均を上回る良好な歩行ペースです（+${diff.toFixed(2)} m/s）`;
      comfEvalEl.style.background = '#ecfdf5'; comfEvalEl.style.color = '#065f46';
    } else if (diff >= -0.15) {
      comfEvalEl.innerHTML = `✅ 同年代の平均と同等レベルの安定したペースです`;
      comfEvalEl.style.background = '#eff6ff'; comfEvalEl.style.color = '#1e40af';
    } else if (comf.speed < 0.8) {
      comfEvalEl.innerHTML = `⚠️ 0.8m/s未満: 屋外歩行での転倒・移動困難リスクが高い状態です`;
      comfEvalEl.style.background = '#fee2e2'; comfEvalEl.style.color = '#991b1b';
    } else {
      comfEvalEl.innerHTML = `ℹ️ 同年代平均よりやや緩やかなペースです（-${Math.abs(diff).toFixed(2)} m/s）`;
      comfEvalEl.style.background = '#fef3c7'; comfEvalEl.style.color = '#92400e';
    }
  } else {
    comfValEl.textContent = '測定なし';
    comfBarEl.style.width = '0%';
    comfEvalEl.textContent = '快適歩行の計測後に判定が表示されます';
    comfEvalEl.style.background = '#f1f5f9'; comfEvalEl.style.color = '#64748b';
  }

  // 最大歩行
  document.getElementById('max-benchmark-text').textContent = `同年代平均: ${bench.max} m/s`;
  const maxBenchPercent = Math.min(100, Math.max(0, (bench.max / 2.5) * 100));
  document.getElementById('max-benchmark-line').style.left = `${maxBenchPercent}%`;

  const maxValEl = document.getElementById('meter-max-val');
  const maxBarEl = document.getElementById('max-bar-fill');
  const maxEvalEl = document.getElementById('max-evaluation-text');

  if (max) {
    maxValEl.textContent = `${max.speed.toFixed(2)} m/s`;
    maxBarEl.style.width = `${Math.min(100, (max.speed / 2.5) * 100)}%`;
    const diff = max.speed - bench.max;
    if (diff >= 0.1) {
      maxEvalEl.innerHTML = `⚡ 最大歩行の余力（予備能）が十分に保持されています`;
      maxEvalEl.style.background = '#ecfdf5'; maxEvalEl.style.color = '#065f46';
    } else if (diff >= -0.2) {
      maxEvalEl.innerHTML = `✅ 最大速度の切り替えがスムーズに行えています`;
      maxEvalEl.style.background = '#eff6ff'; maxEvalEl.style.color = '#1e40af';
    } else {
      maxEvalEl.innerHTML = `⚠️ 速度切り替えの予備能がやや低下しています`;
      maxEvalEl.style.background = '#fef3c7'; maxEvalEl.style.color = '#92400e';
    }
  } else {
    maxValEl.textContent = '測定なし';
    maxBarEl.style.width = '0%';
    maxEvalEl.textContent = '最大歩行の計測後に判定が表示されます';
    maxEvalEl.style.background = '#f1f5f9'; maxEvalEl.style.color = '#64748b';
  }

  // アドバイス文
  const sampleEl = document.getElementById('patient-talk-sample');
  if (!comf && !max) {
    sampleEl.textContent = '測定を行うと、患者さんにそのままお伝えできる分かりやすい説明例がここに表示されます。';
  } else {
    let t = '';
    if (comf) {
      if (comf.speed >= bench.comf) t += `「普段の速さは ${comf.speed.toFixed(2)}m/秒 と、同年代の平均（${bench.comf}m/秒）を上回るしっかりしたペースです。`;
      else if (comf.speed >= 1.0) t += `「普段の速さは ${comf.speed.toFixed(2)}m/秒 で、青信号（1.0m/秒）を安全に渡りきれる十分な速度を維持できています。`;
      else t += `「普段の速さは ${comf.speed.toFixed(2)}m/秒 でした。無理のないペースを保ちながら、足腰の持久力をつけていきましょう。`;
    }
    if (max) {
      if (max.speed >= (comf?.speed || 0) * 1.25) t += ` 急ぎ足の際もしっかりスピードアップできる余力がありますよ。」`;
      else t += ` バランスに気を配りながら安全第一で進めていきましょう。」`;
    } else t += `」`;
    sampleEl.textContent = t;
  }
}

function generateWalkChartText() {
  const w = appState.walk;
  const comfAdopt = getWalkAdoptionData('comfortable');
  const maxAdopt = getWalkAdoptionData('maximum');
  const p = w.patient;
  const bench = BENCHMARKS_10M[p.gender][p.ageGroup];
  const gStr = p.gender === 'male' ? '男性' : '女性';
  const aStr = p.ageGroup === 'young' ? '一般' : `${p.ageGroup}代`;

  let txt = `【10m歩行テスト】\n`;
  if (comfAdopt) {
    txt += `・快適歩行: ${comfAdopt.speed.toFixed(2)} m/s (${comfAdopt.time.toFixed(2)}秒)\n`;
    txt += `  [詳細] 1回目: ${formatTrial(w.records.comfortable[1])} / 2回目: ${formatTrial(w.records.comfortable[2])}\n`;
    if (comfAdopt.steps) txt += `  [歩容] 平均歩数: ${comfAdopt.steps}歩, 平均歩幅: ${comfAdopt.stepLength}cm\n`;
  } else {
    txt += `・快適歩行: 未実施\n`;
  }

  if (maxAdopt) {
    txt += `・最大歩行: ${maxAdopt.speed.toFixed(2)} m/s (${maxAdopt.time.toFixed(2)}秒)\n`;
    txt += `  [詳細] 1回目: ${formatTrial(w.records.maximum[1])} / 2回目: ${formatTrial(w.records.maximum[2])}\n`;
    if (maxAdopt.steps) txt += `  [歩容] 平均歩数: ${maxAdopt.steps}歩, 平均歩幅: ${maxAdopt.stepLength}cm\n`;
  } else {
    txt += `・最大歩行: 未実施\n`;
  }

  txt += `・基準値比較: ${aStr}${gStr}平均(快適 ${bench.comf}m/s, 最大 ${bench.max}m/s)\n`;
  if (comfAdopt) {
    if (comfAdopt.speed >= 1.0) txt += `  判定: 屋外自立レベル・信号横断可能域（良好）`;
    else if (comfAdopt.speed >= 0.8) txt += `  判定: 軽度歩行制限・転倒リスク要観察（1.0m/s未満）`;
    else txt += `  判定: 歩行機能低下・屋外移動要介助リスク高（0.8m/s未満）`;
  }
  return txt;
}

function formatTrial(t) {
  if (t.time === null) return '未';
  let s = `${t.time.toFixed(2)}s(${t.speed.toFixed(2)}m/s)`;
  if (t.steps) s += `,${t.steps}歩`;
  return s;
}

function resetWalkData() {
  appState.walk.records = {
    comfortable: {
      1: { time: null, speed: null, steps: null, stepLength: null },
      2: { time: null, speed: null, steps: null, stepLength: null }
    },
    maximum: {
      1: { time: null, speed: null, steps: null, stepLength: null },
      2: { time: null, speed: null, steps: null, stepLength: null }
    }
  };
  appState.walk.trial = 1;
  updateWalkUI();
  updateWalkFeedback();
}

// ========================================================
// SPPB（高齢者総合機能バッテリー）モジュール
// ========================================================
function setupSppbEvents() {
  // 1. バランステストのボタン
  document.querySelectorAll('.sppb-choice-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-balance');
      const val = btn.getAttribute('data-val');
      handleBalanceChoice(type, val);
    });
  });

  // 2. 4m歩行テスト
  const gaitTimer = document.getElementById('gait-timer-area');
  gaitTimer.addEventListener('click', toggleGaitTimer);

  // 10m歩行からのデータ取り込み
  const btnImport10m = document.getElementById('btn-import-10m');
  btnImport10m.addEventListener('click', import10mWalkToSppb);

  const slot1 = document.getElementById('gait-slot-1');
  const slot2 = document.getElementById('gait-slot-2');
  slot1.addEventListener('click', () => setGaitSlot(1));
  slot2.addEventListener('click', () => setGaitSlot(2));

  document.getElementById('btn-gait-slot-switch').addEventListener('click', () => {
    setGaitSlot(appState.sppb.gait.slot === 1 ? 2 : 1);
  });

  document.getElementById('btn-gait-unable').addEventListener('click', () => {
    appState.sppb.gait.isUnable = true;
    appState.sppb.gait.isImported = false;
    appState.sppb.gait[1] = null;
    appState.sppb.gait[2] = null;
    updateSppbScore();
    updateSppbUI();
  });

  // 3. 5回椅子立ち上がりテスト
  const precheckYes = document.getElementById('btn-precheck-yes');
  const precheckNo = document.getElementById('btn-precheck-no');
  precheckYes.addEventListener('click', () => {
    appState.sppb.chair.precheck = true;
    appState.sppb.chair.isUnable = false;
    precheckYes.classList.add('active');
    precheckNo.classList.remove('active');
    updateSppbScore();
    updateSppbUI();
  });
  precheckNo.addEventListener('click', () => {
    appState.sppb.chair.precheck = false;
    appState.sppb.chair.isUnable = true;
    appState.sppb.chair.time = null;
    precheckYes.classList.remove('active');
    precheckNo.classList.add('active');
    updateSppbScore();
    updateSppbUI();
  });

  const chairTimer = document.getElementById('chair-timer-area');
  chairTimer.addEventListener('click', toggleChairTimer);

  document.getElementById('btn-set-chair-manual').addEventListener('click', () => {
    const val = parseFloat(document.getElementById('chair-manual-sec').value);
    if (!isNaN(val) && val > 0) {
      appState.sppb.chair.time = val;
      appState.sppb.chair.isUnable = false;
      document.getElementById('chair-timer-display').innerHTML = `${val.toFixed(2)}<small>秒</small>`;
      updateSppbScore();
      updateSppbUI();
    }
  });

  document.getElementById('btn-chair-unable').addEventListener('click', () => {
    appState.sppb.chair.isUnable = true;
    appState.sppb.chair.time = null;
    updateSppbScore();
    updateSppbUI();
  });

  // SPPBカルテコピー
  document.getElementById('sppb-quick-copy-btn').addEventListener('click', () => {
    openChartModal('【SPPB】カルテ転記', generateSppbChartText());
  });
}

// バランステストの選択処理
function handleBalanceChoice(type, val) {
  const b = appState.sppb.balance;
  b[type] = val;

  // 閉脚立位でfailの場合、半タンデム・タンデムは自動的にfail
  if (type === 'side' && val === 'fail') {
    b.semi = 'fail';
    b.tandem = 'fail3';
  }
  // 半タンデムでfailの場合、タンデムは自動的にfail
  if (type === 'semi' && val === 'fail') {
    b.tandem = 'fail3';
  }

  updateSppbScore();
  updateSppbUI();
}

// 10m歩行テスト（快適歩行）から4m換算タイムを取り込む処理
function import10mWalkToSppb() {
  const comf1 = appState.walk.records.comfortable[1];
  const comf2 = appState.walk.records.comfortable[2];
  const adopt = getWalkAdoptionData('comfortable');

  if (!adopt || (!comf1.speed && !comf2.speed)) {
    alert('10m快適歩行の測定データがありません。先に10m歩行テストを計測してください。');
    return;
  }

  const g = appState.sppb.gait;
  g.isUnable = false;
  g.isImported = true;
  g.importedSpeed = adopt.speed;

  // 1回目の4m換算タイム (4m ÷ 速度)
  if (comf1.speed) {
    g[1] = Math.round((4 / comf1.speed) * 100) / 100;
  } else if (adopt.speed) {
    g[1] = Math.round((4 / adopt.speed) * 100) / 100;
  }

  // 2回目の4m換算タイム
  if (comf2.speed) {
    g[2] = Math.round((4 / comf2.speed) * 100) / 100;
  } else {
    g[2] = null;
  }

  updateSppbScore();
  updateSppbUI();

  // 成功トースト表示
  showToastCustom(`10m快適歩行（${adopt.speed.toFixed(2)}m/s）から4m換算タイムを取り込みました！`);
}

// 4m歩行タイマー
function setGaitSlot(slot) {
  if (appState.sppb.gait.isRunning) return;
  appState.sppb.gait.slot = slot;
  document.getElementById('gait-slot-1').classList.toggle('active', slot === 1);
  document.getElementById('gait-slot-2').classList.toggle('active', slot === 2);
}

function toggleGaitTimer() {
  const g = appState.sppb.gait;
  if (!g.isRunning) {
    g.isRunning = true;
    g.isUnable = false;
    g.startTime = performance.now();
    playStartBeep();
    triggerVibration(80);

    const timerArea = document.getElementById('gait-timer-area');
    const badge = document.getElementById('gait-timer-badge');
    const display = document.getElementById('gait-timer-display');
    timerArea.classList.add('running');
    badge.textContent = `第${g.slot}回 計測中... タップで停止`;

    g.timerInterval = setInterval(() => {
      g.elapsedTime = (performance.now() - g.startTime) / 1000;
      display.innerHTML = `${g.elapsedTime.toFixed(2)}<small>秒</small>`;
    }, 30);
  } else {
    g.isRunning = false;
    clearInterval(g.timerInterval);
    playStopBeep();
    triggerVibration([80, 50, 120]);

    const timerArea = document.getElementById('gait-timer-area');
    const badge = document.getElementById('gait-timer-badge');
    timerArea.classList.remove('running');
    badge.textContent = `第${g.slot}回 測定完了！`;

    const finalTime = Math.round(g.elapsedTime * 100) / 100;
    g[g.slot] = finalTime;

    // 1回目測定後は自動的に2回目へ
    if (g.slot === 1 && g[2] === null) {
      setTimeout(() => setGaitSlot(2), 700);
    }

    updateSppbScore();
    updateSppbUI();
  }
}

// 5回椅子立ち上がりタイマー
function toggleChairTimer() {
  const c = appState.sppb.chair;
  if (!c.precheck) {
    alert('事前チェックで腕組み起立が不可のため、椅子テストは0点となります。');
    return;
  }

  if (!c.isRunning) {
    c.isRunning = true;
    c.isUnable = false;
    c.startTime = performance.now();
    playStartBeep();
    triggerVibration(80);

    const timerArea = document.getElementById('chair-timer-area');
    const badge = document.getElementById('chair-timer-badge');
    const display = document.getElementById('chair-timer-display');
    timerArea.classList.add('running');
    badge.textContent = '5回立ち座り計測中... 終了時にタップ';

    c.timerInterval = setInterval(() => {
      c.elapsedTime = (performance.now() - c.startTime) / 1000;
      display.innerHTML = `${c.elapsedTime.toFixed(2)}<small>秒</small>`;
    }, 30);
  } else {
    c.isRunning = false;
    clearInterval(c.timerInterval);
    playStopBeep();
    triggerVibration([80, 50, 120]);

    const timerArea = document.getElementById('chair-timer-area');
    const badge = document.getElementById('chair-timer-badge');
    timerArea.classList.remove('running');
    badge.textContent = '測定完了！';

    const finalTime = Math.round(c.elapsedTime * 100) / 100;
    c.time = finalTime;
    document.getElementById('chair-manual-sec').value = finalTime;

    updateSppbScore();
    updateSppbUI();
  }
}

// SPPB スコア集計ロジック
function updateSppbScore() {
  const s = appState.sppb;

  // 1. バランステスト（0〜4点）
  let bScore = 0;
  if (s.balance.side === 'pass') bScore += 1;
  if (s.balance.semi === 'pass') bScore += 1;
  if (s.balance.tandem === 'pass10') bScore += 2;
  else if (s.balance.tandem === 'pass3_9') bScore += 1;
  s.balance.score = bScore;

  // 2. 4m歩行テスト（0〜4点）
  let gScore = 0;
  const t1 = s.gait[1];
  const t2 = s.gait[2];
  let adoptedTime = null;

  if (s.gait.isUnable) {
    gScore = 0;
  } else if (t1 !== null || t2 !== null) {
    if (t1 !== null && t2 !== null) adoptedTime = Math.min(t1, t2);
    else adoptedTime = t1 !== null ? t1 : t2;

    if (adoptedTime < 4.82) gScore = 4;
    else if (adoptedTime <= 6.20) gScore = 3;
    else if (adoptedTime <= 8.70) gScore = 2;
    else gScore = 1;
  }
  s.gait.score = gScore;
  s.gait.adoptedTime = adoptedTime;

  // 3. 5回椅子立ち上がりテスト（0〜4点）
  let cScore = 0;
  if (!s.chair.precheck || s.chair.isUnable) {
    cScore = 0;
  } else if (s.chair.time !== null) {
    const ct = s.chair.time;
    if (ct <= 11.19) cScore = 4;
    else if (ct <= 13.69) cScore = 3;
    else if (ct <= 16.69) cScore = 2;
    else if (ct <= 60.00) cScore = 1;
    else cScore = 0;
  }
  s.chair.score = cScore;

  // 合計点 (0〜12点)
  s.totalScore = bScore + gScore + cScore;
}

function updateSppbUI() {
  const s = appState.sppb;

  // バナー合計表示
  const totalEl = document.getElementById('sppb-total-score');
  totalEl.textContent = s.totalScore;

  const rankBadge = document.querySelector('.sppb-score-banner .rank-badge');
  const rankDesc = document.getElementById('sppb-banner-eval-desc');

  rankBadge.classList.remove('good', 'moderate', 'severe');
  if (s.totalScore >= 10) {
    rankBadge.textContent = '良好 (10-12点)';
    rankBadge.classList.add('good');
    rankDesc.textContent = '身体機能は自立レベルを良好に維持';
  } else if (s.totalScore >= 7) {
    rankBadge.textContent = '低下・フレイル (7-9点)';
    rankBadge.classList.add('moderate');
    rankDesc.textContent = 'サルコペニア疑い・転倒リスク要観察';
  } else if (s.totalScore > 0 || s.chair.isUnable || s.gait.isUnable) {
    rankBadge.textContent = '重度低下 (0-6点)';
    rankBadge.classList.add('severe');
    rankDesc.textContent = '日常生活動作・要介護化ハイリスク群';
  } else {
    rankBadge.textContent = '未測定';
    rankDesc.textContent = '各項目を入力してください';
  }

  // 1. バランステストUI反映
  document.getElementById('sppb-score-balance').textContent = `${s.balance.score} / 4点`;
  updateChoiceButtons('side', s.balance.side);
  updateChoiceButtons('semi', s.balance.semi);
  updateChoiceButtons('tandem', s.balance.tandem);

  const l1 = document.getElementById('balance-res-label-1');
  l1.textContent = s.balance.side === 'pass' ? '1点 (クリア)' : s.balance.side === 'fail' ? '0点' : '未判定';
  l1.classList.toggle('done', s.balance.side === 'pass');

  const l2 = document.getElementById('balance-res-label-2');
  l2.textContent = s.balance.semi === 'pass' ? '1点 (クリア)' : s.balance.semi === 'fail' ? '0点' : '未判定';
  l2.classList.toggle('done', s.balance.semi === 'pass');

  const l3 = document.getElementById('balance-res-label-3');
  l3.textContent = s.balance.tandem === 'pass10' ? '2点 (10秒)' : s.balance.tandem === 'pass3_9' ? '1点 (3-9秒)' : s.balance.tandem === 'fail3' ? '0点' : '未判定';
  l3.classList.toggle('done', s.balance.tandem === 'pass10' || s.balance.tandem === 'pass3_9');

  // 2. 4m歩行UI反映
  document.getElementById('sppb-score-gait').textContent = `${s.gait.score} / 4点`;
  document.getElementById('gait-val-1').textContent = s.gait[1] !== null ? `${s.gait[1].toFixed(2)}秒` : '--.--秒';
  document.getElementById('gait-val-2').textContent = s.gait[2] !== null ? `${s.gait[2].toFixed(2)}秒` : '--.--秒';

  // 10m歩行取り込みボタンの状態更新
  const btnImport10m = document.getElementById('btn-import-10m');
  const import10mText = document.getElementById('import-10m-text');
  const walkAdopt = getWalkAdoptionData('comfortable');

  if (walkAdopt) {
    btnImport10m.disabled = false;
    if (s.gait.isImported) {
      import10mText.innerHTML = `✅ 10m快適歩行（${walkAdopt.speed.toFixed(2)}m/s）から反映済`;
      btnImport10m.textContent = `🔄 10m歩行データを再取り込み`;
    } else {
      import10mText.innerHTML = `10m快適歩行（${walkAdopt.speed.toFixed(2)}m/s, ${walkAdopt.time.toFixed(2)}秒）のデータを利用可能`;
      btnImport10m.textContent = `🚶 10m歩行から4mタイムを取り込む`;
    }
  } else {
    btnImport10m.disabled = true;
    import10mText.innerHTML = `10m快適歩行が未測定です（測定後にワンタップ反映可能）`;
    btnImport10m.textContent = `🚶 10m歩行から4mタイムを取り込む`;
  }

  ['crit-gait-4', 'crit-gait-3', 'crit-gait-2', 'crit-gait-1'].forEach(id => {
    document.getElementById(id).classList.remove('highlight');
  });
  if (s.gait.score >= 1 && s.gait.score <= 4) {
    document.getElementById(`crit-gait-${s.gait.score}`).classList.add('highlight');
  }

  // 3. 5回椅子立ち上がりUI反映
  document.getElementById('sppb-score-chair').textContent = `${s.chair.score} / 4点`;
  ['crit-chair-4', 'crit-chair-3', 'crit-chair-2', 'crit-chair-1'].forEach(id => {
    document.getElementById(id).classList.remove('highlight');
  });
  if (s.chair.score >= 1 && s.chair.score <= 4) {
    document.getElementById(`crit-chair-${s.chair.score}`).classList.add('highlight');
  }

  updateSppbFeedback();
}

function updateChoiceButtons(type, currentVal) {
  document.querySelectorAll(`.sppb-choice-btn[data-balance="${type}"]`).forEach(btn => {
    const val = btn.getAttribute('data-val');
    btn.classList.toggle('active', val === currentVal);
  });
}

function updateSppbFeedback() {
  const s = appState.sppb;
  document.getElementById('fb-sppb-total-score').textContent = s.totalScore;
  document.getElementById('fb-score-balance').textContent = `${s.balance.score} / 4点`;
  const gaitSuffix = s.gait.isImported ? ` (10m換算 ${s.gait.adoptedTime ? s.gait.adoptedTime.toFixed(2) + '秒' : '未'})` : ` (${s.gait.adoptedTime ? s.gait.adoptedTime.toFixed(2) + '秒' : '未'})`;
  document.getElementById('fb-score-gait').textContent = `${s.gait.score} / 4点${gaitSuffix}`;
  document.getElementById('fb-score-chair').textContent = `${s.chair.score} / 4点 (${s.chair.time ? s.chair.time.toFixed(2) + '秒' : '未'})`;

  const gauge = document.querySelector('.sppb-total-gauge');
  const title = document.getElementById('fb-sppb-rank-title');
  const detail = document.getElementById('fb-sppb-rank-detail');
  const sample = document.getElementById('sppb-patient-talk-sample');

  gauge.classList.remove('moderate', 'severe');
  if (s.totalScore >= 10) {
    title.textContent = '良好（10〜12点）：自立維持群';
    title.style.color = '#059669';
    detail.textContent = '下肢筋力・バランスともに良好。フレイル・サルコペニアの該当なし。';
    sample.textContent = `「総合得点は${s.totalScore}点（12点満点）で、同年代と比べても足腰の力やバランス感覚が大変しっかりと保たれています。現在の良い運動習慣を今後も維持していきましょう。」`;
  } else if (s.totalScore >= 7) {
    gauge.classList.add('moderate');
    title.textContent = '中等度低下（7〜9点）：フレイル・サルコペニア疑い';
    title.style.color = '#d97706';
    detail.textContent = '国際ガイドライン（AWGS2019）における身体機能低下（9点以下）に該当。転倒予防介入が推奨されます。';
    sample.textContent = `「総合得点は${s.totalScore}点でした。立ったり歩いたりの基本動作は可能ですが、やや筋力やバランスの余力が少なくなっています。つまずきや転倒を防ぐための運動を一緒に始めていきましょう。」`;
  } else {
    gauge.classList.add('severe');
    title.textContent = '重度低下（0〜6点）：要介護高リスク群';
    title.style.color = '#dc2626';
    detail.textContent = '立ち座りや歩行に著しい制限あり。見守り・介助および環境調整が必要です。';
    sample.textContent = `「総合得点は${s.totalScore}点でした。立ち上がりや歩行の際にふらつきが出やすいため、ご自宅での移動や立ち上がり動作の安全面をしっかりサポートしながらリハビリを進めていきましょう。」`;
  }
}

function generateSppbChartText() {
  const s = appState.sppb;
  let txt = `【SPPB（高齢者身体機能バッテリー）】\n`;
  txt += `・合計得点: ${s.totalScore} / 12点\n`;

  // 1. バランス
  txt += `  1) バランステスト: ${s.balance.score}/4点\n`;
  txt += `     (閉脚: ${s.balance.side === 'pass' ? '10秒保持' : '不可'}, 半タンデム: ${s.balance.semi === 'pass' ? '10秒保持' : '不可'}, タンデム: ${s.balance.tandem === 'pass10' ? '10秒' : s.balance.tandem === 'pass3_9' ? '3-9秒' : '3秒未満'})\n`;

  // 2. 4m歩行
  txt += `  2) 4m歩行テスト: ${s.gait.score}/4点\n`;
  if (s.gait.adoptedTime) {
    const importNote = s.gait.isImported ? ` ※10m快適歩行(${s.gait.importedSpeed ? s.gait.importedSpeed.toFixed(2) + 'm/s' : ''})より4m換算` : '';
    const trial1Str = s.gait[1] !== null ? s.gait[1].toFixed(2) + 's' : '-';
    const trial2Str = s.gait[2] !== null ? s.gait[2].toFixed(2) + 's' : '-';
    txt += `     (採用タイム: ${s.gait.adoptedTime.toFixed(2)}秒 [1回目: ${trial1Str} / 2回目: ${trial2Str}]${importNote})\n`;
  } else if (s.gait.isUnable) {
    txt += `     (実施不能・歩行困難: 0点)\n`;
  } else {
    txt += `     (未測定)\n`;
  }

  // 3. 5回椅子立ち上がり
  txt += `  3) 5回椅子立ち上がり: ${s.chair.score}/4点\n`;
  if (s.chair.time) {
    txt += `     (タイム: ${s.chair.time.toFixed(2)}秒)\n`;
  } else if (!s.chair.precheck || s.chair.isUnable) {
    txt += `     (腕組み起立困難または実施不能: 0点)\n`;
  } else {
    txt += `     (未測定)\n`;
  }

  // 総合判定
  if (s.totalScore >= 10) txt += `・判定: 良好・自立群（サルコペニア非該当）`;
  else if (s.totalScore >= 7) txt += `・判定: 身体機能低下・フレイル/サルコペニア疑い域（AWGS2019基準: 9点以下）`;
  else txt += `・判定: 重度機能低下・要介護化/転倒ハイリスク群（6点以下）`;

  return txt;
}

function resetSppbData() {
  appState.sppb = {
    balance: { side: null, semi: null, tandem: null, score: 0 },
    gait: { slot: 1, 1: null, 2: null, isUnable: false, score: 0, isRunning: false, startTime: 0, elapsedTime: 0, timerInterval: null },
    chair: { precheck: true, time: null, isUnable: false, score: 0, isRunning: false, startTime: 0, elapsedTime: 0, timerInterval: null },
    totalScore: 0
  };
  document.getElementById('chair-manual-sec').value = '';
  document.getElementById('btn-precheck-yes').classList.add('active');
  document.getElementById('btn-precheck-no').classList.remove('active');
  updateSppbScore();
  updateSppbUI();
}

// ========================================================
// 共通カルテモーダル & コピー処理
// ========================================================
function setupCommonModalEvents() {
  const modal = document.getElementById('chart-preview-modal');
  const closeBtn = document.getElementById('modal-close-btn');
  const copyBtn = document.getElementById('modal-copy-btn');

  closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  copyBtn.addEventListener('click', () => {
    const text = document.getElementById('chart-text-output').value;
    copyToClipboard(text);
    modal.classList.add('hidden');
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });
}

function openChartModal(title, text) {
  document.getElementById('modal-chart-title').textContent = title;
  document.getElementById('chart-text-output').value = text;
  document.getElementById('chart-preview-modal').classList.remove('hidden');
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(showToast).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  showToast();
}

function showToast() {
  showToastCustom('カルテ用テキストをクリップボードにコピーしました！');
}

function showToastCustom(msg) {
  const t = document.getElementById('copy-toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => {
    t.classList.add('hidden');
    setTimeout(() => {
      t.textContent = 'カルテ用テキストをクリップボードにコピーしました！';
    }, 300);
  }, 2500);
}
