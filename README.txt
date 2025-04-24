===============================
WIRED GENESIS — README DOCUMENT
===============================

Author: Dion Berish
Candidate Number: 4038
Project Title: Wired Genesis - An esoteric Library & Chatroom
Submission: NEA Project - Computer Science
Platform: Node.js + Express + SQLite
Theme: Techno-esotericism | Real-time Chat | A Hub for Research

-------------------------------------
WHAT THIS PROJECT IS:
-------------------------------------
Wired Genesis is an open-source live web-based chatroom and esoteric-themed library where users can interact, customize their profiles, and upload customized content and share educational PDF documents and additional resources which may serve to be useful in the analysis of culture, information and research. Every account has a profile page with custom display name, description, visual theme, and uploaded image support. The chatroom uses socket.io to provide real-time messaging between users. If you ever lost that feeling where going to a chatroom felt like going to an empty cyber mall that was prevalent within 2000s software, this software will be able to convey that lost feeling once again.

The project's purpose is to preserve knowledge, facilitate meaningful discourse, and serve as a dynamic hub for innovative research and connections in obscure yet ever-evolving fields, ideas that might otherwise be lost to time. It aspires to be a living archive, a reservoir of information, and a platform for uncovering deeper truths through collaboration and intellectual exploration. Not only impacting the evolution of research and memetic information, but also retroactively looking back at what was once glanced over superficially, and taking a more deeper look into it, investigating and securitizing the nuances in the phenomenological and metaphysical nature of information, looking at it non-linearly by examining both the past and future simultaneously, perhaps of an alternate reality, a retro futuristic depiction of the future, which is portrayed in artistic and aesthetic conceptions of a particular epoch such as Vaporwave, Y2K and Frutiger Aero.

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
4. Start the server using `node app.js`.
5. Open a browser and go to `http://localhost:3000` to use the site.

-------------------------------------
USER INFO FOR TESTING:
-------------------------------------
Test Account:
- Username: lain
- Password: system

You can also create a new account by going to `http://localhost:3000/register`.

-------------------------------------
HOW TO USE / CONTROLS:
-------------------------------------
- Use the top navigation bar to access Library, Chatroom, Encyclopedia, Profile, and Settings pages.
- The Chatroom uses socket.io for real-time message broadcasting.
- The Settings page allows users to change display name (alias), theme (background), description, directory, avatar, and upload a max of 10 images.
- The Profile page displays the user's information in a theme-based background, centered container box with a dark border for enhanced visibility.

-------------------------------------
FILE STRUCTURE OVERVIEW:
-------------------------------------
- `app.js` – Server file containing all routes and socket.io logic
- `public/` – Static frontend files
- `uploads/` – User uploaded profile images
- `backgrounds/` – Theme background images (e.g. `vaporwave.jpg`, `cybercore.png`, `aero.png`)
- `views/` – EJS templates for rendering HTML pages
- `users.db` – SQLite database storing user credentials and preferences

-------------------------------------
SECURITY MEASURES:
-------------------------------------
- Passwords are hashed by bcrypt before storage.
- User sessions are managed securely with express-session and cookies.
- Images uploaded are stored with randomly named filenames to avoid collisions.
- Maximum 10 images per user for profile gallery.
- Invalid login attempts are routed to themed error page.

-------------------------------------
VALIDATIONS:
-------------------------------------
-Username can have up to 32 characters to prevent excessively large data being stored
-Password can have up to 64 characters to prevent excessively large data being stored
-Patched SQL injection for both the Login input fields and Register input fields
-Password also needs a maximum of 8 characters

-------------------------------------
ADDITIONAL NOTES:
-------------------------------------
- Background themes are automatically applied on the Profile page based on the user's selected theme in Settings.
- All images and user information are stored between sessions with SQLite.
- The UI uses monospace fonts and dark-themed cyber-inspired styling.

==============================
    END OF README DOCUMENT
==============================