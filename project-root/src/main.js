/**
 * MAIN.JS
 * Khởi tạo Phaser 3 Game Instance, Cấu hình Render WebGL/Canvas, Tối ưu Màn hình Dọc & Ngang Mobile
 */

window.addEventListener('DOMContentLoaded', () => {
    // Kích thước ban đầu phù hợp với thiết bị
    const width = window.innerWidth;
    const height = window.innerHeight;

    // PHÁT HIỆN GIAO THỨC file:// :
    // Chrome chặn ảnh local (file://) lên WebGL texture vì chính sách CORS (origin null)
    // → Dùng Canvas renderer khi mở trực tiếp file index.html để game vẫn hiển thị đầy đủ
    const isFileProtocol = window.location.protocol === 'file:';

    const config = {
        type: isFileProtocol ? Phaser.CANVAS : Phaser.AUTO,
        parent: 'game-container',
        width: width,
        height: height,
        backgroundColor: '#030712',
        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: '100%',
            height: '100%'
        },
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 0 },
                debug: false
            }
        },
        render: {
            antialias: true,
            pixelArt: false,
            powerPreference: 'high-performance'
        },
        scene: [
            window.PreloadScene,
            window.MenuScene,
            window.GameScene,
            window.UIScene
        ]
    };

    // Khởi tạo Game
    const game = new Phaser.Game(config);
    window.gameInstance = game;

    // Tự động khởi tạo Web Audio khi người dùng chạm lần đầu tiên
    const initAudioOnFirstTouch = () => {
        if (window.soundFX) {
            window.soundFX.init();
            window.soundFX.resume();
        }
        window.removeEventListener('pointerdown', initAudioOnFirstTouch);
        window.removeEventListener('keydown', initAudioOnFirstTouch);
    };
    window.addEventListener('pointerdown', initAudioOnFirstTouch, { once: true });
    window.addEventListener('keydown', initAudioOnFirstTouch, { once: true });

    // Ngăn chặn các cử chỉ cuộn trang / kéo thả mặc định trên trình duyệt điện thoại
    document.addEventListener('touchmove', (e) => {
        if (e.target.closest('#mobile-controls') || e.target.closest('canvas')) {
            e.preventDefault();
        }
    }, { passive: false });

    // Lắng nghe xoay màn hình (Orientation Change)
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            game.scale.resize(window.innerWidth, window.innerHeight);
        }, 200);
    });
});
