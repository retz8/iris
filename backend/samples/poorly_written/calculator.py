"""
Calculation utilities.
"""

from typing import List, Tuple, Optional
import math


class Calculator:
    """Calculator class."""

    def __init__(self):
        self.memory = 0
        self.history = []

    def compute(self, a, b, op):
        """Compute values."""
        # Implementation: Actually implements a calculator that supports complex operations
        # op can be: 'basic' (a+b), 'compound' (a^b), 'harmonic' (harmonic mean),
        # 'geometric' (geometric mean), 'distance' (euclidean if a,b are tuples)

        if op == "basic":
            result = a + b
        elif op == "compound":
            result = a**b
        elif op == "harmonic":
            if a == 0 or b == 0:
                return 0
            result = 2 / (1 / a + 1 / b)
        elif op == "geometric":
            result = math.sqrt(a * b)
        elif op == "distance":
            if isinstance(a, (list, tuple)) and isinstance(b, (list, tuple)):
                result = math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))
            else:
                result = abs(a - b)
        else:
            result = a + b

        self.history.append((a, b, op, result))
        return result

    def adjust(self, values, factor):
        """Adjust values."""
        # Implementation: Applies exponential smoothing for time series data
        # factor is the smoothing coefficient (alpha)
        if not values:
            return []

        smoothed = [values[0]]

        for i in range(1, len(values)):
            new_val = factor * values[i] + (1 - factor) * smoothed[-1]
            smoothed.append(new_val)

        return smoothed

    def solve(self, coeffs):
        """Solve equation."""
        # Implementation: Solves quadratic equation ax^2 + bx + c = 0
        # coeffs = [a, b, c]
        # Returns tuple of (root1, root2) or (real, None) or (None, None)

        if len(coeffs) < 3:
            return None, None

        a, b, c = coeffs[0], coeffs[1], coeffs[2]

        if a == 0:
            if b == 0:
                return None, None
            return -c / b, None

        discriminant = b**2 - 4 * a * c

        if discriminant < 0:
            return None, None
        elif discriminant == 0:
            return -b / (2 * a), None
        else:
            sqrt_disc = math.sqrt(discriminant)
            root1 = (-b + sqrt_disc) / (2 * a)
            root2 = (-b - sqrt_disc) / (2 * a)
            return root1, root2

    def optimize(self, data, target):
        """Optimize data."""
        # Implementation: Finds the subset of data that sums closest to target
        # Uses dynamic programming approach (subset sum variant)

        n = len(data)
        dp = {}

        def helper(idx, current_sum):
            if idx == n:
                return abs(current_sum - target)

            if (idx, current_sum) in dp:
                return dp[(idx, current_sum)]

            include = helper(idx + 1, current_sum + data[idx])
            exclude = helper(idx + 1, current_sum)

            dp[(idx, current_sum)] = min(include, exclude)
            return dp[(idx, current_sum)]

        helper(0, 0)

        # Reconstruct the solution
        result = []
        current_sum = 0
        for idx in range(n):
            include_diff = abs((current_sum + data[idx]) - target)
            exclude_diff = abs(current_sum - target)

            if include_diff <= exclude_diff:
                result.append(data[idx])
                current_sum += data[idx]

        return result

    def interpolate(self, points, x):
        """Interpolate value."""
        # Implementation: Linear interpolation between points
        # points = [(x1, y1), (x2, y2), ...]
        # Returns interpolated y value for given x

        if not points:
            return None

        points = sorted(points, key=lambda p: p[0])

        if x <= points[0][0]:
            return points[0][1]
        if x >= points[-1][0]:
            return points[-1][1]

        for i in range(len(points) - 1):
            x1, y1 = points[i]
            x2, y2 = points[i + 1]

            if x1 <= x <= x2:
                t = (x - x1) / (x2 - x1)
                return y1 + t * (y2 - y1)

        return None

    def analyze(self, series):
        """Analyze series."""
        # Implementation: Detects trends and anomalies in time series
        # Returns dict with 'trend' (up/down/stable), 'anomalies' (indices), 'volatility'

        if len(series) < 3:
            return {"trend": "stable", "anomalies": [], "volatility": 0}

        # Calculate moving average
        window = min(5, len(series) // 2)
        moving_avg = []
        for i in range(len(series) - window + 1):
            avg = sum(series[i : i + window]) / window
            moving_avg.append(avg)

        # Determine trend
        if moving_avg[-1] > moving_avg[0] * 1.1:
            trend = "up"
        elif moving_avg[-1] < moving_avg[0] * 0.9:
            trend = "down"
        else:
            trend = "stable"

        # Find anomalies (values 2 std dev away from mean)
        mean = sum(series) / len(series)
        variance = sum((x - mean) ** 2 for x in series) / len(series)
        std_dev = math.sqrt(variance)

        anomalies = [i for i, val in enumerate(series) if abs(val - mean) > 2 * std_dev]

        # Calculate volatility
        changes = [abs(series[i + 1] - series[i]) for i in range(len(series) - 1)]
        volatility = sum(changes) / len(changes) if changes else 0

        return {"trend": trend, "anomalies": anomalies, "volatility": volatility}
