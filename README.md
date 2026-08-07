# 🎓 Tonguç Academy IPTV Proxy

An automated IPTV backend and scraper for **Tonguç Akademi** YouTube channels. It automatically aggregates grade-level playlists, structures them as organized TV series/episodes, and serves them via **Xtream Codes API** or **Standard M3U Playlist**.

---

## ✨ Features

- 📺 **Xtream Codes API Support:** Guarantees proper classification into the **Series** tab with poster cards, seasons, and episodes on IPTV apps (e.g., iPlayTV, IPTV Smarters).
- 📜 **Dynamic M3U Export:** Provides a standard M3U URL fallback for traditional players.
- 🔄 **Automated Scraping:** GitHub Actions automatically runs the scraper to update playlists.
- ⚡ **Fast Vercel Serverless Backend:** Zero-cost, high-performance deployment.

---

## 🚀 Deployment

### 1. Fork & Deploy to Vercel

1. Push or fork this repository to your GitHub account.
2. Go to [Vercel](https://vercel.com) and import your repository.
3. Deploy without changing build settings (Vercel automatically detects Serverless API functions inside `/api`).

---

## 📱 How to Connect in Your IPTV Player

Replace `https://your-app.vercel.app` with your actual Vercel deployment domain.

### Option A: Xtream Codes API (Recommended for Series Tab)

Select **Xtream Codes API** in your IPTV player and enter:

| Field | Value |
| :--- | :--- |
| **Server URL** | `https://your-app.vercel.app` |
| **Username** | `user` *(or any string)* |
| **Password** | `pass` *(or any string)* |

### Option B: Standard M3U Playlist

Add the following URL as a **M3U / Remote Playlist**:

```text
[https://your-app.vercel.app/playlist.m3u](https://your-app.vercel.app/playlist.m3u)
