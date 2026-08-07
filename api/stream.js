import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  let streamId = req.query.stream_id;

  if (!streamId && req.url) {
    const parts = req.url.split('/');
    streamId = parts[parts.length - 1];
  }

  if (!streamId) {
    return res.status(400).send("Missing stream ID");
  }

  if (Array.isArray(streamId)) {
    streamId = streamId.join('/');
  }

  // Strip extension (.mp4, .ts)
  const targetId = streamId.replace(/\.[^/.]+$/, "");

  try {
    const dataPath = path.join(process.cwd(), 'data', 'data.json');

    if (!fs.existsSync(dataPath)) {
      return res.status(404).send("Data file not found");
    }

    const fileData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    let targetUrl = null;

    for (const series of fileData.series || []) {
      const episode = (series.episodes || []).find(ep => String(ep.id) === String(targetId));
      if (episode) {
        targetUrl = episode.url;
        break;
      }
    }

    if (!targetUrl) {
      return res.status(404).send(`Episode not found for ID: ${targetId}`);
    }

    // Extract YouTube Video ID from URL or targetId
    let ytVideoId = null;
    const match = targetUrl.match(/[?&]v=([^&]+)/) || targetUrl.match(/[?&]id=([^&]+)/);
    if (match && match[1]) {
      ytVideoId = match[1];
    }

    if (ytVideoId) {
      // Direct stream URL using active, high-uptime Invidious instance
      const streamDirectUrl = `https://invidious.flokinet.to/latest_version?id=${ytVideoId}&itag=22`;
      return res.redirect(302, streamDirectUrl);
    }

    return res.redirect(302, targetUrl);

  } catch (error) {
    return res.status(500).send("Server Error: " + error.message);
  }
}
