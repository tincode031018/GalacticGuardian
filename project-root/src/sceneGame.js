/**
 * SCENE GAME (Gameplay Logic Cốt Lõi)
 * - Đa dạng đội hình kẻ thù: Bay nhanh, hàng ngang, nối đuôi nhau (3-6 chiếc), chữ V
 * - Boss máu x3 (2400 HP)
 * - Tuyệt chiêu Ultimate: Tia Laze Khổng Lồ Blue (Giant Blue Hyper Laser) kéo dài 2.5s hủy diệt toàn bộ đạn và kẻ thù
 * - Cấu hình PC: Chuột trái = Bắn, Phím Space = Tuyệt chiêu Ultimate
 */

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        this.selectedShipBase = data.shipType ? (data.shipType.startsWith('player2') ? 'player2' : 'player1') : 'player1';
        this.round = Number(data && data.round !== undefined ? data.round : 1) || 1; // HỆ THỐNG ROUND: 1 / 2 / 3
        this.score = 0;
        this.rescuedCount = 0;
        this.killCount = 0;
        this.currentWave = 0;
        this.totalWaves = 20;
        this.wave = 1;
        this.isGameOver = false;
        this.isVictory = false;
        this.lastFired = 0;
        this.fireRate = 95; // ms (Rapid-fire)
        this.weaponLevel = 1; // 1 to 4
        this.bossActive = false;
        this.bossDefeatedOnce = false;

        this.isMegaLaserActive = false;
        this.megaLaserTimer = 0;
        this.isThunderActive = false; // ULT SÉT (Phi thuyền 2)
        this.thunderTimer = null;
        this.thunderStrikeCount = 0;
        // KHIÊN ĐIỆN PHẢN ĐÒN (15s)
        this.electricShieldTimer = 0;
        this.electricShieldVisual = null;
        this.electricShieldOrbs = [];

        this.hasHomingRockets = false;
        this.homingRockets = null;

        // DUO BOSS (ROUND 2) & HEALING PROPERTIES
        this.bossRed = null;
        this.bossGreen = null;
        this.redBossTag = null;
        this.greenBossTag = null;
        this.greenMedicOrbs = null;
        this.isHealingActive = false;
        this.bossHealTimer = null;

        // Xác định hướng màn hình
        this.isPortrait = this.scale.height >= this.scale.width;
    }

    create() {
        const { width, height } = this.scale;
        this.isPortrait = height >= width;
        window.soundFX.playMusic(`sound/round${this.round}.mp3`);

        // Bật hệ thống vật lý Arcade
        this.physics.world.setBounds(0, 0, width, height);

        // 1. Tạo Bầu Trời Sao & Các Tầng Hành Tinh Parallax
        this.createSpaceEnvironment();

        // 2. Tạo Emitter Hạt (Thrusters, Sparks, Explosions)
        this.createParticleSystems();

        // 3. Khởi tạo Groups
        this.playerBullets = this.physics.add.group({ maxSize: 100 });
        this.enemyBullets = this.physics.add.group({ maxSize: 120 });
        this.homingRockets = this.physics.add.group({ maxSize: 40 });
        this.debrisGroup = this.physics.add.group();
        this.enemies = this.physics.add.group();
        this.astronauts = this.physics.add.group();
        this.powerups = this.physics.add.group();
        this.satellites = this.physics.add.group();
        this.captureOrbs = this.physics.add.group();
        this.allies = this.physics.add.group();
        this.allyBullets = this.physics.add.group({ maxSize: 60 });
        this.meteors = this.physics.add.group(); // NHÓM THIÊN THẠCH (ROUND 3)
        this.electricBeamGraphics = this.add.graphics().setDepth(22);
        this.healBeamGraphics = this.add.graphics().setDepth(15);
        this.allyLinkGraphics = this.add.graphics().setDepth(12);
        this.electricShieldArcGraphics = this.add.graphics().setDepth(12);
        this.lastAllyFireTime = 0;

        // 3.5 Nền Round 2/3: Bay nhìn từ trên xuống (Top-Down Scrolling Ground)
        if (this.round >= 2) {
            this.applyRoundBackdrop();
        }

        // 3.6 ROUND 3: Mưa thiên thạch rơi liên tục
        if (this.round >= 3) {
            this.startMeteorShower();
        }

        // 4. Tạo Player Ship theo Sprite A (Dọc) hoặc B (Ngang)
        const startX = this.isPortrait ? width / 2 : 110;
        const startY = this.isPortrait ? height - 120 : height / 2;
        this.createPlayer(startX, startY);

        // 5. Khởi động UI Scene (HUD)
        if (!this.scene.isActive('UIScene')) {
            this.scene.launch('UIScene');
        }

        // 6. Thiết lập Bàn Phím PC & Chuột (Desktop Config: Click = Bắn, Space = Ultimate, E = Thu Phục Ngọc)
        this.setupControls();

        // 7. Thiết lập Va Chạm (Collisions)
        this.setupCollisions();

        // 8. Bắt đầu Vòng Lặp Spawn Kẻ Địch & Hành Tinh
        this.startWaveManager();

        // 8.5 Thông báo ROUND bắt đầu
        this.events.emit('showBanner', `🌍 ROUND ${this.round} BẮT ĐẦU!`);

        // Resize & Orientation Listener
        this.scale.on('resize', this.handleResize, this);
    }

    getPlayerSpriteKey() {
        const suffix = this.isPortrait ? 'a' : 'b';
        const key = this.selectedShipBase + suffix;
        return this.textures.exists(key) ? key : (this.textures.exists('player1a') ? 'player1a' : null);
    }

    /**
     * CHỌN LOẠI KẺ THÙ THEO ROUND:
     * - Round 1: enemy1
     * - Round 2: enemy1 + enemy2
     * - Round 3: enemy1 + enemy2 + enemy3
     */
    pickEnemyBaseKey() {
        const pool = ['enemy1'];
        if (this.round >= 2 && this.textures.exists('enemy2' + (this.isPortrait ? 'a' : 'b'))) pool.push('enemy2');
        if (this.round >= 3 && this.textures.exists('enemy3' + (this.isPortrait ? 'a' : 'b'))) pool.push('enemy3');
        return Phaser.Math.RND.pick(pool);
    }

    getEnemySpriteKey(baseKey) {
        const suffix = this.isPortrait ? 'a' : 'b';
        const base = baseKey || 'enemy1';
        const key = base + suffix;
        if (this.textures.exists(key)) return key;
        return this.textures.exists('enemy1' + suffix) ? 'enemy1' + suffix : 'enemy1a';
    }

    /** BOSS THEO ROUND: Round 1 = boss1, Round 2+ = boss2 */
    getBossSpriteKey() {
        const suffix = this.isPortrait ? 'a' : 'b';
        const bossNum = Math.min(this.round, 2);
        const key = 'boss' + bossNum + suffix;
        return this.textures.exists(key) ? key : 'boss1a';
    }

    /**
     * NỀN ROUND 2/3: PHÓNG LỚN & CUỘN VÔ TẬN KHÔNG VIỀN (SEAMLESS SCROLLING BACKDROP)
     */
    applyRoundBackdrop() {
        if (!this.textures.exists('background2')) return;
        const { width, height } = this.scale;

        // Nếu đã khởi tạo rồi thì chỉ cần cập nhật layout
        if (this.bgSprite1 && this.bgSprite2) {
            this.layoutRoundBackdrop(width, height);
            return;
        }

        // Tạo 2 sprite cuộn nối tiếp đối xứng gương (Mirrored seamless loop) để triệt tiêu hoàn toàn đường viền nối
        this.bgSprite1 = this.add.image(width / 2, height / 2, 'background2')
            .setDepth(-10)
            .setAlpha(0);

        this.bgSprite2 = this.add.image(width / 2, height / 2, 'background2')
            .setDepth(-10)
            .setAlpha(0);

        this.layoutRoundBackdrop(width, height);

        // Hiệu ứng fade-in mượt mà khi bắt đầu Round 2/3
        this.tweens.add({
            targets: [this.bgSprite1, this.bgSprite2],
            alpha: 1,
            duration: 1200,
            ease: 'Linear'
        });
    }

    layoutRoundBackdrop(width, height) {
        if (!this.bgSprite1 || !this.bgSprite2) return;

        const tex = this.textures.get('background2').getSourceImage();
        const baseW = (tex && tex.width) ? tex.width : 720;
        const baseH = (tex && tex.height) ? tex.height : 1280;

        // Phóng lớn ảnh (scale cover + zoom 20%) để tràn ngập màn hình, chi tiết rõ nét và không bao giờ bị hở mép
        const scale = Math.max(width / baseW, height / baseH) * 1.2;
        const scaledW = baseW * scale;
        const scaledH = baseH * scale;

        this.bgScaledW = scaledW;
        this.bgScaledH = scaledH;

        this.bgSprite1.setScale(scale);
        this.bgSprite2.setScale(scale);

        if (this.isPortrait) {
            // Màn hình dọc: Phi thuyền bay hướng lên → Nền cuộn từ trên xuống
            this.bgSprite1.setFlipX(false).setFlipY(false);
            this.bgSprite2.setFlipX(false).setFlipY(true); // Lật gương trục Y để mép tiếp giáp 100% liền mạch không tì vết

            this.bgSprite1.setPosition(width / 2, height / 2);
            this.bgSprite2.setPosition(width / 2, height / 2 - scaledH);
        } else {
            // Màn hình ngang: Phi thuyền bay sang phải → Nền cuộn từ phải sang trái
            this.bgSprite1.setFlipX(false).setFlipY(false);
            this.bgSprite2.setFlipX(true).setFlipY(false); // Lật gương trục X để mép tiếp giáp 100% liền mạch không tì vết

            this.bgSprite1.setPosition(width / 2, height / 2);
            this.bgSprite2.setPosition(width / 2 + scaledW, height / 2);
        }
    }

    /**
     * ROUND 3: MƯA THIÊN THẠCH RƠI LIÊN TỤC
     */
    startMeteorShower() {
        if (this.meteorTimer || !this.textures.exists('meteor')) return;

        this.spawnMeteor(); // Rơi viên đầu tiên ngay lập tức

        this.meteorTimer = this.time.addEvent({
            delay: 420,
            loop: true,
            callback: () => {
                if (!this.isGameOver && this.meteors && this.meteors.countActive(true) < 14) {
                    this.spawnMeteor();
                }
            }
        });

        this.events.emit('showBanner', '☄️ CẢNH BÁO: MƯA THIÊN THẠCH! ☄️');
    }

    spawnMeteor() {
        if (this.isGameOver || !this.textures.exists('meteor')) return;
        const { width, height } = this.scale;
        const size = Phaser.Math.Between(28, 58);

        let startX, startY, vx, vy;
        if (this.isPortrait) {
            startX = Phaser.Math.Between(-30, width + 30);
            startY = -70;
            vx = Phaser.Math.Between(-60, 60);
            vy = Phaser.Math.Between(190, 330);
        } else {
            startX = width + 70;
            startY = Phaser.Math.Between(-30, height + 30);
            vx = -Phaser.Math.Between(190, 330);
            vy = Phaser.Math.Between(-60, 60);
        }

        const m = this.meteors.create(startX, startY, 'meteor');
        if (!m) return;

        m.setDisplaySize(size, size);
        m.setDepth(9);
        m.setVelocity(vx, vy);
        m.setAngularVelocity(Phaser.Math.Between(-160, 160));
        m.hp = size > 45 ? 45 : 25; // Đá to trâu hơn
        m.scoreValue = 80;
    }

    /** Đạn bắn nổ thiên thạch */
    handleBulletHitMeteor(bullet, meteor) {
        if (!bullet.active || !meteor.active) return;
        bullet.destroy();

        const dmg = bullet.damage !== undefined ? bullet.damage : 15;
        meteor.hp -= dmg;
        this.createHitSparks(meteor.x, meteor.y);

        if (meteor.hp <= 0) {
            this.createExplosion(meteor.x, meteor.y, false);
            this.addScore(meteor.scoreValue);
            meteor.destroy();
        }
    }

    /** Thiên thạch đâm trúng phi thuyền người chơi */
    handleMeteorHitPlayer(player, meteor) {
        if (this.isGameOver || player.invulnerable || !meteor.active) return;
        this.createExplosion(meteor.x, meteor.y, false);
        meteor.destroy();
        this.damagePlayer(1);
    }

    createSpaceEnvironment() {
        const { width, height } = this.scale;

        this.starLayers = [];
        const starCounts = [70, 45, 25];
        const speeds = [0.5, 1.2, 2.5];

        starCounts.forEach((count, idx) => {
            const group = [];
            for (let i = 0; i < count; i++) {
                const star = this.add.circle(
                    Phaser.Math.Between(0, width),
                    Phaser.Math.Between(0, height),
                    idx === 2 ? 1.5 : 1,
                    0xffffff,
                    Phaser.Math.FloatBetween(0.2, 0.8)
                );
                star.speed = speeds[idx];
                group.push(star);
            }
            this.starLayers.push(group);
        });

        this.planetKeys = ['traidat', 'saohoa', 'saotho', 'saothuy', 'hanhtinh3', 'hanhtinh4'];
        this.activePlanets = [];
        this.spawnPlanetTimer = 0;

        this.spawnFloatingPlanet();
    }

    spawnFloatingPlanet() {
        const { width, height } = this.scale;
        const availableKeys = this.planetKeys.filter(k => this.textures.exists(k));
        if (availableKeys.length === 0) return;

        const key = Phaser.Math.RND.pick(availableKeys);
        const scale = Phaser.Math.FloatBetween(0.4, 0.85);

        let startX, startY, speedX, speedY;
        if (this.isPortrait) {
            startX = Phaser.Math.Between(width * 0.1, width * 0.9);
            startY = -120;
            speedX = 0;
            speedY = Phaser.Math.FloatBetween(0.3, 0.7);
        } else {
            startX = width + 120;
            startY = Phaser.Math.Between(height * 0.1, height * 0.9);
            speedX = -Phaser.Math.FloatBetween(0.3, 0.7);
            speedY = 0;
        }

        const planet = this.add.image(startX, startY, key)
            .setScale(scale)
            .setAlpha(1)
            .setDepth(1);

        planet.speedX = speedX;
        planet.speedY = speedY;
        planet.rotSpeed = Phaser.Math.FloatBetween(-0.004, 0.004);
        this.activePlanets.push(planet);
    }

    createParticleSystems() {
        this.thrusterEmitter = this.add.particles(0, 0, 'particle_glow', {
            speed: { min: 70, max: 180 },
            angle: this.isPortrait ? { min: 80, max: 100 } : { min: 170, max: 190 },
            scale: { start: 0.45, end: 0 },
            alpha: { start: 0.9, end: 0 },
            tint: [0x00f0ff, 0x0077ff, 0xffffff],
            blendMode: 'ADD',
            lifespan: 260,
            frequency: 30,
            follow: null
        }).setDepth(5);

        this.sparkEmitter = this.add.particles(0, 0, 'particle_spark', {
            speed: { min: 80, max: 320 },
            scale: { start: 0.9, end: 0 },
            alpha: { start: 1, end: 0 },
            tint: [0xff3300, 0xffaa00, 0xffffff],
            blendMode: 'ADD',
            lifespan: 380,
            emitting: false
        }).setDepth(21);

        // 2.5 Emitter Tia sáng ngôi sao va chạm đạn (Impact Hit Flare)
        this.hitFlareEmitter = this.add.particles(0, 0, 'particle_hit_flare', {
            speed: { min: 20, max: 90 },
            scale: { start: 0.85, end: 0 },
            alpha: { start: 1, end: 0 },
            blendMode: 'ADD',
            lifespan: 160,
            emitting: false
        }).setDepth(22);

        // Hạt Lửa phát nổ (Fire burst emitter)
        this.fireEmitter = this.add.particles(0, 0, 'particle_fire', {
            speed: { min: 40, max: 140 },
            scale: { start: 0.9, end: 0 },
            alpha: { start: 1, end: 0 },
            blendMode: 'ADD',
            lifespan: 400,
            emitting: false
        }).setDepth(17);

        // Hạt Khói cuộn sau mảnh vỡ (Smoke puff emitter)
        this.smokeEmitter = this.add.particles(0, 0, 'particle_smoke', {
            speed: { min: 20, max: 70 },
            scale: { start: 0.6, end: 1.4 },
            alpha: { start: 0.7, end: 0 },
            lifespan: 600,
            emitting: false
        }).setDepth(16);

        // KHÓI ĐEN DÀY ĐẶC BỐC CHÁY KHI HP <= 1/3 (Black Smoke Emitter)
        this.blackSmokeEmitter = this.add.particles(0, 0, 'particle_smoke', {
            speed: { min: 25, max: 80 },
            angle: this.isPortrait ? { min: 70, max: 110 } : { min: 160, max: 200 },
            scale: { start: 0.7, end: 1.8 },
            alpha: { start: 0.9, end: 0 },
            tint: 0x111111,
            lifespan: 750,
            emitting: false
        }).setDepth(19);

        // LỬA BỐC CHÁY HỎA HOẠN KHI HP <= 1/3 (Damage Fire Plume)
        this.damageFireEmitter = this.add.particles(0, 0, 'particle_fire', {
            speed: { min: 30, max: 95 },
            scale: { start: 0.8, end: 0 },
            alpha: { start: 1, end: 0 },
            blendMode: 'ADD',
            lifespan: 320,
            emitting: false
        }).setDepth(20);

        // HẠT HỒI MÁU XANH NGỌC BOSS GREEN (Healing Sparkles)
        this.greenHealEmitter = this.add.particles(0, 0, 'particle_glow', {
            speed: { min: 30, max: 100 },
            scale: { start: 0.75, end: 0 },
            alpha: { start: 0.95, end: 0 },
            tint: [0x00ff88, 0x55ffaa, 0xffffff],
            blendMode: 'ADD',
            lifespan: 450,
            emitting: false
        }).setDepth(22);
    }

    createPlayer(x, y) {
        document.body.classList.add('game-active');
        const spriteKey = this.getPlayerSpriteKey();
        this.player = this.physics.add.sprite(x, y, spriteKey);
        this.fitPlayerSize();
        this.player.setCollideWorldBounds(true);
        this.player.setDepth(10);

        this.player.maxHp = 3; // 3 LẦN TRÚNG ĐẠN LÀ NỔ PHI THUYỀN
        this.player.hp = 3;
        this.player.maxShield = 0;
        this.player.shield = 0;
        this.player.speed = 360;
        this.player.ultimateEnergy = 0;
        this.player.isFiring = false;
        this.player.joystickX = 0;
        this.player.joystickY = 0;
        this.player.invulnerable = false;

        this.shieldVisual = this.add.image(x, y, 'particle_glow')
            .setDisplaySize(95, 95)
            .setTint(0x00f0ff)
            .setAlpha(0.6)
            .setBlendMode('ADD')
            .setDepth(11);
        this.shieldVisual.setVisible(false);

        const offsetX = this.isPortrait ? 0 : -28;
        const offsetY = this.isPortrait ? 28 : 0;
        this.thrusterEmitter.startFollow(this.player, offsetX, offsetY);
    }

    fitPlayerSize() {
        if (!this.player) return;
        const origW = this.player.width || 64;
        const origH = this.player.height || 64;
        if (this.isPortrait) {
            const targetH = 75;
            const targetW = (origW / origH) * targetH;
            this.player.setDisplaySize(targetW, targetH);
        } else {
            const targetW = 90;
            const targetH = (origH / origW) * targetW;
            this.player.setDisplaySize(targetW, targetH);
        }
    }

    /**
     * THIẾT LẬP ĐIỀU KHIỂN DESKTOP & MOBILE
     * - Chuột trái (Left Click): Bắn đạn
     * - Phím Space: Kích hoạt Tuyệt chiêu Tia Laze Khổng Lồ Blue
     * - Phím WASD / Mũi tên: Di chuyển
     */
    setupControls() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

        // Chuột Trái Bắn Đạn (Hold or Click)
        this.input.on('pointerdown', (pointer) => {
            if (pointer.leftButtonDown()) {
                this.isMouseDown = true;
                if (this.player) this.player.isFiring = true;
            }
        });

        this.input.on('pointerup', (pointer) => {
            this.isMouseDown = false;
            // Chỉ tắt firing nếu không bấm nút bắn trên giao diện mobile
            const btnFire = document.getElementById('btn-fire');
            if (this.player && (!btnFire || !btnFire.classList.contains('active'))) {
                this.player.isFiring = false;
            }
        });

        // Touch Drag di chuyển mượt mà trên Mobile nếu không dùng cần gạt
        this.input.on('pointermove', (pointer) => {
            if (pointer.isDown && !this.isGameOver && this.player && pointer.event.type.startsWith('touch')) {
                const targetX = this.isPortrait ? pointer.x : pointer.x - 30;
                const targetY = this.isPortrait ? pointer.y - 40 : pointer.y;
                this.physics.moveTo(this.player, targetX, targetY, this.player.speed);
                if (Phaser.Math.Distance.Between(this.player.x, this.player.y, targetX, targetY) < 15) {
                    this.player.setVelocity(0, 0);
                }
            }
        });
    }

    setupCollisions() {
        this.physics.add.overlap(this.playerBullets, this.enemies, this.handleBulletHitEnemy, null, this);
        this.physics.add.overlap(this.playerBullets, this.satellites, this.handleBulletHitSatellite, null, this);
        this.physics.add.overlap(this.allyBullets, this.enemies, this.handleBulletHitEnemy, null, this);
        this.physics.add.overlap(this.allyBullets, this.satellites, this.handleBulletHitSatellite, null, this);
        this.physics.add.overlap(this.homingRockets, this.enemies, this.handleRocketHitEnemy, null, this);
        this.physics.add.overlap(this.homingRockets, this.satellites, this.handleRocketHitSatellite, null, this);
        this.physics.add.overlap(this.enemyBullets, this.player, this.handleEnemyBulletHitPlayer, null, this);
        // Đạn địch trúng đồng minh (đồng minh có thể bị hạ gục)
        this.physics.add.overlap(this.enemyBullets, this.allies, this.handleEnemyBulletHitAlly, null, this);
        this.physics.add.overlap(this.enemies, this.player, this.handleShipCollision, null, this);
        this.physics.add.overlap(this.satellites, this.player, this.handleShipCollision, null, this);
        this.physics.add.overlap(this.player, this.powerups, this.handleCollectPowerup, null, this);
        this.physics.add.overlap(this.player, this.captureOrbs, this.handleCollectCaptureOrb, null, this);
        // Va chạm Thiên Thạch (Round 3)
        this.physics.add.overlap(this.playerBullets, this.meteors, this.handleBulletHitMeteor, null, this);
        this.physics.add.overlap(this.allyBullets, this.meteors, this.handleBulletHitMeteor, null, this);
        this.physics.add.overlap(this.player, this.meteors, this.handleMeteorHitPlayer, null, this);
    }

    startWaveManager() {
        this.spawnNextWave();
        this.spawnEnemyTimer = this.time.addEvent({
            delay: 4200,
            callback: this.spawnNextWave,
            callbackScope: this,
            loop: true
        });

        // Xuất hiện Vệ Tinh (mỗi 5.5s)
        this.time.addEvent({
            delay: 5500,
            callback: this.spawnSatellite,
            callbackScope: this,
            loop: true
        });
        // Xuất hiện 1 vệ tinh ngay khi bắt đầu
        this.time.delayedCall(1500, () => this.spawnSatellite());
    }

    /**
     * QUẢN LÝ 20 WAVE LÍNH TRƯỚC KHI ĐẤU TRÙM (BOSS)
     */
    spawnNextWave() {
        if (this.isGameOver || this.bossActive) return;

        this.currentWave++;
        this.wave = this.currentWave;

        if (this.currentWave <= this.totalWaves) {
            this.events.emit('showBanner', `⚔️ WAVE ${this.currentWave}/${this.totalWaves}`);
            this.spawnEnemyFormation();
        } else {
            // ĐÃ HOÀN TẤT 20 WAVE LÍNH: CHUYỂN SANG ĐẤU TRÙM (BOSS BATTLE)
            if (this.spawnEnemyTimer) this.spawnEnemyTimer.remove();
            if (!this.bossActive && !this.bossDefeatedOnce) {
                this.bossDefeatedOnce = true;
                this.triggerBossWarning();
            }
        }
    }

    /**
     * ĐA DẠNG ĐƯỜNG BAY & ĐỘI HÌNH KẺ THÙ (3 - 5 CHIẾC):
     * 1. Hàng Ngang / Dọc đồng loạt (Wall Line)
     * 2. Đường thẳng nối đuôi nhau liên tiếp (Single File / Line Trail)
     * 3. Đội hình chữ V (V-Formation)
     */
    spawnEnemyFormation() {
        if (this.isGameOver || this.bossActive) return;

        const { width, height } = this.scale;
        const formationType = Phaser.Math.Between(1, 3);
        // SỐ LƯỢNG QUÁI THEO ROUND:
        // - Round 1: 3-5 con
        // - Round 2: GIẢM CÒN 2-3 CON (đỡ đông)
        // - Round 3: cực đông 8-12 con
        const count = this.round >= 3 ? Phaser.Math.Between(8, 12)
            : this.round === 2 ? Phaser.Math.Between(2, 3)
            : Phaser.Math.Between(3, 5);
        const speed = Phaser.Math.Between(175, 245) + (this.round >= 3 ? 30 : 0); // Bay nhanh, dứt khoát

        if (formationType === 1) {
            // 1. ĐỘI HÌNH HÀNG NGANG / HÀNG DỌC ĐỒNG LOẠT (3 - 5 CHIẾC)
            for (let i = 0; i < count; i++) {
                let startX, startY;
                if (this.isPortrait) {
                    startX = (width / (count + 1)) * (i + 1);
                    startY = -70;
                } else {
                    startX = width + 70;
                    startY = (height / (count + 1)) * (i + 1);
                }
                this.createSingleEnemy(startX, startY, this.pickEnemyBaseKey(), speed, 0);
            }
        } else if (formationType === 2) {
            // 2. ĐỘI HÌNH ĐƯỜNG THẲNG NỐI ĐUÔI NHAU LIÊN TIẾP (3 - 5 CHIẾC)
            const lanePos = this.isPortrait ? Phaser.Math.Between(width * 0.2, width * 0.8) : Phaser.Math.Between(height * 0.2, height * 0.8);
            for (let i = 0; i < count; i++) {
                this.time.delayedCall(i * 220, () => {
                    if (this.isGameOver || this.bossActive) return;
                    let startX = this.isPortrait ? lanePos : width + 70;
                    let startY = this.isPortrait ? -70 : lanePos;
                    this.createSingleEnemy(startX, startY, this.pickEnemyBaseKey(), speed + 20, 1);
                });
            }
        } else {
            // 3. ĐỘI HÌNH CHỮ V (3 - 5 CHIẾC)
            const center = Math.floor(count / 2);
            const midX = width / 2;
            const midY = height / 2;
            for (let i = 0; i < count; i++) {
                const offset = Math.abs(i - center);
                let startX, startY;
                if (this.isPortrait) {
                    startX = midX + (i - center) * 60;
                    startY = -70 - offset * 45;
                } else {
                    startX = width + 70 + offset * 45;
                    startY = midY + (i - center) * 60;
                }
                this.createSingleEnemy(startX, startY, this.pickEnemyBaseKey(), speed + 10, 0);
            }
        }
    }

    /**
     * TẠO KẺ THÙ THEO LOẠI - MỖI LOẠI CÓ CHỈ SỐ & KIỂU BẮN RIÊNG:
     * - enemy1: Đạn thẳng đỏ thường (30 HP / 150 điểm)
     * - enemy2: Đạn nhắm người chơi tím, 3 tia spread (45 HP / 250 điểm)
     * - enemy3: PHUN CỤC LỬA - cầu lửa khổng lồ (75 HP / 400 điểm)
     */
    createSingleEnemy(startX, startY, baseKey, speed, waveMode = 0) {
        const spriteKey = this.getEnemySpriteKey(baseKey);
        const enemy = this.enemies.create(startX, startY, spriteKey);
        if (!enemy) return null;

        const origW = enemy.width || 64;
        const origH = enemy.height || 64;
        if (this.isPortrait) {
            const targetH = 75;
            enemy.setDisplaySize((origW / origH) * targetH, targetH);
            enemy.setFlipY(true);
            enemy.setVelocityY(speed);
            enemy.basePos = startX;
            enemy.isVertical = true;
        } else {
            const targetW = 90;
            enemy.setDisplaySize(targetW, (origH / origW) * targetW);
            enemy.setFlipX(true);
            enemy.setVelocityX(-speed);
            enemy.basePos = startY;
            enemy.isVertical = false;
        }

        enemy.setDepth(10);
        enemy.enemyBase = baseKey || 'enemy1';

        // Chỉ số & kiểu bắn theo từng loại địch
        if (enemy.enemyBase === 'enemy3') {
            enemy.maxHp = 75;
            enemy.hp = 75;
            enemy.scoreValue = 400;
            enemy.fireMode = 'fireball';
        } else if (enemy.enemyBase === 'enemy2') {
            enemy.maxHp = 45;
            enemy.hp = 45;
            enemy.scoreValue = 250;
            enemy.fireMode = 'aimed';
        } else {
            enemy.maxHp = 30;
            enemy.hp = 30;
            enemy.scoreValue = 150;
            enemy.fireMode = 'straight';
        }

        enemy.waveMode = waveMode;
        enemy.freq = Phaser.Math.FloatBetween(0.0022, 0.0034);
        enemy.amp = Phaser.Math.Between(18, 32);
        enemy.laneFollow = 0.08;
        enemy.weavePhase = Phaser.Math.FloatBetween(0, Math.PI * 2);

        // Tần suất bắn: enemy3 phun lửa chậm hơn, enemy2 bắn nhanh và nguy hiểm
        const fireDelay = enemy.fireMode === 'fireball' ? Phaser.Math.Between(1900, 2600)
            : enemy.fireMode === 'aimed' ? Phaser.Math.Between(1300, 1900)
            : Phaser.Math.Between(1100, 1800);

        this.time.addEvent({
            delay: fireDelay,
            callback: () => {
                if (enemy.active) this.enemyFire(enemy);
            },
            loop: true
        });

        return enemy;
    }

    spawnSatellite() {
        if (this.isGameOver || !this.textures.exists('vetinh')) return;
        const { width, height } = this.scale;

        let startX, startY, vx, vy;
        if (this.isPortrait) {
            startX = Phaser.Math.Between(40, width - 40);
            startY = -60;
            vx = Phaser.Math.Between(-20, 20);
            vy = 65;
        } else {
            startX = width + 60;
            startY = Phaser.Math.Between(40, height - 40);
            vx = -65;
            vy = Phaser.Math.Between(-20, 20);
        }

        const sat = this.satellites.create(startX, startY, 'vetinh');
        if (!sat) return;

        sat.setDisplaySize(60, 60);
        sat.hp = 60;
        sat.setVelocity(vx, vy);
        sat.setAngularVelocity(40);
        sat.setDepth(9);
    }

    /**
     * TRÙM KHỔNG LỒ (BOSS BATTLE THEO TỪNG ROUND)
     * - Round 1: Titan Warship (5-Way Arc Spread, Aimed Burst, 8-way rage storm)
     * - Round 2: DUO BOSS: Tử Thần Đỏ (Red Attacker) + Cyber Medic (Green Healer 3s buff 10% max HP)
     * - Round 3: Omega Annihilator (16-way starburst, quad precision hyper laser, meteor storm)
     */
    spawnBoss() {
        this.bossActive = true;
        window.soundFX.playMusic('sound/bossfight.mp3', 0.55);

        const currentRound = Number(this.round) || 1;
        if (currentRound === 2) {
            this.spawnDuoBossRound2();
        } else if (currentRound >= 3) {
            this.spawnBossRound3();
        } else {
            this.spawnBossRound1();
        }
    }

    /** ROUND 1: TITAN WARSHIP */
    spawnBossRound1() {
        const { width, height } = this.scale;
        this.events.emit('bossSpawned', { name: '⚠️ TITAN WARSHIP BOSS ⚠️' });

        const bossSpriteKey = this.getBossSpriteKey();
        const bossSize = this.isPortrait ? 220 : 250;

        let startX = this.isPortrait ? width / 2 : width + 180;
        let startY = this.isPortrait ? -180 : height / 2;
        let targetX = this.isPortrait ? width / 2 : width - 170;
        let targetY = this.isPortrait ? 150 : height / 2;

        const boss = this.enemies.create(startX, startY, bossSpriteKey);
        if (!boss) return;

        boss.setDisplaySize(bossSize, bossSize);
        if (this.isPortrait) boss.setFlipY(true);
        else boss.setFlipX(true);
        boss.setDepth(12);
        boss.isBoss = true;
        // Khóa chuyển động vật lý để không bị giật/biến mất do xung đột Physics Body
        boss.body.immovable = true;
        boss.body.moves = false;

        boss.maxHp = 7200;
        boss.hp = 7200;
        boss.maxShield = 3000;
        boss.shield = 3000;
        boss.scoreValue = 12000;
        boss.attackStep = 0;

        this.boss = boss;

        this.tweens.add({
            targets: boss,
            x: targetX,
            y: targetY,
            duration: 2800,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                if (!boss || !boss.active) return;
                this.bossAttackTimer = this.time.addEvent({
                    delay: 850,
                    callback: this.bossAttackPatternRound1,
                    callbackScope: this,
                    loop: true
                });

                if (this.isPortrait) {
                    this.tweens.add({
                        targets: boss,
                        x: { from: width * 0.22, to: width * 0.78 },
                        y: { from: 130, to: 175 },
                        duration: 3200,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });
                } else {
                    this.tweens.add({
                        targets: boss,
                        x: { from: width - 150, to: width - 200 },
                        y: { from: height * 0.22, to: height * 0.78 },
                        duration: 3200,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });
                }
            }
        });
    }

    /** ROUND 2: DUO BOSS (1 ĐỎ TẤN CÔNG + 1 XANH BUFF 10% MÁU MỖI 3S) */
    spawnDuoBossRound2() {
        const { width, height } = this.scale;
        this.events.emit('bossSpawned', { name: '⚠️ DUO BOSS: TỬ THẦN ĐỎ & CYBER MEDIC 💚 ⚠️' });

        const bossSpriteKey = this.getBossSpriteKey();
        const sizeRed = this.isPortrait ? 220 : 250;
        const sizeGreen = this.isPortrait ? 180 : 200;

        // 1. TỬ THẦN ĐỎ (RED DESTROYER BOSS) - Bên Trái
        let redStartX = this.isPortrait ? width * 0.28 : width + 180;
        let redStartY = this.isPortrait ? -180 : height * 0.28;
        let redTargetX = this.isPortrait ? width * 0.28 : width - 170;
        let redTargetY = this.isPortrait ? 150 : height * 0.28;

        const bossRed = this.enemies.create(redStartX, redStartY, bossSpriteKey);
        if (!bossRed) return;
        bossRed.setDisplaySize(sizeRed, sizeRed);
        if (this.isPortrait) bossRed.setFlipY(true);
        else bossRed.setFlipX(true);
        bossRed.setDepth(12);
        bossRed.isBoss = true;
        bossRed.isBossRed = true;
        bossRed.body.immovable = true;
        bossRed.body.moves = false;
        bossRed.setTint(0xff2244);

        bossRed.maxHp = 6800;
        bossRed.hp = 6800;
        bossRed.maxShield = 2200;
        bossRed.shield = 2200;
        bossRed.scoreValue = 10000;
        bossRed.attackStep = 0;
        this.bossRed = bossRed;
        this.boss = bossRed; // fallback reference

        // 2. CYBER MEDIC (GREEN HEALER BOSS) - Bên Phải
        let grnStartX = this.isPortrait ? width * 0.72 : width + 180;
        let grnStartY = this.isPortrait ? -180 : height * 0.72;
        let grnTargetX = this.isPortrait ? width * 0.72 : width - 170;
        let grnTargetY = this.isPortrait ? 140 : height * 0.72;

        const bossGreen = this.enemies.create(grnStartX, grnStartY, bossSpriteKey);
        if (!bossGreen) return;
        bossGreen.setDisplaySize(sizeGreen, sizeGreen);
        if (this.isPortrait) bossGreen.setFlipY(true);
        else bossGreen.setFlipX(true);
        bossGreen.setDepth(12);
        bossGreen.isBoss = true;
        bossGreen.isBossGreen = true;
        bossGreen.body.immovable = true;
        bossGreen.body.moves = false;
        bossGreen.setTint(0x00ff88);

        bossGreen.maxHp = 4200;
        bossGreen.hp = 4200;
        bossGreen.maxShield = 1400;
        bossGreen.shield = 1400;
        bossGreen.scoreValue = 8000;
        bossGreen.attackStep = 0;
        this.bossGreen = bossGreen;

        // Bảng tên hiển thị trên đầu mỗi Boss
        this.redBossTag = this.add.text(redStartX, redStartY, '👹 TỬ THẦN ĐỎ', {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '13px',
            fontWeight: '900',
            color: '#ff3366',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(25);

        this.greenBossTag = this.add.text(grnStartX, grnStartY, '💚 CYBER MEDIC (BUFF MÁU)', {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '12px',
            fontWeight: '900',
            color: '#00ff88',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(25);

        // 3 Quả cầu năng lượng xoay quanh Boss Xanh (Green Orbiting Orbs)
        this.greenMedicOrbs = [];
        for (let i = 0; i < 3; i++) {
            const orb = this.add.image(grnStartX, grnStartY, 'bullet_boss_green_orb')
                .setDisplaySize(26, 26)
                .setBlendMode('ADD')
                .setDepth(13);
            this.greenMedicOrbs.push(orb);
        }

        // Entrance Tweens mượt mà
        this.tweens.add({
            targets: bossRed,
            x: redTargetX,
            y: redTargetY,
            duration: 2600,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                if (!bossRed || !bossRed.active) return;
                if (this.isPortrait) {
                    this.tweens.add({
                        targets: bossRed,
                        x: { from: width * 0.15, to: width * 0.48 },
                        y: { from: 130, to: 170 },
                        duration: 2800,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });
                } else {
                    this.tweens.add({
                        targets: bossRed,
                        x: { from: width - 140, to: width - 190 },
                        y: { from: height * 0.15, to: height * 0.48 },
                        duration: 2800,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });
                }
            }
        });

        this.tweens.add({
            targets: bossGreen,
            x: grnTargetX,
            y: grnTargetY,
            duration: 2800,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                if (!bossGreen || !bossGreen.active) return;
                if (this.isPortrait) {
                    this.tweens.add({
                        targets: bossGreen,
                        x: { from: width * 0.52, to: width * 0.85 },
                        y: { from: 120, to: 160 },
                        duration: 2400,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });
                } else {
                    this.tweens.add({
                        targets: bossGreen,
                        x: { from: width - 140, to: width - 190 },
                        y: { from: height * 0.52, to: height * 0.85 },
                        duration: 2400,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });
                }
            }
        });

        // VÒNG LẶP TẤN CÔNG DUO BOSS
        this.bossAttackTimer = this.time.addEvent({
            delay: 750,
            callback: this.bossAttackPatternRound2,
            callbackScope: this,
            loop: true
        });

        // 💚 VÒNG LẶP HỒI MÁU: BOSS XANH HỒI 10% MÁU CHO BOSS ĐỎ MỖI 3 GIÂY (3000ms)
        this.bossHealTimer = this.time.addEvent({
            delay: 3000,
            callback: this.executeGreenBossHeal,
            callbackScope: this,
            loop: true
        });
    }

    /** 💚 THỰC THI CHIÊU HỒI PHỤC CỦA BOSS XANH CHO BOSS ĐỎ (+10% MAX HP) */
    executeGreenBossHeal() {
        if (this.isGameOver) return;
        if (!this.bossGreen || !this.bossGreen.active) return;
        if (!this.bossRed || !this.bossRed.active) return;

        const healAmount = Math.round(this.bossRed.maxHp * 0.1); // 10% Máu tối đa (+680 HP)
        this.bossRed.hp = Math.min(this.bossRed.maxHp, this.bossRed.hp + healAmount);

        // Kích hoạt tia hồi máu
        this.isHealingActive = true;
        this.time.delayedCall(500, () => {
            this.isHealingActive = false;
            if (this.healBeamGraphics) this.healBeamGraphics.clear();
        });

        // Hiệu ứng hạt ánh sáng & hào quang xanh ngọc
        if (this.greenHealEmitter) {
            this.greenHealEmitter.explode(16, this.bossRed.x, this.bossRed.y);
            this.greenHealEmitter.explode(8, this.bossGreen.x, this.bossGreen.y);
        }

        // Chớp sáng xanh ngọc trên thân Boss Đỏ
        this.bossRed.setTint(0x55ffaa);
        this.time.delayedCall(300, () => {
            if (this.bossRed && this.bossRed.active) {
                this.bossRed.setTint(0xff3355);
            }
        });

        // Chữ bay hiển thị hồi phục
        this.showFloatingText(this.bossRed.x, this.bossRed.y - 45, `💚 +10% HP (+${healAmount})`, '#00ff88');
        window.soundFX.playPowerup();
    }

    /** ROUND 3: BOSS TUYỆT DIỆT OMEGA */
    spawnBossRound3() {
        const { width, height } = this.scale;
        this.events.emit('bossSpawned', { name: '☠️ BOSS TUYỆT DIỆT CUỐI CÙNG ☠️' });

        const bossSpriteKey = this.getBossSpriteKey();
        const bossSize = this.isPortrait ? 240 : 270;

        let startX = this.isPortrait ? width / 2 : width + 180;
        let startY = this.isPortrait ? -180 : height / 2;
        let targetX = this.isPortrait ? width / 2 : width - 170;
        let targetY = this.isPortrait ? 150 : height / 2;

        const boss = this.enemies.create(startX, startY, bossSpriteKey);
        if (!boss) return;

        boss.setDisplaySize(bossSize, bossSize);
        if (this.isPortrait) boss.setFlipY(true);
        else boss.setFlipX(true);
        boss.setDepth(12);
        boss.isBoss = true;
        boss.body.immovable = true;
        boss.body.moves = false;
        boss.setTint(0xffaa00);

        boss.maxHp = 11000;
        boss.hp = 11000;
        boss.maxShield = 4000;
        boss.shield = 4000;
        boss.scoreValue = 25000;
        boss.attackStep = 0;

        this.boss = boss;

        this.tweens.add({
            targets: boss,
            x: targetX,
            y: targetY,
            duration: 2800,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                if (!boss || !boss.active) return;
                this.bossAttackTimer = this.time.addEvent({
                    delay: 680,
                    callback: this.bossAttackPatternRound3,
                    callbackScope: this,
                    loop: true
                });

                if (this.isPortrait) {
                    this.tweens.add({
                        targets: boss,
                        x: { from: width * 0.2, to: width * 0.8 },
                        y: { from: 130, to: 180 },
                        duration: 2900,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });
                } else {
                    this.tweens.add({
                        targets: boss,
                        x: { from: width - 140, to: width - 210 },
                        y: { from: height * 0.2, to: height * 0.8 },
                        duration: 2900,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });
                }
            }
        });
    }

    /** KIỂU BẮN ROUND 1: BOSS TITAN WARSHIP */
    bossAttackPatternRound1() {
        if (!this.boss || !this.boss.active || this.isGameOver) return;
        this.boss.attackStep = (this.boss.attackStep || 0) + 1;
        const isRage = this.boss.hp < (this.boss.maxHp * 0.5);
        const baseAngle = this.isPortrait ? 90 : 180;

        if (this.boss.attackStep % 3 === 1) {
            // Pattern 1: Xả đạn Plasma 5 hướng
            const angles = [-40, -20, 0, 20, 40];
            angles.forEach(ang => {
                const rad = Phaser.Math.DegToRad(baseAngle + ang);
                const bullet = this.enemyBullets.create(this.boss.x, this.boss.y, 'bullet_boss_orb');
                if (bullet) {
                    bullet.setDisplaySize(30, 30);
                    bullet.setVelocity(Math.cos(rad) * 320, Math.sin(rad) * 320);
                    bullet.setBlendMode('ADD');
                }
            });
            window.soundFX.playEnemyLaser();
        } else if (this.boss.attackStep % 3 === 2) {
            // Pattern 2: Bắn đạn ngắm thẳng mục tiêu người chơi
            if (this.player && this.player.active) {
                const angleToPlayer = Phaser.Math.Angle.Between(this.boss.x, this.boss.y, this.player.x, this.player.y);
                [-0.15, 0, 0.15].forEach(offset => {
                    const bullet = this.enemyBullets.create(this.boss.x, this.boss.y, 'bullet_boss_orb');
                    if (bullet) {
                        bullet.setDisplaySize(28, 28);
                        bullet.setVelocity(Math.cos(angleToPlayer + offset) * 360, Math.sin(angleToPlayer + offset) * 360);
                        bullet.setDepth(18);
                        bullet.setBlendMode('ADD');
                    }
                });
            }
            window.soundFX.playEnemyLaser();
        } else if (isRage) {
            // Pattern 3: Bão đạn xoay 8 hướng
            for (let i = 0; i < 8; i++) {
                const rad = (Math.PI * 2 / 8) * i + (this.time.now * 0.002);
                const bullet = this.enemyBullets.create(this.boss.x, this.boss.y, 'bullet_boss_orb');
                if (bullet) {
                    bullet.setDisplaySize(26, 26);
                    bullet.setVelocity(Math.cos(rad) * 260, Math.sin(rad) * 260);
                    bullet.setDepth(18);
                    bullet.setBlendMode('ADD');
                }
            }
            window.soundFX.playEnemyLaser();
        }
    }

    /** KIỂU BẮN ROUND 2: DUO BOSS (TỬ THẦN ĐỎ & CYBER MEDIC) - HOÀN TOÀN MỚI & ĐỘ KHÓ CAO */
    bossAttackPatternRound2() {
        if (this.isGameOver) return;
        const baseAngle = this.isPortrait ? 90 : 180;

        // 1. TẤN CÔNG CỦA TỬ THẦN ĐỎ (RED DESTROYER)
        if (this.bossRed && this.bossRed.active) {
            this.bossRed.attackStep = (this.bossRed.attackStep || 0) + 1;
            const step = this.bossRed.attackStep;
            const isRage = this.bossRed.hp < (this.bossRed.maxHp * 0.4);

            if (step % 3 === 1) {
                // Pattern 1: TWIN HELIX SPIRAL STREAM (2 luồng đạn xoắn kép đan chéo nhau uốn lượn liên tiếp 4 đợt)
                for (let wave = 0; wave < 4; wave++) {
                    this.time.delayedCall(wave * 90, () => {
                        if (!this.bossRed || !this.bossRed.active || this.isGameOver) return;
                        const t = this.time.now * 0.005 + wave * 0.6;
                        const spread1 = Math.sin(t) * 35;
                        const spread2 = -Math.sin(t) * 35;

                        [spread1, spread2].forEach(sp => {
                            const rad = Phaser.Math.DegToRad(baseAngle + sp);
                            const b = this.enemyBullets.create(this.bossRed.x, this.bossRed.y, 'bullet_boss_orb');
                            if (b) {
                                b.setDisplaySize(28, 28);
                                b.setVelocity(Math.cos(rad) * 370, Math.sin(rad) * 370);
                                b.setDepth(18);
                                b.setBlendMode('ADD');
                            }
                        });
                        window.soundFX.playEnemyLaser();
                    });
                }
            } else if (step % 3 === 2) {
                // Pattern 2: SHOTGUN NOVA SPREAD (Bắn chùm 10 tia plasma nổ tỏa rộng + 2 đạn nhắm chặn đường)
                for (let i = 0; i < 10; i++) {
                    const ang = -50 + (i * 11);
                    const rad = Phaser.Math.DegToRad(baseAngle + ang);
                    const b = this.enemyBullets.create(this.bossRed.x, this.bossRed.y, 'bullet_boss_orb');
                    if (b) {
                        b.setDisplaySize(26, 26);
                        b.setVelocity(Math.cos(rad) * 340, Math.sin(rad) * 340);
                        b.setDepth(18);
                        b.setBlendMode('ADD');
                    }
                }
                if (this.player && this.player.active) {
                    const pAngle = Phaser.Math.Angle.Between(this.bossRed.x, this.bossRed.y, this.player.x, this.player.y);
                    [-0.12, 0.12].forEach(off => {
                        const b = this.enemyBullets.create(this.bossRed.x, this.bossRed.y, 'bullet_boss_orb');
                        if (b) {
                            b.setDisplaySize(30, 30);
                            b.setVelocity(Math.cos(pAngle + off) * 400, Math.sin(pAngle + off) * 400);
                            b.setDepth(18);
                            b.setBlendMode('ADD');
                        }
                    });
                }
                window.soundFX.playEnemyLaser();
            } else {
                // Pattern 3: SPLIT CLUSTER PLASMA (Bắn quả cầu plasma lớn, sau 450ms tách thành 6 tia con tỏa ra)
                if (this.player && this.player.active) {
                    const pAngle = Phaser.Math.Angle.Between(this.bossRed.x, this.bossRed.y, this.player.x, this.player.y);
                    const cluster = this.enemyBullets.create(this.bossRed.x, this.bossRed.y, 'bullet_boss_orb');
                    if (cluster) {
                        cluster.setDisplaySize(38, 38);
                        cluster.setVelocity(Math.cos(pAngle) * 300, Math.sin(pAngle) * 300);
                        cluster.setDepth(18);
                        cluster.setBlendMode('ADD');

                        // Phân tách sau 450ms
                        this.time.delayedCall(450, () => {
                            if (!cluster || !cluster.active) return;
                            const cx = cluster.x;
                            const cy = cluster.y;
                            cluster.destroy();
                            this.createHitSparks(cx, cy, true);
                            window.soundFX.playLaser(0.5);

                            for (let k = 0; k < 6; k++) {
                                const splitRad = (Math.PI * 2 / 6) * k;
                                const subB = this.enemyBullets.create(cx, cy, 'bullet_boss_orb');
                                if (subB) {
                                    subB.setDisplaySize(22, 22);
                                    subB.setVelocity(Math.cos(splitRad) * 280, Math.sin(splitRad) * 280);
                                    subB.setDepth(18);
                                    subB.setBlendMode('ADD');
                                }
                            }
                        });
                    }
                }
            }

            // Giai đoạn Cuồng Nộ: Xả thêm đạn xoay
            if (isRage) {
                for (let j = 0; j < 4; j++) {
                    const r = (Math.PI * 2 / 4) * j + (this.time.now * 0.003);
                    const rb = this.enemyBullets.create(this.bossRed.x, this.bossRed.y, 'bullet_boss_orb');
                    if (rb) {
                        rb.setDisplaySize(24, 24);
                        rb.setVelocity(Math.cos(r) * 290, Math.sin(r) * 290);
                        rb.setDepth(18);
                        rb.setBlendMode('ADD');
                    }
                }
            }
        }

        // 2. TẤN CÔNG HỖ TRỢ CỦA CYBER MEDIC (GREEN HEALER BOSS)
        if (this.bossGreen && this.bossGreen.active) {
            this.bossGreen.attackStep = (this.bossGreen.attackStep || 0) + 1;
            const gStep = this.bossGreen.attackStep;

            if (gStep % 2 === 1 && this.player && this.player.active) {
                // Bắn 3 tia ngắm nhắm người chơi
                const gAngle = Phaser.Math.Angle.Between(this.bossGreen.x, this.bossGreen.y, this.player.x, this.player.y);
                [-0.15, 0, 0.15].forEach(off => {
                    const gb = this.enemyBullets.create(this.bossGreen.x, this.bossGreen.y, 'bullet_boss_green_orb');
                    if (gb) {
                        gb.setDisplaySize(24, 24);
                        gb.setVelocity(Math.cos(gAngle + off) * 380, Math.sin(gAngle + off) * 380);
                        gb.setDepth(18);
                        gb.setBlendMode('ADD');
                    }
                });
                window.soundFX.playEnemyLaser();
            } else {
                // Vòng năng lượng bảo vệ 6 tia
                for (let k = 0; k < 6; k++) {
                    const rad = (Math.PI * 2 / 6) * k + (this.time.now * 0.0015);
                    const gb = this.enemyBullets.create(this.bossGreen.x, this.bossGreen.y, 'bullet_boss_green_orb');
                    if (gb) {
                        gb.setDisplaySize(22, 22);
                        gb.setVelocity(Math.cos(rad) * 240, Math.sin(rad) * 240);
                        gb.setDepth(18);
                        gb.setBlendMode('ADD');
                    }
                }
            }
        }
    }

    /** KIỂU BẮN ROUND 3: BOSS TUYỆT DIỆT OMEGA */
    bossAttackPatternRound3() {
        if (!this.boss || !this.boss.active || this.isGameOver) return;
        this.boss.attackStep = (this.boss.attackStep || 0) + 1;
        const step = this.boss.attackStep;

        if (step % 3 === 1) {
            // Starburst 12 hướng xoay tròn
            for (let i = 0; i < 12; i++) {
                const rad = (Math.PI * 2 / 12) * i + (this.time.now * 0.0025);
                const b = this.enemyBullets.create(this.boss.x, this.boss.y, 'bullet_boss_orb');
                if (b) {
                    b.setDisplaySize(28, 28);
                    b.setVelocity(Math.cos(rad) * 300, Math.sin(rad) * 300);
                    b.setDepth(18);
                    b.setBlendMode('ADD');
                }
            }
            window.soundFX.playEnemyLaser();
        } else if (step % 3 === 2 && this.player && this.player.active) {
            // Quad hyper precision sniper burst
            const pAngle = Phaser.Math.Angle.Between(this.boss.x, this.boss.y, this.player.x, this.player.y);
            [-0.2, -0.07, 0.07, 0.2].forEach(off => {
                const b = this.enemyBullets.create(this.boss.x, this.boss.y, 'bullet_boss_orb');
                if (b) {
                    b.setDisplaySize(30, 30);
                    b.setVelocity(Math.cos(pAngle + off) * 420, Math.sin(pAngle + off) * 420);
                    b.setDepth(18);
                    b.setBlendMode('ADD');
                }
            });
            window.soundFX.playEnemyLaser();
        } else {
            // Sóng đạn chùm kèm mưa thiên thạch hỗ trợ
            if (this.meteors && this.meteors.countActive(true) < 8) {
                this.spawnMeteor();
            }
            for (let i = 0; i < 8; i++) {
                const rad = (Math.PI * 2 / 8) * i;
                const b = this.enemyBullets.create(this.boss.x, this.boss.y, 'bullet_boss_orb');
                if (b) {
                    b.setDisplaySize(26, 26);
                    b.setVelocity(Math.cos(rad) * 320, Math.sin(rad) * 320);
                    b.setDepth(18);
                    b.setBlendMode('ADD');
                }
            }
        }
    }

    firePlayerBullet() {
        if (this.isGameOver || !this.player || !this.player.active) return;

        const now = this.time.now;
        if (now - this.lastFired < this.fireRate) return;
        this.lastFired = now;

        const bulletTexture = this.isPortrait ? 'bullet_player_v' : 'bullet_player_h';
        const x = this.player.x;
        const y = this.player.y;
        const bSpeed = 980;

        if (this.isPortrait) {
            if (this.weaponLevel === 1) {
                this.createPlayerBullet(x, y - 28, 0, -bSpeed, bulletTexture);
            } else if (this.weaponLevel === 2) {
                this.createPlayerBullet(x - 15, y - 28, 0, -bSpeed, bulletTexture);
                this.createPlayerBullet(x + 15, y - 28, 0, -bSpeed, bulletTexture);
            } else if (this.weaponLevel === 3) {
                this.createPlayerBullet(x, y - 28, 0, -bSpeed, bulletTexture);
                this.createPlayerBullet(x - 18, y - 28, -120, -(bSpeed - 30), bulletTexture);
                this.createPlayerBullet(x + 18, y - 28, 120, -(bSpeed - 30), bulletTexture);
            } else {
                this.createPlayerBullet(x - 22, y - 28, -90, -(bSpeed + 20), bulletTexture);
                this.createPlayerBullet(x - 8, y - 30, 0, -(bSpeed + 70), bulletTexture);
                this.createPlayerBullet(x + 8, y - 30, 0, -(bSpeed + 70), bulletTexture);
                this.createPlayerBullet(x + 22, y - 28, 90, -(bSpeed + 20), bulletTexture);
            }
        } else {
            if (this.weaponLevel === 1) {
                this.createPlayerBullet(x + 28, y, bSpeed, 0, bulletTexture);
            } else if (this.weaponLevel === 2) {
                this.createPlayerBullet(x + 28, y - 15, bSpeed, 0, bulletTexture);
                this.createPlayerBullet(x + 28, y + 15, bSpeed, 0, bulletTexture);
            } else if (this.weaponLevel === 3) {
                this.createPlayerBullet(x + 28, y, bSpeed, 0, bulletTexture);
                this.createPlayerBullet(x + 28, y - 18, (bSpeed - 30), -120, bulletTexture);
                this.createPlayerBullet(x + 28, y + 18, (bSpeed - 30), 120, bulletTexture);
            } else {
                this.createPlayerBullet(x + 28, y - 22, (bSpeed + 20), -90, bulletTexture);
                this.createPlayerBullet(x + 30, y - 8, (bSpeed + 70), 0, bulletTexture);
                this.createPlayerBullet(x + 30, y + 8, (bSpeed + 70), 0, bulletTexture);
                this.createPlayerBullet(x + 28, y + 22, (bSpeed + 20), 90, bulletTexture);
            }
        }

        window.soundFX.playLaser();
    }

    createPlayerBullet(x, y, vx, vy, textureKey) {
        const bullet = this.playerBullets.create(x, y, textureKey);
        if (bullet) {
            bullet.setDepth(18);
            bullet.setBlendMode('ADD');
            bullet.setVelocity(vx, vy);
        }
    }

    /**
     * ĐẠN KẺ THÙ PHÂN LOẠI THEO TỪNG LOẠI ĐỊCH:
     * - straight: Đạn thẳng đỏ nhỏ gọn
     * - aimed  : 3 tia đạn tím NHẮM THẲNG về phía người chơi
     * - fireball : PHUN CỤC LỬA - cầu lửa khổng lồ liên tiếp 3 viên
     */
    enemyFire(enemy) {
        if (this.isGameOver || !enemy || !enemy.active) return;
        const textureKey = this.isPortrait ? 'bullet_enemy_v' : 'bullet_enemy_h';
        const startX = this.isPortrait ? enemy.x : enemy.x - 25;
        const startY = this.isPortrait ? enemy.y + 25 : enemy.y;

        // ===== ENEMY2: ĐẠN NHẮM MỤC TIÊU (TÍM) =====
        if (enemy.fireMode === 'aimed') {
            if (!this.player || !this.player.active) return;
            const angleToPlayer = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
            [-0.18, 0, 0.18].forEach(offset => {
                const bullet = this.enemyBullets.create(enemy.x, enemy.y, textureKey);
                if (bullet) {
                    bullet.setDisplaySize(this.isPortrait ? 10 : 24, this.isPortrait ? 24 : 10);
                    bullet.setRotation(Math.atan2(Math.sin(angleToPlayer + offset), Math.cos(angleToPlayer + offset)) + (this.isPortrait ? Math.PI / 2 : 0));
                    bullet.setVelocity(Math.cos(angleToPlayer + offset) * 340, Math.sin(angleToPlayer + offset) * 340);
                    bullet.setTint(0xcc44ff);
                    bullet.setDepth(18);
                    bullet.setBlendMode('ADD');
                }
            });
            window.soundFX.playEnemyLaser();
            return;
        }

        // ===== ENEMY3: PHUN CỤC LỬA (3 VIÊN LIÊN TIẾP) =====
        if (enemy.fireMode === 'fireball') {
            let burstCount = 0;
            const fireBurst = () => {
                if (this.isGameOver || !enemy.active || burstCount >= 3) return;
                burstCount++;

                let vx = 0, vy = 0;
                if (this.player && this.player.active) {
                    const angleToPlayer = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
                    vx = Math.cos(angleToPlayer) * 250;
                    vy = Math.sin(angleToPlayer) * 250;
                } else {
                    vx = this.isPortrait ? 0 : -250;
                    vy = this.isPortrait ? 250 : 0;
                }

                const fireball = this.enemyBullets.create(enemy.x, enemy.y + (this.isPortrait ? 20 : 0), 'bullet_fireball');
                if (fireball) {
                    fireball.setDisplaySize(34, 34);
                    fireball.setVelocity(vx, vy);
                    fireball.setDepth(18);
                    fireball.setBlendMode('ADD');
                    // Cầu lửa phồng xẹp như đang bùng cháy
                    this.tweens.add({
                        targets: fireball,
                        displayWidth: { from: 30, to: 40 },
                        displayHeight: { from: 30, to: 40 },
                        duration: 160,
                        yoyo: true,
                        repeat: 4
                    });
                }
                window.soundFX.playEnemyLaser();
                this.time.delayedCall(140, fireBurst); // Phun liên tiếp 3 cục
            };
            fireBurst();
            return;
        }

        // ===== ENEMY1: ĐẠN THẲNG THƯỜNG =====
        const bullet = this.enemyBullets.create(startX, startY, textureKey);
        if (bullet) {
            // Đạn nhỏ gọn
            if (this.isPortrait) {
                bullet.setDisplaySize(8, 20);
                bullet.setVelocityY(400);
            } else {
                bullet.setDisplaySize(20, 8);
                bullet.setVelocityX(-400);
            }
            bullet.setDepth(18);
            bullet.setBlendMode('ADD');
            window.soundFX.playEnemyLaser();
        }
    }

    allyFire(ally) {
        if (this.isGameOver || !ally || !ally.active) return;

        const targets = this.enemies.getChildren().filter(enemy => enemy.active);
        const target = targets.length > 0 ? Phaser.Math.RND.pick(targets) : null;
        const textureKey = this.isPortrait ? 'bullet_enemy_v' : 'bullet_enemy_h';
        const angle = target
            ? Phaser.Math.Angle.Between(ally.x, ally.y, target.x, target.y)
            : (this.isPortrait ? -Math.PI / 2 : 0);
        const speed = ally.fireMode === 'fireball' ? 250 : ally.fireMode === 'aimed' ? 340 : 520;
        const tint = ally.fireMode === 'fireball' ? 0xff8833 : ally.fireMode === 'aimed' ? 0xcc44ff : 0xff3355;
        const offsets = ally.fireMode === 'aimed' ? [-0.18, 0, 0.18] : [0];

        offsets.forEach(offset => {
            const bulletTexture = ally.fireMode === 'fireball' ? 'bullet_fireball' : textureKey;
            const bullet = this.allyBullets.create(ally.x, ally.y, bulletTexture);
            if (!bullet) return;

            bullet.isAllyBullet = true;
            bullet.damage = 4;
            bullet.setTint(tint);
            bullet.setDepth(18);
            bullet.setBlendMode('ADD');
            if (ally.fireMode === 'fireball') {
                bullet.setDisplaySize(28, 28);
            } else {
                bullet.setDisplaySize(this.isPortrait ? 8 : 20, this.isPortrait ? 20 : 8);
                bullet.setRotation(angle + offset + (this.isPortrait ? Math.PI / 2 : 0));
            }
            bullet.setVelocity(Math.cos(angle + offset) * speed, Math.sin(angle + offset) * speed);
        });
        window.soundFX.playEnemyLaser();
    }

    handleBulletHitEnemy(bullet, enemy) {
        if (!bullet.active || !enemy.active) return;
        const dmg = bullet.damage !== undefined ? bullet.damage : (bullet.isAllyBullet ? 4 : 15);
        bullet.destroy();

        if (enemy.isBoss && enemy.shield > 0) {
            enemy.shield -= dmg;
            if (enemy.shield < 0) {
                enemy.hp += enemy.shield;
                enemy.shield = 0;
            }
        } else {
            enemy.hp -= dmg;
        }

        this.createHitSparks(bullet.x, bullet.y);

        // HIỆU ỨNG BOSS CHỚP CHỚP KHI BỊ BẮN TRÚNG
        if (enemy.isBoss) {
            enemy.setTint(0xff0055);
            this.time.delayedCall(70, () => {
                if (enemy.active) enemy.setTint(0xffffff);
            });
            this.time.delayedCall(140, () => {
                if (enemy.active) enemy.clearTint();
            });
            this.cameras.main.shake(60, 0.005);
        } else {
            enemy.setTint(0xffffff);
            this.time.delayedCall(60, () => {
                if (enemy.active) enemy.clearTint();
            });
        }

        if (enemy.hp <= 0) {
            this.destroyEnemy(enemy);
        }
    }

    handleBulletHitSatellite(bullet, sat) {
        if (!bullet.active || !sat.active) return;
        const dmg = bullet.damage !== undefined ? bullet.damage : (bullet.isAllyBullet ? 4 : 15);
        bullet.destroy();
        sat.hp -= dmg;
        this.createHitSparks(bullet.x, bullet.y);

        if (sat.hp <= 0) {
            this.createExplosion(sat.x, sat.y, false);
            sat.destroy();
            this.addScore(200);

            // KÍCH HOẠT HỆ THỐNG TỰ ĐỘNG PHÓNG ROCKET TÌM DIỆT (MỖI 3S PHÓNG 1 ĐỢT)
            this.unlockAutoHomingRockets();
        }
    }

    /**
     * KÍCH HOẠT AUTO HOMING ROCKET KHI BẮN VỠ VỆ TINH
     */
    unlockAutoHomingRockets() {
        this.hasHomingRockets = true;
        this.events.emit('showBanner', '🚀 ĐÃ KÍCH HOẠT AUTO ROCKET TÌM DIỆT (MỖI 3S / ĐỢT)!');
        if (this.player && this.player.active) {
            this.showFloatingText(this.player.x, this.player.y - 45, '🚀 AUTO ROCKET ACTIVATED!', '#ffcc00');
        }

        // Phóng ngay 1 đợt tên lửa
        this.launchHomingRockets();

        // Tự động lặp lại mỗi 3 giây
        if (this.homingRocketTimer) this.homingRocketTimer.remove();
        this.homingRocketTimer = this.time.addEvent({
            delay: 3000,
            callback: this.launchHomingRockets,
            callbackScope: this,
            loop: true
        });
    }

    launchHomingRockets() {
        if (this.isGameOver || !this.player || !this.player.active) return;

        window.soundFX.playLaser(0.65);
        const x = this.player.x;
        const y = this.player.y;

        // Dùng sprite rocket.png (ưu tiên), fallback texture canvas nếu chưa có file
        const rocketTex = this.textures.exists('rocket') ? 'rocket' : 'bullet_homing_missile';

        // Phóng 2 tên lửa từ 2 cánh phi thuyền
        [-1, 1].forEach(side => {
            const spawnX = this.isPortrait ? x + side * 26 : x - 8;
            const spawnY = this.isPortrait ? y - 8 : y + side * 26;

            const rocket = this.homingRockets.create(spawnX, spawnY, rocketTex);
            if (rocket) {
                // Hiển thị tên lửa đúng tỉ lệ thật của ảnh, kích thước phù hợp màn hình
                const rw = rocket.width || 32;
                const rh = rocket.height || 32;
                const targetLong = this.isPortrait ? 42 : 46; // chiều dài thân rocket
                if (rh >= rw) {
                    rocket.setDisplaySize(targetLong * (rw / rh), targetLong);
                } else {
                    rocket.setDisplaySize(targetLong, targetLong * (rh / rw));
                }
                rocket.setDepth(18);
                const initAngle = this.isPortrait ? -Math.PI / 2 : 0;
                rocket.flightAngle = initAngle;
                rocket.setRotation(initAngle + Math.PI / 2);
                const rSpeed = 320;
                rocket.setVelocity(Math.cos(initAngle) * rSpeed, Math.sin(initAngle) * rSpeed);
                rocket.lifeTime = 0;
            }
        });
    }

    handleRocketHitEnemy(rocket, enemy) {
        if (!rocket.active || !enemy.active) return;
        rocket.destroy();

        this.createExplosion(rocket.x, rocket.y, false);

        if (enemy.isBoss && enemy.shield > 0) {
            enemy.shield -= 65;
            if (enemy.shield < 0) {
                enemy.hp += enemy.shield;
                enemy.shield = 0;
            }
        } else {
            enemy.hp -= 65; // Sát thương tên lửa cực mạnh
        }

        this.createHitSparks(rocket.x, rocket.y);

        if (enemy.isBoss) {
            enemy.setTint(0xff0055);
            this.time.delayedCall(70, () => { if (enemy.active) enemy.clearTint(); });
        } else {
            enemy.setTint(0xffffff);
            this.time.delayedCall(60, () => { if (enemy.active) enemy.clearTint(); });
        }

        if (enemy.hp <= 0) {
            this.destroyEnemy(enemy);
        }
    }

    handleRocketHitSatellite(rocket, sat) {
        if (!rocket.active || !sat.active) return;
        rocket.destroy();
        this.createExplosion(rocket.x, rocket.y, false);
        sat.hp -= 50;
        if (sat.hp <= 0) {
            sat.destroy();
            this.addScore(200);
            this.unlockAutoHomingRockets();
        }
    }

    destroyEnemy(enemy) {
        const isBoss = enemy.isBoss;
        const x = enemy.x;
        const y = enemy.y;

        if (isBoss) {
            if (this.round === 2) {
                if (enemy === this.bossGreen || enemy.isBossGreen) {
                    this.bossGreen = null;
                    if (this.bossHealTimer) {
                        this.bossHealTimer.remove();
                        this.bossHealTimer = null;
                    }
                    this.triggerSingleBossDestruction(enemy);
                    this.events.emit('showBanner', '💚 ĐÃ TIÊU DIỆT BOSS HỒI MÁU! HÃY HẠ GỤC TỬ THẦN ĐỎ!');
                    if (this.bossRed && this.bossRed.active) {
                        this.bossRed.setTint(0xff0000);
                        this.showFloatingText(this.bossRed.x, this.bossRed.y - 45, '🔥 TỬ THẦN ĐỎ CUỒNG NỘ!', '#ff0033');
                    }
                    if (!this.bossRed || !this.bossRed.active) {
                        this.onDuoBossFullyDefeated();
                    }
                    return;
                } else if (enemy === this.bossRed || enemy.isBossRed) {
                    this.bossRed = null;
                    this.triggerSingleBossDestruction(enemy);
                    this.events.emit('showBanner', '💥 ĐÃ TIÊU DIỆT TỬ THẦN ĐỎ!');
                    if (!this.bossGreen || !this.bossGreen.active) {
                        this.onDuoBossFullyDefeated();
                    }
                    return;
                }
            }

            // Round 1 / Round 3 Boss hủy diệt toàn cục
            this.triggerBossEpicDestruction(enemy);
            return;
        }

        this.createExplosion(x, y, false);
        this.addScore(enemy.scoreValue);
        this.killCount++;

        // 18% RỚT VIÊN NGỌC THU PHỤC ĐỒNG MINH (CAPTURE ORB) - ĐÃ GIẢM TỪ 35%
        if (Math.random() < 0.18) {
            this.spawnCaptureOrb(x, y);
        }

        if (Math.random() < 0.25) {
            this.spawnPowerup(x, y);
        }

        enemy.destroy();
    }

    /**
     * TẠO VIÊN NGỌC THU PHỤC (CAPTURE ORB) LƠ LỬNG TRONG KHÔNG GIAN
     */
    spawnCaptureOrb(x, y) {
        const orb = this.captureOrbs.create(x, y, 'capture_orb');
        if (!orb) return;

        orb.setDisplaySize(38, 38);
        orb.setDepth(15);
        orb.setBlendMode('ADD');
        orb.isBeingPulled = false;

        const vx = this.isPortrait ? Phaser.Math.Between(-25, 25) : Phaser.Math.Between(-55, -20);
        const vy = this.isPortrait ? Phaser.Math.Between(30, 60) : Phaser.Math.Between(-25, 25);
        orb.setVelocity(vx, vy);

        this.tweens.add({
            targets: orb,
            scale: { from: 0.85, to: 1.25 },
            alpha: { from: 0.85, to: 1 },
            duration: 550,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.events.emit('orbAvailable', true);
        this.showFloatingText(x, y - 25, '🔮 [E] THU PHỤC!', '#00f0ff');

        // Tự động tan biến sau 14 giây nếu không thu phục
        this.time.delayedCall(14000, () => {
            if (orb && orb.active && !orb.isBeingPulled) {
                orb.destroy();
                const count = this.captureOrbs.countActive(true);
                this.events.emit('orbAvailable', count > 0);
            }
        });
    }

    /**
     * KÍCH HOẠT ĐƯỜNG ĐIỆN TRACTOR BEAM KÉO VIÊN NGỌC VỀ TÀU (BẤM E HOẶC NÚT THU PHỤC)
     */
    activateTractorBeam() {
        if (this.isGameOver || !this.player || !this.player.active) return;
        const activeOrbs = this.captureOrbs.getChildren().filter(o => o.active);
        if (activeOrbs.length === 0) return;

        window.soundFX.playTractorBeam();
        this.cameras.main.shake(120, 0.008);

        activeOrbs.forEach(orb => {
            orb.isBeingPulled = true;
            this.physics.moveToObject(orb, this.player, 920);
        });

        this.showFloatingText(this.player.x, this.player.y - 35, '⚡ TRACTOR BEAM! ⚡', '#00f0ff');
    }

    /**
     * KHI NGƯỜI CHƠI CHẠM VÀO VIÊN NGỌC: TRIỆU HỒI PHI THUYỀN KẺ THÙ MINI LÀM ĐỒNG MINH
     */
    handleCollectCaptureOrb(player, orb) {
        if (!orb.active) return;
        orb.destroy();

        window.soundFX.playCaptureSound();
        this.createHitSparks(player.x, player.y);
        this.cameras.main.flash(180, 0, 240, 255);

        this.spawnMiniAllyDrone();
        this.addScore(300);

        const count = this.captureOrbs.countActive(true);
        this.events.emit('orbAvailable', count > 0);
    }

    /**
     * TRIỆU HỒI PHI THUYỀN KẺ THÙ MINI LÀM ĐỒNG MINH (HỘ TỐNG & BẮN HỖ TRỢ)
     */
    spawnMiniAllyDrone() {
        const allyCount = this.allies.countActive(true);
        if (allyCount >= 3) {
            // Đã max 3 đồng minh: Cường hóa sát thương
            this.weaponLevel = Math.min(4, this.weaponLevel + 1);
            this.showFloatingText(this.player.x, this.player.y - 45, '⚡ TỐI ĐA ĐỒNG MINH! NÂNG CẤP VŨ KHÍ!', '#ffcc00');
            return;
        }

        const capturedEnemies = this.enemies.getChildren().filter(enemy => enemy.active && !enemy.isBoss);
        const capturedEnemy = capturedEnemies.length > 0 ? Phaser.Math.RND.pick(capturedEnemies) : null;
        const capturedBase = capturedEnemy ? capturedEnemy.enemyBase : this.pickEnemyBaseKey();
        const droneKey = this.getEnemySpriteKey(capturedBase);
        const drone = this.allies.create(this.player.x, this.player.y + 40, droneKey);
        if (!drone) return;

        drone.setDisplaySize(36, 36);
        drone.setDepth(13);
        drone.setTint(0x00f0ff);
        drone.allyIndex = allyCount;
        drone.enemyBase = capturedBase;
        drone.fireMode = capturedEnemy
            ? capturedEnemy.fireMode
            : capturedBase === 'enemy3' ? 'fireball' : capturedBase === 'enemy2' ? 'aimed' : 'straight';
        drone.maxHp = 30;
        drone.hp = 30;

        if (this.isPortrait) {
            drone.setFlipY(false);
        } else {
            drone.setFlipX(false);
        }

        this.events.emit('showBanner', '🛸 ĐÃ THU PHỤC PHI THUYỀN MINI LÀM ĐỒNG MINH!');
        this.showFloatingText(this.player.x, this.player.y - 40, '🛸 +1 ĐỒNG MINH MINI!', '#00ff88');

        this.tweens.add({
            targets: drone,
            alpha: { from: 0.7, to: 1 },
            duration: 400,
            yoyo: true,
            repeat: -1
        });
    }

    /**
     * HỦY DIỆT 1 TRONG 2 CON BOSS CỦA DUO BOSS (ROUND 2)
     */
    triggerSingleBossDestruction(boss) {
        window.soundFX.playBossDefeat();
        const x = boss.x;
        const y = boss.y;
        this.cameras.main.shake(280, 0.014);

        for (let i = 0; i < 3; i++) {
            this.time.delayedCall(i * 140, () => {
                const exX = x + Phaser.Math.Between(-35, 35);
                const exY = y + Phaser.Math.Between(-35, 35);
                this.createExplosion(exX, exY, false);
            });
        }

        this.time.delayedCall(500, () => {
            this.createExplosion(x, y, true);
            this.addScore(boss.scoreValue);
            this.killCount++;
            boss.destroy();
        });
    }

    onDuoBossFullyDefeated() {
        this.bossActive = false;
        if (this.bossAttackTimer) this.bossAttackTimer.remove();
        if (this.bossHealTimer) this.bossHealTimer.remove();
        if (this.healBeamGraphics) this.healBeamGraphics.clear();
        this.events.emit('bossDefeated');
        this.events.emit('showBanner', '🏆 CHIẾN THẮNG: ĐÃ HỦY DIỆT HOÀN TOÀN DUO BOSS!');

        this.time.delayedCall(1400, () => {
            this.advanceToRound(3);
        });
    }

    /**
     * HIỆU ỨNG BOSS BỊ TIÊU DIỆT (ĐÃ TỐI ƯU MƯỢT MÀ 60 FPS, KHÔNG GIẬT LAG)
     */
    triggerBossEpicDestruction(boss) {
        this.bossActive = false;
        if (this.bossAttackTimer) this.bossAttackTimer.remove();
        if (this.bossHealTimer) this.bossHealTimer.remove();
        if (this.healBeamGraphics) this.healBeamGraphics.clear();
        this.events.emit('bossDefeated');
        window.soundFX.playBossDefeat();

        const x = boss.x;
        const y = boss.y;
        const radius = 60;

        // Rung chấn màn hình gọn gàng, dứt khoát 350ms
        this.cameras.main.shake(350, 0.018);

        // Chuỗi 4 vụ nổ điểm nhẹ nhàng quanh thân Boss
        for (let i = 0; i < 4; i++) {
            this.time.delayedCall(i * 180, () => {
                if (!boss || !boss.active) return;
                const exX = x + Phaser.Math.Between(-radius, radius);
                const exY = y + Phaser.Math.Between(-radius, radius);
                this.createExplosion(exX, exY, false); // Nổ nhẹ không làm nghẽn máy
                boss.setTint(i % 2 === 0 ? 0xff0055 : 0xffffff);
            });
        }

        // Vụ nổ hủy diệt dứt điểm sau 800ms
        this.time.delayedCall(800, () => {
            this.cameras.main.flash(250, 255, 255, 255);
            this.createExplosion(x, y, true);

            this.addScore(boss.scoreValue);
            this.killCount++;
            boss.destroy();

            this.events.emit('showBanner', '🏆 ĐẠI CHIẾN THẮNG: TRÙM ĐÃ BỊ HỦY DIỆT!');

            if (this.round < 3) {
                // CÒN ROUND TIẾP THEO: CHUYỂN SANG ROUND MỚI
                this.time.delayedCall(1400, () => {
                    this.advanceToRound(this.round + 1);
                });
            } else {
                // HOÀN THÀNH CẢ 3 ROUND: CHIẾN THẮNG TOÀN CỤC
                this.time.delayedCall(1000, () => {
                    this.triggerVictory();
                });
            }
        });
    }

    /**
     * CHUYỂN SANG ROUND MỚI (SAU KHI HẠ BOSS):
     * Reset wave, hồi 1 HP, đổi nền, kích hoạt hiệu ứng riêng của round đó
     */
    advanceToRound(nextRound) {
        if (this.isGameOver) return;
        this.round = nextRound;
        window.soundFX.playMusic(`sound/round${this.round}.mp3`);
        this.currentWave = 0;
        this.wave = 1;
        this.bossDefeatedOnce = false;
        this.boss = null;
        this.bossRed = null;
        this.bossGreen = null;
        this.isHealingActive = false;
        if (this.bossAttackTimer) this.bossAttackTimer.remove();
        if (this.bossHealTimer) this.bossHealTimer.remove();
        if (this.healBeamGraphics) this.healBeamGraphics.clear();

        // Xóa toàn bộ đạn địch còn sót trên màn hình
        this.enemyBullets.getChildren().slice().forEach(b => b.destroy());

        // Quà chuyển round: hồi 1 HP cho người chơi
        if (this.player && this.player.active) {
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + 1);
        }

        window.soundFX.playBossAlarm();
        this.cameras.main.flash(400, 0, 255, 180);

        const { width, height } = this.scale;
        const roundText = this.add.text(width / 2, height / 2, `🌍 ROUND ${nextRound} 🌍`, {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '42px',
            fontWeight: '900',
            color: '#00ffcc',
            stroke: '#ffffff',
            strokeThickness: 3,
            align: 'center'
        }).setOrigin(0.5).setDepth(30).setScale(0.3).setAlpha(0);

        this.tweens.add({
            targets: roundText,
            scale: { from: 0.3, to: 1 },
            alpha: { from: 0, to: 1 },
            duration: 500,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.tweens.add({
                    targets: roundText,
                    alpha: 0,
                    delay: 1200,
                    duration: 400,
                    onComplete: () => roundText.destroy()
                });
            }
        });

        // Nền mới cho Round 2/3 (bay nhìn từ trên xuống)
        this.applyRoundBackdrop();

        // Round 3: kích hoạt mưa thiên thạch
        if (nextRound >= 3) {
            this.startMeteorShower();
        }

        // Khởi động lại vòng lặp spawn wave
        this.restartWaves();
    }

    /** KHỞI ĐỘNG LẠI VÒNG LẶP SPAWN WAVE (dùng khi chuyển round) */
    restartWaves() {
        if (this.spawnEnemyTimer) this.spawnEnemyTimer.remove();
        this.spawnEnemyTimer = this.time.addEvent({
            delay: this.round >= 3 ? 3800 : 4200,
            callback: this.spawnNextWave,
            callbackScope: this,
            loop: true
        });
        this.spawnNextWave(); // Bắn wave đầu tiên của round mới luôn
    }

    /**
     * VĂNG PHI HÀNH GIA KHI PHI THUYỀN NGƯỜI CHƠI BỊ NỔ (TRÔI DẠT VÀO KHÔNG GIAN, KHÔNG CẦN CỨU)
     */
    ejectAstronaut(x, y) {
        if (!this.textures.exists('phihanhgia')) return;

        const astronaut = this.astronauts.create(x, y, 'phihanhgia');
        if (!astronaut) return;

        astronaut.setDisplaySize(48, 48);
        astronaut.setDepth(15);

        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const force = Phaser.Math.Between(80, 160);
        const extraVx = this.isPortrait ? 0 : -45;
        const extraVy = this.isPortrait ? 45 : 0;

        astronaut.setVelocity(Math.cos(angle) * force + extraVx, Math.sin(angle) * force + extraVy);
        astronaut.setAngularVelocity(Phaser.Math.Between(-140, 140));

        // Phi hành gia trôi dạt vào không gian sâu thẳm
        this.tweens.add({
            targets: astronaut,
            scale: 0.3,
            alpha: 0,
            duration: 3500,
            ease: 'Quad.easeIn',
            onComplete: () => {
                if (astronaut && astronaut.active) astronaut.destroy();
            }
        });
    }

    spawnPowerup(x, y) {
        const types = ['powerup_weapon', 'powerup_shield', 'powerup_heal', 'powerup_speed', 'powerup_electric'];
        const type = Phaser.Math.RND.pick(types);
        const powerup = this.powerups.create(x, y, type);
        if (!powerup) return;

        powerup.setDisplaySize(36, 36);
        powerup.setDepth(14);
        powerup.type = type;
        if (this.isPortrait) {
            powerup.setVelocityY(90);
        } else {
            powerup.setVelocityX(-90);
        }
        powerup.setAngularVelocity(60);
    }

    handleCollectPowerup(player, powerup) {
        if (!powerup.active) return;
        const type = powerup.type;
        powerup.destroy();

        window.soundFX.playPowerup();

        if (type === 'powerup_weapon') {
            this.weaponLevel = Math.min(4, this.weaponLevel + 1);
            this.showFloatingText(player.x, player.y - 30, '⚡ NÂNG CẤP VŨ KHÍ!', '#ff0055');
        } else if (type === 'powerup_shield') {
            this.player.shield = 1;
            this.player.maxShield = 1;
            this.showFloatingText(player.x, player.y - 30, '🛡️ +1 KHIÊN ĐỠ ĐẠN!', '#00f0ff');
        } else if (type === 'powerup_heal') {
            // MẮT MỖI LẦN ĂN CHỈ HỒI 0.25 HP (thay vì 1 HP)
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + 0.25);
            this.showFloatingText(player.x, player.y - 30, '❤️ +0.25 HP!', '#00ff88');
        } else if (type === 'powerup_electric') {
            // KHIÊN ĐIỆN PHẢN ĐÒN 15 GIÂY
            this.activateElectricShield();
        } else if (type === 'powerup_speed') {
            this.player.speed = 440;
            this.time.delayedCall(8000, () => {
                if (this.player) this.player.speed = 360;
            });
            this.showFloatingText(player.x, player.y - 30, '🚀 TĂNG TỐC ĐỘ!', '#ffcc00');
        }
    }

    handleEnemyBulletHitPlayer(player, bullet) {
        if (this.isGameOver || player.invulnerable || !bullet.active) return;
        bullet.destroy();

        // KHIÊN ĐIỆN PHẢN ĐÒN: đạn bị hấp thụ, không trừ HP, phản sát thương ra xung quanh
        if (this.electricShieldTimer > 0) {
            this.reflectElectricShield(player.x, player.y);
            return;
        }

        this.damagePlayer(1);
    }

    /**
     * ⚡ KÍCH HOẠT KHIÊN ĐIỆN PHẢN ĐÒN (15 GIÂY)
     * - Tạo vòng điện bao quanh phi thuyền (sprite glow + các quả cầu điện bay xung quanh)
     * - Đạn địch chạm khiên sẽ bị phản đòn (gây dmg lên địch lân cận)
     */
    activateElectricShield() {
        if (!this.player) return;
        this.player.electricShieldActive = true;
        this.electricShieldTimer = 15000; // 15 giây (tính bằng ms)

        // Xoá khiên cũ nếu có
        this.destroyElectricShieldVisual();

        window.soundFX.playTractorBeam();
        this.cameras.main.flash(180, 160, 60, 255);
        this.showFloatingText(this.player.x, this.player.y - 50, '⚡ KHIÊN ĐIỆN PHẢN ĐÒN! (15s)', '#cc66ff');

        // 1. Vầng hào quang điện bao quanh thân tàu
        this.electricShieldVisual = this.add.image(this.player.x, this.player.y, 'particle_glow')
            .setDisplaySize(120, 120)
            .setTint(0xcc44ff)
            .setBlendMode('ADD')
            .setAlpha(0.55)
            .setDepth(11);
        this.tweens.add({
            targets: this.electricShieldVisual,
            alpha: { from: 0.35, to: 0.75 },
            duration: 260,
            yoyo: true,
            repeat: -1
        });

        // 2. Ba quả cầu điện bay quay quanh phi thuyền (orbit)
        const orbitRadius = 62;
        for (let i = 0; i < 3; i++) {
            const orb = this.add.image(this.player.x, this.player.y, 'particle_glow')
                .setDisplaySize(18, 18)
                .setTint(i % 2 === 0 ? 0xffffff : 0x88ccff)
                .setBlendMode('ADD')
                .setDepth(21);
            orb.orbitIndex = i;
            this.electricShieldOrbs.push(orb);
        }

        this.events.emit('showBanner', '⚡ KHIÊN ĐIỆN PHẢN ĐÒN KÍCH HOẠT (15S)!');
    }

    /** Hủy toàn bộ hình ảnh khiên điện */
    destroyElectricShieldVisual() {
        if (this.electricShieldVisual) {
            this.electricShieldVisual.destroy();
            this.electricShieldVisual = null;
        }
        this.electricShieldOrbs.forEach(o => { if (o && o.active) o.destroy(); });
        this.electricShieldOrbs = [];
        if (this.electricShieldArcGraphics) this.electricShieldArcGraphics.clear();
    }

    drawElectricShieldArcs() {
        if (!this.player || !this.player.active || !this.electricShieldArcGraphics) return;

        const graphics = this.electricShieldArcGraphics;
        const radius = 48;
        const points = 18;
        const phase = this.time.now * 0.012;
        graphics.clear();
        graphics.lineStyle(2.2, 0xcc44ff, 0.9);
        graphics.beginPath();

        for (let i = 0; i <= points; i++) {
            const angle = (i / points) * Math.PI * 2 + phase * 0.02;
            const jitter = i === 0 || i === points ? 0 : Phaser.Math.FloatBetween(-7, 7);
            const x = this.player.x + Math.cos(angle) * (radius + jitter);
            const y = this.player.y + Math.sin(angle) * (radius + jitter);
            if (i === 0) graphics.moveTo(x, y);
            else graphics.lineTo(x, y);
        }
        graphics.strokePath();

        graphics.lineStyle(1, 0xffffff, 0.95);
        graphics.beginPath();
        for (let i = 0; i < points; i += 3) {
            const startAngle = (i / points) * Math.PI * 2 + phase * 0.02;
            const endAngle = startAngle + Phaser.Math.FloatBetween(0.12, 0.28);
            graphics.moveTo(
                this.player.x + Math.cos(startAngle) * radius,
                this.player.y + Math.sin(startAngle) * radius
            );
            graphics.lineTo(
                this.player.x + Math.cos(endAngle) * (radius + Phaser.Math.Between(-5, 5)),
                this.player.y + Math.sin(endAngle) * (radius + Phaser.Math.Between(-5, 5))
            );
        }
        graphics.strokePath();
    }

    drawAllyEnergyLinks(alliesList) {
        if (!this.player || !this.player.active || !this.allyLinkGraphics) return;

        const graphics = this.allyLinkGraphics;
        graphics.clear();
        if (alliesList.length === 0) return;

        const pulse = this.time.now * 0.01;
        alliesList.forEach((ally, index) => {
            const dx = ally.x - this.player.x;
            const dy = ally.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const nx = -dy / distance;
            const ny = dx / distance;
            const segments = 7;

            graphics.lineStyle(3, 0x00f0ff, 0.16 + 0.08 * Math.sin(pulse + index));
            graphics.beginPath();
            graphics.moveTo(this.player.x, this.player.y);
            for (let step = 1; step < segments; step++) {
                const progress = step / segments;
                const offset = Math.sin(pulse * 1.7 + step * 2.1 + index) * 9;
                graphics.lineTo(
                    Phaser.Math.Linear(this.player.x, ally.x, progress) + nx * offset,
                    Phaser.Math.Linear(this.player.y, ally.y, progress) + ny * offset
                );
            }
            graphics.lineTo(ally.x, ally.y);
            graphics.strokePath();

            graphics.lineStyle(1, 0xffffff, 0.5);
            graphics.beginPath();
            graphics.moveTo(this.player.x, this.player.y);
            graphics.lineTo(ally.x, ally.y);
            graphics.strokePath();
        });
    }

    /**
     * ⚡ PHẢN ĐÒN KHIÊN ĐIỆN: phóng vòng tóe lửa điện, gây sát thương lên địch quanh player
     */
    reflectElectricShield(x, y) {
        // Vòng điện lan tỏa
        this.createHitSparks(x, y);
        const ring = this.add.image(x, y, 'particle_shockwave')
            .setDisplaySize(20, 20)
            .setTint(0xcc44ff)
            .setBlendMode('ADD')
            .setDepth(22);
        this.tweens.add({
            targets: ring,
            scale: 3,
            alpha: 0,
            duration: 240,
            onComplete: () => ring.destroy()
        });

        // Phản sát thương lên khu vực quaanh player
        const AOE = 200;
        const dmg = 100;
        this.enemies.getChildren().forEach(enemy => {
            if (!enemy.active) return;
            const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
            if (dist > AOE) return;

            enemy.setTint(0xcc44ff);
            this.time.delayedCall(90, () => { if (enemy.active) enemy.clearTint(); });

            if (enemy.isBoss && enemy.shield > 0) {
                enemy.shield -= dmg;
                if (enemy.shield < 0) { enemy.hp += enemy.shield; enemy.shield = 0; }
            } else {
                enemy.hp -= dmg;
            }
            if (enemy.hp <= 0) this.destroyEnemy(enemy);
        });
    }

    /** ĐỒNG MINH BỊ ĐẠN ĐỊCH TRÚNG: mất máu, máu yếu nên dễ gục. Khi hết máu → hạ gục */
    handleEnemyBulletHitAlly(a, b) {
        // Phaser gọi callback theo thứ tự truyền vào overlap (đôi khi đảo vị trí bullet/ally).
        // Nhận diện bằng thuộc tính allyIndex: đạn địch KHÔNG có, đồng minh thì CÓ.
        const bullet = (b && b.allyIndex !== undefined && a && a.allyIndex === undefined) ? a : b;
        const ally = (a === bullet) ? b : a;

        if (!bullet || !ally || !ally.active || !bullet.active) return;
        bullet.destroy();
        this.createHitSparks(ally.x, ally.y);

        ally.hp = (ally.hp || 30) - 10; // mỗi phát địch gây 10 dmg
        ally.setTint(0xff0055);
        this.time.delayedCall(80, () => { if (ally.active) ally.clearTint(); });

        if (ally.hp <= 0) {
            // ĐỒNG MINH BỊ HẠ GỤC
            this.createExplosion(ally.x, ally.y, false);
            ally.destroy();
            this.showFloatingText(ally.x, ally.y - 20, '💥 ĐỒNG MINH HY SINH!', '#ff0055');
        }
    }

    handleShipCollision(player, enemy) {
        if (this.isGameOver || player.invulnerable || !enemy.active) return;
        this.damagePlayer(1);
        if (!enemy.isBoss) {
            this.destroyEnemy(enemy);
        }
    }

    damagePlayer(amount = 1) {
        if (this.player.shield > 0) {
            this.player.shield = 0;
            this.showFloatingText(this.player.x, this.player.y - 30, '🛡️ VỠ KHIÊN!', '#00f0ff');
        } else {
            this.player.hp -= 1; // TRÚNG 1 ĐÒN TRỪ 1 MÁU (3 LẦN TRÚNG ĐẠN LÀ NỔ)
        }

        this.cameras.main.shake(200, 0.02);
        window.soundFX.playExplosion(false);

        // Hiệu ứng chớp tắt 1.1s bất tử thoát hiểm
        this.player.invulnerable = true;
        this.tweens.add({
            targets: this.player,
            alpha: { from: 0.2, to: 0.9 },
            duration: 110,
            yoyo: true,
            repeat: 5,
            onComplete: () => {
                if (this.player) {
                    this.player.invulnerable = false;
                    this.player.setAlpha(1);
                }
            }
        });

        if (this.player.hp <= 0) {
            this.triggerPlayerExplosion();
        }
    }

    triggerPlayerExplosion() {
        if (this.isGameOver) return;
        this.isGameOver = true;

        const x = this.player.x;
        const y = this.player.y;

        this.createExplosion(x, y, true);
        this.cameras.main.shake(500, 0.035);

        // VĂNG PHI HÀNH GIA KHI TÀU NỔ
        this.ejectAstronaut(x, y);

        // HIỂN THỊ THÔNG BÁO YOU LOSE KHI PHI THUYỀN BỊ NỔ
        this.events.emit('showBanner', '💀 YOU LOSE! 💀');
        this.showFloatingText(x, y - 20, '💀 YOU LOSE 💀', '#ff0055');

        this.player.setVisible(false);
        this.shieldVisual.setVisible(false);
        this.thrusterEmitter.stop();

        if (this.megaLaserBeam) {
            this.megaLaserBeam.destroy();
            this.isMegaLaserActive = false;
        }

        // Dọn dẹp Ult Sét khi tàu nổ
        if (this.thunderTimer) {
            this.thunderTimer.remove();
            this.isThunderActive = false;
        }

        // Dọn dẹp Khiên Điện khi tàu nổ
        if (this.electricShieldTimer > 0) {
            this.electricShieldTimer = 0;
            if (this.player) this.player.electricShieldActive = false;
            this.destroyElectricShieldVisual();
        }

        this.time.delayedCall(1200, () => {
            this.events.emit('gameOver', {
                score: this.score,
                rescued: this.rescuedCount,
                kills: this.killCount
            });
        });
    }

    /**
     * TUYỆT CHIÊU ULTIMATE - PHÂN LOẠI THEO PHI THUYỀN:
     * - P1 (CHIẾN HẠM ALPHA)   : Tia Laze Khổng Lồ Blue
     * - P2 (CHIẾN HẠM PHANTOM) : THUNDER STRIKE - Phóng Sét giáng xuống toàn màn hình
     */
    triggerUltimateAttack() {
        if (this.isGameOver || !this.player || !this.player.active) return;
        if (this.player.ultimateEnergy < 100 || this.isMegaLaserActive || this.isThunderActive) return;

        if (this.selectedShipBase === 'player2') {
            this.triggerThunderStrike();
        } else {
            this.triggerMegaLaser();
        }
    }

    /**
     * ⚡ THUNDER STRIKE (ULTI PHI THUYỀN 2): PHÓNG 12 TIA SÉT GIÁNG XUỐNG
     * Mỗi tia sét đánh vào kẻ địch ngẫu nhiên, sát thương diện rộng + xóa đạn địch quanh điểm đánh
     */
    triggerThunderStrike() {
        this.player.ultimateEnergy = 0;
        this.isThunderActive = true;
        this.thunderStrikeCount = 0;

        window.soundFX.playElectricUltimate();
        window.soundFX.playUltimate();
        window.soundFX.playTractorBeam();
        this.cameras.main.shake(300, 0.014);
        this.cameras.main.flash(250, 200, 220, 255);

        const { width, height } = this.scale;
        this.showFloatingText(width / 2, height / 2, '⚡⚡ THUNDER STRIKE! ⚡⚡', '#ffee44');

        // Giáng 12 tia sét liên tiếp, mỗi 130ms một tia
        this.thunderTimer = this.time.addEvent({
            delay: 130,
            repeat: 11,
            callback: () => {
                if (this.isGameOver) return;
                this.strikeLightning();
                this.thunderStrikeCount++;
                if (this.thunderStrikeCount >= 12) {
                    if (this.thunderTimer) this.thunderTimer.remove();
                    this.time.delayedCall(400, () => { this.isThunderActive = false; });
                }
            }
        });
    }

    /** Vẽ & xử lý MỘT TIA SÉT giáng xuống vị trí mục tiêu */
    /**
     * ⚡ Vẽ & xử lý MỘT TIA SÉT: PHÓNG TỪ PHI THUYỀN NGƯỜI CHƠI HƯỚNG LÊN (hoặc ra trước)
     */
    strikeLightning() {
        const { width, height } = this.scale;

        // Điểm xuất phát: mũi phi thuyền người chơi (hướng đang bắn)
        const px = this.player && this.player.active ? this.player.x : width / 2;
        const py = this.player && this.player.active ? this.player.y : height / 2;
        const startX = this.isPortrait ? px + Phaser.Math.Between(-8, 8) : px + 30;
        const startY = this.isPortrait ? py - 30 : py + Phaser.Math.Between(-8, 8);

        // 1. Chọn mục tiêu: kẻ địch ngẫu nhiên đang hoạt động (ưu tiên Boss), không có thì bắn xa phía trước
        let targetX, targetY;
        const aliveEnemies = this.enemies.getChildren().filter(e => e.active);
        if ((this.boss && this.boss.active && Math.random() < 0.6) ||
            (aliveEnemies.length === 0 && this.boss && this.boss.active)) {
            targetX = this.boss.x + Phaser.Math.Between(-60, 60);
            targetY = this.boss.y + Phaser.Math.Between(-60, 60);
        } else if (aliveEnemies.length > 0) {
            const victim = Phaser.Math.RND.pick(aliveEnemies);
            targetX = victim.x;
            targetY = victim.y;
        } else {
            // Không có địch: tia sét bay xa về phía trước mũi tàu để không sét gấp khúc ngược
            if (this.isPortrait) {
                targetX = Phaser.Math.Between(width * 0.2, width * 0.8);
                targetY = Phaser.Math.Between(20, Math.max(60, height * 0.55));
            } else {
                targetX = Phaser.Math.Between(width * 0.55, width * 0.92);
                targetY = Phaser.Math.Between(height * 0.2, height * 0.8);
            }
        }

        // 2. Vẽ tia sét zigzag từ phi thuyền → mục tiêu (glow ngoài + lõi trắng sáng)
        const bolt = this.add.graphics().setDepth(24).setBlendMode('ADD');
        const drawBolt = (lineWidth, color, alpha) => {
            bolt.lineStyle(lineWidth, color, alpha);
            bolt.beginPath();
            bolt.moveTo(startX, startY);
            const segments = 8;
            for (let i = 1; i <= segments; i++) {
                const t = i / segments;
                const nx = Phaser.Math.Linear(startX, targetX, t) + Phaser.Math.Between(-22, 22) * (1 - t);
                const ny = Phaser.Math.Linear(startY, targetY, t) + Phaser.Math.Between(-22, 22) * (1 - t);
                bolt.lineTo(nx, ny);
            }
            bolt.strokePath();
        };

        drawBolt(12, 0x66ccff, 0.35);  // Lớp glow xanh nhạt
        drawBolt(7, 0xaa88ff, 0.75);   // Lớp tím điện
        drawBolt(3, 0xffffff, 1);      // Lõi trắng chói

        // Nhánh sét phụ nhỏ tỏa ra từ mũi phi thuyền (hướng phóng lên/trước) cho ngoạn mục
        bolt.lineStyle(2, 0xddddff, 0.6);
        bolt.beginPath();
        bolt.moveTo(startX, startY);
        const brX = this.isPortrait
            ? startX + Phaser.Math.Between(-45, 45)
            : startX + Phaser.Math.Between(20, 60);
        const brY = this.isPortrait
            ? startY - Phaser.Math.Between(20, 60)
            : startY + Phaser.Math.Between(-45, 45);
        bolt.lineTo(brX, brY);
        bolt.strokePath();

        // 3. Flash trắng tại điểm sét đánh + nổ
        const impact = this.add.image(targetX, targetY, 'particle_glow')
            .setDisplaySize(30, 30)
            .setTint(0xffffaa)
            .setBlendMode('ADD')
            .setDepth(23);

        this.tweens.add({
            targets: impact,
            displayWidth: 190,
            displayHeight: 190,
            alpha: 0,
            duration: 260,
            onComplete: () => impact.destroy()
        });

        this.createExplosion(targetX, targetY, true);
        this.createHitSparks(targetX, targetY);

        // 4. SÁT THƯƠNG DIỆN RỘNG: mọi kẻ địch trong bán kính 120px nhận 150 sát thương
        const AOE_RADIUS = 120;
        const damage = 150;

        this.enemies.getChildren().forEach(enemy => {
            if (!enemy.active) return;
            const dist = Phaser.Math.Distance.Between(targetX, targetY, enemy.x, enemy.y);
            if (dist > AOE_RADIUS) return;

            enemy.setTint(0xffee66);
            this.time.delayedCall(90, () => { if (enemy.active) enemy.clearTint(); });

            if (enemy.isBoss && enemy.shield > 0) {
                enemy.shield -= damage;
                if (enemy.shield < 0) {
                    enemy.hp += enemy.shield;
                    enemy.shield = 0;
                }
            } else {
                enemy.hp -= damage;
            }

            if (enemy.hp <= 0) {
                this.destroyEnemy(enemy);
            }
        });

        // 5. Xóa đạn địch trong bán kính rộng quanh điểm đánh
        this.enemyBullets.getChildren().slice().forEach(b => {
            if (b.active && Phaser.Math.Distance.Between(targetX, targetY, b.x, b.y) < AOE_RADIUS + 50) {
                b.destroy();
            }
        });

        // 6. Tia sét tắt nhanh sau 200ms
        this.tweens.add({
            targets: bolt,
            alpha: 0,
            duration: 200,
            onComplete: () => bolt.destroy()
        });
    }

    /**
     * TUYỆT CHIÊU P1: TIA LAZE KHỔNG LỒ XANH DƯƠNG (TỐI ƯU SIÊU MƯỢT 60 FPS)
     */
    triggerMegaLaser() {
        if (this.isGameOver || !this.player || !this.player.active) return;
        this.player.ultimateEnergy = 0;
        this.isMegaLaserActive = true;
        this.lastBeamDamageTime = 0;

        window.soundFX.playUltimate();
        this.cameras.main.shake(250, 0.015);
        this.cameras.main.flash(200, 0, 180, 255);

        const { width, height } = this.scale;
        const beamKey = this.isPortrait ? 'laser_giant_blue_v' : 'laser_giant_blue_h';

        if (this.megaLaserBeam) this.megaLaserBeam.destroy();
        
        this.megaLaserBeam = this.add.image(this.player.x, this.player.y, beamKey)
            .setBlendMode('ADD')
            .setAlpha(0.95)
            .setDepth(22);

        if (this.isPortrait) {
            this.megaLaserBeam.setDisplaySize(80, height * 1.5);
            this.megaLaserBeam.setOrigin(0.5, 1);
        } else {
            this.megaLaserBeam.setDisplaySize(width * 1.5, 80);
            this.megaLaserBeam.setOrigin(0, 0.5);
        }

        this.showFloatingText(width / 2, height / 2, '⚡ GIANT BLUE HYPER BEAM! ⚡', '#00f0ff');

        // Kéo dài tia Laze 2.2 giây rồi biến mất mượt mà
        this.time.delayedCall(2200, () => {
            if (this.megaLaserBeam) {
                this.tweens.add({
                    targets: this.megaLaserBeam,
                    alpha: 0,
                    duration: 200,
                    onComplete: () => {
                        if (this.megaLaserBeam) this.megaLaserBeam.destroy();
                        this.isMegaLaserActive = false;
                    }
                });
            } else {
                this.isMegaLaserActive = false;
            }
        });
    }

    triggerVictory() {
        this.isVictory = true;
        this.events.emit('victory', {
            score: this.score,
            rescued: this.rescuedCount,
            kills: this.killCount
        });
    }

    /**
     * CẢNH BÁO WARNING KHI BOSS SẮP XUẤT HIỆN
     */
    triggerBossWarning() {
        // Dừng vòng lặp spawn wave ngay lập tức
        if (this.spawnEnemyTimer) {
            this.spawnEnemyTimer.remove();
            this.spawnEnemyTimer = null;
        }
        this.bossActive = true;

        window.soundFX.playBossAlarm();
        this.cameras.main.flash(350, 255, 0, 0);

        // Tên Boss theo từng Round
        const bossName = this.round === 1 ? 'TRÙM KHỔNG LỒ'
            : this.round === 2 ? 'DUO BOSS: TỬ THẦN ĐỎ & CYBER MEDIC 💚'
            : 'BOSS TUYỆT DIỆT CUỐI CÙNG';

        this.events.emit('showBanner', `⚠️ WARNING: ${bossName} TIẾP CẬN! ⚠️`);

        const { width, height } = this.scale;
        const warnText = this.add.text(width / 2, height / 2, `⚠️ WARNING! ⚠️\n${bossName}\nAPPROACHING`, {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: this.round === 2 ? '22px' : '28px',
            fontWeight: '900',
            color: '#ff0033',
            stroke: '#ffffff',
            strokeThickness: 2,
            align: 'center'
        }).setOrigin(0.5).setDepth(30);

        this.tweens.add({
            targets: warnText,
            scale: { from: 0.85, to: 1.15 },
            alpha: { from: 1, to: 0.35 },
            duration: 250,
            yoyo: true,
            repeat: 4,
            onComplete: () => {
                warnText.destroy();
                this.spawnBoss();
            }
        });
    }

    addScore(val) {
        this.score += val;
        this.player.ultimateEnergy = Math.min(100, this.player.ultimateEnergy + val * 0.06);
    }

    createExplosion(x, y, isLarge = false) {
        window.soundFX.playExplosion(isLarge);

        const shock = this.add.image(x, y, 'particle_shockwave')
            .setDisplaySize(20, 20)
            .setTint(isLarge ? 0xff3300 : 0x00f0ff)
            .setBlendMode('ADD')
            .setDepth(19);

        this.tweens.add({
            targets: shock,
            scale: isLarge ? 3.5 : 2.0,
            alpha: 0,
            duration: isLarge ? 400 : 250,
            onComplete: () => shock.destroy()
        });

        this.sparkEmitter.explode(isLarge ? 18 : 8, x, y);
        this.fireEmitter.explode(isLarge ? 10 : 4, x, y);

        // VĂNG CÁC MẢNH VỠ KIM LOẠI KÈM KHÓI LỬA (GỌN GÀNG, MƯỢT MÀ)
        this.spawnExplosionDebris(x, y, isLarge);
    }

    /**
     * VĂNG CÁC MẢNH VỠ NỔ (TỐI ƯU SIÊU NHẸ, KHÔNG NGHẼN BỘ NHỚ)
     */
    spawnExplosionDebris(x, y, isLarge = false) {
        const count = isLarge ? Phaser.Math.Between(8, 12) : Phaser.Math.Between(3, 5);
        const debrisTextures = ['debris_shard_1', 'debris_shard_2', 'debris_shard_3'];

        for (let i = 0; i < count; i++) {
            const tex = Phaser.Math.RND.pick(debrisTextures);
            const shard = this.debrisGroup.create(x, y, tex);
            if (!shard) continue;

            const size = isLarge ? Phaser.Math.Between(14, 20) : Phaser.Math.Between(8, 14);
            shard.setDisplaySize(size, size);
            shard.setDepth(18);

            const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            const speed = isLarge ? Phaser.Math.Between(150, 300) : Phaser.Math.Between(100, 220);
            shard.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
            shard.setAngularVelocity(Phaser.Math.Between(-450, 450));

            // Mảnh vỡ mờ dần và tiêu biến sau 600ms - 900ms
            this.tweens.add({
                targets: shard,
                alpha: 0,
                scale: 0.2,
                duration: isLarge ? 900 : 600,
                ease: 'Quad.easeOut',
                onComplete: () => {
                    if (shard && shard.active) shard.destroy();
                }
            });
        }
    }

    createHitSparks(x, y, isBig = false) {
        if (this.sparkEmitter) {
            this.sparkEmitter.explode(isBig ? 14 : 7, x, y);
        }
        if (this.hitFlareEmitter) {
            this.hitFlareEmitter.explode(isBig ? 2 : 1, x, y);
        }
    }

    showFloatingText(x, y, msg, color) {
        const text = this.add.text(x, y, msg, {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '16px',
            fontWeight: '800',
            color: color
        }).setOrigin(0.5).setDepth(25);

        this.tweens.add({
            targets: text,
            y: y - 40,
            alpha: 0,
            duration: 1000,
            onComplete: () => text.destroy()
        });
    }

    update(time, delta) {
        if (this.isGameOver) return;

        const { width, height } = this.scale;

        // 1. Cuộn Bầu Trời Sao Parallax
        this.starLayers.forEach(layer => {
            layer.forEach(star => {
                if (this.isPortrait) {
                    star.y += star.speed;
                    if (star.y > height) {
                        star.y = 0;
                        star.x = Phaser.Math.Between(0, width);
                    }
                } else {
                    star.x -= star.speed;
                    if (star.x < 0) {
                        star.x = width;
                        star.y = Phaser.Math.Between(0, height);
                    }
                }
            });
        });

        // 1.5 Cuộn NỀN ROUND 2/3: Chạy từ từ mượt mà tạo cảm giác phi thuyền đang bay lướt
        if (this.bgSprite1 && this.bgSprite2 && this.bgScaledW && this.bgScaledH) {
            const scrollSpeed = delta * 0.045; // Tốc độ trôi êm ái, hùng tráng (~45px/giây)
            if (this.isPortrait) {
                this.bgSprite1.y += scrollSpeed;
                this.bgSprite2.y += scrollSpeed;

                const limitY = height + this.bgScaledH / 2;
                if (this.bgSprite1.y >= limitY) {
                    this.bgSprite1.y = this.bgSprite2.y - this.bgScaledH + 1;
                }
                if (this.bgSprite2.y >= limitY) {
                    this.bgSprite2.y = this.bgSprite1.y - this.bgScaledH + 1;
                }
            } else {
                this.bgSprite1.x -= scrollSpeed;
                this.bgSprite2.x -= scrollSpeed;

                const limitX = -this.bgScaledW / 2;
                if (this.bgSprite1.x <= limitX) {
                    this.bgSprite1.x = this.bgSprite2.x + this.bgScaledW - 1;
                }
                if (this.bgSprite2.x <= limitX) {
                    this.bgSprite2.x = this.bgSprite1.x + this.bgScaledW - 1;
                }
            }
        }

        // 1.6 Vệt lửa bùng cháy theo đuôi thiên thạch (Round 3)
        if (this.meteors) {
            this.meteors.getChildren().forEach(m => {
                if (m.active && Math.random() < 0.5) {
                    this.fireEmitter.explode(1, m.x, m.y);
                }
            });
        }

        // 1.7 HIỆU ỨNG KHÓI ĐEN & LỬA BỐC CHÁY KHI NGƯỜI CHƠI HOẶC BOSS CÒN <= 1/3 MÁU
        // A. Người chơi bị hư hại nặng (HP <= 1/3, tức là hp <= 1)
        if (this.player && this.player.active && this.player.hp <= 1) {
            if (this.blackSmokeEmitter && Math.random() < 0.55) {
                const offX = Phaser.Math.Between(-8, 8);
                const offY = this.isPortrait ? Phaser.Math.Between(10, 20) : Phaser.Math.Between(-8, 8);
                this.blackSmokeEmitter.explode(1, this.player.x + offX, this.player.y + offY);
            }
            if (this.damageFireEmitter && Math.random() < 0.35) {
                this.damageFireEmitter.explode(1, this.player.x, this.player.y);
                this.sparkEmitter.explode(1, this.player.x, this.player.y);
            }
        }

        // B. Boss bị hư hại nặng (HP <= 1/3 Máu Tối Đa)
        const checkBossLowHpSmoke = (b) => {
            if (!b || !b.active || b.hp > (b.maxHp / 3)) return;
            if (this.blackSmokeEmitter && Math.random() < 0.65) {
                const offX = Phaser.Math.Between(-50, 50);
                const offY = Phaser.Math.Between(-35, 35);
                this.blackSmokeEmitter.explode(1, b.x + offX, b.y + offY);
            }
            if (this.damageFireEmitter && Math.random() < 0.4) {
                const offX = Phaser.Math.Between(-40, 40);
                const offY = Phaser.Math.Between(-25, 25);
                this.damageFireEmitter.explode(1, b.x + offX, b.y + offY);
                this.sparkEmitter.explode(2, b.x + offX, b.y + offY);
            }
        };

        if (this.boss && this.boss.active) checkBossLowHpSmoke(this.boss);
        if (this.bossRed && this.bossRed.active) checkBossLowHpSmoke(this.bossRed);
        if (this.bossGreen && this.bossGreen.active) checkBossLowHpSmoke(this.bossGreen);

        // 1.8 Cập nhật tia sáng hồi máu (Green Heal Beam) giữa Boss Green và Boss Red
        if (this.healBeamGraphics) {
            this.healBeamGraphics.clear();
            if (this.isHealingActive && this.bossGreen && this.bossGreen.active && this.bossRed && this.bossRed.active) {
                const gx = this.bossGreen.x;
                const gy = this.bossGreen.y;
                const rx = this.bossRed.x;
                const ry = this.bossRed.y;

                // Tia sáng xanh ngọc neon
                this.healBeamGraphics.lineStyle(4, 0x00ff88, 0.9);
                this.healBeamGraphics.beginPath();
                this.healBeamGraphics.moveTo(gx, gy);
                this.healBeamGraphics.lineTo(rx, ry);
                this.healBeamGraphics.strokePath();

                // Lõi sáng trắng
                this.healBeamGraphics.lineStyle(1.8, 0xffffff, 1);
                this.healBeamGraphics.strokePath();
            }
        }

        // 2. Cuộn & Xoay Các Hành Tinh Trôi Dạt
        for (let i = this.activePlanets.length - 1; i >= 0; i--) {
            const planet = this.activePlanets[i];
            planet.x += planet.speedX;
            planet.y += planet.speedY;
            planet.rotation += planet.rotSpeed;
            if (this.isPortrait && planet.y > height + 160) {
                planet.destroy();
                this.activePlanets.splice(i, 1);
            } else if (!this.isPortrait && planet.x < -160) {
                planet.destroy();
                this.activePlanets.splice(i, 1);
            }
        }

        this.spawnPlanetTimer += delta;
        if (this.spawnPlanetTimer > 16000) {
            this.spawnPlanetTimer = 0;
            this.spawnFloatingPlanet();
        }

        // 3. Điều Khiển Phi Thuyền Người Chơi
        if (this.player && this.player.active) {
            let vx = 0;
            let vy = 0;

            if (this.cursors.left.isDown || this.keyA.isDown) vx = -1;
            if (this.cursors.right.isDown || this.keyD.isDown) vx = 1;
            if (this.cursors.up.isDown || this.keyW.isDown) vy = -1;
            if (this.cursors.down.isDown || this.keyS.isDown) vy = 1;

            if (this.player.joystickX !== 0 || this.player.joystickY !== 0) {
                vx = this.player.joystickX;
                vy = this.player.joystickY;
            }

            this.player.setVelocity(vx * this.player.speed, vy * this.player.speed);

            if (this.isPortrait) {
                this.player.setRotation(vx * 0.15);
            } else {
                this.player.setRotation(vy * 0.15);
            }

            if (this.shieldVisual) {
                this.shieldVisual.setPosition(this.player.x, this.player.y);
                this.shieldVisual.setVisible(this.player.shield > 0);
            }

            // ⚡ CẬP NHẬT KHIÊN ĐIỆN PHẢN ĐÒN: đếm ngược, quả cầu điện bay quay quanh tàu
            if (this.electricShieldTimer > 0) {
                this.electricShieldTimer -= delta;
                if (this.electricShieldVisual) {
                    this.electricShieldVisual.setPosition(this.player.x, this.player.y);
                    this.electricShieldVisual.setVisible(true);
                }

                // Quả cầu điện quay quanh phi thuyền (mỗi quả lệch nhau 120°)
                const prog = this.time.now * 0.0022;
                this.electricShieldOrbs.forEach((orb, i) => {
                    if (!orb || !orb.active) return;
                    const angle = prog + (i * Math.PI * 2) / 3;
                    orb.x = this.player.x + Math.cos(angle) * 62;
                    orb.y = this.player.y + Math.sin(angle) * 62;
                    orb.setVisible(true);
                });
                this.drawElectricShieldArcs();

                // Hết 15 giây → tắt khiên
                if (this.electricShieldTimer <= 0) {
                    this.electricShieldTimer = 0;
                    if (this.player) this.player.electricShieldActive = false;
                    this.destroyElectricShieldVisual();
                    this.showFloatingText(this.player.x, this.player.y - 40, '⚡ KHIÊN ĐIỆN ĐÃ TẮT', '#94a3b8');
                }
            } else if (this.electricShieldVisual) {
                // An toàn: nếu timer đã hết mà visual còn sót → dọn dẹp
                this.destroyElectricShieldVisual();
            }

            // Bắn đạn khi Click chuột hoặc bấm nút bắn trên Mobile
            if (this.player.isFiring || this.isMouseDown) {
                this.firePlayerBullet();
            }

            // Kích hoạt Ultimate Tia Laze Khổng Lồ bằng phím SPACE
            if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
                this.triggerUltimateAttack();
            }

            // Kích hoạt Thu Phục Ngọc Năng Lượng bằng phím E
            if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
                this.activateTractorBeam();
            }

            // Cập nhật vị trí & Sát thương Tia Laze Khổng Lồ (ĐÃ TỐI ƯU SIÊU MƯỢT, KHÔNG GIẬT LAG)
            if (this.isMegaLaserActive && this.megaLaserBeam) {
                this.megaLaserBeam.setPosition(this.player.x, this.player.y);

                // Giới hạn chu kỳ tính sát thương mỗi 90ms (thay vì chạy 60 lần/giây gây lag)
                if (time - (this.lastBeamDamageTime || 0) > 90) {
                    this.lastBeamDamageTime = time;

                    // Xóa đạn địch trong tầm
                    this.enemyBullets.getChildren().slice().forEach(b => {
                        if (b.active) b.destroy();
                    });

                    // Gây sát thương nhịp nhàng lên kẻ thù
                    this.enemies.getChildren().forEach(enemy => {
                        if (enemy.active) {
                            let inBeam = false;
                            if (this.isPortrait) {
                                if (Math.abs(enemy.x - this.player.x) < 55 && enemy.y < this.player.y) {
                                    inBeam = true;
                                }
                            } else {
                                if (Math.abs(enemy.y - this.player.y) < 55 && enemy.x > this.player.x) {
                                    inBeam = true;
                                }
                            }

                            if (inBeam) {
                                enemy.hp -= 90; // Sát thương theo nhịp cực khủng
                                this.sparkEmitter.explode(3, enemy.x, enemy.y);
                                if (enemy.hp <= 0) {
                                    this.destroyEnemy(enemy);
                                }
                            }
                        }
                    });
                }
            }
        }

        // 4. Đường Điện Tia Sét Kéo Ngọc Về Tàu (Electric Lightning Tractor Beam)
        if (this.electricBeamGraphics) {
            this.electricBeamGraphics.clear();
            if (this.player && this.player.active && this.captureOrbs) {
                this.captureOrbs.getChildren().forEach(orb => {
                    if (orb.active && orb.isBeingPulled) {
                        this.physics.moveToObject(orb, this.player, 960);

                        const px = this.player.x;
                        const py = this.player.y;
                        const ox = orb.x;
                        const oy = orb.y;

                        // Tia sét xanh Cyan neon
                        this.electricBeamGraphics.lineStyle(3.5, 0x00f0ff, 0.95);
                        this.electricBeamGraphics.beginPath();
                        this.electricBeamGraphics.moveTo(px, py);

                        const steps = 6;
                        for (let s = 1; s < steps; s++) {
                            const t = s / steps;
                            const midX = Phaser.Math.Linear(px, ox, t) + Phaser.Math.Between(-12, 12);
                            const midY = Phaser.Math.Linear(py, oy, t) + Phaser.Math.Between(-12, 12);
                            this.electricBeamGraphics.lineTo(midX, midY);
                        }
                        this.electricBeamGraphics.lineTo(ox, oy);
                        this.electricBeamGraphics.strokePath();

                        // Lõi điện tím trắng phát sáng
                        this.electricBeamGraphics.lineStyle(1.5, 0xffffff, 1);
                        this.electricBeamGraphics.strokePath();

                        if (Math.random() < 0.3) {
                            this.sparkEmitter.explode(1, ox, oy);
                        }
                    }
                });
            }
        }

        // 5. Phi Thuyền Kẻ Thù Mini Làm Đồng Minh Hộ Tống & Bắn Hỗ Trợ (Drone Allies)
        if (this.player && this.player.active && this.allies) {
            const alliesList = this.allies.getChildren().filter(a => a.active);
            alliesList.forEach((drone, idx) => {
                let targetX, targetY;
                if (this.isPortrait) {
                    const side = idx === 0 ? -45 : idx === 1 ? 45 : 0;
                    const back = idx === 2 ? 55 : 36;
                    targetX = this.player.x + side;
                    targetY = this.player.y + back;
                } else {
                    const side = idx === 0 ? -40 : idx === 1 ? 40 : 0;
                    const back = idx === 2 ? -55 : -42;
                    targetX = this.player.x + back;
                    targetY = this.player.y + side;
                }

                drone.x = Phaser.Math.Linear(drone.x, targetX, 0.16);
                drone.y = Phaser.Math.Linear(drone.y, targetY, 0.16);

                // Đồng minh tự động xả đạn Laser hỗ trợ mỗi 380ms (Sát thương hỗ trợ nhẹ: 4 dmg)
                if (time - (this.lastAllyFireTime || 0) > 380) {
                    this.allyFire(drone);
                }
            });
            this.drawAllyEnergyLinks(alliesList);

            if (alliesList.length > 0 && time - (this.lastAllyFireTime || 0) > 380) {
                this.lastAllyFireTime = time;
            }
        } else if (this.allyLinkGraphics) {
            this.allyLinkGraphics.clear();
        }

        // 6. Vật lý Tên Lửa Tự Tìm Diệt (Homing Rockets Tracking Physics)
        if (this.homingRockets) {
            this.homingRockets.getChildren().forEach(rocket => {
                if (!rocket.active) return;
                rocket.lifeTime = (rocket.lifeTime || 0) + delta;

                // Tự hủy sau 6s nếu bay lạc
                if (rocket.lifeTime > 6000) {
                    rocket.destroy();
                    return;
                }

                // Tìm mục tiêu kẻ thù gần nhất (Ưu tiên Boss nếu đang xuất hiện)
                let target = (this.boss && this.boss.active) ? this.boss : null;
                if (!target) {
                    let minDist = 9999;
                    this.enemies.getChildren().forEach(e => {
                        if (e.active) {
                            const d = Phaser.Math.Distance.Between(rocket.x, rocket.y, e.x, e.y);
                            if (d < minDist) {
                                minDist = d;
                                target = e;
                            }
                        }
                    });
                }

                if (target && target.active) {
                    const targetAngle = Phaser.Math.Angle.Between(rocket.x, rocket.y, target.x, target.y);
                    rocket.flightAngle = Phaser.Math.Angle.RotateTo(rocket.flightAngle, targetAngle, 0.018);
                }

                const rAngle = rocket.flightAngle;
                rocket.rotation = rAngle + Math.PI / 2;
                const missileSpeed = 580; // Vận tốc bay tên lửa cực nhanh
                rocket.setVelocity(Math.cos(rAngle) * missileSpeed, Math.sin(rAngle) * missileSpeed);

                // Khói lửa hạt phụt ra từ đuôi tên lửa
                if (Math.random() < 0.4) {
                    this.sparkEmitter.explode(1, rocket.x, rocket.y);
                }
            });
        }

        // 7. Hiệu ứng Khói & Lửa cuộn theo các mảnh vỡ nổ (Debris Trails)
        if (this.debrisGroup) {
            this.debrisGroup.getChildren().forEach(shard => {
                if (shard.active) {
                    if (Math.random() < 0.45) {
                        this.fireEmitter.explode(1, shard.x, shard.y);
                    }
                    if (Math.random() < 0.35) {
                        this.smokeEmitter.explode(1, shard.x, shard.y);
                    }
                }
            });
        }

        // 8. Quỹ đạo kẻ địch (Uốn lượn hình sin sinh động)
        this.enemies.getChildren().forEach(enemy => {
            if (enemy.active && !enemy.isBoss && enemy.basePos !== undefined) {
                if (enemy.isVertical) {
                    const playerLane = this.player && this.player.active ? this.player.x : enemy.basePos;
                    const laneTarget = enemy.basePos + (playerLane - enemy.basePos) * enemy.laneFollow;
                    const weaveTarget = laneTarget + Math.sin(time * enemy.freq + enemy.weavePhase) * enemy.amp;
                    enemy.x = Phaser.Math.Linear(enemy.x, weaveTarget, 0.12);
                    if (enemy.y > height + 80) enemy.destroy();
                } else {
                    const playerLane = this.player && this.player.active ? this.player.y : enemy.basePos;
                    const laneTarget = enemy.basePos + (playerLane - enemy.basePos) * enemy.laneFollow;
                    const weaveTarget = laneTarget + Math.sin(time * enemy.freq + enemy.weavePhase) * enemy.amp;
                    enemy.y = Phaser.Math.Linear(enemy.y, weaveTarget, 0.12);
                    if (enemy.x < -80) enemy.destroy();
                }
            }
        });

        // 9. Dọn dẹp đạn ra khỏi màn hình
        this.playerBullets.getChildren().forEach(b => {
            if (this.isPortrait && b.y < -30) b.destroy();
            else if (!this.isPortrait && b.x > width + 30) b.destroy();
        });
        this.allyBullets.getChildren().forEach(b => {
            if (this.isPortrait && b.y < -30) b.destroy();
            else if (!this.isPortrait && b.x > width + 30) b.destroy();
        });
        this.enemyBullets.getChildren().forEach(b => {
            if (this.isPortrait && b.y > height + 30) b.destroy();
            else if (!this.isPortrait && b.x < -30) b.destroy();
        });
        // Dọn thiên thạch bay ra khỏi màn hình
        this.meteors.getChildren().forEach(m => {
            if (this.isPortrait && m.y > height + 80) m.destroy();
            else if (!this.isPortrait && m.x < -80) m.destroy();
        });

        // 10. Gửi dữ liệu cập nhật HUD sang UIScene
        let curBossHp, maxBossHp, curBossShield, maxBossShield;
        if (this.round === 2 && (this.bossRed || this.bossGreen)) {
            const rActive = this.bossRed && this.bossRed.active;
            const gActive = this.bossGreen && this.bossGreen.active;
            if (rActive || gActive) {
                curBossHp = (rActive ? this.bossRed.hp : 0) + (gActive ? this.bossGreen.hp : 0);
                maxBossHp = (this.bossRed ? this.bossRed.maxHp : 0) + (this.bossGreen ? this.bossGreen.maxHp : 0);
                curBossShield = (rActive ? this.bossRed.shield : 0) + (gActive ? this.bossGreen.shield : 0);
                maxBossShield = (this.bossRed ? this.bossRed.maxShield : 0) + (this.bossGreen ? this.bossGreen.maxShield : 0);
            }
        } else if (this.boss && this.boss.active) {
            curBossHp = this.boss.hp;
            maxBossHp = this.boss.maxHp;
            curBossShield = this.boss.shield;
            maxBossShield = this.boss.maxShield;
        }

        this.events.emit('updateHUD', {
            score: this.score,
            rescued: this.rescuedCount,
            wave: `${this.currentWave}/${this.totalWaves}`,
            hp: this.player ? this.player.hp : 0,
            maxHp: 3,
            shield: this.player ? this.player.shield : 0,
            maxShield: this.player ? this.player.maxShield : 0,
            ultimateEnergy: this.player ? this.player.ultimateEnergy : 0,
            bossHp: curBossHp,
            bossMaxHp: maxBossHp,
            bossShield: curBossShield,
            bossMaxShield: maxBossShield
        });
    }

    handleResize(gameSize) {
        const { width, height } = gameSize;
        this.physics.world.setBounds(0, 0, width, height);
        const newIsPortrait = height >= width;

        // Cập nhật kích thước nền Round 2/3
        if (this.bgSprite1 && this.bgSprite2) {
            this.layoutRoundBackdrop(width, height);
        }

        if (newIsPortrait !== this.isPortrait) {
            this.isPortrait = newIsPortrait;
            if (this.round >= 2) {
                this.applyRoundBackdrop();
            }
            if (this.player && this.player.active) {
                const newKey = this.getPlayerSpriteKey();
                if (newKey && this.textures.exists(newKey)) {
                    this.player.setTexture(newKey);
                    this.fitPlayerSize();
                }
            }
        }
    }
}

window.GameScene = GameScene;
