const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Path file database permanen
const DB_FILE = path.join(__dirname, 'database.json');

// Fungsi untuk membaca data dari database.json
function loadDatabase() {
    if (!fs.existsSync(DB_FILE)) {
        // Data default jika file belum ada
        const defaultData = {
            users: [
                { username: 'owner', password: '123', role: 'owner' }
            ],
            videos: [
                { 
                    id: 1, 
                    title: "Upin & Ipin Musim Terbaru", 
                    description: "Koleksi episode seru petualangan Upin dan Ipin di Kampung Durian Runtuh.", 
                    category: "Animasi", 
                    thumbnail: "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=600&q=80",
                    likes: 25, 
                    comments: [],
                    episodes: [
                        { epNum: 1, title: "Episode 1", src: "uiegc6m9x2" }
                    ]
                }
            ]
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
}

// Fungsi untuk menyimpan data ke database.json
function saveDatabase(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Route: Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const db = loadDatabase();
    const foundUser = db.users.find(u => u.username === username && u.password === password);

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

    const db = loadDatabase();
    if (db.users.some(u => u.username === newUsername)) {
        return res.status(400).json({ success: false, message: "Username sudah digunakan!" });
    }

    db.users.push({ username: newUsername, password: newPassword, role: 'admin' });
    saveDatabase(db);
    res.json({ success: true, message: `Akun Admin '${newUsername}' berhasil dibuat!` });
});

// Route: Ambil Semua Video
app.get('/api/videos', (req, res) => {
    const db = loadDatabase();
    res.json(db.videos);
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
        
        // Format otomatis YouTube
        if (videoSrc.includes('youtube.com/watch?v=')) {
            const videoId = videoSrc.split('v=')[1]?.split('&')[0];
            if (videoId) videoSrc = `https://www.youtube.com/embed/${videoId}`;
        } else if (videoSrc.includes('youtu.be/')) {
            const videoId = videoSrc.split('youtu.be/')[1]?.split('?')[0];
            if (videoId) videoSrc = `https://www.youtube.com/embed/${videoId}`;
        } 
        // Format otomatis Wistia
        else if (videoSrc.includes('wistia.com')) {
            const parts = videoSrc.split('/');
            const wistiaId = parts[parts.length - 1].split('?')[0];
            if (wistiaId) {
                videoSrc = wistiaId;
            }
        }

        return {
            epNum: index + 1,
            title: `Episode ${index + 1}`,
            src: videoSrc
        };
    });

    const db = loadDatabase();

    // Jika ada ID, lakukan EDIT
    if (id) {
        const index = db.videos.findIndex(v => v.id === parseInt(id));
        if (index !== -1) {
            db.videos[index].title = title;
            db.videos[index].category = category || "Animasi";
            db.videos[index].description = description || "";
            db.videos[index].thumbnail = thumbnail || db.videos[index].thumbnail;
            db.videos[index].episodes = formattedEpisodes;
            saveDatabase(db);
            return res.json({ success: true, video: db.videos[index] });
        }
    }

    // Jika tidak ada ID, TAMBAH BARU
    const newVideo = {
        id: db.videos.length > 0 ? db.videos[db.videos.length - 1].id + 1 : 1,
        title: title,
        category: category || "Animasi",
        description: description || "",
        thumbnail: thumbnail || "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=600&q=80",
        likes: 0,
        comments: [],
        episodes: formattedEpisodes
    };

    db.videos.push(newVideo);
    saveDatabase(db);
    res.json({ success: true, video: newVideo });
});

// Route: Hapus Video
app.delete('/api/videos/:id', (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== 'token-sesi-aman-999') {
        return res.status(403).json({ success: false, message: "Akses ditolak!" });
    }

    const id = parseInt(req.params.id);
    const db = loadDatabase();
    db.videos = db.videos.filter(v => v.id !== id);
    saveDatabase(db);
    res.json({ success: true, message: "Series berhasil dihapus" });
});

app.listen(PORT, () => {
    console.log(`Server NOVI aktif di port ${PORT}`);
});