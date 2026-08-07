from datetime import datetime
import yt_dlp

# Automatically uses current year (e.g. 2026)
TARGET_YEAR = str(datetime.now().year)

channels = [
    {"name": "1. Sınıf", "id": "UCyRSGDRdOroDN6vXtobLTfw"},
    {"name": "2. Sınıf", "id": "UCkI5pnECWXuniFCQpe6nWQw"},
    {"name": "3. Sınıf", "id": "UCWKFn2p0uodV8JCdsYtGLIw"},
    {"name": "4. Sınıf", "id": "UCK4MoKPUA5lJjiO18yc_YMA"},
    {"name": "5. Sınıf", "id": "UCb-0JQ4tI03T5rHdFe2GVoA"},
    {"name": "6. Sınıf", "id": "UCntJ4oa66gOoonxnJ5MWduQ"},
    {"name": "7. Sınıf", "id": "UCI5Ir6-br-HM54InF7HUlzg"},
    {"name": "8. Sınıf", "id": "UCPdN4Vx2DogwmjDJCkyVcXQ"},
    {"name": "9. Sınıf", "id": "UCnMkrwpqeeUdULISjn-_NGA"},
    {"name": "10. Sınıf", "id": "UC-5ku9Z61IGy12z8xVeFA6g"},
    {"name": "11. Sınıf", "id": "UCiuFKj-SmFf8M4m1ybbftCw"}
]

# Standard M3U header declaring VOD support
m3u_content = '#EXTM3U x-tvg-url="" tvg-type="vod"\n'

ydl_opts = {
    'extract_flat': 'in_playlist',
    'skip_download': True,
    'quiet': True,
    'no_warnings': True,
    'ignoreerrors': True,
    'retries': 3,
    'hl': 'tr',
    'gl': 'tr',
    'http_headers': {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept-Language': 'tr-TR,tr;q=0.9',
    }
}

print(f"[INFO] Target Year Filter: {TARGET_YEAR}")

with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    for channel in channels:
        print(f"[PROCESSING] Scanning channel: {channel['name']}...")
        try:
            target_url = f"https://www.youtube.com/channel/{channel['id']}/playlists?hl=tr&gl=tr"
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
                
                # Filter by year
                if TARGET_YEAR not in playlist_title:
                    continue
                
                if not playlist_id:
                    continue
                    
                print(f"   -> Playlist Found ({TARGET_YEAR}): {playlist_title}")
                playlist_count += 1
                
                playlist_url = f"https://www.youtube.com/playlist?list={playlist_id}&hl=tr&gl=tr"
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
                        
                    logo = f'tvg-logo="https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg"'
                    
                    # Category naming: "Grade Level / Course Name"
                    category_name = f"{channel['name']} - {playlist_title}"
                    
                    # Direct stream URL for M3U compatibility
                    stream_url = f"https://invidious.nerdvpn.de/latest_version?id={video_id}&itag=22"
                    
                    # Universal TV Show / VOD Metadata Format:
                    # - group-title and #EXTGRP for categorization
                    # - series-name, season, episode for TV series grouping
                    # - S01E0X prefix in the title for regex-based parsers
                    m3u_content += (
                        f'#EXTINF:-1 {logo} group-title="{category_name}" '
                        f'series-name="{playlist_title}" season="1" episode="{episode_num}" '
                        f'tvg-type="tvshow",S01E{episode_num:02d} - {video_title}\n'
                    )
                    m3u_content += f'#EXTGRP:{category_name}\n'
                    m3u_content += f'{stream_url}\n'
                    
                    episode_num += 1
            
            print(f"[SUCCESS] Added {playlist_count} playlists for {channel['name']}.")
                    
        except Exception as e:
            print(f"[ERROR] Unexpected error: {str(e)}")
            continue

with open("tonguc_egitim.m3u", "w", encoding="utf-8") as f:
    f.write(m3u_content)

print(f"[DONE] 'tonguc_egitim.m3u' updated successfully!")
