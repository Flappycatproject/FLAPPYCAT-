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
