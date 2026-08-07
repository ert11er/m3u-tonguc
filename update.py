import json
import os
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
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
    'extract_flat': 'in_playlist',
    'skip_download': True,
    'quiet': True,
    'no_warnings': True,
    'ignoreerrors': True,
    'retries': 3,
    'hl': 'tr',
    'gl': 'TR'
}

def process_playlist(pl, category_id, category_name, ydl):
    if not pl:
        return None
    
    pl_id = pl.get('id')
    raw_pl_title = pl.get('title') or "Oynatma Listesi"
    pl_title = str(raw_pl_title).replace('"', "'")
    
    if not pl_id:
        return None

    pl_url = f"https://www.youtube.com/playlist?list={pl_id}"
    try:
        pl_info = ydl.extract_info(pl_url, download=False) or {}
    except Exception:
        return None

    entries = [e for e in (pl_info.get('entries') or []) if e]
    if not entries:
        return None

    first_vid_id = entries[0].get('id')
    cover = f"https://i.ytimg.com/vi/{first_vid_id}/hqdefault.jpg" if first_vid_id else ""

    episodes = []
    for idx, v in enumerate(entries, start=1):
        vid = v.get('id')
        if not vid:
            continue

        raw_v_title = v.get('title') or f"Bölüm {idx}"
        v_title = str(raw_v_title).replace('"', "'")

        episodes.append({
            "id": f"{pl_id}_{idx}",
            "episode_num": idx,
            "title": v_title,
            "container_extension": "mp4",
            "url": f"https://invidious.nerdvpn.de/latest_version?id={vid}&itag=22",
            "info": {
                "movie_image": f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg"
            }
        })

    if episodes:
        return {
            "name": pl_title,
            "cover": cover,
            "category_id": str(category_id),
            "category_name": category_name,
            "episodes": episodes
        }
    return None

def main():
    print("[START] Hızlı tarama başlatıldı...")
    output_data = {"categories": [], "series": []}
    
    for ch in channels:
        output_data["categories"].append({
            "category_id": str(ch["category_id"]),
            "category_name": ch["name"]
        })

    all_series = []
    series_id_counter = 1000

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        for ch in channels:
            print(f"[CHANNEL] Taraniyor: {ch['name']}...")
            target_url = f"https://www.youtube.com/channel/{ch['id']}/playlists"
            try:
                ch_info = ydl.extract_info(target_url, download=False) or {}
            except Exception as e:
                print(f"  [ERROR] {ch['name']} alınamadı: {e}")
                continue

            raw_playlists = ch_info.get('entries', [])
            print(f"  [INFO] {ch['name']} için {len(raw_playlists)} oynatma listesi bulundu. Paralel çekiliyor...")

            with ThreadPoolExecutor(max_workers=8) as executor:
                futures = [
                    executor.submit(process_playlist, pl, ch["category_id"], ch["name"], ydl)
                    for pl in raw_playlists
                ]
                
                for future in as_completed(futures):
                    result = future.result()
                    if result:
                        result["series_id"] = series_id_counter
                        all_series.append(result)
                        series_id_counter += 1

    output_data["series"] = all_series

    # 1. JSON Çıktısı Yaz
    os.makedirs("data", exist_ok=True)
    with open("data/data.json", "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    # 2. M3U Çıktısı Yaz
    m3u_content = '#EXTM3U x-tvg-url="" tvg-type="series"\n'
    for s in all_series:
        for ep in s["episodes"]:
            m3u_content += (
                f'#EXTINF:-1 tvg-logo="{ep["info"]["movie_image"]}" '
                f'group-title="{s["category_name"]}" '
                f'series-name="{s["name"]}" '
                f'tvg-name="{s["name"]}" '
                f'season="1" episode="{ep["episode_num"]}" '
                f'cmd="series" tvg-type="series",S01E{ep["episode_num"]:02d} - {ep["title"]}\n'
            )
            m3u_content += f'#EXTGRP:{s["category_name"]}\n'
            m3u_content += f'{ep["url"]}\n'

    with open("playlist.m3u", "w", encoding="utf-8") as f:
        f.write(m3u_content)

    print(f"[DONE] Toplam {len(all_series)} Seri Kaydedildi! (data.json & playlist.m3u)")

if __name__ == "__main__":
    main()
