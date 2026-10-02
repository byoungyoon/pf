"""Turn a small OSM XML snapshot into compact, credited Three.js scene data.

Run: python3 scripts/extract-jamsil.py /path/to/jamsil.osm
The source is OpenStreetMap contributors, ODbL 1.0.
"""

import json
import math
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

source = Path(sys.argv[1])
root = ET.parse(source).getroot()
origin = (127.10075, 37.5126)
meters_per_lon = 111320 * math.cos(math.radians(origin[1]))
meters_per_lat = 111320
scale = 0.30
nodes = {element.attrib["id"]: (float(element.attrib["lon"]), float(element.attrib["lat"])) for element in root.findall("node")}


def point(lon_lat):
    lon, lat = lon_lat
    return [round((lon - origin[0]) * meters_per_lon * scale, 2), round(-(lat - origin[1]) * meters_per_lat * scale, 2)]


ways = {}
for element in root.findall("way"):
    refs = [node.attrib["ref"] for node in element.findall("nd")]
    if not refs or any(ref not in nodes for ref in refs):
        continue
    tags = {tag.attrib["k"]: tag.attrib["v"] for tag in element.findall("tag")}
    ways[element.attrib["id"]] = {"points": [point(nodes[ref]) for ref in refs], "tags": tags}

buildings = []
roads = []
paths = []
for way_id, way in ways.items():
    tags = way["tags"]
    if tags.get("building:part") or tags.get("building"):
        if tags.get("building:part") == "roof":
            continue
        height = tags.get("height", "").replace("m", "")
        try:
            height = float(height)
        except ValueError:
            height = float(tags.get("building:levels", "4")) * 3.5
        buildings.append({
            "id": way_id,
            "p": way["points"],
            "h": round(height * scale, 2),
            "n": tags.get("name:ko", tags.get("name", "")),
            "k": tags.get("building:part", tags.get("building", "yes")),
        })
    highway = tags.get("highway")
    if highway and not tags.get("tunnel"):
        record = {"p": way["points"], "k": highway, "n": tags.get("name:ko", tags.get("name", ""))}
        if highway in {"primary", "tertiary", "secondary", "residential", "service", "busway", "primary_link", "tertiary_link"}:
            roads.append(record)
        elif highway in {"footway", "pedestrian", "cycleway", "steps"}:
            paths.append(record)

waters = []
for element in root.findall("relation"):
    tags = {tag.attrib["k"]: tag.attrib["v"] for tag in element.findall("tag")}
    if tags.get("natural") != "water":
        continue
    for member in element.findall("member"):
        if member.attrib.get("type") == "way" and member.attrib.get("role") == "outer" and member.attrib.get("ref") in ways:
            waters.append({"p": ways[member.attrib["ref"]]["points"], "n": tags.get("name:ko", tags.get("name", ""))})

data = {"attribution": "© OpenStreetMap contributors · ODbL 1.0", "origin": origin, "buildings": buildings, "roads": roads, "paths": paths, "waters": waters}
output = Path("public/data/jamsil.json")
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
print(f"{output}: {len(buildings)} buildings, {len(roads)} roads, {len(paths)} paths, {len(waters)} water outlines")
