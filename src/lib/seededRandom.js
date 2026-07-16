// Small deterministic random helpers. Kept independent from reviewBank so exam
// instance generation does not load every lesson's scene data just to seed a
// reproducible PRNG.

/** Mulberry32: a deterministic 32-bit PRNG yielding floats in [0, 1). */
export const mulberry32 = seed => {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
};

/** Normalize a finite number or arbitrary string to a 32-bit unsigned seed. */
export const toSeed = seed => {
	if (typeof seed === 'number' && Number.isFinite(seed)) return seed >>> 0;
	const str = String(seed ?? 0);
	let h = 2166136261;
	for (let i = 0; i < str.length; i += 1) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
};

/** Deterministic Fisher-Yates shuffle; always returns a fresh array. */
export const shuffleWithSeed = (list, seed = 1) => {
	const out = [...list];
	const rand = mulberry32(toSeed(seed));
	for (let i = out.length - 1; i > 0; i -= 1) {
		const j = Math.floor(rand() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
};
