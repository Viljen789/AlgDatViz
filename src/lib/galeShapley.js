// Gale-Shapley — the stable-matching / stable-marriage algorithm (deferred
// acceptance), plus a stability checker for ANY proposed matching.
//
// THE PROBLEM (Gale & Shapley 1962; CLRS-adjacent). We have two equal-sized
// sides — here "men" and "women", the classic framing — and every member ranks
// everyone on the other side in a strict order of preference. A MATCHING is a
// one-to-one pairing of men to women. A matching is UNSTABLE if there is a
// BLOCKING PAIR: a man m and a woman w who are NOT matched to each other yet
// each prefer the other to their current partner. Such a pair would "elope",
// breaking the matching. A matching with no blocking pair is STABLE. Gale &
// Shapley proved a stable matching always exists and gave an algorithm to find
// one.
//
// PREFERENCE CONVENTION (read this before touching anything). Preferences are
// passed as a map  id -> orderedPreferenceList,  MOST-PREFERRED FIRST. So if
//     menPrefs.get('m1') === ['w2', 'w1', 'w3']
// then m1 likes w2 best, w1 second, w3 last. "m prefers a over b" therefore
// means a appears at a SMALLER index than b in m's list (rank ascending =
// preference descending). We index ranks once up front (rankOf) so every
// comparison is an O(1) integer compare rather than an indexOf scan.
//
// MEN-PROPOSE (the convention this module implements). In men-proposing
// deferred acceptance, men do the proposing and women hold/trade up:
//
//   - Every man starts free and proposes down his list in order.
//   - When a free man m proposes to the next woman w he has not yet asked:
//       * if w is free, she provisionally accepts (m, w) are engaged;
//       * if w is already engaged to m', she compares m and m' by HER list and
//         keeps whichever she prefers, freeing the other.
//   - A man rejected (or jilted) becomes free again and proposes to his next
//     choice. He never re-proposes to a woman who has already rejected him.
//
// This terminates (each man proposes to each woman at most once, so at most n²
// proposals) with a stable matching that is MAN-OPTIMAL: simultaneously, every
// man gets the BEST partner he could have in ANY stable matching, and — the dual
// — every woman gets her WORST stable partner. Swapping the roles (women
// propose) yields the woman-optimal matching instead.
//
// DETERMINISM. The set of free men is processed in a FIXED order: ascending by
// the order their ids appear in menPrefs (insertion order of the input map).
// Same input ⇒ same output, every run — which is what lets an exam answer key be
// DERIVED by calling this at module load.
//
// PURITY. Nothing here mutates its arguments. Inputs may be plain objects
// ({ m1: [...] }) or Maps; we normalise to Maps internally. Outputs are fresh.

// ── normalisation helpers (pure) ─────────────────────────────────────────────

// Accept either a Map or a plain object as a prefs table; return a Map whose
// iteration order matches the input's declared order (insertion order for both
// Map and object). We copy each list so callers can never alias our internals.
const toPrefMap = prefs => {
	if (prefs instanceof Map) {
		const m = new Map();
		for (const [k, list] of prefs) m.set(String(k), [...list].map(String));
		return m;
	}
	const m = new Map();
	for (const k of Object.keys(prefs)) m.set(String(k), [...prefs[k]].map(String));
	return m;
};

// Build  who -> (otherId -> rank)  so "does X prefer a over b" is an O(1) compare
// of two integer ranks. Smaller rank = more preferred (index 0 is the favourite).
const buildRanks = prefMap => {
	const ranks = new Map();
	for (const [who, list] of prefMap) {
		const r = new Map();
		list.forEach((other, i) => r.set(other, i));
		ranks.set(who, r);
	}
	return ranks;
};

// Accept a matching given as either a Map(man->woman), a plain object
// { man: woman }, or an array of [man, woman] pairs; return a Map(man->woman).
const toMatchingMap = matching => {
	const m = new Map();
	if (matching instanceof Map) {
		for (const [man, woman] of matching) m.set(String(man), String(woman));
	} else if (Array.isArray(matching)) {
		for (const [man, woman] of matching) m.set(String(man), String(woman));
	} else {
		for (const man of Object.keys(matching))
			m.set(String(man), String(matching[man]));
	}
	return m;
};

// ── the algorithm ────────────────────────────────────────────────────────────

/**
 * galeShapley — men-propose deferred acceptance.
 *
 * @param {Map<string,string[]>|Object} menPrefs   man -> ordered women (best first)
 * @param {Map<string,string[]>|Object} womenPrefs woman -> ordered men   (best first)
 * @returns {{ matching: Map<string,string>, pairs: Array<[string,string]> }}
 *          `matching` maps each man to the woman he is matched with; `pairs` is
 *          the same matching as [man, woman] tuples in man-id (input) order.
 *          The result is stable and man-optimal (see header).
 */
export function galeShapley(menPrefs, womenPrefs) {
	const men = toPrefMap(menPrefs);
	const women = toPrefMap(womenPrefs);
	const womenRank = buildRanks(women); // woman -> (man -> rank), for her choices

	// man -> index of the next woman on his list he will propose to.
	const nextIdx = new Map();
	// woman -> her current fiancé (or undefined while free).
	const fiance = new Map();
	// man -> his current fiancée (or undefined while free). The answer we return.
	const partner = new Map();

	// Fixed processing order: the men in the order they appear in menPrefs.
	const menOrder = [...men.keys()];
	for (const m of menOrder) nextIdx.set(m, 0);

	// A man is free iff he has no partner. Loop until none are free (or a free man
	// has exhausted his list, which cannot happen with complete equal-size lists).
	let progressed = true;
	while (progressed) {
		progressed = false;
		for (const m of menOrder) {
			if (partner.has(m)) continue; // already engaged
			const list = men.get(m);
			const i = nextIdx.get(m);
			if (i >= list.length) continue; // exhausted (shouldn't happen here)
			progressed = true;
			const w = list[i];
			nextIdx.set(m, i + 1); // never propose to w again

			const current = fiance.get(w);
			if (current === undefined) {
				// w is free: provisional engagement.
				fiance.set(w, m);
				partner.set(m, w);
			} else {
				// w chooses between her current fiancé and the new suitor m.
				const rank = womenRank.get(w);
				if (rank.get(m) < rank.get(current)) {
					// She prefers m: jilt `current`, engage m.
					fiance.set(w, m);
					partner.set(m, w);
					partner.delete(current); // `current` is free again
				}
				// else: she keeps `current`; m stays free and proposes onward.
			}
		}
	}

	const matching = new Map();
	const pairs = [];
	for (const m of menOrder) {
		const w = partner.get(m);
		matching.set(m, w);
		pairs.push([m, w]);
	}
	return { matching, pairs };
}

/**
 * blockingPairs — every blocking pair of an ARBITRARY proposed matching.
 *
 * A pair (m, w) blocks `matching` when m and w are NOT matched to each other and
 *   - m prefers w to his current partner   (rank_m(w) < rank_m(partnerOf m)), AND
 *   - w prefers m to her current partner    (rank_w(m) < rank_w(partnerOf w)).
 *
 * @param {Map<string,string>|Object|Array<[string,string]>} matching man -> woman
 * @param {Map<string,string[]>|Object} menPrefs   man -> ordered women (best first)
 * @param {Map<string,string[]>|Object} womenPrefs woman -> ordered men   (best first)
 * @returns {Array<{ man: string, woman: string }>} the blocking pairs, scanned in
 *          (man-id order × that man's preference order); [] iff `matching` is stable.
 */
export function blockingPairs(matching, menPrefs, womenPrefs) {
	const men = toPrefMap(menPrefs);
	const women = toPrefMap(womenPrefs);
	const menRank = buildRanks(men);
	const womenRank = buildRanks(women);
	const match = toMatchingMap(matching);

	// woman -> her partner under this matching (inverse of `match`).
	const husbandOf = new Map();
	for (const [m, w] of match) husbandOf.set(w, m);

	const out = [];
	for (const m of men.keys()) {
		const myWoman = match.get(m);
		const myRank = menRank.get(m);
		// Only women m strictly prefers to his own partner can block — and only those
		// appear before her in his list. Walk his list up to (not including) her.
		const myWomanRank = myWoman === undefined ? Infinity : myRank.get(myWoman);
		for (const w of men.get(m)) {
			if (myRank.get(w) >= myWomanRank) break; // from here on m does NOT prefer w
			if (w === myWoman) continue; // matched to each other ⇒ not blocking
			const herHusband = husbandOf.get(w);
			const herRank = womenRank.get(w);
			const herHusbandRank =
				herHusband === undefined ? Infinity : herRank.get(herHusband);
			if (herRank.get(m) < herHusbandRank) {
				out.push({ man: m, woman: w });
			}
		}
	}
	return out;
}

/**
 * isStable — true iff `matching` has no blocking pair.
 *
 * @param {Map<string,string>|Object|Array<[string,string]>} matching man -> woman
 * @param {Map<string,string[]>|Object} menPrefs   man -> ordered women (best first)
 * @param {Map<string,string[]>|Object} womenPrefs woman -> ordered men   (best first)
 * @returns {boolean}
 */
export function isStable(matching, menPrefs, womenPrefs) {
	return blockingPairs(matching, menPrefs, womenPrefs).length === 0;
}
