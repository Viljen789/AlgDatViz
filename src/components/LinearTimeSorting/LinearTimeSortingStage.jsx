import { useMemo } from 'react';
import { decisionTree, flattenLevels } from './decisionTree.js';
import { label as recLabel } from './stability.js';
import {
	COUNTING_DEMO,
	STABILITY,
	TREE_BOUND,
	TREE_LABELS,
} from './scenes.js';
import styles from './LinearTimeSortingStage.module.css';

// ── Scene 0–1: the comparison decision tree + the leaf-count argument ─────────
const DecisionTreeView = ({ showBound }) => {
	const tree = useMemo(() => decisionTree(TREE_LABELS), []);
	const levels = useMemo(() => flattenLevels(tree.root), [tree]);

	return (
		<div className={styles.treeView}>
			<div className={styles.treeRows}>
				{levels.map((nodes, depth) => (
					<div key={depth} className={styles.treeRow} style={{ '--depth': depth }}>
						{nodes.map(nd =>
							nd.kind === 'compare' ? (
								<span key={nd.id} className={styles.cmpNode} title="one comparison">
									{nd.compare}?
								</span>
							) : (
								<span key={nd.id} className={styles.leafNode} title="a sorted order">
									{nd.order}
								</span>
							)
						)}
					</div>
				))}
			</div>
			<div className={`${styles.boundCard} ${showBound ? styles.boundCardOn : ''}`}>
				<div className={styles.boundRow}>
					<span className={styles.boundLabel}>leaves needed</span>
					<span className={styles.boundValue}>
						{TREE_LABELS.length}! = {TREE_BOUND.leaves}
					</span>
				</div>
				<div className={styles.boundRow}>
					<span className={styles.boundLabel}>2^h ≥ leaves</span>
					<span className={styles.boundValue}>
						2^{TREE_BOUND.minComparisons} = {2 ** TREE_BOUND.minComparisons} ≥{' '}
						{TREE_BOUND.leaves}
					</span>
				</div>
				<div className={styles.boundRow}>
					<span className={styles.boundLabel}>height h ≥ log₂(n!)</span>
					<span className={styles.boundValueAccent}>
						≥ {TREE_BOUND.minComparisons} comparisons
					</span>
				</div>
				<p className={styles.boundNote}>
					log₂(n!) = Ω(n log n) — the wall every comparison sort hits.
				</p>
			</div>
		</div>
	);
};

// ── Scene 2: counting sort — value becomes an index in a tally table ──────────
const CountingView = () => {
	const k = Math.max(...COUNTING_DEMO) + 1;
	const counts = useMemo(() => {
		const c = new Array(k).fill(0);
		COUNTING_DEMO.forEach(v => (c[v] += 1));
		return c;
	}, [k]);
	const peak = Math.max(...counts, 1);

	return (
		<div className={styles.algView}>
			<div className={styles.inputRow} aria-label="input array">
				{COUNTING_DEMO.map((v, i) => (
					<span key={i} className={styles.cell}>
						{v}
					</span>
				))}
			</div>
			<p className={styles.connector}>each value addresses its own slot ↓</p>
			<div className={styles.histogram} style={{ '--slots': k }}>
				{counts.map((count, value) => (
					<div key={value} className={styles.histColumn}>
						<div className={styles.histBarWrap}>
							<div
								className={styles.histBar}
								style={{ '--h': `${(count / peak) * 100}%` }}
							>
								{count > 0 && <span className={styles.histCount}>{count}</span>}
							</div>
						</div>
						<span className={styles.histValue}>{value}</span>
					</div>
				))}
			</div>
			<p className={styles.caption}>
				n = {COUNTING_DEMO.length} · k = {k} → O(n + k), no comparisons
			</p>
		</div>
	);
};

// ── Scene 3: radix sort — one stable counting pass per digit, LSD first ───────
const RadixView = () => {
	const demo = [21, 12, 11, 22, 13];
	const onesSorted = [...demo].sort((a, b) => (a % 10) - (b % 10));
	const tensSorted = [11, 12, 13, 21, 22];
	const passes = [
		{ label: 'ones digit', values: onesSorted },
		{ label: 'tens digit', values: tensSorted },
	];
	return (
		<div className={styles.algView}>
			<div className={styles.inputRow} aria-label="input array">
				{demo.map((v, i) => (
					<span key={i} className={styles.cell}>
						{v}
					</span>
				))}
			</div>
			{passes.map((pass, p) => (
				<div key={pass.label} className={styles.radixPass}>
					<span className={styles.radixPassLabel}>
						pass {p + 1}: stable by {pass.label}
					</span>
					<div className={styles.inputRow}>
						{pass.values.map((v, i) => {
							const digit = p === 0 ? v % 10 : Math.floor(v / 10);
							return (
								<span key={i} className={styles.cell}>
									<span className={styles.cellDim}>{p === 0 ? Math.floor(v / 10) : ''}</span>
									<span className={styles.cellHot}>{digit}</span>
								</span>
							);
						})}
					</div>
				</div>
			))}
			<p className={styles.caption}>
				d passes × O(n + k) → O(d·(n + k)); each pass must be stable
			</p>
		</div>
	);
};

// ── Scene 4: stability — same input sorted stable vs unstable, side by side ───
const StabilityView = () => {
	const tiedTags = new Set(
		STABILITY.input
			.filter((rec, i, all) => all.some((o, j) => j !== i && o.key === rec.key))
			.map(rec => rec.tag)
	);
	const column = (title, records, ok) => (
		<div className={styles.stabCol}>
			<div className={styles.stabHead}>
				<span className={styles.stabTitle}>{title}</span>
				<span
					className={`${styles.stabBadge} ${
						ok ? styles.stabBadgeOk : styles.stabBadgeBad
					}`}
				>
					{ok ? 'ties kept' : 'ties reordered'}
				</span>
			</div>
			<div className={styles.stabRow}>
				{records.map((rec, i) => (
					<span
						key={i}
						className={`${styles.stabCell} ${
							tiedTags.has(rec.tag) ? styles.stabCellTied : ''
						}`}
					>
						{recLabel(rec)}
					</span>
				))}
			</div>
		</div>
	);
	return (
		<div className={styles.stabView}>
			<div className={styles.stabInput}>
				<span className={styles.stabInputLabel}>input</span>
				<div className={styles.stabRow}>
					{STABILITY.input.map((rec, i) => (
						<span
							key={i}
							className={`${styles.stabCell} ${
								tiedTags.has(rec.tag) ? styles.stabCellTied : ''
							}`}
						>
							{recLabel(rec)}
						</span>
					))}
				</div>
			</div>
			<div className={styles.stabCompare}>
				{column('Stable sort', STABILITY.stable, STABILITY.stablePreserves)}
				{column('Unstable sort', STABILITY.unstable, STABILITY.unstablePreserves)}
			</div>
			<p className={styles.caption}>
				key = number, letter = input slot. Tied keys are highlighted — watch their order.
			</p>
		</div>
	);
};

// ── Scene 5: bucket sort — scatter into range buckets, sort, gather ───────────
const BucketView = () => {
	const demo = [0.78, 0.17, 0.39, 0.26, 0.72, 0.94, 0.21];
	const m = 4;
	const buckets = Array.from({ length: m }, () => []);
	demo.forEach(v => buckets[Math.min(m - 1, Math.floor(v * m))].push(v));
	buckets.forEach(b => b.sort((a, c) => a - c));
	return (
		<div className={styles.algView}>
			<div className={styles.inputRow} aria-label="input array">
				{demo.map((v, i) => (
					<span key={i} className={styles.cell}>
						{v}
					</span>
				))}
			</div>
			<p className={styles.connector}>distribute by range ↓</p>
			<div className={styles.bucketRow}>
				{buckets.map((bucket, i) => (
					<div key={i} className={styles.bucket}>
						<span className={styles.bucketIndex}>
							[{(i / m).toFixed(2)}–{((i + 1) / m).toFixed(2)})
						</span>
						<div className={styles.bucketCells}>
							{bucket.length === 0 ? (
								<span className={styles.bucketEmpty}>·</span>
							) : (
								bucket.map((v, j) => (
									<span key={j} className={styles.cell}>
										{v}
									</span>
								))
							)}
						</div>
					</div>
				))}
			</div>
			<p className={styles.caption}>
				m = {m} buckets · uniform spread ≈ n/m each → O(n) expected
			</p>
		</div>
	);
};

// ── Scene 6: the assumptions summary ──────────────────────────────────────────
const AssumptionsView = () => {
	const rows = [
		{ name: 'Counting', cost: 'O(n + k)', needs: 'small range k' },
		{ name: 'Radix', cost: 'O(d·(n + k))', needs: 'bounded digits + stable pass' },
		{ name: 'Bucket', cost: 'O(n) expected', needs: 'uniform distribution' },
		{ name: 'Comparison', cost: 'Ω(n log n)', needs: 'works on any keys' },
	];
	return (
		<div className={styles.summaryView}>
			<table className={styles.summaryTable}>
				<thead>
					<tr>
						<th>sort</th>
						<th>cost</th>
						<th>assumption</th>
					</tr>
				</thead>
				<tbody>
					{rows.map(r => (
						<tr key={r.name} className={r.name === 'Comparison' ? styles.summaryBaseline : ''}>
							<td className={styles.summaryName}>{r.name}</td>
							<td className={styles.summaryCost}>{r.cost}</td>
							<td className={styles.summaryNeeds}>{r.needs}</td>
						</tr>
					))}
				</tbody>
			</table>
			<p className={styles.caption}>
				Linear time is rented from the keys. Break the assumption and Ω(n log n) wins.
			</p>
		</div>
	);
};

/**
 * LinearTimeSortingStage — the synchronized visualization for the scrolly.
 *
 * One continuous argument across seven scenes (reads only `activeScene`):
 *   0 bound / 1 leaves   — the comparison decision tree + Ω(n log n) argument.
 *   2 counting           — value-as-index tally table, O(n + k).
 *   3 radix              — stable per-digit passes, LSD first.
 *   4 stability          — stable vs unstable side-by-side on tied keys.
 *   5 bucket             — range buckets, sort, gather.
 *   6 assumptions        — the cost/assumption summary vs the comparison bound.
 *
 * All motion is CSS-driven so prefers-reduced-motion (handled in the stylesheet)
 * can calm it. Tinted by --topic-accent inherited from TopicTemplate.
 */
const LinearTimeSortingStage = ({ activeScene = 0 }) => {
	const view = (() => {
		switch (activeScene) {
			case 0:
				return <DecisionTreeView showBound={false} />;
			case 1:
				return <DecisionTreeView showBound />;
			case 2:
				return <CountingView />;
			case 3:
				return <RadixView />;
			case 4:
				return <StabilityView />;
			case 5:
				return <BucketView />;
			default:
				return <AssumptionsView />;
		}
	})();

	const sceneLabel = [
		'comparison decision tree',
		'leaf-count lower bound',
		'counting sort',
		'radix sort',
		'stability',
		'bucket sort',
		'assumptions',
	][Math.min(activeScene, 6)];

	return (
		<div
			className={styles.wrap}
			data-scene={activeScene}
			role="img"
			aria-label={`Linear-time sorting visualization: ${sceneLabel}`}
		>
			<div className={styles.notation} aria-hidden="true">
				{sceneLabel}
			</div>
			<div key={activeScene} className={styles.sceneSlot}>
				{view}
			</div>
		</div>
	);
};

export default LinearTimeSortingStage;
