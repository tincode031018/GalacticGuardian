/**
 * SCENE UI (HUD & Mobile Overlay Manager)
 * Quản lý thanh máu, khiên, điểm số, phi hành gia đã cứu, Joystick ảo và tuyệt chiêu Ultimate
 */

class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
    }

    create() {
        this.gameScene = this.scene.get('GameScene');

        // Khởi tạo các phần tử HUD trực quan trên Canvas + DOM Overlay
        const { width, height } = this.scale;

        // Container HUD Canvas
        this.hudGraphics = this.add.graphics();
        
        // 1. Text Điểm Số (Score)
        this.scoreText = this.add.text(20, 20, 'SCORE: 0', {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '18px',
            fontWeight: '800',
            color: '#00f0ff'
        }).setShadow(0, 0, '#00f0ff', 6);

        // 2. Text Phi Hành Gia Đã Cứu (Astronauts Rescued)
        this.astronautText = this.add.text(20, 46, '👨‍🚀 CỨU: 0', {
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: '17px',
            fontWeight: '700',
            color: '#ffcc00'
        });

        // 2b. Text Máu / Mạng Phi Thuyền (3 Hits)
        this.hudHpText = this.add.text(20, 72, '❤️❤️❤️ HP: 3/3', {
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: '15px',
            fontWeight: '800',
            color: '#00ff88'
        });

        // 3. Text Wave Đợt Quái
        this.waveText = this.add.text(width / 2, 20, 'WAVE 1', {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '16px',
            fontWeight: '700',
            color: '#ffffff'
        }).setOrigin(0.5, 0);

        // 4. Boss Health Bar & Shield Bar (Ẩn mặc định)
        this.bossBarContainer = this.add.container(width / 2, 60).setVisible(false);
        const bossBarBg = this.add.graphics();
        bossBarBg.fillStyle(0x1a0010, 0.85);
        bossBarBg.fillRoundedRect(-140, -10, 280, 20, 6);
        bossBarBg.lineStyle(1.5, 0xff0055, 1);
        bossBarBg.strokeRoundedRect(-140, -10, 280, 20, 6);
        
        this.bossHpFill = this.add.graphics();
        this.bossShieldFill = this.add.graphics();
        this.bossNameText = this.add.text(0, -24, '⚠️ TITAN WARSHIP BOSS ⚠️', {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '13px',
            fontWeight: '800',
            color: '#ff0055'
        }).setOrigin(0.5);

        this.bossBarContainer.add([bossBarBg, this.bossHpFill, this.bossShieldFill, this.bossNameText]);
        this.applyResponsiveLayout(width, height);

        // Thiết lập DOM Buttons & Joystick Listener
        this.setupDOMControls();

        // Lắng nghe sự kiện từ GameScene
        this.gameScene.events.on('updateHUD', this.updateHUD, this);
        this.gameScene.events.on('orbAvailable', this.setOrbState, this);
        this.gameScene.events.on('bossSpawned', this.showBossBar, this);
        this.gameScene.events.on('bossDefeated', this.hideBossBar, this);
        this.gameScene.events.on('showBanner', this.showNotification, this);
        this.gameScene.events.on('gameOver', this.showGameOverScreen, this);
        this.gameScene.events.on('victory', this.showVictoryScreen, this);

        // Resize Listener
        this.scale.on('resize', this.handleResize, this);
    }

    setupDOMControls() {
        // Sound button
        const btnSound = document.getElementById('btn-sound');
        if (btnSound) {
            btnSound.onclick = () => {
                const muted = window.soundFX.toggleMute();
                btnSound.innerText = muted ? '🔇' : '🔊';
            };
        }

        // Pause button
        const btnPause = document.getElementById('btn-pause');
        if (btnPause) {
            btnPause.onclick = () => {
                if (this.gameScene.scene.isPaused()) {
                    this.gameScene.scene.resume();
                    btnPause.innerText = '⏸️';
                } else {
                    this.gameScene.scene.pause();
                    btnPause.innerText = '▶️';
                }
            };
        }

        // Fullscreen button
        const btnFs = document.getElementById('btn-fullscreen');
        if (btnFs) {
            btnFs.onclick = () => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                } else {
                    document.exitFullscreen().catch(() => {});
                }
            };
        }

        // Fire Button (Hold or Click)
        const btnFire = document.getElementById('btn-fire');
        if (btnFire) {
            const startFiring = (e) => {
                e.preventDefault();
                btnFire.classList.add('active');
                if (this.gameScene.player) {
                    this.gameScene.player.isFiring = true;
                }
            };
            const stopFiring = (e) => {
                e.preventDefault();
                btnFire.classList.remove('active');
                if (this.gameScene.player) {
                    this.gameScene.player.isFiring = false;
                }
            };
            btnFire.addEventListener('pointerdown', startFiring);
            btnFire.addEventListener('pointerup', stopFiring);
            btnFire.addEventListener('pointerleave', stopFiring);
            btnFire.addEventListener('pointercancel', stopFiring);
        }

        // Capture Orb Button (Thu Phục [E])
        const btnCapture = document.getElementById('btn-capture');
        if (btnCapture) {
            btnCapture.onclick = (e) => {
                e.preventDefault();
                if (this.gameScene) {
                    this.gameScene.activateTractorBeam();
                }
            };
        }

        // Ultimate Button
        const btnUlt = document.getElementById('btn-ultimate');
        if (btnUlt) {
            btnUlt.onclick = (e) => {
                e.preventDefault();
                if (this.gameScene.player && this.gameScene.player.ultimateEnergy >= 100) {
                    this.gameScene.triggerUltimateAttack();
                }
            };
        }

        // Virtual Joystick
        this.setupVirtualJoystick();
    }

    setupVirtualJoystick() {
        const zone = document.getElementById('joystick-zone');
        const stick = document.getElementById('joystick-stick');
        const base = document.getElementById('joystick-base');
        if (!zone || !stick || !base) return;

        let activePointerId = null;
        let baseRect = base.getBoundingClientRect();
        const maxDist = 45; // Max radius distance

        const handleMove = (clientX, clientY) => {
            baseRect = base.getBoundingClientRect();
            const centerX = baseRect.left + baseRect.width / 2;
            const centerY = baseRect.top + baseRect.height / 2;
            let dx = clientX - centerX;
            let dy = clientY - centerY;
            const dist = Math.hypot(dx, dy);

            if (dist > maxDist) {
                const angle = Math.atan2(dy, dx);
                dx = Math.cos(angle) * maxDist;
                dy = Math.sin(angle) * maxDist;
            }

            stick.style.transform = `translate(${dx}px, ${dy}px)`;

            // Gửi dữ liệu hướng đi (normalized -1 to 1) sang GameScene
            if (this.gameScene.player) {
                this.gameScene.player.joystickX = dx / maxDist;
                this.gameScene.player.joystickY = dy / maxDist;
            }
        };

        const resetJoystick = () => {
            activePointerId = null;
            stick.style.transform = 'translate(0px, 0px)';
            if (this.gameScene.player) {
                this.gameScene.player.joystickX = 0;
                this.gameScene.player.joystickY = 0;
            }
        };

        zone.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            activePointerId = e.pointerId;
            zone.setPointerCapture(e.pointerId);
            handleMove(e.clientX, e.clientY);
        });

        zone.addEventListener('pointermove', (e) => {
            if (activePointerId === e.pointerId) {
                e.preventDefault();
                handleMove(e.clientX, e.clientY);
            }
        });

        zone.addEventListener('pointerup', resetJoystick);
        zone.addEventListener('pointercancel', resetJoystick);
    }

    updateHUD(data) {
        if (!data) return;

        // Cập nhật text Điểm & Wave
        if (data.score !== undefined) {
            this.scoreText.setText(`SCORE: ${data.score}`);
        }
        if (data.wave !== undefined) {
            this.waveText.setText(`WAVE ${data.wave}`);
        }

        // Vẽ 3 Khối Máu / Mạng (3-HP Segmented Life Bars)
        this.hudGraphics.clear();

        const curHp = Math.max(0, data.hp !== undefined ? data.hp : 3);
        const maxHp = 3;

        // Cập nhật text hiển thị số tim / HP (hỗ trợ HP thập phân - mỗi lần ăn +0.25)
        if (this.hudHpText) {
            const hpFmt = Math.round(curHp * 100) / 100;
            const heartsFull = Math.floor(curHp);
            const heartsStr = '❤️'.repeat(heartsFull) + '🖤'.repeat(Math.max(0, maxHp - heartsFull));
            let hpColor = '#00ff88';
            if (curHp <= 0) hpColor = '#ff0044';
            else if (curHp <= 1) hpColor = '#ff0044';
            else if (curHp <= 2) hpColor = '#ffbb00';
            this.hudHpText.setText(`${heartsStr} HP: ${hpFmt}/3`).setColor(hpColor);
        }

        const startX = 20;
        const barY = 96;
        const blockW = 38;
        const blockH = 10;
        const gap = 6;

        for (let i = 0; i < maxHp; i++) {
            const bx = startX + i * (blockW + gap);

            // Nền khối
            this.hudGraphics.fillStyle(0x0f172a, 0.85);
            this.hudGraphics.fillRoundedRect(bx, barY, blockW, blockH, 3);
            this.hudGraphics.lineStyle(1, 0x334155, 1);
            this.hudGraphics.strokeRoundedRect(bx, barY, blockW, blockH, 3);

            // Khối máu sáng
            if (i < curHp) {
                const blockColor = curHp >= 3 ? 0x00ff88 : curHp === 2 ? 0xffbb00 : 0xff0044;
                this.hudGraphics.fillStyle(blockColor, 1);
                this.hudGraphics.fillRoundedRect(bx + 1.5, barY + 1.5, blockW - 3, blockH - 3, 2);
            }
        }

        // Nếu có khiên phụ nhặt được: Vẽ thêm khối Khiên Cyan bên cạnh
        if (data.shield > 0) {
            const sx = startX + 3 * (blockW + gap);
            this.hudGraphics.fillStyle(0x00f0ff, 0.95);
            this.hudGraphics.fillRoundedRect(sx, barY, blockW, blockH, 3);
            this.hudGraphics.lineStyle(1.5, 0xffffff, 1);
            this.hudGraphics.strokeRoundedRect(sx, barY, blockW, blockH, 3);
        }

        // Ultimate Button State
        const btnUlt = document.getElementById('btn-ultimate');
        const ultText = document.getElementById('ult-text');
        const ultEnergy = data.ultimateEnergy || 0;

        if (ultText) {
            ultText.innerText = `${Math.floor(ultEnergy)}%`;
        }
        if (btnUlt) {
            if (ultEnergy >= 100) {
                btnUlt.disabled = false;
                btnUlt.classList.add('ready');
            } else {
                btnUlt.disabled = true;
                btnUlt.classList.remove('ready');
            }
        }

        // Cập nhật máu & giáp Boss nếu đang hiện
        if (data.bossHp !== undefined && data.bossMaxHp !== undefined) {
            const hpPct = Math.max(0, data.bossHp / data.bossMaxHp);
            this.bossHpFill.clear();
            this.bossHpFill.fillStyle(0xff0055, 1);
            if (hpPct > 0) {
                this.bossHpFill.fillRoundedRect(-138, -8, 276 * hpPct, 16, 4);
            }

            if (this.bossShieldFill) {
                this.bossShieldFill.clear();
                if (data.bossShield !== undefined && data.bossMaxShield !== undefined && data.bossShield > 0) {
                    const shieldPct = Math.max(0, data.bossShield / data.bossMaxShield);
                    this.bossShieldFill.fillStyle(0x00f0ff, 0.85);
                    this.bossShieldFill.fillRoundedRect(-138, 2, 276 * shieldPct, 6, 2);
                }
            }
        }
    }

    setOrbState(available) {
        const btnCapture = document.getElementById('btn-capture');
        if (btnCapture) {
            if (available) {
                btnCapture.classList.add('active-orb');
            } else {
                btnCapture.classList.remove('active-orb');
            }
        }
    }

    showBossBar(data) {
        this.bossBarContainer.setVisible(true);
        if (data && data.name && this.bossNameText) {
            this.bossNameText.setText(data.name);
        }
        window.soundFX.playBossAlarm();
        this.showNotification(data && data.name ? `${data.name} XUẤT HIỆN!` : '⚠️ CẢNH BÁO: TRÙM KHÔNG GIAN XUẤT HIỆN! ⚠️');
    }

    hideBossBar() {
        this.bossBarContainer.setVisible(false);
    }

    showNotification(msg) {
        const banner = document.getElementById('notification-banner');
        if (!banner) return;
        banner.innerText = msg;
        banner.classList.add('show');
        if (this.bannerTimeout) clearTimeout(this.bannerTimeout);
        this.bannerTimeout = setTimeout(() => {
            banner.classList.remove('show');
        }, 2200);
    }

    showGameOverScreen(stats) {
        const { width, height } = this.scale;
        const modal = this.add.container(width / 2, height / 2);

        const bg = this.add.graphics();
        bg.fillStyle(0x030712, 0.92);
        bg.fillRoundedRect(-160, -180, 320, 360, 16);
        bg.lineStyle(3, 0xff0044, 0.9);
        bg.strokeRoundedRect(-160, -180, 320, 360, 16);

        const title = this.add.text(0, -130, '💀 YOU LOSE 💀', {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '26px',
            fontWeight: '900',
            color: '#ff0044',
            stroke: '#ffffff',
            strokeThickness: 1
        }).setOrigin(0.5);

        const subtitle = this.add.text(0, -95, 'PHI THUYỀN ĐÃ BỊ PHÁ HỦY', {
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: '15px',
            fontWeight: '700',
            color: '#94a3b8'
        }).setOrigin(0.5);

        const scoreVal = this.add.text(0, -45, `SCORE: ${stats.score || 0}`, {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '24px',
            fontWeight: '800',
            color: '#00f0ff'
        }).setOrigin(0.5);

        const enemyVal = this.add.text(0, 5, `🎯 TIÊU DIỆT: ${stats.kills || 0} KẺ THÙ`, {
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: '18px',
            fontWeight: '700',
            color: '#ffcc00'
        }).setOrigin(0.5);

        // Replay Button
        const btnPlay = this.add.text(0, 90, 'CHƠI LẠI', {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '18px',
            fontWeight: '800',
            color: '#ffffff',
            backgroundColor: '#ff0044',
            padding: { left: 28, right: 28, top: 12, bottom: 12 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btnPlay.on('pointerover', () => btnPlay.setStyle({ backgroundColor: '#ff2266' }));
        btnPlay.on('pointerout', () => btnPlay.setStyle({ backgroundColor: '#ff0044' }));
        btnPlay.on('pointerdown', () => {
            this.scene.stop('UIScene');
            const roundNum = (this.gameScene && this.gameScene.round) ? this.gameScene.round : 1;
            const shipBase = (this.gameScene && this.gameScene.selectedShipBase) ? this.gameScene.selectedShipBase : 'player1';
            const isRoundPortrait = roundNum <= 2;
            this.scene.start('GameScene', { round: roundNum, shipType: shipBase + (isRoundPortrait ? 'a' : 'b') });
        });

        modal.add([bg, title, subtitle, scoreVal, enemyVal, btnPlay]);
    }

    showVictoryScreen(stats) {
        const { width, height } = this.scale;
        const modal = this.add.container(width / 2, height / 2);

        const bg = this.add.graphics();
        bg.fillStyle(0x030712, 0.92);
        bg.fillRoundedRect(-160, -180, 320, 360, 16);
        bg.lineStyle(3, 0x00ff88, 0.9);
        bg.strokeRoundedRect(-160, -180, 320, 360, 16);

        const title = this.add.text(0, -130, '🏆 VICTORY 🏆', {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '24px',
            fontWeight: '900',
            color: '#00ff88'
        }).setOrigin(0.5);

        const scoreVal = this.add.text(0, -50, `TỔNG ĐIỂM: ${stats.score || 0}`, {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '22px',
            fontWeight: '800',
            color: '#00f0ff'
        }).setOrigin(0.5);

        const enemyVal = this.add.text(0, 0, `🎯 Tiêu diệt: ${stats.kills || 0} địch`, {
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: '18px',
            fontWeight: '700',
            color: '#ffffff'
        }).setOrigin(0.5);

        const btnPlay = this.add.text(0, 90, 'CHƠI LẠI TỪ ĐẦU', {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '16px',
            fontWeight: '800',
            color: '#030712',
            backgroundColor: '#00ff88',
            padding: { left: 20, right: 20, top: 12, bottom: 12 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btnPlay.on('pointerdown', () => {
            this.scene.stop('UIScene');
            const shipBase = (this.gameScene && this.gameScene.selectedShipBase) ? this.gameScene.selectedShipBase : 'player1';
            this.scene.start('GameScene', { round: 1, shipType: shipBase + 'a' });
        });

        modal.add([bg, title, scoreVal, enemyVal, btnPlay]);
    }

    handleResize(gameSize) {
        const { width, height } = gameSize;
        this.applyResponsiveLayout(width, height);
    }

    applyResponsiveLayout(width, height) {
        const isCompact = width <= 768;
        if (this.scoreText) {
            this.scoreText.setPosition(isCompact ? 10 : 20, isCompact ? 10 : 20);
            this.scoreText.setFontSize(isCompact ? 12 : 18);
        }
        if (this.astronautText) {
            this.astronautText.setPosition(isCompact ? 10 : 20, isCompact ? 32 : 46);
            this.astronautText.setFontSize(isCompact ? 12 : 17);
        }
        if (this.hudHpText) {
            this.hudHpText.setPosition(isCompact ? 10 : 20, isCompact ? 54 : 72);
            this.hudHpText.setFontSize(isCompact ? 11 : 15);
        }
        if (this.waveText) {
            this.waveText.setPosition(isCompact ? width - 52 : width / 2, isCompact ? 10 : 20);
            this.waveText.setFontSize(isCompact ? 11 : 16);
        }
        if (this.bossBarContainer) {
            this.bossBarContainer.setPosition(width / 2, isCompact ? 78 : 60);
            this.bossBarContainer.setScale(isCompact ? 0.7 : 1);
        }
    }
}

window.UIScene = UIScene;
