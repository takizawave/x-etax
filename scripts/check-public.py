"""Validate the selected public payload, without reading ignored local files."""
from pathlib import Path
import re
import struct
import subprocess

ROOT = Path(__file__).resolve().parent.parent
EXTENSION = {'manifest.json', 'config.js', 'content.js', 'dom-contracts.js', 'wording.js', 'popup.html', 'popup.css', 'popup.js', 'tokens.css', 'theme.css', 'components.css', 'layouts.css', 'skins.css', 'native-components.css', 'classic-components.css', 'shell-layout.css'}
ROOT_FILES = {'.gitignore', 'README.md', 'PUBLIC-CONTENT.md', 'package.json', 'package-lock.json', 'preview.html', 'preview.js', 'preview-storage.js', 'components.html', 'gallery.html', 'gallery.css', 'gallery.js', 'lab.css', 'lab.js', 'popup-preview.html', 'browser-tests.html', 'browser-tests.js', 'flicker-tests.html', 'flicker-tests.js'}
SCRIPTS = {'check-public.py', 'server.cjs', 'browser-check.cjs', 'screenshots.cjs'}
IMAGES = {'office-classic.png', 'display-settings.png', 'retro-win95.png'}
allowed = {'docs/download.svg'} | ROOT_FILES | {'extension/'+n for n in EXTENSION} | {'scripts/'+n for n in SCRIPTS} | {'docs/screenshots/'+n for n in IMAGES} | {'tests/config.test.cjs','tests/extension.test.cjs'}
if (ROOT / '.git').exists():
    paths = subprocess.check_output(['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], cwd=ROOT).decode().split('\0')
    paths = {p for p in paths if p}
else:
    paths = {p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*') if p.is_file() and not any(part.startswith('.') or part == 'node_modules' for part in p.relative_to(ROOT).parts)} | {'.gitignore'}
errors = []
for name in sorted(paths):
    p = ROOT / name
    if name not in allowed:
        errors.append('Unexpected public file: '+name)
        continue
    if p.is_symlink():
        errors.append('Symbolic link: '+name)
        continue
    data = p.read_bytes()
    if p.suffix == '.png':
        if data[:8] != b'\x89PNG\r\n\x1a\n':
            errors.append('Invalid image: '+name)
            continue
        pos = 8
        while pos < len(data):
            size = struct.unpack('>I', data[pos:pos+4])[0]
            kind = data[pos+4:pos+8]
            if kind in {b'tEXt', b'zTXt', b'iTXt', b'eXIf'}:
                errors.append('Unexpected image metadata: '+name)
            pos += 12 + size
        continue
    text = data.decode('utf-8')
    patterns = {
        'local absolute path': '/'+'Users/'+'|/'+'var/folders/'+'|/'+'private/var/',
        'private key': r'-----BEGIN [A-Z ]*PRIVATE KEY-----',
        'credential': r'\b(?:gh[pousr]_[A-Za-z0-9]{24,}|github_pat_[A-Za-z0-9_]{24,}|AKIA[A-Z0-9]{16})\b',
        'real post URL': r'https?://(?:www\.)?(?:x|twitter)\.com/[^/\s]+/status/\d{15,}',
        'remote user image': r'https?://(?:pbs|video)\.twimg\.com/',
    }
    if name != 'scripts/check-public.py':
        for reason, pattern in patterns.items():
            if re.search(pattern, text):
                errors.append(reason+': '+name)
    if p.suffix == '.html' and re.search(r'(?:src|poster)=["\']https?://', text):
        errors.append('Remote asset in demo: '+name)
for name in sorted(allowed - paths):
    errors.append('Missing public file: '+name)
if errors:
    raise SystemExit('\n'.join(errors))
print(f'Public payload checked: {len(paths)} files; no captured fixtures, secrets, remote images, or local paths detected.')
