#!/usr/bin/env python3
"""Fetch original game inventory art and self-hosted OFL fonts with provenance."""
import argparse
import concurrent.futures
import hashlib
import json
from pathlib import Path
import re
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
ASSET_REPO = "fankimm/dst-craft"


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "DST-Field-Guide"}), timeout=45).read()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--supplemental-art", action="store_true", help="Fetch only the audited artwork overrides.")
    args = parser.parse_args()
    lock_path = ROOT / "data/assets-lock.json"
    if lock_path.exists():
        lock = json.loads(lock_path.read_text())
    else:
        commit = json.loads(get(f"https://api.github.com/repos/{ASSET_REPO}/commits/HEAD"))
        tree = json.loads(get(f'https://api.github.com/repos/{ASSET_REPO}/git/trees/{commit["sha"]}?recursive=1'))
        lock = {"repository": ASSET_REPO, "revision": commit["sha"], "files": {Path(x["path"]).stem: x["sha"] for x in tree["tree"] if x["path"].startswith("public/images/game-items/") and x["path"].endswith(".png")}}
        lock_path.write_text(json.dumps(lock, sort_keys=True, indent=2) + "\n")
    data = json.loads((ROOT / "public/data/game-data.json").read_text())
    need = {data["items"][key]["icon"] for key in data["foods"]}
    need.update(c["product"] for c in data["crafts"])
    need.update(i["item"] for c in data["crafts"] for i in c["ingredients"])
    need.update(t["from"] for t in data["transforms"])
    need.update(t["to"] for t in data["transforms"])
    need.update(["tomato", "tallbirdegg", "honey", "boards", "cookpot", "log", "twigs", "charcoal"])
    overrides = set(json.loads((ROOT / "data/art-aliases.json").read_text()).values())
    if not overrides <= lock["files"].keys():
        raise ValueError("An artwork override is missing from the pinned inventory source.")
    need = overrides if args.supplemental_art else need | overrides
    target = ROOT / "public/assets/items"
    target.mkdir(exist_ok=True, parents=True)

    def download(key):
        if key not in lock["files"]:
            return key, "missing"
        path = target / (key + ".png")
        if not path.exists():
            content = get(f'https://raw.githubusercontent.com/{ASSET_REPO}/{lock["revision"]}/public/images/game-items/{key}.png')
            digest = hashlib.sha1(b"blob " + str(len(content)).encode() + b"\0" + content).hexdigest()
            if digest != lock["files"][key]:
                raise ValueError(f"Asset hash mismatch: {key}")
            path.write_bytes(content)
        return key, "ok"

    missing = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        for i, (key, result) in enumerate(pool.map(download, sorted(need)), 1):
            if result == "missing":
                missing.append(key)
            if i % 200 == 0:
                print(f"Inventory art {i}/{len(need)}", flush=True)
    available = sorted(p.stem for p in target.glob("*.png"))
    (ROOT / "public/data/art.json").write_text(json.dumps(available, separators=(",", ":")) + "\n")
    print(f"Inventory art: {len(available)} available; {len(missing)} use the neutral fallback", flush=True)

    if args.supplemental_art:
        return

    fonts = ROOT / "public/assets/fonts"
    fonts.mkdir(exist_ok=True, parents=True)
    font_sources = {}
    for family, slug, weights in [("DM+Sans", "dm-sans", [400, 500, 600, 700]), ("Fraunces", "fraunces", [600])]:
        css = get(f'https://fonts.googleapis.com/css2?family={family}:wght@{";".join(str(w) for w in weights)}&display=swap').decode()
        for face in css.split("@font-face")[1:]:
            weight = re.search(r"font-weight:\s*(\d+)", face).group(1)
            url = re.search(r"url\(([^)]+)\)", face).group(1)
            filename = f"{slug}-{weight}.ttf"
            (fonts / filename).write_bytes(get(url))
            font_sources[filename] = url
        font_slug = "dmsans" if slug == "dm-sans" else slug
        (fonts / (slug + "-OFL.txt")).write_bytes(get(f"https://raw.githubusercontent.com/google/fonts/main/ofl/{font_slug}/OFL.txt"))
    (ROOT / "data/font-sources.json").write_text(json.dumps(font_sources, indent=2) + "\n")


if __name__ == "__main__":
    main()
