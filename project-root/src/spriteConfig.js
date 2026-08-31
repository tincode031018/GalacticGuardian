/**
 * spriteConfig.js - CẤU HÌNH KÍCH THƯỚC SPRITE CHO GAME
 * - File này chứa GIÁ TRỊ MẶC ĐỊNH + hàm nạp file sprite-sizes.json (nếu có).
 * - Mở sprite-editor.html để chỉnh kích thước trực quan, lưu ra sprite-sizes.json
 *   đặt cạnh index.html, game sẽ tự nạp. Không có file -> dùng mặc định bên dưới.
 */
window.SPRITE_DEFAULTS = {
    rounds: {
        round1Waves: 20, round1Enemies: 4, round1OrbDrop: 18,
        round2Waves: 20, round2Enemies: 3, round2OrbDrop: 18,
        round3Waves: 20, round3Enemies: 10, round3OrbDrop: 18
    },
    player: {
        portraitHeight: 75,       // Chiều cao phi thuyền khi MÀN DỌC (round 1-2)
        landscapeWidth: 90,       // Chiều rộng phi thuyền khi MÀN NGANG (round 3)
        menuPortraitHeight: 95,   // Kích thước preview trong MENU (màn dọc)
        menuLandscapeWidth: 130,  // Kích thước preview trong MENU (màn ngang)
        tint: '#ffffff'            // Màu phủ sprite (hex)
        ,player1PortraitHeight: 75, player1LandscapeWidth: 90,
        player2PortraitHeight: 75, player2LandscapeWidth: 90,
        player3PortraitHeight: 75, player3LandscapeWidth: 90,
        variants: { player1: { tint:'#ffffff', bulletTint:'#55eaff', engineTint:'#00eaff', rotation:0, flipX:false, flipY:false }, player2: { tint:'#ffffff', bulletTint:'#c879ff', engineTint:'#8a5cff', rotation:0, flipX:false, flipY:false }, player3: { tint:'#ffffff', bulletTint:'#ffffff', engineTint:'#ff9d3d', rotation:0, flipX:false, flipY:false } }
    },
    enemy: {
        portraitHeight: 75,       // Chiều cao quân địch khi MÀN DỌC
        landscapeWidth: 90,       // Chiều rộng quân địch khi MÀN NGANG
        tint: '#ffffff'            // Màu phủ sprite (hex)
        ,enemy1PortraitHeight: 75, enemy1LandscapeWidth: 90,
        enemy2PortraitHeight: 75, enemy2LandscapeWidth: 90,
        enemy3PortraitHeight: 75, enemy3LandscapeWidth: 90,
        variants: { enemy1: { tint:'#ffffff', rotation:0, flipX:false, flipY:false }, enemy2: { tint:'#ffffff', rotation:0, flipX:false, flipY:false }, enemy3: { tint:'#ffffff', rotation:0, flipX:false, flipY:false } }
    },
    boss: {
        round1Portrait: 220,      // Boss Round 1 (Titan) - MÀN DỌC
        round1Landscape: 250,     // Boss Round 1 (Titan) - MÀN NGANG
        round2RedPortrait: 220,   // Boss Round 2 (Tử Thần Đỏ) - MÀN DỌC
        round2RedLandscape: 250,  // Boss Round 2 (Tử Thần Đỏ) - MÀN NGANG
        round2GreenPortrait: 180, // Boss Round 2 (Cyber Medic Xanh) - MÀN DỌC
        round2GreenLandscape: 200,// Boss Round 2 (Cyber Medic Xanh) - MÀN NGANG
        round3Portrait: 240,      // Boss Round 3 (Omega) - MÀN DỌC
        round3Landscape: 270,     // Boss Round 3 (Omega) - MÀN NGANG
        tint: '#ffffff',           // Màu boss mặc định
        variants: { round1: { tint:'#ffffff', rotation:0, flipX:false, flipY:false }, round2Red: { tint:'#ffffff', rotation:0, flipX:false, flipY:false }, round2Green: { tint:'#ffffff', rotation:0, flipX:false, flipY:false }, round3: { tint:'#ffffff', rotation:0, flipX:false, flipY:false } }
    },
    meteor: {
        sizeMin: 28,              // Kích thước thiên thạch NHỎ NHẤT
        sizeMax: 58               // Kích thước thiên thạch LỚN NHẤT
    },
    satellite: {
        size: 60                  // Kích thước vệ tinh
    },
    shield: {
        size: 95                  // Kích thước khiên điện quanh phi thuyền
    }
};

// Cấu hình đang dùng (ban đầu = mặc định cho tới khi nạp file)
window.spriteConfig = window.SPRITE_DEFAULTS;

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Gộp file lưu (overlay) lên nền giá trị mặc định (base) - chỉ ghi đè key có trong overlay
function deepMerge(base, overlay) {
    const out = deepClone(base);
    if (!overlay || typeof overlay !== 'object' || Array.isArray(overlay)) return out;
    for (const k of Object.keys(overlay)) {
        const v = overlay[k];
        if (!v || typeof v !== 'object' || Array.isArray(v)) {
            if (v !== undefined) out[k] = v;
        } else {
            const baseObj = (base[k] && typeof base[k] === 'object') ? base[k] : {};
            out[k] = Object.assign(deepClone(baseObj), deepClone(v));
        }
    }
    return out;
}

/**
 * Nạp cấu hình kích thước từ file sprite-sizes.json (http:// server).
 * Nếu không nạp được (mở bằng file:// hoặc không có file) -> dùng mặc định.
 * Gọi trước khi vào MenuScene.
 */
async function loadSpriteConfig(url) {
    if (url) {
        try {
            const res = await fetch(url, { cache: 'no-store' });
            if (res.ok) {
                const saved = await res.json();
                window.spriteConfig = deepMerge(window.SPRITE_DEFAULTS, saved);
                console.log('[spriteConfig] Đã nạp cấu hình:', url);
                return window.spriteConfig;
            }
        } catch (e) {
            console.warn('[spriteConfig] Không nạp được, dùng mặc định:', e);
        }
    }
    window.spriteConfig = deepClone(window.SPRITE_DEFAULTS);
    return window.spriteConfig;
}

/**
 * Lấy giá trị cấu hình an toàn: window.sc('player', 'portraitHeight')
 * Luôn trả về số (hoặc undefined nếu cả default cũng thiếu).
 */
window.sc = function (cat, key) {
    const cfg = window.spriteConfig || window.SPRITE_DEFAULTS;
    const d = window.SPRITE_DEFAULTS;
    let val = cfg && cfg[cat] ? cfg[cat][key] : undefined;
    if (val === undefined || val === null || Number.isNaN(Number(val))) {
        val = d && d[cat] ? d[cat][key] : undefined;
    }
    return Number(val);
};
