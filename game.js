/* ============================================================
   FLAPPY CAT - game.js
   File utama: mengatur game loop, state (menu/playing/pause/
   gameover), input, fisika, tabrakan, skor, dan rendering.
   ============================================================ */

(function () {
  'use strict';

  // ---------- Ukuran dunia internal (resolusi tetap, di-scale via CSS) ----------
  const WORLD_W = 480;
  const WORLD_H = 800;
  const GROUND_HEIGHT = 60;

  // ---------- Konstanta gameplay (bisa diubah untuk atur kesulitan) ----------
  const CONFIG = {
    gravity: 1400,          // px/detik^2
    flapVelocity: -420,     // px/detik
    maxFallSpeed: 620,      // px/detik
    baseSpeed: 165,         // px/detik, kecepatan awal rintangan
    speedIncreasePerScore: 4,   // penambahan kecepatan tiap 1 skor
    maxSpeed: 380,
    gapHeight: 210,         // celah antar pilar (px) - makin kecil makin sulit
    minGapHeight: 150,
    gapShrinkPerScore: 1.2,
    pillarWidth: 78,
    pillarSpacingBase: 300, // jarak horizontal antar pasang rintangan
  };

  // ---------- State global ----------
  const State = { MENU: 'menu', READY: 'ready', PLAYING: 'playing', PAUSED: 'paused', GAMEOVER: 'gameover' };
  let currentState = State.MENU;

  // ---------- Elemen DOM ----------
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false; // jaga sprite kucing & elemen pixel tetap tajam, tidak blur

  const screens = {
    menu: document.getElementById('menu-screen'),
    settings: document.getElementById('settings-screen'),
    hud: document.getElementById('hud'),
    pause: document.getElementById('pause-screen'),
    ready: document.getElementById('ready-screen'),
    gameover: document.getElementById('gameover-screen'),
  };

  const el = {
    menuHighscore: document.getElementById('menu-highscore-value'),
    scoreDisplay: document.getElementById('score-display'),
    finalScore: document.getElementById('final-score-value'),
    finalHighscore: document.getElementById('final-highscore-value'),
    newRecordBadge: document.getElementById('new-record-badge'),
    btnPause: document.getElementById('btn-pause'),
    btnMute: document.getElementById('btn-mute'),
  };

  // ---------- Audio ----------
  const audio = new AudioManager();

  // ---------- High score (localStorage) ----------
  const HIGHSCORE_KEY = 'flappycat_highscore';
  function loadHighscore() {
    try { return parseInt(localStorage.getItem(HIGHSCORE_KEY) || '0', 10) || 0; }
    catch (e) { return 0; }
  }
  function saveHighscore(v) {
    try { localStorage.setItem(HIGHSCORE_KEY, String(v)); } catch (e) { /* abaikan */ }
  }
  let highscore = loadHighscore();

  // ---------- Muat gambar karakter kucing ----------
  const catImage = new Image();
  catImage.src = 'assets/cat.png';

  // ---------- Entitas dunia ----------
  let player;
  let obstacles = [];
  let clouds = [];
  let particles = new ParticleSystem();
  let score = 0;
  let currentSpeed = CONFIG.baseSpeed;
  let distanceSinceLastPillar = 0;
  let groundOffset = 0;
  let elapsedPlaying = 0;

  function resetWorld() {
    player = new Player(WORLD_W * 0.28, WORLD_H / 2, catImage);
    obstacles = [];
    particles = new ParticleSystem();
    score = 0;
    currentSpeed = CONFIG.baseSpeed;
    distanceSinceLastPillar = 0;
    elapsedPlaying = 0;
    updateScoreDisplay();
  }

  function initClouds() {
    clouds = [];
    for (let i = 0; i < 6; i++) {
      clouds.push(new Cloud(
        Math.random() * WORLD_W,
        30 + Math.random() * 220,
        0.7 + Math.random() * 1.1,
        0.15 + Math.random() * 0.25
      ));
    }
  }
  initClouds();

  // ---------- Canvas responsif (menjaga resolusi internal tetap) ----------
  function resizeCanvas() {
    canvas.width = WORLD_W;
    canvas.height = WORLD_H;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // ============================================================
  // STATE TRANSITIONS
  // ============================================================
  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    if (name) screens[name].classList.remove('hidden');
  }

  function goToMenu() {
    currentState = State.MENU;
    resetWorld();
    el.menuHighscore.textContent = highscore;
    showScreen('menu');
    audio.startMusic();
  }

  function startReady() {
    currentState = State.READY;
    resetWorld();
    showScreen('ready');
    screens.hud.classList.remove('hidden');
  }

  function startPlaying(firstFlap) {
    currentState = State.PLAYING;
    showScreen(null);
    screens.hud.classList.remove('hidden');
    if (firstFlap) doFlap();
  }

  function pauseGame() {
    if (currentState !== State.PLAYING) return;
    currentState = State.PAUSED;
    showScreen('pause');
  }

  function resumeGame() {
    currentState = State.PLAYING;
    showScreen(null);
    screens.hud.classList.remove('hidden');
    lastTime = performance.now();
  }

  function gameOver() {
    if (currentState === State.GAMEOVER) return;
    currentState = State.GAMEOVER;
    audio.playGameOver();
    particles.burstCrash(player.x + player.width / 2, player.y + player.height / 2);

    const isNewRecord = score > highscore;
    if (isNewRecord) {
      highscore = score;
      saveHighscore(highscore);
    }

    el.finalScore.textContent = score;
    el.finalHighscore.textContent = highscore;
    el.newRecordBadge.classList.toggle('hidden', !isNewRecord);

    setTimeout(() => showScreen('gameover'), 550);
  }

  // ============================================================
  // INPUT
  // ============================================================
  function doFlap() {
    if (currentState === State.READY) {
      startPlaying(false);
    }
    if (currentState !== State.PLAYING) return;
    player.flap(CONFIG.flapVelocity / 60); // dikonversi ke skala per-frame di update
    audio.playFlap();
    particles.burstFlap(player.x + 6, player.y + player.height / 2);
  }

  function handlePointerDown(e) {
    // Jangan trigger flap jika sedang menekan tombol UI (menu/HUD)
    if (e.target.closest('button, input, .overlay-screen')) return;
    audio.init();
    audio.resume();
    if (currentState === State.MENU) return; // menu punya tombol sendiri
    doFlap();
  }

  canvas.addEventListener('pointerdown', handlePointerDown);
  document.getElementById('game-container').addEventListener('pointerdown', (e) => {
    if (e.target === canvas) handlePointerDown(e);
  });

  // Cegah scroll/zoom saat main di HP
  document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

  // ============================================================
  // TOMBOL UI
  // ============================================================
  document.getElementById('btn-play').addEventListener('click', () => {
    audio.init(); audio.resume(); audio.playClick();
    startReady();
  });

  document.getElementById('btn-settings').addEventListener('click', () => {
    audio.init(); audio.playClick();
    showScreen('settings');
  });
  document.getElementById('btn-settings-back').addEventListener('click', () => {
    audio.playClick();
    goToMenu();
  });

  document.getElementById('toggle-music').addEventListener('change', (e) => {
    audio.setMusicEnabled(e.target.checked);
  });
  document.getElementById('toggle-sfx').addEventListener('change', (e) => {
    audio.setSfxEnabled(e.target.checked);
  });
  document.getElementById('volume-slider').addEventListener('input', (e) => {
    audio.setVolume(e.target.value / 100);
  });
  document.getElementById('btn-reset-score').addEventListener('click', () => {
    highscore = 0;
    saveHighscore(0);
    el.menuHighscore.textContent = 0;
    audio.playClick();
  });

  el.btnPause.addEventListener('click', () => { audio.playClick(); pauseGame(); });
  el.btnMute.addEventListener('click', () => {
    const nowMuted = audio.volume > 0;
    audio.setVolume(nowMuted ? 0 : 0.6);
    el.btnMute.textContent = nowMuted ? '🔇' : '🔊';
  });

  document.getElementById('btn-resume').addEventListener('click', () => { audio.playClick(); resumeGame(); });
  document.getElementById('btn-pause-menu').addEventListener('click', () => { audio.playClick(); goToMenu(); });

  document.getElementById('btn-retry').addEventListener('click', () => { audio.playClick(); startReady(); });
  document.getElementById('btn-gameover-menu').addEventListener('click', () => { audio.playClick(); goToMenu(); });

  // Terapkan pengaturan tersimpan ke UI settings
  document.getElementById('toggle-music').checked = audio.musicEnabled;
  document.getElementById('toggle-sfx').checked = audio.sfxEnabled;
  document.getElementById('volume-slider').value = Math.round(audio.volume * 100);
  el.btnMute.textContent = audio.volume > 0 ? '🔊' : '🔇';

  // ============================================================
  // SPAWN RINTANGAN
  // ============================================================
  function spawnObstacle() {
    const gapHeight = Math.max(
      CONFIG.minGapHeight,
      CONFIG.gapHeight - score * CONFIG.gapShrinkPerScore
    );
    const margin = 90;
    const gapY = margin + Math.random() * (WORLD_H - GROUND_HEIGHT - margin * 2);
    obstacles.push(new Obstacle(
      WORLD_W + CONFIG.pillarWidth,
      gapY, gapHeight, CONFIG.pillarWidth, WORLD_H, GROUND_HEIGHT
    ));
  }

  // ============================================================
  // COLLISION DETECTION
  // ============================================================
  function circleRectCollide(cx, cy, cr, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return (dx * dx + dy * dy) < (cr * cr);
  }

  function checkCollisions() {
    const c = player.collider;

    // Batas atas & bawah arena
    if (c.y - c.r <= 0 || c.y + c.r >= WORLD_H - GROUND_HEIGHT) {
      return true;
    }

    for (const obs of obstacles) {
      for (const rect of obs.getRects()) {
        if (circleRectCollide(c.x, c.y, c.r, rect.x, rect.y, rect.w, rect.h)) {
          return true;
        }
      }
    }
    return false;
  }

  // ============================================================
  // UPDATE & RENDER
  // ============================================================
  function updateScoreDisplay() {
    el.scoreDisplay.textContent = score;
  }

  function updateDifficulty() {
    currentSpeed = Math.min(
      CONFIG.maxSpeed,
      CONFIG.baseSpeed + score * CONFIG.speedIncreasePerScore
    );
  }

  function update(dt) {
    // dt dalam "frame units" (1 = 1/60 detik) supaya gerakan stabil di semua FPS
    clouds.forEach(cl => cl.update(dt, currentSpeed * 0.25, WORLD_W));

    if (currentState === State.READY) {
      // Kucing melayang idle sambil menunggu ketukan pertama
      player.bobPhase += dt * 0.08;
      player.y = WORLD_H / 2 + Math.sin(player.bobPhase) * 10;
      return;
    }

    if (currentState !== State.PLAYING) return;

    elapsedPlaying += dt;
    player.update(dt, CONFIG.gravity / 3600, CONFIG.maxFallSpeed / 60);

    // Spawn rintangan berbasis jarak tempuh, bukan waktu -> konsisten dgn kecepatan
    distanceSinceLastPillar += currentSpeed * dt / 60;
    if (distanceSinceLastPillar >= CONFIG.pillarSpacingBase) {
      distanceSinceLastPillar = 0;
      spawnObstacle();
    }

    obstacles.forEach(o => o.update(dt, currentSpeed / 60));

    // Cek skor: rintangan terlewati saat pilar sudah di belakang kucing
    for (const obs of obstacles) {
      if (!obs.passed && obs.x + obs.width < player.x) {
        obs.passed = true;
        score++;
        updateScoreDisplay();
        audio.playScore();
        particles.burstScore(player.x + 30, player.y + player.height / 2);
        updateDifficulty();
      }
    }

    obstacles = obstacles.filter(o => !o.isOffscreen());

    // Ground scroll offset untuk animasi tanah bergerak
    groundOffset -= currentSpeed * dt / 60;
    if (groundOffset < -40) groundOffset += 40;

    particles.update(dt);

    if (checkCollisions()) {
      gameOver();
    }
  }

  // Warna langit disusun sebagai pita-pita solid (bukan gradasi halus)
  // supaya terasa "pixel/8-bit", senada dengan sprite kucing.
  const SKY_BANDS = ['#8fe9ff', '#7de3fb', '#6ddaf5', '#5fd0f0', '#54c6ea', '#49bce3', '#3fb2dc'];

  function drawBackground() {
    const bandHeight = Math.ceil((WORLD_H - GROUND_HEIGHT) / SKY_BANDS.length);
    SKY_BANDS.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, i * bandHeight, WORLD_W, bandHeight + 1);
    });

    // Matahari pixel kecil di pojok atas
    ctx.fillStyle = '#fff3b0';
    const sunX = WORLD_W - 70, sunY = 70, sunS = 8;
    const sunPattern = [
      [0,1,1,0],
      [1,1,1,1],
      [1,1,1,1],
      [0,1,1,0],
    ];
    sunPattern.forEach((row, ry) => row.forEach((cell, rx) => {
      if (cell) ctx.fillRect(sunX + rx * sunS, sunY + ry * sunS, sunS + 1, sunS + 1);
    }));

    clouds.forEach(cl => cl.draw(ctx));
  }

  function drawGround() {
    const y = WORLD_H - GROUND_HEIGHT;
    const block = 12; // ukuran blok pixel tanah

    // Tanah dasar (blok solid, tanpa gradasi)
    ctx.fillStyle = '#caa06a';
    ctx.fillRect(0, y, WORLD_W, GROUND_HEIGHT);

    // Rumput pixel di lapisan atas tanah
    ctx.fillStyle = '#7bc95a';
    ctx.fillRect(0, y, WORLD_W, block);
    ctx.fillStyle = '#69b04c';
    for (let x = groundOffset % block; x < WORLD_W; x += block * 2) {
      ctx.fillRect(x, y, block, 4); // rumpun rumput kecil selang-seling
    }

    // Kotak-kotak pixel bergerak di badan tanah (efek scrolling ubin)
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let x = groundOffset; x < WORLD_W; x += block * 3) {
      ctx.fillRect(x, y + block, block, GROUND_HEIGHT - block);
    }
  }

  function draw() {
    drawBackground();
    obstacles.forEach(o => o.draw(ctx));
    particles.draw(ctx);
    if (player) player.draw(ctx);
    drawGround();
  }

  // ============================================================
  // GAME LOOP (timestep dinormalisasi ke basis 60 FPS -> "dt" unit)
  // ============================================================
  let lastTime = performance.now();

  function loop(now) {
    let delta = now - lastTime;
    lastTime = now;
    if (delta > 100) delta = 100; // hindari lompatan besar (tab tidak aktif, dsb)
    const dt = (delta / 1000) * 60; // dt=1 berarti 1 frame @60fps

    update(dt);
    draw();

    requestAnimationFrame(loop);
  }

  // ============================================================
  // INISIALISASI
  // ============================================================
  resetWorld();
  goToMenu();
  requestAnimationFrame(loop);

})();
