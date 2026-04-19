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


def parse_channels(channels_config, settings):
    """
    Parse channel configuration supporting both formats:
    - Simple: ["url1", "url2"] (uses default settings)
    - Detailed: [{"url": "url1", "days_back": 14, "languages": ["en"]}, ...]
    """
    default_days_back = settings.get('default_days_back', settings.get('days_back', 7))
    default_languages = settings.get('default_languages', settings.get('languages', ['en']))

    parsed_channels = []

    for channel in channels_config:
        if isinstance(channel, str):
            # Simple format: just URL string
            parsed_channels.append({
                'url': channel,
                'days_back': default_days_back,
                'languages': default_languages
            })
        elif isinstance(channel, dict):
            # Detailed format: dict with settings
            parsed_channels.append({
                'url': channel.get('url'),
                'days_back': channel.get('days_back', default_days_back),
                'languages': channel.get('languages', default_languages)
            })
        else:
            print(f"Warning: Invalid channel format: {channel}")

    return parsed_channels


def main():
    """Main function to monitor channels from config."""
    config_file = sys.argv[1] if len(sys.argv) > 1 else "channels_config.json"

    print(f"Loading configuration from: {config_file}")
    config = load_config(config_file)

    channels_config = config.get('channels', [])
    settings = config.get('settings', {})
    output_dir = settings.get('output_directory', 'channel_data')

    if not channels_config:
        print("Error: No channels specified in configuration file.")
        sys.exit(1)

    # Parse channels with their individual settings
    channels = parse_channels(channels_config, settings)

    print(f"\nMonitoring {len(channels)} channel(s):")
    for channel in channels:
        url_display = channel['url'].split('/')[-1] if '/' in channel['url'] else channel['url']
        print(f"  - {url_display}")
        print(f"    Days back: {channel['days_back']}")
        print(f"    Languages: {', '.join(channel['languages'])}")
    print(f"\nOutput directory: {output_dir}")
    print()

    # Initialize monitor
    monitor = ChannelMonitor(output_base_dir=output_dir)

    # Process each channel with its own settings
    results = []
    for i, channel in enumerate(channels, 1):
        print(f"\n{'#'*80}")
        print(f"Channel {i}/{len(channels)}")
        print(f"{'#'*80}")

        result = monitor.process_channel(
            channel_url=channel['url'],
            days_back=channel['days_back'],
            languages=channel['languages']
        )
        results.append(result)

    # Display and save summary
    summary = monitor.generate_summary_report(results)
    print(summary)

    summary_file = Path(output_dir) / "processing_summary.txt"
    with open(summary_file, 'w') as f:
        f.write(summary)
    print(f"Summary saved to: {summary_file}")


if __name__ == "__main__":
    main()
