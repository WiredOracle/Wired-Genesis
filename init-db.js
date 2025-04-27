const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// path
const dbPath = path.join(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath);

// this will generally end up createing the profiles table if it doesn't exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS profiles (
      username TEXT PRIMARY KEY,
      theme TEXT,
      description TEXT,
      directory TEXT,
      avatar TEXT,
      images TEXT
    )
  `, (err) => {
    if (err) {
      console.error('failed to create profiles table:', err.message);
    } else {
      console.log('profiles table created (or already exists)');
    }
  });
});

db.close();