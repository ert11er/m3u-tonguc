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

    // Extract raw YouTube Video ID
    let ytVideoId = null;
    const match = targetUrl.match(/[?&]v=([^&]+)/) || targetUrl.match(/[?&]id=([^&]+)/);
    if (match && match[1]) {
      ytVideoId = match[1];
    } else {
      ytVideoId = targetId;
    }

    // Direct stream link from inv.nadeko.net (720p/360p video stream)
    const directStreamUrl = `https://inv.nadeko.net/latest_version?id=${ytVideoId}&itag=22&listen=false`;

    return res.redirect(302, directStreamUrl);

  } catch (error) {
    return res.status(500).send("Server Error: " + error.message);
  }
}
