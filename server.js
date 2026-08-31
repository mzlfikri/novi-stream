const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database memori sementara
let videos = [
    { 
        id: 1, 
        title: "Upin & Ipin Pilihan", 
        src: "https://www.youtube.com/embed/5qap5aO4i9A", // Contoh link embed YouTube
        description: "Nonton keseruan Upin & Ipin di platform NOVI!", 
        category: "Animasi", 
        badge: "HD", 
        likes: 12, 
        comments: [{ text: "Seru banget kartunnya!", date: "31/08/2026" }] 
    }
];

// Route: Ambil Semua Video
app.get('/api/videos', (req, res) => {
    res.json(videos);
});

// Route: Login Admin
app.post('/api/login', (req, res) => {
    res.json({ success: true, message: "Login Berhasil!" });
});

// Route: Tambah Video (Mendukung Link YouTube & Link MP4)
app.post('/api/upload', (req, res) => {
    let { title, category, badge, description, src, thumbnail } = req.body;
    
    if (!src) {
        return res.status(400).json({ success: false, message: "Link video wajib diisi!" });
    }

    // Ubah otomatis link YouTube biasa (watch?v=) menjadi link embed agar bisa diputar
    if (src.includes('youtube.com/watch?v=')) {
        const videoId = src.split('v=')[1]?.split('&')[0];
        if (videoId) {
            src = `https://www.youtube.com/embed/${videoId}`;
            if (!thumbnail) {
                thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            }
        }
    } else if (src.includes('youtu.be/')) {
        const videoId = src.split('youtu.be/')[1]?.split('?')[0];
        if (videoId) {
            src = `https://www.youtube.com/embed/${videoId}`;
            if (!thumbnail) {
                thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            }
        }
    }

    const newVideo = {
        id: videos.length > 0 ? videos[videos.length - 1].id + 1 : 1,
        title: title || "Tanpa Judul",
        category: category || "Animasi",
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