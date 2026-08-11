/* ============================================================
   FLAPPY CAT - entities.js
   Berisi kelas-kelas untuk objek dalam game:
   Player (kucing terbang), Obstacle (pilar kristal), Particle,
   dan Cloud (lapisan awan latar belakang).
   ============================================================ */

/* ================= PLAYER ================= */
class Player {
  constructor(x, y, image) {
    this.x = x;
    this.y = y;
    this.width = 62;
    this.height = 46;
    this.image = image;

    this.velocityY = 0;
    this.rotation = 0;

    // Untuk animasi "mengepak" sederhana (bob & squash-stretch)
    this.flapTimer = 0;
    this.flapScale = 1;
    this.bobPhase = Math.random() * Math.PI * 2;
  }

  // Radius collider lingkaran (lebih adil daripada kotak penuh)
  get collider() {
    return {
      x: this.x + this.width / 2,
      y: this.y + this.height / 2,
      r: Math.min(this.width, this.height) * 0.36
    };
  }

  flap(flapVelocity) {
    this.velocityY = flapVelocity;
    this.flapTimer = 0.18; // durasi animasi kepak
  }

  update(dt, gravity, maxFallSpeed) {
    this.velocityY += gravity * dt;
    if (this.velocityY > maxFallSpeed) this.velocityY = maxFallSpeed;
    this.y += this.velocityY * dt;

    // Rotasi mengikuti kecepatan vertikal (menukik saat jatuh, mendongak saat naik)
    const targetRotation = Math.max(-0.5, Math.min(0.9, this.velocityY / 12));
    this.rotation += (targetRotation - this.rotation) * 0.15;

    // Animasi kepak: sedikit membesar lalu kembali normal
    if (this.flapTimer > 0) {
      this.flapTimer -= dt / 60;
      this.flapScale = 1 + Math.sin((0.18 - this.flapTimer) / 0.18 * Math.PI) * 0.12;
    } else {
      this.flapScale = 1;
    }

    // Bobbing halus saat idle di menu
    this.bobPhase += dt * 0.06;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
    ctx.rotate(this.rotation);
    ctx.scale(this.flapScale, 1 / this.flapScale);
    if (this.image && this.image.complete) {
      ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height);
    } else {
      // Fallback jika gambar belum termuat: gambar bentuk sederhana
      ctx.fillStyle = '#ff9f43';
      ctx.beginPath();
      ctx.ellipse(0, 0, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/* ================= OBSTACLE (pasangan pilar kristal) ================= */
class Obstacle {
  constructor(x, gapY, gapHeight, width, canvasHeight, groundHeight) {
    this.x = x;
    this.width = width;
    this.gapY = gapY;             // titik tengah celah
    this.gapHeight = gapHeight;
    this.canvasHeight = canvasHeight;
    this.groundHeight = groundHeight;
    this.passed = false;

    // Variasi warna kristal supaya tiap pilar terasa unik
    const hueShift = Math.random() * 30 - 15;
    this.hue = 265 + hueShift; // ungu-biru kristal
  }

  get topHeight() { return this.gapY - this.gapHeight / 2; }
  get bottomY() { return this.gapY + this.gapHeight / 2; }
  get bottomHeight() {
    return this.canvasHeight - this.groundHeight - this.bottomY;
  }

  update(dt, speed) {
    this.x -= speed * dt;
  }

  isOffscreen() {
    return this.x + this.width < -10;
  }

  /* Kotak collider untuk pilar atas & bawah */
  getRects() {
    return [
      { x: this.x, y: 0, w: this.width, h: this.topHeight },
      { x: this.x, y: this.bottomY, w: this.width, h: this.bottomHeight }
    ];
  }

  _drawCrystalPillar(ctx, x, y, w, h, pointingDown) {
    // Pilar kristal fantasi: bentuk poligon runcing dengan gradasi & facet
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0, `hsl(${this.hue}, 70%, 35%)`);
    grad.addColorStop(0.5, `hsl(${this.hue}, 80%, 58%)`);
    grad.addColorStop(1, `hsl(${this.hue}, 70%, 35%)`);

    ctx.save();
    ctx.fillStyle = grad;
    ctx.strokeStyle = `hsl(${this.hue}, 60%, 20%)`;
    ctx.lineWidth = 3;

    const tipSize = 18;
    ctx.beginPath();
    if (!pointingDown) {
      // Pilar dari atas, ujung runcing menghadap ke bawah (ke arah celah)
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + h - tipSize);
      ctx.lineTo(x + w / 2, y + h);
      ctx.lineTo(x, y + h - tipSize);
    } else {
      // Pilar dari bawah, ujung runcing menghadap ke atas
      ctx.moveTo(x, y + h);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x + w, y + tipSize);
      ctx.lineTo(x + w / 2, y);
      ctx.lineTo(x, y + tipSize);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Facet highlight tengah supaya terlihat seperti kristal
    ctx.fillStyle = `hsla(${this.hue}, 90%, 85%, 0.35)`;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.35, y + (pointingDown ? tipSize : 0));
    ctx.lineTo(x + w * 0.55, y + (pointingDown ? tipSize : 0));
    ctx.lineTo(x + w * 0.5, y + h - (pointingDown ? 0 : tipSize));
    ctx.lineTo(x + w * 0.3, y + h - (pointingDown ? 0 : tipSize));
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  draw(ctx) {
    // Pilar atas (menggantung dari langit-langit)
    this._drawCrystalPillar(ctx, this.x, 0, this.width, this.topHeight, false);
    // Pilar bawah (tumbuh dari tanah)
    this._drawCrystalPillar(ctx, this.x, this.bottomY, this.width, this.bottomHeight, true);
  }
}

/* ================= PARTICLE (efek sederhana) ================= */
class Particle {
  constructor(x, y, color, opts = {}) {
    this.x = x;
    this.y = y;
    this.vx = opts.vx ?? (Math.random() - 0.5) * 2;
    this.vy = opts.vy ?? (Math.random() - 0.5) * 2;
    this.size = opts.size ?? (2 + Math.random() * 3);
    this.color = color;
    this.life = opts.life ?? 1;
    this.maxLife = this.life;
    this.gravity = opts.gravity ?? 0;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += this.gravity * dt;
    this.life -= dt / 60;
  }

  get isDead() { return this.life <= 0; }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  burstFlap(x, y) {
    for (let i = 0; i < 4; i++) {
      this.particles.push(new Particle(x, y, 'rgba(255,255,255,0.8)', {
        vx: -1 - Math.random() * 1.5,
        vy: (Math.random() - 0.5) * 2,
        size: 2 + Math.random() * 2,
        life: 0.5,
        gravity: 0.02
      }));
    }
  }

  burstScore(x, y) {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      this.particles.push(new Particle(x, y, `hsl(${40 + Math.random() * 20}, 90%, 65%)`, {
        vx: Math.cos(angle) * (1 + Math.random() * 2),
        vy: Math.sin(angle) * (1 + Math.random() * 2),
        size: 3 + Math.random() * 2,
        life: 0.8
      }));
    }
  }

  burstCrash(x, y) {
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      this.particles.push(new Particle(x, y, `hsl(${20 + Math.random() * 20}, 90%, 60%)`, {
        vx: Math.cos(angle) * (1 + Math.random() * 4),
        vy: Math.sin(angle) * (1 + Math.random() * 4) - 1,
        size: 2 + Math.random() * 3,
        life: 1,
        gravity: 0.08
      }));
    }
  }

  update(dt) {
    this.particles.forEach(p => p.update(dt));
    this.particles = this.particles.filter(p => !p.isDead);
  }

  draw(ctx) {
    this.particles.forEach(p => p.draw(ctx));
  }
}

/* ================= CLOUD (awan pixel art, lapisan parallax) ================= */
// Pola awan digambar sebagai grid blok kotak (gaya 8-bit / pixel art),
// senada dengan sprite kucing yang juga bergaya pixel.
const CLOUD_PIXEL_PATTERN = [
  [0, 0, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
];

class Cloud {
  constructor(x, y, scale, speedFactor) {
    this.x = x;
    this.y = y;
    this.scale = scale;
    this.speedFactor = speedFactor; // <1 = lebih lambat (jauh), untuk efek parallax
    this.pixelSize = 6;
  }

  get widthPx() {
    return CLOUD_PIXEL_PATTERN[0].length * this.pixelSize * this.scale;
  }

  update(dt, baseSpeed, canvasWidth) {
    this.x -= baseSpeed * this.speedFactor * dt;
    if (this.x < -this.widthPx - 20) {
      this.x = canvasWidth + 20;
      this.y = 30 + Math.random() * 160;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    const s = this.pixelSize * this.scale;

    CLOUD_PIXEL_PATTERN.forEach((row, ry) => {
      row.forEach((cell, rx) => {
        if (!cell) return;
        const px = this.x + rx * s;
        const py = this.y + ry * s;
        // Sisi bawah blok diberi warna sedikit lebih gelap untuk kesan shading pixel art
        const isBottomEdge = ry === CLOUD_PIXEL_PATTERN.length - 1 || !CLOUD_PIXEL_PATTERN[ry + 1]?.[rx];
        ctx.fillStyle = isBottomEdge ? '#d8f0f7' : '#ffffff';
        ctx.fillRect(Math.round(px), Math.round(py), s + 1, s + 1);
      });
    });

    ctx.restore();
  }
}
