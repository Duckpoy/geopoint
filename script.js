// Danh sách địa điểm mẫu (Bạn có thể bổ sung thêm hàng trăm tọa độ + link ảnh 360)
const LOCATIONS = [
  {
    name: "Tháp Eiffel, Paris, Pháp",
    lat: 48.8584,
    lng: 2.2945,
    panorama: "https://pannellum.org/images/alma.jpg" // Thay bằng ảnh 360 thực tế của địa điểm
  },
  {
    name: "Đấu trường La Mã, Rome, Ý",
    lat: 41.8902,
    lng: 12.4922,
    panorama: "https://pannellum.org/images/bma-1.jpg"
  },
  {
    name: "Nhà hát Opera Sydney, Úc",
    lat: -33.8568,
    lng: 151.2153,
    panorama: "https://pannellum.org/images/cerro-toco-0.jpg"
  },
  {
    name: "Tượng Nữ thần Tự do, New York, Mỹ",
    lat: 40.6892,
    lng: -74.0445,
    panorama: "https://pannellum.org/images/jfk.jpg"
  },
  {
    name: "Núi Phú Sĩ, Nhật Bản",
    lat: 35.3606,
    lng: 138.7274,
    panorama: "https://pannellum.org/images/from-tree.jpg"
  }
];

let currentRound = 0;
let totalScore = 0;
let guessMarker = null;
let guessedLatLng = null;
let gameLocations = [];
let viewer = null;

// Khởi tạo Mini-map bằng Leaflet
const map = L.map('map', { zoomControl: false }).setView([20, 0], 1);
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

// Sửa lỗi map bị vỡ khung khi hover phóng to
const guessContainer = document.getElementById('guess-container');
guessContainer.addEventListener('transitionend', () => map.invalidateSize());

map.on('click', (e) => {
  guessedLatLng = e.latlng;
  if (guessMarker) {
    guessMarker.setLatLng(guessedLatLng);
  } else {
    guessMarker = L.marker(guessedLatLng).addTo(map);
  }
  const btn = document.getElementById('guess-btn');
  btn.disabled = false;
  btn.textContent = "Xác nhận đoán!";
});

// Công thức Haversine tính khoảng cách (km) giữa 2 tọa độ trên Trái Đất
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Công thức tính điểm chuẩn kiểu GeoGuessr (tối đa 5000 điểm)
function calculateScore(distanceKm) {
  if (distanceKm < 0.05) return 5000;
  const score = Math.round(5000 * Math.exp(-distanceKm / 2000));
  return Math.max(0, score);
}

function startGame() {
  currentRound = 0;
  totalScore = 0;
  gameLocations = [...LOCATIONS].sort(() => Math.random() - 0.5);
  loadRound();
}

function loadRound() {
  const loc = gameLocations[currentRound];
  document.getElementById('round-display').textContent = `${currentRound + 1} / ${gameLocations.length}`;
  document.getElementById('score-display').textContent = totalScore;

  // Reset marker
  if (guessMarker) {
    map.removeLayer(guessMarker);
    guessMarker = null;
  }
  guessedLatLng = null;
  map.setView([20, 0], 1);

  const btn = document.getElementById('guess-btn');
  btn.disabled = true;
  btn.textContent = "Chọn vị trí trên bản đồ";

  // Load ảnh 360
  if (viewer) viewer.destroy();
  viewer = pannellum.viewer('panorama', {
    type: 'equirectangular',
    panorama: loc.panorama,
    autoLoad: true,
    showControls: false
  });
}

let resultMap = null;
document.getElementById('guess-btn').addEventListener('click', () => {
  if (!guessedLatLng) return;

  const actual = gameLocations[currentRound];
  const dist = calculateDistance(actual.lat, actual.lng, guessedLatLng.lat, guessedLatLng.lng);
  const points = calculateScore(dist);
  totalScore += points;

  document.getElementById('result-title').textContent = `Đáp án: ${actual.name}`;
  document.getElementById('distance-text').textContent = `Bạn đoán lệch: ${dist.toFixed(1)} km`;
  document.getElementById('points-text').textContent = `+${points} điểm`;
  document.getElementById('result-modal').classList.remove('hidden');

  // Vẽ bản đồ kết quả nối 2 điểm
  if (resultMap) resultMap.remove();
  resultMap = L.map('result-map');
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(resultMap);

  const actualCoords = [actual.lat, actual.lng];
  const guessCoords = [guessedLatLng.lat, guessedLatLng.lng];

  L.marker(actualCoords).addTo(resultMap).bindPopup("Vị trí thật").openPopup();
  L.marker(guessCoords).addTo(resultMap).bindPopup("Bạn đoán");
  const line = L.polyline([actualCoords, guessCoords], { color: '#ef4444', weight: 3, dashArray: '6, 6' }).addTo(resultMap);
  resultMap.fitBounds(line.getBounds(), { padding: [40, 40] });

  const nextBtn = document.getElementById('next-btn');
  nextBtn.textContent = (currentRound + 1 >= gameLocations.length) ? "Chơi lại từ đầu" : "Vòng tiếp theo";
});

document.getElementById('next-btn').addEventListener('click', () => {
  document.getElementById('result-modal').classList.add('hidden');
  currentRound++;
  if (currentRound >= gameLocations.length) {
    alert(`Hoàn thành! Tổng điểm của bạn: ${totalScore} / ${gameLocations.length * 5000}`);
    startGame();
  } else {
    loadRound();
  }
});

startGame();
