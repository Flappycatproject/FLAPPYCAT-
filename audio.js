/* ============================================================
   FLAPPY CAT - audio.js
   Semua suara dibuat secara PROSEDURAL memakai Web Audio API,
   jadi tidak ada file audio eksternal/berhak cipta yang dipakai.
   Silakan lihat bagian "GANTI AUDIO" di README untuk memakai
   file .mp3/.ogg sendiri jika mau.
   ============================================================ */

class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;

    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.volume = 0.6;

    this.musicTimer = null;
    this.musicStep = 0;

    this._loadSettings();
  }

  /* AudioContext harus dibuat setelah interaksi user pertama (kebijakan browser) */
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.volume;
    this.masterGain.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.35;
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 1.0;
    this.sfxGain.connect(this.masterGain);

    // AudioContext baru siap -> mulai musik latar jika diaktifkan
    this.startMusic();
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setVolume(v) {
    this.volume = v;
    if (this.masterGain) this.masterGain.gain.value = v;
    this._saveSettings();
  }

  setMusicEnabled(on) {
    this.musicEnabled = on;
    if (on) this.startMusic(); else this.stopMusic();
    this._saveSettings();
  }

  setSfxEnabled(on) {
    this.sfxEnabled = on;
    this._saveSettings();
  }

  /* --------- Efek suara (oscillator pendek) --------- */

  _tone(freq, duration, type = 'sine', startGain = 0.5, glide = null) {
    if (!this.ctx || !this.sfxEnabled) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glide) osc.frequency.exponentialRampToValueAtTime(glide, t0 + duration);
    gain.gain.setValueAtTime(startGain, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + duration);
  }

  playFlap() {
    // Kepakan sayap: nada naik cepat
    this._tone(420, 0.12, 'sine', 0.4, 720);
  }

  playScore() {
    // Berhasil lewati rintangan: dua nada ceria
    this._tone(660, 0.1, 'triangle', 0.35, 880);
    setTimeout(() => this._tone(990, 0.12, 'triangle', 0.3, 1200), 70);
  }

  playGameOver() {
    // Nada turun panjang
    this._tone(300, 0.5, 'sawtooth', 0.4, 80);
  }

  playClick() {
    this._tone(500, 0.06, 'square', 0.2, 500);
  }

  /* --------- Musik latar sederhana (loop melodi pendek) --------- */

  startMusic() {
    if (!this.ctx || !this.musicEnabled || this.musicTimer) return;
    const melody = [330, 392, 440, 392, 330, 392, 440, 494]; // pola nada sederhana
    const stepTime = 420; // ms per nada

    const playStep = () => {
      if (!this.musicEnabled) return;
      const freq = melody[this.musicStep % melody.length];
      const t0 = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.25, t0 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + stepTime / 1000);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(t0);
      osc.stop(t0 + stepTime / 1000);
      this.musicStep++;
    };

    playStep();
    this.musicTimer = setInterval(playStep, stepTime);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  /* --------- Simpan/ambil pengaturan dari localStorage --------- */

  _saveSettings() {
    try {
      localStorage.setItem('flappycat_audio', JSON.stringify({
        musicEnabled: this.musicEnabled,
        sfxEnabled: this.sfxEnabled,
        volume: this.volume
      }));
    } catch (e) { /* localStorage tidak tersedia, abaikan */ }
  }

  _loadSettings() {
    try {
      const raw = localStorage.getItem('flappycat_audio');
      if (raw) {
        const s = JSON.parse(raw);
        this.musicEnabled = s.musicEnabled ?? true;
        this.sfxEnabled = s.sfxEnabled ?? true;
        this.volume = s.volume ?? 0.6;
      }
    } catch (e) { /* abaikan */ }
  }
}
