from pathlib import Path
import csv, json

ROOT = Path(__file__).resolve().parents[1]
CSV = ROOT / "stimuli.csv"
OUT = ROOT / "stimuli.js"

with CSV.open("r", encoding="utf-8-sig", newline="") as f:
    rows = list(csv.DictReader(f))

required = {
    "id","module","subtype","difficulty","text","target",
    "distractor_1","distractor_2","distractor_3","enabled"
}
missing = required - set(rows[0].keys())
if missing:
    raise SystemExit(f"Missing required fields: {sorted(missing)}")

ids = [r["id"] for r in rows]
texts = [r["text"] for r in rows]
if len(ids) != len(set(ids)):
    raise SystemExit("Duplicate stimulus id found")
if len(texts) != len(set(texts)):
    raise SystemExit("Duplicate French text found")

OUT.write_text(
    "window.STIMULI = " + json.dumps(rows, ensure_ascii=False, separators=(",", ":")) + ";\n",
    encoding="utf-8"
)
print(f"Built {OUT.name}: {len(rows)} stimuli")
