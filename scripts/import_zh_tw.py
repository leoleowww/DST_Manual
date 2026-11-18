"""Extract Traditional Chinese item text from the pinned game's PO catalog."""
import json
from pathlib import Path
import re
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
lock = json.loads((ROOT / "data/source-lock.json").read_text())
data = json.loads((ROOT / "public/data/game-data.json").read_text())
url = f"https://raw.githubusercontent.com/{lock['repository']}/{lock['revision']}/languages/chinese_t.po"
with urlopen(url, timeout=60) as response:
    source = response.read().decode("utf-8-sig").replace("\r\n", "\n")

catalog = {}
by_text = {}
for entry in source.split("\n\n"):
    fields = {}
    for match in re.finditer(r'^(msgctxt|msgid|msgstr) ("[^\n]*")(\n(?:"[^\n]*"(?:\n|$))*)', entry + "\n", re.M):
        field, first, continuation = match.groups()
        fields[field] = "".join(json.loads(line, strict=False) for line in [first, *continuation.split("\n")] if line)
    context, english, chinese = (fields.get(field) for field in ("msgctxt", "msgid", "msgstr"))
    if context and english and chinese:
        catalog[context] = chinese
        if context.startswith(("STRINGS.NAMES.", "STRINGS.UI.COOKBOOK.FOOD_EFFECTS_")):
            by_text.setdefault(english, chinese)

items = {}
seasoning = {"spice_chili": "辣味", "spice_garlic": "蒜香", "spice_salt": "鹹味", "spice_sugar": "甜味"}
for key, item in data["items"].items():
    name = catalog.get(f"STRINGS.NAMES.{key.upper()}") or by_text.get(item["name"])
    if not name and (base := data["foods"].get(key, {}).get("base")):
        flavor = seasoning.get(key.removeprefix(base + "_"))
        base_name = catalog.get(f"STRINGS.NAMES.{base.upper()}") or by_text.get(data["items"][base]["name"])
        if flavor and base_name:
            name = flavor + base_name
    description = catalog.get(f"STRINGS.RECIPE_DESC.{key.upper()}") if item.get("description") else None
    if name or description:
        items[key] = {field: value for field, value in (("name", name), ("description", description)) if value}

effects = {f["effect"]: by_text[f["effect"]] for f in data["foods"].values() if f.get("effect") in by_text}
output = {"revision": lock["revision"], "items": items, "effects": effects}
(ROOT / "public/data/zh-TW.json").write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":"), sort_keys=True) + "\n", encoding="utf-8")
