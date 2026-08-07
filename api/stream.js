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

  // Uzantıyı temizle (.mp4, .ts)
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

    let ytVideoId = targetId;
    if (targetUrl) {
      const match = targetUrl.match(/[?&]v=([^&]+)/) || targetUrl.match(/[?&]id=([^&]+)/);
      if (match && match[1]) ytVideoId = match[1];
    }

    const videoUrl = `https://www.youtube.com/watch?v=${ytVideoId}`;

    // Cobalt v11 API istek adresi
    const cobaltUrl = 'https://api.cobalt.liubquanti.click';

    const cobaltRes = await fetch(cobaltUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      body: JSON.stringify({
        url: videoUrl,
        videoQuality: '720'
      })
    });

    if (cobaltRes.ok) {
      const cobaltData = await cobaltRes.json();

      // v11 yanıt formatı kontrolü
      const streamUrl = cobaltData.url || cobaltData.picker?.[0]?.url;

      if (streamUrl) {
        return res.redirect(302, streamUrl);
      }
    }

    const errText = await cobaltRes.text();
    console.error("Cobalt Error Response:", errText);
    return res.status(500).send("Cobalt Stream Error: " + errText);

  } catch (error) {
    return res.status(500).send("Server Error: " + error.message);
  }
}
