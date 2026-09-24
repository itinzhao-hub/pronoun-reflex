(() => {
  const cfg = window.APP_CONFIG;
  const stimuli = (window.STIMULI || []).filter(s => String(s.enabled ?? "1") !== "0");

  const $ = id => document.getElementById(id);
  const setupView = $("setupView"), trainView = $("trainView"), summaryView = $("summaryView");
  const moduleGrid = $("moduleGrid"), variantRow = $("variantRow"), answers = $("answers");
  const audioPlayer = $("audioPlayer");

  const moduleLabels = {
    SINGLE_CLITIC: "单代词",
    COD_CLUSTER: "COD 双代词组合",
    EN_CLUSTER: "EN 组合",
    REFLEXIVE: "反身 + en / y",
    Y_CLUSTER: "Y 组合",
    SPECIAL_HIGH_FREQ: "特殊高频块",
    INFINITIVE_ENV: "不定式环境",
    ADVANCED_EXPOSURE: "否定 / 命令式 / 高级曝光"
  };

  let session = [];
  let index = 0;
  let current = null;
  let startedAt = 0;
  let locked = false;
  let wrongPaused = false;
  let sessionResults = [];
  let recentIds = [];

  function shuffle(arr) {
    const a = [...arr];
    for (let i=a.length-1;i>0;i--) {
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }

  function uniqueModules() {
    const counts = {};
    for (const s of stimuli) counts[s.module] = (counts[s.module] || 0) + 1;
    return Object.entries(counts);
  }

  async function initSetup() {
    moduleGrid.innerHTML = "";
    const saved = await DB.getSetting("selectedModules", null);
    const defaultSet = new Set(saved || uniqueModules().map(([m]) => m));
    for (const [module,count] of uniqueModules()) {
      const label = document.createElement("label");
      label.className = "module-card";
      label.innerHTML = `
        <input type="checkbox" data-module="${module}" ${defaultSet.has(module) ? "checked" : ""}>
        <span>
          <div class="module-title">${moduleLabels[module] || module}</div>
          <div class="module-count">${count} 条</div>
        </span>`;
      moduleGrid.appendChild(label);
    }

    variantRow.innerHTML = "";
    const savedVariants = await DB.getSetting("selectedVariants", cfg.audioVariants);
    const selected = new Set(savedVariants || cfg.audioVariants);
    for (const v of cfg.audioVariants) {
      const lab = document.createElement("label");
      lab.className = "variant-pill";
      lab.innerHTML = `<input type="checkbox" data-variant="${v}" ${selected.has(v) ? "checked" : ""}> ${v.replaceAll("_"," ")}`;
      variantRow.appendChild(lab);
    }

    const size = await DB.getSetting("sessionSize", cfg.sessionDefault);
    $("sessionSize").value = String(size);
  }

  function selectedModules() {
    return [...moduleGrid.querySelectorAll("input[data-module]:checked")].map(x => x.dataset.module);
  }
  function selectedVariants() {
    return [...variantRow.querySelectorAll("input[data-variant]:checked")].map(x => x.dataset.variant);
  }

  async function persistSetup() {
    await DB.setSetting("selectedModules", selectedModules());
    await DB.setSetting("selectedVariants", selectedVariants());
    await DB.setSetting("sessionSize", Number($("sessionSize").value));
  }

  function buildSession() {
    const mods = new Set(selectedModules());
    const pool = stimuli.filter(s => mods.has(s.module));
    const n = Number($("sessionSize").value);
    const shuffled = shuffle(pool);
    return n > 0 ? shuffled.slice(0, Math.min(n, shuffled.length)) : shuffled;
  }

  function audioPath(stimulus, variant) {
    // Audio files are flat in /audio:
    // audio/PC_0001__female_fast.mp3
    return `${cfg.audioBase}${stimulus.id}__${variant}.mp3`;
  }

  async function playCurrent() {
    if (!current) return;
    const vars = selectedVariants();
    if (!vars.length) {
      $("audioStatus").textContent = "未选择音频变体";
      return;
    }
    const variant = vars[Math.floor(Math.random()*vars.length)];
    current._playedVariant = variant;
    const src = audioPath(current, variant);
    audioPlayer.src = src;
    $("audioStatus").textContent = variant.replaceAll("_"," ");
    try {
      await audioPlayer.play();
    } catch (err) {
      $("audioStatus").textContent = `音频不可用：${src}`;
    }
  }

  function renderQuestion() {
    locked = false;
    wrongPaused = false;
    $("feedback").classList.add("hidden");
    current = session[index];
    if (!current) return finishSession();

    $("progressText").textContent = `${index+1} / ${session.length}`;
    $("moduleBadge").textContent = moduleLabels[current.module] || current.module;
    answers.innerHTML = "";

    const opts = shuffle([
      {text: current.target, correct: true, contrast: "CORRECT"},
      {text: current.distractor_1, correct: false, contrast: current.contrast_1 || "DISTRACTOR_1"},
      {text: current.distractor_2, correct: false, contrast: current.contrast_2 || "DISTRACTOR_2"},
      {text: current.distractor_3, correct: false, contrast: current.contrast_3 || "DISTRACTOR_3"}
    ]);

    for (const opt of opts) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "answer-btn";
      btn.textContent = opt.text;
      btn.addEventListener("click", () => answer(opt, btn));
      answers.appendChild(btn);
    }
    startedAt = performance.now();
    playCurrent();
  }

  async function answer(opt, clickedBtn) {
    if (locked) return;
    locked = true;
    const responseMs = Math.round(performance.now() - startedAt);
    const isCorrect = opt.correct;

    const trial = {
      timestamp: new Date().toISOString(),
      stimulus_id: current.id,
      module: current.module,
      subtype: current.subtype,
      difficulty: current.difficulty,
      correct: isCorrect ? 1 : 0,
      selected_answer: opt.text,
      correct_answer: current.target,
      response_ms: responseMs,
      audio_variant: current._playedVariant || "",
      construction_id: current.construction_id || "",
      cluster_family: current.cluster_family || "",
      cluster_surface: current.cluster_surface || "",
      frame: current.frame || "",
      semantic_type: current.semantic_type || "",
      acoustic_tags: current.acoustic_tags || "",
      error_contrast: isCorrect ? "" : opt.contrast,
      contrast_1: current.contrast_1 || "",
      contrast_2: current.contrast_2 || "",
      contrast_3: current.contrast_3 || ""
    };
    await DB.addTrial(trial);
    sessionResults.push(trial);

    if (isCorrect) {
      clickedBtn.classList.add("correct");
      setTimeout(nextQuestion, cfg.autoAdvanceCorrectMs);
      return;
    }

    wrongPaused = true;
    clickedBtn.classList.add("wrong");
    for (const btn of answers.querySelectorAll("button")) {
      btn.disabled = true;
      if (btn.textContent === current.target) btn.classList.add("correct");
    }
    $("feedbackText").textContent = current.text;
    $("feedbackAnswer").textContent = current.target;
    $("feedback").classList.remove("hidden");
  }

  function nextQuestion() {
    index += 1;
    renderQuestion();
  }

  function startSession() {
    const warning = $("setupWarning");
    warning.classList.add("hidden");
    if (!selectedModules().length) {
      warning.textContent = "至少选择一个刺激组。";
      warning.classList.remove("hidden");
      return;
    }
    if (!selectedVariants().length) {
      warning.textContent = "至少选择一个音频变体。";
      warning.classList.remove("hidden");
      return;
    }
    session = buildSession();
    if (!session.length) {
      warning.textContent = "当前筛选没有可用刺激。";
      warning.classList.remove("hidden");
      return;
    }
    persistSetup();
    index = 0;
    sessionResults = [];
    setupView.classList.add("hidden");
    summaryView.classList.add("hidden");
    trainView.classList.remove("hidden");
    renderQuestion();
  }

  function finishSession() {
    audioPlayer.pause();
    trainView.classList.add("hidden");
    summaryView.classList.remove("hidden");
    const total = sessionResults.length;
    const correct = sessionResults.filter(x => x.correct).length;
    const acc = total ? Math.round(correct/total*100) : 0;
    const avg = total ? Math.round(sessionResults.reduce((a,b)=>a+b.response_ms,0)/total) : 0;
    $("summaryStats").innerHTML = `
      <div class="stat-box"><div class="stat-value">${total}</div><div class="stat-label">完成</div></div>
      <div class="stat-box"><div class="stat-value">${acc}%</div><div class="stat-label">正确率</div></div>
      <div class="stat-box"><div class="stat-value">${total-correct}</div><div class="stat-label">错误</div></div>
      <div class="stat-box"><div class="stat-value">${(avg/1000).toFixed(1)}s</div><div class="stat-label">平均反应</div></div>`;
  }

  async function showStats() {
    const trials = await DB.getTrials();
    const content = $("statsContent");
    if (!trials.length) {
      content.innerHTML = `<p class="muted">还没有训练记录。</p>`;
      $("statsDialog").showModal(); return;
    }
    const total = trials.length;
    const correct = trials.filter(t=>t.correct).length;
    const moduleMap = {};
    const errorMap = {};
    for (const t of trials) {
      moduleMap[t.module] ||= {n:0,c:0};
      moduleMap[t.module].n++; moduleMap[t.module].c += Number(t.correct);
      if (!t.correct) errorMap[t.error_contrast || "OTHER"] = (errorMap[t.error_contrast || "OTHER"] || 0) + 1;
    }
    const modRows = Object.entries(moduleMap).map(([m,v]) =>
      `<tr><td>${moduleLabels[m] || m}</td><td>${v.n}</td><td>${Math.round(v.c/v.n*100)}%</td></tr>`).join("");
    const errRows = Object.entries(errorMap).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([k,v]) =>
      `<tr><td>${k}</td><td>${v}</td></tr>`).join("");
    content.innerHTML = `
      <div class="stats-grid">
        <div class="stat-box"><div class="stat-value">${total}</div><div class="stat-label">累计作答</div></div>
        <div class="stat-box"><div class="stat-value">${Math.round(correct/total*100)}%</div><div class="stat-label">累计正确率</div></div>
      </div>
      <h3>按模块</h3>
      <table><thead><tr><th>模块</th><th>次数</th><th>正确率</th></tr></thead><tbody>${modRows}</tbody></table>
      <h3>错误类型</h3>
      <table><thead><tr><th>contrast</th><th>次数</th></tr></thead><tbody>${errRows || `<tr><td colspan="2">暂无错误</td></tr>`}</tbody></table>`;
    $("statsDialog").showModal();
  }

  $("selectAllBtn").addEventListener("click", () => moduleGrid.querySelectorAll("input").forEach(x=>x.checked=true));
  $("clearAllBtn").addEventListener("click", () => moduleGrid.querySelectorAll("input").forEach(x=>x.checked=false));
  $("restoreBtn").addEventListener("click", initSetup);
  $("startBtn").addEventListener("click", startSession);
  $("replayBtn").addEventListener("click", playCurrent);
  $("nextBtn").addEventListener("click", () => { if (wrongPaused) nextQuestion(); });
  $("quitBtn").addEventListener("click", finishSession);
  $("againBtn").addEventListener("click", () => { summaryView.classList.add("hidden"); setupView.classList.remove("hidden"); });
  $("statsBtn").addEventListener("click", showStats);
  $("closeStatsBtn").addEventListener("click", () => $("statsDialog").close());

  DB.open().then(initSetup);
})();
