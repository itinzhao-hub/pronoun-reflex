"""
Google Cloud Text-to-Speech batch generator for Pronoun Cluster Reflex.

Authentication:
  Preferred existing workflow:
    set GOOGLE_CLOUD_TTS_API_KEY at runtime.
  The key is never written into the project.

Examples:
  python tools/generate_audio.py --limit 20
  python tools/generate_audio.py --profiles female_normal male_normal
  python tools/generate_audio.py
  python tools/generate_audio.py --start PC_0301

The script skips an MP3 when its content/config fingerprint matches the
manifest. If text or TTS profile settings change, that file is regenerated.
"""

from pathlib import Path
import argparse
import base64
import csv
import getpass
import hashlib
import json
import os
import time
import urllib.parse
import urllib.request
import urllib.error

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "stimuli.csv"
CONFIG_PATH = ROOT / "config" / "tts_config.json"
AUDIO_DIR = ROOT / "audio"
MANIFEST_PATH = AUDIO_DIR / "_tts_manifest.json"

def load_config():
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))

def load_manifest():
    if MANIFEST_PATH.exists():
        try:
            return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"version": 1, "files": {}}

def save_manifest(manifest):
    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

def fingerprint(text, cfg, profile):
    payload = {
        "text": text,
        "endpoint": cfg["endpoint"],
        "languageCode": cfg["languageCode"],
        "audioEncoding": cfg["audioEncoding"],
        "voice": profile["voice"],
        "gender": profile["gender"],
        "speakingRate": profile["speakingRate"],
        "pitch": profile["pitch"],
    }
    raw = json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()

def get_api_key():
    key = os.environ.get("GOOGLE_CLOUD_TTS_API_KEY", "").strip()
    if key:
        return key
    # Keep the key process-local only; do not persist it.
    return getpass.getpass("GOOGLE_CLOUD_TTS_API_KEY: ").strip()

def synthesize(api_key, cfg, profile, text):
    body = {
        "input": {"text": text},
        "voice": {
            "languageCode": cfg["languageCode"],
            "name": profile["voice"],
            "ssmlGender": profile["gender"],
        },
        "audioConfig": {
            "audioEncoding": cfg["audioEncoding"],
            "speakingRate": profile["speakingRate"],
            "pitch": profile["pitch"],
        },
    }
    query = urllib.parse.urlencode({"key": api_key})
    url = cfg["endpoint"] + "?" + query
    req = urllib.request.Request(
        url,
        data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        result = json.loads(resp.read().decode("utf-8"))
    audio_b64 = result.get("audioContent")
    if not audio_b64:
        raise RuntimeError("Google TTS response did not contain audioContent")
    return base64.b64decode(audio_b64)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--profiles", nargs="+", default=None,
                    help="Profile IDs to generate; default = every enabled profile")
    ap.add_argument("--limit", type=int, default=0,
                    help="Limit number of stimuli, for testing")
    ap.add_argument("--start", default="",
                    help="Start from this stimulus id, e.g. PC_0301")
    ap.add_argument("--sleep", type=float, default=0.08,
                    help="Pause between API requests")
    ap.add_argument("--force", action="store_true",
                    help="Regenerate even when fingerprint matches")
    args = ap.parse_args()

    cfg = load_config()
    all_profiles = {p["id"]: p for p in cfg["profiles"] if p.get("enabled", True)}
    wanted = args.profiles or list(all_profiles)
    unknown = [p for p in wanted if p not in all_profiles]
    if unknown:
        raise SystemExit(f"Unknown/disabled profile(s): {unknown}")
    profiles = [all_profiles[p] for p in wanted]

    api_key = get_api_key()
    if not api_key:
        raise SystemExit("No Google Cloud TTS API key supplied.")

    AUDIO_DIR.mkdir(exist_ok=True)
    manifest = load_manifest()

    with CSV_PATH.open("r", encoding="utf-8-sig", newline="") as f:
        rows = [r for r in csv.DictReader(f)
                if str(r.get("enabled", "1")).strip() != "0"]

    if args.start:
        rows = [r for r in rows if r["id"] >= args.start]
    if args.limit:
        rows = rows[:args.limit]

    total = len(rows) * len(profiles)
    completed = 0
    generated = 0
    skipped = 0

    for row in rows:
        for profile in profiles:
            completed += 1
            pid = profile["id"]
            filename = f"{row['id']}__{pid}.mp3"
            dest = AUDIO_DIR / filename
            fp = fingerprint(row["text"], cfg, profile)
            old = manifest["files"].get(filename, {})

            if (not args.force and dest.exists() and dest.stat().st_size > 100
                    and old.get("fingerprint") == fp):
                skipped += 1
                print(f"[{completed}/{total}] skip {filename}")
                continue

            print(f"[{completed}/{total}] {filename}: {row['text']}")
            try:
                audio = synthesize(api_key, cfg, profile, row["text"])
            except urllib.error.HTTPError as e:
                detail = e.read().decode("utf-8", errors="replace")
                print(f"Google TTS HTTP {e.code}: {detail}")
                raise

            dest.write_bytes(audio)
            manifest["files"][filename] = {
                "fingerprint": fp,
                "stimulus_id": row["id"],
                "profile": pid,
                "voice": profile["voice"],
                "speakingRate": profile["speakingRate"],
                "pitch": profile["pitch"],
                "bytes": len(audio),
            }
            save_manifest(manifest)
            generated += 1
            time.sleep(args.sleep)

    print()
    print(f"Done. generated={generated}, skipped={skipped}, total={total}")

if __name__ == "__main__":
    main()
