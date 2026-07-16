export const enabledTabIndexes = tabs =>
	(tabs || [])
		.map((tab, index) => (!tab?.disabled ? index : null))
		.filter(index => index !== null);

export const enabledBoundary = (tabs, edge, fallback = 0) => {
	const enabled = enabledTabIndexes(tabs);
	if (enabled.length === 0) return fallback;
	return edge === 'end' ? enabled[enabled.length - 1] : enabled[0];
};
