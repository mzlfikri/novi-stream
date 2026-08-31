const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Akun (Default Owner utama)
let users = [
    { username: 'owner', password: '123', role: 'owner' }
];

// Database Video & Series
let videos = [
    { 
        id: 1, 
        title: "Upin & Ipin Musim Terbaru", 
        description: "Koleksi episode seru petualangan Upin dan Ipin di Kampung Durian Runtuh.", 
        category: "Animasi", 
        thumbnail: "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=600&q=80",
        likes: 25, 
        comments: [],
        episodes: [
            { epNum: 1, title: "Episode 1", src: "https://www.youtube.com/embed/5qap5aO4i9A" }
        ]
    }
];

// Route: Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const foundUser = users.find(u => u.username === username && u.password === password);

    if (foundUser) {
        res.json({ 
            success: true, 
            role: foundUser.role, 
            token: "token-sesi-aman-999", 
            message: "Login Berhasil!" 
        });
    } else {
        res.status(401).json({ success: false, message: "Username atau Password salah!" });
    }
});

// Route: Buat Admin Baru (Khusus Owner)
app.post('/api/create-admin', (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== 'token-sesi-aman-999') {
        return res.status(403).json({ success: false, message: "Akses ditolak!" });
    }

    const { newUsername, newPassword } = req.body;
    if (!newUsername || !newPassword) {
        return res.status(400).json({ success: false, message: "Username dan password wajib diisi!" });
    }

    if (users.some(u => u.username === newUsername)) {
        return res.status(400).json({ success: false, message: "Username sudah digunakan!" });
    }

    users.push({ username: newUsername, password: newPassword, role: 'admin' });
    res.json({ success: true, message: `Akun Admin '${newUsername}' berhasil dibuat!` });
});

// Route: Ambil Semua Video
app.get('/api/videos', (req, res) => {
    res.json(videos);
});

// Route: Tambah atau Update (Edit) Series
app.post('/api/upload', (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== 'token-sesi-aman-999') {
        return res.status(403).json({ success: false, message: "Akses ditolak!" });
    }

    let { id, title, category, description, thumbnail, episodes } = req.body;
    
    if (!title || !episodes || !Array.isArray(episodes) || episodes.length === 0) {
        return res.status(400).json({ success: false, message: "Judul dan minimal 1 episode wajib diisi!" });
    }

    const formattedEpisodes = episodes.map((ep, index) => {
        let videoSrc = ep && ep.src ? ep.src.trim() : '';
        
        if (videoSrc.includes('youtube.com/watch?v=')) {
            const videoId = videoSrc.split('v=')[1]?.split('&')[0];
            if (videoId) videoSrc = `https://www.youtube.com/embed/${videoId}`;
        } else if (videoSrc.includes('youtu.be/')) {
            const videoId = videoSrc.split('youtu.be/')[1]?.split('?')[0];
            if (videoId) videoSrc = `https://www.youtube.com/embed/${videoId}`;
        }

        return {
            epNum: index + 1,
            title: `Episode ${index + 1}`,
            src: videoSrc
        };
    });

    // Jika ada ID, berarti ini adalah proses EDIT (Memperbarui data lama)
    if (id) {
        const index = videos.findIndex(v => v.id === parseInt(id));
        if (index !== -1) {
            videos[index].title = title;
            videos[index].category = category || "Animasi";
            videos[index].description = description || "";
            videos[index].thumbnail = thumbnail || videos[index].thumbnail;
            videos[index].episodes = formattedEpisodes;
            return res.json({ success: true, video: videos[index] });
        }
    }

    // Jika tidak ada ID, berarti ini TAMBAH BARU (Upload)
    const newVideo = {
        id: videos.length > 0 ? videos[videos.length - 1].id + 1 : 1,
        title: title,
        category: category || "Animasi",
        description: description || "",
        thumbnail: thumbnail || "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=600&q=80",
        likes: 0,
        comments: [],
        episodes: formattedEpisodes
    };

    videos.push(newVideo);
    res.json({ success: true, video: newVideo });
});

// Route: Hapus Video
app.delete('/api/videos/:id', (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== 'token-sesi-aman-999') {
        return res.status(403).json({ success: false, message: "Akses ditolak!" });
    }

    const id = parseInt(req.params.id);
    videos = videos.filter(v => v.id !== id);
    res.json({ success: true, message: "Series berhasil dihapus" });
});

app.listen(PORT, () => {
    console.log(`Server NOVI aktif di port ${PORT}`);
});