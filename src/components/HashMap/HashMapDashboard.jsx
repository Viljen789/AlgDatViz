import { Database, Plus, RefreshCw, RotateCcw, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import LearningPanel from '../../common/LearningPanel/LearningPanel.jsx';
import styles from './HashMapDashboard.module.css';

const INITIAL_ENTRIES = [
	{ key: 'cat', value: '5' },
	{ key: 'zap', value: '9' },
	{ key: 'dog', value: '4' },
	{ key: 'ate', value: '8' },
	{ key: 'tea', value: '7' },
];

const isPrime = value => {
	if (value < 2) return false;
	for (let i = 2; i * i <= value; i += 1) {
		if (value % i === 0) return false;
	}
	return true;
};

const nextPrime = value => {
	let candidate = Math.max(3, value);
	while (!isPrime(candidate)) candidate += 1;
	return candidate;
};

const computeHash = (key, capacity) => {
	let hash = 7;
	const rounds = [];
	for (const char of key) {
		const code = char.charCodeAt(0);
		hash = (Math.imul(hash, 31) + code) >>> 0;
		rounds.push(`${char}:${code}`);
	}
	return {
		rawHash: hash,
		index: hash % capacity,
		rounds,
	};
};

const createBuckets = (entries, capacity) => {
	const buckets = Array.from({ length: capacity }, () => []);
	entries.forEach(entry => {
		const details = computeHash(entry.key, capacity);
		buckets[details.index].push({ ...entry, hash: details.rawHash });
	});
	return buckets;
};

const flattenBuckets = buckets => buckets.flat().map(({ key, value }) => ({ key, value }));

const cloneBuckets = buckets => buckets.map(bucket => bucket.map(entry => ({ ...entry })));

const INITIAL_CAPACITY = 7;
const INITIAL_SELECTED_BUCKET = computeHash('cat', INITIAL_CAPACITY).index;

const HASH_MAP_LEARNING = {
	name: 'Hash Maps',
	category: 'Dictionary data structure',
	summary:
		'Hash maps turn keys into bucket indexes so put, get, and delete are usually constant-time operations.',
	intuition:
		'A good hash function spreads keys across buckets. Short chains keep each operation close to O(1); long collision chains pull the cost toward O(n).',
	strategy: [
		'Hash the key into a large integer.',
		'Compress that integer with modulo capacity to choose a bucket.',
		'Scan only that bucket chain for matching keys.',
		'Resize and rehash when load factor gets high.',
	],
	complexity: {
		time: {
			average: 'O(1)',
			worst: 'O(n)',
			amortized: 'O(1) insert',
		},
		space: { worst: 'O(n + m)' },
		variables: [
			{ symbol: 'n', label: 'entries' },
			{ symbol: 'm', label: 'buckets' },
			{ symbol: 'alpha', label: 'load factor n / m' },
		],
		why: [
			'Average-case O(1) depends on keys being spread across many buckets.',
			'Worst-case O(n) happens when many keys collide into the same chain.',
			'Resize is expensive once, but spread across many inserts it becomes amortized O(1).',
		],
	},
	tradeoffs: {
		useWhen: [
			'Fast lookup by key matters more than sorted order.',
			'Keys can be hashed consistently.',
		],
		watchOut: [
			'Poor hash functions create long chains.',
			'Iteration order is not a sorted order guarantee.',
		],
	},
	legend: [
		{ label: 'Selected bucket', color: 'var(--color-accent-green)' },
		{ label: 'Active key', color: 'var(--color-accent-orange)' },
		{ label: 'Collision chain', color: 'var(--color-accent-blue)' },
	],
	compareCards: [
		{
			label: 'Average case',
			title: 'Short chains',
			text: 'Good distribution keeps each bucket small, so operations inspect only a few entries.',
		},
		{
			label: 'Worst case',
			title: 'One crowded bucket',
			text: 'If many keys collide, a lookup scans a long chain and behaves like linear search.',
		},
		{
			label: 'Resize',
			title: 'Amortized repair',
			text: 'Rehashing costs O(n), but it buys many future constant-time inserts.',
		},
	],
	pseudocode: [
		'hash = 7',
		'for each character in key:',
		'  hash = hash * 31 + characterCode',
		'index = hash % capacity',
		'scan bucket[index] for the key',
		'insert, update, return, or delete the entry',
		'if load factor is high: resize and rehash',
	],
	conceptChecks: [
		{
			question: 'Why does resizing require rehashing every key?',
			answer:
				'The bucket index is hash % capacity, so changing capacity can change every key location.',
		},
		{
			question: 'Why is insertion amortized O(1)?',
			answer:
				'Most inserts are cheap; occasional O(n) resizes are spread across many previous cheap inserts.',
		},
	],
};

const HashMapDashboard = () => {
	const [capacity, setCapacity] = useState(INITIAL_CAPACITY);
	const [buckets, setBuckets] = useState(() =>
		createBuckets(INITIAL_ENTRIES, INITIAL_CAPACITY)
	);
	const [keyInput, setKeyInput] = useState('cat');
	const [valueInput, setValueInput] = useState('11');
	const [selectedBucket, setSelectedBucket] = useState(INITIAL_SELECTED_BUCKET);
	const [selectedKey, setSelectedKey] = useState('cat');
	const [lastResult, setLastResult] = useState('Ready');
	const [trace, setTrace] = useState([
		{
			label: 'Hash function',
			text: 'hash = hash * 31 + characterCode, then hash % capacity chooses the bucket.',
		},
	]);

	const entryCount = useMemo(() => buckets.reduce((sum, bucket) => sum + bucket.length, 0), [buckets]);
	const collisions = useMemo(
		() => buckets.reduce((sum, bucket) => sum + Math.max(bucket.length - 1, 0), 0),
		[buckets]
	);
	const loadFactor = entryCount / capacity;
	const learningPrompt =
		loadFactor > 0.75
			? 'Try resizing now: the high load factor is the moment a real hash map would spread keys into a larger table.'
			: 'Try inserting keys until the load factor passes 0.75, then resize to see why rehashing restores short chains.';

	const explainHash = (key, index, rawHash) => [
		{
			label: 'Read key',
			text: `"${key}" is converted into character codes before indexing.`,
		},
		{
			label: 'Compress',
			text: `${rawHash} % ${capacity} = ${index}, so bucket ${index} is inspected.`,
		},
	];

	const handlePut = () => {
		const key = keyInput.trim();
		if (!key) return;
		const value = valueInput.trim() || 'value';
		const details = computeHash(key, capacity);
		const nextBuckets = cloneBuckets(buckets);
		const bucket = nextBuckets[details.index];
		const existingIndex = bucket.findIndex(entry => entry.key === key);
		const hasCollision = bucket.length > 0 && existingIndex === -1;

		if (existingIndex >= 0) {
			bucket[existingIndex] = { key, value, hash: details.rawHash };
		} else {
			bucket.push({ key, value, hash: details.rawHash });
		}

		setBuckets(nextBuckets);
		setSelectedBucket(details.index);
		setSelectedKey(key);
		setLastResult(
			existingIndex >= 0
				? `Updated ${key} in bucket ${details.index}`
				: `Inserted ${key} in bucket ${details.index}`
		);
		setTrace([
			...explainHash(key, details.index, details.rawHash),
			{
				label: existingIndex >= 0 ? 'Update' : hasCollision ? 'Collision' : 'Insert',
				text:
					existingIndex >= 0
						? 'The key already exists, so only the value changes.'
						: hasCollision
							? 'Another key already lives here, so separate chaining appends a new cell.'
							: 'The bucket is empty, so insertion is constant time for this case.',
			},
			{
				label: 'Load factor',
				text:
					(entryCount + (existingIndex >= 0 ? 0 : 1)) / capacity > 0.75
						? 'The table is getting dense. Resizing keeps chains short.'
						: 'Short chains are why hash maps are usually O(1) on average.',
			},
		]);
	};

	const handleGet = () => {
		const key = keyInput.trim();
		if (!key) return;
		const details = computeHash(key, capacity);
		const bucket = buckets[details.index];
		const found = bucket.find(entry => entry.key === key);
		setSelectedBucket(details.index);
		setSelectedKey(key);
		setLastResult(found ? `Found ${key} = ${found.value}` : `${key} is not stored`);
		setTrace([
			...explainHash(key, details.index, details.rawHash),
			{
				label: 'Scan chain',
				text: found
					? `The chain contains "${key}", so return ${found.value}.`
					: 'The chain was checked and no matching key was found.',
			},
		]);
	};

	const handleDelete = () => {
		const key = keyInput.trim();
		if (!key) return;
		const details = computeHash(key, capacity);
		const nextBuckets = cloneBuckets(buckets);
		const before = nextBuckets[details.index].length;
		nextBuckets[details.index] = nextBuckets[details.index].filter(
			entry => entry.key !== key
		);
		const removed = nextBuckets[details.index].length !== before;
		setBuckets(nextBuckets);
		setSelectedBucket(details.index);
		setSelectedKey(key);
		setLastResult(removed ? `Deleted ${key}` : `${key} was not present`);
		setTrace([
			...explainHash(key, details.index, details.rawHash),
			{
				label: removed ? 'Remove node' : 'No change',
				text: removed
					? 'Only the matching key-value cell is removed from the chain.'
					: 'Delete is a no-op when the key is absent.',
			},
		]);
	};

	const handleResize = () => {
		const entries = flattenBuckets(buckets);
		const nextCapacity = nextPrime(capacity * 2);
		const nextBuckets = createBuckets(entries, nextCapacity);
		setCapacity(nextCapacity);
		setBuckets(nextBuckets);
		setSelectedBucket(null);
		setSelectedKey('');
		setLastResult(`Resized to ${nextCapacity} buckets`);
		setTrace([
			{
				label: 'Allocate',
				text: `Create a larger table with ${nextCapacity} buckets.`,
			},
			{
				label: 'Rehash',
				text: 'Every key is hashed again because hash % capacity changes.',
			},
			{
				label: 'Effect',
				text: 'Chains spread out, lowering the load factor and collision pressure.',
			},
		]);
	};

	const handleReset = () => {
		const resetCapacity = INITIAL_CAPACITY;
		setCapacity(resetCapacity);
		setBuckets(createBuckets(INITIAL_ENTRIES, resetCapacity));
		setSelectedBucket(INITIAL_SELECTED_BUCKET);
		setSelectedKey('cat');
		setKeyInput('cat');
		setValueInput('11');
		setLastResult('Example loaded');
		setTrace([
			{
				label: 'Example',
				text: 'cat and zap intentionally collide in this table, making chaining visible.',
			},
		]);
	};

	return (
		<div className={styles.dashboard}>
			<section className={styles.workbench}>
				<div className={styles.controlBand}>
					<div className={styles.titleBlock}>
						<Database size={20} />
						<div>
							<strong>Hash map laboratory</strong>
							<span>Keys become bucket indexes through a hash function</span>
						</div>
					</div>
					<div className={styles.inputs}>
						<label>
							<span>Key</span>
							<input
								value={keyInput}
								onChange={event => setKeyInput(event.target.value)}
								onKeyDown={event => {
									if (event.key === 'Enter') handlePut();
								}}
							/>
						</label>
						<label>
							<span>Value</span>
							<input
								value={valueInput}
								onChange={event => setValueInput(event.target.value)}
								onKeyDown={event => {
									if (event.key === 'Enter') handlePut();
								}}
							/>
						</label>
					</div>
					<div className={styles.actionRow}>
						<button type="button" onClick={handlePut} title="Put key-value pair">
							<Plus size={16} />
							Put
						</button>
						<button type="button" onClick={handleGet} title="Find key">
							<Search size={16} />
							Get
						</button>
						<button type="button" onClick={handleDelete} title="Delete key">
							<Trash2 size={16} />
							Delete
						</button>
						<button type="button" onClick={handleResize} title="Resize table">
							<RefreshCw size={16} />
							Resize
						</button>
						<button type="button" onClick={handleReset} title="Reset example">
							<RotateCcw size={16} />
						</button>
					</div>
				</div>

				<div className={styles.bucketGrid}>
					{buckets.map((bucket, index) => (
						<div
							key={index}
							className={`${styles.bucketRow} ${
								index === selectedBucket ? styles.bucketActive : ''
							}`}
						>
							<div className={styles.bucketIndex}>{index}</div>
							<div className={styles.chain}>
								{bucket.length ? (
									bucket.map((entry, entryIndex) => (
										<div
											key={`${entry.key}-${entryIndex}`}
											className={`${styles.entryCard} ${
												entry.key === selectedKey ? styles.entryActive : ''
											}`}
										>
											<span>{entry.key}</span>
											<strong>{entry.value}</strong>
											<small>h:{entry.hash % capacity}</small>
										</div>
									))
								) : (
									<span className={styles.emptyBucket}>null</span>
								)}
							</div>
						</div>
					))}
				</div>
			</section>

			<aside className={styles.lessonPanel}>
				<div className={styles.resultBox}>{lastResult}</div>
				<div className={styles.statsGrid}>
					<div>
						<span>Capacity</span>
						<strong>{capacity}</strong>
					</div>
					<div>
						<span>Entries</span>
						<strong>{entryCount}</strong>
					</div>
					<div>
						<span>Load</span>
						<strong>{loadFactor.toFixed(2)}</strong>
					</div>
					<div>
						<span>Collisions</span>
						<strong>{collisions}</strong>
					</div>
				</div>
				<div className={styles.loadMeter}>
					<div
						style={{
							width: `${Math.min(loadFactor * 100, 100)}%`,
							background:
								loadFactor > 0.75
									? 'var(--color-accent-red)'
									: 'var(--color-accent-green)',
						}}
					/>
				</div>
				<LearningPanel
					content={{ ...HASH_MAP_LEARNING, prompt: learningPrompt }}
					trace={{
						title: lastResult,
						text:
							loadFactor > 0.75
								? 'The table is dense enough that collisions are likely; resizing is the teaching move now.'
								: 'Follow the hash, bucket choice, and chain scan for the latest operation.',
						steps: trace,
					}}
					accent="var(--color-accent-orange)"
				/>
			</aside>
		</div>
	);
};

export default HashMapDashboard;
