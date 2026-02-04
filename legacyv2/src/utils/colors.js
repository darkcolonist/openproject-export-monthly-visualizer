/**
 * Color Utilities
 * Consistent color palette for charts and UI elements
 */

const CHART_COLORS = [
    '#60a5fa', // Blue 400
    '#f87171', // Red 400
    '#34d399', // Emerald 400
    '#fbbf24', // Amber 400
    '#a78bfa', // Violet 400
    '#f472b6', // Pink 400
    '#22d3ee', // Cyan 400
    '#fb923c', // Orange 400
    '#818cf8', // Indigo 400
    '#a3e635', // Lime 400
    '#2dd4bf', // Teal 400
    '#e879f9', // Fuchsia 400
    '#94a3b8', // Slate 400
    '#38bdf8', // Sky 400
    '#fb7185', // Rose 400
    '#c084fc'  // Purple 400
];

/**
 * Get a color by index (cycles through palette)
 */
export function getColor(index) {
    return CHART_COLORS[index % CHART_COLORS.length];
}

/**
 * Get all colors
 */
export function getAllColors() {
    return [...CHART_COLORS];
}

/**
 * Generate a color map for items
 */
export function createColorMap(items) {
    const map = {};
    items.forEach((item, index) => {
        map[item] = getColor(index);
    });
    return map;
}
