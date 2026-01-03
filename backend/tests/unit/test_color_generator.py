import pytest
from app.utils.color_generator import (
    hsl_to_hex,
    generate_module_color,
    get_color_for_node,
)


class TestHslToHex:
    """Tests for hsl_to_hex function."""

    @pytest.mark.parametrize(
        "hue,saturation,lightness,expected",
        [
            (0, 100, 50, "#ff0000"),  # Red
            (120, 100, 50, "#00ff00"),  # Green
            (240, 100, 50, "#0000ff"),  # Blue
            (0, 0, 100, "#ffffff"),  # White
            (0, 0, 0, "#000000"),  # Black
            (0, 0, 50, "#7f7f7f"),  # Gray (rounding gives 7f not 80)
        ],
        ids=["red", "green", "blue", "white", "black", "gray"],
    )
    def test_color_conversion(self, hue, saturation, lightness, expected):
        """Test HSL to hex conversion for various colors."""
        assert hsl_to_hex(hue, saturation, lightness) == expected


class TestGenerateModuleColor:
    """Tests for generate_module_color function."""

    def test_consistent_color(self):
        """Same module name always produces same color."""
        assert generate_module_color("app.services") == generate_module_color(
            "app.services"
        )

    def test_different_modules_different_colors(self):
        """Different module names produce different colors."""
        assert generate_module_color("app.services") != generate_module_color(
            "app.utils"
        )

    def test_depth_affects_lightness(self):
        """Depth parameter affects lightness."""
        assert generate_module_color("module", depth=0) != generate_module_color(
            "module", depth=3
        )

    def test_returns_valid_hex_format(self):
        """Returned value is a valid hex color."""
        color = generate_module_color("test.module")
        assert color.startswith("#")
        assert len(color) == 7
        int(color[1:], 16)  # Should not raise


class TestGetColorForNode:
    """Tests for get_color_for_node function."""

    @pytest.mark.parametrize(
        "is_circular,is_high_coupling,expected_color",
        [
            (True, False, "#DC2626"),  # Circular = red
            (False, True, "#F97316"),  # High coupling = orange
            (True, True, "#DC2626"),  # Circular takes priority
        ],
        ids=["circular", "high_coupling", "circular_priority"],
    )
    def test_special_node_colors(self, is_circular, is_high_coupling, expected_color):
        """Test special color assignment for problem nodes."""
        color = get_color_for_node(
            "node1",
            "app.services",
            is_circular=is_circular,
            is_high_coupling=is_high_coupling,
        )
        assert color == expected_color

    def test_normal_node_module_color(self):
        """Normal nodes get module-based colors."""
        color = get_color_for_node(
            "node1", "app.services.auth", is_circular=False, is_high_coupling=False
        )
        assert color not in ("#DC2626", "#F97316")
        assert color.startswith("#")
        assert len(color) == 7

    def test_valid_hex_colors(self):
        """All returned colors are valid hex."""
        for module in ["app", "app.services", "app.services.auth.oauth"]:
            color = get_color_for_node("n", module)
            assert color.startswith("#")
            assert len(color) == 7
