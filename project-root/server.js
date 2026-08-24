/**
 * SERVER NHỎ CHẠY GAME BẮN PHI THUYỀN (localhost:8123)
 * - Dùng khi bấm đúp vào file CHOI-GAME.bat
 * - Chạy qua http:// giúp WebGL hoạt động mượt nhất (khỏi bị Chrome chặn ảnh local)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8123;
const root = __dirname;

const mime = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.json': 'application/json; charset=utf-8'
};

http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';

    // Chặn truy cập ra ngoài thư mục game (bảo mật đường dẫn ../)
    const filePath = path.join(root, urlPath);
    if (!filePath.startsWith(root)) {
        res.statusCode = 403;
        res.end('403 Forbidden');
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.statusCode = 404;
            res.end('404 Not Found');
            console.log('[404] ' + urlPath);
            return;
        }
        res.setHeader('Content-Type', mime[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.end(data);
    });
}).listen(PORT, () => {
    console.log('================================================');
    console.log('  GAME BẮN PHI THUYỀN ĐANG CHẠY!');
    console.log('  Mở trình duyệt: http://localhost:' + PORT);
    console.log('  Giữ cửa sổ này mở khi đang chơi. Đóng = tắt game.');
    console.log('================================================');
});
