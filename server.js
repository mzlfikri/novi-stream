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

// Database JSON untuk menyimpan data video secara permanen di server
const dbFile = path.join(__dirname, 'videos.json');

function getVideos() {
    if (!fs.existsSync(dbFile)) {
        const initialVideos = [
            { 
                id: 1, 
                title: "Video Contoh Pertama", 
                filename: "sample.mp4", 
                src: "/uploads/sample.mp4",
                description: "Selamat datang di NOVI Stream!", 
                category: "Drama", 
                badge: "HD", 
                likes: 5, 
                comments: [{ text: "Keren banget!", date: "31/08/2026" }] 
            }
        ];
        fs.writeFileSync(dbFile, JSON.stringify(initialVideos, null, 2));
        return initialVideos;
    }
    const data = fs.readFileSync(dbFile, 'utf8');
    return JSON.parse(data);
}

function saveVideos(videos) {
    fs.writeFileSync(dbFile, JSON.stringify(videos, null, 2));
}

// Konfigurasi Multer untuk Video dan Thumbnail
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

// Password Admin diatur "123456"
const ADMIN_PASS = "123456";

// Route: Ambil Semua Video
app.get('/api/videos', (req, res) => {
    const videos = getVideos();
    res.json(videos);
});

// Route: Login Admin
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASS) {
        res.json({ success: true, message: "Login berhasil!" });
    } else {
        res.status(401).json({ success: false, message: "Password salah!" });
    }
});

// Route: Upload Video & Thumbnail
app.post('/api/upload', upload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), (req, res) => {
    if (!req.files || !req.files.video) {
        return res.status(400).json({ success: false, message: "File video wajib di-upload!" });
    }

    const videoFile = req.files.video[0];
    const thumbFile = req.files.thumbnail ? req.files.thumbnail[0] : null;

    const videos = getVideos();
    const newVideo = {
        id: videos.length > 0 ? videos[videos.length - 1].id + 1 : 1,
        title: req.body.title || "Tanpa Judul",
        category: req.body.category || "Drama",
        badge: req.body.badge || "HD",
        description: req.body.description || "",
        filename: videoFile.filename,
        src: `/uploads/${videoFile.filename}`,
        thumbnail: thumbFile ? `/uploads/${thumbFile.filename}` : null,
        likes: 0,
        comments: []
    };

    videos.push(newVideo);
    saveVideos(videos);
    res.json({ success: true, video: newVideo });
});

// Route: Like Video
app.post('/api/videos/:filename/like', (req, res) => {
    const videos = getVideos();
    const video = videos.find(v => v.filename === req.params.filename);
    if (video) {
        video.likes = (video.likes || 0) + 1;
        saveVideos(videos);
        res.json({ success: true, likes: video.likes });
    } else {
        res.status(404).json({ success: false, message: "Video tidak ditemukan" });
    }
});

// Route: Komentar Video
app.post('/api/videos/:filename/comment', (req, res) => {
    const { text } = req.body;
    const videos = getVideos();
    const video = videos.find(v => v.filename === req.params.filename);
    if (video && text) {
        if (!video.comments) video.comments = [];
        const newComment = {
            text,
            date: new Date().toLocaleDateString('id-ID')
        };
        video.comments.push(newComment);
        saveVideos(videos);
        res.json({ success: true, comments: video.comments });
    } else {
        res.status(404).json({ success: false, message: "Gagal menambah komentar" });
    }
});

// Route: Hapus Video (Admin)
app.delete('/api/videos/:filename', (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== ADMIN_PASS) {
        return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    let videos = getVideos();
    const video = videos.find(v => v.filename === req.params.filename);
    if (video) {
        const videoPath = path.join(uploadDir, video.filename);
        if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
        
        videos = videos.filter(v => v.filename !== req.params.filename);
        saveVideos(videos);
        res.json({ success: true, message: "Video berhasil dihapus" });
    } else {
        res.status(404).json({ success: false, message: "Video tidak ditemukan" });
    }
});

app.listen(PORT, () => {
    console.log(`Server NOVI berjalan di port ${PORT}`);
});