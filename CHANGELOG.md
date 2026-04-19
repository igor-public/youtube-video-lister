# Changelog

All notable changes to YouTube Toolkit will be documented in this file.

## [0.2.0] - 2026-04-19

### Added
- **Smart Skip Feature**: Automatically skip videos that already have transcripts
  - Saves API quota and processing time
  - Checks for existing transcript files before downloading
  - Reports skipped videos in summary
- **check_processed.py**: Utility script to view processed videos
  - Summary view with statistics
  - Detailed view per channel
  - Shows file sizes and date ranges
- **ffmpeg Installation Support**:
  - Created INSTALL_FFMPEG.md with detailed instructions
  - Added install_ffmpeg.sh helper script
  - Updated README with troubleshooting section

### Changed
- Enhanced monitoring output to show skipped videos count
- Improved summary reports to include skip statistics
- Updated quick_start.sh to check for ffmpeg

### Performance Improvements
- Reduced redundant API calls by checking existing transcripts
- Faster re-runs when monitoring same channels
- Reduced YouTube Data API quota usage

### Bug Fixes
- Fixed JavaScript runtime warning by using Android player client
- Improved subtitle extraction reliability
- Better compatibility with YouTube's API changes

## [0.1.0] - 2026-04-19

### Added
- Initial release
- Channel monitoring functionality
- Subtitle downloading with yt-dlp
- SRT to text conversion
- Annotated transcript generation
- Multi-channel support
- JSON configuration file support
- Comprehensive documentation (README, USAGE_GUIDE, PROJECT_SUMMARY)
- Unit tests structure
- Example workflows

### Features
- Monitor YouTube channels for videos from last N days
- Download subtitles in multiple languages
- Convert subtitles to clean, readable text
- Organize output by channel
- Generate processing summaries
- Support for multiple channel URL formats
- Smart paragraph detection in transcripts
- Remove duplicate subtitle content

### Documentation
- Complete README with installation and usage
- Detailed usage guide with workflows
- Project summary document
- Example configuration files
- Quick start script

## Future Enhancements

### Planned for v0.3.0
- [ ] Parallel video processing
- [ ] Database integration (SQLite)
- [ ] Better speaker detection
- [ ] Keyword filtering
- [ ] Email/Slack notifications

### Under Consideration
- [ ] Web dashboard
- [ ] Support for more platforms (Vimeo, etc.)
- [ ] Video download option
- [ ] Automatic transcript summarization
- [ ] Export to various formats (PDF, EPUB)
- [ ] Search functionality across transcripts
