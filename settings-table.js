const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'users.db'));

db.run(`
  CREATE TABLE IF NOT EXISTS user_settings (
    username TEXT PRIMARY KEY,
    alias TEXT,
    theme TEXT,
    description TEXT,
    directory TEXT,
    avatarPath TEXT,
    imageList TEXT
  )
`, (err) => {
  if (err) {
    console.error("Failed to create table:", err);
  } else {
    console.log("user_settings table created or already exists.");
  }
  db.close();
});
