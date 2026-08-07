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

    // -------------------------------------------------------------
    // 1. AŞAMA: Invidious / Piped Doğrudan Akış (Direct Stream Pipe)
    // -------------------------------------------------------------
    const directStreamEndpoints = [
      `https://inv.nadeko.net/latest_version?id=${ytVideoId}&itag=22`,
      `https://invidious.nerdvpn.de/latest_version?id=${ytVideoId}&itag=22`,
      `https://yt.drgnz.club/latest_version?id=${ytVideoId}&itag=22`,
      `https://invidious.flokinet.to/latest_version?id=${ytVideoId}&itag=22`
    ];

    for (const streamUrl of directStreamEndpoints) {
      try {
        const streamRes = await fetch(streamUrl, {
          signal: AbortSignal.timeout(4000),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
          }
        });

        if (streamRes.ok) {
          res.setHeader('Content-Type', 'video/mp4');
          if (streamRes.headers.get('content-length')) {
            res.setHeader('Content-Length', streamRes.headers.get('content-length'));
          }
          res.setHeader('Accept-Ranges', 'bytes');
          res.status(200);

          const arrayBuffer = await streamRes.arrayBuffer();
          return res.send(Buffer.from(arrayBuffer));
        }
      } catch (e) {
        continue;
      }
    }

    // -------------------------------------------------------------
    // 2. AŞAMA: Cobalt API Havuzu (Link Çözümleme + Stream Pipe)
    // -------------------------------------------------------------
    const cobaltInstances = [
      'https://bergung.hoffnungfuerdiezukunft.net',
      'https://cobalt.canine.tools',
      'https://cobalt.clxxped.lol',
      'https://cobalt.liubquanti.click'
    ];

    for (const instance of cobaltInstances) {
      try {
        const cobaltRes = await fetch(instance, {
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

        if (cobaltRes.ok) {
          const cobaltData = await cobaltRes.json();
          const directUrl = cobaltData.url || cobaltData.picker?.[0]?.url;

          if (directUrl) {
            const mediaRes = await fetch(directUrl, { signal: AbortSignal.timeout(5000) });
            if (mediaRes.ok) {
              res.setHeader('Content-Type', 'video/mp4');
              if (mediaRes.headers.get('content-length')) {
                res.setHeader('Content-Length', mediaRes.headers.get('content-length'));
              }
              res.setHeader('Accept-Ranges', 'bytes');
              res.status(200);

              const arrayBuffer = await mediaRes.arrayBuffer();
              return res.send(Buffer.from(arrayBuffer));
            }
          }
        }
      } catch (e) {
        continue;
      }
    }

    return res.status(500).send("All alternative stream sources failed.");

  } catch (error) {
    return res.status(500).send("Server Error: " + error.message);
  }
}
