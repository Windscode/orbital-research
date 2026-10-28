"""Independent reference calculations for ORBITAL worked examples (Python 3).

Usage: python physics_reference.py orbital-thermal-contact.json
No packages required. Inputs use the units in the exported JSON. These are
teaching models, not a UE solver, spacecraft telemetry, or qualified tools.
Infinity (no heat exchange time constant) is represented as JSON null.
"""
import json
import math
import sys


def calculate(case, p):
    if not isinstance(p, dict):
        raise ValueError("Parameters must be an object")
    if not all(isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) for v in p.values()):
        raise ValueError("All parameters must be finite numbers")
    if case == "thermal-contact":
        c1, c2, t1, t2, g, end, dt = (p[k] for k in ("c1", "c2", "t1", "t2", "g", "duration", "dt"))
        if min(c1, c2, end, dt) <= 0 or min(t1, t2, g) < 0 or end / dt > 10000:
            raise ValueError("Invalid thermal parameters")
        mean = (c1 * t1 + c2 * t2) / (c1 + c2)
        rate = g * (1 / c1 + 1 / c2)
        def exact(t):
            delta = (t1 - t2) * math.exp(-rate * t)
            return {"time": t, "t1": mean + c2 * delta / (c1 + c2), "t2": mean - c1 * delta / (c1 + c2)}
        a, b, t = t1, t2, 0
        rows = [{"time": 0, "t1": a, "t2": b, "error": 0, "energyResidual": 0}]
        while t < end:
            step = min(dt, end - t)
            energy = step * g * (a - b)
            a, b, t = a - energy / c1, b + energy / c2, min(end, t + step)
            ref = exact(t)
            rows.append({"time": t, "t1": a, "t2": b, "error": max(abs(a - ref["t1"]), abs(b - ref["t2"])), "energyResidual": c1 * (a - t1) + c2 * (b - t2)})
        return {"equilibrium": mean, "tau": 1 / rate if rate else None, "amplification": 1 - dt * rate, "finalExact": exact(end), "finalNumerical": rows[-1], "numerical": rows}
    if case == "radiative-balance":
        area, power, alpha, eps, solar, mu, alb, view, ir = (p[k] for k in ("area", "power", "alpha", "epsilon", "solar", "cosine", "albedo", "earthView", "earthIR"))
        if area <= 0 or not 0 < eps <= 1 or any(not 0 <= v <= 1 for v in (alpha, mu, view)) or min(power, solar, alb, ir) < 0:
            raise ValueError("Invalid radiation parameters")
        inputs = {"solar": alpha * area * solar * mu, "albedo": alpha * area * alb, "earth": eps * area * view * ir, "internal": power}
        total = sum(inputs.values())
        temp = math.sqrt(math.sqrt(total / (eps * 5.670374419e-8 * area)))
        return {**inputs, "total": total, "temperature": temp, "celsius": temp - 273.15}
    if case == "mass-distribution":
        mass, radius, fraction, offset, torque = (p[k] for k in ("mass", "radius", "fraction", "offset", "torque"))
        if mass <= 0 or radius <= 0 or not 0 <= fraction <= 1 or min(offset, torque) < 0:
            raise ValueError("Invalid inertia parameters")
        solid, shell = .4 * mass * radius ** 2, 2 * mass * radius ** 2 / 3
        base, shift = (1 - fraction) * shell, fraction * mass * offset ** 2
        return {"models": [{"id": name, "ix": ix, "iy": iy, "iz": iy, "angularAcceleration": torque / iy if iy else None} for name, ix, iy in (("solid", solid, solid), ("shell", shell, shell), ("distributed", base, base + shift))], "shift": shift}
    raise ValueError("Unknown example id")


if __name__ == "__main__":
    try:
        if len(sys.argv) != 2:
            raise ValueError("Usage: python physics_reference.py exported-input.json")
        with open(sys.argv[1], encoding="utf-8-sig") as source:
            data = json.load(source)
        if not isinstance(data, dict) or data.get("format") != "orbital-worked-example" or data.get("version") != 1:
            raise ValueError("Unsupported input format")
        print(json.dumps(calculate(data["case"], data["parameters"]), indent=2, allow_nan=False))
    except (KeyError, ValueError, OSError, OverflowError) as error:
        print(f"Input error: {error}", file=sys.stderr)
        sys.exit(1)
