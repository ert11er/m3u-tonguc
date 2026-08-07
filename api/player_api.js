import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  // CORS Headers (Allows IPTV players to connect without browser security blocks)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Safely locate data/data.json in Vercel serverless environment
    const dataPath = path.join(process.cwd(), 'data', 'data.json');

    if (!fs.existsSync(dataPath)) {
      return res.status(404).json({
        error: "data.json not found. Make sure python update.py was executed and data/data.json is committed to Git."
      });
    }

    const fileData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const { action, series_id } = req.query;

    // 1. Initial Authentication Check (No action parameter passed)
    if (!action) {
      return res.status(200).json({
        user_info: {
          username: "user",
          password: "pass",
          auth: 1,
          status: "Active",
          exp_date: "1999999999",
          is_trial: "0",
          active_cons: "0",
          created_at: "1600000000",
          max_connections: "10",
          allowed_output_formats: ["m3u8", "ts", "mp4"]
        },
        server_info: {
          url: req.headers.host,
          port: "80",
          https_port: "443",
          server_protocol: "https",
          rtmp_port: "8880",
          timezone: "Europe/Istanbul",
          timestamp_now: Math.floor(Date.now() / 1000)
        }
      });
    }

    // 2. Fetch Series Categories
    if (action === 'get_series_categories') {
      return res.status(200).json(fileData.categories || []);
    }

    // 3. Fetch All Series List
    if (action === 'get_series') {
      const seriesList = (fileData.series || []).map(s => ({
        series_id: s.series_id,
        name: s.name,
        cover: s.cover,
        plot: "",
        cast: "",
        director: "",
        genre: "Eğitim",
        releaseDate: "2026",
        last_modified: "1600000000",
        rating: "5.0",
        rating_5based: 5,
        backdrop_path: [s.cover],
        youtube_trailer: "",
        episode_run_time: "20",
        category_id: s.category_id
      }));

      return res.status(200).json(seriesList);
    }

    // 4. Fetch Details & Episodes for a Specific Series
    if (action === 'get_series_info' && series_id) {
      const targetSeries = (fileData.series || []).find(s => String(s.series_id) === String(series_id));

      if (!targetSeries) {
        return res.status(404).json({ error: "Series not found" });
      }

      // Format episodes into Xtream Codes schema
      const formattedEpisodes = (targetSeries.episodes || []).map(ep => ({
        id: ep.id,
        episode_num: ep.episode_num,
        title: ep.title,
        container_extension: ep.container_extension || "mp4",
        info: {
          movie_image: ep.info?.movie_image || targetSeries.cover,
          plot: "",
          duration_secs: 1200,
          duration: "00:20:00",
          bitrate: 0
        },
        custom_sid: "",
        added: "1600000000",
        season: 1,
        direct_source: ep.url
      }));

      return res.status(200).json({
        seasons: [
          {
            air_date: "2026-01-01",
            episode_count: formattedEpisodes.length,
            id: 1,
            name: "1. Sezon",
            overview: "",
            poster_path: targetSeries.cover,
            season_number: 1
          }
        ],
        info: {
          name: targetSeries.name,
          cover: targetSeries.cover,
          plot: "",
          cast: "",
          director: "",
          genre: "Eğitim",
          releaseDate: "2026",
          last_modified: "1600000000",
          rating: "5.0",
          category_id: targetSeries.category_id
        },
        episodes: {
          "1": formattedEpisodes
        }
      });
    }

    // Fallback response for unsupported actions
    return res.status(200).json([]);

  } catch (error) {
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message
    });
  }
}
