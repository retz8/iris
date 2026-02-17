"""Edge case tests for analysis snapshots.

Validates behavior on empty files, minified code, comments-only
files, and barrel/re-export files using committed snapshots.
"""

from tests.conftest import load_snapshot


class TestEmptyFile:

    def test_should_return_empty_blocks_when_empty_source(self):
        result = load_snapshot("python_empty")
        assert result["responsibility_blocks"] == []

    def test_should_have_descriptive_intent_when_empty_source(self):
        result = load_snapshot("python_empty")
        assert result["file_intent"] != ""


class TestMinifiedCode:

    def test_should_return_valid_result_when_minified_js(self):
        result = load_snapshot("javascript_minified.min")
        assert "file_intent" in result
        assert "responsibility_blocks" in result
        blocks = result["responsibility_blocks"]
        assert len(blocks) >= 1

    def test_should_have_valid_ranges_when_minified_js(self):
        result = load_snapshot("javascript_minified.min")
        for block in result["responsibility_blocks"]:
            for r in block["ranges"]:
                assert len(r) == 2
                assert r[0] >= 1
                assert r[0] <= r[1]


class TestCommentsOnlyFile:

    def test_should_produce_blocks_when_comments_heavy(self):
        result = load_snapshot("python_comments_heavy")
        blocks = result["responsibility_blocks"]
        assert len(blocks) >= 1

    def test_should_have_meaningful_intent_when_comments_heavy(self):
        result = load_snapshot("python_comments_heavy")
        intent = result["file_intent"]
        assert len(intent.split()) >= 2


class TestBarrelFile:

    def test_should_handle_reexports_when_barrel_file(self):
        result = load_snapshot("typescript_index_barrel")
        assert "file_intent" in result
        blocks = result["responsibility_blocks"]
        assert len(blocks) >= 1

    def test_should_have_concise_intent_when_barrel_file(self):
        result = load_snapshot("typescript_index_barrel")
        words = len(result["file_intent"].split())
        assert words <= 15
