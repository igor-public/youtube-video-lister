#!/usr/bin/env python3
"""
Test script to verify web API functionality
"""

import requests
import json

BASE_URL = "http://localhost:5000/api"

def test_api():
    """Test API endpoints."""

    print("Testing Web API...")
    print("="*60)

    # Test 1: Get config
    print("\n1. Testing GET /api/config")
    try:
        response = requests.get(f"{BASE_URL}/config")
        if response.status_code == 200:
            config = response.json()
            print(f"   ✓ Config loaded: {len(config.get('channels', []))} channels")
        else:
            print(f"   ✗ Failed: {response.status_code}")
    except Exception as e:
        print(f"   ✗ Error: {e}")

    # Test 2: Get tree
    print("\n2. Testing GET /api/tree")
    try:
        response = requests.get(f"{BASE_URL}/tree")
        if response.status_code == 200:
            tree = response.json()
            print(f"   ✓ Tree loaded: {len(tree)} channels")
            for channel in tree:
                print(f"      - {channel['channel']}: {channel['transcript_count']} transcripts")
                if channel['transcripts']:
                    first = channel['transcripts'][0]
                    print(f"        Sample: {first['filename']}")
        else:
            print(f"   ✗ Failed: {response.status_code}")
    except Exception as e:
        print(f"   ✗ Error: {e}")

    # Test 3: Get stats
    print("\n3. Testing GET /api/stats")
    try:
        response = requests.get(f"{BASE_URL}/stats")
        if response.status_code == 200:
            stats = response.json()
            print(f"   ✓ Stats loaded:")
            print(f"      Channels: {stats['total_channels']}")
            print(f"      Transcripts: {stats['total_transcripts']}")
            print(f"      Size: {stats['total_size_mb']} MB")
        else:
            print(f"   ✗ Failed: {response.status_code}")
    except Exception as e:
        print(f"   ✗ Error: {e}")

    # Test 4: Get a transcript
    print("\n4. Testing GET /api/transcript/:channel/:file")
    try:
        # Get first channel and first transcript
        response = requests.get(f"{BASE_URL}/tree")
        tree = response.json()

        if tree and tree[0]['transcripts']:
            channel = tree[0]['channel']
            filename = tree[0]['transcripts'][0]['filename']

            print(f"   Fetching: {channel}/{filename}")

            response = requests.get(f"{BASE_URL}/transcript/{channel}/{filename}")
            if response.status_code == 200:
                data = response.json()
                content_preview = data['content'][:100].replace('\n', ' ')
                print(f"   ✓ Transcript loaded: {len(data['content'])} chars")
                print(f"      Preview: {content_preview}...")
            else:
                error = response.json()
                print(f"   ✗ Failed: {response.status_code} - {error.get('error', 'Unknown')}")
        else:
            print(f"   ⚠ No transcripts available to test")
    except Exception as e:
        print(f"   ✗ Error: {e}")

    print("\n" + "="*60)
    print("Test complete!")

if __name__ == "__main__":
    print("\nMake sure the web UI is running:")
    print("  ./start_web_ui.sh")
    print("\nThen run this test in another terminal.\n")

    import time
    time.sleep(2)

    try:
        test_api()
    except requests.exceptions.ConnectionError:
        print("\n✗ Could not connect to http://localhost:5000")
        print("  Make sure the web UI is running first!")
