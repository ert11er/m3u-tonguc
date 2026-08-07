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

  // Uzantıyı temizle (.mp4, .ts vs.)
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

    // En kaliteli & aktif Cobalt Instance Havuzu (Sırayla dener)
    const cobaltInstances = [
      'https://bergung.hoffnungfuerdiezukunft.net',
      'https://cobalt.canine.tools',
      'https://cobalt.clxxped.lol',
      'https://cobalt.liubquanti.click'
    ];

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
          signal: AbortSignal.timeout(4000) // 4 saniye zaman aşımı
        });

        if (response.ok) {
          const data = await response.json();
          const directStreamUrl = data.url || data.picker?.[0]?.url;

          if (directStreamUrl) {
            return res.redirect(302, directStreamUrl);
          }
        }
      } catch (e) {
        // Sunucu yanıt vermezse veya zaman aşıma uğrarsa bir sonrakine geç
        continue;
      }
    }

    return res.status(500).send("All Cobalt stream instances failed to extract video.");

  } catch (error) {
    return res.status(500).send("Server Error: " + error.message);
  }
}
