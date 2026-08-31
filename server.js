const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Pastikan folder uploads dan public ada agar tidak error
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
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

// Simulasi Database Sederhana untuk Menyimpan Daftar Video & Akun
let videos = [
    { id: 1, title: "Video Contoh Pertama", filename: "sample.mp4", description: "Selamat datang di NOVI Stream!" }
];

// Data Admin (Bisa diubah di sini)
const ADMIN_USER = "admin";
const ADMIN_PASS = "novi123";

// Route: Halaman Utama (Menampilkan daftar video)
app.get('/api/videos', (req, res) => {
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
    
    const newVideo = {
        id: videos.length + 1,
        title: req.body.title || "Video Tanpa Judul",
        filename: req.file.filename,
        description: req.body.description || ""
    };
    
    videos.push(newVideo);
    res.json({ success: true, message: "Video berhasil di-upload!", video: newVideo });
});

app.listen(PORT, () => {
    console.log(`Server NOVI berjalan di port ${PORT}`);
});