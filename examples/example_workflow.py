#!/usr/bin/env python3
"""
Complete Workflow Example
Demonstrates the full pipeline: list videos -> download subtitles -> convert to text
"""

from youtube_lister import YouTubeChannelLister
from subtitle_downloader import SubtitleDownloader
from subtitle_to_text import SubtitleToText


def full_workflow_example():
    """
    Complete workflow: Get channel videos, download subtitles, convert to text.
    """
    # Step 1: Get videos from channel
    print("Step 1: Fetching videos from channel...")
    lister = YouTubeChannelLister()
    videos = lister.get_channel_videos("https://www.youtube.com/@TechWithTim", max_results=3)

    print(f"Found {len(videos)} videos\n")

    # Step 2: Download subtitles for each video
    print("Step 2: Downloading subtitles...")
    downloader = SubtitleDownloader(output_dir="subtitles")

    subtitle_files = []
    for i, video in enumerate(videos, 1):
        print(f"\n[{i}/{len(videos)}] {video['title']}")
        result = downloader.download_subtitles(
            video_url=video['video_id'],
            languages=['en'],
            format='srt'
        )

        if result['success']:
            print(f"  ✓ Downloaded {len(result['files'])} subtitle file(s)")
            subtitle_files.extend(result['files'])
        else:
            print(f"  ✗ Error: {result['error']}")

    # Step 3: Convert subtitles to text
    print("\n\nStep 3: Converting subtitles to readable text...")
    converter = SubtitleToText()

    text_files = []
    for subtitle_file in subtitle_files:
        output_file = subtitle_file.replace('subtitles/', 'transcripts/').replace('.srt', '.txt')
        try:
            converter.convert_file(subtitle_file, output_file)
            text_files.append(output_file)
            print(f"  ✓ Converted: {subtitle_file}")
        except Exception as e:
            print(f"  ✗ Error converting {subtitle_file}: {e}")

    # Summary
    print("\n" + "="*80)
    print("WORKFLOW COMPLETE")
    print("="*80)
    print(f"Videos processed: {len(videos)}")
    print(f"Subtitles downloaded: {len(subtitle_files)}")
    print(f"Text transcripts created: {len(text_files)}")
    print("\nTranscript files:")
    for tf in text_files:
        print(f"  - {tf}")


if __name__ == "__main__":
    full_workflow_example()
