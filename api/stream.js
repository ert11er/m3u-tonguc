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

    // =============================================================
    // 1. ÖNCELİK: Cobalt API Havuzu
    // =============================================================
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

    // =============================================================
    // 2. ÖNCELİK: PHP / Server-Side yt-dlp Service (Harici PHP Sunucun Varsa)
    // =============================================================
    // Kendi PHP sunucun varsa aşağıdaki URL'i güncelleyebilirsin
    const phpYtdlpServer = process.env.PHP_YTDLP_URL; // Örn: "https://myserver.com/get_stream.php?v="

    if (phpYtdlpServer) {
      try {
        const phpRes = await fetch(`${phpYtdlpServer}${ytVideoId}`, { signal: AbortSignal.timeout(5000) });
        if (phpRes.ok) {
          const phpData = await phpRes.json();
          if (phpData.url) {
            const mediaRes = await fetch(phpData.url, { signal: AbortSignal.timeout(5000) });
            if (mediaRes.ok) {
              res.setHeader('Content-Type', 'video/mp4');
              res.status(200);
              const arrayBuffer = await mediaRes.arrayBuffer();
              return res.send(Buffer.from(arrayBuffer));
            }
          }
        }
      } catch (e) {
        // PHP servis hatası alırsa sıradakine geç
      }
    }

    // =============================================================
    // 3. ÖNCELİK: Piped MP4 API (prioritized)
    // =============================================================
    try {
      const pipedUrl = `https://piped.video/streams/${ytVideoId}`;
      const pipedRes = await fetch(pipedUrl, {
        signal: AbortSignal.timeout(4000),
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      if (pipedRes.ok) {
        const pipedData = await pipedRes.json();
        const streams = pipedData?.videoStreams || pipedData?.streams || [];

        // Prefer an MP4 video stream if available
        let streamObj = streams.find(s => (s.mimeType || '').includes('mp4') || (s.format || '').toUpperCase().includes('MPEG_4'));
        if (!streamObj && streams.length) streamObj = streams[0];

        const directUrl = streamObj?.url;
        if (directUrl) {
          const mediaRes = await fetch(directUrl, { signal: AbortSignal.timeout(5000) });
          if (mediaRes.ok) {
            res.setHeader('Content-Type', mediaRes.headers.get('content-type') || 'video/mp4');
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
      // piped.video failed or timed out; continue to other endpoints
    }

    // =============================================================
    // 4. ÖNCELİK: Invidious / Piped Sunucuları (yt-dlp Tabanlı)
    // =============================================================
    const invidiousEndpoints = [
      `https://piped.video/latest_version?id=${ytVideoId}&itag=22`,
      `https://inv.nadeko.net/latest_version?id=${ytVideoId}&itag=22`,
      `https://invidious.nerdvpn.de/latest_version?id=${ytVideoId}&itag=22`,
      `https://yt.drgnz.club/latest_version?id=${ytVideoId}&itag=22`,
      `https://invidious.flokinet.to/latest_version?id=${ytVideoId}&itag=22`
    ];

    for (const streamUrl of invidiousEndpoints) {
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

    // =============================================================
    // 5. ÖNCELİK: YouTube No-Cookie Embed (WebView Fallback)
    // =============================================================
    const embedUrl = `https://www.youtube-nocookie.com/embed/${ytVideoId}?autoplay=1&modestbranding=1&rel=0&enablejsapi=1`;
    return res.redirect(302, embedUrl);

  } catch (error) {
    return res.status(500).send("Server Error: " + error.message);
  }
}
