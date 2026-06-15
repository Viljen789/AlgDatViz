// The five scrolly scenes that build hash-map intuition before the playground.
//
// They tell one continuous story on a single small table (capacity 7): a key is
// hashed into a bucket, two keys collide, the collision is resolved by chaining,
// the load factor climbs, and finally a resize spreads the chains back out.
//
// Each scene ends with a `check` — a small interactive question answered before
// scrolling on. Wrong answers are never punished: the explanation reveals
// regardless, so every attempt is a teaching moment.

// The exact hash the dashboard uses, so the scrolly and the playground agree.
const computeHash = (key, capacity) => {
	let hash = 7;
	for (const char of key) {
		hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
	}
	return { rawHash: hash, index: hash % capacity };
};

export const STAGE_CAPACITY = 7;

// The keys the scrolly stage demonstrates, in insertion order. They are chosen
// so that two of them collide into the same bucket, which drives the chaining
// and load-factor scenes.
export const STAGE_KEYS = ['cat', 'dog', 'ate', 'zap', 'tea'];

// Precompute each key's bucket so the stage and checks stay in lock-step.
export const STAGE_HASHES = STAGE_KEYS.map(key => {
	const { rawHash, index } = computeHash(key, STAGE_CAPACITY);
	return { key, rawHash, index };
});

// The single key we hash "live" in scene 1, and its destination bucket.
export const FOCUS_KEY = 'cat';
const FOCUS = STAGE_HASHES.find(h => h.key === FOCUS_KEY);

// Which two keys collide (share a bucket)? Derive it rather than hardcode.
const collisionBucket = (() => {
	const byBucket = new Map();
	STAGE_HASHES.forEach(({ index }) => {
		byBucket.set(index, (byBucket.get(index) || 0) + 1);
	});
	for (const [index, count] of byBucket) {
		if (count > 1) return index;
	}
	return null;
})();

export const COLLISION_BUCKET = collisionBucket;
export const COLLISION_KEYS = STAGE_HASHES.filter(
	h => h.index === collisionBucket
).map(h => h.key);

export const SCENES = [
	{
		id: 'hash',
		eyebrow: 'The hash function',
		title: 'A key becomes a number, then an address.',
		body: `Hashing folds every character of "${FOCUS_KEY}" into one integer, then squeezes it into the table with mod capacity. Same key in, same bucket out — every time.`,
		check: {
			kind: 'numeric',
			prompt: `The table has ${STAGE_CAPACITY} buckets. hash("${FOCUS_KEY}") = ${FOCUS.rawHash}. Compute the bucket it lands in (0–${STAGE_CAPACITY - 1}).`,
			answer: FOCUS.index,
			placeholder: `0–${STAGE_CAPACITY - 1}`,
			explanation: `${FOCUS.rawHash} % ${STAGE_CAPACITY} = ${FOCUS.index}. The modulo is the "compression" step: it maps any hash, however large, onto one of the ${STAGE_CAPACITY} real slots. Change the capacity and the same key can land somewhere else — which is exactly why resizing forces a rehash.`,
		},
	},
	{
		id: 'collision',
		eyebrow: 'Collisions',
		title: 'Two different keys, one bucket.',
		body: `"${COLLISION_KEYS[0]}" and "${COLLISION_KEYS[1]}" hash to different numbers, but both compress to bucket ${COLLISION_BUCKET}. A collision is not a bug — with finite buckets it is inevitable.`,
		check: {
			kind: 'choice',
			prompt:
				'With more keys than buckets, are collisions avoidable by a smarter hash?',
			options: ['Yes, always', 'No, never', 'Only sometimes'],
			answer: 'No, never',
			explanation:
				'By the pigeonhole principle, once you have more keys than buckets at least two must share. A good hash spreads keys evenly so collisions stay rare and short — but it can never eliminate them. The data structure has to handle them gracefully.',
		},
	},
	{
		id: 'chaining',
		eyebrow: 'Separate chaining',
		title: 'The bucket holds a chain, not a single value.',
		body: `Each bucket is a tiny linked list. Colliding keys append to the chain, so nothing is lost. A lookup hashes to one bucket and walks only that chain, never the whole table. The catch: a lookup costs as much as the chain it lands in, so the cost is really the chain length, not the table size.`,
		check: {
			kind: 'choice',
			prompt: `To look up "${COLLISION_KEYS[1]}", how many of the ${STAGE_CAPACITY} buckets does the map have to scan?`,
			options: ['1', '2', `${STAGE_CAPACITY}`, 'All non-empty'],
			answer: '1',
			explanation: `Just one. Hashing jumps straight to bucket ${COLLISION_BUCKET}; the map then compares keys inside that single chain. The rest of the table is never touched. That is why the average cost is O(1) — work depends on the chain length, not on n.`,
		},
	},
	{
		id: 'load-factor',
		eyebrow: 'Load factor',
		title: 'Load factor measures the crowding.',
		body: `Load factor α = n / m: entries over buckets. With ${STAGE_KEYS.length} entries in ${STAGE_CAPACITY} buckets, α ≈ ${(STAGE_KEYS.length / STAGE_CAPACITY).toFixed(2)}. Under simple uniform hashing (keys spread evenly across buckets), the expected chain length is exactly α, so the average search, insert, and delete cost O(1 + α). Resizing keeps α a constant, which keeps that average O(1). As α climbs, chains lengthen and the average lookup slows.`,
		check: {
			kind: 'choice',
			prompt:
				'Above which load factor do most hash maps decide it is time to grow?',
			options: ['≈ 0.25', '≈ 0.5', '≈ 0.75', '≈ 2.0'],
			answer: '≈ 0.75',
			explanation:
				'Around α ≈ 0.75 the expected chain length starts to hurt, so most implementations resize there. Keeping α bounded by a constant is precisely what keeps the average operation O(1): bounded α means bounded chain length means bounded scan.',
		},
	},
	{
		id: 'resize',
		eyebrow: 'Resize & rehash',
		title: 'Grow the table, rehash everything.',
		body: `Resizing allocates a larger table and recomputes hash % newCapacity for every entry. It is one O(n) event, but it spreads the chains back out so the next many inserts stay O(1) — that is the amortized payoff.`,
		check: {
			kind: 'choice',
			prompt:
				'Why must every entry be rehashed when the table grows, instead of just copied over?',
			options: [
				'The keys change',
				'hash % capacity changes',
				'Chaining is recreated',
				'To re-sort the entries',
			],
			answer: 'hash % capacity changes',
			explanation:
				'The raw hash of a key never changes, but the bucket index is hash % capacity, and capacity just changed. An entry that lived in bucket 3 of 7 may belong in bucket 10 of 17. Every entry has to be re-placed, which is what makes resize O(n).',
		},
	},
	{
		id: 'worst-case',
		eyebrow: 'Average vs worst case',
		title: 'The O(1) is an average, resting on one assumption.',
		body: `That O(1) is an expectation, not a guarantee. It holds under simple uniform hashing: keys spread evenly, so a chain is α long on average. If every key collides into one bucket, the chain becomes the whole table and a single lookup walks all n entries.`,
		check: {
			kind: 'choice',
			prompt:
				'Hash table search, insert, and delete are average O(1). What is the worst case, and what assumption buys the average?',
			options: [
				'Worst case Θ(n); average assumes simple uniform hashing',
				'Always O(1); hashing removes the dependence on n',
				'Worst case Θ(log n); average assumes a balanced tree',
				'Worst case Θ(n); average assumes the keys are sorted',
			],
			answer: 'Worst case Θ(n); average assumes simple uniform hashing',
			misconceptions: {
				'Always O(1); hashing removes the dependence on n':
					'O(1) is only the expectation. Under simple uniform hashing the expected chain is α; adversarial or clustered keys that all collide make one chain hold every entry, so a lookup is Θ(n).',
				'Worst case Θ(log n); average assumes a balanced tree':
					'Θ(log n) is the balanced-tree bound. A chained hash table has no tree: a single overloaded bucket is a linear chain, so its worst case is Θ(n), not Θ(log n).',
				'Worst case Θ(n); average assumes the keys are sorted':
					'The worst case Θ(n) is right, but the average rests on simple uniform hashing (keys spread evenly), not on the keys being sorted. Hash tables never rely on key order.',
			},
			explanation:
				'Average-case O(1) for search, insert, and delete assumes simple uniform hashing: keys land in buckets evenly, so the expected chain length is the load factor α = n/m, and resizing keeps α a constant. The worst case is Θ(n): if every key hashes into the same bucket, that one chain holds all n entries and a single operation must walk the lot.',
		},
	},
];
