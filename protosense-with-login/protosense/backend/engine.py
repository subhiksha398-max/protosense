"""Demo matching engine (weighted token similarity). Mirrors src/engine.ts.
Replace with TF-IDF / embeddings later; keep the analyze() return shape."""
import re, math
SW = set('the a an of on in to and or is are at when with during under after before it its for from by'.split())
WEIGHTS = {'symptom': .35, 'component': .2, 'condition': .2, 'category': .15, 'domain': .1}
STRONG = 0.3

def norm(s):
    ws = [w for w in re.sub(r'[^a-z0-9 ]', ' ', (s or '').lower()).split() if w not in SW]
    return [w[:-1] if len(w) > 3 and w.endswith('s') else w for w in ws]

def cos(a, b):
    A, B = set(norm(a)), set(norm(b))
    return len(A & B) / math.sqrt(len(A) * len(B)) if A and B else 0

def match(q, pool):
    w = WEIGHTS; g = lambda k: q.get(k, '')
    out = [{'e': e, 'score': w['symptom'] * cos(g('symptom'), e['symptom'] + ' ' + e['finding'])
            + w['component'] * cos(g('component'), e['component'])
            + w['condition'] * cos(g('condition'), e['condition'] + ' ' + e['finding'])
            + w['category'] * (g('category') == e['category']) + w['domain'] * (g('domain') == e['domain'])} for e in pool]
    return sorted(out, key=lambda m: -m['score'])

def analyze(q, pool):
    top = match(q, pool)[:3]; hit = [m for m in top if m['score'] >= STRONG]
    def group(key):
        d = {}
        for m in hit:
            e = m['e']; c = d.setdefault(e[key], {'rel': 0, 'ids': [], 'why': ''})
            c['rel'] = max(c['rel'], m['score']); c['ids'].append(e['id'])
            c['why'] = f"Recorded in {', '.join(c['ids'])} for a similar failure (\"{e['symptom']}\", {e['component']})."
        return sorted(d.items(), key=lambda kv: -kv[1]['rel'])
    return {'top': top, 'strong': bool(hit),
            'causes': [{'cause': k, 'rel': v['rel'], 'ids': v['ids'], 'why': v['why']} for k, v in group('cause')],
            'tests': [{'test': k, 'ids': v['ids'], 'why': v['why']} for k, v in group('nextTest')]}
