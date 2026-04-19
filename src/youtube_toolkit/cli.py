#!/usr/bin/env python3
"""
Command-line interface for youtube-toolkit.
"""

import sys
from .channel_lister import YouTubeChannelLister
from .downloader import SubtitleDownloader
from .converter import SubtitleToText


def list_videos():
    """CLI entry point for listing channel videos."""
    if len(sys.argv) < 2:
        print("Usage: yt-list <channel_url> [max_results]")
        print("Example: yt-list https://www.youtube.com/@channelname 10")
        sys.exit(1)

    channel_url = sys.argv[1]
    max_results = int(sys.argv[2]) if len(sys.argv) > 2 else None

    try:
        lister = YouTubeChannelLister()
        videos = lister.get_channel_videos(channel_url, max_results)

        print(f"\nFound {len(videos)} videos:\n")
        print("-" * 80)

        for i, video in enumerate(videos, 1):
            print(f"{i}. {video['title']}")
            print(f"   Published: {video['published_date']}")
            print(f"   URL: {video['url']}")
            print(f"   Description: {video['description']}")
            print("-" * 80)

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


def download_subtitles():
    """CLI entry point for downloading subtitles."""
    if len(sys.argv) < 2:
        print("Usage: yt-download <video_url> [language_codes]")
        print("\nExamples:")
        print("  yt-download https://www.youtube.com/watch?v=VIDEO_ID")
        print("  yt-download VIDEO_ID en,es")
        print("  yt-download VIDEO_ID --list")
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
            sys.exit(1)

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


def convert_to_text():
    """CLI entry point for converting subtitles to text."""
    if len(sys.argv) < 2:
        print("Usage: yt-convert <srt_file_or_directory> [output_file_or_directory] [--speakers]")
        print("\nExamples:")
        print("  yt-convert subtitles/video.en.srt")
        print("  yt-convert subtitles/video.en.srt output.txt")
        print("  yt-convert subtitles/ transcripts/")
        print("  yt-convert subtitles/ --speakers")
        sys.exit(1)

    import os
    input_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith('--') else None
    detect_speakers = '--speakers' in sys.argv

    converter = SubtitleToText()

    try:
        if os.path.isfile(input_path):
            if not output_path:
                output_path = input_path.replace('.srt', '.txt')

            text = converter.convert_file(input_path, output_path, detect_speakers)

            print(f"\n✓ Successfully converted subtitle to text!")
            print(f"Input:  {input_path}")
            print(f"Output: {output_path}")
            print(f"\nPreview (first 500 characters):")
            print("-" * 80)
            print(text[:500] + ("..." if len(text) > 500 else ""))
            print("-" * 80)

        elif os.path.isdir(input_path):
            output_files = converter.convert_directory(input_path, output_path, detect_speakers)

            print(f"\n✓ Converted {len(output_files)} file(s)")
            print(f"Output directory: {output_path or os.path.join(input_path, 'transcripts')}")

        else:
            print(f"Error: {input_path} is neither a file nor a directory")
            sys.exit(1)

    except Exception as e:
        print(f"\n✗ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    print("Please use the installed console scripts: yt-list, yt-download, yt-convert")
