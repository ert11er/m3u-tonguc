import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const dataPath = path.join(process.cwd(), 'data', 'data.json');

    if (!fs.existsSync(dataPath)) {
      return res.status(404).send("#EXTM3U\n# Error: data.json not found");
    }

    const fileData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    let m3u = '#EXTM3U x-tvg-url="" tvg-type="series"\n';

    (fileData.series || []).forEach(item => {
      (item.episodes || []).forEach(ep => {
        const logo = ep.info?.movie_image || item.cover;
        const category = item.category_name || "Genel";
        
        m3u += `#EXTINF:-1 tvg-logo="${logo}" ` +
               `group-title="${category}" ` +
               `series-name="${item.name}" ` +
               `tvg-name="${item.name}" ` +
               `season="1" episode="${ep.episode_num}" ` +
               `cmd="series" tvg-type="series",S01E${String(ep.episode_num).padStart(2, '0')} - ${ep.title}\n`;
        m3u += `#EXTGRP:${category}\n`;
        m3u += `${ep.url}\n`;
      });
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(200).send(m3u);

  } catch (error) {
    return res.status(500).send(`#EXTM3U\n# Error: ${error.message}`);
  }
}
