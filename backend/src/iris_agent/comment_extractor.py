"""Comment extraction helpers for shallow AST processing.

Captures leading, trailing, and inline comment data keyed by line numbers.
"""

from __future__ import annotations

from typing import Dict, List, Optional, Sequence, Set, Tuple


class CommentExtractor:
    """Extracts comment metadata from source code for multiple languages."""

    def __init__(self, source: str, language: str) -> None:
        self.lines: List[str] = source.splitlines()
        self.language = language.lower()
        self.line_comment_tokens: Sequence[str] = self._line_comment_tokens(
            self.language
        )
        self.supports_block_comments = self.language not in {"python"}

        # Tracking structures
        self.comment_only_lines: Set[int] = set()
        self.comment_line_text: Dict[int, str] = {}
        self.trailing_comments: Dict[int, str] = {}

        self._scan_lines()

    def comments_for_range(
        self, start_line: int, end_line: int
    ) -> Dict[str, Optional[str]]:
        """Return leading, trailing, and inline comments for a node range."""

        leading = self._collect_leading_comment(start_line)
        trailing = self.trailing_comments.get(start_line)
        inline_comment: Optional[str] = None

        return {
            "leading_comment": leading if leading else None,
            "trailing_comment": trailing if trailing else None,
            "inline_comment": inline_comment,
        }

    def _scan_lines(self) -> None:
        in_block = False
        for idx, line in enumerate(self.lines, start=1):
            stripped = line.strip()

            # Handle ongoing block comment
            if in_block:
                self.comment_only_lines.add(idx)
                content = stripped
                if "*/" in line:
                    content = line.split("*/", 1)[0].strip()
                    in_block = False
                self.comment_line_text[idx] = self._trim_block_prefix(content)
                continue

            # Block comment start (may also end on same line)
            if self.supports_block_comments and "/*" in line:
                start_idx = line.find("/*")
                before = line[:start_idx].strip()
                after = line[start_idx + 2 :]
                end_idx = after.find("*/")

                comment_payload = (
                    after[:end_idx].strip() if end_idx != -1 else after.strip()
                )
                if before:
                    self.trailing_comments[idx] = comment_payload
                else:
                    self.comment_only_lines.add(idx)
                    self.comment_line_text[idx] = comment_payload

                if end_idx == -1:
                    in_block = True
                continue

            # Line comments (// or #)
            token_idx, token = self._find_line_comment_token(line)
            if token_idx is not None and token is not None:
                before = line[:token_idx].strip()
                comment_payload = line[token_idx + len(token) :].strip()
                if before:
                    self.trailing_comments[idx] = comment_payload
                else:
                    self.comment_only_lines.add(idx)
                    self.comment_line_text[idx] = comment_payload
                continue

    def _collect_leading_comment(self, start_line: int) -> str:
        collected: List[str] = []
        line_idx = start_line - 1
        while line_idx >= 1:
            if self.lines[line_idx - 1].strip() == "":
                break
            if line_idx not in self.comment_only_lines:
                break
            collected.append(self.comment_line_text.get(line_idx, "").rstrip())
            line_idx -= 1

        collected.reverse()
        return "\n".join([c for c in collected if c])

    def _find_line_comment_token(
        self, line: str
    ) -> Tuple[Optional[int], Optional[str]]:
        first_idx: Optional[int] = None
        first_token: Optional[str] = None
        for token in self.line_comment_tokens:
            idx = line.find(token)
            if idx != -1 and (first_idx is None or idx < first_idx):
                first_idx = idx
                first_token = token
        return first_idx, first_token

    def _line_comment_tokens(self, language: str) -> Sequence[str]:
        if language in {"python"}:
            return ("#",)
        return ("//",)

    def _trim_block_prefix(self, text: str) -> str:
        # Remove leading block markers or stars commonly used in block comments.
        return text.lstrip("*/ ")
