import { useMemo } from 'react';
import {
	buildRecursionTree,
	recursionTreeToLevels,
} from './climbingStairsRecursion.js';
import {
	SCENES,
	STABLE_MEN,
	STABLE_WOMEN,
	STABLE_PROPOSED,
	STABLE_MEN_NAMES,
	STABLE_WOMEN_NAMES,
	STABLE_BLOCKING_PAIR,
	ROD_PRICES,
	ROD_N,
	ROD_RUN,
	ROD_REVENUE,
	LCS_X,
	LCS_Y,
	LCS_RUN,
	LCS_LENGTH,
	KNAPSACK_CAPACITY,
	KNAPSACK_ITEMS,
	KNAPSACK01_RUN,
	KNAPSACK01_BEST,
	FRACTIONAL_RUN,
	FRACTIONAL_TOTAL,
	HUFFMAN_RUN,
	HUFFMAN_BITS,
	HUFFMAN_FIXED_BITS,
} from './scenes.js';
import RodCuttingCanvas from './RodCuttingCanvas/RodCuttingCanvas.jsx';
import LcsCanvas from './LcsCanvas/LcsCanvas.jsx';
import Knapsack01Canvas from './Knapsack01Canvas/Knapsack01Canvas.jsx';
import FractionalKnapsackCanvas from './FractionalKnapsackCanvas/FractionalKnapsackCanvas.jsx';
import HuffmanCanvas from './HuffmanCanvas/HuffmanCanvas.jsx';
import StateLegend from '../../common/StateLegend/StateLegend';
import { SceneNarration } from '../../common/PlaybackEngine';
import styles from './StrategiesStage.module.css';

// Swatch colours mirror what StrategiesStage.module.css actually paints. Greedy
// "take" coins ride --color-warning; a stranded greedy coin is the Quartet's
// --state-special (a poisoned local choice, not an app error); DP cells, repeated
// recursion nodes and the DP decision row ride the topic accent; the safe greedy
// choices (intervals, decision row) read --color-success.
const SW_GREEDY = 'var(--color-warning)';
const SW_WASTE = 'var(--state-special)';
const SW_DP = 'var(--topic-accent)';
const SW_SAFE = 'var(--color-success)';
const SW_SKIP = 'var(--color-text-muted)';
// The rod-cutting canvas paints with the Quartet's trace states (the same hues
// the playground uses): the active dp[j], the dp[j − i] cell being read, done.
const SW_ACTIVE = 'var(--state-active)';
const SW_FLIGHT = 'var(--state-flight)';
const SW_DONE = 'var(--state-done)';

// The synchronized concept stage. It reacts to the active scrolly scene (by id,
// not a fragile integer index) and visualizes the greedy-vs-DP fork on three
// running examples:
//   • coin change (target 10, coins {1,5,6}) — where greedy is trapped and DP
//     wins, used for the first scenes plus the closing summary;
//   • climbing stairs — the overlapping-subproblems vehicle: a naive recursion
//     tree whose repeated subproblems collapse into a one-cell-per-state table;
//   • interval scheduling — where the earliest-finish greedy choice is safe.
// The five worked-example scenes (rod cutting, LCS, 0/1 + fractional knapsack,
// Huffman) reuse the playground's own canvases, frozen on the frame each scene
// teaches — held on the honest pre-answer frame while the check gates.
// Everything is token-tinted; the topic hue arrives via --topic-accent.

const COINS = [1, 5, 6];
const TARGET = 10;
const STAIRS_N = 5;

// dp[i] = fewest coins to make i, for coins {1,5,6}, target 10.
const buildDpTable = () => {
	const dp = new Array(TARGET + 1).fill(null);
	dp[0] = 0;
	for (let i = 1; i <= TARGET; i++) {
		let best = null;
		for (const c of COINS) {
			if (i - c >= 0 && dp[i - c] != null) {
				const cand = dp[i - c] + 1;
				if (best == null || cand < best) best = cand;
			}
		}
		dp[i] = best;
	}
	return dp;
};

// Greedy on {6,5,1}: 6 then four 1s — stuck at five coins.
const GREEDY_CHOICES = [6, 1, 1, 1, 1];

// Interval scheduling demo (sorted by finish time). Chosen by earliest-finish.
const INTERVALS = [
	{ id: 'A', start: 0, end: 2, chosen: true },
	{ id: 'B', start: 1, end: 4, chosen: false },
	{ id: 'C', start: 3, end: 5, chosen: true },
	{ id: 'D', start: 4, end: 7, chosen: false },
	{ id: 'E', start: 6, end: 8, chosen: true },
];
const INTERVAL_MAX = 8;

const CoinBoard = ({ sceneId, holdReveal = false }) => {
	const dp = useMemo(buildDpTable, []);

	// Opt-in reveal gate (greedy-trap scene only): while the scene's predict check
	// is unanswered, hold the honest pre-choice frame — the greedy lane shows the
	// "10¢ to make…" placeholder instead of auto-revealing the [6,1,1,1,1] run and
	// the "5 coins — stuck" verdict the student is about to predict. Every other
	// scene ignores the flag, so the rest of the board is untouched.
	const gateGreedy = holdReveal && sceneId === 'greedy-trap';

	// Scene-driven reveal. The DP table is dormant until the scene that explains
	// it, then settles fully; the summary keeps the answer visible.
	const dpSettled = sceneId === 'dp-remembers' || sceneId === 'choose-what';
	const filledThrough = dpSettled ? TARGET : 0;

	const showGreedy =
		!gateGreedy &&
		(sceneId === 'two-shapes' ||
			sceneId === 'greedy-trap' ||
			sceneId === 'choose-what');
	const greedyTrapped = sceneId !== 'two-shapes';
	const dpAnswer = dp[TARGET];

	return (
		<div className={styles.coinBoard}>
			<div className={styles.lane}>
				<div className={styles.laneHead}>
					<span className={styles.laneTag}>Greedy</span>
					<span className={styles.laneSub}>
						take the biggest coin that fits
					</span>
				</div>
				<div className={styles.coinRow}>
					{showGreedy ? (
						GREEDY_CHOICES.map((c, i) => (
							<span
								key={i}
								className={`${styles.coin} ${
									greedyTrapped && c === 1 ? styles.coinWaste : styles.coinTake
								}`}
								style={{ '--coin-delay': `${i * 70}ms` }}
							>
								{c}¢
							</span>
						))
					) : (
						<span className={styles.coinPlaceholder}>10¢ to make…</span>
					)}
				</div>
				<p
					className={`${styles.laneVerdict} ${
						!gateGreedy && greedyTrapped ? styles.laneVerdictBad : ''
					}`}
				>
					{gateGreedy
						? 'takes 6¢ first — predict where it lands'
						: greedyTrapped
							? `${GREEDY_CHOICES.length} coins — stuck after taking 6¢ first`
							: 'commits to the largest coin first'}
				</p>
			</div>

			<div className={styles.lane}>
				<div className={styles.laneHead}>
					<span className={`${styles.laneTag} ${styles.laneTagDp}`}>
						Dynamic programming
					</span>
					<span className={styles.laneSub}>
						1 + min(dp[i − c]) for every coin
					</span>
				</div>
				<ol className={styles.dpRow} aria-label="DP table">
					{dp.map((value, i) => {
						const isFilled = i <= filledThrough && value != null;
						const isTarget = i === TARGET;
						return (
							<li
								key={i}
								className={`${styles.dpCell} ${
									isFilled ? styles.dpCellFilled : ''
								} ${isTarget && isFilled ? styles.dpCellAnswer : ''}`}
								style={{ '--cell-delay': `${i * 55}ms` }}
							>
								<span className={styles.dpIndex}>{i}</span>
								<span className={styles.dpValue}>{isFilled ? value : '·'}</span>
							</li>
						);
					})}
				</ol>
				<p
					className={`${styles.laneVerdict} ${
						filledThrough >= TARGET ? styles.laneVerdictGood : ''
					}`}
				>
					{filledThrough >= TARGET
						? `${dpAnswer} coins — found 5 + 5 by remembering every option`
						: 'fills a table, never commits early'}
				</p>
			</div>
		</div>
	);
};

// The overlapping-subproblems board (Climbing Stairs). Left: the naive recursion
// tree for ways(n), with repeated subproblems glowing. Right: the memoized table
// — each distinct subproblem solved exactly once. The contrast IS the DP idea.
const RecursionBoard = () => {
	const { tree, levels, census } = useMemo(() => {
		const t = buildRecursionTree(STAIRS_N);
		return {
			tree: t,
			levels: recursionTreeToLevels(t.root),
			census: t.census,
		};
	}, []);

	return (
		<div className={styles.recursionBoard}>
			<div className={styles.lane}>
				<div className={styles.laneHead}>
					<span className={styles.laneTag}>Naive recursion</span>
					<span className={styles.laneSub}>
						ways({STAIRS_N}) calls itself — repeated nodes glow
					</span>
				</div>
				<div className={styles.tree} aria-hidden="true">
					{levels.map((level, depth) => (
						<div key={depth} className={styles.treeLevel}>
							{level.map(node => (
								<span
									key={node.id}
									className={`${styles.treeNode} ${
										node.isRepeated ? styles.treeNodeRepeat : ''
									} ${node.isBase ? styles.treeNodeBase : ''}`}
								>
									ways({node.k})
								</span>
							))}
						</div>
					))}
				</div>
				<p className={`${styles.laneVerdict} ${styles.laneVerdictBad}`}>
					{tree.nodeCount} calls — ways(2) alone is recomputed{' '}
					{census.rows.find(r => r.k === 2)?.naive}× (exponential blow-up)
				</p>
			</div>

			<div className={styles.lane}>
				<div className={styles.laneHead}>
					<span className={`${styles.laneTag} ${styles.laneTagDp}`}>
						Memoized table
					</span>
					<span className={styles.laneSub}>
						each ways(k) solved once, then reused
					</span>
				</div>
				<ol className={styles.censusRow} aria-label="Memoized subproblems">
					{census.rows.map(row => (
						<li key={row.k} className={styles.censusCell}>
							<span className={styles.dpIndex}>ways({row.k})</span>
							<span className={styles.censusNaive}>naive ×{row.naive}</span>
							<span className={styles.censusMemo}>memo ×1</span>
						</li>
					))}
				</ol>
				<p className={`${styles.laneVerdict} ${styles.laneVerdictGood}`}>
					{census.memoTotal} cells — every subproblem solved exactly once, O(n)
				</p>
			</div>
		</div>
	);
};

const IntervalBoard = () => (
	<div className={styles.intervalBoard}>
		<div className={styles.intervalHead}>
			<span className={`${styles.laneTag} ${styles.laneTagSafe}`}>
				Greedy — provably safe
			</span>
			<span className={styles.laneSub}>always take the earliest finish</span>
		</div>
		<ul className={styles.intervalRows}>
			{INTERVALS.map((iv, idx) => {
				const left = (iv.start / INTERVAL_MAX) * 100;
				const width = ((iv.end - iv.start) / INTERVAL_MAX) * 100;
				return (
					<li key={iv.id} className={styles.intervalRow}>
						<span className={styles.intervalLabel}>{iv.id}</span>
						<div className={styles.intervalTrack}>
							<span
								className={`${styles.intervalBar} ${
									iv.chosen ? styles.intervalChosen : styles.intervalSkipped
								}`}
								style={{
									left: `${left}%`,
									width: `${width}%`,
									'--bar-delay': `${idx * 80}ms`,
								}}
							>
								{iv.start}–{iv.end}
							</span>
						</div>
					</li>
				);
			})}
		</ul>
		<p className={`${styles.laneVerdict} ${styles.laneVerdictGood}`}>
			3 activities — the exchange argument proves this is optimal
		</p>
	</div>
);

// The decision-rule board (two-properties scene): optimal substructure is the
// shared base; the *second* ingredient decides the tool.
const DECISION_ROWS = [
	{
		id: 'base',
		label: 'Optimal substructure',
		def: 'An optimal solution is built from optimal sub-solutions.',
		tag: 'needed by both',
		variant: 'shared',
	},
	{
		id: 'greedy',
		label: '+ Greedy-choice property',
		def: 'A local choice is provably part of some optimum (exchange argument).',
		tag: '→ Greedy',
		variant: 'greedy',
	},
	{
		id: 'dp',
		label: '+ Overlapping subproblems',
		def: 'The same subproblem recurs many times → memoize / tabulate.',
		tag: '→ DP',
		variant: 'dp',
	},
];

const DecisionBoard = () => (
	<div className={styles.decisionBoard}>
		<div className={styles.laneHead}>
			<span className={styles.laneTag}>The decision rule</span>
			<span className={styles.laneSub}>
				one shared base + one distinguishing ingredient
			</span>
		</div>
		<ul className={styles.decisionList}>
			{DECISION_ROWS.map(row => (
				<li
					key={row.id}
					className={`${styles.decisionRow} ${
						styles[`decision-${row.variant}`]
					}`}
				>
					<div className={styles.decisionMain}>
						<span className={styles.decisionLabel}>{row.label}</span>
						<span className={styles.decisionDef}>{row.def}</span>
					</div>
					<span className={styles.decisionTag}>{row.tag}</span>
				</li>
			))}
		</ul>
	</div>
);

// The stable-matching board (Gale-Shapley closing scene). Two preference columns
// — men on the left, women on the right, each with their ranked list — plus the
// PROPOSED matching as connector rows. While the predict is held the board shows
// only the proposal; once answered it marks the one blocking pair (Bram wants
// Wren, Wren wants Bram, neither is matched to the other) in the special hue, the
// same "this pairing is poisoned" semantics the stranded greedy coin carries. We
// reuse the existing lane / laneHead / laneVerdict primitives so it stays in house
// style — a static diagram, not a bespoke animation. Data is imported from
// scenes.js, the same source the predict answer is derived from.
const STABLE_MAN_IDS = ['m1', 'm2', 'm3'];

// rank label like "Wren · Xena · Yuki" for one person's preference list.
const prefNames = (ids, names) => ids.map(id => names[id]).join(' · ');

const StableBoard = ({ holdReveal = false }) => {
	const blocking = STABLE_BLOCKING_PAIR; // { man:'m2', woman:'w1' }
	return (
		<div className={styles.stableBoard}>
			<div className={styles.laneHead}>
				<span className={`${styles.laneTag} ${styles.laneTagSafe}`}>
					Stable matching — Gale-Shapley
				</span>
				<span className={styles.laneSub}>
					a pair blocks only if BOTH prefer each other
				</span>
			</div>

			<ul className={styles.stableRows} aria-label="Proposed matching">
				{STABLE_MAN_IDS.map(manId => {
					const womanId = STABLE_PROPOSED[manId];
					const isBlockMan = !holdReveal && manId === blocking.man;
					return (
						<li
							key={manId}
							className={`${styles.stableRow} ${
								isBlockMan ? styles.stableRowBlock : ''
							}`}
						>
							<span className={styles.stablePerson}>
								<span className={styles.stableName}>
									{STABLE_MEN_NAMES[manId]}
								</span>
								<span className={styles.stablePrefs}>
									wants {prefNames(STABLE_MEN[manId], STABLE_WOMEN_NAMES)}
								</span>
							</span>
							<span className={styles.stableLink} aria-hidden="true">
								⇄
							</span>
							<span
								className={`${styles.stablePerson} ${styles.stablePersonR}`}
							>
								<span className={styles.stableName}>
									{STABLE_WOMEN_NAMES[womanId]}
								</span>
								<span className={styles.stablePrefs}>
									wants {prefNames(STABLE_WOMEN[womanId], STABLE_MEN_NAMES)}
								</span>
							</span>
						</li>
					);
				})}
			</ul>

			{!holdReveal && (
				<p className={styles.stableBlockNote} aria-hidden="true">
					{STABLE_MEN_NAMES[blocking.man]} ⇄{' '}
					{STABLE_WOMEN_NAMES[blocking.woman]} block: each ranks the other
					first, above their current partner.
				</p>
			)}

			<p
				className={`${styles.laneVerdict} ${
					holdReveal ? '' : styles.laneVerdictBad
				}`}
			>
				{holdReveal
					? 'predict: is this stable — and if not, who elopes?'
					: 'unstable — one blocking pair; Gale-Shapley would pair Wren with Bram'}
			</p>
		</div>
	);
};

// ── The five worked-example boards (rod cutting, LCS, 0/1 + fractional ───────
// knapsack, Huffman). Each reuses the SAME canvas the playground animates,
// frozen on the frame the scene teaches: while the scene's check gates, the
// board holds the honest pre-answer frame (the value the student is predicting
// is not yet written); once answered it settles on the final frame. All frames
// come from the runs exported by scenes.js — the very runs the answers are
// derived from — so the stage can never drift from the checks.

// Rod cutting: held with dp[0..3] settled and dp[4] pending; revealed with the
// optimal 2 + 2 cut and dp[4] = 10.
const ROD_HELD = ROD_RUN.frames.find(f => f.activeJ === ROD_N - 1);
const ROD_FINAL = ROD_RUN.frames[ROD_RUN.frames.length - 1];

// LCS: held on the cell just before the corner (dp[5][2] active, corner still
// unwritten); revealed with the traceback and the recovered "AC".
const LCS_HELD = LCS_RUN.frames.find(
	f => f.active && f.active.i === LCS_X.length && f.active.j === LCS_Y.length - 1
);
const LCS_FINAL = LCS_RUN.frames[LCS_RUN.frames.length - 1];

// 0/1 knapsack: held with row Q settled through w = 3 and the corner pending;
// revealed with the traceback and Q tagged as the take.
const KNAPSACK_HELD = KNAPSACK01_RUN.frames.find(
	f =>
		f.active &&
		f.active.i === KNAPSACK_ITEMS.length &&
		f.active.w === KNAPSACK_CAPACITY - 1
);
const KNAPSACK_FINAL = KNAPSACK01_RUN.frames[KNAPSACK01_RUN.frames.length - 1];

// Fractional: held right after P is taken whole (the canvas would otherwise
// display the final total the student is asked to compute); revealed full.
const FRACTIONAL_HELD = FRACTIONAL_RUN.frames.find(
	f => f.activeIndex === 0 && f.items[0].status === 'taken'
);
const FRACTIONAL_FINAL =
	FRACTIONAL_RUN.frames[FRACTIONAL_RUN.frames.length - 1];

// Huffman: always the finished tree — the codeword table IS the question's
// working material — so only the bit-total verdict is withheld while gated.
const HUFFMAN_FINAL = HUFFMAN_RUN.frames[HUFFMAN_RUN.frames.length - 1];

const RodBoard = ({ holdReveal = false }) => (
	<div className={styles.canvasBoard}>
		<div className={styles.laneHead}>
			<span className={`${styles.laneTag} ${styles.laneTagDp}`}>
				Rod cutting — DP
			</span>
			<span className={styles.laneSub}>
				price[1..{ROD_N}] = {ROD_PRICES.join(', ')} · dp[j] = max(price[i] +
				dp[j − i])
			</span>
		</div>
		<RodCuttingCanvas frame={holdReveal ? ROD_HELD : ROD_FINAL} />
		<p
			className={`${styles.laneVerdict} ${
				holdReveal ? '' : styles.laneVerdictGood
			}`}
		>
			{holdReveal
				? 'dp[0..3] settled — predict what the max writes into dp[4]'
				: `${ROD_REVENUE} revenue — cut 2 + 2, one more than the whole rod's 9`}
		</p>
	</div>
);

const LcsBoard = ({ holdReveal = false }) => (
	<div className={styles.canvasBoard}>
		<div className={styles.laneHead}>
			<span className={`${styles.laneTag} ${styles.laneTagDp}`}>
				Longest common subsequence — DP
			</span>
			<span className={styles.laneSub}>
				X = {LCS_X} · Y = {LCS_Y} · match → ↖ + 1, else max(↑, ←)
			</span>
		</div>
		<LcsCanvas frame={holdReveal ? LCS_HELD : LCS_FINAL} />
		<p
			className={`${styles.laneVerdict} ${
				holdReveal ? '' : styles.laneVerdictGood
			}`}
		>
			{holdReveal
				? 'the corner cell compares T with C — commit before it fills'
				: `length ${LCS_LENGTH} — the traceback emits a letter on every diagonal match`}
		</p>
	</div>
);

const KnapsackBoard = ({ holdReveal = false }) => (
	<div className={styles.canvasBoard}>
		<div className={styles.laneHead}>
			<span className={`${styles.laneTag} ${styles.laneTagDp}`}>
				0/1 knapsack — DP
			</span>
			<span className={styles.laneSub}>
				W = {KNAPSACK_CAPACITY} · P w1/v2 · Q w4/v7 · take whole or not at all
			</span>
		</div>
		<Knapsack01Canvas frame={holdReveal ? KNAPSACK_HELD : KNAPSACK_FINAL} />
		<p
			className={`${styles.laneVerdict} ${
				holdReveal ? '' : styles.laneVerdictGood
			}`}
		>
			{holdReveal
				? 'row Q has reached the full bag — predict the corner before it fills'
				: `best value ${KNAPSACK01_BEST} — the table leaves dense little P behind`}
		</p>
	</div>
);

const FractionalBoard = ({ holdReveal = false }) => (
	<div className={styles.canvasBoard}>
		<div className={styles.laneHead}>
			<span className={`${styles.laneTag} ${styles.laneTagSafe}`}>
				Fractional knapsack — greedy, provably safe
			</span>
			<span className={styles.laneSub}>
				the same bag, but items split · densest first
			</span>
		</div>
		<FractionalKnapsackCanvas
			frame={holdReveal ? FRACTIONAL_HELD : FRACTIONAL_FINAL}
		/>
		<p
			className={`${styles.laneVerdict} ${
				holdReveal ? '' : styles.laneVerdictGood
			}`}
		>
			{holdReveal
				? 'P is in whole, 3 capacity left — predict the final total value'
				: `total ${FRACTIONAL_TOTAL} — 3/4 of Q closes the bag; splitting beats both 0/1 answers`}
		</p>
	</div>
);

const HuffmanBoard = ({ holdReveal = false }) => (
	<div className={styles.canvasBoard}>
		<div className={styles.laneHead}>
			<span className={`${styles.laneTag} ${styles.laneTagSafe}`}>
				Huffman coding — greedy, provably safe
			</span>
			<span className={styles.laneSub}>
				ABRACADABRA · A5 B2 R2 C1 D1 · merge the two rarest
			</span>
		</div>
		<HuffmanCanvas frame={HUFFMAN_FINAL} />
		<p
			className={`${styles.laneVerdict} ${
				holdReveal ? '' : styles.laneVerdictGood
			}`}
		>
			{holdReveal
				? 'codes read — weigh each codeword by how often its letter occurs'
				: `${HUFFMAN_BITS} bits vs ${HUFFMAN_FIXED_BITS} fixed-width — rare letters sink deep, A stays shallow`}
		</p>
	</div>
);

// Map each scene id to the board it drives + the accessible label + the corner
// notation. Keying by id keeps the stage stable when scenes are added/reordered.
const SCENE_BOARDS = {
	'two-shapes': 'coin',
	'greedy-trap': 'coin',
	'dp-remembers': 'coin',
	'overlapping-subproblems': 'recursion',
	'rod-cutting': 'rod',
	lcs: 'lcs',
	'knapsack-01': 'knapsack01',
	'greedy-safe': 'interval',
	'fractional-knapsack': 'fractional',
	huffman: 'huffman',
	'two-properties': 'decision',
	'choose-what': 'coin',
	'stable-matching': 'stable',
};

const BOARD_META = {
	coin: {
		label:
			'Coin change — greedy commitment versus the dynamic-programming table',
		notation: 'target = 10¢ · coins {1, 5, 6}',
	},
	recursion: {
		label:
			'Climbing stairs — naive recursion tree with repeated subproblems versus a memoized table',
		notation: `ways(${STAIRS_N}) · naive vs memo`,
	},
	interval: {
		label: 'Interval scheduling timeline — earliest-finish greedy choice',
		notation: 'O(n log n) · greedy',
	},
	decision: {
		label: 'The greedy-vs-DP decision rule built from optimal substructure',
		notation: 'optimal substructure + ?',
	},
	stable: {
		label:
			'Stable matching — two preference columns and a proposed matching, with the blocking pair marked',
		notation: 'Gale-Shapley · 3 × 3 · stable?',
	},
	rod: {
		label:
			'Rod cutting — the one-dimensional dp table trying every leading piece for a length-4 rod',
		notation: 'O(n²) · dp[j] = max(price[i] + dp[j − i])',
	},
	lcs: {
		label:
			'Longest common subsequence — the two-dimensional dp grid for AGCAT and GAC',
		notation: 'O(m·n) · AGCAT / GAC',
	},
	knapsack01: {
		label:
			'0/1 knapsack — the item-by-capacity dp grid weighing take against skip',
		notation: 'O(n·W) · W = 4',
	},
	fractional: {
		label:
			'Fractional knapsack — items ranked by density filling the capacity bar, the last one split',
		notation: 'O(n log n) · greedy · W = 4',
	},
	huffman: {
		label:
			'Huffman coding — the finished merge tree and its codeword table for ABRACADABRA',
		notation: 'O(n log n) · greedy · prefix-free',
	},
};

// Per-scene narration for screen readers — the honest WHY of the active board,
// matching the verdict each board already paints on screen. Keyed by scene id (the
// coin board shifts meaning across its scenes), so the spoken line tracks the
// concept, not just the static board summary in BOARD_META.
const SCENE_NARRATION = {
	'two-shapes':
		'Greedy commits to the largest coin first; dynamic programming will fill a table instead.',
	'greedy-trap':
		'Greedy is trapped: taking 6¢ first strands it at 5 coins for a 10¢ target.',
	'dp-remembers':
		'Dynamic programming remembers every option and finds 5 + 5 — just 2 coins.',
	'overlapping-subproblems':
		'Naive recursion recomputes the same subproblems; memoizing solves each once, O(n).',
	'rod-cutting':
		'Rod cutting: dp[4] takes the best of every leading piece — 10 by cutting 2 + 2, one more than selling the rod whole.',
	lcs: 'Longest common subsequence of AGCAT and GAC: no match at the corner cell, so it carries the better of up and left — length 2, and the traceback reads AC.',
	'knapsack-01':
		'0/1 knapsack: at the full bag the table takes Q whole for 7 and leaves the denser P behind — density greedy would bank only 2.',
	'greedy-safe':
		'Interval scheduling: always taking the earliest finish is provably optimal, 3 activities.',
	'fractional-knapsack':
		'Fractional knapsack: P whole, then three quarters of Q closes the bag — total 7.25, the provably optimal split.',
	huffman:
		'Huffman coding: merging the two rarest letters builds an optimal prefix code — ABRACADABRA takes 23 bits against 33 fixed-width.',
	'two-properties':
		'Both tools need optimal substructure; greedy-choice leads to greedy, overlapping subproblems lead to DP.',
	'choose-what':
		'The fork: greedy strands at 5 coins, DP answers 2 — choose by which property holds.',
	'stable-matching':
		'Gale-Shapley is greedy and safe: Bram and Wren block this proposed matching because each ranks the other first, so the algorithm pairs them — no blocking pair remains.',
};

// While a scene's gated check is unanswered, the spoken line must not spoil the
// outcome either (the on-screen verdict is already held), so it mirrors the
// pre-choice prompt instead of announcing the answer. Keyed by scene id; only
// gated scenes appear here.
const HELD_NARRATION = {
	'greedy-trap':
		'Greedy takes 6¢ first. Predict how many coins it spends before the run plays out.',
	'stable-matching':
		'A matching is proposed for three pairs. Predict whether it is stable, and if not which pair would elope, before the blocking edge is shown.',
	'rod-cutting':
		'The dp table has settled through dp[3]. Predict the revenue the max writes into dp[4] before the cell fills.',
	lcs: 'The fill has reached the corner cell, where T meets C with no match. Predict the value of dp[5][3] before it is written.',
	'knapsack-01':
		'Row Q has reached the full bag. Predict the optimal value in the corner cell before the table writes it.',
	'fractional-knapsack':
		'Greedy has taken P whole and 3 capacity remains. Predict the total value before the split of Q is revealed.',
	huffman:
		'The codeword table is read off the finished tree. Weigh each codeword by how often its letter occurs before the bit total is revealed.',
};

// Scene-aware colour key: only the states the active board paints right now.
// The coin board shifts meaning across its scenes, so it is keyed by id, not by
// board: greedy "take" before the trap, the stranded waste once it is sprung,
// the DP table once it settles. Boards that are purely structural carry no key —
// and neither do the canvas boards whose canvas already draws its own inline key
// (LCS, 0/1 and fractional knapsack), so the meaning is never stated twice.
const buildLegend = sceneId => {
	switch (sceneId) {
		case 'two-shapes':
			return [
				{ swatch: SW_GREEDY, label: 'greedy: take biggest', aria: 'amber' },
			];
		case 'greedy-trap':
			return [
				{ swatch: SW_GREEDY, label: 'greedy: take', aria: 'amber' },
				{ swatch: SW_WASTE, label: 'greedy: stranded', aria: 'special hue' },
			];
		case 'dp-remembers':
			return [{ swatch: SW_DP, label: 'DP: filled cell', aria: 'accent' }];
		case 'choose-what':
			return [
				{ swatch: SW_WASTE, label: 'greedy: stranded', aria: 'special hue' },
				{ swatch: SW_DP, label: 'DP: answer', aria: 'accent' },
			];
		case 'overlapping-subproblems':
			return [{ swatch: SW_DP, label: 'repeated subproblem', aria: 'accent' }];
		case 'rod-cutting':
			return [
				{ swatch: SW_ACTIVE, label: 'dp[j] being decided', aria: 'blue' },
				{ swatch: SW_FLIGHT, label: 'dp[j − i] being read', aria: 'orange' },
				{ swatch: SW_DONE, label: 'settled cell', aria: 'green' },
			];
		case 'greedy-safe':
			return [
				{ swatch: SW_SAFE, label: 'chosen (earliest finish)', aria: 'green' },
				{ swatch: SW_SKIP, label: 'skipped', aria: 'muted' },
			];
		case 'two-properties':
			return [
				{ swatch: SW_SAFE, label: 'leads to greedy', aria: 'green' },
				{ swatch: SW_DP, label: 'leads to DP', aria: 'accent' },
			];
		case 'stable-matching':
			return [
				{ swatch: SW_WASTE, label: 'blocking pair', aria: 'special hue' },
			];
		default:
			return [];
	}
};

const StrategiesStage = ({ activeScene = 0, holdReveal = false }) => {
	const sceneId = SCENES[activeScene]?.id ?? SCENES[0].id;
	const board = SCENE_BOARDS[sceneId] ?? 'coin';
	const meta = BOARD_META[board];
	const legend = buildLegend(sceneId);
	// While a gated check is held, speak the pre-choice line for that scene (see
	// HELD_NARRATION) instead of announcing the answer.
	const heldNarration = holdReveal ? (HELD_NARRATION[sceneId] ?? null) : null;
	const narration = heldNarration ?? SCENE_NARRATION[sceneId] ?? meta.label;

	return (
		<>
			{/* Per-scene narration for screen readers, OUTSIDE the role=img figure
			    below (which collapses its in-board captions into one static label). */}
			<SceneNarration>{narration}</SceneNarration>
			<div
				className={styles.wrap}
				data-scene={activeScene}
				role="img"
				aria-label={meta.label}
			>
				{board === 'coin' && (
					<CoinBoard sceneId={sceneId} holdReveal={holdReveal} />
				)}
				{board === 'recursion' && <RecursionBoard />}
				{board === 'interval' && <IntervalBoard />}
				{board === 'decision' && <DecisionBoard />}
				{board === 'stable' && <StableBoard holdReveal={holdReveal} />}
				{board === 'rod' && <RodBoard holdReveal={holdReveal} />}
				{board === 'lcs' && <LcsBoard holdReveal={holdReveal} />}
				{board === 'knapsack01' && <KnapsackBoard holdReveal={holdReveal} />}
				{board === 'fractional' && (
					<FractionalBoard holdReveal={holdReveal} />
				)}
				{board === 'huffman' && <HuffmanBoard holdReveal={holdReveal} />}

				<StateLegend items={legend} />

				<div className={styles.notation} aria-hidden="true">
					{meta.notation}
				</div>
			</div>
		</>
	);
};

export default StrategiesStage;
