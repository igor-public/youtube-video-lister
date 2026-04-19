#!/usr/bin/env python3
"""
Monitor YouTube channels using a JSON configuration file.
"""

import json
import sys
from pathlib import Path
from src.youtube_toolkit.monitor import ChannelMonitor


def load_config(config_file: str = "channels_config.json"):
    """Load configuration from JSON file."""
    config_path = Path(config_file)

    if not config_path.exists():
        print(f"Error: Configuration file '{config_file}' not found.")
        print("\nCreate one by copying the example:")
        print("  cp channels_config.example.json channels_config.json")
        print("\nThen edit channels_config.json to add your channels.")
        sys.exit(1)

    with open(config_path, 'r') as f:
        return json.load(f)


def main():
    """Main function to monitor channels from config."""
    config_file = sys.argv[1] if len(sys.argv) > 1 else "channels_config.json"

    print(f"Loading configuration from: {config_file}")
    config = load_config(config_file)

    channels = config.get('channels', [])
    settings = config.get('settings', {})

    days_back = settings.get('days_back', 7)
    languages = settings.get('languages', ['en'])
    output_dir = settings.get('output_directory', 'channel_data')

    if not channels:
        print("Error: No channels specified in configuration file.")
        sys.exit(1)

    print(f"\nMonitoring {len(channels)} channel(s):")
    for channel in channels:
        print(f"  - {channel}")
    print(f"\nSettings:")
    print(f"  Days back: {days_back}")
    print(f"  Languages: {', '.join(languages)}")
    print(f"  Output directory: {output_dir}")
    print()

    # Initialize and run monitor
    monitor = ChannelMonitor(output_base_dir=output_dir)
    results = monitor.process_multiple_channels(channels, days_back, languages)

    # Display and save summary
    summary = monitor.generate_summary_report(results)
    print(summary)

    summary_file = Path(output_dir) / "processing_summary.txt"
    with open(summary_file, 'w') as f:
        f.write(summary)
    print(f"Summary saved to: {summary_file}")


if __name__ == "__main__":
    main()
