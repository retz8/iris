"""Unit tests for build_single_shot_user_prompt().

Tests prompt construction logic without any LLM calls.
"""

from src.prompts import build_single_shot_user_prompt


class TestBuildSingleShotUserPrompt:

    def test_should_add_line_numbers_when_multiline_source(self):
        source = "line one\nline two\nline three"
        result = build_single_shot_user_prompt(
            "test.py", "python", source
        )
        assert "   1|line one" in result
        assert "   2|line two" in result
        assert "   3|line three" in result

    def test_should_format_xml_tags_when_valid_input(self):
        source = "x = 1"
        result = build_single_shot_user_prompt(
            "test.py", "python", source
        )
        assert result.startswith("<input>")
        assert result.endswith("</input>")
        assert "<filename>test.py</filename>" in result
        assert "<language>python</language>" in result
        assert "<source_code>" in result
        assert "</source_code>" in result

    def test_should_handle_empty_source_when_empty_string(self):
        result = build_single_shot_user_prompt(
            "empty.py", "python", ""
        )
        assert "<filename>empty.py</filename>" in result
        assert "<source_code>" in result
        assert "</source_code>" in result

    def test_should_handle_unicode_when_special_chars(self):
        source = "# Unicode: \u00e9\u00e0\u00fc\u00f1\n\u0410 = 42"
        result = build_single_shot_user_prompt(
            "unicode.py", "python", source
        )
        assert "\u00e9\u00e0\u00fc\u00f1" in result
        assert "\u0410 = 42" in result
        assert "   1|" in result
        assert "   2|" in result

    def test_should_preserve_filename_when_path_like(self):
        result = build_single_shot_user_prompt(
            "src/utils/helper.ts", "typescript", "const x = 1;"
        )
        assert "<filename>src/utils/helper.ts</filename>" in result

    def test_should_number_single_line_as_one(self):
        result = build_single_shot_user_prompt(
            "one.py", "python", "x = 1"
        )
        assert "   1|x = 1" in result
        assert "   2|" not in result
