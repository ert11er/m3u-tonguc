import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  // Extract stream_id from query or fallback to URL parsing
  let streamId = req.query.stream_id;

  if (!streamId && req.url) {
    const parts = req.url.split('/');
    streamId = parts[parts.length - 1];
  }

  if (!streamId) {
    return res.status(400).send("Missing stream ID");
  }

  // Handle array if Vercel passes multiple segments
  if (Array.isArray(streamId)) {
    streamId = streamId.join('/');
  }

  // Remove file extension (.mp4, .ts, etc.)
  const targetId = streamId.replace(/\.[^/.]+$/, "");

  try {
    const dataPath = path.join(process.cwd(), 'data', 'data.json');

    if (!fs.existsSync(dataPath)) {
      return res.status(404).send("Data file not found");
    }

    const fileData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    // Search for episode across all series
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

    // Redirect player directly to video stream URL
    return res.redirect(302, targetUrl);

  } catch (error) {
    return res.status(500).send("Server Error: " + error.message);
  }
}
