# Regression analysis for appeal_trait_experiment.ts: the change in how a
# clan's neighbors see it, regressed on its trait shocks (in SD units), with
# outcome and shocks demeaned within each settlement of each run.
#   python3 scratch/appeal_trait_analysis.py out1.jsonl [out2.jsonl ...]
import json, sys
import numpy as np

def load(paths):
    out = []
    for f in paths:
        for l in open(f):
            if not l.startswith('{'): continue
            try: out.append(json.loads(l))
            except json.JSONDecodeError: pass  # a line still being written
    return out
rows = load(sys.argv[1:])
traits = list(rows[0]['shocks'].keys())

def fit(horizon, key):
    data = [r for r in rows if str(horizon) in r['after'] and key in r['before']
            and key in r['after'][str(horizon)]]
    if len(data) < 50: return None
    groups = {}
    for r in data: groups.setdefault((r['run'], r['settlement']), []).append(r)
    X, y = [], []
    for g in groups.values():
        if len(g) < 2: continue
        gx = np.array([[r['shocks'][t] for t in traits] for r in g])
        gy = np.array([r['after'][str(horizon)][key] - r['before'][key] for r in g])
        X.append(gx - gx.mean(0)); y.append(gy - gy.mean())
    X = np.vstack(X); y = np.concatenate(y)
    beta, *_ = np.linalg.lstsq(X, y, rcond=None)
    resid = y - X @ beta
    dof = max(1, len(y) - len(traits) - len(groups))
    cov = np.linalg.inv(X.T @ X) * (resid @ resid / dof)
    return beta, np.sqrt(np.diag(cov)), len(y)

def betrothal_fit():
    data = [r for r in rows if r['men'] > 0]
    groups = {}
    for r in data: groups.setdefault((r['run'], r['settlement']), []).append(r)
    X, y, w = [], [], []
    for g in groups.values():
        if len(g) < 2: continue
        gx = np.array([[r['shocks'][t] for t in traits] for r in g])
        gy = np.array([r['taken'] / r['men'] for r in g])
        X.append(gx - gx.mean(0)); y.append(gy - gy.mean())
    X = np.vstack(X); y = np.concatenate(y)
    beta, *_ = np.linalg.lstsq(X, y, rcond=None)
    resid = y - X @ beta
    cov = np.linalg.inv(X.T @ X) * (resid @ resid / max(1, len(y) - len(traits)))
    return beta, np.sqrt(np.diag(cov)), len(y)

print(f"clans: {len(rows)}   traits: {', '.join(traits)}")
keys = sorted({k for r in rows for k in r['before']})
for horizon in (5, 15):
    print(f"\n=== change after {horizon} years, per +1 SD shock (coef / SE); * = |t|>2.5")
    print(f"{'outcome':22s}" + ''.join(f"{t[:9]:>10s}" for t in traits))
    for key in ['P', 'A', 'R', 'info', 'pop'] + [k for k in keys if ':' in k]:
        res = fit(horizon, key)
        if res is None: continue
        beta, se, n = res
        cells = ''.join(f"{b:+.4f}{'*' if abs(b) > 2.5 * s else ' '}".rjust(10) for b, s in zip(beta, se))
        errs = ''.join(f"({s:.4f})".rjust(10) for s in se)
        print(f"{key[:22]:22s}{cells}")
        print(f"{'':22s}{errs}")
b, se, n = betrothal_fit()
print(f"\n=== share of eligible men betrothed per year over 15 years (n={n})")
print(''.join(f"{t[:9]:>10s}" for t in traits))
print(''.join(f"{x:+.4f}{'*' if abs(x) > 2.5 * s else ' '}".rjust(10) for x, s in zip(b, se)))
print(''.join(f"({s:.4f})".rjust(10) for s in se))
