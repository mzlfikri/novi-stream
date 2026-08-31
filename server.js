const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database memori sementara yang stabil dan anti-error di server cloud
let videos = [
    { 
        id: 1, 
        title: "Video Contoh Pertama", 
        src: "https://www.w3schools.com/html/mov_bbb.mp4", 
        description: "Selamat datang di platform streaming NOVI!", 
        category: "Drama", 
        badge: "HD", 
        likes: 0, 
        comments: [] 
    }
];

// Route: Ambil Semua Video
app.get('/api/videos', (req, res) => {
    res.json(videos);
});

// Route: Login Admin (Otomatis Sukses Tanpa Ribet Password)
app.post('/api/login', (req, res) => {
    res.json({ success: true, message: "Login Berhasil!" });
});

// Route: Tambah Video via Link URL (Solusi agar tidak pernah gagal upload)
app.post('/api/upload', (req, res) => {
    const { title, category, badge, description, src, thumbnail } = req.body;
    
    if (!src) {
        return res.status(400).json({ success: false, message: "Link video wajib diisi!" });
    }

    const newVideo = {
        id: videos.length > 0 ? videos[videos.length - 1].id + 1 : 1,
        title: title || "Tanpa Judul",
        category: category || "Drama",
        badge: badge || "HD",
        description: description || "",
        src: src,
        thumbnail: thumbnail || "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=600&q=80",
        likes: 0,
        comments: []
    };

    videos.push(newVideo);
    res.json({ success: true, video: newVideo });
});

// Route: Hapus Video
app.delete('/api/videos/:id', (req, res) => {
    const id = parseInt(req.params.id);
    videos = videos.filter(v => v.id !== id);
    res.json({ success: true, message: "Video berhasil dihapus" });
});

app.listen(PORT, () => {
    console.log(`Server NOVI aktif di port ${PORT}`);
});