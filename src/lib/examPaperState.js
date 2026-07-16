// Pure URL-state helpers for reproducible exam papers.
//
// A sitting needs two pieces of durable state:
//   1. the canonical STRING seed used to generate each problem instance;
//   2. the ordered set ids that make up this exact paper.
//
// Keeping this logic outside React makes copy-link and reload semantics testable.

/** Normalize every live seed to the same representation a URL returns. */
export const normalizeExamSeed = value => {
	const seed = String(value ?? '').trim();
	return seed === '' ? null : seed;
};
/** Create a short, non-zero URL-safe seed. Dependencies are injectable in tests. */
export const createExamSeed = (
	{ now = Date.now, random = Math.random } = {}
) => {
	const mixed =
		(Number(now()) ^ Math.floor(Number(random()) * 0xffffffff)) >>> 0;
	return String(mixed || 1);
};

const normalizePaperIds = ids => {
	const seen = new Set();
	const normalized = [];
	for (const value of ids ?? []) {
		const id = String(value ?? '').trim();
		if (!id || seen.has(id)) continue;
		seen.add(id);
		normalized.push(id);
	}
	return normalized;
};

/** Read a comma-separated, ordered paper selection from URL search params. */
export const readExamPaperIds = searchParams =>
	normalizePaperIds((searchParams?.get('paper') ?? '').split(','));

/** Resolve a durable id list back to this seed's set objects, preserving order. */
export const resolveExamPaperSets = (sets = [], ids = []) => {
	const byId = new Map(sets.map(set => [set.id, set]));
	return normalizePaperIds(ids)
		.map(id => byId.get(id))
		.filter(Boolean);
};

/** Build the exact URL copied from a summary, replacing any stale selection. */
export const examPaperUrl = (href, ids) => {
	const url = new URL(href);
	const normalized = normalizePaperIds(ids);
	if (normalized.length > 0) {
		url.searchParams.set('paper', normalized.join(','));
		// An explicit paper is stronger than a lesson's topic auto-start hint.
		url.searchParams.delete('topic');
	} else {
		url.searchParams.delete('paper');
	}
	return url.toString();
};
