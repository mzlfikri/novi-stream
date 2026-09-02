const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(express.static('public'));

const uploadDir = path.join(__dirname, 'uploads');
const metadataFile = path.join(__dirname, 'metadata.json');
const adminsFile = path.join(__dirname, 'admins.json');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

function loadMetadata() {
  try {
    if (fs.existsSync(metadataFile)) {
      const data = fs.readFileSync(metadataFile, 'utf8');
      const parsed = data ? JSON.parse(data) : [];
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) {
    console.error("Gagal membaca metadata.json:", e);
  }
  return [];
}

function saveMetadata(videosArray) {
  try {
    fs.writeFileSync(metadataFile, JSON.stringify(videosArray, null, 2));
  } catch (e) {
    console.error("Gagal menyimpan ke metadata.json:", e);
  }
}

function loadAdmins() {
  try {
    if (fs.existsSync(adminsFile)) {
      const data = fs.readFileSync(adminsFile, 'utf8');
      const parsed = data ? JSON.parse(data) : [];
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) {
    console.error("Gagal membaca admins.json:", e);
  }
  return [];
}

function saveAdmins(adminsArray) {
  try {
    fs.writeFileSync(adminsFile, JSON.stringify(adminsArray, null, 2));
  } catch (e) {
    console.error("Gagal menyimpan ke admins.json:", e);
  }
}

app.get('/api/videos', (req, res) => {
  const videos = loadMetadata();
  res.json(videos);
});

// Tambah / Edit Konten Multi-Episode
app.post('/api/upload', (req, res) => {
  try {
    let videos = loadMetadata();
    const { id, type, title, category, description, thumbnail, episodes } = req.body;
    
    if (!title || !episodes || !Array.isArray(episodes) || episodes.length === 0) {
      return res.status(400).json({ success: false, message: 'Judul dan minimal 1 link episode wajib diisi!' });
    }

    if (id) {
      const index = videos.findIndex(v => String(v.id) === String(id));
      if (index !== -1) {
        videos[index].title = title;
        videos[index].type = type || 'film';
        videos[index].category = category || 'Umum';
        videos[index].description = description || '';
        videos[index].thumbnail = thumbnail || videos[index].thumbnail;
        videos[index].episodes = episodes;
        saveMetadata(videos);
        return res.json({ success: true, message: 'Konten berhasil diperbarui!' });
      }
    }

    const newVideo = {
      id: Date.now(),
      type: type || 'film',
      title,
      category: category || 'Umum',
      description: description || '',
      thumbnail: thumbnail || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=600&q=80',
      episodes: episodes, // Menyimpan array list episode (Eps 1, Eps 2, dst)
      views: 0,
      likes: 0,
      comments: []
    };

    videos.unshift(newVideo);
    saveMetadata(videos);
    res.json({ success: true, message: 'Konten berhasil ditambahkan!' });
  } catch (err) {
    console.error("Error pada /api/upload:", err);
    res.status(500).json({ success: false, message: 'Kesalahan server saat menyimpan: ' + err.message });
  }
});

// Import Playlist M3U via File Upload
app.post('/api/import-m3u', (req, res) => {
  try {
    let videos = loadMetadata();
    const { channels } = req.body;
    if (!channels || !Array.isArray(channels) || channels.length === 0) {
      return res.status(400).json({ success: false, message: 'File M3U kosong atau format tidak valid.' });
    }

    let addedCount = 0;
    channels.forEach(ch => {
      const newVideo = {
        id: Date.now() + Math.random(),
        type: 'tv',
        title: ch.title || 'Live Channel',
        category: ch.category || 'Live TV',
        description: 'Imported via M3U File Playlist',
        thumbnail: ch.thumbnail || 'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=400&q=80',
        episodes: [{ title: 'Live Stream', src: ch.url }],
        views: 0,
        likes: 0,
        comments: []
      };
      videos.unshift(newVideo);
      addedCount++;
    });

    saveMetadata(videos);
    res.json({ success: true, message: `Berhasil mengimport ${addedCount} channel siaran TV dari file!` });
  } catch (err) {
    console.error("Error pada /api/import-m3u:", err);
    res.status(500).json({ success: false, message: 'Gagal memproses file M3U di server: ' + err.message });
  }
});

// Hapus Konten Satuan
app.delete('/api/videos/:id', (req, res) => {
  let videos = loadMetadata();
  const id = req.params.id;
  videos = videos.filter(v => String(v.id) !== String(id));
  saveMetadata(videos);
  res.json({ success: true, message: 'Konten dihapus.' });
});

// Hapus Banyak Sekaligus (Bulk Delete)
app.post('/api/videos/bulk-delete', (req, res) => {
  try {
    let videos = loadMetadata();
    const { ids } = req.body; 
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Tidak ada data yang dipilih untuk dihapus.' });
    }

    const stringIds = ids.map(id => String(id));
    videos = videos.filter(v => !stringIds.includes(String(v.id)));
    
    saveMetadata(videos);
    res.json({ success: true, message: `Berhasil menghapus ${ids.length} konten terpilih!` });
  } catch (err) {
    console.error("Error pada bulk-delete:", err);
    res.status(500).json({ success: false, message: 'Gagal menghapus data secara massal.' });
  }
});

app.post('/api/videos/:id/view', (req, res) => {
  let videos = loadMetadata();
  const v = videos.find(item => String(item.id) === String(req.params.id));
  if (v) {
    v.views = (v.views || 0) + 1;
    saveMetadata(videos);
  }
  res.json({ success: true });
});

app.post('/api/videos/:id/like', (req, res) => {
  let videos = loadMetadata();
  const v = videos.find(item => String(item.id) === String(req.params.id));
  if (v) {
    v.likes = (v.likes || 0) + 1;
    saveMetadata(videos);
    res.json({ success: true, likes: v.likes });
  } else {
    res.status(404).json({ success: false });
  }
});

app.post('/api/videos/:id/comment', (req, res) => {
  let videos = loadMetadata();
  const v = videos.find(item => String(item.id) === String(req.params.id));
  const { text } = req.body;
  if (v && text) {
    if (!v.comments) v.comments = [];
    v.comments.push({ text, date: new Date().toLocaleDateString('id-ID') });
    saveMetadata(videos);
    res.json({ success: true, comments: v.comments });
  } else {
    res.status(400).json({ success: false });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === 'owner' && password === '123') {
    return res.json({ success: true, role: 'owner' });
  } 
  
  if (username === 'admin' && password === '123') {
    return res.json({ success: true, role: 'admin' });
  }

  const customAdmins = loadAdmins();
  const foundAdmin = customAdmins.find(a => a.username === username && a.password === password);
  if (foundAdmin) {
    return res.json({ success: true, role: 'admin' });
  }

  res.json({ success: false, message: 'Username atau Password salah!' });
});

app.post('/api/create-admin', (req, res) => {
  try {
    const { newUsername, newPassword } = req.body;
    if (!newUsername || !newPassword) {
      return res.status(400).json({ success: false, message: 'Username dan Password baru wajib diisi!' });
    }

    let customAdmins = loadAdmins();
    if (customAdmins.some(a => a.username === newUsername) || newUsername === 'owner') {
      return res.status(400).json({ success: false, message: 'Username sudah digunakan!' });
    }

    customAdmins.push({ username: newUsername, password: newPassword });
    saveAdmins(customAdmins);

    res.json({ success: true, message: `Akun admin baru "${newUsername}" berhasil dibuat!` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal membuat akun admin.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server NOVI berjalan di port ${PORT}`);
});