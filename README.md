# 🎮 Game Search App

A simple, fast frontend for searching cracked game sources in one place.  
Currently supports **SkidrowReloaded** and **FreeGOG** (via public APIs), covering most needs.  
More sources coming soon 🚀.

---

## ✨ Features

- 🔍 Unified search across multiple sites (Skidrow + FreeGOG)  
- ⚡ Fast API backend powered by Cloudflare Workers  
- 📊 Source filtering (Skidrow / FreeGOG / Both)  
- 🕹️ Minimal, modern React UI with Tailwind CSS  
- 📜 Search history stored locally for convenience  
- 📥 Direct access to download links (torrent + mirrors)  

---

## 📸 Preview

Demo <a href="https://gamesearch.iforgor.cc">>>Here<<</a>


https://github.com/user-attachments/assets/18805259-08cf-43bf-921d-61cb301f679a



---

## 🛠️ Tech Stack

- **Frontend:** React + TailwindCSS + Lucide icons  
- **Backend:** Cloudflare Workers (custom API wrapper)  

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### Installation

```bash
# Clone repo
git clone https://github.com/darkmaster420/gamesearch.git
cd gamesearch

# Install dependencies
npm install

# Start development server
npm run dev
```

🌐 API Backend

This app relies on a companion API built with Cloudflare Workers.
👉 Check out the backend repo here: Game Search API

Example request:

GET https://gameapi.a7a8524.workers.dev/?search=cyberpunk+2077&site=skidrow

Example response:

{
      "id": "skidrow_500974",
      "originalId": 500974,
      "title": "Cyberpunk 2077 v2.31-GOG",
      "excerpt": "GOG ONE FTP LINK TORRENT Cyberpunk 2077 is an open-world, action-adventure story set in Night City .",
      "link": "https://www.skidrowreloaded.com/cyberpunk-2077-v2-31-gog/",
      "date": "2025-09-11T21:55:27",
      "slug": "cyberpunk-2077-v2-31-gog",
      "description": "GOG ONE FTP LINK TORRENT Cyberpunk 2077 is an open-world, action-adventure story set in Night City .",
      "categories": [1, 1915],
      "tags": [320586],
      "downloadLinks": [


---

🛣️ Roadmap

[ ] Add more sources (e.g. GOGGames, DodiRepacks)

[ ] Smarter link prioritization (torrents first)

[✓ ] Deploy live demo

[ ] Dark mode toggle (for fun 😏)



---

📜 License

MIT License. Do whatever you want, just don’t sue me.


---

❤️ Acknowledgements

SkidrowReloaded

FreeGOG

Cloudflare Workers for making the API possible

