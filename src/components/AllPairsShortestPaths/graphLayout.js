// Pure SVG-layout helpers for the APSP stage + playground graph view.
//
// Nodes carry normalized (x, y) in 0..100 space (see apspMeta). We scale them
// into the SVG viewBox and compute edge endpoints trimmed to the node radius plus
// a small directed-arrow offset so arrowheads sit just outside the target. A
// curved control point is derived so a reverse edge (i→j alongside j→i) doesn't
// overlap its twin.

export const VIEW_W = 100;
export const VIEW_H = 100;

// Project a node's normalized position into the SVG coordinate space.
export const projectNodes = (nodes, { padding = 12 } = {}) => {
	const span = 100 - 2 * padding;
	return nodes.map(n => ({
		...n,
		px: padding + (n.x / 100) * span,
		py: padding + (n.y / 100) * span,
	}));
};

// Build drawable edges: a slightly curved quadratic path so opposing edges
// (i→j and j→i) bow apart, plus a label point near the curve's apex.
export const buildEdges = (edges, projected, { nodeR = 7, bow = 9 } = {}) => {
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
			// Perpendicular bow so reverse edges don't overlap.
			const nx = -uy;
			const ny = ux;
			const mx = (a.px + b.px) / 2 + nx * bow;
			const my = (a.py + b.py) / 2 + ny * bow;
			const x1 = a.px + ux * nodeR + nx * (bow * 0.18);
			const y1 = a.py + uy * nodeR + ny * (bow * 0.18);
			const x2 = b.px - ux * (nodeR + 2.5) + nx * (bow * 0.18);
			const y2 = b.py - uy * (nodeR + 2.5) + ny * (bow * 0.18);
			const path = `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
			// Label sits near the curve apex (quadratic midpoint).
			const lx = 0.25 * x1 + 0.5 * mx + 0.25 * x2;
			const ly = 0.25 * y1 + 0.5 * my + 0.25 * y2;
			return { ...e, x1, y1, x2, y2, path, lx, ly };
		})
		.filter(Boolean);
};
