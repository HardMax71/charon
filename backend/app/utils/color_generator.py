import colorsys
import hashlib


def hsl_to_hex(h: float, s: float, lightness: float) -> str:
    """
    Convert HSL color to hex.

    Args:
        h: Hue (0-360)
        s: Saturation (0-100)
        lightness: Lightness (0-100)

    Returns:
        Hex color string (e.g., '#FF5733')
    """
    # Convert to 0-1 range
    h_norm = h / 360.0
    s_norm = s / 100.0
    l_norm = lightness / 100.0

    r, g, b = colorsys.hls_to_rgb(h_norm, l_norm, s_norm)

    return f"#{int(r * 255):02x}{int(g * 255):02x}{int(b * 255):02x}"


def generate_module_color(module_name: str, depth: int = 0) -> str:
    """
    Generate a consistent color for a module based on its name and depth.

    Args:
        module_name: Name of the module
        depth: Depth in the module hierarchy (for lightness variation)

    Returns:
        Hex color string
    """
    # Hash the module name to get a consistent hue
    hash_value = int(hashlib.md5(module_name.encode()).hexdigest(), 16)
    hue = hash_value % 360

    # Vary lightness based on depth (submodules get lighter)
    base_lightness = 50
    lightness = base_lightness + (depth * 8) % 40

    # Fixed saturation for vibrant colors
    saturation = 70

    return hsl_to_hex(hue, saturation, lightness)


def get_color_for_node(
    node_id: str,
    module_path: str,
    is_circular: bool = False,
    is_high_coupling: bool = False,
) -> str:
    """
    Get the appropriate color for a node.

    Args:
        node_id: Node identifier
        module_path: Module path for the node
        is_circular: Whether node is part of a circular dependency
        is_high_coupling: Whether node has high coupling

    Returns:
        Hex color string
    """
    # Priority: circular > high coupling > module color
    if is_circular:
        return "#DC2626"  # Red for circular dependencies

    if is_high_coupling:
        return "#F97316"  # Orange for high coupling

    # Calculate depth in module hierarchy
    depth = module_path.count(".")

    # Get top-level module for consistent coloring
    top_level = module_path.split(".")[0] if "." in module_path else module_path

    return generate_module_color(top_level, depth)
