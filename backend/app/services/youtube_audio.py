import re
import os
import yt_dlp
from typing import Dict, Any

def extract_video_id(url: str) -> str:
    """
    Extract video ID from various YouTube URL formats
    """
    patterns = [
        r"(?:v=|\/)([0-9A-Za-z_-]{11}).*",
        r"youtu\.be\/([0-9A-Za-z_-]{11})",
        r"embed\/([0-9A-Za-z_-]{11})"
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
            
    raise ValueError("Invalid YouTube URL")

def download_youtube_audio(url: str, output_dir: str) -> Dict[str, Any]:
    """
    Download audio from YouTube video using yt-dlp
    
    Returns:
        Dict with video metadata and audio file path
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    ydl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'outtmpl': os.path.join(output_dir, '%(id)s.%(ext)s'),
        'quiet': True,
        'no_warnings': True,
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        audio_file = ydl.prepare_filename(info).replace('.webm', '.mp3').replace('.m4a', '.mp3')
        
        return {
            "video_id": info['id'],
            "title": info['title'],
            "duration_seconds": info.get('duration', 0),
            "uploader": info.get('uploader', 'Unknown'),
            "thumbnail": info.get('thumbnail', ''),
            "audio_file": audio_file,
            "url": url
        }
