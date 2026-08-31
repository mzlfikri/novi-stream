const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Pastikan folder uploads dan public ada
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

// File database JSON untuk menyimpan daftar video secara permanen di server
const dbFile = path.join(__dirname, 'videos.json');

// Fungsi untuk membaca data video
function getVideos() {
    if (!fs.existsSync(dbFile)) {
        const initialVideos = [
            { id: 1, title: "Video Contoh Pertama", filename: "sample.mp4", description: "Selamat datang di NOVI Stream!" }
        ];
        fs.writeFileSync(dbFile, JSON.stringify(initialVideos, null, 2));
        return initialVideos;
    }
    const data = fs.readFileSync(dbFile, 'utf8');
    return JSON.parse(data);
}

// Fungsi untuk menyimpan data video
function saveVideos(videos) {
    fs.writeFileSync(dbFile, JSON.stringify(videos, null, 2));
}

// Konfigurasi Multer untuk Upload Video
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Data Admin
const ADMIN_USER = "admin";
const ADMIN_PASS = "novi123";

// Route: Halaman Utama (Menampilkan daftar video)
app.get('/api/videos', (req, res) => {
    const videos = getVideos();
    res.json(videos);
});

// Route: Login Admin
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        res.json({ success: true, message: "Login berhasil!" });
    } else {
        res.status(401).json({ success: false, message: "Username atau Password salah!" });
    }
});

// Route: Upload Video (Khusus Admin)
app.post('/api/upload', upload.single('video'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: "Tidak ada file video yang di-upload!" });
    }
    
    const videos = getVideos();
    const newVideo = {
        id: videos.length > 0 ? videos[videos.length - 1].id + 1 : 1,
        title: req.body.title || "Video Tanpa Judul",
        filename: req.file.filename,
        description: req.body.description || ""
    };
    
    videos.push(newVideo);
    saveVideos(videos); // Simpan ke file JSON permanen
    
    res.json({ success: true, message: "Video berhasil di-upload!", video: newVideo });
});

app.listen(PORT, () => {
    console.log(`Server NOVI berjalan di port ${PORT}`);
});