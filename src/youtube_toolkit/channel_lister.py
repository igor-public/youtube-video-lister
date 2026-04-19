#!/usr/bin/env python3
"""
YouTube Channel Video Lister
Fetches and lists all videos from a YouTube channel with publication dates.
"""

import os
import re
from datetime import datetime
from typing import List, Dict, Optional
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from dotenv import load_dotenv


class YouTubeChannelLister:
    def __init__(self, api_key: Optional[str] = None):
        load_dotenv()
        self.api_key = api_key or os.getenv('YOUTUBE_API_KEY')
        if not self.api_key:
            raise ValueError("YouTube API key is required. Set YOUTUBE_API_KEY in .env file or pass as parameter.")
        self.youtube = build('youtube', 'v3', developerKey=self.api_key)

    def extract_channel_id(self, url: str) -> str:
        """Extract channel ID from various YouTube URL formats."""
        patterns = [
            r'youtube\.com/channel/([^/?]+)',
            r'youtube\.com/c/([^/?]+)',
            r'youtube\.com/@([^/?]+)',
            r'youtube\.com/user/([^/?]+)',
        ]

        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                identifier = match.group(1)
                if pattern.startswith(r'youtube\.com/channel/'):
                    return identifier
                else:
                    return self._get_channel_id_from_username(identifier)

        raise ValueError(f"Could not extract channel identifier from URL: {url}")

    def _get_channel_id_from_username(self, username: str) -> str:
        """Convert username/handle to channel ID."""
        try:
            request = self.youtube.search().list(
                part='snippet',
                q=username,
                type='channel',
                maxResults=1
            )
            response = request.execute()

            if response['items']:
                return response['items'][0]['snippet']['channelId']
            else:
                raise ValueError(f"Channel not found for username: {username}")
        except HttpError as e:
            raise ValueError(f"Error fetching channel: {e}")

    def get_channel_videos(self, channel_url: str, max_results: Optional[int] = None) -> List[Dict]:
        """
        Get all videos from a YouTube channel.

        Args:
            channel_url: URL of the YouTube channel
            max_results: Maximum number of videos to fetch (None for all)

        Returns:
            List of dictionaries containing video information
        """
        channel_id = self.extract_channel_id(channel_url)

        # Get uploads playlist ID
        try:
            request = self.youtube.channels().list(
                part='contentDetails',
                id=channel_id
            )
            response = request.execute()

            if not response['items']:
                raise ValueError(f"Channel not found: {channel_id}")

            uploads_playlist_id = response['items'][0]['contentDetails']['relatedPlaylists']['uploads']
        except HttpError as e:
            raise ValueError(f"Error fetching channel details: {e}")

        # Fetch videos from uploads playlist
        videos = []
        next_page_token = None

        while True:
            try:
                request = self.youtube.playlistItems().list(
                    part='snippet',
                    playlistId=uploads_playlist_id,
                    maxResults=50,
                    pageToken=next_page_token
                )
                response = request.execute()

                for item in response['items']:
                    video_info = {
                        'title': item['snippet']['title'],
                        'video_id': item['snippet']['resourceId']['videoId'],
                        'published_at': item['snippet']['publishedAt'],
                        'published_date': datetime.strptime(
                            item['snippet']['publishedAt'],
                            '%Y-%m-%dT%H:%M:%SZ'
                        ).strftime('%Y-%m-%d %H:%M:%S'),
                        'url': f"https://www.youtube.com/watch?v={item['snippet']['resourceId']['videoId']}",
                        'description': item['snippet']['description'][:200] + '...' if len(item['snippet']['description']) > 200 else item['snippet']['description']
                    }
                    videos.append(video_info)

                next_page_token = response.get('nextPageToken')

                if not next_page_token or (max_results and len(videos) >= max_results):
                    break

            except HttpError as e:
                raise ValueError(f"Error fetching videos: {e}")

        if max_results:
            videos = videos[:max_results]

        return videos


def main():
    """Example usage."""
    import sys

    if len(sys.argv) < 2:
        print("Usage: python youtube_lister.py <channel_url> [max_results]")
        print("Example: python youtube_lister.py https://www.youtube.com/@channelname 10")
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


if __name__ == "__main__":
    main()
