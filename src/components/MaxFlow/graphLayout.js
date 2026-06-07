// Pure SVG-layout helpers shared by the Maximum flow stage and playground.
//
// Nodes carry normalized (x, y) in 0..100 space (see maxFlowMeta). We scale them
// into the SVG viewBox and compute edge geometry trimmed to the node radius plus
// a small directed-arrow offset so arrowheads sit just outside the target. Flow
// networks often have a pair of opposite edges between the same two vertices
// (e.g. v2→v1 and v3→v2 with a v2→v3 elsewhere), so each edge is drawn as a
// gentle quadratic curve, bowed to one side, keeping anti-parallel edges apart.

export const VIEW_W = 100;
export const VIEW_H = 100;

export const projectNodes = (nodes, { padding = 9 } = {}) => {
	const span = 100 - 2 * padding;
	return nodes.map(n => ({
		...n,
		px: padding + (n.x / 100) * span,
		py: padding + (n.y / 100) * span,
	}));
};

// Build drawable edges. Each edge becomes a quadratic Bézier from a→b, bowed
// perpendicular to the a→b direction by `bow`. When an anti-parallel partner
// (b→a) also exists, both are bowed (in opposite senses) so they never overlap.
export const buildEdges = (edges, projected, { nodeR = 6, bow = 7 } = {}) => {
	const byId = Object.fromEntries(projected.map(n => [n.id, n]));
	const present = new Set(edges.map(e => `${e.from}->${e.to}`));

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
			// Perpendicular unit vector (to bow the curve off the straight line).
			const nx = -uy;
			const ny = ux;

			const hasPartner = present.has(`${e.to}->${e.from}`);
			// Bow direction: deterministic by id so the two halves of a pair split.
			const sign = e.from < e.to ? 1 : -1;
			const bend = hasPartner ? bow * sign : 0;

			const x1 = a.px + ux * nodeR;
			const y1 = a.py + uy * nodeR;
			const x2 = b.px - ux * (nodeR + 2.5);
			const y2 = b.py - uy * (nodeR + 2.5);

			// Control point: midpoint pushed along the perpendicular by `bend`.
			const cx = (x1 + x2) / 2 + nx * bend;
			const cy = (y1 + y2) / 2 + ny * bend;

			// Quadratic-curve midpoint (t = 0.5) for placing the capacity label.
			const mx = 0.25 * x1 + 0.5 * cx + 0.25 * x2;
			const my = 0.25 * y1 + 0.5 * cy + 0.25 * y2;
			// Nudge the label slightly further along the perpendicular so it clears
			// the curve.
			const lx = mx + nx * 3.2 * (bend === 0 ? sign : Math.sign(bend) || 1);
			const ly = my + ny * 3.2 * (bend === 0 ? sign : Math.sign(bend) || 1);

			return {
				...e,
				x1,
				y1,
				x2,
				y2,
				cx,
				cy,
				lx,
				ly,
				path: `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`,
			};
		})
		.filter(Boolean);
};
