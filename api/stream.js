import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
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

    // Extract YouTube Video ID
    let ytVideoId = null;
    const match = targetUrl.match(/[?&]v=([^&]+)/) || targetUrl.match(/[?&]id=([^&]+)/);
    if (match && match[1]) {
      ytVideoId = match[1];
    } else {
      ytVideoId = targetId;
    }

    // Query Piped API for direct stream streams
    const pipedRes = await fetch(`https://pipedapi.kavin.rocks/streams/${ytVideoId}`);
    if (pipedRes.ok) {
      const pipedData = await pipedRes.json();
      
      // Look for a video+audio stream (720p or 360p MP4)
      const stream = (pipedData.videoStreams || []).find(
        s => s.mimeType?.includes('video/mp4') && s.videoOnly === false
      ) || pipedData.videoStreams?.[0];

      if (stream?.url) {
        return res.redirect(302, stream.url);
      }
    }

    // Fallback: Redirect directly to YouTube video URL if API fails
    return res.redirect(302, `https://www.youtube.com/watch?v=${ytVideoId}`);

  } catch (error) {
    return res.status(500).send("Server Error: " + error.message);
  }
}
