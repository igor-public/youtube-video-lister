# Installing ffmpeg

The warning message about ffmpeg not being found can be resolved by installing ffmpeg. While the subtitle downloading still works without it, having ffmpeg installed ensures better quality and more reliable downloads.

## Installation Instructions

### Ubuntu/Debian/WSL

```bash
sudo apt update
sudo apt install -y ffmpeg
```

### Verify Installation

```bash
ffmpeg -version
```

You should see output like:
```
ffmpeg version 4.x.x
...
```

## Why ffmpeg is needed

- **Better format support**: Access to more subtitle formats and video metadata
- **Higher quality**: Ensures optimal quality during subtitle extraction
- **Reliability**: More robust downloading, especially for complex videos
- **Performance**: Faster processing for large files

## After Installation

Once installed, the warning will disappear when you run:

```bash
cd /home/ia52897/git-code/youtube-video-lister
source venv/bin/activate
python monitor_channels.py
```

## Note

The toolkit will work without ffmpeg, but installing it is **strongly recommended** for production use.

## Alternative: Install without sudo (if needed)

If you don't have sudo access, you can use a static build:

```bash
# Download static build
cd ~/bin  # or any directory in your PATH
wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
tar xvf ffmpeg-release-amd64-static.tar.xz
cd ffmpeg-*-static
cp ffmpeg ffprobe ~/bin/
cd ~
rm -rf ~/bin/ffmpeg-*-static*

# Verify
ffmpeg -version
```

Make sure `~/bin` is in your PATH:
```bash
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```
