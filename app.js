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
// this keeps track of usernames per room, each room holds a Set of names
const rooms = {}; 

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
app.get(['/', '/register'], (req, res) => {
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
  if (!req.session.username) return res.redirect('/login'); // again, guard route

  const roomName = req.params.room;
  const username = req.session.username;

  // fetch alias from user_settings
  db.get('SELECT alias FROM user_settings WHERE username = ?', [username], (err, row) => {
    if (err || !row) {
      console.error('alias fetch error:', err);
      return res.status(500).send('server error');
    }

    const alias = row.alias || username;

    res.render('room', {
      username,         // still send original username for identification
      alias,            // used for display only
      room: roomName,
      userCount: roomUsers[roomName]?.size || 0 // could crash if room doesn't exist tho
    });
  });
});


// === LIBRARY SYSTEM ===

// serves the library page — now supports search queries too
app.get('/library', (req, res) => {
    const search = req.query.q; // grab whatever was typed into the search box
  
    // default SQL and parameters
    let sql = 'SELECT * FROM documents';
    let params = [];
  
    // if there's something to filter by
    if (search) {
      // we’re gonna look for partial matches in title, author, or uploader
      sql += ` WHERE title LIKE ? OR author LIKE ? OR uploaded_by LIKE ?`;
      const wildcard = `%${search}%`;
      params = [wildcard, wildcard, wildcard]; // same value for each field
    }
  
    // always show newest first
    sql += ' ORDER BY id DESC';
  
    // run the query
    db.all(sql, params, (err, docs) => {
      if (err) {
        console.error('Could not fetch documents:', err);
        return res.status(500).send('Server error.');
      }
  
      // render the page with doc results + original query (to show in input field)
      res.render('library', {
        page: 'library',             // used to keep nav highlighting accurate
        username: req.session.username, // same as before, needed for uploads
        documents: docs,            // the results after search (or full list)
        query: search || ''         // send this back so input field stays filled
      });
    });
  });  
  
  const fs = require('fs');

// === LIBRARY UPLOAD VALIDATION ===

// handle document uploads
app.post('/upload-document', upload.single('docFile'), (req, res) => {
    // grab values sent from the form 
    const { docTitle, docAuthor, accessKey } = req.body;
    const user = req.session.username; // whoever's logged in
  
    // basic auth — only allow uploads with correct key
    if (accessKey !== '1337wiredspace1337') {
        return res.redirect('/login-error.html'); // access denied
    }
  
    // validate: make sure all fields are present
    if (!req.file || !docTitle || !docAuthor || !user) {
      return res.status(400).send('Missing data.');
    }
  
    // this blocks files larger than 50mb
    if (req.file.size > 50 * 1024 * 1024) {
      return res.send('<script>alert("File size too large"); window.history.back();</script>');
    }
  
    // title should be no more than 50 chars
    if (docTitle.length > 50) {
      return res.send('<script>alert("Title too long"); window.history.back();</script>');
    }
  
    // same for author field
    if (docAuthor.length > 50) {
      return res.send('<script>alert("Author name too long"); window.history.back();</script>');
    }
  
    // this strips simple sql injections attempts
    const cleanTitle = docTitle.replace(/[;'"\\]+/g, '');
    const cleanAuthor = docAuthor.replace(/[;'"\\]+/g, '');
  
    
    // get file size in MB
    const fileSize = (req.file.size / 1024 / 1024).toFixed(1) + ' MB';
  
    // date in YYYY-MM-DD format
    const uploadDate = new Date().toISOString().split('T')[0];
  
    //relative path to file for download link
    const filePath = '/uploads/' + req.file.filename;
  
    // insert all info into documents table
    db.run(
      `INSERT INTO documents (title, author, file_size, upload_date, uploaded_by, file_path)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [cleanTitle, cleanAuthor, fileSize, uploadDate, user, filePath],
      function (err) {
        if (err) {
          console.error('DB insert error:', err); // it'd probably be bc of DB locked or schema issue
          return res.status(500).send('Could not save doc.');
        }
  
        // redirect back to library once it's saved
        res.redirect('/library');
      }
    );
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
      description: row?.description || 'No matter where you are, everyone is always connected.',
      directory: row?.directory || '/home/user/downloads',
      avatar: row?.avatarPath || '/lain.jpg',
      imageList: row?.imageList ? JSON.parse(row.imageList) : []
    });
  });
});

// POST route to remove an image from the user's saved imageList
app.post('/remove-image', (req, res) => {
    // reject if not logged in
    if (!req.session.username) return res.status(401).json({ success: false });
  
    const { filename } = req.body; // grab the filename sent by the client
    const username = req.session.username; // current user session
  
    // get current image list for this user
    db.get('SELECT imageList FROM user_settings WHERE username = ?', [username], (err, row) => {
      if (err || !row) return res.json({ success: false });
  
      let currentList = row.imageList ? JSON.parse(row.imageList) : [];
  
      // filter out the image the user wants to remove
      currentList = currentList.filter(f => f !== filename);
  
      // update the user's imageList in the database
      db.run('UPDATE user_settings SET imageList = ? WHERE username = ?', [JSON.stringify(currentList), username], err2 => {
        if (err2) {
          console.error('Failed to update imageList:', err2);
          return res.json({ success: false });
        }
  
        // success — return updated imageList
        res.json({ success: true, imageList: currentList });
      });
    });
  });  

// defines the GET route for the user profile page
app.get('/profile', (req, res) => {
    const targetUser = req.query.user || req.session.username; // grab logged-in username from session
  
    // get all the saved settings for the current user
    db.get('SELECT * FROM user_settings WHERE username = ?', [targetUser], (err, row) => {
      if (err) {
        // database stopped working
        console.error('profile error:', err);
        return res.status(500).send('server error'); // basic error return
      }
  
      if (!row) return res.status(404).send('user not found');
      
      // theme to background file mapping	
      const themeFileMap = {
        'purple-cybercore': 'cybercore.png',
        'vaporwave': 'vaporwave.jpg',
        'frutiger-aero': 'aero.png',
        'ethereal-gothic': 'ethereal-gothic.jpg'
      };
  
      // if no theme matched, fallback to cybercore
      const bgFile = themeFileMap[row?.theme] || 'cybercore.png';
  
      // render profile.ejs with all thevalues retreived from the DB
      res.render('profile', {
        username: targetUser,
        alias: row.alias || 'anonymous',
        theme: row.theme || 'purple-cybercore',
        description: row.description || '',
        avatar: row.avatarPath || '/lain.jpg',
        imageList: row.imageList ? JSON.parse(row.imageList) : [],
        bgImage: bgFile
      });
    });
  });

// new route: view someone else's profile by username
app.get('/user/:username', (req, res) => {
    // grab the username part of the URL, like /user/tsuki -> tsuki
    const targetUser = req.params.username;
  
    // look up this user in the database — pulling all their saved settings
    db.get('SELECT * FROM user_settings WHERE username = ?', [targetUser], (err, row) => {
      // if db call errors or no user with that name exists
      if (err || !row) {
        return res.status(404).send('user not found'); // fail early if something is wrong
      }
  
      // map each available theme option to the background image it should use
      const themeFileMap = {
        'purple-cybercore': 'cybercore.png',
        'vaporwave': 'vaporwave.jpg',
        'frutiger-aero': 'aero.png',
        'ethereal-gothic': 'ethereal-gothic.jpg'
      };
  
      // fallback to default background if somehow the user's theme is missing
      const bgFile = themeFileMap[row.theme] || 'cybercore.png';
  
      // this sends all the user's profile info into the EJS view for rendering
      res.render('profile', {
        username: targetUser,                                   
        alias: row.alias || 'anonymous',                       
        theme: row.theme || 'purple-cybercore',              
        description: row.description || '',               
        avatar: row.avatarPath || '/lain.jpg',                  
        imageList: row.imageList ? JSON.parse(row.imageList) : [], 
        bgImage: bgFile                                          
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

    // message rate tracking per socket
    let messageTimestamps = [];

    // user joins a chatroom
    socket.on('joinRoom', ({ room, username }) => {
      if (!rooms[room]) {
        rooms[room] = new Set(); // first time? make a new set
      }

      // this checks if room is too full
      if (rooms[room].size >= 20) {
        socket.emit('errorMessage', 'room is full. try again later.');
        return;
      }

      socket.join(room); //attach socket to room
      rooms[room].add(username); // track them in memory
      socket.username = username; // store on socket object
      socket.room = room;
      
      // send count and full list to everyone in room
      io.to(room).emit('userCount', rooms[room].size);
      io.to(room).emit('roomUsers', { users: Array.from(rooms[room]) });

      broadcastnum(); //total connected count or similar? leaving this untouched
    });

    // someone sends a message
    socket.on('chatMessage', (data) => {
      const now = Date.now();
      const timeWindow = 1000; // 1 second

      // keep only timestamps within last second
      messageTimestamps = messageTimestamps.filter(t => now - t < timeWindow);
      messageTimestamps.push(now);

      // this blocks overly large messages
      if (data.message.length > 5000) {
        socket.emit('errorMessage', 'Message is too long.');
        return;
      }

      // rate limit check
      if (messageTimestamps.length > 2) {
        socket.emit('errorMessage', "You're typing too fast. Please wait for a moment.");
        return;
      }

      io.to(data.room).emit('message', {
        username: data.username,
        alias: data.alias,
        message: data.message
      });
    });

    // they manually leave the room (clicks go back button etc)
    socket.on('leaveRoom', ({ room, username }) => {
      socket.leave(room);
      if (rooms[room]) {
        rooms[room].delete(username); // remove them from list
        io.to(room).emit('userCount', rooms[room].size);
        io.to(room).emit('roomUsers', { users: Array.from(rooms[room]) });
        broadcastnum();
      }
    });

    // user drops unexpectedly (refeshes, closes tab)
    socket.on('disconnecting', () => {
      const { room, username } = socket;
      if (room && rooms[room]) {
        rooms[room].delete(username); //wipe them from memory if we had them
        io.to(room).emit('userCount', rooms[room].size);
        io.to(room).emit('roomUsers', { users: Array.from(rooms[room]) });
        broadcastnum();
      }
    });
});

app.use(function (r, res) {
    res.status(404).sendFile(path.join(__dirname, 'public', 'login-error.html'));
  })

// === BOOT THE THING ===
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
