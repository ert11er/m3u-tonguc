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

# Dosyayı sıfırdan oluşturup başlığı yazıyoruz
with open("tonguc_egitim.m3u", "w", encoding="utf-8") as f:
    f.write("#EXTM3U\n")

for channel in channels:
    print(f"[İŞLEM] {channel['name']} için tüm oynatma listeleri taranıyor...")
    
    # yt-dlp'nin akıllı şablon sistemi ile doğrudan M3U satırlarını çıktı alıyoruz
    # Her oynatma listesini (playlist) IPTV için bağımsız bir dizi (series-name) yapar.
    template = (
        '#EXTINF:-1 tvg-logo="https://youtube.com" '
        f'group-title="{channel["name"]}" '
        'series-name="%(playlist_title)s" season="1" episode="%(playlist_index)s",%(title)s\n'
        'https://youtube.com'
    )
    
    cmd = [
        "yt-dlp",
        "--flat-playlist",
        "--print", template,
        f"https://youtube.com{channel['id']}/playlists"
    ]
    
    try:
        # Çıktıları doğrudan dosyaya ekliyoruz (append modu)
        with open("tonguc_egitim.m3u", "a", encoding="utf-8") as f:
            subprocess.run(cmd, stdout=f, stderr=subprocess.DEVNULL, text=True, check=True)
    except Exception as e:
        print(f"[HATA] {channel['name']} işlenirken bir sorun oluştu, sonraki kanala geçiliyor.")
        continue

print("[BAŞARI] 'tonguc_egitim.m3u' dosyası tüm oynatma listeleriyle birlikte dolduruldu!")
