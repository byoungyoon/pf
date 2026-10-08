"""Convert small OSM API extracts to the geometry input of extract-seoul-details.mjs.
Usage: python3 scripts/convert-seoul-osm.py output.json area1.osm area2.osm ...
Original data: OpenStreetMap contributors, ODbL-1.0. See ASSETS.md.
"""
import json
import sys
import xml.etree.ElementTree as ET

nodes, ways, relations = {}, {}, {}
for filename in sys.argv[2:]:
    root = ET.parse(filename).getroot()
    for node in root.findall('node'):
        nodes[node.attrib['id']] = {'lon': float(node.attrib['lon']), 'lat': float(node.attrib['lat'])}
    for way in root.findall('way'):
        ways[way.attrib['id']] = way
    for relation in root.findall('relation'):
        relations[relation.attrib['id']] = relation

def tags(element):
    return {tag.attrib['k']: tag.attrib['v'] for tag in element.findall('tag')}

def geometry(way):
    if way is None:
        return None
    refs = [nd.attrib['ref'] for nd in way.findall('nd')]
    return [nodes[ref] for ref in refs] if refs and all(ref in nodes for ref in refs) else None

elements = []
for identity, way in ways.items():
    properties = tags(way)
    if not ('building' in properties or 'building:part' in properties or properties.get('natural') in ('water', 'wood') or properties.get('leisure') in ('park', 'garden', 'pitch') or properties.get('landuse') in ('grass', 'forest') or (properties.get('highway') == 'pedestrian' and properties.get('area') == 'yes')):
        continue
    points = geometry(way)
    if points:
        elements.append({'type': 'way', 'id': int(identity), 'tags': properties, 'geometry': points})
for identity, relation in relations.items():
    properties = tags(relation)
    if properties.get('natural') != 'water' and not properties.get('building') and properties.get('leisure') != 'park':
        continue
    members = [{'type': member.attrib['type'], 'ref': int(member.attrib['ref']), 'role': member.attrib.get('role', ''), 'geometry': geometry(ways.get(member.attrib['ref'])) if member.attrib['type'] == 'way' else None} for member in relation.findall('member')]
    elements.append({'type': 'relation', 'id': int(identity), 'tags': properties, 'members': members})
with open(sys.argv[1], 'w') as file:
    json.dump({'osm3s': {'timestamp_osm_base': '2026-10-08 API extracts'}, 'elements': elements}, file, separators=(',', ':'))
print(json.dumps({'elements': len(elements), 'relations': sum(e['type'] == 'relation' for e in elements)}))
