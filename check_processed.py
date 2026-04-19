#!/usr/bin/env python3
"""
Utility to check which videos have already been processed.
"""

import os
import sys
from pathlib import Path
from collections import defaultdict


def scan_processed_videos(channel_data_dir: str = "channel_data"):
    """
    Scan the channel_data directory for processed videos.

    Args:
        channel_data_dir: Base directory containing channel data

    Returns:
        Dictionary with channel names and their processed videos
    """
    if not os.path.exists(channel_data_dir):
        print(f"Directory '{channel_data_dir}' does not exist.")
        return {}

    processed = defaultdict(list)

    # Scan each channel directory
    for channel_name in os.listdir(channel_data_dir):
        channel_path = os.path.join(channel_data_dir, channel_name)

        if not os.path.isdir(channel_path):
            continue

        transcripts_dir = os.path.join(channel_path, 'transcripts')

        if not os.path.exists(transcripts_dir):
            continue

        # List all transcript files
        for filename in os.listdir(transcripts_dir):
            if filename.endswith('.md'):
                file_path = os.path.join(transcripts_dir, filename)
                file_stat = os.stat(file_path)

                # Parse filename: YYYY-MM-DD_Video_Title.md
                parts = filename.split('_', 1)
                if len(parts) == 2:
                    date = parts[0]
                    title = parts[1].replace('.md', '').replace('_', ' ')

                    processed[channel_name].append({
                        'date': date,
                        'title': title,
                        'filename': filename,
                        'size': file_stat.st_size,
                        'path': file_path
                    })

    # Sort by date (newest first)
    for channel in processed:
        processed[channel].sort(key=lambda x: x['date'], reverse=True)

    return dict(processed)


def display_summary(processed: dict):
    """Display a summary of processed videos."""
    if not processed:
        print("\nNo processed videos found.\n")
        return

    total_videos = sum(len(videos) for videos in processed.values())
    total_size = sum(
        sum(v['size'] for v in videos)
        for videos in processed.values()
    )

    print("\n" + "="*80)
    print("PROCESSED VIDEOS SUMMARY")
    print("="*80)
    print(f"\nTotal channels: {len(processed)}")
    print(f"Total videos: {total_videos}")
    print(f"Total size: {total_size / 1024:.1f} KB ({total_size / 1024 / 1024:.2f} MB)")
    print()

    for channel_name, videos in processed.items():
        print(f"\n📺 {channel_name}")
        print(f"   Videos processed: {len(videos)}")

        if videos:
            oldest = videos[-1]['date']
            newest = videos[0]['date']
            print(f"   Date range: {oldest} to {newest}")

            # Show first 5 videos
            print(f"\n   Recent videos:")
            for i, video in enumerate(videos[:5], 1):
                size_kb = video['size'] / 1024
                print(f"   {i}. [{video['date']}] {video['title'][:60]}")
                print(f"      File: {video['filename']}")
                print(f"      Size: {size_kb:.1f} KB")

            if len(videos) > 5:
                print(f"\n   ... and {len(videos) - 5} more video(s)")

    print("\n" + "="*80 + "\n")


def display_detailed(processed: dict, channel_name: str = None):
    """Display detailed list of processed videos."""
    if not processed:
        print("\nNo processed videos found.\n")
        return

    if channel_name:
        if channel_name not in processed:
            print(f"\nChannel '{channel_name}' not found.\n")
            return
        channels_to_show = {channel_name: processed[channel_name]}
    else:
        channels_to_show = processed

    for channel, videos in channels_to_show.items():
        print(f"\n{'='*80}")
        print(f"Channel: {channel}")
        print(f"{'='*80}\n")

        for i, video in enumerate(videos, 1):
            print(f"{i}. {video['title']}")
            print(f"   Date: {video['date']}")
            print(f"   File: {video['filename']}")
            print(f"   Size: {video['size'] / 1024:.1f} KB")
            print(f"   Path: {video['path']}")
            print()


def main():
    """Main function."""
    if len(sys.argv) > 1:
        if sys.argv[1] == '--detailed' or sys.argv[1] == '-d':
            channel_name = sys.argv[2] if len(sys.argv) > 2 else None
            processed = scan_processed_videos()
            display_detailed(processed, channel_name)
        elif sys.argv[1] == '--help' or sys.argv[1] == '-h':
            print("\nUsage: python check_processed.py [options] [channel_name]")
            print("\nOptions:")
            print("  (none)              Show summary of all processed videos")
            print("  -d, --detailed      Show detailed list of all videos")
            print("  -d <channel>        Show detailed list for specific channel")
            print("  -h, --help          Show this help message")
            print("\nExamples:")
            print("  python check_processed.py")
            print("  python check_processed.py --detailed")
            print("  python check_processed.py --detailed TechWithTim")
            print()
        else:
            print(f"Unknown option: {sys.argv[1]}")
            print("Use --help for usage information")
    else:
        processed = scan_processed_videos()
        display_summary(processed)


if __name__ == "__main__":
    main()
