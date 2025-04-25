================================
WIRED GENESIS — README DOCUMENT
================================
Candidate Number: 4038
Project Title: Wired Genesis - An esoteric Library & Chatroom
Submission: NEA Project - Computer Science
Platform: Node.js + Express + SQLite
Theme: Techno-esotericism with Minimalist Stylization | Real-time Chat | A Hub for Research and Knowledge

-------------------------------------
WHAT THIS PROJECT IS (THE ESSENCE):
-------------------------------------
An esoteric FOSS Library & Chatroom exploring cyber-esotericism and the mythic overlap between code, philosophy, and esotericism.

Wired Genesis is a live web-based chat room and esoteric-themed library that is open-source in which users can communicate, customize their profiles, and upload custom content and share educational PDF documents and other materials which can be used to be of use when examining culture, information and research. Every account has a profile page with custom display name, description, visual theme, and uploaded image support. The chatroom also uses socket.io to facilitate the real-time exchange of messages between individuals. If ever, you lost the feeling that accessing a chatroom was tantamount to entering an abandoned cyber mall that was once common in 2000s software, this piece of software shall be capable of conveying that feeling of loss afresh.

The project's purpose is to facilitate knowledge retention, foster meaningful discussion, and serve as an ongoing site of new research and cross-referencing in esoteric but ever-evolving topics, ideas which might otherwise be lost to history. It aims to serve as a living archive, a reservoir of information, and a clearinghouse for the uncovering of higher truths through association and intellectual exploration. Not just affecting the formation of research and memetic wisdom, but also reflecting back on what was once observed in a cursory manner, and analyzing it in more depth, investigating and securitizing the nuances of the phenomenological and metaphysical framework of information, seeing it in a non-linear fashion by observing past and future in tandem, perhaps of another realm, a retro futuristic representation of the future, which is visualized in artwork and aesthetic conceptions of a given era such as Vaporwave, Y2K and Frutiger Aero.

-------------------------------------
INSTALLATION PROCESS
-------------------------------------
**Download or Clone this Repo**
> bash git clone https://github.com/WiredOracle/wired-genesis.git
> cd wired-genesis
> npm install

Run using:
node app.js

Open the browser:
http://localhost:3000

-------------------------------------
SOFTWARE REQUIREMENTS:
-------------------------------------
- Node.js (v18 or later recommended)
- npm (Node Package Manager)
- SQLite3 (preinstalled or part of the OS)
- A modern web browser (e.g., Chrome, Firefox)

-------------------------------------
DEPENDENCIES:
-------------------------------------
Install using:
> npm install

The project uses the following Node.js packages:
- express
- express-session
- socket.io
- multer
- sqlite3
- bcrypt
- cookie-parser
- body-parser
- ejs

-------------------------------------
SETUP INSTRUCTIONS:
-------------------------------------
1. Unzip the project folder.
2. Open a terminal and navigate to the root directory of the project.
3. Run `npm install` to install all dependencies.
4. Start the server with `node app.js`.
5. Open a browser and go to `http://localhost:3000` to view the site.

-------------------------------------
USER INFO FOR TESTING:
-------------------------------------
Test Account:
- Username: lain
- Password: system

You may also create a new account by going to `http://localhost:3000/register`.

-------------------------------------
HOW TO USE / CONTROLS:
-------------------------------------
- Utilize the navigation bar at the top to view Library, Chatroom, Encyclopedia, Profile, and Settings pages.
- The Chatroom uses socket.io for real-time message broadcasting.
- The Settings page allows users to edit display name (alias), theme (background), description, directory, avatar, and upload a maximum of 10 photos.
- The Profile page displays the user information in a theme-dependent background, dark boundary container box centered to enhance readability.

-------------------------------------
FILE STRUCTURE OVERVIEW:
-------------------------------------
- `app.js` – Server file with all routes and socket.io logic
- `public/` – Static frontend files
- `uploads/` – User-uploaded profile images
- `backgrounds/` – Theme background images (e.g. `vaporwave.jpg`, `cybercore.png`, `aero.png`)
- `views/` – EJS templates used to render HTML pages
- `users.db` – SQLite database of user credentials and preferences

-------------------------------------
SECURITY MEASURES:
-------------------------------------
- Passwords are hashed using bcrypt before storage.
- User sessions are handled securely with express-session and cookies.
- Uploaded images are stored with randomly named filenames to avoid filename collisions.
- Maximum 10 images per user for profile gallery.
- Redirect failed login attempts to themed error page.

-------------------------------------
VALIDATIONS:
-------------------------------------
-Username should not be more than 32 characters so as to prevent too large data storage
-Password should not be more than 64 characters so as to prevent too large data storage
-Patched SQL injection on Login input fields and Register input fields
-Password should also not any less than 8 characters

-------------------------------------
ADDITIONAL NOTES:
-------------------------------------
- Background themes are automatically applied on the Profile page based on the theme selected by the user in Settings.
- User data and pictures are stored across sessions with SQLite.
- UI includes monospace fonts and dark-mode cyber-inspired appearance.

==============================
   END OF README DOCUMENT
==============================
