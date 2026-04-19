#!/usr/bin/env python3
"""
Main script to monitor YouTube channels and extract video scripts.
"""

from src.youtube_toolkit.monitor import ChannelMonitor


def main():
    """Monitor YouTube channels for new videos and extract scripts."""

    # Configuration
    channels = [
        "https://www.youtube.com/@TechWithTim",
        # Add more channels here
    ]

    days_back = 7  # Look back 7 days
    languages = ['en']  # English subtitles

    # Initialize monitor
    monitor = ChannelMonitor(output_base_dir="channel_data")

    # Process channels
    print(f"\nMonitoring {len(channels)} channel(s) for videos from last {days_back} days...")
    results = monitor.process_multiple_channels(channels, days_back, languages)

    # Display summary
    summary = monitor.generate_summary_report(results)
    print(summary)

    # Save summary to file
    with open("channel_data/processing_summary.txt", 'w') as f:
        f.write(summary)
    print("Summary saved to: channel_data/processing_summary.txt")


if __name__ == "__main__":
    main()
