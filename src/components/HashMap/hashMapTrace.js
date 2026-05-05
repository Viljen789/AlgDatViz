// Multi-step trace generation for HashMap operations.
// Each frame represents a teaching beat that the StepControlBar can scrub through.

const computeHash = (key, capacity) => {
	let hash = 7;
	for (const char of key) {
		hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
	}
	return { rawHash: hash, index: hash % capacity };
};

const cloneBuckets = buckets => buckets.map(b => b.map(e => ({ ...e })));

const flatEntries = buckets => buckets.flat().map(({ key, value }) => ({ key, value }));

const isPrime = v => {
	if (v < 2) return false;
	for (let i = 2; i * i <= v; i++) if (v % i === 0) return false;
	return true;
};

const nextPrime = v => {
	let c = Math.max(3, v);
	while (!isPrime(c)) c++;
	return c;
};

const baseFrame = ({ buckets, capacity, line = null, ...rest }) => ({
	buckets: cloneBuckets(buckets),
	capacity,
	selectedBucket: null,
	activeKey: null,
	phase: 'idle',
	hash: null,
	scanIndex: null,
	collision: false,
	line,
	title: '',
	description: '',
	...rest,
});

export const buildPutTrace = ({ key, value, buckets, capacity }) => {
	const { rawHash, index } = computeHash(key, capacity);
	const frames = [];

	frames.push(
		baseFrame({
			buckets,
			capacity,
			activeKey: key,
			phase: 'hashing',
			line: 2,
			title: `Hash "${key}"`,
			description: `hash = 7; multiply by 31 and add each character code → ${rawHash}.`,
		})
	);

	frames.push(
		baseFrame({
			buckets,
			capacity,
			activeKey: key,
			selectedBucket: index,
			phase: 'compress',
			hash: rawHash,
			line: 3,
			title: `Bucket ${index}`,
			description: `${rawHash} % ${capacity} = ${index}.`,
		})
	);

	const targetBucket = buckets[index] || [];
	const existingIndex = targetBucket.findIndex(e => e.key === key);
	const collision = targetBucket.length > 0 && existingIndex === -1;

	frames.push(
		baseFrame({
			buckets,
			capacity,
			activeKey: key,
			selectedBucket: index,
			phase: 'scan',
			hash: rawHash,
			scanIndex: targetBucket.length,
			collision,
			line: 4,
			title:
				targetBucket.length === 0
					? 'Empty chain'
					: existingIndex >= 0
						? 'Match in chain'
						: `Collision — ${targetBucket.length} entries already`,
			description:
				targetBucket.length === 0
					? 'Bucket is empty. Insertion will be O(1).'
					: existingIndex >= 0
						? `"${key}" is already present at chain position ${existingIndex}. Update the value.`
						: 'Other keys live here. Separate chaining will append a new cell.',
		})
	);

	const next = cloneBuckets(buckets);
	const nextBucket = next[index] || (next[index] = []);
	if (existingIndex >= 0) {
		nextBucket[existingIndex] = { key, value, hash: rawHash };
	} else {
		nextBucket.push({ key, value, hash: rawHash });
	}

	frames.push(
		baseFrame({
			buckets: next,
			capacity,
			activeKey: key,
			selectedBucket: index,
			phase: 'commit',
			hash: rawHash,
			collision,
			line: existingIndex >= 0 ? 5 : 6,
			title: existingIndex >= 0 ? `Update ${key}` : `Insert ${key}`,
			description:
				existingIndex >= 0
					? 'Value replaced in place.'
					: 'New (key, value) appended to the chain.',
		})
	);

	return { frames, finalBuckets: next, finalCapacity: capacity };
};

export const buildGetTrace = ({ key, buckets, capacity }) => {
	const { rawHash, index } = computeHash(key, capacity);
	const frames = [];

	frames.push(
		baseFrame({
			buckets,
			capacity,
			activeKey: key,
			phase: 'hashing',
			line: 2,
			title: `Hash "${key}"`,
			description: `hash = 7; multiply by 31 and add each character code → ${rawHash}.`,
		})
	);

	frames.push(
		baseFrame({
			buckets,
			capacity,
			activeKey: key,
			selectedBucket: index,
			phase: 'compress',
			hash: rawHash,
			line: 3,
			title: `Bucket ${index}`,
			description: `${rawHash} % ${capacity} = ${index}.`,
		})
	);

	const targetBucket = buckets[index] || [];
	const matchPos = targetBucket.findIndex(e => e.key === key);
	const found = matchPos >= 0 ? targetBucket[matchPos] : null;

	frames.push(
		baseFrame({
			buckets,
			capacity,
			activeKey: key,
			selectedBucket: index,
			phase: 'scan',
			hash: rawHash,
			scanIndex: matchPos >= 0 ? matchPos : targetBucket.length,
			line: 4,
			title: found ? 'Match in chain' : 'No match in chain',
			description: found
				? `"${key}" found at chain position ${matchPos}.`
				: targetBucket.length === 0
					? 'Bucket was empty.'
					: `Walked all ${targetBucket.length} entries; no match.`,
		})
	);

	frames.push(
		baseFrame({
			buckets,
			capacity,
			activeKey: key,
			selectedBucket: index,
			phase: 'done',
			line: 5,
			title: found ? `Get → ${found.value}` : `Get → miss`,
			description: found
				? `Returned the matching value.`
				: 'Key not present in the table.',
		})
	);

	return { frames, finalBuckets: buckets, finalCapacity: capacity };
};

export const buildDeleteTrace = ({ key, buckets, capacity }) => {
	const { rawHash, index } = computeHash(key, capacity);
	const frames = [];

	frames.push(
		baseFrame({
			buckets,
			capacity,
			activeKey: key,
			phase: 'hashing',
			line: 2,
			title: `Hash "${key}"`,
			description: `hash = 7; multiply by 31 and add each character code → ${rawHash}.`,
		})
	);

	frames.push(
		baseFrame({
			buckets,
			capacity,
			activeKey: key,
			selectedBucket: index,
			phase: 'compress',
			hash: rawHash,
			line: 3,
			title: `Bucket ${index}`,
			description: `${rawHash} % ${capacity} = ${index}.`,
		})
	);

	const targetBucket = buckets[index] || [];
	const matchPos = targetBucket.findIndex(e => e.key === key);

	frames.push(
		baseFrame({
			buckets,
			capacity,
			activeKey: key,
			selectedBucket: index,
			phase: 'scan',
			hash: rawHash,
			scanIndex: matchPos >= 0 ? matchPos : targetBucket.length,
			line: 4,
			title: matchPos >= 0 ? 'Match in chain' : 'No match',
			description:
				matchPos >= 0
					? `"${key}" found at chain position ${matchPos}.`
					: 'Walked the chain, no match.',
		})
	);

	const next = cloneBuckets(buckets);
	if (matchPos >= 0) {
		next[index] = next[index].filter(e => e.key !== key);
	}

	frames.push(
		baseFrame({
			buckets: next,
			capacity,
			activeKey: key,
			selectedBucket: index,
			phase: 'commit',
			hash: rawHash,
			line: 5,
			title: matchPos >= 0 ? `Delete ${key}` : 'No-op',
			description:
				matchPos >= 0
					? 'Entry unlinked from the chain.'
					: 'Nothing to remove.',
		})
	);

	return { frames, finalBuckets: next, finalCapacity: capacity };
};

export const buildResizeTrace = ({ buckets, capacity }) => {
	const entries = flatEntries(buckets);
	const newCapacity = nextPrime(capacity * 2);
	const empty = Array.from({ length: newCapacity }, () => []);

	const frames = [];

	frames.push(
		baseFrame({
			buckets,
			capacity,
			phase: 'plan',
			line: 0,
			title: `New capacity = ${newCapacity}`,
			description: `Pick the next prime above 2·${capacity}.`,
		})
	);

	frames.push(
		baseFrame({
			buckets: empty,
			capacity: newCapacity,
			phase: 'allocate',
			line: 1,
			title: 'Allocate new table',
			description: `${newCapacity} empty buckets ready to receive rehashed entries.`,
		})
	);

	let working = empty.map(b => [...b]);
	for (const entry of entries) {
		const { rawHash, index } = computeHash(entry.key, newCapacity);
		working = working.map(b => [...b]);
		working[index].push({ ...entry, hash: rawHash });
		frames.push(
			baseFrame({
				buckets: working,
				capacity: newCapacity,
				selectedBucket: index,
				activeKey: entry.key,
				phase: 'rehash',
				hash: rawHash,
				line: 4,
				title: `Rehash "${entry.key}" → bucket ${index}`,
				description: `${rawHash} % ${newCapacity} = ${index}.`,
			})
		);
	}

	frames.push(
		baseFrame({
			buckets: working,
			capacity: newCapacity,
			phase: 'done',
			line: 5,
			title: 'Resize complete',
			description: `Chains are spread across ${newCapacity} buckets, lowering load factor.`,
		})
	);

	return { frames, finalBuckets: working, finalCapacity: newCapacity };
};

export const buildOperationTrace = (operation, args) => {
	switch (operation) {
		case 'put':
			return buildPutTrace(args);
		case 'get':
			return buildGetTrace(args);
		case 'delete':
			return buildDeleteTrace(args);
		case 'resize':
			return buildResizeTrace(args);
		default:
			return { frames: [], finalBuckets: args.buckets, finalCapacity: args.capacity };
	}
};

export const createBucketsFromEntries = (entries, capacity) => {
	const buckets = Array.from({ length: capacity }, () => []);
	entries.forEach(entry => {
		const { rawHash, index } = computeHash(entry.key, capacity);
		buckets[index].push({ ...entry, hash: rawHash });
	});
	return buckets;
};
