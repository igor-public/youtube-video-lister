#!/usr/bin/env python3
"""
YouTube Subtitle Downloader
Downloads subtitles from YouTube videos in various formats.
"""

import os
import sys
from typing import Optional, List
import yt_dlp


class SubtitleDownloader:
    def __init__(self, output_dir: str = "subtitles"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def download_subtitles(
        self,
        video_url: str,
        languages: Optional[List[str]] = None,
        auto_generated: bool = True,
        format: str = "srt"
    ) -> dict:
        """
        Download subtitles for a YouTube video.

        Args:
            video_url: YouTube video URL or video ID
            languages: List of language codes (e.g., ['en', 'es']). None for all available.
            auto_generated: Include auto-generated subtitles
            format: Subtitle format (srt, vtt, json3)

        Returns:
            Dictionary with download status and file paths
        """
        if not video_url.startswith('http'):
            video_url = f"https://www.youtube.com/watch?v={video_url}"

        ydl_opts = {
            'skip_download': True,
            'writesubtitles': True,
            'writeautomaticsub': auto_generated,
            'subtitlesformat': format,
            'outtmpl': os.path.join(self.output_dir, '%(title)s.%(ext)s'),
            'no_warnings': True,  # Suppress warnings (PO token warnings don't affect subtitles)
        }

        if languages:
            ydl_opts['subtitleslangs'] = languages
        else:
            ydl_opts['allsubtitles'] = True

        result = {
            'success': False,
            'video_url': video_url,
            'files': [],
            'error': None
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=False)
                result['video_title'] = info.get('title', 'Unknown')
                result['video_id'] = info.get('id', 'Unknown')

                available_subs = info.get('subtitles', {})
                available_auto_subs = info.get('automatic_captions', {})

                if not available_subs and not available_auto_subs:
                    result['error'] = "No subtitles available for this video"
                    return result

                ydl.download([video_url])

                for lang in list(available_subs.keys()) + list(available_auto_subs.keys()):
                    subtitle_file = os.path.join(
                        self.output_dir,
                        f"{info['title']}.{lang}.{format}"
                    )
                    if os.path.exists(subtitle_file):
                        result['files'].append(subtitle_file)

                result['success'] = True
                result['languages_found'] = list(set(
                    list(available_subs.keys()) + list(available_auto_subs.keys())
                ))

        except Exception as e:
            result['error'] = str(e)

        return result

    def list_available_subtitles(self, video_url: str) -> dict:
        """
        List all available subtitles for a video without downloading.

        Args:
            video_url: YouTube video URL or video ID

        Returns:
            Dictionary with available subtitle languages
        """
        if not video_url.startswith('http'):
            video_url = f"https://www.youtube.com/watch?v={video_url}"

        ydl_opts = {
            'skip_download': True,
            'quiet': True,
            'no_warnings': True,
        }

        result = {
            'success': False,
            'manual_subtitles': [],
            'auto_subtitles': [],
            'error': None
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=False)

                result['video_title'] = info.get('title', 'Unknown')
                result['video_id'] = info.get('id', 'Unknown')
                result['manual_subtitles'] = list(info.get('subtitles', {}).keys())
                result['auto_subtitles'] = list(info.get('automatic_captions', {}).keys())
                result['success'] = True

        except Exception as e:
            result['error'] = str(e)

        return result


def main():
    """Example usage."""
    if len(sys.argv) < 2:
        print("Usage: python subtitle_downloader.py <video_url> [language_codes]")
        print("\nExamples:")
        print("  python subtitle_downloader.py https://www.youtube.com/watch?v=VIDEO_ID")
        print("  python subtitle_downloader.py VIDEO_ID en,es")
        print("  python subtitle_downloader.py VIDEO_ID --list")
        sys.exit(1)

    video_url = sys.argv[1]
    downloader = SubtitleDownloader()

    if len(sys.argv) > 2 and sys.argv[2] == '--list':
        print(f"Checking available subtitles for: {video_url}\n")
        result = downloader.list_available_subtitles(video_url)

        if result['success']:
            print(f"Video: {result['video_title']}")
            print(f"Video ID: {result['video_id']}\n")

            if result['manual_subtitles']:
                print("Manual Subtitles:")
                for lang in result['manual_subtitles']:
                    print(f"  - {lang}")
            else:
                print("Manual Subtitles: None")

            print()

            if result['auto_subtitles']:
                print("Auto-Generated Subtitles:")
                for lang in result['auto_subtitles']:
                    print(f"  - {lang}")
            else:
                print("Auto-Generated Subtitles: None")
        else:
            print(f"Error: {result['error']}")

    else:
        languages = None
        if len(sys.argv) > 2:
            languages = sys.argv[2].split(',')

        print(f"Downloading subtitles for: {video_url}")
        if languages:
            print(f"Languages: {', '.join(languages)}")
        else:
            print("Languages: All available")

        result = downloader.download_subtitles(video_url, languages)

        if result['success']:
            print(f"\n✓ Successfully downloaded subtitles!")
            print(f"Video: {result['video_title']}")
            print(f"Video ID: {result['video_id']}")
            print(f"Languages found: {', '.join(result['languages_found'])}")
            print(f"\nDownloaded files:")
            for file in result['files']:
                print(f"  - {file}")
        else:
            print(f"\n✗ Error: {result['error']}")
            sys.exit(1)


if __name__ == "__main__":
    main()
