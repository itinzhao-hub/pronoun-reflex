from pathlib import Path
import csv

ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / "audio"
VARIANTS = ["female_normal","female_fast","male_normal","male_fast"]

with (ROOT/"stimuli.csv").open("r",encoding="utf-8-sig",newline="") as f:
    rows=[r for r in csv.DictReader(f) if str(r.get("enabled","1"))!="0"]

missing=[]
for r in rows:
    for v in VARIANTS:
        p=AUDIO/f"{r['id']}__{v}.mp3"
        if not p.exists() or p.stat().st_size < 100:
            missing.append(str(p.relative_to(ROOT)))

print(f"Expected: {len(rows)*len(VARIANTS)}")
print(f"Missing: {len(missing)}")
if missing:
    print("\nFirst 50 missing:")
    for x in missing[:50]:
        print(" ",x)
else:
    print("PASS: all audio files present")
