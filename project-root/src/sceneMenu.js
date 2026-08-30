/**
 * SCENE MENU
 * Menu chính, Chọn Phi Thuyền, Nút Xuất Kích, Nút Cài Đặt (Settings), Nút Thông Tin (Info), Bầu Trời Sao & Các Hành Tinh Parallax
 * Copyright @2026 TP Dragonsoft
 */

class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.selectedShipBase = 'player1';
        this.selectedRound = 1;
    }

    create() {
        const { width, height } = this.scale;
        document.body.classList.remove('game-active');
        this.menuElements = [];
        const isPortrait = height >= width;
        const homeKey = isPortrait ? 'homescreen' : 'homescreen2';
        const hasHomeBackground = this.textures.exists(homeKey);
        this.hasHomeBackground = hasHomeBackground;

        if (hasHomeBackground) {
            const background = this.add.image(width / 2, height / 2, homeKey).setDepth(-10);
            background.setScale(Math.max(width / background.width, height / background.height));
        }

        // 1. Tạo Bầu Trời Sao Parallax Động
        if (!hasHomeBackground) this.createStarfield();

        // 2. Tạo Các Hành Tinh Vũ Trụ Trôi Dạt
        if (!hasHomeBackground) this.createFloatingPlanets();

        // 3. Tiêu Đề Game Rực Rỡ
        const titleContainer = this.add.container(width / 2, height * 0.15);
        
        const titleGlow = this.add.text(0, 0, 'PHI THUYỀN KHÔNG GIAN', {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: Math.min(width * 0.07, 34) + 'px',
            fontWeight: '900',
            color: '#00f0ff',
            align: 'center'
        }).setOrigin(0.5).setShadow(0, 0, '#00f0ff', 16);

        const subTitle = this.add.text(0, 34, '★ GALACTIC GUARDIAN ★', {
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: '17px',
            fontWeight: '700',
            color: '#ffcc00',
            letterSpacing: 4
        }).setOrigin(0.5);

        titleContainer.add([titleGlow, subTitle]);
        titleContainer.setVisible(!hasHomeBackground);
        this.menuTitleContainer = titleContainer;
        this.menuElements.push(titleContainer);

        this.tweens.add({
            targets: titleGlow,
            scale: 1.04,
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // 4. Khu Vực Chọn Phi Thuyền (Ship Selection)
        const shipSelector = this.createShipSelector(width / 2, height * 0.45);
        this.menuElements.push(shipSelector);

        // 5. Hướng Dẫn Điều Khiển Rút Gọn
        if (width > 768) {
            const controlHint = this.add.text(width / 2, height * 0.69, 'PC: WASD + Chuột + Space + E Thu Phục', {
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: '14px',
                fontWeight: '600',
                color: '#00f0ff',
                align: 'center',
                wordWrap: { width: width - 32 }
            }).setOrigin(0.5);
            this.menuElements.push(controlHint);
        }

        const startGame = () => {
            window.soundFX.init();
            window.soundFX.playPowerup();
            const roundNum = Number(this.selectedRound) || 1;
            const isRoundPortrait = roundNum <= 2;
            const shipType = this.selectedShipBase + (isRoundPortrait ? 'a' : 'b');
            document.body.classList.add('game-active');
            this.scene.start('GameScene', { shipType: shipType, round: roundNum });
        };

        // 6. Nút Bắt Đầu (Start Button)
        const btnStart = this.add.container(width / 2, height * 0.78);
        
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x0077ff, 0.95);
        btnBg.fillRoundedRect(-110, -22, 220, 44, 22);
        btnBg.lineStyle(2, 0x00f0ff, 1);
        btnBg.strokeRoundedRect(-110, -22, 220, 44, 22);

        const btnText = this.add.text(0, 0, 'XUẤT KÍCH ▶', {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '17px',
            fontWeight: '900',
            color: '#ffffff'
        }).setOrigin(0.5);

        btnStart.add([btnBg, btnText]);
        btnStart.setSize(220, 44);
        btnStart.setInteractive({ useHandCursor: true });
        this.menuElements.push(btnStart);

        btnStart.on('pointerover', () => {
            btnBg.clear();
            btnBg.fillStyle(0x00aaff, 1);
            btnBg.fillRoundedRect(-110, -22, 220, 44, 22);
            btnBg.lineStyle(2, 0xffffff, 1);
            btnBg.strokeRoundedRect(-110, -22, 220, 44, 22);
        });

        btnStart.on('pointerout', () => {
            btnBg.clear();
            btnBg.fillStyle(0x0077ff, 0.95);
            btnBg.fillRoundedRect(-110, -22, 220, 44, 22);
            btnBg.lineStyle(2, 0x00f0ff, 1);
            btnBg.strokeRoundedRect(-110, -22, 220, 44, 22);
        });

        btnStart.on('pointerdown', () => {
            startGame();
        });

        // 7. CẶP NÚT CÀI ĐẶT & THÔNG TIN DƯỚI NÚT XUẤT KÍCH
        const subButtonsY = height * 0.87;

        // Nút Cài Đặt (Settings)
        const btnSettings = this.add.container(width / 2 - 66, subButtonsY);
        const bgSet = this.add.graphics();
        bgSet.fillStyle(0x0f172a, 0.9);
        bgSet.fillRoundedRect(-56, -18, 112, 36, 18);
        bgSet.lineStyle(1.5, 0x00f0ff, 0.8);
        bgSet.strokeRoundedRect(-56, -18, 112, 36, 18);

        const txtSet = this.add.text(0, 0, '⚙️ CÀI ĐẶT', {
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: '15px',
            fontWeight: '700',
            color: '#00f0ff'
        }).setOrigin(0.5);

        btnSettings.add([bgSet, txtSet]);
        btnSettings.setSize(112, 36);
        btnSettings.setInteractive({ useHandCursor: true });
        this.menuElements.push(btnSettings);

        btnSettings.on('pointerover', () => {
            bgSet.clear();
            bgSet.fillStyle(0x1e293b, 1);
            bgSet.fillRoundedRect(-56, -18, 112, 36, 18);
            bgSet.lineStyle(2, 0xffffff, 1);
            bgSet.strokeRoundedRect(-56, -18, 112, 36, 18);
            txtSet.setColor('#ffffff');
        });

        btnSettings.on('pointerout', () => {
            bgSet.clear();
            bgSet.fillStyle(0x0f172a, 0.9);
            bgSet.fillRoundedRect(-56, -18, 112, 36, 18);
            bgSet.lineStyle(1.5, 0x00f0ff, 0.8);
            bgSet.strokeRoundedRect(-56, -18, 112, 36, 18);
            txtSet.setColor('#00f0ff');
        });

        btnSettings.on('pointerdown', () => {
            window.soundFX.init();
            window.soundFX.playLaser(1.2);
            this.showSettingsModal();
        });

        // Nút Thông Tin (Info)
        const btnInfo = this.add.container(width / 2 + 66, subButtonsY);
        const bgInfo = this.add.graphics();
        bgInfo.fillStyle(0x0f172a, 0.9);
        bgInfo.fillRoundedRect(-56, -18, 112, 36, 18);
        bgInfo.lineStyle(1.5, 0xffcc00, 0.8);
        bgInfo.strokeRoundedRect(-56, -18, 112, 36, 18);

        const txtInfo = this.add.text(0, 0, 'ℹ️ INFO', {
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: '15px',
            fontWeight: '700',
            color: '#ffcc00'
        }).setOrigin(0.5);

        btnInfo.add([bgInfo, txtInfo]);
        btnInfo.setSize(112, 36);
        btnInfo.setInteractive({ useHandCursor: true });
        this.menuElements.push(btnInfo);

        btnInfo.on('pointerover', () => {
            bgInfo.clear();
            bgInfo.fillStyle(0x1e293b, 1);
            bgInfo.fillRoundedRect(-56, -18, 112, 36, 18);
            bgInfo.lineStyle(2, 0xffffff, 1);
            bgInfo.strokeRoundedRect(-56, -18, 112, 36, 18);
            txtInfo.setColor('#ffffff');
        });

        btnInfo.on('pointerout', () => {
            bgInfo.clear();
            bgInfo.fillStyle(0x0f172a, 0.9);
            bgInfo.fillRoundedRect(-56, -18, 112, 36, 18);
            bgInfo.lineStyle(1.5, 0xffcc00, 0.8);
            bgInfo.strokeRoundedRect(-56, -18, 112, 36, 18);
            txtInfo.setColor('#ffcc00');
        });

        btnInfo.on('pointerdown', () => {
            window.soundFX.init();
            window.soundFX.playLaser(1.2);
            this.showInfoModal();
        });

        // 8. COPYRIGHT FOOTER CREDIT
        const footer = this.add.text(width / 2, height * 0.95, 'Copyright @2026 TP Dragonsoft', {
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: '13px',
            fontWeight: '600',
            color: '#64748b',
            letterSpacing: 1
        }).setOrigin(0.5);
        this.menuElements.push(footer);

        this.showIntroScreen(width, height);

        // Resize Listener
        this.scale.on('resize', () => {
            this.scene.restart();
        });
    }

    showIntroScreen(width, height) {
        this.menuElements.forEach(element => {
            if (element) element.setVisible(false);
        });

        const intro = this.add.container(0, 0).setDepth(100);
        const hitArea = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0)
            .setInteractive({ useHandCursor: true });
        const prompt = this.add.text(width / 2, height * 0.78, 'CHẠM ĐỂ CHƠI', {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: Math.min(20, width * 0.06) + 'px',
            fontWeight: '900',
            color: '#ffffff',
            stroke: '#0077ff',
            strokeThickness: 3,
            align: 'center'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: prompt,
            alpha: { from: 1, to: 0.2 },
            duration: 650,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        const enterMenu = () => {
            this.createShipMenuBackground(width, height);
            this.menuElements.forEach(element => {
                if (element) element.setVisible(element !== this.menuTitleContainer || !this.hasHomeBackground);
            });
            intro.destroy();
        };

        hitArea.on('pointerdown', enterMenu);
        intro.add([hitArea, prompt]);
    }

    createShipMenuBackground(width, height) {
        if (this.shipMenuBackground) return;
        const backgroundKey = height >= width ? 'menubackground' : 'menubackground2';
        if (!this.textures.exists(backgroundKey)) return;
        this.shipMenuBackground = this.add.image(width / 2, height / 2, backgroundKey).setDepth(-9);
        this.shipMenuBackground.setScale(Math.max(width / this.shipMenuBackground.width, height / this.shipMenuBackground.height));
    }

    createStarfield() {
        const { width, height } = this.scale;
        this.stars = [];
        for (let i = 0; i < 80; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, width),
                Phaser.Math.Between(0, height),
                Phaser.Math.FloatBetween(0.5, 2),
                0xffffff,
                Phaser.Math.FloatBetween(0.3, 0.9)
            );
            star.speed = Phaser.Math.FloatBetween(0.3, 1.8);
            this.stars.push(star);
        }
    }

    createFloatingPlanets() {
        const { width, height } = this.scale;

        if (this.textures.exists('traidat')) {
            const earth = this.add.image(width * 0.85, height * 0.15, 'traidat')
                .setDisplaySize(120, 120)
                .setAlpha(0.75);
            this.tweens.add({
                targets: earth,
                rotation: Math.PI * 2,
                duration: 45000,
                repeat: -1
            });
        }

        if (this.textures.exists('saotho')) {
            const saturn = this.add.image(width * 0.15, height * 0.82, 'saotho')
                .setDisplaySize(140, 100)
                .setAlpha(0.65);
            this.tweens.add({
                targets: saturn,
                y: height * 0.80,
                duration: 4000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        if (this.textures.exists('phihanhgia')) {
            const astronaut = this.add.image(width * 0.2, height * 0.28, 'phihanhgia')
                .setDisplaySize(50, 50);
            this.tweens.add({
                targets: astronaut,
                y: height * 0.32,
                rotation: 0.4,
                duration: 3500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    createShipSelector(x, y) {
        const container = this.add.container(x, y);
        const isPortrait = this.scale.height >= this.scale.width;

        const frame = this.add.graphics();
        frame.fillStyle(0x0a1628, 0.16);
        frame.fillRoundedRect(-160, -95, 320, 190, 18);
        frame.lineStyle(2, 0x00f0ff, 0.35);
        frame.strokeRoundedRect(-160, -95, 320, 190, 18);

        const neonBorder = this.add.graphics();
        const neonBorderInner = this.add.graphics();
        this.shipNeonBorders = [neonBorder, neonBorderInner];
        this.shipNeonBounds = { left: -160, top: -95, width: 320, height: 190 };

        const selectTitle = this.add.text(0, -70, 'CHỌN PHI THUYỀN', {
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: '18px',
            fontWeight: '700',
            color: '#00f0ff',
            letterSpacing: 2
        }).setOrigin(0.5);

        const initialKey = this.selectedShipBase + (isPortrait ? 'a' : 'b');
        const shipImg = this.add.image(0, 0, initialKey);
        this.fitShipPreview(shipImg, isPortrait);

        this.tweens.add({
            targets: shipImg,
            y: isPortrait ? -6 : -4,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        const shipData = {
            'player1': { name: 'CHIẾN HẠM ALPHA (P1)', sub: '⚡ TIA LAZE KHỔNG LỒ' },
            'player2': { name: 'CHIẾN HẠM PHANTOM (P2)', sub: '⚡ THUNDER STRIKE' },
            'player3': { name: 'CHIẾN HẠM VẦNG NGUYỆT (P3)', sub: '🌙 ĐAO TRĂNG KHUYẾT' }
        };
        const shipList = ['player1', 'player2', 'player3'];

        const shipName = this.add.text(0, 58, (shipData[this.selectedShipBase] || shipData['player1']).name, {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '13px',
            fontWeight: '800',
            color: '#ffffff'
        }).setOrigin(0.5).setShadow(0, 0, '#00f0ff', 8);

        const shipSpecial = this.add.text(0, 76, (shipData[this.selectedShipBase] || shipData['player1']).sub, {
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: '13px',
            fontWeight: '700',
            color: '#00ffcc'
        }).setOrigin(0.5);

        const arrowLeft = this.add.text(-120, 0, '◀', {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '32px',
            color: '#00f0ff'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        const arrowRight = this.add.text(120, 0, '▶', {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '32px',
            color: '#00f0ff'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        arrowLeft.on('pointerover', () => arrowLeft.setScale(1.2).setColor('#ffffff'));
        arrowLeft.on('pointerout', () => arrowLeft.setScale(1.0).setColor('#00f0ff'));
        arrowRight.on('pointerover', () => arrowRight.setScale(1.2).setColor('#ffffff'));
        arrowRight.on('pointerout', () => arrowRight.setScale(1.0).setColor('#00f0ff'));

        const changeShip = (dir) => {
            const currentIsPortrait = this.scale.height >= this.scale.width;
            let idx = shipList.indexOf(this.selectedShipBase);
            if (idx === -1) idx = 0;
            idx = (idx + dir + shipList.length) % shipList.length;
            this.selectedShipBase = shipList[idx];

            const info = shipData[this.selectedShipBase];
            shipName.setText(info.name);
            shipSpecial.setText(info.sub);

            const newKey = this.selectedShipBase + (currentIsPortrait ? 'a' : 'b');
            if (this.textures.exists(newKey)) {
                shipImg.setTexture(newKey);
                this.fitShipPreview(shipImg, currentIsPortrait);
            }
            window.soundFX.playLaser(1.5);
        };

        arrowLeft.on('pointerdown', () => changeShip(-1));
        arrowRight.on('pointerdown', () => changeShip(1));

        container.add([frame, neonBorder, neonBorderInner, selectTitle, shipImg, shipName, shipSpecial, arrowLeft, arrowRight]);
        return container;
    }

    fitShipPreview(shipImg, isPortrait) {
        if (isPortrait) {
            // Scale theo chiều cao như trong game, giữ đúng tỉ lệ (không bóp méo)
            const origW = shipImg.width || 64;
            const origH = shipImg.height || 64;
            const targetH = 95;
            const targetW = (origW / origH) * targetH;
            shipImg.setDisplaySize(targetW, targetH);
        } else {
            const origW = shipImg.width || 64;
            const origH = shipImg.height || 64;
            const targetW = 130;
            const targetH = (origH / origW) * targetW;
            shipImg.setDisplaySize(targetW, targetH);
        }
    }

    /**
     * BẢNG CÀI ĐẶT (SETTINGS MODAL)
     */
    showSettingsModal() {
        if (this.currentModal) this.currentModal.destroy();

        const { width, height } = this.scale;
        const modal = this.add.container(width / 2, height / 2).setDepth(50);
        this.currentModal = modal;

        const backdrop = this.add.rectangle(0, 0, width * 2, height * 2, 0x000000, 0.7)
            .setInteractive();

        const box = this.add.graphics();
        box.fillStyle(0x0a1628, 0.95);
        box.fillRoundedRect(-155, -160, 310, 320, 16);
        box.lineStyle(2, 0x00f0ff, 0.9);
        box.strokeRoundedRect(-155, -160, 310, 320, 16);

        const title = this.add.text(0, -120, '⚙️ CÀI ĐẶT HỆ THỐNG', {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '18px',
            fontWeight: '900',
            color: '#00f0ff'
        }).setOrigin(0.5);

        // 1. Tùy chọn Âm thanh
        const soundLabel = this.add.text(-120, -60, '🔊 Âm thanh (SFX):', {
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: '16px',
            fontWeight: '700',
            color: '#ffffff'
        });

        const isMuted = window.soundFX && window.soundFX.ctx && window.soundFX.ctx.state === 'suspended';
        const soundBtn = this.add.text(60, -50, isMuted ? 'TẮT ✕' : 'BẬT ✓', {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '13px',
            fontWeight: '800',
            color: isMuted ? '#ff0055' : '#00ff88',
            backgroundColor: '#1e293b',
            padding: { left: 10, right: 10, top: 4, bottom: 4 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        soundBtn.on('pointerdown', () => {
            if (window.soundFX.ctx) {
                if (window.soundFX.ctx.state === 'running') {
                    window.soundFX.ctx.suspend();
                    soundBtn.setText('TẮT ✕').setColor('#ff0055');
                } else {
                    window.soundFX.ctx.resume();
                    soundBtn.setText('BẬT ✓').setColor('#00ff88');
                    window.soundFX.playLaser();
                }
            }
        });

        // 2. Tùy chọn Đồ họa
        const gfxLabel = this.add.text(-120, 0, '✨ Đồ họa (VFX):', {
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: '16px',
            fontWeight: '700',
            color: '#ffffff'
        });

        const gfxBtn = this.add.text(60, 10, 'CAO (60 FPS)', {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '12px',
            fontWeight: '800',
            color: '#00f0ff',
            backgroundColor: '#1e293b',
            padding: { left: 8, right: 8, top: 4, bottom: 4 }
        }).setOrigin(0.5);

        // 3. Phím tắt điều khiển
        const ctrlLabel = this.add.text(-120, 60, '⌨️ Phím tắt:', {
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: '16px',
            fontWeight: '700',
            color: '#ffffff'
        });

        const ctrlInfo = this.add.text(60, 70, 'PC: WASD + Chuột + Space + E\nMobile: Cần gạt + Bắn + E', {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '10px',
            fontWeight: '800',
            color: '#ffcc00',
            backgroundColor: '#1e293b',
            padding: { left: 8, right: 8, top: 4, bottom: 4 },
            align: 'center',
            wordWrap: { width: 190 }
        }).setOrigin(0.5);

        const roundLabel = this.add.text(-120, 112, '🌍 Vòng chơi:', {
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: '15px',
            fontWeight: '700',
            color: '#ffffff'
        });

        const getRoundLabelText = (r) => {
            if (r === 1) return 'V1: DỌC 📱';
            if (r === 2) return 'V2: DỌC 📱';
            return 'V3: NGANG 💻';
        };

        const roundBtn = this.add.text(60, 112, getRoundLabelText(this.selectedRound), {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '11px',
            fontWeight: '800',
            color: '#ffcc00',
            backgroundColor: '#1e293b',
            padding: { left: 8, right: 8, top: 4, bottom: 4 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        roundBtn.on('pointerdown', () => {
            this.selectedRound = this.selectedRound >= 3 ? 1 : this.selectedRound + 1;
            roundBtn.setText(getRoundLabelText(this.selectedRound));
            window.soundFX.playLaser(1.2);
        });

        // Nút Đóng
        const btnClose = this.add.text(0, 145, 'ĐÓNG ✕', {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '14px',
            fontWeight: '800',
            color: '#ffffff',
            backgroundColor: '#ff0055',
            padding: { left: 24, right: 24, top: 8, bottom: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btnClose.on('pointerdown', () => {
            modal.destroy();
            this.currentModal = null;
        });

        modal.add([backdrop, box, title, soundLabel, soundBtn, gfxLabel, gfxBtn, ctrlLabel, ctrlInfo, roundLabel, roundBtn, btnClose]);
    }

    /**
     * BẢNG THÔNG TIN (INFO MODAL) - NHÀ PHÁT TRIỂN: TP DRAGONSOFT
     */
    showInfoModal() {
        if (this.currentModal) this.currentModal.destroy();

        const { width, height } = this.scale;
        const isCompact = width <= 768;
        const boxWidth = Math.min(320, width - 28);
        const boxHeight = Math.min(380, height - 36);
        const left = -boxWidth / 2;
        const top = -boxHeight / 2;
        const modal = this.add.container(width / 2, height / 2).setDepth(50);
        this.currentModal = modal;

        const backdrop = this.add.rectangle(0, 0, width * 2, height * 2, 0x000000, 0.7)
            .setInteractive();

        const box = this.add.graphics();
        box.fillStyle(0x0a1628, 0.95);
        box.fillRoundedRect(left, top, boxWidth, boxHeight, 16);
        box.lineStyle(2, 0xffcc00, 0.9);
        box.strokeRoundedRect(left, top, boxWidth, boxHeight, 16);

        const title = this.add.text(0, -155, 'ℹ️ HƯỚNG DẪN & THÔNG TIN', {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: isCompact ? '12px' : '15px',
            fontWeight: '900',
            color: '#ffcc00'
        }).setOrigin(0.5).setPosition(0, top + (isCompact ? 22 : 35));

        const infoContent =
            '🚀 HÀNH TRÌNH MIỀN ĐẤT HỨA\n\n' +
            'Trái Đất đang lụi tàn. Những phi hành đoàn\n' +
            'cuối cùng lên đường tìm Miền Đất Hứa\n' +
            'ở nơi xa nhất giữa vũ trụ bao la.\n\n' +
            'Nhưng bóng tối đã thức tỉnh. Quái vật không\n' +
            'gian tràn ra từ các hành tinh xa lạ, chặn\n' +
            'đường đoàn tàu và săn đuổi phi thuyền.\n\n' +
            'Hãy chiến đấu qua từng vòng sóng kẻ thù,\n' +
            'giải cứu đồng minh và vượt qua những con Boss\n' +
            'khổng lồ để mở lối đến Miền Đất Hứa.\n\n' +
            'Mỗi trận chiến là một bước gần hơn tới\n' +
            'ngôi nhà mới của nhân loại.\n\n' +
            '🏢 TP Dragonsoft\n' +
            '© Copyright @2026 TP Dragonsoft';

        const contentTop = top + (isCompact ? 42 : 65);
        const viewportTop = top + (isCompact ? 40 : 60);
        const viewportHeight = boxHeight - (isCompact ? 88 : 112);
        const viewportLeft = left + 14;
        const viewportWidth = boxWidth - 28;
        const infoText = this.add.text(viewportLeft, contentTop, infoContent, {
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: isCompact ? '12px' : '13.5px',
            fontWeight: '600',
            color: '#ffffff',
            align: 'left',
            lineSpacing: isCompact ? 1 : 2,
            wordWrap: { width: viewportWidth }
        }).setOrigin(0, 0);

        const clipArea = this.add.graphics();
        clipArea.fillStyle(0xffffff, 1);
        clipArea.fillRect(
            width / 2 + viewportLeft,
            height / 2 + viewportTop,
            viewportWidth,
            viewportHeight
        );
        clipArea.setVisible(true).setAlpha(0.001);
        const needsScroll = infoText.height > viewportHeight;
        if (needsScroll) {
            infoText.setMask(clipArea.createGeometryMask());
        } else {
            clipArea.destroy();
        }

        const scrollArea = this.add.rectangle(
            viewportLeft + viewportWidth / 2,
            viewportTop + viewportHeight / 2,
            viewportWidth,
            viewportHeight,
            0xffffff,
            0
        ).setInteractive();
        let scrollOffset = 0;
        let dragStartY = null;
        let dragStartOffset = 0;
        const maxScroll = () => Math.max(0, infoText.height - viewportHeight);
        const applyScroll = (offset) => {
            scrollOffset = Phaser.Math.Clamp(offset, 0, maxScroll());
            infoText.y = contentTop - scrollOffset;
        };

        scrollArea.on('pointerdown', (pointer) => {
            dragStartY = pointer.y;
            dragStartOffset = scrollOffset;
        });
        this.input.on('pointermove', (pointer) => {
            if (dragStartY !== null && pointer.isDown && this.currentModal === modal) {
                applyScroll(dragStartOffset + dragStartY - pointer.y);
            }
        });
        this.input.on('pointerup', () => {
            dragStartY = null;
        });
        this.input.on('wheel', (pointer, currentlyOver, deltaX, deltaY) => {
            if (this.currentModal === modal) applyScroll(scrollOffset + deltaY * 0.6);
        });

        const btnClose = this.add.text(0, 150, 'ĐÃ HIỂU ✓', {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '14px',
            fontWeight: '800',
            color: '#030712',
            backgroundColor: '#ffcc00',
            padding: { left: 24, right: 24, top: 7, bottom: 7 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btnClose.on('pointerdown', () => {
            modal.destroy();
            this.currentModal = null;
        });

        modal.add([backdrop, box, infoText, scrollArea, title, btnClose]);
    }

    update() {
        this.animateShipNeonBorder();
        const { height } = this.scale;
        if (this.stars) {
            for (let star of this.stars) {
                star.y += star.speed;
                if (star.y > height) {
                    star.y = 0;
                    star.x = Phaser.Math.Between(0, this.scale.width);
                }
            }
        }
    }

    animateShipNeonBorder() {
        if (!this.shipNeonBorders || !this.shipNeonBounds) return;

        const { left, top, width, height } = this.shipNeonBounds;
        const perimeter = (width + height) * 2;
        const pointAt = (distance) => {
            const position = ((distance % perimeter) + perimeter) % perimeter;
            if (position < width) return { x: left + position, y: top };
            if (position < width + height) return { x: left + width, y: top + position - width };
            if (position < width * 2 + height) return { x: left + width - (position - width - height), y: top + height };
            return { x: left, y: top + height - (position - width * 2 - height) };
        };

        const drawTravelingLight = (graphics, bounds, head, color) => {
            const borderPerimeter = (bounds.width + bounds.height) * 2;
            const tail = 92;
            const drawPath = (lineWidth, alpha) => {
                graphics.lineStyle(lineWidth, color, alpha);
                graphics.beginPath();
                let point = pointAt(head - tail);
                graphics.moveTo(point.x, point.y);
                for (let i = 1; i <= 18; i++) {
                    point = pointAt(head - tail + (tail * i) / 18);
                    graphics.lineTo(point.x, point.y);
                }
                graphics.strokePath();
            };

            graphics.clear();
            drawPath(10, 0.14);
            drawPath(3, 0.92);
            return (head + borderPerimeter) % borderPerimeter;
        };

        const firstHead = (this.time.now * 0.14) % perimeter;
        const secondHead = (perimeter - this.time.now * 0.11) % perimeter;
        drawTravelingLight(this.shipNeonBorders[0], this.shipNeonBounds, firstHead, 0x00f0ff);
        drawTravelingLight(this.shipNeonBorders[1], this.shipNeonBounds, secondHead, 0x8b5cf6);
    }
}

window.MenuScene = MenuScene;
