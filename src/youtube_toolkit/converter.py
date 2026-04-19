#!/usr/bin/env python3
"""
Subtitle to Text Converter
Converts SRT subtitle files to clean, readable text format.
"""

import os
import re
import sys
from typing import List, Tuple


class SubtitleToText:
    def __init__(self):
        self.min_gap_for_paragraph = 2.0  # seconds

    def parse_srt_time(self, time_str: str) -> float:
        """Convert SRT timestamp to seconds."""
        time_str = time_str.replace(',', '.')
        parts = time_str.split(':')
        hours = int(parts[0])
        minutes = int(parts[1])
        seconds = float(parts[2])
        return hours * 3600 + minutes * 60 + seconds

    def parse_srt(self, srt_file_path: str) -> List[Tuple[float, float, str]]:
        """
        Parse SRT file and extract subtitles with timestamps.

        Returns:
            List of tuples (start_time, end_time, text)
        """
        with open(srt_file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        subtitles = []
        blocks = content.strip().split('\n\n')

        for block in blocks:
            lines = block.strip().split('\n')
            if len(lines) < 3:
                continue

            try:
                time_line = lines[1]
                match = re.match(r'(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})', time_line)

                if match:
                    start_time = self.parse_srt_time(match.group(1))
                    end_time = self.parse_srt_time(match.group(2))
                    text = ' '.join(lines[2:])
                    subtitles.append((start_time, end_time, text))
            except (ValueError, IndexError):
                continue

        return subtitles

    def clean_text(self, text: str) -> str:
        """Clean up text by removing extra spaces and fixing punctuation."""
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'\s+([.,!?;:])', r'\1', text)
        text = re.sub(r'([.,!?;:])\s*([.,!?;:])', r'\1', text)
        text = text.strip()
        return text

    def merge_subtitles(self, subtitles: List[Tuple[float, float, str]]) -> str:
        """
        Merge subtitles into readable text with proper paragraphs.

        Args:
            subtitles: List of (start_time, end_time, text) tuples

        Returns:
            Formatted text string
        """
        if not subtitles:
            return ""

        paragraphs = []
        current_paragraph = []
        last_end_time = 0

        for i, (start_time, end_time, text) in enumerate(subtitles):
            text = text.strip()

            if not text:
                continue

            gap = start_time - last_end_time

            # Start new paragraph if there's a significant gap
            if gap > self.min_gap_for_paragraph and current_paragraph:
                paragraph_text = ' '.join(current_paragraph)
                paragraph_text = self.clean_text(paragraph_text)
                if paragraph_text:
                    paragraphs.append(paragraph_text)
                current_paragraph = []

            # Check for duplicate or overlapping content with previous subtitle
            if current_paragraph:
                last_text = current_paragraph[-1].lower()
                current_text = text.lower()

                # Skip if this text is already in the last entry
                if current_text in last_text or last_text in current_text:
                    # Keep the longer version
                    if len(text) > len(current_paragraph[-1]):
                        current_paragraph[-1] = text
                    last_end_time = end_time
                    continue

                # Check for word overlap at boundaries
                last_words = last_text.split()[-3:] if len(last_text.split()) >= 3 else last_text.split()
                current_words = current_text.split()

                # Find overlap
                overlap = 0
                for j in range(1, min(len(last_words), len(current_words)) + 1):
                    if last_words[-j:] == current_words[:j]:
                        overlap = j

                if overlap > 0:
                    # Remove overlapping words from current text
                    text = ' '.join(current_words[overlap:])

            if text.strip():
                current_paragraph.append(text)

            last_end_time = end_time

        # Add the last paragraph
        if current_paragraph:
            paragraph_text = ' '.join(current_paragraph)
            paragraph_text = self.clean_text(paragraph_text)
            if paragraph_text:
                paragraphs.append(paragraph_text)

        # Join paragraphs with double newline
        result = '\n\n'.join(paragraphs)

        # Final cleanup
        result = self.post_process_text(result)

        return result

    def post_process_text(self, text: str) -> str:
        """Final text cleanup and formatting."""
        # Fix common issues
        text = re.sub(r'([a-z])([A-Z])', r'\1. \2', text)

        # Ensure sentences end with proper punctuation
        lines = text.split('\n\n')
        processed_lines = []

        for line in lines:
            line = line.strip()
            if line and not line[-1] in '.!?':
                line += '.'
            processed_lines.append(line)

        return '\n\n'.join(processed_lines)

    def detect_speakers(self, text: str) -> str:
        """
        Attempt to detect speaker changes and format accordingly.
        This is best-effort as SRT files don't typically include speaker info.
        """
        # Look for common speaker indicators
        patterns = [
            (r'^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*:\s*', r'\n\n**\1:** '),
            (r'\[([^\]]+)\]\s*', r'\n\n**\1:** '),
            (r'>>>\s*([A-Z][a-z]+)\s*:', r'\n\n**\1:** '),
        ]

        for pattern, replacement in patterns:
            text = re.sub(pattern, replacement, text, flags=re.MULTILINE)

        return text.strip()

    def convert_file(
        self,
        srt_file_path: str,
        output_path: str = None,
        detect_speakers: bool = False
    ) -> str:
        """
        Convert SRT file to clean text.

        Args:
            srt_file_path: Path to SRT file
            output_path: Output text file path (optional)
            detect_speakers: Try to detect and format speaker changes

        Returns:
            The converted text
        """
        if not os.path.exists(srt_file_path):
            raise FileNotFoundError(f"SRT file not found: {srt_file_path}")

        # Parse subtitles
        subtitles = self.parse_srt(srt_file_path)

        if not subtitles:
            raise ValueError("No subtitles found in file")

        # Convert to text
        text = self.merge_subtitles(subtitles)

        # Detect speakers if requested
        if detect_speakers:
            text = self.detect_speakers(text)

        # Write to file if output path provided
        if output_path:
            os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else '.', exist_ok=True)
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(text)

        return text

    def convert_directory(
        self,
        input_dir: str,
        output_dir: str = None,
        detect_speakers: bool = False
    ) -> List[str]:
        """
        Convert all SRT files in a directory.

        Args:
            input_dir: Directory containing SRT files
            output_dir: Output directory for text files (default: input_dir/transcripts)
            detect_speakers: Try to detect and format speaker changes

        Returns:
            List of output file paths
        """
        if not output_dir:
            output_dir = os.path.join(input_dir, 'transcripts')

        os.makedirs(output_dir, exist_ok=True)

        output_files = []
        for filename in os.listdir(input_dir):
            if filename.endswith('.srt'):
                input_path = os.path.join(input_dir, filename)
                output_filename = filename.replace('.srt', '.txt')
                output_path = os.path.join(output_dir, output_filename)

                try:
                    self.convert_file(input_path, output_path, detect_speakers)
                    output_files.append(output_path)
                    print(f"✓ Converted: {filename} -> {output_filename}")
                except Exception as e:
                    print(f"✗ Error converting {filename}: {e}")

        return output_files


def main():
    """Example usage."""
    if len(sys.argv) < 2:
        print("Usage: python subtitle_to_text.py <srt_file_or_directory> [output_file_or_directory] [--speakers]")
        print("\nExamples:")
        print("  python subtitle_to_text.py subtitles/video.en.srt")
        print("  python subtitle_to_text.py subtitles/video.en.srt output.txt")
        print("  python subtitle_to_text.py subtitles/ transcripts/")
        print("  python subtitle_to_text.py subtitles/ --speakers")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith('--') else None
    detect_speakers = '--speakers' in sys.argv

    converter = SubtitleToText()

    try:
        if os.path.isfile(input_path):
            # Convert single file
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
            # Convert directory
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
    main()
