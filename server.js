const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const uploadDir = path.join(__dirname, 'uploads');
const metadataFile = path.join(__dirname, 'metadata.json');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Inisialisasi Database JSON sederhana
let videos = [];
if (fs.existsSync(metadataFile)) {
  try {
    const data = fs.readFileSync(metadataFile, 'utf8');
    videos = JSON.parse(data);
  } catch (e) {
    videos = [];
  }
}

function saveMetadata() {
  fs.writeFileSync(metadataFile, JSON.stringify(videos, null, 2));
}

// Ambil daftar video
app.get('/api/videos', (req, res) => {
  res.json(videos);
});

// Tambah / Edit Video Satuan
app.post('/api/upload', (req, res) => {
  try {
    const { id, type, title, category, description, thumbnail, videoUrl } = req.body;
    
    if (!title || !videoUrl) {
      return res.status(400).json({ success: false, message: 'Judul dan Link Video wajib diisi!' });
    }

    if (id) {
      // Edit video yang sudah ada
      const index = videos.findIndex(v => v.id == id);
      if (index !== -1) {
        videos[index].title = title;
        videos[index].type = type || 'film';
        videos[index].category = category || 'Umum';
        videos[index].description = description || '';
        videos[index].thumbnail = thumbnail || videos[index].thumbnail;
        videos[index].episodes = [{ src: videoUrl }];
        saveMetadata();
        return res.json({ success: true, message: 'Konten berhasil diperbarui!' });
      }
    }

    // Tambah video baru
    const newVideo = {
      id: Date.now(),
      type: type || 'film',
      title,
      category: category || 'Umum',
      description: description || '',
      thumbnail: thumbnail || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=600&q=80',
      episodes: [{ src: videoUrl }],
      views: 0,
      likes: 0,
      comments: []
    };

    videos.unshift(newVideo);
    saveMetadata();
    res.json({ success: true, message: 'Konten berhasil ditambahkan!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Kesalahan server saat menyimpan.' });
  }
});

// Import Playlist M3U secara Massal
app.post('/api/import-m3u', (req, res) => {
  try {
    const { channels } = req.body;
    if (!channels || !Array.isArray(channels) || channels.length === 0) {
      return res.status(400).json({ success: false, message: 'Tidak ada data channel yang valid.' });
    }

    let addedCount = 0;
    channels.forEach(ch => {
      const newVideo = {
        id: Date.now() + Math.random(),
        type: 'tv',
        title: ch.title || 'Live Channel',
        category: ch.category || 'Live TV',
        description: 'Imported via M3U Playlist',
        thumbnail: ch.thumbnail || 'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=400&q=80',
        episodes: [{ src: ch.url }],
        views: 0,
        likes: 0,
        comments: []
      };
      videos.unshift(newVideo);
      addedCount++;
    });

    saveMetadata();
    res.json({ success: true, message: `Berhasil mengimport ${addedCount} channel siaran TV!` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal memproses file M3U di server.' });
  }
});

// Hapus Video
app.delete('/api/videos/:id', (req, res) => {
  const id = req.params.id;
  videos = videos.filter(v => v.id != id);
  saveMetadata();
  res.json({ success: true, message: 'Konten dihapus.' });
});

// Tambah View
app.post('/api/videos/:id/view', (req, res) => {
  const v = videos.find(item => item.id == req.params.id);
  if (v) {
    v.views = (v.views || 0) + 1;
    saveMetadata();
  }
  res.json({ success: true });
});

// Like Video
app.post('/api/videos/:id/like', (req, res) => {
  const v = videos.find(item => item.id == req.params.id);
  if (v) {
    v.likes = (v.likes || 0) + 1;
    saveMetadata();
    res.json({ success: true, likes: v.likes });
  } else {
    res.status(404).json({ success: false });
  }
});

// Komentar
app.post('/api/videos/:id/comment', (req, res) => {
  const v = videos.find(item => item.id == req.params.id);
  const { text } = req.body;
  if (v && text) {
    if (!v.comments) v.comments = [];
    v.comments.push({ text, date: new Date().toLocaleDateString('id-ID') });
    saveMetadata();
    res.json({ success: true, comments: v.comments });
  } else {
    res.status(400).json({ success: false });
  }
});

// Login Admin Sederhana
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'owner' && password === '123') {
    res.json({ success: true, role: 'owner' });
  } else if (username === 'admin' && password === '123') {
    res.json({ success: true, role: 'admin' });
  } else {
    res.json({ success: false, message: 'Username atau Password salah!' });
  }
});

app.listen(PORT, () => {
  console.log(`Server NOVI berjalan di port ${PORT}`);
});