// Shared language system: Vietnamese (vi) and English (en).
window.I18N = {
    lang: localStorage.getItem('galactic-language') || 'vi',
    dict: {
        vi: { language:'Ngôn ngữ', vietnamese:'Tiếng Việt', english:'English', settings:'⚙️ CÀI ĐẶT HỆ THỐNG', sound:'🔊 Âm thanh (SFX):', graphics:'✨ Đồ họa (VFX):', controls:'⌨️ Phím tắt:', close:'ĐÓNG ✕', on:'BẬT ✓', off:'TẮT ✕', score:'ĐIỂM', rescued:'CỨU', wave:'WAVE', gameOver:'💀 THUA CUỘC 💀', victory:'🏆 CHIẾN THẮNG 🏆' },
        en: { language:'Language', vietnamese:'Vietnamese', english:'English', settings:'⚙️ SYSTEM SETTINGS', sound:'🔊 Sound (SFX):', graphics:'✨ Graphics (VFX):', controls:'⌨️ Controls:', close:'CLOSE ✕', on:'ON ✓', off:'OFF ✕', score:'SCORE', rescued:'RESCUED', wave:'WAVE', gameOver:'💀 GAME OVER 💀', victory:'🏆 VICTORY 🏆' }
    },
    t(key) { return (this.dict[this.lang] && this.dict[this.lang][key]) || this.dict.vi[key] || key; },
    setLanguage(lang) { this.lang = lang === 'en' ? 'en' : 'vi'; localStorage.setItem('galactic-language', this.lang); window.dispatchEvent(new CustomEvent('languagechange', { detail: this.lang })); }
};
window.t = key => window.I18N.t(key);
