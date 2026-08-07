from datetime import datetime
import yt_dlp

# Otomatik yıl alma (2026)
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

m3u_content = '#EXTM3U x-tvg-url="" tvg-type="tvshow"\n'

# yt-dlp Türkçe zorlama konfigürasyonu
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
    'http_headers': {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8',
        'Cookie': 'PREF=hl=tr&gl=TR;'
    }
}

print(f"[BİLGİ] Hedef Yıl Filtresi: {TARGET_YEAR}")

with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    for channel in channels:
        print(f"[İŞLEM] {channel['name']} taranıyor...")
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
                
                # Sadece hedef yılı içeren listeleri alma
                if TARGET_YEAR not in playlist_title:
                    continue
                
                if not playlist_id:
                    continue
                    
                print(f"   -> Oynatma Listesi Keşfedildi: {playlist_title}")
                playlist_count += 1
                
                playlist_url = f"https://www.youtube.com/playlist?list={playlist_id}&hl=tr&gl=TR"
                playlist_info = ydl.extract_info(playlist_url, download=False)
                
                if not playlist_info or 'entries' not in playlist_info:
                    continue
                    
                # İlk videonun görselini dizinin kapak resmi yap
                first_video_id = ""
                for v in playlist_info['entries']:
                    if v and v.get('id'):
                        first_video_id = v.get('id')
                        break
                
                poster_url = f"https://i.ytimg.com/vi/{first_video_id}/maxresdefault.jpg" if first_video_id else ""

                episode_num = 1
                for video_entry in playlist_info['entries']:
                    if not video_entry:
                        continue
                    
                    video_id = video_entry.get('id')
                    video_title = video_entry.get('title', 'Ders Videosu').replace('"', "'").replace(',', '')
                    
                    if not video_id:
                        continue
                        
                    stream_url = f"https://invidious.nerdvpn.de/latest_version?id={video_id}&itag=22"
                    
                    # DIZILER (SERIES) FORMATI:
                    # group-title = Kategori (Örn: 10. Sınıf)
                    # series-name = Dizi Adı (Örn: 10. Sınıf Coğrafya 1. Dönem)
                    # season & episode = Bölüm yapılandırması
                    # Kart başlığına S01E01 koymuyoruz ki dizi adı sanmasın!
                    
                    m3u_content += (
                        f'#EXTINF:-1 tvg-logo="{poster_url}" '
                        f'group-title="{channel["name"]}" '
                        f'series-name="{playlist_title}" '
                        f'tvg-name="{playlist_title}" '
                        f'season="1" episode="{episode_num}" '
                        f'tvg-type="tvshow",{video_title}\n'
                    )
                    m3u_content += f'#EXTGRP:{channel["name"]}\n'
                    m3u_content += f'{stream_url}\n'
                    
                    episode_num += 1
            
            print(f"[BAŞARI] {channel['name']} için {playlist_count} adet Dizi eklendi.")
                    
        except Exception as e:
            print(f"[HATA] Beklenmedik hata: {str(e)}")
            continue

with open("tonguc_egitim.m3u", "w", encoding="utf-8") as f:
    f.write(m3u_content)

print("[BİTTİ] 'tonguc_egitim.m3u' güncellendi!")
