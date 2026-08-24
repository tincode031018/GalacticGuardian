/**
 * PRELOAD SCENE
 * Quản lý nạp tất cả tài nguyên hình ảnh phi thuyền, hành tinh, phi hành gia, và âm thanh
 */

// Sound FX Synth Manager using Web Audio API
window.soundFX = {
    ctx: null,
    muted: false,
    init() {
        if (this.ctx) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        } catch (e) {
            console.warn('Web Audio error:', e);
        }
    },
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },
    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    },
    playLaser(pitch = 1) {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(900 * pitch, now);
        osc.frequency.exponentialRampToValueAtTime(100 * pitch, now + 0.12);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
    },
    playEnemyLaser() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(480, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
    },
    playExplosion(isLarge = false) {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const dur = isLarge ? 0.6 : 0.3;
        const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(isLarge ? 700 : 1200, now);
        filter.frequency.exponentialRampToValueAtTime(40, now + dur);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(isLarge ? 0.45 : 0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        src.start(now);
        src.stop(now + dur);
    },
    playRescue() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const t = now + i * 0.08;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, t);
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.2);
        });
    },
    playPowerup() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(960, now + 0.25);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
    },
    playUltimate() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.linearRampToValueAtTime(1400, now + 0.35);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.7);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.7);
        this.playExplosion(true);
    },
    playTractorBeam() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(1100, now + 0.35);
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
    },
    playCaptureSound() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(1350, now + 0.25);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
    },
    playBossAlarm() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        for (let i = 0; i < 3; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const start = now + i * 0.22;
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(580, start);
            osc.frequency.setValueAtTime(380, start + 0.1);
            gain.gain.setValueAtTime(0.25, start);
            gain.gain.exponentialRampToValueAtTime(0.01, start + 0.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(start);
            osc.stop(start + 0.2);
        }
    },
    playAstronautSOS() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.setValueAtTime(1100, now + 0.08);
        osc.frequency.setValueAtTime(800, now + 0.16);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
    }
};

// DÉTECTION MODE FILE:// (mở index trực tiếp sans server):
// Phaser charge les images via XHR par défaut, mais le navigateur bloque XHR avec file://
// → On bascule vers un chargement manuel (HTMLImageElement, sans XHR ni CORS) dans create()
const IS_LOCAL = (typeof window !== 'undefined') && window.location.protocol === 'file:';

class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene' });
    }

    preload() {
        // MODE file:// (mở index trực tiếp): KHÔNG nạp via this.load.image
        // (Phaser tải via XHR, cấm trên file://) → nạp faite manuellement dans create()
        if (IS_LOCAL) return;

        const { width, height } = this.scale;

        // Background loading screen
        this.cameras.main.setBackgroundColor('#030712');

        // Loading title
        const titleText = this.add.text(width / 2, height / 2 - 60, 'GALACTIC SHOOTER', {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '28px',
            fontWeight: '900',
            color: '#00f0ff'
        }).setOrigin(0.5);

        const statusText = this.add.text(width / 2, height / 2 - 20, 'ĐANG TẢI DỮ LIỆU...', {
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: '18px',
            color: '#94a3b8'
        }).setOrigin(0.5);

        // Progress bar container
        const barWidth = Math.min(width * 0.7, 320);
        const barHeight = 12;
        const progressBox = this.add.graphics();
        const progressBar = this.add.graphics();

        progressBox.fillStyle(0x0f172a, 0.8);
        progressBox.fillRoundedRect(width / 2 - barWidth / 2, height / 2 + 20, barWidth, barHeight, 6);
        progressBox.lineStyle(1, 0x00f0ff, 0.5);
        progressBox.strokeRoundedRect(width / 2 - barWidth / 2, height / 2 + 20, barWidth, barHeight, 6);

        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0x00f0ff, 1);
            progressBar.fillRoundedRect(width / 2 - barWidth / 2 + 2, height / 2 + 22, (barWidth - 4) * value, barHeight - 4, 4);
            statusText.setText(`ĐANG TẢI... ${Math.floor(value * 100)}%`);
        });

        // CACHE-BUST (chỉ chạy ở chế độ http:// qua server .bat) để trình duyệt
        // luôn tải ảnh mới nhất, tránh giữ ảnh cũ/trắng trong cache
        const cacheBust = '?v=' + Date.now();

        this.load.image('player1a', 'assets/phithuyen/player1a.png' + cacheBust);
        this.load.image('player1b', 'assets/phithuyen/player1b.png' + cacheBust);
        this.load.image('player2a', 'assets/phithuyen/player2a.png' + cacheBust);
        this.load.image('player2b', 'assets/phithuyen/player2b.png' + cacheBust);
        this.load.image('enemy1a', 'assets/phithuyen/enemy1a.png' + cacheBust);
        this.load.image('enemy1b', 'assets/phithuyen/enemy1b.png' + cacheBust);
        this.load.image('enemy2a', 'assets/phithuyen/enemy2a.png' + cacheBust);
        this.load.image('enemy2b', 'assets/phithuyen/enemy2b.png' + cacheBust);
        this.load.image('enemy3a', 'assets/phithuyen/enemy3a.png' + cacheBust);
        this.load.image('enemy3b', 'assets/phithuyen/enemy3b.png' + cacheBust);
        this.load.image('boss1a', 'assets/phithuyen/boss1a.png' + cacheBust);
        this.load.image('boss1b', 'assets/phithuyen/boss1b.png' + cacheBust);
        this.load.image('boss2a', 'assets/phithuyen/boss2a.png' + cacheBust);
        this.load.image('boss2b', 'assets/phithuyen/boss2b.png' + cacheBust);
        this.load.image('rocket', 'assets/phithuyen/rocket.png' + cacheBust);

        // 1.5 Nền Round 2/3 - Góc nhìn từ trên xuống (Top-Down View Background)
        this.load.image('background2', 'assets/phithuyen/background2.jpg' + cacheBust);

        // 2. Nạp Sprites Hành Tinh, Phi Hành Gia, Vệ Tinh từ assets/vatthe/
        this.load.image('phihanhgia', 'assets/vatthe/phihanhgia.png' + cacheBust);
        this.load.image('traidat', 'assets/vatthe/traidat.png' + cacheBust);
        this.load.image('saohoa', 'assets/vatthe/saohoa.png' + cacheBust);
        this.load.image('saotho', 'assets/vatthe/saotho.png' + cacheBust);
        this.load.image('saothuy', 'assets/vatthe/saothuy.png' + cacheBust);
        this.load.image('hanhtinh3', 'assets/vatthe/hanhtinh3.png' + cacheBust);
        this.load.image('hanhtinh4', 'assets/vatthe/hanhtinh4.png' + cacheBust);
        this.load.image('vetinh', 'assets/vatthe/vetinh.png' + cacheBust);
    }

    create() {
        // Tự động sinh các Texture Đạn Laser và Texture Hạt (Particle Textures) par Canvas
        this.generateLaserTextures();
        this.generateParticleTextures();

        // Khởi tạo Web Audio khi người dùng chạm lần đầu
        this.input.once('pointerdown', () => {
            window.soundFX.init();
            window.soundFX.resume();
        });

        // MODE file:// : tải sprite manuellement (HTMLImageElement, SANS XHR/CORS) → pas de sprites manquants
        if (IS_LOCAL) {
            this.loadLocalSpritesManually();
            return;
        }

        // Chuyển sang MenuScene (normal http:// server)
        this.scene.start('MenuScene');
    }

    /**
     * TẢI SPRITE BY HTMLImageElement + CanvasTexture (UNIQUEMENT pour file://)
     * - HTMLImageElement n'utilise pas XHR → marche sur file:// contrairement à cet loader Phaser
     * - La texture est créée via textures.createCanvas, utilisable comme une texture normal (add.image, physics sprite...)
     */
    async loadLocalSpritesManually() {
        const entries = [
            ['player1a', 'assets/phithuyen/player1a.png'],
            ['player1b', 'assets/phithuyen/player1b.png'],
            ['player2a', 'assets/phithuyen/player2a.png'],
            ['player2b', 'assets/phithuyen/player2b.png'],
            ['enemy1a', 'assets/phithuyen/enemy1a.png'],
            ['enemy1b', 'assets/phithuyen/enemy1b.png'],
            ['enemy2a', 'assets/phithuyen/enemy2a.png'],
            ['enemy2b', 'assets/phithuyen/enemy2b.png'],
            ['enemy3a', 'assets/phithuyen/enemy3a.png'],
            ['enemy3b', 'assets/phithuyen/enemy3b.png'],
            ['boss1a', 'assets/phithuyen/boss1a.png'],
            ['boss1b', 'assets/phithuyen/boss1b.png'],
            ['boss2a', 'assets/phithuyen/boss2a.png'],
            ['boss2b', 'assets/phithuyen/boss2b.png'],
            ['rocket', 'assets/phithuyen/rocket.png'],
            ['background2', 'assets/phithuyen/background2.jpg'],
            ['phihanhgia', 'assets/vatthe/phihanhgia.png'],
            ['traidat', 'assets/vatthe/traidat.png'],
            ['saohoa', 'assets/vatthe/saohoa.png'],
            ['saotho', 'assets/vatthe/saotho.png'],
            ['saothuy', 'assets/vatthe/saothuy.png'],
            ['hanhtinh3', 'assets/vatthe/hanhtinh3.png'],
            ['hanhtinh4', 'assets/vatthe/hanhtinh4.png'],
            ['vetinh', 'assets/vatthe/vetinh.png']
        ];

        // Décodage séquentiel (simpl & robuste pour compatibility)
        await Promise.all(entries.map(([key, url]) => this.loadSingleLocalImage(key, url)));

        // Textes & UI éventuelles déjà prêtes → aller MenuScene
        this.scene.start('MenuScene');
    }

    loadSingleLocalImage(key, url) {
        return new Promise((resolve) => {
            try {
                const img = new Image();
                img.src = url;
                const onOk = () => {
                    const w = img.naturalWidth || img.width || 1;
                    const h = img.naturalHeight || img.height || 1;
                    const tex = this.textures.createCanvas(key, w, h);
                    tex.context.drawImage(img, 0, 0, w, h);
                    tex.refresh();
                    resolve();
                };
                img.onload = onOk;
                img.onerror = () => { console.log('[local-load] échec optionnel:', key); resolve(); };
            } catch (e) {
                console.log('[local-load] erreur:', key, e);
                resolve();
            }
        });
    }

    generateLaserTextures() {
        // 1. Đạn Laser Người Chơi Dọc (Vertical Laser - Cyan Glow)
        const pLaserV = this.textures.createCanvas('bullet_player_v', 16, 40);
        const ctxPV = pLaserV.context;
        const gradPV = ctxPV.createLinearGradient(0, 0, 16, 0);
        gradPV.addColorStop(0, 'rgba(0, 240, 255, 0)');
        gradPV.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
        gradPV.addColorStop(1, 'rgba(0, 240, 255, 0)');
        ctxPV.fillStyle = gradPV;
        ctxPV.fillRect(2, 0, 12, 40);
        pLaserV.refresh();

        // 2. Đạn Laser Người Chơi Ngang (Horizontal Laser - Cyan Glow)
        const pLaserH = this.textures.createCanvas('bullet_player_h', 40, 16);
        const ctxPH = pLaserH.context;
        const gradPH = ctxPH.createLinearGradient(0, 0, 0, 16);
        gradPH.addColorStop(0, 'rgba(0, 240, 255, 0)');
        gradPH.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
        gradPH.addColorStop(1, 'rgba(0, 240, 255, 0)');
        ctxPH.fillStyle = gradPH;
        ctxPH.fillRect(0, 2, 40, 12);
        pLaserH.refresh();

        // 3. Đạn Kẻ Thù Lính Dọc - Nhỏ gọn, thanh mảnh (Vertical Enemy Bullet - Small Sleek Dart)
        const eLaserV = this.textures.createCanvas('bullet_enemy_v', 8, 20);
        const ctxEV = eLaserV.context;
        const gradEV = ctxEV.createLinearGradient(0, 0, 8, 0);
        gradEV.addColorStop(0, 'rgba(255, 50, 0, 0)');
        gradEV.addColorStop(0.5, '#ffffff');
        gradEV.addColorStop(1, 'rgba(255, 50, 0, 0)');
        ctxEV.fillStyle = gradEV;
        ctxEV.fillRect(1, 0, 6, 20);
        // Core glow
        ctxEV.fillStyle = '#ff2200';
        ctxEV.fillRect(2, 4, 4, 12);
        eLaserV.refresh();

        // 4. Đạn Kẻ Thù Lính Ngang - Nhỏ gọn, thanh mảnh (Horizontal Enemy Bullet - Small Sleek Dart)
        const eLaserH = this.textures.createCanvas('bullet_enemy_h', 20, 8);
        const ctxEH = eLaserH.context;
        const gradEH = ctxEH.createLinearGradient(0, 0, 0, 8);
        gradEH.addColorStop(0, 'rgba(255, 50, 0, 0)');
        gradEH.addColorStop(0.5, '#ffffff');
        gradEH.addColorStop(1, 'rgba(255, 50, 0, 0)');
        ctxEH.fillStyle = gradEH;
        ctxEH.fillRect(0, 1, 20, 6);
        // Core glow
        ctxEH.fillStyle = '#ff2200';
        ctxEH.fillRect(4, 2, 12, 4);
        eLaserH.refresh();

        // 5. Đạn Cầu Năng Lượng Boss - To lớn, uy lực (Boss Plasma Orb - Big & Heavy)
        const bossOrb = this.textures.createCanvas('bullet_boss_orb', 36, 36);
        const ctxBO = bossOrb.context;
        const gradBO = ctxBO.createRadialGradient(18, 18, 4, 18, 18, 18);
        gradBO.addColorStop(0, '#ffffff');
        gradBO.addColorStop(0.3, '#ff0055');
        gradBO.addColorStop(0.8, '#aa00ff');
        gradBO.addColorStop(1, 'rgba(170, 0, 255, 0)');
        ctxBO.fillStyle = gradBO;
        ctxBO.fillRect(0, 0, 36, 36);
        bossOrb.refresh();

        // 6. TIA LAZER KHỔNG LỒ XANH DƯƠNG (GIANT BLUE LASER BEAM - DỌC & NGANG)
        const beamV = this.textures.createCanvas('laser_giant_blue_v', 64, 600);
        const ctxBV = beamV.context;
        const gradBV = ctxBV.createLinearGradient(0, 0, 64, 0);
        gradBV.addColorStop(0, 'rgba(0, 100, 255, 0)');
        gradBV.addColorStop(0.2, 'rgba(0, 180, 255, 0.6)');
        gradBV.addColorStop(0.4, 'rgba(0, 240, 255, 0.95)');
        gradBV.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
        gradBV.addColorStop(0.6, 'rgba(0, 240, 255, 0.95)');
        gradBV.addColorStop(0.8, 'rgba(0, 180, 255, 0.6)');
        gradBV.addColorStop(1, 'rgba(0, 100, 255, 0)');
        ctxBV.fillStyle = gradBV;
        ctxBV.fillRect(0, 0, 64, 600);
        beamV.refresh();

        const beamH = this.textures.createCanvas('laser_giant_blue_h', 1000, 64);
        const ctxBH = beamH.context;
        const gradBH = ctxBH.createLinearGradient(0, 0, 0, 64);
        gradBH.addColorStop(0, 'rgba(0, 100, 255, 0)');
        gradBH.addColorStop(0.2, 'rgba(0, 180, 255, 0.6)');
        gradBH.addColorStop(0.4, 'rgba(0, 240, 255, 0.95)');
        gradBH.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
        gradBH.addColorStop(0.6, 'rgba(0, 240, 255, 0.95)');
        gradBH.addColorStop(0.8, 'rgba(0, 180, 255, 0.6)');
        gradBH.addColorStop(1, 'rgba(0, 100, 255, 0)');
        ctxBH.fillStyle = gradBH;
        ctxBH.fillRect(0, 0, 1000, 64);
        beamH.refresh();

        // 7. TÊN LỬA TỰ TÌM DIỆT (HOMING MISSILE TEXTURE)
        const rocketCanvas = this.textures.createCanvas('bullet_homing_missile', 18, 36);
        const ctxR = rocketCanvas.context;
        // Body (Sleek aerodynamic rocket)
        ctxR.fillStyle = '#ffaa00';
        ctxR.beginPath();
        ctxR.moveTo(9, 0); // Nose tip
        ctxR.lineTo(16, 12);
        ctxR.lineTo(15, 30);
        ctxR.lineTo(18, 36); // Fin right
        ctxR.lineTo(12, 34);
        ctxR.lineTo(9, 36);
        ctxR.lineTo(6, 34);
        ctxR.lineTo(0, 36); // Fin left
        ctxR.lineTo(3, 30);
        ctxR.lineTo(2, 12);
        ctxR.closePath();
        ctxR.fill();
        ctxR.strokeStyle = '#ffffff';
        ctxR.lineWidth = 1.5;
        ctxR.stroke();
        // Thruster flame
        ctxR.fillStyle = '#ff2200';
        ctxR.beginPath();
        ctxR.arc(9, 32, 4, 0, Math.PI * 2);
        ctxR.fill();
        rocketCanvas.refresh();

        // 8. CỤC LỬA ENEMY3 PHUN (FIREBALL - Radial Fire Blast)
        const fireball = this.textures.createCanvas('bullet_fireball', 36, 36);
        const ctxFB = fireball.context;
        const gradFB = ctxFB.createRadialGradient(18, 18, 2, 18, 18, 18);
        gradFB.addColorStop(0, '#ffffff');
        gradFB.addColorStop(0.25, '#ffee66');
        gradFB.addColorStop(0.5, '#ff8800');
        gradFB.addColorStop(0.75, '#ff2200');
        gradFB.addColorStop(1, 'rgba(180, 0, 0, 0)');
        ctxFB.fillStyle = gradFB;
        ctxFB.fillRect(0, 0, 36, 36);
        // Vệt lobe lửa bất đối xứng cho cảm giác bùng cháy
        ctxFB.fillStyle = 'rgba(255, 170, 0, 0.55)';
        ctxFB.beginPath();
        ctxFB.arc(13, 14, 6, 0, Math.PI * 2);
        ctxFB.fill();
        ctxFB.beginPath();
        ctxFB.arc(23, 22, 5, 0, Math.PI * 2);
        ctxFB.fill();
        fireball.refresh();

        // 9. THIÊN THẠCH (METEOR ROCK - Round 3)
        const meteorCv = this.textures.createCanvas('meteor', 48, 48);
        const ctxM = meteorCv.context;
        const gradM = ctxM.createRadialGradient(20, 18, 3, 24, 24, 24);
        gradM.addColorStop(0, '#b8a894');
        gradM.addColorStop(0.45, '#8a7a68');
        gradM.addColorStop(0.8, '#55483c');
        gradM.addColorStop(1, '#2e2620');
        ctxM.fillStyle = gradM;
        ctxM.beginPath();
        // Hình đá méo mó tự nhiên
        ctxM.moveTo(6, 20);
        ctxM.lineTo(12, 7);
        ctxM.lineTo(28, 4);
        ctxM.lineTo(42, 14);
        ctxM.lineTo(44, 30);
        ctxM.lineTo(32, 43);
        ctxM.lineTo(14, 41);
        ctxM.lineTo(4, 32);
        ctxM.closePath();
        ctxM.fill();
        // Các hố crater tối
        ctxM.fillStyle = 'rgba(40, 32, 26, 0.75)';
        [[16, 16, 5], [30, 24, 6], [22, 33, 4], [35, 13, 3]].forEach(([cx, cy, r]) => {
            ctxM.beginPath();
            ctxM.arc(cx, cy, r, 0, Math.PI * 2);
            ctxM.fill();
        });
        // Viền sáng phản chiếu
        ctxM.strokeStyle = 'rgba(255, 200, 140, 0.5)';
        ctxM.lineWidth = 1.5;
        ctxM.beginPath();
        ctxM.moveTo(6, 20);
        ctxM.lineTo(12, 7);
        ctxM.lineTo(28, 4);
        ctxM.lineTo(42, 14);
        ctxM.stroke();
        meteorCv.refresh();
    }

    generateParticleTextures() {
        // 1. Glow particle
        const glowCanvas = this.textures.createCanvas('particle_glow', 32, 32);
        const ctxGlow = glowCanvas.context;
        const gradGlow = ctxGlow.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradGlow.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradGlow.addColorStop(0.3, 'rgba(0, 240, 255, 0.8)');
        gradGlow.addColorStop(0.7, 'rgba(0, 100, 255, 0.3)');
        gradGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctxGlow.fillStyle = gradGlow;
        ctxGlow.fillRect(0, 0, 32, 32);
        glowCanvas.refresh();

        // 2. Spark particle (Tia lửa cam/đỏ)
        const sparkCanvas = this.textures.createCanvas('particle_spark', 16, 16);
        const ctxSpark = sparkCanvas.context;
        const gradSpark = ctxSpark.createRadialGradient(8, 8, 0, 8, 8, 8);
        gradSpark.addColorStop(0, 'rgba(255, 255, 200, 1)');
        gradSpark.addColorStop(0.4, 'rgba(255, 150, 0, 0.8)');
        gradSpark.addColorStop(0.8, 'rgba(255, 50, 0, 0.4)');
        gradSpark.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctxSpark.fillStyle = gradSpark;
        ctxSpark.fillRect(0, 0, 16, 16);
        sparkCanvas.refresh();

        // 3. Shockwave ring
        const shockCanvas = this.textures.createCanvas('particle_shockwave', 64, 64);
        const ctxShock = shockCanvas.context;
        ctxShock.strokeStyle = '#00f0ff';
        ctxShock.lineWidth = 4;
        ctxShock.shadowColor = '#00f0ff';
        ctxShock.shadowBlur = 8;
        ctxShock.beginPath();
        ctxShock.arc(32, 32, 28, 0, Math.PI * 2);
        ctxShock.stroke();
        shockCanvas.refresh();

        // 4. MẢNH VỠ KIM LOẠI NỔ (DEBRIS SHARDS 1, 2, 3)
        const d1 = this.textures.createCanvas('debris_shard_1', 20, 20);
        const c1 = d1.context;
        c1.fillStyle = '#4a5568';
        c1.beginPath();
        c1.moveTo(10, 2);
        c1.lineTo(18, 16);
        c1.lineTo(4, 14);
        c1.closePath();
        c1.fill();
        c1.strokeStyle = '#ff6600';
        c1.lineWidth = 2;
        c1.stroke();
        d1.refresh();

        const d2 = this.textures.createCanvas('debris_shard_2', 24, 16);
        const c2 = d2.context;
        c2.fillStyle = '#2d3748';
        c2.beginPath();
        c2.moveTo(2, 4);
        c2.lineTo(22, 2);
        c2.lineTo(18, 14);
        c2.lineTo(6, 12);
        c2.closePath();
        c2.fill();
        c2.strokeStyle = '#00f0ff';
        c2.lineWidth = 1.5;
        c2.stroke();
        d2.refresh();

        const d3 = this.textures.createCanvas('debris_shard_3', 16, 24);
        const c3 = d3.context;
        c3.fillStyle = '#718096';
        c3.beginPath();
        c3.moveTo(8, 2);
        c3.lineTo(14, 10);
        c3.lineTo(10, 22);
        c3.lineTo(2, 14);
        c3.closePath();
        c3.fill();
        c3.strokeStyle = '#ffaa00';
        c3.lineWidth = 1.5;
        c3.stroke();
        d3.refresh();

        // 5. HẠT KHÓI LỬA (SMOKE & FIRE PUFF PARTICLES)
        const smokeCanvas = this.textures.createCanvas('particle_smoke', 32, 32);
        const ctxS = smokeCanvas.context;
        const gradS = ctxS.createRadialGradient(16, 16, 2, 16, 16, 16);
        gradS.addColorStop(0, 'rgba(80, 80, 90, 0.8)');
        gradS.addColorStop(0.5, 'rgba(50, 50, 60, 0.4)');
        gradS.addColorStop(1, 'rgba(20, 20, 30, 0)');
        ctxS.fillStyle = gradS;
        ctxS.fillRect(0, 0, 32, 32);
        smokeCanvas.refresh();

        const fireCanvas = this.textures.createCanvas('particle_fire', 24, 24);
        const ctxF = fireCanvas.context;
        const gradF = ctxF.createRadialGradient(12, 12, 1, 12, 12, 12);
        gradF.addColorStop(0, 'rgba(255, 255, 200, 1)');
        gradF.addColorStop(0.3, 'rgba(255, 120, 0, 0.9)');
        gradF.addColorStop(0.7, 'rgba(255, 30, 0, 0.4)');
        gradF.addColorStop(1, 'rgba(200, 0, 0, 0)');
        ctxF.fillStyle = gradF;
        ctxF.fillRect(0, 0, 24, 24);
        fireCanvas.refresh();

        // 6. VIÊN NGỌC THU PHỤC ĐỒNG MINH (CAPTURE ORB / CYBER ENERGY CORE)
        const orbCanvas = this.textures.createCanvas('capture_orb', 40, 40);
        const ctxOrb = orbCanvas.context;
        const gradOrb = ctxOrb.createRadialGradient(20, 20, 3, 20, 20, 20);
        gradOrb.addColorStop(0, '#ffffff');
        gradOrb.addColorStop(0.25, '#00f0ff');
        gradOrb.addColorStop(0.65, '#9900ff');
        gradOrb.addColorStop(0.9, 'rgba(0, 240, 255, 0.4)');
        gradOrb.addColorStop(1, 'rgba(153, 0, 255, 0)');
        ctxOrb.fillStyle = gradOrb;
        ctxOrb.fillRect(0, 0, 40, 40);
        // Inner core sparkle ring
        ctxOrb.strokeStyle = '#ffffff';
        ctxOrb.lineWidth = 2;
        ctxOrb.beginPath();
        ctxOrb.arc(20, 20, 10, 0, Math.PI * 2);
        ctxOrb.stroke();
        orbCanvas.refresh();

        // 7. Powerup icon textures (Shield, Weapon, Speed, Heal)
        this.createPowerupTexture('powerup_shield', 0x00f0ff, '🛡️');
        this.createPowerupTexture('powerup_weapon', 0xff0055, '⚡');
        this.createPowerupTexture('powerup_heal', 0x00ff88, '❤️');
        this.createPowerupTexture('powerup_speed', 0xffcc00, '🚀');
        this.createPowerupTexture('powerup_electric', 0xcc44ff, '⚡');
    }

    createPowerupTexture(key, colorHex, symbol) {
        const size = 48;
        const canvas = this.textures.createCanvas(key, size, size);
        const ctx = canvas.context;
        
        ctx.fillStyle = 'rgba(10, 20, 40, 0.85)';
        ctx.strokeStyle = '#' + colorHex.toString(16).padStart(6, '0');
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = '22px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(symbol, size / 2, size / 2 + 2);

        canvas.refresh();
    }
}

window.PreloadScene = PreloadScene;
