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

  // Remove extension (.mp4, .ts)
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

    // Extract raw YouTube Video ID from Invidious URL (e.g., id=p3vZpNjsibA)
    const ytMatch = targetUrl.match(/[?&]id=([^&]+)/);
    
    if (ytMatch && ytMatch[1]) {
      const ytVideoId = ytMatch[1];
      
      // Redirect to a working Invidious/Cobalt/Piped video stream instance
      // Cobalt / Invidious alternative endpoint:
      const streamDirectUrl = `https://inv.tux.im/latest_version?id=${ytVideoId}&itag=22`;
      return res.redirect(302, streamDirectUrl);
    }

    // Fallback redirect to original URL
    return res.redirect(302, targetUrl);

  } catch (error) {
    return res.status(500).send("Server Error: " + error.message);
  }
}
