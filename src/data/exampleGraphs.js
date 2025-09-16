export const graph = {
	nodes: [
		{ id: 'A', x: 50, y: 50 },
		{ id: 'B', x: 200, y: 80 },
		{ id: 'C', x: 120, y: 200 },
	],
	edges: [
		{ from: 'A', to: 'B' },
		{ from: 'A', to: 'C' },
		{ from: 'B', to: 'C' },
	],
};
