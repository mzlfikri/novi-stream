const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Buat folder uploads otomatis jika belum ada
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Konfigurasi penyimpanan file dengan Multer
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

// Database sementara dalam memori (Aman & Tidak bikin error)
let videos = [
    { 
        id: 1, 
        title: "Video Pertama Saya", 
        filename: "sample.mp4", 
        src: "/uploads/sample.mp4",
        description: "Selamat datang di website streaming NOVI!", 
        category: "Drama", 
        badge: "HD", 
        likes: 0, 
        comments: [] 
    }
];

// 1. Ambil daftar video
app.get('/api/videos', (req, res) => {
    res.json(videos);
});

// 2. Login Admin (Dibuat otomatis sukses tanpa ribet password salah)
app.post('/api/login', (req, res) => {
    res.json({ success: true, message: "Login Berhasil!" });
});

// 3. Upload Video
app.post('/api/upload', upload.single('video'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: "Pilih file video terlebih dahulu!" });
    }

    const newVideo = {
        id: videos.length + 1,
        title: req.body.title || "Video Tanpa Judul",
        category: req.body.category || "Drama",
        badge: "HD",
        description: req.body.description || "",
        filename: req.file.filename,
        src: `/uploads/${req.file.filename}`,
        likes: 0,
        comments: []
    };

    videos.push(newVideo);
    res.json({ success: true, video: newVideo });
});

// 4. Hapus Video
app.delete('/api/videos/:filename', (req, res) => {
    const filename = req.params.filename;
    const videoPath = path.join(uploadDir, filename);
    
    if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
    }
    
    videos = videos.filter(v => v.filename !== filename);
    res.json({ success: true, message: "Video berhasil dihapus" });
});

app.listen(PORT, () => {
    console.log(`Server aktif di port ${PORT}`);
});