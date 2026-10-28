#!/usr/bin/env python3
"""Re-integrate published NASA TMR CFL3D-SA surface pressures; no CFD is run.

Python standard library only. Run beside n0012cp_cfl3d_sa.dat and
n0012clcd_cfl3d_sa.dat. Outputs pressure-force coefficients and a sampling
sensitivity table. The published force file includes pressure AND viscous
forces; the reconstructed pressure-only result is not a total-drag estimate.
"""
import argparse
import csv
import json
import math
from pathlib import Path


def read_zones(path):
    zones = []
    for raw in Path(path).read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if line.lower().startswith("zone"):
            zones.append({"label": line, "rows": []})
        elif line and line[0] in "-.0123456789":
            if not zones:
                zones.append({"label": "unlabelled", "rows": []})
            zones[-1]["rows"].append([float(v) for v in line.split()])
    return zones


def thickness(x):
    """Legacy validation geometry, reconstructed at rounded Cp abscissae.

    The archived validation grid used -0.105174696 (old published typo), so
    this function preserves that coefficient and explicitly closes the TE.
    The current corrected geometry uses -0.105174606; do not silently mix it
    with the archived 897x257 grid used for these published Cp values.
    The primary output is therefore a post-processing approximation, not the
    solver's original force integration using its exact grid metrics.
    """
    if x in (0.0, 1.0):
        return 0.0
    if not 0.0 <= x <= 1.0:
        raise ValueError("x/c outside the closed chord")
    return 0.594689181 * (
        0.298222773 * math.sqrt(x) - 0.127125232 * x
        - 0.357907906 * x**2 + 0.291984971 * x**3
        - 0.105174696 * x**4
    )


def split_surfaces(rows):
    if len(rows) != 513:
        raise ValueError("Expected 513 Cp rows in each published zone")
    if rows[0][0] != 1.0 or rows[256][0] != 0.0 or rows[-1][0] != 1.0:
        raise ValueError("Expected TE -> LE -> TE ordering")
    lower = rows[:257][::-1]
    upper = rows[256:]
    x = [p[0] for p in upper]
    if x != [p[0] for p in lower] or any(b <= a for a, b in zip(x, x[1:])):
        raise ValueError("Expected matching strictly increasing x on both sides")
    return x, [thickness(v) for v in x], [p[1] for p in lower], [p[1] for p in upper]


def integrate(x, y, lower, upper, alpha_deg, stride=1):
    """Separate surface integration, independent of a closed-polygon routine.

    x is LE->TE; y >= 0 is the upper ordinate; lower ordinate is -y.
    CNp = integral (Cp_lower-Cp_upper) dx
    CAp = integral (Cp_lower+Cp_upper) dy_upper
    CLp = CNp cos(alpha) - CAp sin(alpha)
    CDp = CNp sin(alpha) + CAp cos(alpha)
    """
    if stride not in (1, 2, 4, 8, 16, 32, 64):
        raise ValueError("stride must retain LE and TE")
    indices = list(range(0, len(x), stride))
    if indices[-1] != len(x) - 1:
        raise ValueError("stride dropped the trailing edge")
    normal_terms, axial_terms = [], []
    for i, j in zip(indices, indices[1:]):
        normal_terms.append(0.5 * ((lower[i] - upper[i]) + (lower[j] - upper[j])) * (x[j] - x[i]))
        axial_terms.append(0.5 * ((lower[i] + upper[i]) + (lower[j] + upper[j])) * (y[j] - y[i]))
    cn, ca = math.fsum(normal_terms), math.fsum(axial_terms)
    alpha = math.radians(alpha_deg)
    return {"stride": stride, "contourPoints": 2 * len(indices) - 1,
            "CNp": cn, "CAp": ca,
            "CLp": cn * math.cos(alpha) - ca * math.sin(alpha),
            "CDp": cn * math.sin(alpha) + ca * math.cos(alpha)}


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("directory", nargs="?", default=str(Path(__file__).parent))
    ap.add_argument("--json", type=Path)
    ap.add_argument("--csv", type=Path)
    args = ap.parse_args()
    folder = Path(args.directory)
    cp_zones = read_zones(folder / "n0012cp_cfl3d_sa.dat")
    force_rows = read_zones(folder / "n0012clcd_cfl3d_sa.dat")[0]["rows"]
    if len(cp_zones) != 3 or [row[0] for row in force_rows] != [0, 10, 15]:
        raise ValueError("Expected published alpha=0,10,15 cases")
    output = []
    for zone, (alpha, published_cl, published_cd) in zip(cp_zones, force_rows):
        x, y, lower, upper = split_surfaces(zone["rows"])
        full = integrate(x, y, lower, upper, alpha)
        # Numerical self-checks do not validate the external CFD model.
        constant = integrate(x, y, [1.0] * len(x), [1.0] * len(x), alpha)
        assert abs(constant["CLp"]) < 1e-14 and abs(constant["CDp"]) < 1e-14
        offset = integrate(x, y, [p + 3 for p in lower], [p + 3 for p in upper], alpha)
        assert abs(offset["CLp"] - full["CLp"]) < 2e-14
        assert abs(offset["CDp"] - full["CDp"]) < 2e-14
        rows = []
        for stride in (1, 2, 4, 8, 16, 32, 64):
            sample = integrate(x, y, lower, upper, alpha, stride)
            sample.update({"alpha_deg": alpha,
                           "publishedTotalCL": published_cl,
                           "publishedTotalCD": published_cd,
                           "deltaCLFromFullSampling": sample["CLp"] - full["CLp"],
                           "deltaCDFromFullSampling": sample["CDp"] - full["CDp"]})
            rows.append(sample)
        output.extend(rows)
        print(f"alpha={alpha:g}: CL_pressure={full['CLp']:.12g}; CD_pressure={full['CDp']:.12g}; "
              f"published_total_CL={published_cl:.12g}; published_total_CD={published_cd:.12g}")
    if args.json:
        args.json.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    if args.csv:
        with args.csv.open("w", newline="", encoding="utf-8") as out:
            writer = csv.DictWriter(out, fieldnames=list(output[0]))
            writer.writeheader()
            writer.writerows(output)


if __name__ == "__main__":
    main()
