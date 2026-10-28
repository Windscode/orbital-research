"""Independent MRO two-body check. Python 3 standard library only.

Usage: python mro_reference.py states.json [--csv output.csv]
Download states.json from the site's frozen MRO dataset. This uses an
eccentricity-vector orbital basis, independent of the web universal-variable
implementation. Horizons is a sampled navigation ephemeris, not measurements.
"""
import argparse
import csv
import json
import math
from pathlib import Path

MU = 42828.37362069909  # km^3/s^2, archived gm_de440.tpc BODY499_GM

def dot(a, b):
    return sum(x*y for x, y in zip(a, b))

def norm(a):
    return math.sqrt(dot(a, a))

def cross(a, b):
    return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]

def scale(a, k):
    return [x*k for x in a]

def sub(a, b):
    return [x-y for x, y in zip(a, b)]

def add(a, b):
    return [x+y for x, y in zip(a, b)]

def reference(states):
    r0, v0 = states[0]["r_km"], states[0]["v_km_s"]
    h = cross(r0, v0)
    ev = sub(scale(cross(v0, h), 1/MU), scale(r0, 1/norm(r0)))
    e = norm(ev)
    a = 1/(2/norm(r0)-dot(v0, v0)/MU)
    if not (0 < e < 1 and a > 0):
        raise ValueError("This independent example requires a noncircular ellipse.")
    beta, n = math.sqrt(1-e*e), math.sqrt(MU/a**3)
    p = scale(ev, 1/e)
    q = cross(scale(h, 1/norm(h)), p)
    E0 = math.atan2(dot(r0, q)/(a*beta), dot(r0, p)/a+e)
    M0 = E0-e*math.sin(E0)
    rows = []
    for state in states:
        M = math.remainder(M0+n*state["t_s"], 2*math.pi)
        E = M
        for _ in range(30):
            delta = (E-e*math.sin(E)-M)/(1-e*math.cos(E))
            E -= delta
            if abs(delta) < 1e-14:
                break
        else:
            raise ValueError("Kepler iteration failed")
        r = add(scale(p, a*(math.cos(E)-e)), scale(q, a*beta*math.sin(E)))
        v = scale(add(scale(p, -math.sin(E)), scale(q, beta*math.cos(E))), n*a/(1-e*math.cos(E)))
        dr, dv = sub(r, state["r_km"]), sub(v, state["v_km_s"])
        radial = scale(state["r_km"], 1/norm(state["r_km"]))
        normal = cross(state["r_km"], state["v_km_s"])
        normal = scale(normal, 1/norm(normal))
        transverse = cross(normal, radial)
        rows.append({"t_TDB_s": state["t_s"], "position_difference_km": norm(dr),
                     "velocity_difference_km_s": norm(dv), "dR_km": dot(dr, radial),
                     "dT_km": dot(dr, transverse), "dN_km": dot(dr, normal)})
    return {"mu_km3_s2": MU, "a_km": a, "e": e, "period_s": 2*math.pi/n,
            "initial_position_reconstruction_km": rows[0]["position_difference_km"],
            "final": rows[-1], "samples": len(rows)}, rows

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("states", type=Path)
    parser.add_argument("--csv", type=Path, default=Path("mro-reference-results.csv"))
    args = parser.parse_args()
    data = json.loads(args.states.read_text(encoding="utf-8"))
    metadata, states = data["metadata"], data["states"]
    if metadata["timeScale"] != "TDB" or metadata["referenceSystem"] != "ICRF":
        raise ValueError("Expected the site's TDB/ICRF dataset")
    if metadata["center"]["id"] != 499 or metadata["aberrationCorrection"] != "NONE":
        raise ValueError("Expected geometric Mars-centred states")
    if len(states) != 289 or any(s["t_s"] != i*300 for i, s in enumerate(states)):
        raise ValueError("Unexpected time sampling")
    result, rows = reference(states)
    with args.csv.open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    print(json.dumps(result, indent=2))
