# ⚡ Live Drop

> **Real-time. Ephemeral. Secure.**
> Share files and text across devices instantly. Everything self-destructs in 24 hours.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Stack](https://img.shields.io/badge/stack-MERN-green.svg)
![Status](https://img.shields.io/badge/status-Active-brightgreen.svg)

## 📖 About

**Live Drop** is a lightweight, browser-based dead drop for digital content. It solves the problem of quickly moving a file or a snippet of text from Phone A to Laptop B (or to a friend) without logging in, emailing yourself, or using permanent cloud storage.

**The catch?** It’s ephemeral. Every room and every byte of data is automatically purged from existence exactly 24 hours after creation.

## ✨ Key Features

* **⚡ Real-Time Sync:** Powered by **Socket.io**, transfers happen instantly. No page refreshes required.
* **🔒 Zero Auth:** No accounts, no emails. Just create a Room Code and share it.
* **⏳ 2-Hour Inactivity Self-Destruct:** An automated cleanup cron job ensures privacy by wiping all data (Database entries + Cloudinary files) after a room has been inactive for 2 hours.
* **📂 Universal Sharing:** Supports text snippets (with one-click copy) and file uploads (images, PDFs, zips, etc.).
* **🌑 Dark Mode UI:** A sleek, minimal interface designed for speed.

---

## 🛠️ Tech Stack

Built with the **MERN** stack, optimized for free-tier deployment.

* **Frontend:** React (Vite), Tailwind CSS
* **Backend:** Node.js, Express.js
* **Real-Time Engine:** Socket.io
* **Database:** MongoDB Atlas (Persists metadata)
* **File Storage:** Cloudinary (Persists binary files)
* **Automation:** Cron-job.org (Triggers the cleanup API)

---

## 🚀 Getting Started

### Prerequisites

* Node.js installed
* MongoDB Atlas Account
* Cloudinary Account

### Installation

1.  **Clone the repo**
    ```bash
    git clone https://github.com/yourusername/live-drop.git
    cd live-drop
    ```

2.  **Install Backend Dependencies**
    ```bash
    cd server
    npm install
    ```

3.  **Install Frontend Dependencies**
    ```bash
    cd ../client
    npm install
    ```

4.  **Environment Variables**
    Create a `.env` file in the `server` directory and add your keys:
    ```env
    PORT=3001
    MONGO_URI=your_mongodb_connection_string
    CLOUDINARY_CLOUD_NAME=your_cloud_name
    CLOUDINARY_API_KEY=your_api_key
    CLOUDINARY_API_SECRET=your_api_secret
    ```

5.  **Run the App**
    * Backend: `npm start` (inside /server)
    * Frontend: `npm run dev` (inside /client)

---

## 🤖 The "Cleanup" Logic

To ensure the free tier of Cloudinary doesn't fill up, this project uses a specific architecture for deletion:

1.  **MongoDB** stores the file metadata and a `createdAt` timestamp.
2.  A dedicated API route `/api/cleanup` checks for rooms with no activity for > 2 hours.
3.  It first calls the **Cloudinary API** to destroy the raw file.
4.  Then, it deletes the **MongoDB** document.
5.  (Production) An external Cron Job pings this route every hour.

---

## 🤝 Contributing

Contributions are welcome!

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

**Built with 🖤 by [Ankush]**
