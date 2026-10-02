"""Losslessly copy the original AAC audio; visuals are rendered on the website.

Requires ffmpeg only. This is an offline asset helper, not a website dependency.
"""
import argparse
import subprocess
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('source')
parser.add_argument('output')
parser.add_argument('ffmpeg')
args = parser.parse_args()
output = Path(args.output)
output.mkdir(parents=True, exist_ok=True)
subprocess.run([
    args.ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-i', args.source,
    '-vn', '-c:a', 'copy', str(output / 'fracture-impact.m4a'),
], check=True)
for asset in ['fracture-impact.m4a']:
    print(f'{asset}: {(output / asset).stat().st_size} bytes')
