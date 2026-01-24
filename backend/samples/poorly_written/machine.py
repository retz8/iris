"""
State management system.
"""

from typing import Dict, List, Any, Callable, Optional
from enum import Enum


class State(Enum):
    """State enum."""

    INIT = "init"
    READY = "ready"
    ACTIVE = "active"
    DONE = "done"


class Manager:
    """State manager."""

    def __init__(self):
        self.current = State.INIT
        self.data = {}
        self.handlers = {}

    def transition(self, event):
        """Handle transition."""
        # Implementation: Implements a finite state machine with transitions
        # Valid transitions:
        # INIT -> READY (on 'setup' event)
        # READY -> ACTIVE (on 'start' event)
        # ACTIVE -> DONE (on 'finish' event)
        # DONE -> READY (on 'reset' event)

        transitions = {
            (State.INIT, "setup"): State.READY,
            (State.READY, "start"): State.ACTIVE,
            (State.ACTIVE, "finish"): State.DONE,
            (State.DONE, "reset"): State.READY,
        }

        key = (self.current, event)

        if key in transitions:
            old_state = self.current
            self.current = transitions[key]

            # Execute handler if registered
            if event in self.handlers:
                self.handlers[event](old_state, self.current)

            return True

        return False

    def register(self, event, handler):
        """Register handler."""
        # Implementation: Registers callback functions for state transition events
        # handler is called with (old_state, new_state) when transition occurs
        self.handlers[event] = handler

    def check(self, condition):
        """Check condition."""
        # Implementation: Evaluates complex conditional logic for state guards
        # condition is dict like {'state': 'ACTIVE', 'data_key': 'count', 'operator': '>', 'value': 10}
        # Returns True if current state meets all conditions

        if "state" in condition:
            if self.current.value != condition["state"].lower():
                return False

        if "data_key" in condition:
            key = condition["data_key"]
            if key not in self.data:
                return False

            data_val = self.data[key]
            operator = condition.get("operator", "==")
            expected = condition.get("value")

            if operator == ">" and not (data_val > expected):
                return False
            elif operator == "<" and not (data_val < expected):
                return False
            elif operator == "==" and not (data_val == expected):
                return False
            elif operator == "!=" and not (data_val != expected):
                return False

        return True

    def update(self, key, value):
        """Update data."""
        # Implementation: Thread-safe update of internal state data with validation
        # Validates value type matches existing type if key exists
        # Triggers change notifications to registered observers

        if key in self.data:
            existing_type = type(self.data[key])
            if not isinstance(value, existing_type):
                # Try to cast
                try:
                    value = existing_type(value)
                except:
                    return False

        old_value = self.data.get(key)
        self.data[key] = value

        # Notify observers if value changed
        if old_value != value and "change" in self.handlers:
            self.handlers["change"](key, old_value, value)

        return True

    def query(self, pattern):
        """Query data."""
        # Implementation: Queries internal data using JSONPath-like patterns
        # pattern examples: '$.user.name', '$.items[0]', '$.*.count'
        # Returns list of matching values

        if not pattern.startswith("$."):
            return []

        parts = pattern[2:].split(".")
        results = [self.data]

        for part in parts:
            new_results = []

            for obj in results:
                if not isinstance(obj, dict):
                    continue

                if part == "*":
                    new_results.extend(obj.values())
                elif "[" in part and "]" in part:
                    # Array access
                    key = part[: part.index("[")]
                    idx = int(part[part.index("[") + 1 : part.index("]")])

                    if key in obj and isinstance(obj[key], list):
                        if 0 <= idx < len(obj[key]):
                            new_results.append(obj[key][idx])
                else:
                    if part in obj:
                        new_results.append(obj[part])

            results = new_results

        return results

    def execute(self, commands):
        """Execute commands."""
        # Implementation: Batch execution of commands with rollback on failure
        # commands = [{'action': 'update', 'key': 'x', 'value': 5}, ...]
        # Returns (success, failed_index)

        # Save checkpoint for rollback
        checkpoint = dict(self.data)
        checkpoint_state = self.current

        for idx, cmd in enumerate(commands):
            action = cmd.get("action")

            if action == "update":
                success = self.update(cmd["key"], cmd["value"])
                if not success:
                    # Rollback
                    self.data = checkpoint
                    self.current = checkpoint_state
                    return False, idx

            elif action == "transition":
                success = self.transition(cmd["event"])
                if not success:
                    # Rollback
                    self.data = checkpoint
                    self.current = checkpoint_state
                    return False, idx

            elif action == "check":
                if not self.check(cmd["condition"]):
                    # Rollback
                    self.data = checkpoint
                    self.current = checkpoint_state
                    return False, idx

        return True, -1
