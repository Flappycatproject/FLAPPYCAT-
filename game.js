/* ============================================================
   FLAPPY CAT - game.js
   File utama: mengatur game loop, state (menu/playing/pause/
   gameover), input, fisika, tabrakan, skor, dan rendering.
   ============================================================ */

(function () {
  'use strict';

  const WORLD_W = 480;
  const WORLD_H = 800;
  const GROUND_HEIGHT = 60;

  const CONFIG = {
    gravity: 1400,
    flapVelocity: -420,
    maxFallSpeed: 620,
    baseSpeed: 165,
    speedIncreasePerScore: 4,
    maxSpeed: 380,
    gapHeight: 210,
    minGapHeight: 150,
    gapShrinkPerScore: 1.2,
    pillarWidth: 78,
    pillarSpacingBase: 300,
  };

  const CHARACTERS = [
    { id: 'orange', name: 'Kucing Oranye', src: 'assets/cat.png' },
    { id: 'tuxedo', name: 'Kucing Tuxedo', src: 'assets/cat-tuxedo.png' },
    { id: 'calico', name: 'Kucing Belang Tiga', src: 'assets/cat-calico.png' },
    { id: 'graywhite', name: 'Kucing Abu-Putih', src: 'assets/cat-graywhite.png' },
    { id: 'cream', name: 'Kucing Krem', src: 'assets/cat-cream.png' },
    { id: 'tabby', name: 'Kucing Tabby', src: 'assets/cat-tabby.png' },
  ];

  const TRAILS = [
    { id: 'none', name: 'Tanpa Jejak' },
    { id: 'rainbow', name: 'Pelangi' },
    { id: 'fire', name: 'Api' },
    { id: 'gold', name: 'Bintang Emas' },
    { id: 'neon', name: 'Neon Hijau' },
    { id: 'galaxy', name: 'Galaksi Ungu' },
  ];

  const State = { MENU: 'menu', READY: 'ready', PLAYING: 'playing', PAUSED: 'paused', GAMEOVER: 'gameover' };
  let currentState = State.MENU;

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const screens = {
    menu: document.getElementById('menu-screen'),
    character: document.getElementById('character-screen'),
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

  const audio = new AudioManager();

  const HIGHSCORE_KEY = 'flappycat_highscore';
  function loadHighscore() {
    try { return parseInt(localStorage.getItem(HIGHSCORE_KEY) || '0', 10) || 0; }
    catch (e) { return 0; }
  }
  function saveHighscore(v) {
    try { localStorage.setItem(HIGHSCORE_KEY, String(v)); } catch (e) {}
  }
  let highscore = loadHighscore();

  const catImages = {};
  CHARACTERS.forEach((c) => {
    const img = new Image();
    img.src = c.src;
    catImages[c.id] = img;
  });

  const CHAR_KEY = 'flappycat_character';
  const TRAIL_KEY = 'flappycat_trail';
  function loadChoice(key, list, fallback) {
    try {
      const v = localStorage.getItem(key);
      if (v && list.some((item) => item.id === v)) return v;
    } catch (e) {}
    return fallback;
  }
  function saveChoice(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }
  let selectedCharacter = loadChoice(CHAR_KEY, CHARACTERS, 'orange');
  let selectedTrail = loadChoice(TRAIL_KEY, TRAILS, 'none');

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
    player = new Player(WORLD_W * 0.28, WORLD_H / 2, catImages[selectedCharacter]);
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

  const characterGridEl = document.getElementById('character-grid');
  const trailGridEl = document.getElementById('trail-grid');

  function renderCharacterGrid() {
    characterGridEl.innerHTML = '';
    CHARACTERS.forEach((c) => {
      const card = document.createElement('div');
      card.className = 'character-card' + (c.id === selectedCharacter ? ' selected' : '');
      card.innerHTML = '<img src="' + c.src + '" alt="' + c.name + '"><span>' + c.name + '</span>';
      card.addEventListener('click', () => {
        selectedCharacter = c.id;
        saveChoice(CHAR_KEY, c.id);
        audio.playClick();
        renderCharacterGrid();
        if (player) player.image = catImages[selectedCharacter];
      });
      characterGridEl.appendChild(card);
    });
  }

  function renderTrailGrid() {
    trailGridEl.innerHTML = '';
    TRAILS.forEach((t) => {
      const card = document.createElement('div');
      card.className = 'trail-card' + (t.id === selectedTrail ? ' selected' : '');
      card.innerHTML = '<div class="trail-swatch swatch-' + t.id + '"></div><span>' + t.name + '</span>';
      card.addEventListener('click', () => {
        selectedTrail = t.id;
        saveChoice(TRAIL_KEY, t.id);
        audio.playClick();
        renderTrailGrid();
      });
      trailGridEl.appendChild(card);
    });
  }

  renderCharacterGrid();
  renderTrailGrid();

  function resizeCanvas() {
    canvas.width = WORLD_W;
    canvas.height = WORLD_H;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

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

  function doFlap() {
    if (currentState === State.READY) {
      startPlaying(false);
    }
    if (currentState !== State.PLAYING) return;
    player.flap(CONFIG.flapVelocity / 60);
    audio.playFlap();
    particles.burstFlap(player.x + 6, player.y + player.height / 2);
  }

  function handlePointerDown(e) {
    if (e.target.closest('button, input, .overlay-screen')) return;
    audio.init();
    audio.resume();
    if (currentState === State.MENU) return;
    doFlap();
  }

  canvas.addEventListener('pointerdown', handlePointerDown);
  document.getElementById('game-container').addEventListener('pointerdown', (e) => {
    if (e.target === canvas) handlePointerDown(e);
  });

  document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

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

  document.getElementById('btn-character').addEventListener('click', () => {
    audio.init(); audio.playClick();
    showScreen('character');
  });
  document.getElementById('btn-character-back').addEventListener('click', () => {
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
    el.btnMute.textContent = nowMuted ? 'X' : 'M';
  });

  document.getElementById('btn-resume').addEventListener('click', () => { audio.playClick(); resumeGame(); });
  document.getElementById('btn-pause-menu').addEventListener('click', () => { audio.playClick(); goToMenu(); });

  document.getElementById('btn-retry').addEventListener('click', () => { audio.playClick(); startReady(); });
  document.getElementById('btn-gameover-menu').addEventListener('click', () => { audio.playClick(); goToMenu(); });

  document.getElementById('toggle-music').checked = audio.musicEnabled;
  document.getElementById('toggle-sfx').checked = audio.sfxEnabled;
  document.getElementById('volume-slider').value = Math.round(audio.volume * 100);
  el.btnMute.textContent = audio.volume > 0 ? 'M' : 'X';

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

  function circleRectCollide(cx, cy, cr, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return (dx * dx + dy * dy) < (cr * cr);
  }

  function checkCollisions() {
    const c = player.collider;

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
    clouds.forEach(cl => cl.update(dt, currentSpeed * 0.25, WORLD_W));

    if (currentState === State.READY) {
      player.bobPhase += dt * 0.08;
      player.y = WORLD_H / 2 + Math.sin(player.bobPhase) * 10;
      return;
    }

    if (currentState !== State.PLAYING) return;

    elapsedPlaying += dt;
    player.update(dt, CONFIG.gravity / 3600, CONFIG.maxFallSpeed / 60);

    distanceSinceLastPillar += currentSpeed * dt / 60;
    if (distanceSinceLastPillar >= CONFIG.pillarSpacingBase) {
      distanceSinceLastPillar = 0;
      spawnObstacle();
    }

    obstacles.forEach(o => o.update(dt, currentSpeed / 60));

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

    groundOffset -= currentSpeed * dt / 60;
    if (groundOffset < -40) groundOffset += 40;

    particles.update(dt);

    if (checkCollisions()) {
      gameOver();
    }
  }

  const SKY_BANDS = ['#8fe9ff', '#7de3fb', '#6ddaf5', '#5fd0f0', '#54c6ea', '#49bce3', '#3fb2dc'];

  function drawBackground() {
    const bandHeight = Math.ceil((WORLD_H - GROUND_HEIGHT) / SKY_BANDS.length);
    SKY_BANDS.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, i * bandHeight, WORLD_W, bandHeight + 1);
    });

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
    const block = 12;

    ctx.fillStyle = '#caa06a';
    ctx.fillRect(0, y, WORLD_W, GROUND_HEIGHT);

    ctx.fillStyle = '#7bc95a';
    ctx.fillRect(0, y, WORLD_W, block);
    ctx.fillStyle = '#69b04c';
    for (let x = groundOffset % block; x < WORLD_W; x += block * 2) {
      ctx.fillRect(x, y, block, 4);
    }

    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let x = groundOffset; x < WORLD_W; x += block * 3) {
      ctx.fillRect(x, y + block, block, GROUND_HEIGHT - block);
    }
  }

  function draw() {
    drawBackground();
    obstacles.forEach(o => o.draw(ctx));
    particles.draw(ctx);
    if (player) {
      player.drawTrail(ctx, selectedTrail, elapsedPlaying + performance.now() * 0.05);
      player.draw(ctx);
    }
    drawGround();
  }

  let lastTime = performance.now();

  function loop(now) {
    let delta = now - lastTime;
    lastTime = now;
    if (delta > 100) delta = 100;
    const dt = (delta / 1000) * 60;

    update(dt);
    draw();

    requestAnimationFrame(loop);
  }

  resetWorld();
  goToMenu();
  requestAnimationFrame(loop);

})();
