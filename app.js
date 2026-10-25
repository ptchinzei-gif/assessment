/**
 * RehaMetrics - 10m歩行テスト 計測・分析ロジック
 */

// --- 状態管理 ---
const state = {
  activeTab: 'measure',
  mode: 'comfortable', // 'comfortable' | 'maximum'
  trial: 1,           // 1 | 2
  isRunning: false,
  startTime: 0,
  elapsedTime: 0,
  timerInterval: null,
  soundEnabled: true,
  vibrateEnabled: true,
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
};

// --- 同年代平均基準値データベース (m/s) [日本老年医学会・健常高齢者歩行速度データ等準拠] ---
const BENCHMARKS = {
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

// --- Web Audio API による効果音再生（押し忘れ防止） ---
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// 開始音（ピッ：高音880Hz）
function playStartBeep() {
  if (!state.soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (e) {
    console.warn('Audio play failed', e);
  }
}

// 停止・完了音（ピピッ：2連音）
function playStopBeep() {
  if (!state.soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    
    // 1音目 (1046Hz, C6)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.frequency.setValueAtTime(1046, now);
    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.08);

    // 2音目 (1318Hz, E6)
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
    console.warn('Audio play failed', e);
  }
}

// 振動フィードバック
function triggerVibration(pattern) {
  if (!state.vibrateEnabled) return;
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      console.warn('Vibration failed', e);
    }
  }
}

// --- DOM要素の参照 ---
const dom = {
  tabs: document.querySelectorAll('.tab-btn'),
  tabPanes: document.querySelectorAll('.tab-pane'),
  soundToggleBtn: document.getElementById('sound-toggle-btn'),
  vibrateToggleBtn: document.getElementById('vibrate-toggle-btn'),
  resetAllBtn: document.getElementById('reset-all-btn'),
  modeComfortableBtn: document.getElementById('mode-comfortable'),
  modeMaximumBtn: document.getElementById('mode-maximum'),
  trial1Btn: document.getElementById('trial-1-btn'),
  trial2Btn: document.getElementById('trial-2-btn'),
  trial1Badge: document.getElementById('trial-1-badge'),
  trial2Badge: document.getElementById('trial-2-badge'),
  timerCard: document.getElementById('timer-touch-area'),
  timerStatusBadge: document.getElementById('timer-status-badge'),
  timerDisplay: document.getElementById('timer-display'),
  currentSpeed: document.getElementById('current-speed'),
  stepCountInput: document.getElementById('step-count-input'),
  btnStepMinus: document.getElementById('btn-step-minus'),
  btnStepPlus: document.getElementById('btn-step-plus'),
  summaryTitle: document.getElementById('summary-section-title'),
  btnClearCurrentMode: document.getElementById('btn-clear-current-mode'),
  // 1回目カード
  card1: document.getElementById('card-trial-1'),
  card1Status: document.getElementById('card-1-status'),
  card1Time: document.getElementById('card-1-time'),
  card1Speed: document.getElementById('card-1-speed'),
  card1Steps: document.getElementById('card-1-steps'),
  card1StepLength: document.getElementById('card-1-step-length'),
  // 2回目カード
  card2: document.getElementById('card-trial-2'),
  card2Status: document.getElementById('card-2-status'),
  card2Time: document.getElementById('card-2-time'),
  card2Speed: document.getElementById('card-2-speed'),
  card2Steps: document.getElementById('card-2-steps'),
  card2StepLength: document.getElementById('card-2-step-length'),
  // 採用値
  adoptionSummary: document.getElementById('adoption-summary'),
  quickCopyBtn: document.getElementById('quick-copy-btn'),
  copyToast: document.getElementById('copy-toast'),
  // フィードバック画面
  filterGender: document.getElementById('filter-gender'),
  filterAge: document.getElementById('filter-age'),
  meterComfVal: document.getElementById('meter-comf-val'),
  comfBarFill: document.getElementById('comf-bar-fill'),
  comfBenchmarkLine: document.getElementById('comf-benchmark-line'),
  comfBenchmarkText: document.getElementById('comf-benchmark-text'),
  comfEvalText: document.getElementById('comf-evaluation-text'),
  meterMaxVal: document.getElementById('meter-max-val'),
  maxBarFill: document.getElementById('max-bar-fill'),
  maxBenchmarkLine: document.getElementById('max-benchmark-line'),
  maxBenchmarkText: document.getElementById('max-benchmark-text'),
  maxEvalText: document.getElementById('max-evaluation-text'),
  patientTalkSample: document.getElementById('patient-talk-sample'),
  // モーダル
  chartModal: document.getElementById('chart-preview-modal'),
  modalCloseBtn: document.getElementById('modal-close-btn'),
  modalCopyBtn: document.getElementById('modal-copy-btn'),
  chartTextOutput: document.getElementById('chart-text-output')
};

// --- 初期化 ---
function init() {
  setupEventListeners();
  updateUI();
  updateFeedbackSection();
}

// --- イベントリスナー設定 ---
function setupEventListeners() {
  // タブ切り替え
  dom.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  // 音・振動のON/OFF
  dom.soundToggleBtn.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    dom.soundToggleBtn.classList.toggle('active', state.soundEnabled);
    dom.soundToggleBtn.classList.toggle('inactive', !state.soundEnabled);
    if (state.soundEnabled) playStartBeep();
  });

  dom.vibrateToggleBtn.addEventListener('click', () => {
    state.vibrateEnabled = !state.vibrateEnabled;
    dom.vibrateToggleBtn.classList.toggle('active', state.vibrateEnabled);
    dom.vibrateToggleBtn.classList.toggle('inactive', !state.vibrateEnabled);
    if (state.vibrateEnabled) triggerVibration(60);
  });

  // 全リセット
  dom.resetAllBtn.addEventListener('click', () => {
    if (confirm('すべての計測記録をリセットしますか？')) {
      resetAllData();
    }
  });

  // モード切替（快適 / 最大）
  dom.modeComfortableBtn.addEventListener('click', () => setMode('comfortable'));
  dom.modeMaximumBtn.addEventListener('click', () => setMode('maximum'));

  // 試行回数切替（1回目 / 2回目）
  dom.trial1Btn.addEventListener('click', () => setTrial(1));
  dom.trial2Btn.addEventListener('click', () => setTrial(2));

  // タイマー領域のタップ（計測開始 / 停止）
  dom.timerCard.addEventListener('click', toggleTimer);

  // 歩数入力コントロール
  dom.stepCountInput.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    saveStepCount(isNaN(val) ? null : val);
  });
  dom.btnStepMinus.addEventListener('click', () => adjustStepCount(-1));
  dom.btnStepPlus.addEventListener('click', () => adjustStepCount(1));

  // 現在のモードのクリア
  dom.btnClearCurrentMode.addEventListener('click', () => {
    const modeName = state.mode === 'comfortable' ? '快適歩行' : '最大歩行';
    if (confirm(`${modeName}の1回目・2回目の記録を消去しますか？`)) {
      state.records[state.mode][1] = { time: null, speed: null, steps: null, stepLength: null };
      state.records[state.mode][2] = { time: null, speed: null, steps: null, stepLength: null };
      state.trial = 1;
      updateUI();
      updateFeedbackSection();
    }
  });

  // カルテ用テキストコピー
  dom.quickCopyBtn.addEventListener('click', openChartModal);
  dom.modalCloseBtn.addEventListener('click', closeChartModal);
  dom.modalCopyBtn.addEventListener('click', copyChartText);
  dom.chartModal.addEventListener('click', (e) => {
    if (e.target === dom.chartModal) closeChartModal();
  });

  // 患者フィードバック用フィルター
  dom.filterGender.addEventListener('change', (e) => {
    state.patient.gender = e.target.value;
    updateFeedbackSection();
  });
  dom.filterAge.addEventListener('change', (e) => {
    state.patient.ageGroup = e.target.value;
    updateFeedbackSection();
  });
}

// --- タブ切り替え ---
function switchTab(tabId) {
  state.activeTab = tabId;
  dom.tabs.forEach(tab => {
    const isTarget = tab.getAttribute('data-tab') === tabId;
    tab.classList.toggle('active', isTarget);
    tab.setAttribute('aria-selected', isTarget);
  });
  dom.tabPanes.forEach(pane => {
    pane.classList.toggle('active', pane.id === `tab-${tabId}`);
  });
  if (tabId === 'feedback') {
    updateFeedbackSection();
  }
}

// --- モード切替 ---
function setMode(mode) {
  if (state.isRunning) return;
  state.mode = mode;
  dom.modeComfortableBtn.classList.toggle('active', mode === 'comfortable');
  dom.modeMaximumBtn.classList.toggle('active', mode === 'maximum');
  dom.summaryTitle.textContent = mode === 'comfortable' ? '快適歩行の記録' : '最大歩行の記録';
  
  // 1回目が未測定なら1回目、1回目済なら2回目を自動選択
  const cur = state.records[mode];
  if (cur[1].time === null) {
    state.trial = 1;
  } else if (cur[2].time === null) {
    state.trial = 2;
  }
  updateUI();
}

// --- 試行回数切替 ---
function setTrial(trialNum) {
  if (state.isRunning) return;
  state.trial = trialNum;
  updateUI();
}

// --- タイマー操作（計測・停止） ---
function toggleTimer() {
  if (!state.isRunning) {
    startTimer();
  } else {
    stopTimer();
  }
}

function startTimer() {
  state.isRunning = true;
  state.startTime = performance.now();
  state.elapsedTime = 0;

  // 開始フィードバック（音＆振動）
  playStartBeep();
  triggerVibration(80);

  // UI更新
  dom.timerCard.classList.add('running');
  dom.timerCard.classList.toggle('max-mode', state.mode === 'maximum');
  dom.timerStatusBadge.textContent = '計測中... タップで停止';

  // 10ms周期でタイマー表示更新
  state.timerInterval = setInterval(() => {
    const now = performance.now();
    state.elapsedTime = (now - state.startTime) / 1000;
    dom.timerDisplay.innerHTML = `${state.elapsedTime.toFixed(2)}<span class="timer-unit">秒</span>`;
    
    // リアルタイム速度目安
    if (state.elapsedTime > 0.5) {
      const spd = (10 / state.elapsedTime).toFixed(2);
      dom.currentSpeed.textContent = spd;
    }
  }, 30);
}

function stopTimer() {
  state.isRunning = false;
  clearInterval(state.timerInterval);

  // 終了フィードバック（音＆振動）
  playStopBeep();
  triggerVibration([80, 50, 120]);

  // UI更新
  dom.timerCard.classList.remove('running');
  dom.timerStatusBadge.textContent = '測定完了！';

  // 計測結果の保存 (10m歩行)
  const finalTime = Math.round(state.elapsedTime * 100) / 100;
  const speed = Math.round((10 / finalTime) * 100) / 100;

  const currentRecord = state.records[state.mode][state.trial];
  currentRecord.time = finalTime;
  currentRecord.speed = speed;

  // もし既に歩数が入力されていたら歩幅も再計算
  if (currentRecord.steps) {
    currentRecord.stepLength = Math.round((1000 / currentRecord.steps) * 10) / 10;
  }

  // 1回目の計測が終わった場合、自動的に2回目をセット（未測定の場合）
  if (state.trial === 1 && state.records[state.mode][2].time === null) {
    setTimeout(() => {
      state.trial = 2;
      updateUI();
    }, 700);
  }

  updateUI();
  updateFeedbackSection();
}

// --- 歩数の調整 ---
function adjustStepCount(delta) {
  let cur = parseInt(dom.stepCountInput.value, 10);
  if (isNaN(cur)) cur = 0;
  const next = Math.max(0, cur + delta);
  dom.stepCountInput.value = next === 0 ? '' : next;
  saveStepCount(next === 0 ? null : next);
}

function saveStepCount(steps) {
  const currentRecord = state.records[state.mode][state.trial];
  currentRecord.steps = steps;
  if (steps && currentRecord.time) {
    currentRecord.stepLength = Math.round((1000 / steps) * 10) / 10; // cm
  } else {
    currentRecord.stepLength = null;
  }
  updateRecordCards();
  updateFeedbackSection();
}

// --- UI全般の更新 ---
function updateUI() {
  // 試行セレクタ
  dom.trial1Btn.classList.toggle('active', state.trial === 1);
  dom.trial2Btn.classList.toggle('active', state.trial === 2);

  const curModeRecords = state.records[state.mode];
  
  // バッジ更新
  dom.trial1Badge.textContent = curModeRecords[1].time !== null ? `${curModeRecords[1].time.toFixed(2)}s` : '未測定';
  dom.trial1Badge.classList.toggle('done', curModeRecords[1].time !== null);

  dom.trial2Badge.textContent = curModeRecords[2].time !== null ? `${curModeRecords[2].time.toFixed(2)}s` : '未測定';
  dom.trial2Badge.classList.toggle('done', curModeRecords[2].time !== null);

  // タイマー表示（現在選択されている試行の記録）
  const activeRecord = curModeRecords[state.trial];
  if (!state.isRunning) {
    if (activeRecord.time !== null) {
      dom.timerDisplay.innerHTML = `${activeRecord.time.toFixed(2)}<span class="timer-unit">秒</span>`;
      dom.currentSpeed.textContent = activeRecord.speed.toFixed(2);
      dom.timerStatusBadge.textContent = `第${state.trial}回 記録済（タップで再測定）`;
    } else {
      dom.timerDisplay.innerHTML = `00.00<span class="timer-unit">秒</span>`;
      dom.currentSpeed.textContent = '-';
      dom.timerStatusBadge.textContent = `第${state.trial}回 タップして開始`;
    }
    // 歩数フィールドの同期
    dom.stepCountInput.value = activeRecord.steps !== null ? activeRecord.steps : '';
  }

  updateRecordCards();
}

// --- 記録カード（1回目・2回目）の描画更新 ---
function updateRecordCards() {
  const cur = state.records[state.mode];

  // カードのアクティブ枠
  dom.card1.classList.toggle('active', state.trial === 1);
  dom.card2.classList.toggle('active', state.trial === 2);

  // 1回目
  renderCard(dom.card1Status, dom.card1Time, dom.card1Speed, dom.card1Steps, dom.card1StepLength, cur[1]);
  // 2回目
  renderCard(dom.card2Status, dom.card2Time, dom.card2Speed, dom.card2Steps, dom.card2StepLength, cur[2]);

  // 採用値サマリー
  renderAdoptionSummary();
}

function renderCard(elStatus, elTime, elSpeed, elSteps, elStepLength, record) {
  if (record.time !== null) {
    elStatus.textContent = '記録済';
    elStatus.classList.add('recorded');
    elTime.innerHTML = `${record.time.toFixed(2)}<small>秒</small>`;
    elSpeed.textContent = record.speed.toFixed(2);
    elSteps.textContent = record.steps !== null ? record.steps : '--';
    elStepLength.textContent = record.stepLength !== null ? record.stepLength : '--';
  } else {
    elStatus.textContent = '未測定';
    elStatus.classList.remove('recorded');
    elTime.innerHTML = `--.--<small>秒</small>`;
    elSpeed.textContent = '--';
    elSteps.textContent = '--';
    elStepLength.textContent = '--';
  }
}

// --- 採用値（平均値 / 最速値）の算出 ---
function getAdoptionData(mode) {
  const r1 = state.records[mode][1];
  const r2 = state.records[mode][2];

  if (r1.time === null && r2.time === null) return null;
  if (r1.time !== null && r2.time === null) return { ...r1, type: '1回目のみ' };
  if (r1.time === null && r2.time !== null) return { ...r2, type: '2回目のみ' };

  // 2回測定済みの場合
  const avgTime = Math.round(((r1.time + r2.time) / 2) * 100) / 100;
  const avgSpeed = Math.round(((r1.speed + r2.speed) / 2) * 100) / 100;
  const bestSpeed = Math.max(r1.speed, r2.speed);
  
  let avgSteps = null;
  let avgStepLength = null;
  if (r1.steps !== null && r2.steps !== null) {
    avgSteps = Math.round((r1.steps + r2.steps) / 2);
    avgStepLength = Math.round(((r1.stepLength + r2.stepLength) / 2) * 10) / 10;
  }

  return {
    time: avgTime,
    speed: avgSpeed,
    bestSpeed: bestSpeed,
    steps: avgSteps,
    stepLength: avgStepLength,
    type: '2回平均'
  };
}

function renderAdoptionSummary() {
  const data = getAdoptionData(state.mode);
  if (!data) {
    dom.adoptionSummary.textContent = '2回計測すると平均値・採用データが自動計算されます';
    return;
  }
  if (data.type === '2回平均') {
    dom.adoptionSummary.innerHTML = `平均速度: <strong>${data.speed.toFixed(2)} m/s</strong> (平均時間: ${data.time.toFixed(2)}秒 / 最速: ${data.bestSpeed.toFixed(2)}m/s)`;
  } else {
    dom.adoptionSummary.innerHTML = `測定値: <strong>${data.speed.toFixed(2)} m/s</strong> (${data.time.toFixed(2)}秒)`;
  }
}

// --- 患者フィードバック＆同年代平均比較 ---
function updateFeedbackSection() {
  const gender = state.patient.gender;
  const ageGroup = state.patient.ageGroup;
  const benchmark = BENCHMARKS[gender][ageGroup];

  // 快適歩行の採用値
  const comfData = getAdoptionData('comfortable');
  // 最大歩行の採用値
  const maxData = getAdoptionData('maximum');

  // 快適歩行メーター
  dom.comfBenchmarkText.textContent = `同年代平均: ${benchmark.comf} m/s`;
  // バーの基準線位置 (0〜2.0 m/s の範囲でパーセンテージ化)
  const comfBenchPercent = Math.min(100, Math.max(0, (benchmark.comf / 2.0) * 100));
  dom.comfBenchmarkLine.style.left = `${comfBenchPercent}%`;

  if (comfData) {
    dom.meterComfVal.textContent = `${comfData.speed.toFixed(2)} m/s`;
    const fillPercent = Math.min(100, Math.max(0, (comfData.speed / 2.0) * 100));
    dom.comfBarFill.style.width = `${fillPercent}%`;

    // 評価テキスト
    const diff = comfData.speed - benchmark.comf;
    if (diff >= 0.1) {
      dom.comfEvalText.innerHTML = `🌟 同年代平均を上回る良好な歩行ペースです（+${diff.toFixed(2)} m/s）`;
      dom.comfEvalText.style.background = '#ecfdf5';
      dom.comfEvalText.style.color = '#065f46';
    } else if (diff >= -0.15) {
      dom.comfEvalText.innerHTML = `✅ 同年代の平均と同等レベルの安定したペースです`;
      dom.comfEvalText.style.background = '#eff6ff';
      dom.comfEvalText.style.color = '#1e40af';
    } else if (comfData.speed < 0.8) {
      dom.comfEvalText.innerHTML = `⚠️ 0.8m/s未満: 屋外歩行での転倒・移動困難リスクが高い状態です`;
      dom.comfEvalText.style.background = '#fee2e2';
      dom.comfEvalText.style.color = '#991b1b';
    } else {
      dom.comfEvalText.innerHTML = `ℹ️ 同年代平均よりやや緩やかなペースです（-${Math.abs(diff).toFixed(2)} m/s）`;
      dom.comfEvalText.style.background = '#fef3c7';
      dom.comfEvalText.style.color = '#92400e';
    }
  } else {
    dom.meterComfVal.textContent = '未測定';
    dom.comfBarFill.style.width = '0%';
    dom.comfEvalText.textContent = '快適歩行を計測すると判定が表示されます';
    dom.comfEvalText.style.background = '#f1f5f9';
    dom.comfEvalText.style.color = '#64748b';
  }

  // 最大歩行メーター
  dom.maxBenchmarkText.textContent = `同年代平均: ${benchmark.max} m/s`;
  const maxBenchPercent = Math.min(100, Math.max(0, (benchmark.max / 2.5) * 100));
  dom.maxBenchmarkLine.style.left = `${maxBenchPercent}%`;

  if (maxData) {
    dom.meterMaxVal.textContent = `${maxData.speed.toFixed(2)} m/s`;
    const fillPercent = Math.min(100, Math.max(0, (maxData.speed / 2.5) * 100));
    dom.maxBarFill.style.width = `${fillPercent}%`;

    const diff = maxData.speed - benchmark.max;
    if (diff >= 0.1) {
      dom.maxEvalText.innerHTML = `⚡ 最大歩行の余力（予備能）が十分に保持されています`;
      dom.maxEvalText.style.background = '#ecfdf5';
      dom.maxEvalText.style.color = '#065f46';
    } else if (diff >= -0.2) {
      dom.maxEvalText.innerHTML = `✅ 最大速度の切り替えがスムーズに行えています`;
      dom.maxEvalText.style.background = '#eff6ff';
      dom.maxEvalText.style.color = '#1e40af';
    } else {
      dom.maxEvalText.innerHTML = `⚠️ 速度切り替えの予備能がやや低下しています`;
      dom.maxEvalText.style.background = '#fef3c7';
      dom.maxEvalText.style.color = '#92400e';
    }
  } else {
    dom.meterMaxVal.textContent = '未測定';
    dom.maxBarFill.style.width = '0%';
    dom.maxEvalText.textContent = '最大歩行を計測すると判定が表示されます';
    dom.maxEvalText.style.background = '#f1f5f9';
    dom.maxEvalText.style.color = '#64748b';
  }

  // 患者さん向けアドバイス例文の更新
  generatePatientAdvice(comfData, maxData, benchmark);
}

function generatePatientAdvice(comf, max, benchmark) {
  if (!comf && !max) {
    dom.patientTalkSample.textContent = '測定を行うと、患者さんにそのままお伝えできる分かりやすい説明例がここに表示されます。';
    return;
  }

  let text = '';
  if (comf) {
    if (comf.speed >= benchmark.comf) {
      text += `「普段の速さの測定では ${comf.speed.toFixed(2)}m/秒 と、同年代の平均（${benchmark.comf}m/秒）を上回るしっかりしたペースで歩けています。`;
    } else if (comf.speed >= 1.0) {
      text += `「普段の速さは ${comf.speed.toFixed(2)}m/秒 でした。青信号（1.0m/秒目安）を渡りきれる十分な速度をしっかり保てています。`;
    } else {
      text += `「普段の速さは ${comf.speed.toFixed(2)}m/秒 でした。少し歩幅を意識して、安全なペースを維持しながら足腰を鍛えていきましょう。`;
    }
  }
  if (max) {
    if (max.speed >= comf?.speed * 1.25) {
      text += ` 急ぎ足のときもしっかりスピードを上げて歩く余力がありますよ。」`;
    } else {
      text += ` 安全第一でふらつきに気をつけながら進めていきましょう。」`;
    }
  } else {
    text += `」`;
  }

  dom.patientTalkSample.textContent = text;
}

// --- カルテ用テキスト自動生成 ---
function generateChartText() {
  const comf1 = state.records.comfortable[1];
  const comf2 = state.records.comfortable[2];
  const comfAdoption = getAdoptionData('comfortable');

  const max1 = state.records.maximum[1];
  const max2 = state.records.maximum[2];
  const maxAdoption = getAdoptionData('maximum');

  const genderStr = state.patient.gender === 'male' ? '男性' : '女性';
  const ageStr = state.patient.ageGroup === 'young' ? '一般' : `${state.patient.ageGroup}代`;
  const bench = BENCHMARKS[state.patient.gender][state.patient.ageGroup];

  let text = `【10m歩行テスト】\n`;

  // 快適歩行
  if (comfAdoption) {
    text += `・快適歩行: ${comfAdoption.speed.toFixed(2)} m/s (${comfAdoption.time.toFixed(2)}秒)\n`;
    text += `  [詳細] 1回目: ${formatTrialString(comf1)} / 2回目: ${formatTrialString(comf2)}\n`;
    if (comfAdoption.steps) {
      text += `  [歩容] 平均歩数: ${comfAdoption.steps}歩, 平均歩幅: ${comfAdoption.stepLength}cm\n`;
    }
  } else {
    text += `・快適歩行: 未実施\n`;
  }

  // 最大歩行
  if (maxAdoption) {
    text += `・最大歩行: ${maxAdoption.speed.toFixed(2)} m/s (${maxAdoption.time.toFixed(2)}秒)\n`;
    text += `  [詳細] 1回目: ${formatTrialString(max1)} / 2回目: ${formatTrialString(max2)}\n`;
    if (maxAdoption.steps) {
      text += `  [歩容] 平均歩数: ${maxAdoption.steps}歩, 平均歩幅: ${maxAdoption.stepLength}cm\n`;
    }
  } else {
    text += `・最大歩行: 未実施\n`;
  }

  // 評価比較
  text += `・基準値比較: ${ageStr}${genderStr}平均(快適 ${bench.comf}m/s, 最大 ${bench.max}m/s)\n`;
  if (comfAdoption) {
    if (comfAdoption.speed >= 1.0) {
      text += `  判定: 屋外自立レベル・信号横断可能域（速度維持）`;
    } else if (comfAdoption.speed >= 0.8) {
      text += `  判定: 軽度歩行制限・転倒リスク要観察（1.0m/s未満）`;
    } else {
      text += `  判定: 歩行機能低下・屋外移動要介助リスク高（0.8m/s未満）`;
    }
  }

  return text;
}

function formatTrialString(trial) {
  if (trial.time === null) return '未';
  let str = `${trial.time.toFixed(2)}s(${trial.speed.toFixed(2)}m/s)`;
  if (trial.steps) str += `,${trial.steps}歩`;
  return str;
}

// --- モーダル制御 & コピー処理 ---
function openChartModal() {
  const text = generateChartText();
  dom.chartTextOutput.value = text;
  dom.chartModal.classList.remove('hidden');
}

function closeChartModal() {
  dom.chartModal.classList.add('hidden');
}

function copyChartText() {
  const text = dom.chartTextOutput.value;
  copyToClipboard(text);
  closeChartModal();
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast();
    }).catch(() => {
      fallbackCopy(text);
    });
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
  dom.copyToast.classList.remove('hidden');
  setTimeout(() => {
    dom.copyToast.classList.add('hidden');
  }, 2500);
}

// --- 全データリセット ---
function resetAllData() {
  state.records = {
    comfortable: {
      1: { time: null, speed: null, steps: null, stepLength: null },
      2: { time: null, speed: null, steps: null, stepLength: null }
    },
    maximum: {
      1: { time: null, speed: null, steps: null, stepLength: null },
      2: { time: null, speed: null, steps: null, stepLength: null }
    }
  };
  state.trial = 1;
  state.elapsedTime = 0;
  updateUI();
  updateFeedbackSection();
}

// 起動
document.addEventListener('DOMContentLoaded', init);
