// Express, sqlite, sessions, bcrypt... pretty typical stack here
const express = require('express');
const path = require('path');
const http = require('http');
const sqlite3 = require('sqlite3').verbose(); // verbose just in case we need debugging
const bcrypt = require('bcrypt');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);  // Socket.IO won't work without this
const io = new Server(server);

// handles file uploads — this is the config for Multer
const multer = require('multer');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'public', 'uploads')); // upload folder
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname); // preserve original extension
    cb(null, uniqueSuffix + ext); // e.g., "16823138793-.png"
  }
});

// we store images in public/uploads, so they can be directly accessed via the browser
const upload = multer({ storage });
// separate instance for multi-upload; still saves to same folder
const multiUpload = multer({ storage }); 

// still using sqlite - easy to set up, no config hell
const dbFile = path.join(__dirname, 'users.db');
const db = new sqlite3.Database(dbFile); // might need to manually init schema, TODO: check on deploy

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json()); // enables server to parse JSON bodies
app.use(cookieParser());
app.use(session({
  secret: 'wired_secret_key', // should probably move to .env but meh for now
  resave: false,
  saveUninitialized: false
}));

// View setup (EJS bc I already had it installed)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Just a temp in-memory room tracker - resets on restart
const roomUsers = {
  cyberia: new Set()
};

// === ROUTES ===

// serves the plain old register page
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

// login page, not much going on here
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// chatroom base route
app.get('/chatroom', (req, res) => {
  if (!req.session.username) {
    return res.redirect('/login');  // not logged in? back to login you go
  }
  res.sendFile(path.join(__dirname, 'views', 'chatroom.html'));
});

// dynamic route per room
app.get('/chatroom/:room', (req, res) => {
  if (!req.session.username) {
    return res.redirect('/login');  // again, guard route
  }

  const roomName = req.params.room;

  res.render('room', {
    username: req.session.username,
    room: roomName,
    userCount: roomUsers[roomName] ? roomUsers[roomName].size : 0  // could crash if room doesn't exist tho
  });
});

// settings page
app.get('/settings', (req, res) => {
  if (!req.session.username) return res.redirect('/login');

  const uname = req.session.username;

  db.get('SELECT * FROM user_settings WHERE username = ?', [uname], (err, row) => {
    if (err) {
      console.error('settings lookup error:', err);
      return res.status(500).send('server error');
    }

    res.render('settings', {
      username: uname,
      alias: row?.alias || 'anonymous',
      theme: row?.theme || 'purple-cybercore',
      description: row?.description || 'No matter where you go, everybody\'s connected',
      directory: row?.directory || '/home/user/downloads',
      avatar: row?.avatarPath || '/lain.jpg',
      imageList: row?.imageList ? JSON.parse(row.imageList) : []
    });
  });
});

// defines the GET route for the user profile page
app.get('/profile', (req, res) => {
  // not logged in? boot them to login
  if (!req.session.username) return res.redirect('/login');

  const uname = req.session.username; // grab logged-in username from session

  // get all the saved settings for the current user
  db.get('SELECT * FROM user_settings WHERE username = ?', [uname], (err, row) => {
    if (err) {
      // database stopped working
      console.error('profile lookup error:', err);
      return res.status(500).send('server error'); // basic error return
    }

    // theme to background file mapping
    const themeFileMap = {
        'purple-cybercore': 'cybercore.png',
        'vaporwave': 'vaporwave.jpg',
        'frutiger-aero': 'aero.png',
        'ethereal-gothic': 'gothic.png' // optional default for the ethereal gothic one
    };
    
    const bgFile = themeFileMap[row?.theme] || 'cybercore.png'; // fallback to cybercore  

    res.render('profile', {
        username: uname,
        alias: row?.alias || 'anonymous',
        theme: row?.theme || 'purple-cybercore',
        description: row?.description || '',
        avatar: row?.avatarPath || '/lain.jpg',
        imageList: row?.imageList ? JSON.parse(row.imageList) : [],
        bgImage: bgFile // 🆕
      });      
  });
});

// === REGISTRATION ===
app.post('/register', async (req, res) => {
  const { username, password, confirmPassword } = req.body;

  // quick validation
  if (!username || !password || password !== confirmPassword) {
    return res.status(400).send('Passwords don’t match or missing fields.');
  }

  if (username.length > 32 || password.length < 8 || password.length > 64 || !/\d/.test(password)) {
    return res.status(400).send('Weak password or bad username.');
  }

  try {
    const u = username.toLowerCase();
    const hashedPw = await bcrypt.hash(password, 10);  // bcrypt does the job, slowly

    // insert into DB - assumes table exists
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [u, hashedPw], function (err) {
      if (err) {
        console.log('DB insert error:', err);  // yeah, this is rough
        return res.send('registration error, maybe try again?');
      }

      req.session.username = u;
      res.redirect('/chatroom');
    });

  } catch (err) {
    console.error('register catch:', err);
    res.send('some server error.');
  }
});

// === LOGIN ===
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  const uname = username.toLowerCase(); // normalize

  db.get('SELECT * FROM users WHERE LOWER(username) = ?', [uname], async (err, user) => {
    if (err) {
      console.log('DB error on login:', err);
      return res.status(500).send('error during login');
    }

    if (!user) {
      return res.status(400).sendFile(path.join(__dirname, 'public', 'login-error.html'));
    }

    try {
      const pwOk = await bcrypt.compare(password, user.password);
      if (!pwOk) {
        return res.status(401).sendFile(path.join(__dirname, 'public', 'login-error.html'));
      }

      req.session.username = user.username;
      res.redirect('/chatroom');
    } catch (err) {
      console.log('bcrypt failed?', err);
      res.status(500).send('unexpected server issue');
    }
  });
});

// save settings
app.post('/save-settings', (req, res) => {
  if (!req.session.username) return res.status(401).json({ success: false });

  const { alias, theme, description, directory } = req.body;
  const username = req.session.username;

  const sql = `
    INSERT INTO user_settings (username, alias, theme, description, directory)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(username) DO UPDATE SET
    alias = excluded.alias,
    theme = excluded.theme,
    description = excluded.description,
    directory = excluded.directory
  `;

  db.run(sql, [username, alias, theme, description, directory], function(err) {
    if (err) {
      console.error('Error saving settings:', err);
      return res.json({ success: false });
    }
    res.json({ success: true });
  });
});

// avatar image upload route — handles single file input
app.post('/upload-avatar', upload.single('avatar'), (req, res) => {
  if (!req.session.username || !req.file) return res.json({ success: false });

  const avatarPath = '/uploads/' + req.file.filename;  // what gets stored in DB
  const username = req.session.username;

  db.run('UPDATE user_settings SET avatarPath = ? WHERE username = ?', [avatarPath, username], err => {
    if (err) {
      console.error('Failed to save avatar:', err);
      return res.json({ success: false });
    }

    res.json({ success: true, avatarPath }); // tell frontend it worked
  });
});

// === multi-image upload route (for blinkies, gifs, whatever else the user adds) ===
app.post('/upload-images', multiUpload.array('images', 10), (req, res) => {
  if (!req.session.username || !req.files) return res.json({ success: false });

  const uploadedFilenames = req.files.map(file => file.filename);
  const username = req.session.username;

  db.get('SELECT imageList FROM user_settings WHERE username = ?', [username], (err, row) => {
    if (err) return res.json({ success: false });

    const currentList = row?.imageList ? JSON.parse(row.imageList) : [];
    const newList = [...currentList, ...uploadedFilenames].slice(0, 10);

    db.run('UPDATE user_settings SET imageList = ? WHERE username = ?', [JSON.stringify(newList), username], err2 => {
      if (err2) {
        console.error('image update error:', err2);
        return res.json({ success: false });
      }
      res.json({ success: true, imageList: newList });
    });
  });
});

// helper fn - just pushes count of users in each room
function broadcastnum() {
  let roomStats = {};
  for (let r in roomUsers) {
    roomStats[r] = roomUsers[r].size;
  }
  io.emit('roomUserCounts', roomStats);
}

// === SOCKET HANDLING ===
io.on('connection', (socket) => {

  // join a room
  socket.on('joinRoom', ({ room, username }) => {
    if (!roomUsers[room]) {
      roomUsers[room] = new Set();  // not existing? create it
    }

    socket.join(room);
    roomUsers[room].add(username);

    socket.username = username;
    socket.room = room;

    io.to(room).emit('userCount', roomUsers[room].size);
    broadcastnum();
  });

  // messages from client
  socket.on('chatMessage', (data) => {
    io.to(data.room).emit('message', {
      username: data.username,
      message: data.message
    });
  });

  // someone manually leaves the room
  socket.on('leaveRoom', ({ room, username }) => {
    socket.leave(room);
    if (roomUsers[room]) {
      roomUsers[room].delete(username);
      io.to(room).emit('userCount', roomUsers[room].size);
      broadcastnum();
    }
  });

  // tab closed or net down etc
  socket.on('disconnecting', () => {
    const { room, username } = socket;
    if (room && roomUsers[room]) {
      roomUsers[room].delete(username);
      io.to(room).emit('userCount', roomUsers[room].size);
      broadcastnum();
    }
  });
});

// === BOOT THE THING ===
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
