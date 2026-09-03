const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Fungsi helper baca/tulis data database lokal
function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initial = {
      videos: [],
      admins: [{ username: 'owner', password: '123', role: 'owner' }]
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// 1. API Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const db = readData();
  const admin = db.admins.find(a => a.username === username && a.password === password);
  
  if (admin) {
    res.json({ success: true, role: admin.role });
  } else {
    res.status(401).json({ success: false, message: 'Username atau password salah!' });
  }
});

// 2. API Buat Admin Baru (Khusus Owner)
app.post('/api/create-admin', (req, res) => {
  const { newUsername, newPassword } = req.body;
  const db = readData();
  
  if (db.admins.some(a => a.username === newUsername)) {
    return res.status(400).json({ success: false, message: 'Username sudah digunakan!' });
  }

  db.admins.push({ username: newUsername, password: newPassword, role: 'admin' });
  saveData(db);
  res.json({ success: true, message: `Akun admin ${newUsername} berhasil dibuat!` });
});

// 3. API Ambil Semua Video
app.get('/api/videos', (req, res) => {
  const db = readData();
  res.json(db.videos);
});

// 4. API Upload / Edit Konten
app.post('/api/upload', (req, res) => {
  const { id, type, title, category, description, thumbnail, episodes } = req.body;
  const db = readData();

  if (id) {
    // Mode Edit
    const index = db.videos.findIndex(v => String(v.id) === String(id));
    if (index !== -1) {
      db.videos[index] = {
        ...db.videos[index],
        type: type || 'film',
        title,
        category: category || 'Animasi',
        description,
        thumbnail: thumbnail || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80',
        episodes: episodes || []
      };
      saveData(db);
      return res.json({ success: true, message: 'Konten berhasil diperbarui!' });
    }
  }

  // Mode Tambah Baru
  const newVideo = {
    id: Date.now().toString(),
    type: type || 'film',
    title,
    category: category || 'Animasi',
    description,
    thumbnail: thumbnail || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80',
    episodes: episodes || [],
    views: 0,
    likes: 0,
    comments: []
  };

  db.videos.unshift(newVideo);
  saveData(db);
  res.json({ success: true, message: 'Konten berhasil ditambahkan!' });
});

// 5. API Hapus Video Satuan
app.delete('/api/videos/:id', (req, res) => {
  const { id } = req.params;
  const db = readData();
  db.videos = db.videos.filter(v => String(v.id) !== String(id));
  saveData(db);
  res.json({ success: true });
});

// 6. API Hapus Video Massal (Bulk Delete)
app.post('/api/videos/bulk-delete', (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ success: false, message: 'ID tidak valid' });
  }
  const db = readData();
  db.videos = db.videos.filter(v => !ids.includes(String(v.id)));
  saveData(db);
  res.json({ success: true, message: `Berhasil menghapus ${ids.length} konten terpilih!` });
});

// 7. API Tambah View
app.post('/api/videos/:id/view', (req, res) => {
  const { id } = req.params;
  const db = readData();
  const v = db.videos.find(item => String(item.id) === String(id));
  if (v) {
    v.views = (v.views || 0) + 1;
    saveData(db);
    res.json({ success: true, views: v.views });
  } else {
    res.status(404).json({ success: false });
  }
});

// 8. API Like Video
app.post('/api/videos/:id/like', (req, res) => {
  const { id } = req.params;
  const db = readData();
  const v = db.videos.find(item => String(item.id) === String(id));
  if (v) {
    v.likes = (v.likes || 0) + 1;
    saveData(db);
    res.json({ success: true, likes: v.likes });
  } else {
    res.status(404).json({ success: false });
  }
});

// 9. API Komentar Video
app.post('/api/videos/:id/comment', (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  const db = readData();
  const v = db.videos.find(item => String(item.id) === String(id));
  if (v) {
    if (!v.comments) v.comments = [];
    const newComment = {
      text,
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    };
    v.comments.unshift(newComment);
    saveData(db);
    res.json({ success: true, comments: v.comments });
  } else {
    res.status(404).json({ success: false });
  }
});

// 10. API Import M3U Playlist
app.post('/api/import-m3u', (req, res) => {
  const { channels } = req.body;
  if (!channels || !Array.isArray(channels)) {
    return res.status(400).json({ success: false, message: 'Data channel M3U tidak valid.' });
  }

  const db = readData();
  let count = 0;

  channels.forEach(ch => {
    const newChannel = {
      id: 'm3u_' + Date.now() + '_' + Math.random().toString(36.substring(2, 7)),
      type: 'tv',
      title: ch.title || 'Live Channel',
      category: ch.category || 'Live TV',
      description: 'Siaran langsung dari import playlist M3U',
      thumbnail: ch.thumbnail || 'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=800&q=80',
      episodes: [{ title: 'Live Stream', src: ch.url }],
      views: 0,
      likes: 0,
      comments: []
    };
    db.videos.unshift(newChannel);
    count++;
  });

  saveData(db);
  res.json({ success: true, message: `Berhasil mengimport ${count} channel siaran TV!` });
});

// 11. API PROXY STREAM (Untuk mengatasi masalah CORS / loading link m3u8 worker)
app.get('/api/proxy-stream', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send('URL parameter is missing');
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.google.com/'
      }
    });

    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch stream source');
    }

    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));

  } catch (error) {
    console.error('Proxy stream error:', error);
    res.status(500).send('Internal Server Error while proxying stream');
  }
});

app.listen(PORT, () => {
  console.log(`Server NOVI berjalan di port ${PORT}`);
});