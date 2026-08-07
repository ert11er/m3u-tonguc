import os
import json
import subprocess

channels = [
    {"name": "1. sınıf", "id": "UCyRSGDRdOroDN6vXtobLTfw"},
    {"name": "2. sınıf", "id": "UCkI5pnECWXuniFCQpe6nWQw"},
    {"name": "3. Sınıf", "id": "UCWKFn2p0uodV8JCdsYtGLIw"},
    {"name": "4. sınıf", "id": "UCK4MoKPUA5lJjiO18yc_YMA"},
    {"name": "5. sınıf", "id": "UCb-0JQ4tI03T5rHdFe2GVoA"},
    {"name": "6. sınıf", "id": "UCntJ4oa66gOoonxnJ5MWduQ"},
    {"name": "7. sınıf", "id": "UCI5Ir6-br-HM54InF7HUlzg"},
    {"name": "8. sınıf", "id": "UCPdN4Vx2DogwmjDJCkyVcXQ"},
    {"name": "9. sınıf", "id": "UCnMkrwpqeeUdULISjn-_NGA"},
    {"name": "10. sınıf", "id": "UC-5ku9Z61IGy12z8xVeFA6g"},
    {"name": "11. sınıf", "id": "UCiuFKj-SmFf8M4m1ybbftCw"}
]

m3u_content = "#EXTM3U\n"

for channel in channels:
    print(f"[İŞLEM] {channel['name']} kanalı taranıyor...")
    
    # yt-dlp ile kanalın içindeki tüm oynatma listelerinin ID ve Başlık bilgisini tek seferde çekiyoruz
    cmd_playlists = [
        "yt-dlp", "--flat-playlist", "--dump-single-json", 
        f"https://youtube.com{channel['id']}/playlists"
    ]
    
    try:
        res_playlists = subprocess.run(cmd_playlists, capture_output=True, text=True, check=True)
        data_playlists = json.loads(res_playlists.stdout)
        
        if "entries" not in data_playlists:
            continue
            
        for playlist in data_playlists["entries"]:
            playlist_id = playlist.get("id")
            playlist_title = playlist.get("title", "Oynatma Listesi").replace('"', "'")
            
            if not playlist_id:
                continue
                
            print(f" -> Oynatma listesi bulundu: {playlist_title}")
            
            # Bulunan oynatma listesinin içindeki videoları çekiyoruz
            cmd_videos = [
                "yt-dlp", "--flat-playlist", "--dump-single-json",
                f"https://youtube.com{playlist_id}"
            ]
            
            res_videos = subprocess.run(cmd_videos, capture_output=True, text=True, check=True)
            data_videos = json.loads(res_videos.stdout)
            
            if "entries" not in data_videos:
                continue
                
            episode_num = 1
            for video in data_videos["entries"]:
                video_id = video.get("id")
                video_title = video.get("title", "Ders Videosu").replace('"', "'")
                
                if not video_id:
                    continue
                    
                logo = f'tvg-logo="https://youtube.com{video_id}/maxresdefault.jpg"'
                group = f'group-title="{channel["name"]}"'
                series = f'series-name="{playlist_title}"'
                season_str = 'season="1"'
                episode_str = f'episode="{episode_num}"'
                
                m3u_content += f'#EXTINF:-1 {logo} {group} {series} {season_str} {episode_str},{video_title}\n'
                m3u_content += f'https://youtube.com{video_id}\n'
                
                episode_num += 1
                
    except Exception as e:
        print(f"[HATA] {channel['name']} işleminde sorun çıktı: {e}")
        continue

# Sonucu M3U dosyasına kaydet
with open("tonguc_egitim.m3u", "w", encoding="utf-8") as f:
    f.write(m3u_content)

print("[TAMAMLANDI] m3u dosyası başarıyla güncellendi.")
