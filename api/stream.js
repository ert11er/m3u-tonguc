import fs from 'fs';
import path from 'path';
import ytdl from '@distube/ytdl-core';

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

    const videoUrl = `https://www.youtube.com/watch?v=${ytVideoId}`;

    // Extract real-time stream info using ytdl-core
    const info = await ytdl.getInfo(videoUrl);
    
    // Select combined video+audio MP4 stream (itag 22 = 720p, or fallback to any combined mp4)
    const format = ytdl.chooseFormat(info.formats, {
      quality: 'highestvideo',
      filter: format => format.container === 'mp4' && format.hasVideo && format.hasAudio
    });

    if (format && format.url) {
      // Redirect player directly to Google Video CDN URL
      return res.redirect(302, format.url);
    }

    return res.status(500).send("No valid video stream format found.");

  } catch (error) {
    console.error("YTDL Error:", error);
    return res.status(500).send("Server Stream Error: " + error.message);
  }
}
