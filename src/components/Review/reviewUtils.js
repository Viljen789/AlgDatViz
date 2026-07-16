// Dependency-light review contracts shared by lessons, review UI, reference
// surfaces, and the full cross-topic bank. This module must not import any scene
// registry: opening one lesson should never load every other lesson just to ask
// whether a check is self-graded or to derive an accessible accent token.

// The check kinds the pure checkAnswer core can grade with no topic stage. Every
// other kind (currently only `pair`) is host-graded and excluded from review.
export const SELF_GRADED_KINDS = new Set([
	'choice',
	'numeric',
	'text',
	'order',
	'classify',
	'predict',
	'stepProbe',
	'spotbug',
]);

/** True when a check can be graded standalone, without its topic stage. */
export const isSelfGraded = check =>
	Boolean(check) && SELF_GRADED_KINDS.has(check.kind);

/**
 * True when a standalone check also carries enough context to make sense away
 * from its lesson visualization. Authors opt out with `reviewSafe: false`.
 */
export const isReviewSafe = check =>
	isSelfGraded(check) && check.reviewSafe !== false;

/** Derive the AA-safe text partners for a topic accent token. */
export const accentTokens = accent => {
	const suffix = /^var\(--topic-([a-z0-9]+)\)$/.exec(accent || '')?.[1];
	return {
		accent: accent || 'var(--color-accent-blue)',
		ink: suffix ? `var(--topic-${suffix}-ink)` : 'var(--topic-accent-ink)',
		contrast: suffix
			? `var(--topic-${suffix}-contrast)`
			: 'var(--color-text-on-accent)',
	};
};
