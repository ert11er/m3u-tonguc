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

  // Uzantıyı temizle (.mp4, .ts vb.)
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

    const cobaltInstances = [
      'https://bergung.hoffnungfuerdiezukunft.net',
      'https://cobalt.canine.tools',
      'https://cobalt.clxxped.lol',
      'https://cobalt.liubquanti.click'
    ];

    let directStreamUrl = null;

    for (const instance of cobaltInstances) {
      try {
        const response = await fetch(instance, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: videoUrl,
            videoQuality: '720'
          }),
          signal: AbortSignal.timeout(4000)
        });

        if (response.ok) {
          const data = await response.json();
          directStreamUrl = data.url || data.picker?.[0]?.url;
          if (directStreamUrl) break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!directStreamUrl) {
      return res.status(500).send("All Cobalt instances failed");
    }

    // YÖNLENDİRME YERİNE: Yayını doğrudan proxy (pipe) ederek HTTP 200 ile döndür
    const streamResponse = await fetch(directStreamUrl);

    if (!streamResponse.ok) {
      return res.status(500).send("Failed to fetch direct video stream");
    }

    // Gerekli başlıkları aktar
    res.setHeader('Content-Type', streamResponse.headers.get('content-type') || 'video/mp4');
    if (streamResponse.headers.get('content-length')) {
      res.setHeader('Content-Length', streamResponse.headers.get('content-length'));
    }
    res.setHeader('Accept-Ranges', 'bytes');
    res.status(200);

    // Stream verisini aktar
    const arrayBuffer = await streamResponse.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));

  } catch (error) {
    return res.status(500).send("Server Error: " + error.message);
  }
}
