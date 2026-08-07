import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const dataPath = path.join(process.cwd(), 'data', 'data.json');
  const fileData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  let m3u = '#EXTM3U x-tvg-url="" tvg-type="series"\n';

  fileData.series.forEach(item => {
    item.episodes.forEach(ep => {
      m3u += `#EXTINF:-1 tvg-logo="${ep.info.movie_image}" ` +
             `group-title="${item.category_name}" ` +
             `series-name="${item.name}" ` +
             `tvg-name="${item.name}" ` +
             `season="1" episode="${ep.episode_num}" ` +
             `cmd="series" tvg-type="series",S01E${String(ep.episode_num).padStart(2, '0')} - ${ep.title}\n`;
      m3u += `#EXTGRP:${item.category_name}\n`;
      m3u += `${ep.url}\n`;
    });
  });

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.status(200).send(m3u);
}
