import json
import os
from datetime import datetime
import yt_dlp

TARGET_YEAR = str(datetime.now().year)

channels = [
    {"category_id": 1, "name": "1. Sınıf", "id": "UCyRSGDRdOroDN6vXtobLTfw"},
    {"category_id": 2, "name": "2. Sınıf", "id": "UCkI5pnECWXuniFCQpe6nWQw"},
    {"category_id": 3, "name": "3. Sınıf", "id": "UCWKFn2p0uodV8JCdsYtGLIw"},
    {"category_id": 4, "name": "4. Sınıf", "id": "UCK4MoKPUA5lJjiO18yc_YMA"},
    {"category_id": 5, "name": "5. Sınıf", "id": "UCb-0JQ4tI03T5rHdFe2GVoA"},
    {"category_id": 6, "name": "6. Sınıf", "id": "UCntJ4oa66gOoonxnJ5MWduQ"},
    {"category_id": 7, "name": "7. Sınıf", "id": "UCI5Ir6-br-HM54InF7HUlzg"},
    {"category_id": 8, "name": "8. Sınıf", "id": "UCPdN4Vx2DogwmjDJCkyVcXQ"},
    {"category_id": 9, "name": "9. Sınıf", "id": "UCnMkrwpqeeUdULISjn-_NGA"},
    {"category_id": 10, "name": "10. Sınıf", "id": "UC-5ku9Z61IGy12z8xVeFA6g"},
    {"category_id": 11, "name": "11. Sınıf", "id": "UCiuFKj-SmFf8M4m1ybbftCw"}
]

ydl_opts = {
    'extract_flat': True,
    'skip_download': True,
    'quiet': True,
    'no_warnings': True,
    'ignoreerrors': True,
    'retries': 5,
    'hl': 'tr',
    'gl': 'TR',
    'extractor_args': {'youtube': {'lang': ['tr']}}
}

output_data = {
    "categories": [],
    "series": []
}

series_id_counter = 1000

with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    for ch in channels:
        output_data["categories"].append({
            "category_id": str(ch["category_id"]),
            "category_name": ch["name"]
        })
        
        target_url = f"https://www.youtube.com/channel/{ch['id']}/playlists?hl=tr&gl=TR"
        ch_info = ydl.extract_info(target_url, download=False) or {}
        
        for pl in ch_info.get('entries', []):
            if not pl: continue
            pl_title = pl.get('title', '').replace('"', "'")
            
            if TARGET_YEAR not in pl_title and "2025" not in pl_title:
                continue
                
            pl_info = ydl.extract_info(f"https://www.youtube.com/playlist?list={pl.get('id')}&hl=tr&gl=TR", download=False) or {}
            entries = [e for e in pl_info.get('entries', []) if e]
            if not entries: continue
            
            cover = f"https://i.ytimg.com/vi/{entries[0].get('id')}/hqdefault.jpg"
            
            episodes = []
            for idx, v in enumerate(entries, start=1):
                vid = v.get('id')
                episodes.append({
                    "id": f"{series_id_counter}{idx}",
                    "episode_num": idx,
                    "title": v.get('title', f"Bölüm {idx}").replace('"', "'"),
                    "container_extension": "mp4",
                    "url": f"https://invidious.nerdvpn.de/latest_version?id={vid}&itag=22",
                    "info": {
                        "movie_image": f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg"
                    }
                })
                
            output_data["series"].append({
                "series_id": series_id_counter,
                "name": pl_title,
                "cover": cover,
                "category_id": str(ch["category_id"]),
                "category_name": ch["name"],
                "episodes": episodes
            })
            series_id_counter += 1

os.makedirs("data", exist_ok=True)
with open("data/data.json", "w", encoding="utf-8") as f:
    json.dump(output_data, f, ensure_ascii=False, indent=2)

print("[SUCCESS] Exported data/data.json")
