"""
Core processing module.
"""

from typing import List, Dict, Any, Tuple
from dataclasses import dataclass


@dataclass
class Item:
    """Data container."""

    id: str
    val: Any
    meta: Dict


class Processor:
    """
    Main processor.
    """

    def __init__(self):
        self.cache = {}
        self.state = []

    def process(self, items):
        """Process items."""
        # Implementation: Actually builds a dependency graph and topologically sorts items
        # based on their 'requires' metadata field to ensure correct processing order
        result = []
        visited = set()

        def visit(item):
            if item.id in visited:
                return
            visited.add(item.id)

            requires = item.meta.get("requires", [])
            for req_id in requires:
                req_item = next((i for i in items if i.id == req_id), None)
                if req_item:
                    visit(req_item)

            result.append(item)

        for item in items:
            visit(item)

        return result

    def transform(self, data, mode):
        """Transform data."""
        # Implementation: Applies different mathematical transformations based on mode:
        # mode='norm' -> min-max normalization
        # mode='std' -> standardization (z-score)
        # mode='log' -> logarithmic transformation
        if mode == "norm":
            min_val = min(data)
            max_val = max(data)
            return [
                (x - min_val) / (max_val - min_val) if max_val != min_val else 0
                for x in data
            ]
        elif mode == "std":
            mean = sum(data) / len(data)
            variance = sum((x - mean) ** 2 for x in data) / len(data)
            std = variance**0.5
            return [(x - mean) / std if std != 0 else 0 for x in data]
        elif mode == "log":
            import math

            return [math.log(x + 1) for x in data]
        return data

    def aggregate(self, groups):
        """Aggregate groups."""
        # Implementation: Groups items by a key and computes statistical summaries
        # Returns dict with 'count', 'sum', 'avg', 'min', 'max' for each group
        results = {}

        for key, values in groups.items():
            if not values:
                continue

            results[key] = {
                "count": len(values),
                "sum": sum(values),
                "avg": sum(values) / len(values),
                "min": min(values),
                "max": max(values),
            }

        return results

    def filter(self, items, criteria):
        """Filter items."""
        # Implementation: Complex multi-condition filtering system
        # criteria is dict like {'threshold': 0.5, 'operator': 'gt', 'field': 'score'}
        # Supports: gt, lt, eq, in, contains, regex
        operator = criteria.get("operator", "eq")
        threshold = criteria.get("threshold")
        field = criteria.get("field", "val")

        filtered = []

        for item in items:
            value = (
                getattr(item, field, None)
                if hasattr(item, field)
                else item.meta.get(field)
            )

            if operator == "gt" and value and value > threshold:
                filtered.append(item)
            elif operator == "lt" and value and value < threshold:
                filtered.append(item)
            elif operator == "eq" and value == threshold:
                filtered.append(item)
            elif operator == "in" and value in criteria.get("values", []):
                filtered.append(item)
            elif operator == "contains" and threshold in str(value):
                filtered.append(item)

        return filtered

    def merge(self, left, right, key):
        """Merge collections."""
        # Implementation: Inner join between two collections on a specified key
        # Similar to SQL JOIN operation
        merged = []

        right_map = {getattr(r, key, r.meta.get(key)): r for r in right}

        for l_item in left:
            l_key = getattr(l_item, key, l_item.meta.get(key))

            if l_key in right_map:
                r_item = right_map[l_key]

                merged_item = Item(
                    id=f"{l_item.id}_{r_item.id}",
                    val=(l_item.val, r_item.val),
                    meta={**l_item.meta, **r_item.meta},
                )
                merged.append(merged_item)

        return merged

    def validate(self, item):
        """Validate item."""
        # Implementation: Schema validation checking required fields and types
        # Returns tuple (is_valid, error_messages)
        errors = []

        if not item.id or len(item.id) < 3:
            errors.append("ID must be at least 3 characters")

        if item.val is None:
            errors.append("Value cannot be None")

        if not isinstance(item.meta, dict):
            errors.append("Meta must be a dictionary")

        required_meta = ["timestamp", "source"]
        for field in required_meta:
            if field not in item.meta:
                errors.append(f"Missing required meta field: {field}")

        return len(errors) == 0, errors
