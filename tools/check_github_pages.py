from pathlib import Path
import csv

ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / "audio"
PROFILES = ["female_normal","female_fast","male_normal","male_fast"]

PAGES_MAX = 1024**3          # 1 GiB published-site maximum
WARN_REPO = 1024**3          # source repo recommended limit
GIT_FILE_WARN = 50*1024**2
GIT_FILE_HARD = 100*1024**2
GIT_PUSH_HARD = 2*1024**3
DIR_WIDTH_RECOMMENDED = 3000

with (ROOT / "stimuli.csv").open("r", encoding="utf-8-sig", newline="") as f:
    rows = [r for r in csv.DictReader(f) if str(r.get("enabled","1")).strip() != "0"]

expected = []
for profile in PROFILES:
    for r in rows:
        expected.append(AUDIO / profile / f"{r['id']}.mp3")

missing = [p for p in expected if not p.exists() or p.stat().st_size < 100]

files = [p for p in ROOT.rglob("*")
         if p.is_file() and ".git" not in p.parts and "__pycache__" not in p.parts]
total_bytes = sum(p.stat().st_size for p in files)

warn_files = [p for p in files if p.stat().st_size >= GIT_FILE_WARN]
hard_files = [p for p in files if p.stat().st_size >= GIT_FILE_HARD]

wide_dirs = []
for d in [ROOT] + [p for p in ROOT.rglob("*") if p.is_dir() and ".git" not in p.parts]:
    try:
        count = sum(1 for _ in d.iterdir())
    except OSError:
        continue
    if count > DIR_WIDTH_RECOMMENDED:
        wide_dirs.append((d.relative_to(ROOT), count))

print("Pronoun Cluster Reflex — GitHub Pages readiness")
print("=" * 52)
print(f"Stimuli: {len(rows)}")
print(f"Expected MP3: {len(expected)}")
print(f"Missing MP3: {len(missing)}")
for profile in PROFILES:
    pdir = AUDIO/profile
    count = len(list(pdir.glob("*.mp3"))) if pdir.exists() else 0
    size = sum(p.stat().st_size for p in pdir.glob("*.mp3")) if pdir.exists() else 0
    print(f"  {profile}: {count} MP3 / {size/1024/1024:.1f} MiB")

print()
print(f"Whole project: {total_bytes/1024/1024:.1f} MiB")
print(f"GitHub Pages 1 GiB site limit usage: {total_bytes/PAGES_MAX*100:.1f}%")
print(f"Files >= 50 MiB: {len(warn_files)}")
print(f"Files >= 100 MiB: {len(hard_files)}")
print(f"Directories > {DIR_WIDTH_RECOMMENDED} entries: {len(wide_dirs)}")

if missing:
    print("\nFirst missing audio files:")
    for p in missing[:30]:
        print(" ", p.relative_to(ROOT))

if wide_dirs:
    print("\nWide directories:")
    for d, n in wide_dirs:
        print(f"  {d}: {n}")

print()
if missing:
    print("FAIL: audio set is incomplete.")
elif total_bytes >= PAGES_MAX:
    print("FAIL: project exceeds GitHub Pages 1 GiB published-site limit.")
elif hard_files:
    print("FAIL: at least one file exceeds GitHub's 100 MiB normal Git hard limit.")
elif wide_dirs:
    print("WARN: a directory exceeds GitHub's recommended width.")
else:
    print("PASS: structurally ready for GitHub Pages.")

if total_bytes >= WARN_REPO:
    print("WARN: source repository is at/above GitHub Pages' recommended 1 GiB size.")
if total_bytes >= GIT_PUSH_HARD:
    print("WARN: a single initial push of this size would exceed GitHub's 2 GiB push limit.")
