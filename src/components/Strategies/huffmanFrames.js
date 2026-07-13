// Builds a frame array for the Huffman-coding walkthrough (CLRS §15.3, the
// greedy learning-goal [G4] for TDT4120).
//
// The algorithm keeps a min-priority-queue (forest) of trees keyed by frequency.
// Each round extracts the two lightest trees and merges them under a new parent
// whose frequency is their sum; after n−1 merges one tree remains — the Huffman
// tree. Codes are read off by writing 0 down every left edge and 1 down every
// right edge. The greedy choice (always merge the two rarest) is provably optimal
// by an exchange argument: the two least-frequent symbols can always be made
// deepest siblings without increasing the weighted path length.
//
// Each frame carries the FRAME CONTRACT used everywhere in this topic
// (common/PlaybackEngine/PseudoState.jsx): a `line` index into HUFFMAN_PSEUDO and
// an ordered `state` array of {id,label,value,active?} rows. The visualization
// fields are pure nested-node data; HuffmanCanvas computes the tree layout.
//
// HUFFMAN_PSEUDO line indices (keep in sync with strategiesMeta.js):
//   0  Q ← min-heap of leaves, keyed by frequency
//   1  while Q has more than one tree:
//   2    x ← extract-min(Q)        // smallest
//   3    y ← extract-min(Q)        // next smallest
//   4    z ← new node, z.freq = x.freq + y.freq
//   5    z.left ← x;  z.right ← y
//   6    insert z into Q
//   7  root ← the one tree left in Q
//   8  read codes: 0 down every left edge, 1 down every right edge

// Order the forest the way a min-heap would hand trees back: by frequency, then
// by a stable sequence number so ties resolve deterministically (leaves keep
// input order; each new internal node sorts after equal-frequency leaves).
const byPriority = (a, b) => a.freq - b.freq || a.seq - b.seq;

// Deep-clone a node tree so each frame owns an immutable snapshot.
const cloneNode = node =>
	node == null
		? null
		: {
				id: node.id,
				char: node.char ?? null,
				freq: node.freq,
				seq: node.seq,
				left: cloneNode(node.left),
				right: cloneNode(node.right),
			};

const cloneForest = forest => forest.map(cloneNode);

// Walk the final tree assigning a 0/1 code to every leaf. Single-leaf trees get
// the conventional code "0" so a one-symbol alphabet still encodes.
const readCodes = root => {
	const codes = {};
	const walk = (node, prefix) => {
		if (!node) return;
		if (node.char != null && !node.left && !node.right) {
			codes[node.char] = prefix === '' ? '0' : prefix;
			return;
		}
		walk(node.left, prefix + '0');
		walk(node.right, prefix + '1');
	};
	walk(root, '');
	return codes;
};

// Count the leaves under a node — used for "this tree covers k symbols" labels.
const leafCount = node => {
	if (!node) return 0;
	if (!node.left && !node.right) return 1;
	return leafCount(node.left) + leafCount(node.right);
};

const tag = node =>
	node.char != null && !node.left && !node.right
		? `${node.char}:${node.freq}`
		: `•:${node.freq}`;

export const buildHuffmanFrames = (symbols = []) => {
	const valid = (symbols || []).filter(
		s => s && typeof s.char === 'string' && Number.isFinite(s.freq) && s.freq > 0
	);

	if (valid.length === 0) {
		return {
			frames: [
				{
					step: 0,
					forest: [],
					selectedIds: [],
					mergedId: null,
					codes: null,
					title: 'No symbols',
					description: 'Add at least one symbol with a positive frequency.',
					line: 0,
					state: [{ id: 'n', label: 'symbols', value: 0 }],
					verdict: null,
				},
			],
			summary: null,
		};
	}

	let seq = 0;
	// Initial forest: one leaf per symbol, in priority order.
	let forest = valid
		.map(s => ({
			id: `leaf-${s.char}`,
			char: s.char,
			freq: s.freq,
			seq: seq++,
			left: null,
			right: null,
		}))
		.sort(byPriority);

	const totalFreq = valid.reduce((acc, s) => acc + s.freq, 0);
	const n = valid.length;
	const frames = [];

	frames.push({
		step: 0,
		forest: cloneForest(forest),
		selectedIds: [],
		mergedId: null,
		codes: null,
		title: 'Build the queue',
		description: `Start with ${n} single-leaf tree${
			n === 1 ? '' : 's'
		}, one per symbol, ordered by frequency.`,
		line: 0,
		state: [
			{ id: 'trees', label: 'trees in Q', value: n, active: true },
			{
				id: 'lightest',
				label: 'lightest',
				value: tag(forest[0]),
			},
		],
		verdict: null,
	});

	let mergeNo = 0;
	while (forest.length > 1) {
		mergeNo += 1;
		const x = forest[0];
		const y = forest[1];

		// Frame A — pick the two lightest trees.
		frames.push({
			step: frames.length,
			forest: cloneForest(forest),
			selectedIds: [x.id, y.id],
			mergedId: null,
			codes: null,
			title: `Pick the two lightest`,
			description: `The two rarest trees are ${tag(x)} and ${tag(
				y
			)} — greedily merge these.`,
			line: 3,
			state: [
				{ id: 'trees', label: 'trees in Q', value: forest.length },
				{ id: 'x', label: 'x ← extract-min', value: tag(x), active: true },
				{ id: 'y', label: 'y ← extract-min', value: tag(y), active: true },
			],
			verdict: null,
		});

		// Build the parent and update the forest.
		const z = {
			id: `node-${mergeNo}`,
			char: null,
			freq: x.freq + y.freq,
			seq: seq++,
			left: x,
			right: y,
		};
		forest = [z, ...forest.slice(2)].sort(byPriority);

		// Frame B — merge into a new parent and reinsert.
		frames.push({
			step: frames.length,
			forest: cloneForest(forest),
			selectedIds: [],
			mergedId: z.id,
			codes: null,
			title: `Merge → ${z.freq}`,
			description: `New parent with frequency ${x.freq} + ${y.freq} = ${z.freq}, reinserted into Q.`,
			line: 6,
			state: [
				{ id: 'z', label: 'z.freq = x + y', value: z.freq, active: true },
				{ id: 'trees', label: 'trees in Q', value: forest.length },
				{
					id: 'covers',
					label: 'symbols under z',
					value: leafCount(z),
				},
			],
			verdict: null,
		});
	}

	const root = forest[0];
	const codes = readCodes(root);

	// Weighted path length = total encoded bits = Σ freq(c) · depth(c).
	const depthByChar = {};
	const measure = (node, depth) => {
		if (!node) return;
		if (node.char != null && !node.left && !node.right) {
			depthByChar[node.char] = depth === 0 ? 1 : depth;
			return;
		}
		measure(node.left, depth + 1);
		measure(node.right, depth + 1);
	};
	measure(root, 0);
	const huffmanBits = valid.reduce(
		(acc, s) => acc + s.freq * depthByChar[s.char],
		0
	);
	const fixedWidth = Math.max(1, Math.ceil(Math.log2(n)));
	const fixedBits = totalFreq * fixedWidth;
	const saving =
		fixedBits > 0 ? Math.round((1 - huffmanBits / fixedBits) * 100) : 0;

	frames.push({
		step: frames.length,
		forest: cloneForest(forest),
		selectedIds: [],
		mergedId: null,
		codes,
		title: 'Read off the codes',
		description:
			'One tree remains — the Huffman tree. Write 0 down every left edge and 1 down every right edge; each leaf’s path is its codeword.',
		line: 8,
		state: [
			{ id: 'root', label: 'root.freq', value: root.freq, active: true },
			{ id: 'bits', label: 'Huffman bits', value: huffmanBits },
			{ id: 'fixed', label: `fixed ${fixedWidth}-bit`, value: fixedBits },
		],
		verdict:
			n === 1
				? 'A single symbol needs just one bit per occurrence.'
				: `Huffman uses ${huffmanBits} bits vs ${fixedBits} for a fixed ${fixedWidth}-bit code — about ${saving}% smaller. Rare symbols sink deep; common ones stay shallow.`,
	});

	return {
		frames,
		summary: { codes, huffmanBits, fixedBits, fixedWidth, saving, root },
	};
};
