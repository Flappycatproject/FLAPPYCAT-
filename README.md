# FLAPPY CAT 🐱

Game arcade 2D side-scrolling, dibuat dengan HTML5 + CSS + JavaScript (Canvas), murni vanilla — tanpa framework, tanpa aset berbayar. Terinspirasi dari mekanik "tap-to-fly" tapi dengan karakter, rintangan, UI, dan audio orisinal buatan sendiri.

---

## 1. Struktur File Proyek

```
flappycat/
├── index.html      # Struktur halaman + semua layar UI (menu, HUD, pause, game over, settings)
├── style.css        # Semua styling UI (tombol, layar overlay, HUD)
├── audio.js          # AudioManager — SFX & musik dibuat prosedural via Web Audio API
├── entities.js       # Kelas Player, Obstacle, Particle, ParticleSystem, Cloud
├── game.js            # Game loop utama, state machine, fisika, tabrakan, skor
├── assets/
│   └── cat.png         # Sprite karakter kucing (dari gambarmu, background sudah dihapus)
└── README.md
```

**Alur kode:** `index.html` memuat `audio.js` → `entities.js` → `game.js` secara berurutan (karena `game.js` memakai kelas dari file lain). Semua logika terpisah per tanggung jawab (modular): audio terpisah dari entitas, entitas terpisah dari game loop.

---

## 2. Cara Menjalankan

Game ini adalah situs statis (tidak butuh backend), tapi browser modern **memblokir `fetch`/gambar dari `file://`**, jadi jalankan lewat local server:

**Di laptop/PC:**
```bash
cd flappycat
python3 -m http.server 8080
# lalu buka http://localhost:8080 di browser
```
atau pakai ekstensi "Live Server" di VS Code.

**Di HP Android (tanpa PC):**
1. Install aplikasi **Termux** dari F-Droid/Play Store.
2. Copy folder `flappycat` ke penyimpanan HP.
3. Jalankan:
   ```bash
   pkg install python
   cd /sdcard/flappycat
   python -m http.server 8080
   ```
4. Buka Chrome di HP yang sama, akses `http://localhost:8080`.

Kontrol: **ketuk layar** untuk terbang ke atas, lepas untuk jatuh karena gravitasi.

---

## 3. Cara Mengganti Karakter

1. Siapkan gambar baru berformat PNG dengan **background transparan**, ukuran disarankan sekitar 200×150px (rasio lebar:tinggi ±4:3).
2. Ganti file `assets/cat.png` dengan gambar barumu (nama file harus tetap `cat.png`, atau ubah juga path-nya).
3. Jika ingin ganti nama file, edit baris ini di `game.js`:
   ```js
   const catImage = new Image();
   catImage.src = 'assets/cat-baru.png'; // ganti path di sini
   ```
4. Jika proporsi gambar sangat berbeda, sesuaikan ukuran tampil di `entities.js` pada constructor `Player`:
   ```js
   this.width = 62;
   this.height = 46;
   ```

---

## 4. Cara Mengganti Background

Background digambar langsung lewat kode (tidak pakai file gambar), jadi tinggal edit fungsi `drawBackground()` dan `drawGround()` di `game.js`:

```js
function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, WORLD_H);
  sky.addColorStop(0, '#5fd0f0');   // warna atas langit — ganti sesuai selera
  sky.addColorStop(0.7, '#8fe3f5');
  sky.addColorStop(1, '#bdf0e8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  clouds.forEach(cl => cl.draw(ctx));
}
```

Untuk pakai **gambar background** (bukan gradasi kode), tambahkan:
```js
const bgImage = new Image();
bgImage.src = 'assets/background.png';
// lalu di drawBackground(): ctx.drawImage(bgImage, 0, 0, WORLD_W, WORLD_H);
```

Warna tanah/rumput ada di `drawGround()`, dan bentuk pilar rintangan ("kristal") ada di `entities.js` method `_drawCrystalPillar()` — ganti warna `hue` di constructor `Obstacle` untuk tema warna berbeda.

---

## 5. Cara Mengubah Tingkat Kesulitan

Semua parameter kesulitan dikumpulkan di satu tempat: object `CONFIG` di bagian atas `game.js`.

```js
const CONFIG = {
  gravity: 1400,                 // makin besar = jatuh makin cepat
  flapVelocity: -420,            // makin negatif = lompatan makin tinggi
  maxFallSpeed: 620,             // batas kecepatan jatuh maksimum
  baseSpeed: 165,                // kecepatan awal rintangan bergerak
  speedIncreasePerScore: 4,      // makin besar = permainan makin cepat tiap skor naik
  maxSpeed: 380,                 // batas atas kecepatan
  gapHeight: 210,                // celah antar pilar di awal (makin kecil = makin sulit)
  minGapHeight: 150,             // celah minimum saat skor tinggi
  gapShrinkPerScore: 1.2,        // seberapa cepat celah menyempit tiap skor
  pillarWidth: 78,
  pillarSpacingBase: 300,        // jarak antar pasang rintangan
};
```

Contoh: untuk membuat game **lebih mudah**, turunkan `gravity`, naikkan `gapHeight`/`minGapHeight`, dan turunkan `speedIncreasePerScore`.

---

## 6. Cara Membuat APK Android

Karena ini web app murni (HTML/CSS/JS), ada beberapa cara membungkusnya jadi APK:

### Opsi A — PWA Builder (paling mudah, tanpa install apapun)
1. Deploy folder `flappycat` ke hosting statis gratis (GitHub Pages, Netlify, Vercel, Firebase Hosting, dll).
2. Buka **https://www.pwabuilder.com**, masukkan URL situsmu.
3. Pilih platform **Android**, download paket APK/AAB yang dihasilkan.
4. (Opsional tapi disarankan) Tambahkan file `manifest.json` sederhana dan Service Worker agar dikenali sebagai PWA penuh — PWABuilder akan memandu ini otomatis.

### Opsi B — Capacitor (kontrol penuh, build lokal)
Butuh Node.js & Android Studio terpasang di komputer:
```bash
npm install -g @capacitor/cli
cd flappycat
npm init -y
npm install @capacitor/core @capacitor/android
npx cap init "Flappy Cat" "com.namamu.flappycat" --web-dir="."
npx cap add android
npx cap copy
npx cap open android
```
Ini akan membuka project di Android Studio → tinggal klik **Build > Build APK(s)**.

### Opsi C — Cordova
```bash
npm install -g cordova
cordova create flappycat-app com.namamu.flappycat "Flappy Cat"
# salin isi flappycat/ (html, css, js, assets) ke folder flappycat-app/www/
cd flappycat-app
cordova platform add android
cordova build android
```
APK hasil build ada di `platforms/android/app/build/outputs/apk/`.

> Catatan: Opsi A (PWABuilder) paling cepat untuk pemula dan tidak butuh Android Studio. Opsi B/C cocok kalau butuh akses fitur native tambahan (getar HP saat crash, notifikasi, dll) di masa depan.

---

## Catatan Teknis Tambahan

- **Audio** dibuat 100% prosedural lewat Web Audio API (oscillator), jadi tidak ada file .mp3/.wav sama sekali — aman dari isu hak cipta dan ringan (0 KB audio). Kalau mau pakai file audio sendiri nanti, tinggal ganti isi method `playFlap()`, `playScore()`, `playGameOver()`, dan `startMusic()` di `audio.js` dengan `new Audio('assets/nama-file.mp3').play()`.
- **High score** tersimpan di `localStorage` browser (`flappycat_highscore`), jadi tetap ada walau app ditutup.
- **Resolusi internal** game tetap 480×800 (potret) dan di-scale otomatis oleh CSS ke ukuran layar HP apa pun tanpa distorsi.
- Fisika dan kecepatan rintangan dihitung berbasis delta-time (bukan per-frame tetap), jadi kecepatan game tetap konsisten baik di HP 60Hz maupun 90/120Hz.
