import os
from datetime import datetime
import yt_dlp

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

os.makedirs("sources", exist_ok=True)

# Master M3U8 Header with VOD / Series directives
master_m3u8 = (
    '#EXTM3U\n'
    '#EXT-X-SESSION-TYPE:VOD\n'
    '#EXT-X-CONTENT-TYPE:SERIES\n'
)

ydl_opts = {
    'extract_flat': 'in_playlist',
    'skip_download': True,
    'quiet': True,
    'no_warnings': True,
    'ignoreerrors': True,
    'retries': 3,
    'hl': 'tr',
    'gl': 'TR',
    'geo_bypass': True,
    'extractor_args': {
        'youtube': {
            'lang': ['tr'],
            'skip': ['dash', 'hls']
        }
    },
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
            target_url = f"https://www.youtube.com/channel/{channel['id']}/playlists?hl=tr&gl=TR"
            channel_info = ydl.extract_info(target_url, download=False)
            
            if not channel_info or 'entries' not in channel_info:
                continue
                
            playlist_count = 0
            for playlist_entry in channel_info['entries']:
                if not playlist_entry:
                    continue
                    
                playlist_id = playlist_entry.get('id')
                playlist_title = playlist_entry.get('title', 'Oynatma Listesi').replace('"', "'").replace(',', '')
                
                if TARGET_YEAR not in playlist_title:
                    continue
                
                if not playlist_id:
                    continue
                    
                print(f"   -> Generating Series: {playlist_title}")
                playlist_count += 1
                
                playlist_url = f"https://www.youtube.com/playlist?list={playlist_id}&hl=tr&gl=TR"
                playlist_info = ydl.extract_info(playlist_url, download=False)
                
                if not playlist_info or 'entries' not in playlist_info:
                    continue
                    
                clean_filename = f"{playlist_id}.m3u"
                sub_m3u_path = os.path.join("sources", clean_filename)
                
                # Sub-playlist header configured for VOD episodes
                sub_m3u_content = (
                    '#EXTM3U\n'
                    '#EXT-X-PLAYLIST-TYPE:VOD\n'
                    '#EXT-X-TARGETDURATION:3600\n'
                )
                
                first_video_id = ""
                episode_num = 1
                
                for video_entry in playlist_info['entries']:
                    if not video_entry:
                        continue
                    
                    video_id = video_entry.get('id')
                    video_title = video_entry.get('title', 'Ders Videosu').replace('"', "'").replace(',', '')
                    
                    if not video_id:
                        continue
                        
                    if not first_video_id:
                        first_video_id = video_id
                        
                    stream_url = f"https://invidious.nerdvpn.de/latest_version?id={video_id}&itag=22"
                    
                    sub_m3u_content += (
                        f'#EXTINF:-1 tvg-logo="https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg" '
                        f'group-title="{channel["name"]}" '
                        f'series-name="{playlist_title}" '
                        f'tvg-type="series" '
                        f'season="1" episode="{episode_num}",S01E{episode_num:02d} - {video_title}\n'
                    )
                    sub_m3u_content += f'{stream_url}\n'
                    episode_num += 1
                
                with open(sub_m3u_path, "w", encoding="utf-8") as f:
                    f.write(sub_m3u_content)
                
                poster_url = f"https://i.ytimg.com/vi/{first_video_id}/maxresdefault.jpg" if first_video_id else ""
                
                # Entry in the Master Playlist explicitly defined as a Series item
                master_m3u8 += (
                    f'#EXTINF:-1 tvg-logo="{poster_url}" '
                    f'group-title="{channel["name"]}" '
                    f'series-name="{playlist_title}" '
                    f'tvg-name="{playlist_title}" '
                    f'tvg-type="series" '
                    f'type="series",{playlist_title}\n'
                )
                master_m3u8 += f'sources/{clean_filename}\n'
            
            print(f"[SUCCESS] Configured {playlist_count} Series for {channel['name']}.")
                    
        except Exception as e:
            print(f"[ERROR] Unexpected error: {str(e)}")
            continue

with open("tonguc_egitim.m3u8", "w", encoding="utf-8") as f:
    f.write(master_m3u8)

print("[DONE] Master Playlist 'tonguc_egitim.m3u8' updated!")
