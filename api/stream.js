import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  let { stream_id } = req.query;

  if (!stream_id) {
    return res.status(400).send("Missing stream ID");
  }

  // Remove file extension (e.g., "PLKv..._1.mp4" -> "PLKv..._1")
  const targetId = stream_id.replace(/\.[^/.]+$/, "");

  try {
    const dataPath = path.join(process.cwd(), 'data', 'data.json');
    if (!fs.existsSync(dataPath)) {
      return res.status(404).send("Data file not found");
    }

    const fileData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    // Find matching episode ID across all series
    let targetUrl = null;

    for (const series of fileData.series || []) {
      const episode = (series.episodes || []).find(ep => String(ep.id) === targetId);
      if (episode) {
        targetUrl = episode.url;
        break;
      }
    }

    if (!targetUrl) {
      return res.status(404).send("Episode not found");
    }

    // Redirect player directly to video stream URL
    return res.redirect(302, targetUrl);

  } catch (error) {
    return res.status(500).send("Server Error: " + error.message);
  }
}
