// Pure SVG-layout helpers shared by the SSSP stage and playground.
//
// Nodes carry normalized (x, y) in 0..100 space (see ssspMeta). We scale them
// into the SVG viewBox, and compute edge endpoints trimmed to the node radius
// plus a small directed-arrow offset so arrowheads sit just outside the target.

export const VIEW_W = 100;
export const VIEW_H = 100;

// Project a node's normalized position into the SVG coordinate space.
export const projectNodes = (nodes, { padding = 10 } = {}) => {
	const span = 100 - 2 * padding;
	return nodes.map(n => ({
		...n,
		px: padding + (n.x / 100) * span,
		py: padding + (n.y / 100) * span,
	}));
};

// Build drawable edges: endpoints trimmed toward each node so a directed
// arrowhead can sit at the target boundary, plus a midpoint for the weight label.
export const buildEdges = (edges, projected, { nodeR = 6 } = {}) => {
	const byId = Object.fromEntries(projected.map(n => [n.id, n]));
	return edges
		.map(e => {
			const a = byId[e.from];
			const b = byId[e.to];
			if (!a || !b) return null;
			const dx = b.px - a.px;
			const dy = b.py - a.py;
			const len = Math.hypot(dx, dy) || 1;
			const ux = dx / len;
			const uy = dy / len;
			const x1 = a.px + ux * nodeR;
			const y1 = a.py + uy * nodeR;
			const x2 = b.px - ux * (nodeR + 2.5);
			const y2 = b.py - uy * (nodeR + 2.5);
			// Offset the weight label slightly off the line so it stays readable.
			const mx = (x1 + x2) / 2 - uy * 4;
			const my = (y1 + y2) / 2 + ux * 4;
			return { ...e, x1, y1, x2, y2, mx, my };
		})
		.filter(Boolean);
};
