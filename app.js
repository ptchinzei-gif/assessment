// ========================================================
    // 状態管理 (State)
    // ========================================================
    const appState = {
      currentAssessment: 'walk10m',
      soundEnabled: true,
      vibrateEnabled: true,

      walk: {
        mode: 'comfortable',
        trial: 1,
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

      sppb: {
        balance: {
          side: null,
          semi: null,
          tandem: null,
          score: 0
        },
        gait: {
          slot: 1,
          1: null,
          2: null,
          isUnable: false,
          isImported: false,
          importedSpeed: null,
          score: 0,
          isRunning: false,
          startTime: 0,
          elapsedTime: 0,
          timerInterval: null
        },
        chair: {
          precheck: true,
          time: null,
          isUnable: false,
          score: 0,
          isRunning: false,
          startTime: 0,
          elapsedTime: 0,
          timerInterval: null
        },
        totalScore: 0
      },

      bbs: {
        scores: {
          1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null,
          8: null, 9: null, 10: null, 11: null, 12: null, 13: null, 14: null
        },
        totalScore: 0,
        completedCount: 0,
        timers: {}
      },

      exercise: {
        age: 70,
        restHr: 72,
        hasBetaBlocker: false,
        modality: 'walk', // 'walk' | 'bike'
        formula: 'tanaka', // 'tanaka' | 'standard' | 'brawner' | 'keteyian'
        hrMax: 159,
        hrr: 87,
        hrrModerate: { min: 107, max: 124 },
        hrrHigh: { min: 125, max: 142 },
        hrMaxModerate: { min: 103, max: 119 },
        hrMaxHigh: { min: 120, max: 142 },
        last10sPulse: null
      }
    };

    // BBS 14項目 マスターデータ規程
    const BBS_ITEMS = [
      {
        id: 1,
        title: "1. 座位から立位",
        desc: "指示:「手を使わずに立ってみてください」",
        options: [
          { score: 4, text: "4点: 手を使わずに自立して立てる" },
          { score: 3, text: "3点: 手を使って自立して立てる" },
          { score: 2, text: "2点: 数回の試みで手を使って立てる" },
          { score: 1, text: "1点: 立つために最小限の介助が必要" },
          { score: 0, text: "0点: 中等度〜最大の介助が必要" }
        ]
      },
      {
        id: 2,
        title: "2. 支持なし立位保持（2分間）",
        desc: "指示:「何にもつかまらずに2分間安全に立っていてください」",
        hasTimer: true,
        targetSec: 120,
        options: [
          { score: 4, text: "4点: 2分間安全に立ち続けられる" },
          { score: 3, text: "3点: 見守りで2分間立ち続けられる" },
          { score: 2, text: "2点: つかまらずに30秒間立てる" },
          { score: 1, text: "1点: 数回の試みで30秒間立てる" },
          { score: 0, text: "0点: つかまらずに30秒間立てない" }
        ]
      },
      {
        id: 3,
        title: "3. 背もたれなし座位（足底接地2分間）",
        desc: "指示:「腕を組んで背もたれから離れて2分間座っていてください」",
        hasTimer: true,
        targetSec: 120,
        options: [
          { score: 4, text: "4点: 2分間安全に座っていられる" },
          { score: 3, text: "3点: 見守りで2分間座っていられる" },
          { score: 2, text: "2点: 30秒間座っていられる" },
          { score: 1, text: "1点: 10秒間座っていられる" },
          { score: 0, text: "0点: 支えなしで10秒間座っていられない" }
        ]
      },
      {
        id: 4,
        title: "4. 立位から着座",
        desc: "指示:「椅子に座ってください」",
        options: [
          { score: 4, text: "4点: 手をほとんど使わずに安全に着座" },
          { score: 3, text: "3点: 手でゆっくり動作をコントロールして着座" },
          { score: 2, text: "2点: 椅子のヘリに足を当てて降下を制御" },
          { score: 1, text: "1点: ひとりで座れるがドスンと落ちる" },
          { score: 0, text: "0点: 座るために介助が必要" }
        ]
      },
      {
        id: 5,
        title: "5. 移乗（椅子間・ベッド間）",
        desc: "指示:「肘掛けのある椅子とない椅子の間を移動してください」",
        options: [
          { score: 4, text: "4点: 手をほとんど使わずに安全に移乗できる" },
          { score: 3, text: "3点: 手をしっかり使えば安全に移乗できる" },
          { score: 2, text: "2点: 声かけや見守りがあれば移乗できる" },
          { score: 1, text: "1点: 1名の介助が必要" },
          { score: 0, text: "0点: 2名の介助または機械介助が必要" }
        ]
      },
      {
        id: 6,
        title: "6. 閉眼立位（支持なし10秒間）",
        desc: "指示:「目を閉じて10秒間じっと立っていてください」",
        hasTimer: true,
        targetSec: 10,
        options: [
          { score: 4, text: "4点: 目を閉じて10秒間安全に保持できる" },
          { score: 3, text: "3点: 見守りがあれば10秒間保持できる" },
          { score: 2, text: "2点: 3秒間保持できる" },
          { score: 1, text: "1点: 3秒保持できないが目を閉じていられる" },
          { score: 0, text: "0点: 倒れないように介助が必要" }
        ]
      },
      {
        id: 7,
        title: "7. 閉脚立位（両足を揃えて1分間）",
        desc: "指示:「両足をくっつけて1分間立っていてください」",
        hasTimer: true,
        targetSec: 60,
        options: [
          { score: 4, text: "4点: 両足を揃えて安全に1分間立てる" },
          { score: 3, text: "3点: 見守りで両足を揃えて1分間立てる" },
          { score: 2, text: "2点: 自力で揃えられるが30秒間保持" },
          { score: 1, text: "1点: 足を揃える手助けが必要だが15秒保持" },
          { score: 0, text: "0点: 介助が必要で15秒間保持できない" }
        ]
      },
      {
        id: 8,
        title: "8. 上肢前方リーチ（25cm以上）",
        desc: "指示:「腕を前に伸ばし、指先をできるだけ遠くまで伸ばしてください」",
        options: [
          { score: 4, text: "4点: 25cm以上前に伸ばせる" },
          { score: 3, text: "3点: 12.5cm以上前に伸ばせる" },
          { score: 2, text: "2点: 5cm以上前に伸ばせる" },
          { score: 1, text: "1点: 前に伸ばせるが5cm未満/見守りが必要" },
          { score: 0, text: "0点: 前に伸ばそうとすると倒れそうになる" }
        ]
      },
      {
        id: 9,
        title: "9. 床の物を拾う",
        desc: "指示:「足元の前にあるスリッパ/物を拾ってください」",
        options: [
          { score: 4, text: "4点: 容易に安全に物を拾える" },
          { score: 3, text: "3点: 拾えるが見守りが必要" },
          { score: 2, text: "2点: 拾えないが物から2〜5cmまで手が届く" },
          { score: 1, text: "1点: 拾おうとするとバランスを崩す/見守り" },
          { score: 0, text: "0点: 試みられない/介助が必要" }
        ]
      },
      {
        id: 10,
        title: "10. 左右を振り返る",
        desc: "指示:「右肩、左肩の向こうを順番に後ろまで振り返ってください」",
        options: [
          { score: 4, text: "4点: 両側ともしっかり振り返り体重移動も良好" },
          { score: 3, text: "3点: 片側だけしっかり振り返れる" },
          { score: 2, text: "2点: 横を見る程度しか振り返れない" },
          { score: 1, text: "1点: 振り返るときに見守りが必要" },
          { score: 0, text: "0点: 倒れないように介助が必要" }
        ]
      },
      {
        id: 11,
        title: "11. 360度方向転換（1回転）",
        desc: "指示:「その場でぐるっと1回転して止まり、反対にも回ってください」",
        hasTimer: true,
        targetSec: 4,
        options: [
          { score: 4, text: "4点: 各方向4秒以内で安全に1回転できる" },
          { score: 3, text: "3点: 片方向のみ4秒以内で1回転できる" },
          { score: 2, text: "2点: 安全だが4秒以上ゆっくりかかる" },
          { score: 1, text: "1点: 回るときに近くで見守りが必要" },
          { score: 0, text: "0点: 回転に介助が必要" }
        ]
      },
      {
        id: 12,
        title: "12. 段差・踏み台への足踏み（計8回）",
        desc: "指示:「台の上に足を交互に片足ずつ乗せて下ろしてください（計8回）」",
        hasTimer: true,
        targetSec: 20,
        options: [
          { score: 4, text: "4点: 20秒以内に安全に8回完了できる" },
          { score: 3, text: "3点: 20秒以上かけて安全に8回完了できる" },
          { score: 2, text: "2点: 見守りなしで4回完了できる" },
          { score: 1, text: "1点: 最小限の介助で2回以上できる" },
          { score: 0, text: "0点: 転倒防止の介助が必要" }
        ]
      },
      {
        id: 13,
        title: "13. タンデム立位（一直線のつぎ足で30秒）",
        desc: "指示:「片足をもう片方の足の真ん前につけて30秒間立ってください」",
        hasTimer: true,
        targetSec: 30,
        options: [
          { score: 4, text: "4点: つぎ足で30秒間自立して立てる" },
          { score: 3, text: "3点: 少し前足をずらせば30秒間立てる" },
          { score: 2, text: "2点: 小さな歩幅なら30秒間立てる" },
          { score: 1, text: "1点: 足の位置づけ介助があれば15秒立てる" },
          { score: 0, text: "0点: 踏み出すとバランスを崩す" }
        ]
      },
      {
        id: 14,
        title: "14. 片脚立位（支持なし10秒間）",
        desc: "指示:「何にもつかまらずに片足で10秒間立ってください」",
        hasTimer: true,
        targetSec: 10,
        options: [
          { score: 4, text: "4点: 自立して片脚で10秒以上立てる" },
          { score: 3, text: "3点: 自立して片脚で5〜9秒間立てる" },
          { score: 2, text: "2点: 自立して片脚で3〜4秒間立てる" },
          { score: 1, text: "1点: 試みるが3秒未満で足を着く" },
          { score: 0, text: "0点: 試みられない/介助が必要" }
        ]
      }
    ];

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

    // --------------------------------------------------------
    // イベント初期化
    // --------------------------------------------------------
    function initApp() {
      setupHeaderEvents();
      setupWalk10mEvents();
      setupSppbEvents();
      setupBbsEvents();
      setupExerciseEvents();
      setupWnwEvents();
      setupCommonModalEvents();

      updateWalkUI();
      updateWalkFeedback();
      updateSppbUI();
      updateBbsUI();
      updateExerciseUI();
      initWnwState();
      updateWnwScreeningUI();
      updateWnw6mwtTargets();
      updateWnwSessionUI();
      console.log('RehaMetrics: 準備完了');
    }

    function setupHeaderEvents() {
      const assessmentSelect = document.getElementById('assessment-select');
      assessmentSelect.addEventListener('change', (e) => {
        switchAssessment(e.target.value);
      });

      const soundBtn = document.getElementById('sound-toggle-btn');
      soundBtn.addEventListener('click', () => {
        appState.soundEnabled = !appState.soundEnabled;
        soundBtn.classList.toggle('active', appState.soundEnabled);
        soundBtn.classList.toggle('inactive', !appState.soundEnabled);
        if (appState.soundEnabled) playStartBeep();
      });

      const vibrateBtn = document.getElementById('vibrate-toggle-btn');
      vibrateBtn.addEventListener('click', () => {
        appState.vibrateEnabled = !appState.vibrateEnabled;
        vibrateBtn.classList.toggle('active', appState.vibrateEnabled);
        vibrateBtn.classList.toggle('inactive', !appState.vibrateEnabled);
        if (appState.vibrateEnabled) triggerVibration(60);
      });

      const resetBtn = document.getElementById('reset-all-btn');
      resetBtn.addEventListener('click', () => {
        if (appState.currentAssessment === 'walk10m') {
          if (confirm('10m歩行テストの全記録をリセットしますか？')) {
            resetWalkData();
          }
        } else if (appState.currentAssessment === 'sppb') {
          if (confirm('SPPBの全記録をリセットしますか？')) {
            resetSppbData();
          }
        } else if (appState.currentAssessment === 'bbs') {
          if (confirm('BBSの全記録をリセットしますか？')) {
            resetBbsData();
          }
        } else if (appState.currentAssessment === 'exercise') {
          if (confirm('運動負荷設定の入力を初期値に戻しますか？')) {
            resetExerciseData();
          }
        }
        else if (appState.currentAssessment === 'wnw') {
          if (confirm('Walk \'n Watch プロトコルの入力を初期値に戻しますか？')) {
            resetWnwData();
          }
        }
      });

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
            if (targetTabId === 'bbs-feedback') updateBbsFeedback();
          });
        });
      });
    }

    function switchAssessment(assessmentId) {
      appState.currentAssessment = assessmentId;
      document.getElementById('view-walk10m').classList.toggle('active', assessmentId === 'walk10m');
      document.getElementById('view-sppb').classList.toggle('active', assessmentId === 'sppb');
      document.getElementById('view-bbs').classList.toggle('active', assessmentId === 'bbs');
      document.getElementById('view-exercise').classList.toggle('active', assessmentId === 'exercise');
      document.getElementById('view-wnw').classList.toggle('active', assessmentId === 'wnw');
      if (assessmentId === 'wnw') {
        updateWnwScreeningUI();
        updateWnw6mwtTargets();
        updateWnwSessionUI();
      }
      if (assessmentId === 'sppb') {
        updateSppbUI();
      }
      if (assessmentId === 'bbs') {
        updateBbsUI();
      }
      if (assessmentId === 'exercise') {
        updateExerciseUI();
      }
    }

    // --------------------------------------------------------
    // 10m歩行テスト
    // --------------------------------------------------------
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

      document.getElementById('card-trial-1').classList.toggle('active', w.trial === 1);
      document.getElementById('card-trial-2').classList.toggle('active', w.trial === 2);
      renderWalkCard('card-1', curMode[1]);
      renderWalkCard('card-2', curMode[2]);

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

    // --------------------------------------------------------
    // SPPB モジュール
    // --------------------------------------------------------
    function setupSppbEvents() {
      document.querySelectorAll('.sppb-choice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const type = btn.getAttribute('data-balance');
          const val = btn.getAttribute('data-val');
          handleBalanceChoice(type, val);
        });
      });

      const gaitTimer = document.getElementById('gait-timer-area');
      gaitTimer.addEventListener('click', toggleGaitTimer);

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

      document.getElementById('sppb-quick-copy-btn').addEventListener('click', () => {
        openChartModal('【SPPB】カルテ転記', generateSppbChartText());
      });
    }

    function handleBalanceChoice(type, val) {
      const b = appState.sppb.balance;
      b[type] = val;

      if (type === 'side' && val === 'fail') {
        b.semi = 'fail';
        b.tandem = 'fail3';
      }
      if (type === 'semi' && val === 'fail') {
        b.tandem = 'fail3';
      }

      updateSppbScore();
      updateSppbUI();
    }

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

      if (comf1.speed) {
        g[1] = Math.round((4 / comf1.speed) * 100) / 100;
      } else if (adopt.speed) {
        g[1] = Math.round((4 / adopt.speed) * 100) / 100;
      }

      if (comf2.speed) {
        g[2] = Math.round((4 / comf2.speed) * 100) / 100;
      } else {
        g[2] = null;
      }

      updateSppbScore();
      updateSppbUI();
      showToastCustom(`10m快適歩行（${adopt.speed.toFixed(2)}m/s）から4m換算タイムを取り込みました！`);
    }

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

        if (g.slot === 1 && g[2] === null) {
          setTimeout(() => setGaitSlot(2), 700);
        }

        updateSppbScore();
        updateSppbUI();
      }
    }

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

    function updateSppbScore() {
      const s = appState.sppb;

      let bScore = 0;
      if (s.balance.side === 'pass') bScore += 1;
      if (s.balance.semi === 'pass') bScore += 1;
      if (s.balance.tandem === 'pass10') bScore += 2;
      else if (s.balance.tandem === 'pass3_9') bScore += 1;
      s.balance.score = bScore;

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

      s.totalScore = bScore + gScore + cScore;
    }

    function updateSppbUI() {
      const s = appState.sppb;

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

      document.getElementById('sppb-score-gait').textContent = `${s.gait.score} / 4点`;
      document.getElementById('gait-val-1').textContent = s.gait[1] !== null ? `${s.gait[1].toFixed(2)}秒` : '--.--秒';
      document.getElementById('gait-val-2').textContent = s.gait[2] !== null ? `${s.gait[2].toFixed(2)}秒` : '--.--秒';

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

      txt += `  1) バランステスト: ${s.balance.score}/4点\n`;
      txt += `     (閉脚: ${s.balance.side === 'pass' ? '10秒保持' : '不可'}, 半タンデム: ${s.balance.semi === 'pass' ? '10秒保持' : '不可'}, タンデム: ${s.balance.tandem === 'pass10' ? '10秒' : s.balance.tandem === 'pass3_9' ? '3-9秒' : '3秒未満'})\n`;

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

      txt += `  3) 5回椅子立ち上がり: ${s.chair.score}/4点\n`;
      if (s.chair.time) {
        txt += `     (タイム: ${s.chair.time.toFixed(2)}秒)\n`;
      } else if (!s.chair.precheck || s.chair.isUnable) {
        txt += `     (腕組み起立困難または実施不能: 0点)\n`;
      } else {
        txt += `     (未測定)\n`;
      }

      if (s.totalScore >= 10) txt += `・判定: 良好・自立群（サルコペニア非該当）`;
      else if (s.totalScore >= 7) txt += `・判定: 身体機能低下・フレイル/サルコペニア疑い域（AWGS2019基準: 9点以下）`;
      else txt += `・判定: 重度機能低下・要介護化/転倒ハイリスク群（6点以下）`;

      return txt;
    }

    function resetSppbData() {
      appState.sppb = {
        balance: { side: null, semi: null, tandem: null, score: 0 },
        gait: { slot: 1, 1: null, 2: null, isUnable: false, isImported: false, importedSpeed: null, score: 0, isRunning: false, startTime: 0, elapsedTime: 0, timerInterval: null },
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
    // BBS（バーグ・バランス・スケール）モジュール
    // ========================================================
    function setupBbsEvents() {
      renderBbsItems();

      const clearBtn = document.getElementById('btn-clear-bbs');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          if (confirm('BBSの全記録をリセットしますか？')) {
            resetBbsData();
          }
        });
      }

      const copyBtn = document.getElementById('bbs-quick-copy-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          openChartModal('【BBS】カルテ転記', generateBbsChartText());
        });
      }
    }

    // 14項目のカードを描画
    function renderBbsItems() {
      const container = document.getElementById('bbs-items-container');
      if (!container) return;

      container.innerHTML = '';
      BBS_ITEMS.forEach(item => {
        const card = document.createElement('div');
        card.className = 'bbs-item-card';
        card.id = `bbs-card-${item.id}`;

        const currentScore = appState.bbs.scores[item.id];
        const scoreLabel = currentScore !== null ? `${currentScore}点` : '未';
        if (currentScore !== null) card.classList.add('completed');

        let timerHtml = '';
        if (item.hasTimer) {
          timerHtml = `
            <div class="bbs-item-timer-bar">
              <button type="button" class="bbs-timer-btn" id="bbs-timer-btn-${item.id}" onclick="toggleBbsItemTimer(${item.id}, ${item.targetSec})">
                ⏱️ 計測スタート (${item.targetSec}秒)
              </button>
              <span class="bbs-timer-time" id="bbs-timer-disp-${item.id}">0.0秒</span>
            </div>
          `;
        }

        let optionsHtml = '';
        item.options.forEach(opt => {
          const isActive = currentScore === opt.score ? 'active' : '';
          optionsHtml += `
            <button type="button" class="bbs-opt-btn ${isActive}" data-item-id="${item.id}" data-score="${opt.score}" onclick="selectBbsScore(${item.id}, ${opt.score})">
              <span>${opt.text}</span>
            </button>
          `;
        });

        card.innerHTML = `
          <div class="bbs-item-head">
            <div class="bbs-item-title-group">
              <span class="bbs-item-num">${item.id}</span>
              <span class="bbs-item-title">${item.title}</span>
            </div>
            <span class="bbs-item-score-badge ${currentScore !== null ? 'scored' : ''}" id="bbs-badge-${item.id}">${scoreLabel}</span>
          </div>
          <div class="bbs-item-desc">${item.desc}</div>
          ${timerHtml}
          <div class="bbs-options-grid">
            ${optionsHtml}
          </div>
        `;

        container.appendChild(card);
      });
    }

    // 得点選択
    function selectBbsScore(itemId, score) {
      appState.bbs.scores[itemId] = score;
      playStartBeep();
      triggerVibration(40);
      updateBbsScore();
      updateBbsUI();

      const card = document.getElementById(`bbs-card-${itemId}`);
      if (card) {
        card.classList.add('completed');
        const badge = document.getElementById(`bbs-badge-${itemId}`);
        if (badge) {
          badge.textContent = `${score}点`;
          badge.classList.add('scored');
        }
        card.querySelectorAll('.bbs-opt-btn').forEach(btn => {
          const s = parseInt(btn.getAttribute('data-score'), 10);
          btn.classList.toggle('active', s === score);
        });
      }
    }

    // タイマー機能
    function toggleBbsItemTimer(itemId, targetSec) {
      const timers = appState.bbs.timers;
      const btn = document.getElementById(`bbs-timer-btn-${itemId}`);
      const disp = document.getElementById(`bbs-timer-disp-${itemId}`);

      if (!timers[itemId] || !timers[itemId].isRunning) {
        playStartBeep();
        triggerVibration(80);
        const startTime = performance.now();
        btn.classList.add('running');
        btn.textContent = '⏹️ 停止';

        const interval = setInterval(() => {
          const elapsed = (performance.now() - startTime) / 1000;
          disp.textContent = `${elapsed.toFixed(1)}秒 / ${targetSec}秒`;
          if (elapsed >= targetSec) {
            clearInterval(interval);
            timers[itemId].isRunning = false;
            btn.classList.remove('running');
            btn.textContent = `✅ ${targetSec}秒達成！`;
            playStopBeep();
            triggerVibration([100, 50, 150]);
          }
        }, 100);

        timers[itemId] = { isRunning: true, startTime, interval };
      } else {
        clearInterval(timers[itemId].interval);
        timers[itemId].isRunning = false;
        btn.classList.remove('running');
        btn.textContent = '⏱️ 再スタート';
        playStopBeep();
        triggerVibration([60, 40, 60]);
      }
    }

    // BBS スコア集計
    function updateBbsScore() {
      let total = 0;
      let completed = 0;
      for (let i = 1; i <= 14; i++) {
        const s = appState.bbs.scores[i];
        if (s !== null) {
          total += s;
          completed++;
        }
      }
      appState.bbs.totalScore = total;
      appState.bbs.completedCount = completed;
    }

    // BBS UI 更新
    function updateBbsUI() {
      updateBbsScore();
      const b = appState.bbs;

      const totalEl = document.getElementById('bbs-total-score');
      if (totalEl) totalEl.textContent = b.totalScore;

      const progEl = document.getElementById('bbs-progress-text');
      if (progEl) progEl.textContent = `入力完了: ${b.completedCount} / 14項目`;

      const badge = document.getElementById('bbs-rank-badge');
      const desc = document.getElementById('bbs-rank-desc');

      if (badge && desc) {
        badge.classList.remove('good', 'moderate', 'severe');
        if (b.completedCount === 0) {
          badge.textContent = '未測定';
          desc.textContent = '全14項目を入力してください';
        } else if (b.totalScore >= 45) {
          badge.textContent = '安全自立域 (45-56点)';
          badge.classList.add('good');
          desc.textContent = '転倒リスク低・自立歩行レベル';
        } else if (b.totalScore >= 41) {
          badge.textContent = '境界域 (41-44点)';
          badge.classList.add('moderate');
          desc.textContent = '転倒リスク軽度増加・見守り/補助具検討';
        } else {
          badge.textContent = '転倒ハイリスク (0-40点)';
          badge.classList.add('severe');
          desc.textContent = '転倒リスク極めて高・介助/車椅子移動';
        }
      }

      updateBbsFeedback();
    }

    // BBS 総合判定フィードバック
    function updateBbsFeedback() {
      const b = appState.bbs;
      const totalEl = document.getElementById('fb-bbs-total-score');
      if (totalEl) totalEl.textContent = b.totalScore;

      const gauge = document.getElementById('fb-bbs-gauge');
      const title = document.getElementById('fb-bbs-rank-title');
      const detail = document.getElementById('fb-bbs-rank-detail');
      const sample = document.getElementById('bbs-patient-talk-sample');

      if (!gauge || !title) return;

      gauge.classList.remove('low-risk', 'medium-risk', 'high-risk');

      if (b.completedCount === 0) {
        title.textContent = '未測定';
        detail.textContent = '14項目を入力すると判定が表示されます';
        sample.textContent = '測定を行うと、患者さん・ご家族への説明用のアドバイス例文がここに表示されます。';
        return;
      }

      if (b.totalScore >= 45) {
        gauge.classList.add('low-risk');
        title.textContent = '転倒リスク低（45〜56点）：自立移動可能群';
        title.style.color = '#059669';
        detail.textContent = '日常生活および屋外歩行におけるバランス能力は良好に維持されています。';
        sample.textContent = `「今回のバランス測定は合計${b.totalScore}点（56点満点）でした。日常生活で転倒する危険性は低く、安全にご自身で動くことができています。この調子で現在の良い運動習慣を続けていきましょう。」`;
      } else if (b.totalScore >= 41) {
        gauge.classList.add('medium-risk');
        title.textContent = '転倒リスク軽度増加（41〜44点）：境界群';
        title.style.color = '#d97706';
        detail.textContent = 'Bergカットオフ値（45点）を下回っており、ふらつきや不意の転倒に注意が必要な状態です。';
        sample.textContent = `「今回のバランス測定は合計${b.totalScore}点でした。日常生活の動作は自立されていますが、方向転換や足元が不安定な場面でややバランスを崩しやすくなっています。杖などの補助具を活用したり、安全な足腰の運動を取り入れていきましょう。」`;
      } else {
        gauge.classList.add('high-risk');
        title.textContent = '転倒ハイリスク（0〜40点）：要介助・移動制限群';
        title.style.color = '#dc2626';
        detail.textContent = '転倒の危険性が極めて高い状態です（研究上100%近い転倒リスク）。立ち座りや移動時の見守り・介助、歩行器や車椅子の使用が強く推奨されます。';
        sample.textContent = `「今回のバランス測定は合計${b.totalScore}点でした。立ち上がりや片足に体重を乗せる動作で大きなふらつきが出やすいため、ご自宅での移動には必ず手すりや歩行器を使い、安全を最優先で介助サポートを受けながら進めていきましょう。」`;
      }
    }

    // BBS カルテ用テキスト自動生成
    function generateBbsChartText() {
      const b = appState.bbs;
      let txt = `【BBS（バーグ・バランス・スケール）】\n`;
      txt += `・合計得点: ${b.totalScore} / 56点 (完了項目: ${b.completedCount}/14項目)\n`;

      if (b.totalScore >= 45) {
        txt += `・判定: 転倒リスク低（自立歩行域、45点以上）\n`;
      } else if (b.totalScore >= 41) {
        txt += `・判定: 転倒リスク軽度増加（境界域、45点カットオフ未満・見守り要）\n`;
      } else {
        txt += `・判定: 転倒ハイリスク（40点以下、転倒危険極めて高・歩行器/車椅子/介助要）\n`;
      }

      // 減点項目（4点満点未満）の抽出
      const deductions = [];
      const unmeasured = [];

      BBS_ITEMS.forEach(item => {
        const s = b.scores[item.id];
        if (s === null) {
          unmeasured.push(item.title);
        } else if (s < 4) {
          const chosenOpt = item.options.find(o => o.score === s);
          const detail = chosenOpt ? chosenOpt.text : `${s}点`;
          deductions.push(`  - ${item.title}: ${detail}`);
        }
      });

      if (deductions.length > 0) {
        txt += `・減点項目（課題動作）:\n`;
        deductions.forEach(d => {
          txt += `${d}\n`;
        });
      } else if (b.completedCount === 14) {
        txt += `・減点項目: なし（全項目4点満点）\n`;
      } else if (b.completedCount > 0) {
        txt += `・減点項目: なし（入力済項目はすべて満点）\n`;
      }

      if (unmeasured.length > 0 && b.completedCount > 0 && b.completedCount < 14) {
        txt += `・未実施項目: ${unmeasured.join(', ')}\n`;
      }

      return txt;
    }

    // BBS リセット
    function resetBbsData() {
      for (let i = 1; i <= 14; i++) {
        appState.bbs.scores[i] = null;
      }
      appState.bbs.totalScore = 0;
      appState.bbs.completedCount = 0;
      renderBbsItems();
      updateBbsUI();
    }

    // ========================================================
    // 運動負荷設定（Exercise Intensity）モジュール
    // ========================================================
    function setupExerciseEvents() {
      const ageInput = document.getElementById('ex-input-age');
      const restHrInput = document.getElementById('ex-input-rest-hr');
      const btnBetaNo = document.getElementById('btn-beta-no');
      const btnBetaYes = document.getElementById('btn-beta-yes');
      const btnModalWalk = document.getElementById('btn-modal-walk');
      const btnModalBike = document.getElementById('btn-modal-bike');
      const formulaSelect = document.getElementById('ex-formula-select');
      const pulseInput = document.getElementById('input-10s-pulse');
      const copyBtn = document.getElementById('ex-quick-copy-btn');

      if (ageInput) {
        ageInput.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          if (!isNaN(val) && val >= 10 && val <= 120) {
            appState.exercise.age = val;
            updateExerciseUI();
          }
        });
      }

      if (restHrInput) {
        restHrInput.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          if (!isNaN(val) && val >= 30 && val <= 200) {
            appState.exercise.restHr = val;
            updateExerciseUI();
          }
        });
      }

      if (btnBetaNo && btnBetaYes) {
        btnBetaNo.addEventListener('click', () => setBetaBlocker(false));
        btnBetaYes.addEventListener('click', () => setBetaBlocker(true));
      }

      if (btnModalWalk && btnModalBike) {
        btnModalWalk.addEventListener('click', () => setModality('walk'));
        btnModalBike.addEventListener('click', () => setModality('bike'));
      }

      if (formulaSelect) {
        formulaSelect.addEventListener('change', (e) => {
          appState.exercise.formula = e.target.value;
          updateExerciseUI();
        });
      }

      if (pulseInput) {
        pulseInput.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          appState.exercise.last10sPulse = isNaN(val) ? null : val;
          updatePulseCheck();
        });
      }

      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          openChartModal('【運動処方・心拍設定】カルテ転記', generateExerciseChartText());
        });
      }
    }

    function setBetaBlocker(hasBeta) {
      appState.exercise.hasBetaBlocker = hasBeta;
      const btnNo = document.getElementById('btn-beta-no');
      const btnYes = document.getElementById('btn-beta-yes');
      const modalGroup = document.getElementById('modality-select-group');
      const formulaSelect = document.getElementById('ex-formula-select');
      const helpText = document.getElementById('beta-help-text');

      if (btnNo && btnYes) {
        btnNo.classList.toggle('active', !hasBeta);
        btnYes.classList.toggle('active', hasBeta);
      }

      if (hasBeta) {
        if (modalGroup) modalGroup.style.display = 'block';
        if (helpText) helpText.innerHTML = '⚠️ β遮断薬内服中：心拍数の上昇が抑制されるため、<strong>Brawner式</strong>または<strong>Keteyian式</strong>で計算します。';
        if (formulaSelect) {
          formulaSelect.options[0].disabled = true;
          formulaSelect.options[1].disabled = true;
          formulaSelect.options[2].disabled = false;
          formulaSelect.options[3].disabled = false;
          formulaSelect.value = 'brawner';
          appState.exercise.formula = 'brawner';
        }
      } else {
        if (modalGroup) modalGroup.style.display = 'none';
        if (helpText) helpText.textContent = '※β遮断薬内服時は脈拍の上限が抑えられるため、専用の補正式を適用します。';
        if (formulaSelect) {
          formulaSelect.options[0].disabled = false;
          formulaSelect.options[1].disabled = false;
          formulaSelect.options[2].disabled = true;
          formulaSelect.options[3].disabled = true;
          formulaSelect.value = 'tanaka';
          appState.exercise.formula = 'tanaka';
        }
      }

      updateExerciseUI();
    }

    function setModality(modal) {
      appState.exercise.modality = modal;
      const btnWalk = document.getElementById('btn-modal-walk');
      const btnBike = document.getElementById('btn-modal-bike');
      if (btnWalk && btnBike) {
        btnWalk.classList.toggle('active', modal === 'walk');
        btnBike.classList.toggle('active', modal === 'bike');
      }
      updateExerciseUI();
    }

    function updateExerciseUI() {
      const ex = appState.exercise;
      const age = ex.age || 70;
      const restHr = ex.restHr || 72;

      let hrMax = 0;
      let formulaDesc = '';

      if (ex.hasBetaBlocker) {
        if (ex.formula === 'keteyian') {
          const bikeOffset = ex.modality === 'bike' ? 5 : 0;
          hrMax = Math.round(119 + 0.5 * restHr - 0.5 * age - bikeOffset);
          const modalStr = ex.modality === 'bike' ? '自転車(-5)' : '歩行(-0)';
          formulaDesc = `Keteyian式 [119 + 0.5×${restHr} - 0.5×${age} - ${modalStr}]`;
        } else {
          hrMax = Math.round(164 - 0.7 * age);
          formulaDesc = `Brawner式 [164 - (0.7 × ${age})]`;
        }
      } else {
        if (ex.formula === 'standard') {
          hrMax = Math.round(220 - age);
          formulaDesc = `一般式 [220 - ${age}]`;
        } else {
          hrMax = Math.round(208 - 0.7 * age);
          formulaDesc = `Tanaka式 [208 - (0.7 × ${age})]`;
        }
      }

      ex.hrMax = hrMax;
      const hrr = Math.max(10, hrMax - restHr);
      ex.hrr = hrr;

      // HRR法 (Karvonen)
      const hrrModMin = Math.round(restHr + hrr * 0.40);
      const hrrModMax = Math.round(restHr + hrr * 0.60);
      const hrrHighMin = hrrModMax + 1;
      const hrrHighMax = Math.round(restHr + hrr * 0.80);
      ex.hrrModerate = { min: hrrModMin, max: hrrModMax };
      ex.hrrHigh = { min: hrrHighMin, max: hrrHighMax };

      // %HRmax法
      const hrMaxModMin = Math.round(hrMax * 0.65);
      const hrMaxModMax = Math.round(hrMax * 0.75);
      const hrMaxHighMin = hrMaxModMax + 1;
      const hrMaxHighMax = Math.round(hrMax * 0.85);
      ex.hrMaxModerate = { min: hrMaxModMin, max: hrMaxModMax };
      ex.hrMaxHigh = { min: hrMaxHighMin, max: hrMaxHighMax };

      // DOM反映
      const dispHrMax = document.getElementById('disp-hrmax-val');
      const dispFormula = document.getElementById('disp-hrmax-formula');
      const dispHrr = document.getElementById('disp-hrr-val');
      if (dispHrMax) dispHrMax.textContent = hrMax;
      if (dispFormula) dispFormula.textContent = `計算式: ${formulaDesc}`;
      if (dispHrr) dispHrr.textContent = hrr;

      // 比較テーブル値反映
      const dispHrrMod = document.getElementById('disp-hrr-mod');
      const dispHrMaxMod = document.getElementById('disp-hrmax-mod');
      const dispHrrHigh = document.getElementById('disp-hrr-high');
      const dispHrMaxHigh = document.getElementById('disp-hrmax-high');
      const dispHrrDanger = document.getElementById('disp-hrr-danger');
      const dispHrMaxDanger = document.getElementById('disp-hrmax-danger');

      if (dispHrrMod) dispHrrMod.textContent = `${hrrModMin} 〜 ${hrrModMax}`;
      if (dispHrMaxMod) dispHrMaxMod.textContent = `${hrMaxModMin} 〜 ${hrMaxModMax}`;
      if (dispHrrHigh) dispHrrHigh.textContent = `${hrrHighMin} 〜 ${hrrHighMax}`;
      if (dispHrMaxHigh) dispHrMaxHigh.textContent = `> ${hrMaxModMax} (〜${hrMaxHighMax})`;
      if (dispHrrDanger) dispHrrDanger.textContent = `> ${hrrHighMax}`;
      if (dispHrMaxDanger) dispHrMaxDanger.textContent = `> ${hrMaxHighMax}`;

      const zoneMapRest = document.getElementById('zone-map-rest');
      if (zoneMapRest) zoneMapRest.textContent = `安静時: ${restHr} bpm`;

      updatePulseCheck();
    }

    function updatePulseCheck() {
      const p = appState.exercise.last10sPulse;
      const dispBpm = document.getElementById('disp-calc-bpm');
      const dispZone = document.getElementById('disp-calc-zone');
      const box = document.getElementById('pulse-result-box');

      if (!box || !dispBpm || !dispZone) return;

      box.classList.remove('in-mod', 'in-high', 'in-danger');

      if (!p || p <= 0) {
        dispBpm.textContent = '--';
        dispZone.textContent = '脈拍数を入力してください';
        dispZone.style.color = 'var(--text-secondary)';
        return;
      }

      const bpm = p * 6;
      dispBpm.textContent = bpm;
      const ex = appState.exercise;

      if (bpm < ex.hrrModerate.min) {
        dispZone.textContent = '⚪ 低強度・ウォーミングアップ域（安全）';
        dispZone.style.color = '#64748b';
      } else if (bpm <= ex.hrrModerate.max) {
        box.classList.add('in-mod');
        dispZone.textContent = '🟢 中等度ゾーン内（40〜60% HRR：持久力向上・良好）';
        dispZone.style.color = '#16a34a';
      } else if (bpm <= ex.hrrHigh.max) {
        box.classList.add('in-high');
        dispZone.textContent = '🟠 高強度ゾーン内（60〜80% HRR：歩行速度向上）';
        dispZone.style.color = '#d97706';
      } else {
        box.classList.add('in-danger');
        dispZone.textContent = '🔴 危険域（>80% HRR：過負荷！減速または休憩）';
        dispZone.style.color = '#dc2626';
      }
    }

    function generateExerciseChartText() {
      const ex = appState.exercise;
      let txt = `【運動処方・心拍設定（AHA/ASA 2026ガイドライン準拠）】\n`;
      const betaStr = ex.hasBetaBlocker ? 'あり (β遮断薬補正式適用)' : 'なし';
      txt += `・設定条件: ${ex.age}歳, 安静時心拍数 ${ex.restHr}bpm, β遮断薬: ${betaStr}\n`;
      txt += `・推定最大心拍数(HRmax): ${ex.hrMax} bpm, 予備心拍数(HRR): ${ex.hrr} bpm\n`;
      txt += `・目標心拍数 (並列比較):\n`;
      txt += `  1) 予備心拍数法 (40〜60% HRR / 推奨): ${ex.hrrModerate.min}〜${ex.hrrModerate.max} bpm [Borg 11〜13: 楽〜ややきつい]\n`;
      txt += `     高強度域 (>60〜80% HRR): ${ex.hrrHigh.min}〜${ex.hrrHigh.max} bpm [Borg 14〜16: きつい]\n`;
      txt += `  2) 最大心拍数比 (65〜75% HRmax / 参照): ${ex.hrMaxModerate.min}〜${ex.hrMaxModerate.max} bpm\n`;
      txt += `     高強度域 (>75% HRmax): >${ex.hrMaxModerate.max} bpm\n`;
      txt += `・安全上限心拍数: ${ex.hrrHigh.max} bpm (80% HRR超過時は中止・負荷軽減)\n`;
      txt += `・推奨運動処方: 課題特異的歩行練習、週3〜5日、1回20〜60分 (週150〜300分)\n`;
      return txt;
    }

    function resetExerciseData() {
      appState.exercise = {
        age: 70,
        restHr: 72,
        hasBetaBlocker: false,
        modality: 'walk',
        formula: 'tanaka',
        hrMax: 159,
        hrr: 87,
        hrrModerate: { min: 107, max: 124 },
        hrrHigh: { min: 125, max: 142 },
        hrMaxModerate: { min: 103, max: 119 },
        hrMaxHigh: { min: 120, max: 142 },
        last10sPulse: null
      };
      const ageInput = document.getElementById('ex-input-age');
      const restHrInput = document.getElementById('ex-input-rest-hr');
      const pulseInput = document.getElementById('input-10s-pulse');
      if (ageInput) ageInput.value = '70';
      if (restHrInput) restHrInput.value = '72';
      if (pulseInput) pulseInput.value = '';
      setBetaBlocker(false);
      updateExerciseUI();
    }

    // --------------------------------------------------------
    // 共通モーダル & コピー
    // --------------------------------------------------------
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

    // 読み込み直後に確実に初期化を実行
    initApp();
  

// ==========================================
// Walk 'n Watch (UBCプロトコル) ロジック
// ==========================================

const WNW_DEFAULTS = {
  eligibility: { el1: true, el2: true, el3: true, el4: true, el5: true, el6: true },
  flags: { hr: false, sbp: false, dbp: false, spo2: false, angina: false, arrhythmia: false, valve: false, recent: false },
  sixMwt: {
    timerSeconds: 360,
    timerRunning: false,
    timerInterval: null,
    dist: 150,
    passed: true
  },
  session: {
    week: 4,
    age: 70,
    hrRest: 72,
    timerSeconds: 1800,
    timerRunning: false,
    timerInterval: null,
    stepStart: 0,
    stepFinish: 2450,
    avgHr: 118,
    borg: 3
  }
};

function initWnwState() {
  appState.wnw = JSON.parse(JSON.stringify(WNW_DEFAULTS));
}

function setupWnwEvents() {
  // 適格性チェックボックス
  for (let i = 1; i <= 6; i++) {
    const el = document.getElementById(`wnw-el-${i}`);
    if (el) {
      el.addEventListener('change', (e) => {
        appState.wnw.eligibility[`el${i}`] = e.target.checked;
        updateWnwScreeningUI();
      });
    }
  }

  // Red Flags チェックボックス
  const flagIds = ['hr', 'sbp', 'dbp', 'spo2', 'angina', 'arrhythmia', 'valve', 'recent'];
  flagIds.forEach(id => {
    const el = document.getElementById(`wnw-flag-${id}`);
    if (el) {
      el.addEventListener('change', (e) => {
        appState.wnw.flags[id] = e.target.checked;
        updateWnwScreeningUI();
      });
    }
  });

  // 血圧入力
  ['bp1-sys', 'bp1-dia', 'bp1-hr', 'bp2-sys', 'bp2-dia', 'bp2-hr', 'bp3-sys', 'bp3-dia', 'bp3-hr'].forEach(id => {
    const el = document.getElementById(`wnw-${id}`);
    if (el) {
      el.addEventListener('input', () => updateWnwScreeningUI());
    }
  });

  // 6MWTへジャンプボタン
  const goto6mwtBtn = document.getElementById('wnw-goto-6mwt-btn');
  if (goto6mwtBtn) {
    goto6mwtBtn.addEventListener('click', () => {
      const tabBtn = document.querySelector('#view-wnw .tab-btn[data-tab="wnw-6mwt"]');
      if (tabBtn) tabBtn.click();
    });
  }

  // 6MWT タイマーボタン
  const start6mwt = document.getElementById('wnw-6mwt-start-btn');
  const pause6mwt = document.getElementById('wnw-6mwt-pause-btn');
  const reset6mwt = document.getElementById('wnw-6mwt-reset-btn');
  const fail6mwt = document.getElementById('wnw-6mwt-fail-btn');

  if (start6mwt) start6mwt.addEventListener('click', startWnw6mwtTimer);
  if (pause6mwt) pause6mwt.addEventListener('click', pauseWnw6mwtTimer);
  if (reset6mwt) reset6mwt.addEventListener('click', resetWnw6mwtTimer);
  if (fail6mwt) fail6mwt.addEventListener('click', () => {
    pauseWnw6mwtTimer();
    setWnw6mwtPass(false);
    alert('症状出現のためテストを中止（FAIL）と記録しました。医師または看護師へ報告・相談してください。');
  });

  // 6MWT 結果距離
  const distInput = document.getElementById('wnw-6mwt-dist');
  if (distInput) {
    distInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val) && val >= 0) {
        appState.wnw.sixMwt.dist = val;
        updateWnw6mwtTargets();
      }
    });
  }

  // PASS / FAIL ボタン
  const btnPass = document.getElementById('btn-6mwt-pass');
  const btnFail = document.getElementById('btn-6mwt-fail');
  if (btnPass) btnPass.addEventListener('click', () => setWnw6mwtPass(true));
  if (btnFail) btnFail.addEventListener('click', () => setWnw6mwtPass(false));

  // セッション週選択
  const weekSelect = document.getElementById('wnw-session-week');
  if (weekSelect) {
    weekSelect.addEventListener('change', (e) => {
      appState.wnw.session.week = parseInt(e.target.value, 10);
      updateWnwSessionUI();
    });
  }

  // 患者年齢・安静時心拍
  const ageInput = document.getElementById('wnw-patient-age');
  const hrRestInput = document.getElementById('wnw-patient-hrrest');
  if (ageInput) {
    ageInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val) && val >= 10 && val <= 110) {
        appState.wnw.session.age = val;
        updateWnwSessionUI();
      }
    });
  }
  if (hrRestInput) {
    hrRestInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val) && val >= 30 && val <= 180) {
        appState.wnw.session.hrRest = val;
        updateWnwSessionUI();
      }
    });
  }

  // 30分タイマーボタン
  const startSess = document.getElementById('wnw-sess-start-btn');
  const pauseSess = document.getElementById('wnw-sess-pause-btn');
  const resetSess = document.getElementById('wnw-sess-reset-btn');
  if (startSess) startSess.addEventListener('click', startWnwSessionTimer);
  if (pauseSess) pauseSess.addEventListener('click', pauseWnwSessionTimer);
  if (resetSess) resetSess.addEventListener('click', resetWnwSessionTimer);

  // 歩数入力
  const stepStartInput = document.getElementById('wnw-step-start');
  const stepFinishInput = document.getElementById('wnw-step-finish');
  if (stepStartInput) {
    stepStartInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val) && val >= 0) {
        appState.wnw.session.stepStart = val;
        updateWnwSessionUI();
      }
    });
  }
  if (stepFinishInput) {
    stepFinishInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val) && val >= 0) {
        appState.wnw.session.stepFinish = val;
        updateWnwSessionUI();
      }
    });
  }

  // 平均心拍数入力
  const avgHrInput = document.getElementById('wnw-sess-avghr');
  if (avgHrInput) {
    avgHrInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val) && val >= 30) {
        appState.wnw.session.avgHr = val;
        updateWnwSessionUI();
      }
    });
  }

  // Borg ボタン
  document.querySelectorAll('.wnw-borg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.wnw-borg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      appState.wnw.session.borg = parseInt(btn.getAttribute('data-borg'), 10);
    });
  });

  // クイックカルテコピー
  const copyBtn = document.getElementById('wnw-quick-copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      generateWnwChartText();
      openChartModal('Walk \'n Watch プロトコル 実施カルテ');
    });
  }
}

function updateWnwScreeningUI() {
  const elStatus = document.getElementById('wnw-eligibility-status');
  const flagsStatus = document.getElementById('wnw-flags-status');
  const overallBanner = document.getElementById('wnw-overall-decision');

  // 適格性全チェック確認
  const elAllPassed = Object.values(appState.wnw.eligibility).every(v => v === true);
  if (elStatus) {
    if (elAllPassed) {
      elStatus.className = 'wnw-status-box safe';
      elStatus.innerHTML = '<span class="wnw-status-icon">✅</span><span class="wnw-status-text">適格基準をすべて満たしています。</span>';
    } else {
      elStatus.className = 'wnw-status-box danger';
      elStatus.innerHTML = '<span class="wnw-status-icon">⚠️</span><span class="wnw-status-text">未チェックの適格基準があります（5歩歩行やリハビリ目標等）。</span>';
    }
  }

  // Red Flags確認
  const hasFlag = Object.values(appState.wnw.flags).some(v => v === true);
  if (flagsStatus) {
    if (!hasFlag) {
      flagsStatus.className = 'wnw-status-box safe';
      flagsStatus.innerHTML = '<span class="wnw-status-icon">🛡️</span><span class="wnw-status-text">危険徴候（Red Flags）はありません。</span>';
    } else {
      flagsStatus.className = 'wnw-status-box danger';
      flagsStatus.innerHTML = '<span class="wnw-status-icon">🚨</span><span class="wnw-status-text">危険徴候（Red Flags）が認められます。医師への相談が必要です。</span>';
    }
  }

  // 血圧チェック
  const bp1Sys = parseInt(document.getElementById('wnw-bp1-sys')?.value, 10);
  const bp1Dia = parseInt(document.getElementById('wnw-bp1-dia')?.value, 10);
  const bp1Hr = parseInt(document.getElementById('wnw-bp1-hr')?.value, 10);

  const bp1Ok = !isNaN(bp1Sys) && !isNaN(bp1Dia) && !isNaN(bp1Hr) && bp1Sys < 180 && bp1Dia < 100 && bp1Hr < 100;
  const bp1Res = document.getElementById('wnw-bp1-res');
  if (bp1Res) {
    bp1Res.textContent = bp1Ok ? 'OK' : '高値/要注意';
    bp1Res.className = bp1Ok ? 'text-success' : 'text-danger';
  }

  // 総合判断
  const isGo = elAllPassed && !hasFlag && bp1Ok;
  if (overallBanner) {
    if (isGo) {
      overallBanner.className = 'wnw-decision-banner pass';
      overallBanner.innerHTML = `
        <div class="wnw-decision-main">
          <span class="decision-icon">🟢</span>
          <div>
            <strong>GO: 6分間歩行テスト（6MWT）へ進んでください</strong>
            <p>すべての適格条件を満たし、安全性基準をクリアしています。</p>
          </div>
        </div>
        <button type="button" class="wnw-jump-btn" id="wnw-goto-6mwt-btn">6分間歩行テストへ ➔</button>
      `;
      document.getElementById('wnw-goto-6mwt-btn')?.addEventListener('click', () => {
        document.querySelector('#view-wnw .tab-btn[data-tab="wnw-6mwt"]')?.click();
      });
    } else {
      overallBanner.className = 'wnw-decision-banner stop';
      overallBanner.innerHTML = `
        <div class="wnw-decision-main">
          <span class="decision-icon">🔴</span>
          <div>
            <strong>STOP: 担当医師または看護師へ確認・相談してください</strong>
            <p>適格基準の不足またはRed Flags・バイタル高値が検出されています。</p>
          </div>
        </div>
      `;
    }
  }
}

// 6MWT タイマー
function formatTimerMinSec(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function startWnw6mwtTimer() {
  if (appState.wnw.sixMwt.timerRunning) return;
  appState.wnw.sixMwt.timerRunning = true;
  document.getElementById('wnw-6mwt-start-btn').disabled = true;
  document.getElementById('wnw-6mwt-pause-btn').disabled = false;
  if (appState.soundEnabled) playStartBeep();

  appState.wnw.sixMwt.timerInterval = setInterval(() => {
    appState.wnw.sixMwt.timerSeconds--;
    updateWnw6mwtTimerDisplay();

    if (appState.wnw.sixMwt.timerSeconds <= 0) {
      pauseWnw6mwtTimer();
      if (appState.soundEnabled) playStopBeep();
      if (appState.vibrateEnabled) triggerVibration();
      alert('6分間が経過しました！その場で立ち止まるよう指示し、歩行距離を計測してください。');
    }
  }, 1000);
}

function pauseWnw6mwtTimer() {
  appState.wnw.sixMwt.timerRunning = false;
  clearInterval(appState.wnw.sixMwt.timerInterval);
  document.getElementById('wnw-6mwt-start-btn').disabled = false;
  document.getElementById('wnw-6mwt-pause-btn').disabled = true;
}

function resetWnw6mwtTimer() {
  pauseWnw6mwtTimer();
  appState.wnw.sixMwt.timerSeconds = 360;
  updateWnw6mwtTimerDisplay();
}

function updateWnw6mwtTimerDisplay() {
  const timerEl = document.getElementById('wnw-6mwt-timer');
  const cueTime = document.getElementById('wnw-cue-time');
  const cueText = document.getElementById('wnw-cue-text');
  const s = appState.wnw.sixMwt.timerSeconds;

  if (timerEl) timerEl.textContent = formatTimerMinSec(s);

  // 定型ガイダンス（経過時間: 360 - s）
  const elapsed = 360 - s;
  if (cueTime && cueText) {
    if (elapsed === 0) {
      cueTime.textContent = '開始前';
      cueText.textContent = '「このテストの目的は、6分間でできるだけ遠くまで歩くことです。走ったりジョギングはできません。疲れたら速度を落としたり、立ち止まって休んでも構いません。」';
    } else if (elapsed < 60) {
      cueTime.textContent = '1分未満';
      cueText.textContent = '患者の横または斜め後ろに付き添い、安全を確保しながら見守ります（私語は控え、タイムコールのみ行います）。';
    } else if (elapsed >= 60 && elapsed < 120) {
      cueTime.textContent = '1分経過';
      cueText.textContent = '📢 声かけ: 「順調です。残り5分です。」（You are doing well. You have 5 minutes to go.）';
    } else if (elapsed >= 120 && elapsed < 180) {
      cueTime.textContent = '2分経過';
      cueText.textContent = '📢 声かけ: 「その調子です。残り4分です。」（Keep up the good work. You have 4 minutes to go.）';
    } else if (elapsed >= 180 && elapsed < 240) {
      cueTime.textContent = '3分経過 (中間地点)';
      cueText.textContent = '📢 声かけ: 「順調です。ちょうど半分終わりました。」（You are doing well. You are halfway done.）';
    } else if (elapsed >= 240 && elapsed < 300) {
      cueTime.textContent = '4分経過';
      cueText.textContent = '📢 声かけ: 「その調子です。あと2分です。」（Keep up the good work. You have only 2 minutes left.）';
    } else if (elapsed >= 300 && elapsed < 345) {
      cueTime.textContent = '5分経過';
      cueText.textContent = '📢 声かけ: 「順調です。残りあと1分です。」（You are doing well. You have only 1 minute to go.）';
    } else if (elapsed >= 345 && elapsed < 360) {
      cueTime.textContent = '5分45秒経過 (ラストスパート)';
      cueText.textContent = '📢 声かけ: 「まもなく終了の合図をします。合図があったらその場で止まってください。」';
    } else {
      cueTime.textContent = '6分終了';
      cueText.textContent = '📢 声かけ: 「止まってください。椅子に座って休んでください。」';
    }
  }
}

function setWnw6mwtPass(passed) {
  appState.wnw.sixMwt.passed = passed;
  document.getElementById('btn-6mwt-pass')?.classList.toggle('active', passed);
  document.getElementById('btn-6mwt-fail')?.classList.toggle('active', !passed);
  updateWnw6mwtTargets();
}

function updateWnw6mwtTargets() {
  const dist = appState.wnw.sixMwt.dist;
  const echoEl = document.getElementById('disp-6mwt-dist-echo');
  if (echoEl) echoEl.textContent = `${dist}m`;

  const w1El = document.getElementById('disp-w1-steps');
  const w2El = document.getElementById('disp-w2-steps');
  const w4El = document.getElementById('disp-w4-steps');

  let w1 = 2000, w2 = 2500, w4 = 3000;
  let bracket = 2;

  if (dist < 100) {
    w1 = 1000; w2 = 1500; w4 = 2000;
    bracket = 1;
  } else if (dist <= 200) {
    w1 = 2000; w2 = 2500; w4 = 3000;
    bracket = 2;
  } else {
    w1 = 3000; w2 = 3500; w4 = 4000;
    bracket = 3;
  }

  if (w1El) w1El.textContent = w1.toLocaleString();
  if (w2El) w2El.textContent = w2.toLocaleString();
  if (w4El) w4El.textContent = w4.toLocaleString();

  // テーブルハイライト
  document.getElementById('row-bracket-1')?.classList.toggle('highlight-row', bracket === 1);
  document.getElementById('row-bracket-2')?.classList.toggle('highlight-row', bracket === 2);
  document.getElementById('row-bracket-3')?.classList.toggle('highlight-row', bracket === 3);

  // セッションUIも連動更新
  updateWnwSessionUI();
}

// 30分セッションタイマー
function startWnwSessionTimer() {
  if (appState.wnw.session.timerRunning) return;
  appState.wnw.session.timerRunning = true;
  document.getElementById('wnw-sess-start-btn').disabled = true;
  document.getElementById('wnw-sess-pause-btn').disabled = false;
  if (appState.soundEnabled) playStartBeep();

  appState.wnw.session.timerInterval = setInterval(() => {
    appState.wnw.session.timerSeconds--;
    updateWnwSessionTimerDisplay();

    if (appState.wnw.session.timerSeconds <= 0) {
      pauseWnwSessionTimer();
      if (appState.soundEnabled) playStopBeep();
      if (appState.vibrateEnabled) triggerVibration();
      alert('30分間の歩行セッションが終了しました！歩数計の終了数値を記録してください。');
    }
  }, 1000);
}

function pauseWnwSessionTimer() {
  appState.wnw.session.timerRunning = false;
  clearInterval(appState.wnw.session.timerInterval);
  document.getElementById('wnw-sess-start-btn').disabled = false;
  document.getElementById('wnw-sess-pause-btn').disabled = true;
}

function resetWnwSessionTimer() {
  pauseWnwSessionTimer();
  appState.wnw.session.timerSeconds = 1800;
  updateWnwSessionTimerDisplay();
}

function updateWnwSessionTimerDisplay() {
  const el = document.getElementById('wnw-sess-timer');
  if (el) el.textContent = formatTimerMinSec(appState.wnw.session.timerSeconds);
}

function updateWnwSessionUI() {
  const { week, age, hrRest, stepStart, stepFinish, avgHr } = appState.wnw.session;
  const dist = appState.wnw.sixMwt.dist;

  // 目標歩数の決定
  let stepTarget = 3000;
  if (dist < 100) {
    if (week === 1) stepTarget = 1000;
    else if (week === 2) stepTarget = 1500;
    else stepTarget = 2000;
  } else if (dist <= 200) {
    if (week === 1) stepTarget = 2000;
    else if (week === 2) stepTarget = 2500;
    else stepTarget = 3000;
  } else {
    if (week === 1) stepTarget = 3000;
    else if (week === 2) stepTarget = 3500;
    else stepTarget = 4000;
  }

  // 目標%HRRの決定 (Week1: 40%, Week2: 45%, Week3: 50%, Week4: 60%)
  let targetHrrPct = 40;
  if (week === 2) targetHrrPct = 45;
  if (week === 3) targetHrrPct = 50;
  if (week === 4) targetHrrPct = 60;

  // 目標心拍数（Tanaka式 HRmax = 208 - 0.7 * age）
  const hrMax = Math.round(208 - 0.7 * age);
  const hrr = hrMax - hrRest;
  const targetHr = Math.round(hrRest + hrr * (targetHrrPct / 100));

  // 表示更新
  const todayStepEl = document.getElementById('disp-today-step-target');
  const todayHrrEl = document.getElementById('disp-today-hrr-target');
  const todayHrEl = document.getElementById('disp-today-target-hr');
  if (todayStepEl) todayStepEl.textContent = `${stepTarget.toLocaleString()} 歩`;
  if (todayHrrEl) todayHrrEl.textContent = `${targetHrrPct}% HRR`;
  if (todayHrEl) todayHrEl.textContent = `${targetHr} bpm`;

  // 獲得歩数計算
  const calcSteps = Math.max(0, stepFinish - stepStart);
  const calcStepsEl = document.getElementById('disp-calc-steps');
  if (calcStepsEl) calcStepsEl.textContent = calcSteps.toLocaleString();

  // 達成率
  const pct = Math.round((calcSteps / stepTarget) * 100);
  const pctEl = document.getElementById('disp-calc-step-pct');
  const fillEl = document.getElementById('disp-meter-fill');
  const feedbackEl = document.getElementById('disp-step-feedback');

  if (pctEl) pctEl.textContent = `${pct}%`;
  if (fillEl) fillEl.style.width = `${Math.min(pct, 100)}%`;

  if (feedbackEl) {
    if (pct >= 100) {
      feedbackEl.innerHTML = `🎉 <strong>本日の目標達成（${pct}%）！</strong> 素晴らしい高反復歩行です。リハビリ効果が最大限に期待できます。`;
    } else {
      const remaining = stepTarget - calcSteps;
      feedbackEl.innerHTML = `👏 <strong>よく頑張りました！（目標の${pct}%を達成）</strong><br>
        残りの約 ${remaining.toLocaleString()} 歩は、夕方の病棟内歩行やご家族・看護師との自主トレ「宿題歩数」として促してみましょう（※目標は下げずに維持します）。`;
    }
  }

  // 心拍強度判定
  const achievedHrrPct = hrr > 0 ? Math.round(((avgHr - hrRest) / hrr) * 100) : 0;
  const hrFeedbackEl = document.getElementById('disp-hr-feedback');
  if (hrFeedbackEl) {
    let zoneNote = '適正な中等度強度域です。';
    if (achievedHrrPct < 35) zoneNote = 'やや低強度です。次回は歩行速度のアップや介助量の軽減を検討しましょう。';
    else if (achievedHrrPct > 70) zoneNote = '高強度域に入っています。過負荷・息切れに留意してください。';

    hrFeedbackEl.innerHTML = `
      <div class="feedback-badge">心拍強度判定</div>
      <div class="feedback-text">
        平均心拍数 ${avgHr} bpm ➔ <strong>達成強度: 約 ${achievedHrrPct}% HRR</strong>（${zoneNote}）
      </div>
    `;
  }
}

function generateWnwChartText() {
  const { week, age, hrRest, stepStart, stepFinish, avgHr, borg } = appState.wnw.session;
  const sixMwt = appState.wnw.sixMwt;
  const calcSteps = Math.max(0, stepFinish - stepStart);

  let stepTarget = 3000;
  if (sixMwt.dist < 100) stepTarget = week === 1 ? 1000 : (week === 2 ? 1500 : 2000);
  else if (sixMwt.dist <= 200) stepTarget = week === 1 ? 2000 : (week === 2 ? 2500 : 3000);
  else stepTarget = week === 1 ? 3000 : (week === 2 ? 3500 : 4000);

  const pct = Math.round((calcSteps / stepTarget) * 100);
  const hrMax = Math.round(208 - 0.7 * age);
  const hrr = hrMax - hrRest;
  const achievedHrrPct = hrr > 0 ? Math.round(((avgHr - hrRest) / hrr) * 100) : 0;

  const text = `【Walk 'n Watch プロトコル 実施記録】
■ 評価・条件
・介入ステージ: 第${week}週
・患者情報: 年齢 ${age}歳 / 安静時心拍数 ${hrRest} bpm
・初回6MWT距離: ${sixMwt.dist} m (${sixMwt.passed ? '完走 PASS' : '中止 FAIL'})
・本日のセッション目標歩数: ${stepTarget.toLocaleString()} 歩

■ 実施結果 (冒頭30分間歩行練習)
・獲得歩数: ${calcSteps.toLocaleString()} 歩 (目標達成率: ${pct}%)
  (歩数計: 開始 ${stepStart.toLocaleString()} 歩 ➔ 終了 ${stepFinish.toLocaleString()} 歩)
・平均心拍数: ${avgHr} bpm (約 ${achievedHrrPct}% HRR)
・自覚的運動強度: 修正Borg ${borg}/10 (トークテスト: 会話可能)
・有害事象・自覚症状: なし (胸痛・めまい・過度な疲労等なし)

■ 今後の方針
・セッション外の活動: 不足歩数は病棟内での自主トレ・家族歩行（宿題歩数）として推奨。
・次週プログレッション: 歩行速度向上・休憩時間の短縮を図り、高反復・中等度強度を維持。`;

  const outputEl = document.getElementById('chart-text-output');
  if (outputEl) outputEl.value = text;
}

function resetWnwData() {
  initWnwState();
  updateWnwScreeningUI();
  updateWnw6mwtTargets();
  updateWnwSessionUI();
}