const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Pastikan folder uploads dan public ada (Error prevention)
const uploadDir = path.join(__dirname, 'public', 'uploads');
try {
    if (!fs.existsSync(uploadDir)){
        fs.mkdirSync(uploadDir, { recursive: true });
    }
} catch (err) {
    console.error("Gagal membuat direktori upload:", err);
}

// 2. Database JSON permanen untuk video
const dbFile = path.join(__dirname, 'videos.json');

function getVideos() {
    try {
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
    } catch (err) {
        console.error("Error membaca database JSON:", err);
        return [];
    }
}

function saveVideos(videos) {
    try {
        fs.writeFileSync(dbFile, JSON.stringify(videos, null, 2));
    } catch (err) {
        console.error("Error menyimpan database JSON:", err);
    }
}

// 3. Konfigurasi Multer dengan Error Handling untuk File Video & Gambar
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // Batas maksimal file 100MB
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'video') {
            if (file.mimetype.startsWith('video/')) {
                cb(null, true);
            } else {
                cb(new Error('Hanya file video yang diperbolehkan!'), false);
            }
        } else if (file.fieldname === 'thumbnail') {
            if (file.mimetype.startsWith('image/')) {
                cb(null, true);
            } else {
                cb(new Error('Hanya file gambar yang diperbolehkan untuk thumbnail!'), false);
            }
        } else {
            cb(null, true);
        }
    }
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Kredensial Admin
const ADMIN_USER = "admin";
const ADMIN_PASS = "123456";

// --- RUTE API DENGAN ERROR HANDLING ---

// Route: Ambil Semua Video
app.get('/api/videos', (req, res, next) => {
    try {
        const videos = getVideos();
        res.json(videos);
    } catch (err) {
        next(err);
    }
});

// Route: Login Admin (Username & Password)
app.post('/api/login', (req, res, next) => {
    try {
        const { username, password } = req.body;
        if (username === ADMIN_USER && password === ADMIN_PASS) {
            res.json({ success: true, message: "Login berhasil!" });
        } else {
            res.status(401).json({ success: false, message: "Username atau Password salah!" });
        }
    } catch (err) {
        next(err);
    }
});

// Route: Upload Video & Thumbnail dengan Middleware Multer
app.post('/api/upload', (req, res, next) => {
    upload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }])(req, res, (err) => {
        if (err) {
            // Tangkap error dari Multer (misal file terlalu besar atau format salah)
            return res.status(400).json({ success: false, message: err.message });
        }

        try {
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
        } catch (serverErr) {
            next(serverErr);
        }
    });
});

// Route: Like Video
app.post('/api/videos/:filename/like', (req, res, next) => {
    try {
        const videos = getVideos();
        const video = videos.find(v => v.filename === req.params.filename);
        if (!video) {
            return res.status(404).json({ success: false, message: "Video tidak ditemukan" });
        }
        video.likes = (video.likes || 0) + 1;
        saveVideos(videos);
        res.json({ success: true, likes: video.likes });
    } catch (err) {
        next(err);
    }
});

// Route: Komentar Video
app.post('/api/videos/:filename/comment', (req, res, next) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ success: false, message: "Komentar tidak boleh kosong" });
        }
        const videos = getVideos();
        const video = videos.find(v => v.filename === req.params.filename);
        if (!video) {
            return res.status(404).json({ success: false, message: "Video tidak ditemukan" });
        }

        if (!video.comments) video.comments = [];
        const newComment = {
            text,
            date: new Date().toLocaleDateString('id-ID')
        };
        video.comments.push(newComment);
        saveVideos(videos);
        res.json({ success: true, comments: video.comments });
    } catch (err) {
        next(err);
    }
});

// Route: Hapus Video (Admin)
app.delete('/api/videos/:filename', (req, res, next) => {
    try {
        const adminKey = req.headers['x-admin-key'];
        if (adminKey !== ADMIN_PASS) {
            return res.status(403).json({ success: false, message: "Unauthorized: Akses ditolak" });
        }

        let videos = getVideos();
        const video = videos.find(v => v.filename === req.params.filename);
        if (!video) {
            return res.status(404).json({ success: false, message: "Video tidak ditemukan" });
        }

        // Hapus file fisik video jika ada
        const videoPath = path.join(uploadDir, video.filename);
        if (fs.existsSync(videoPath)) {
            fs.unlinkSync(videoPath);
        }
        
        videos = videos.filter(v => v.filename !== req.params.filename);
        saveVideos(videos);
        res.json({ success: true, message: "Video berhasil dihapus" });
    } catch (err) {
        next(err);
    }
});

// --- ERROR HANDLING MIDDLEWARE ---

// 404 Handler (Jika rute API tidak ditemukan)
app.use((req, res) => {
    res.status(404).json({ success: false, message: "Endpoint atau halaman tidak ditemukan!" });
});

// Global Error Handler (Menjaga agar server tidak crash/mati total)
app.use((err, req, res, next) => {
    console.error("Terjadi Kesalahan Server:", err.stack);
    res.status(500).json({ 
        success: false, 
        message: "Terjadi kesalahan internal pada server!", 
        error: err.message 
    });
});

app.listen(PORT, () => {
    console.log(`Server NOVI berjalan di port ${PORT} dengan Error Handler aktif`);
});