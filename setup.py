"""Setup script for youtube-toolkit package."""

from setuptools import setup, find_packages
from pathlib import Path

# Read the contents of README file
this_directory = Path(__file__).parent
long_description = (this_directory / "README.md").read_text(encoding='utf-8')

setup(
    name="youtube-toolkit",
    version="0.2.0",
    author="Your Name",
    author_email="your.email@example.com",
    description="A comprehensive toolkit for YouTube video analysis, subtitle downloading, and text conversion",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/yourusername/youtube-toolkit",
    package_dir={"": "src"},
    packages=find_packages(where="src"),
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Multimedia :: Video",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    python_requires=">=3.8",
    install_requires=[
        "google-api-python-client>=2.115.0",
        "google-auth>=2.27.0",
        "google-auth-oauthlib>=1.2.0",
        "google-auth-httplib2>=0.2.0",
        "python-dotenv>=1.0.1",
        "yt-dlp>=2026.3.17",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-cov>=4.0.0",
            "black>=23.0.0",
            "flake8>=6.0.0",
            "mypy>=1.0.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "yt-list=youtube_toolkit.cli:list_videos",
            "yt-download=youtube_toolkit.cli:download_subtitles",
            "yt-convert=youtube_toolkit.cli:convert_to_text",
        ],
    },
)
