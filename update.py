from datetime import datetime
import yt_dlp

# Automatically uses current year (2026, 2027, etc.)
TARGET_YEAR = str(datetime.now().year)

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
ydl_opts = {
    'extract_flat': 'in_playlist',
    'skip_download': True,
    'quiet': True,
    'no_warnings': True,
    'ignoreerrors': True,
    'retries': 3,
    'http_headers': {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
    }
}

print(f"[INFO] Target Year Filter: {TARGET_YEAR}")

with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    for channel in channels:
        print(f"[PROCESSING] Scanning channel: {channel['name']}...")
        try:
            target_url = f"https://www.youtube.com/channel/{channel['id']}/playlists"
            channel_info = ydl.extract_info(target_url, download=False)
            
            if not channel_info or 'entries' not in channel_info:
                print(f" -> [WARNING] Could not resolve channel structure for {channel['name']}.")
                continue
                
            playlist_count = 0
            for playlist_entry in channel_info['entries']:
                if not playlist_entry:
                    continue
                    
                playlist_id = playlist_entry.get('id')
                playlist_title = playlist_entry.get('title', 'Oynatma Listesi').replace('"', "'")
                
                # Year filter check
                if TARGET_YEAR not in playlist_title:
                    continue
                
                if not playlist_id:
                    continue
                    
                print(f"   -> Playlist Found ({TARGET_YEAR}): {playlist_title}")
                playlist_count += 1
                
                playlist_url = f"https://www.youtube.com/playlist?list={playlist_id}"
                playlist_info = ydl.extract_info(playlist_url, download=False)
                
                if not playlist_info or 'entries' not in playlist_info:
                    continue
                    
                episode_num = 1
                for video_entry in playlist_info['entries']:
                    if not video_entry:
                        continue
                    
                    video_id = video_entry.get('id')
                    video_title = video_entry.get('title', 'Ders Videosu').replace('"', "'")
                    
                    if not video_id:
                        continue
                        
                    # TV Show parameters for TiviMate
                    logo = f'tvg-logo="https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg"'
                    group = f'group-title="{channel["name"]}"'
                    series = f'series-name="{playlist_title}"'
                    season_str = 'season="1"'
                    episode_str = f'episode="{episode_num}"'
                    tv_type = 'tvg-type="tvshow"'
                    
                    # S01E0X prefix ensures TiviMate groups it into Series format
                    m3u_content += f'#EXTINF:-1 {tv_type} {logo} {group} {series} {season_str} {episode_str},S01E{episode_num:02d} - {video_title}\n'
                    m3u_content += f'https://www.youtube.com/watch?v={video_id}\n'
                    
                    episode_num += 1
            
            print(f"[SUCCESS] Added {playlist_count} playlists for {channel['name']}.")
                    
        except Exception as e:
            print(f"[ERROR] Unexpected error: {str(e)}")
            continue

with open("tonguc_egitim.m3u", "w", encoding="utf-8") as f:
    f.write(m3u_content)

print(f"[DONE] 'tonguc_egitim.m3u' updated for {TARGET_YEAR}!")
