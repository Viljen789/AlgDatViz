import { useMemo, useState } from 'react';
import { Check, RotateCcw, Search, X } from 'lucide-react';
import {
	verify3SAT,
	verifyVertexCover,
	verifyIndependentSet,
} from './certificates.js';
import styles from './NpCompletenessExplorer.module.css';

// NpCompletenessExplorer — the interactive playground. Two signature tools:
//
//   1. CERTIFICATE VERIFIER — the learner toggles a candidate certificate
//      (a 3-SAT truth assignment, or a vertex set for VERTEX-COVER /
//      INDEPENDENT-SET) and watches it VERIFIED in polynomial time, clause by
//      clause / edge by edge. Makes "easy to check, hard to find" tangible: the
//      verifier is instant, but there is no "find" button — finding is the hard
//      part. All grading runs through the pure, unit-tested verifiers.
//
//   2. REDUCTION-DIRECTION DEMO — the learner is asked to pick the correct
//      reduction direction for a hardness proof, and is shown why the wrong
//      direction proves nothing.
//
// Tokens only; tinted by --topic-accent. No hex, no raw white/black.

// ── Certificate-verifier instances ───────────────────────────────────────────

const SAT_FORMULA = {
	vars: ['x1', 'x2', 'x3'],
	clauses: [
		[
			{ var: 'x1', negated: false },
			{ var: 'x2', negated: true },
			{ var: 'x3', negated: false },
		],
		[
			{ var: 'x1', negated: true },
			{ var: 'x2', negated: false },
			{ var: 'x3', negated: false },
		],
		[
			{ var: 'x1', negated: true },
			{ var: 'x2', negated: true },
			{ var: 'x3', negated: true },
		],
	],
};

// A 4-cycle a-b-c-d-a plus a chord? Keep it a clean square so VC≤2={a,c},
// max independent set ={a,c}.
const GRAPH = {
	nodes: ['a', 'b', 'c', 'd'],
	edges: [
		['a', 'b'],
		['b', 'c'],
		['c', 'd'],
		['d', 'a'],
	],
	// Fixed layout positions (percent) for the little SVG.
	pos: {
		a: [22, 22],
		b: [78, 22],
		c: [78, 78],
		d: [22, 78],
	},
};

const litText = lit => `${lit.negated ? '¬' : ''}${lit.var}`;
const clauseText = clause => clause.map(litText).join(' ∨ ');

// ── 3-SAT verifier panel ─────────────────────────────────────────────────────

const SatVerifier = ({ onInteract }) => {
	const [assign, setAssign] = useState({ x1: false, x2: false, x3: false });
	const result = useMemo(() => verify3SAT(SAT_FORMULA, assign), [assign]);

	const toggle = v => {
		onInteract?.();
		setAssign(a => ({ ...a, [v]: !a[v] }));
	};

	return (
		<div className={styles.panel}>
			<p className={styles.formula}>
				φ ={' '}
				{SAT_FORMULA.clauses.map((c, i) => (
					<span key={i}>
						<span className={styles.formulaClause}>({clauseText(c)})</span>
						{i < SAT_FORMULA.clauses.length - 1 ? ' ∧ ' : ''}
					</span>
				))}
			</p>

			<div className={styles.controlRow}>
				<span className={styles.controlLabel}>certificate</span>
				{SAT_FORMULA.vars.map(v => (
					<button
						key={v}
						type="button"
						className={`${styles.toggle} ${
							assign[v] ? styles.toggleOn : styles.toggleOff
						}`}
						onClick={() => toggle(v)}
						aria-pressed={assign[v]}
					>
						{v} = {String(assign[v])}
					</button>
				))}
			</div>

			<ul className={styles.clauseList}>
				{SAT_FORMULA.clauses.map((clause, i) => {
					const sat = result.perClause[i];
					return (
						<li
							key={i}
							className={`${styles.row} ${sat ? styles.rowSat : styles.rowUnsat}`}
						>
							<span className={styles.rowIcon} aria-hidden="true">
								{sat ? (
									<Check size={13} strokeWidth={2.5} />
								) : (
									<X size={13} strokeWidth={2.5} />
								)}
							</span>
							<code className={styles.rowCode}>({clauseText(clause)})</code>
							<span className={styles.rowVerdict}>
								{sat ? 'has a true literal' : 'no true literal'}
							</span>
						</li>
					);
				})}
			</ul>

			<Verdict
				ok={result.ok}
				detail={`${result.satisfiedClauses}/${result.totalClauses} clauses satisfied`}
				okText="certificate accepted — φ is satisfiable by this assignment"
				badText="certificate rejected — at least one clause has no true literal"
			/>
			<p className={styles.aside}>
				Verifying is instant. There is no “solve” button on purpose — finding a
				satisfying assignment is the NP-complete part; only checking one is easy.
			</p>
		</div>
	);
};

// ── Graph verifier panel (vertex cover / independent set) ────────────────────

const GraphVerifier = ({ onInteract }) => {
	const [mode, setMode] = useState('vc'); // 'vc' | 'is'
	const [selected, setSelected] = useState(new Set());
	const k = 2;

	const set = [...selected];
	const result = useMemo(() => {
		if (mode === 'vc') return verifyVertexCover(GRAPH, set, k);
		return verifyIndependentSet(GRAPH, set, k);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [mode, selected]);

	const toggleNode = id => {
		onInteract?.();
		setSelected(prev => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const switchMode = m => {
		onInteract?.();
		setMode(m);
		setSelected(new Set());
	};

	// Which edges to flag: VC → uncovered edge (bad); IS → conflict edge (bad).
	const flaggedEdge =
		mode === 'vc' ? result.uncoveredEdge : result.conflictEdge;
	const isFlagged = (a, b) =>
		flaggedEdge &&
		((flaggedEdge[0] === a && flaggedEdge[1] === b) ||
			(flaggedEdge[0] === b && flaggedEdge[1] === a));

	return (
		<div className={styles.panel}>
			<div className={styles.segmented} role="tablist" aria-label="Graph problem">
				<button
					type="button"
					role="tab"
					aria-selected={mode === 'vc'}
					className={`${styles.segment} ${mode === 'vc' ? styles.segmentOn : ''}`}
					onClick={() => switchMode('vc')}
				>
					Vertex cover (≤ {k})
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={mode === 'is'}
					className={`${styles.segment} ${mode === 'is' ? styles.segmentOn : ''}`}
					onClick={() => switchMode('is')}
				>
					Independent set (≥ {k})
				</button>
			</div>

			<p className={styles.aside}>
				{mode === 'vc'
					? 'Pick a set of vertices so every edge has at least one endpoint chosen — using at most k = 2.'
					: 'Pick at least k = 2 vertices with no edge between any two of them.'}{' '}
				Click a vertex to add or remove it.
			</p>

			<svg
				className={styles.graph}
				viewBox="0 0 100 100"
				role="img"
				aria-label="Click vertices to build a candidate certificate"
			>
				{GRAPH.edges.map(([a, b]) => {
					const [ax, ay] = GRAPH.pos[a];
					const [bx, by] = GRAPH.pos[b];
					const flagged = isFlagged(a, b);
					return (
						<line
							key={`${a}${b}`}
							x1={ax}
							y1={ay}
							x2={bx}
							y2={by}
							className={`${styles.edge} ${flagged ? styles.edgeFlag : ''}`}
						/>
					);
				})}
				{GRAPH.nodes.map(n => {
					const [x, y] = GRAPH.pos[n];
					const on = selected.has(n);
					return (
						<g
							key={n}
							className={styles.nodeGroup}
							onClick={() => toggleNode(n)}
							role="button"
							tabIndex={0}
							aria-pressed={on}
							aria-label={`Vertex ${n}${on ? ', selected' : ''}`}
							onKeyDown={e => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									toggleNode(n);
								}
							}}
						>
							<circle
								cx={x}
								cy={y}
								r="9"
								className={`${styles.node} ${on ? styles.nodeOn : ''}`}
							/>
							<text x={x} y={y} className={styles.nodeLabel}>
								{n}
							</text>
						</g>
					);
				})}
			</svg>

			<Verdict
				ok={result.ok}
				detail={
					mode === 'vc'
						? `size ${result.size} ${result.withinK ? '≤' : '>'} k=${k}`
						: `size ${result.size} ${result.atLeastK ? '≥' : '<'} k=${k}`
				}
				okText={
					mode === 'vc'
						? 'valid vertex cover within k — accepted'
						: 'valid independent set of size ≥ k — accepted'
				}
				badText={
					mode === 'vc'
						? result.uncoveredEdge
							? `rejected — edge ${result.uncoveredEdge.join('–')} is uncovered`
							: 'rejected — uses more than k vertices'
						: result.conflictEdge
							? `rejected — ${result.conflictEdge.join('–')} is an edge inside the set`
							: 'rejected — fewer than k vertices'
				}
			/>
		</div>
	);
};

const Verdict = ({ ok, detail, okText, badText }) => (
	<div className={`${styles.verdict} ${ok ? styles.verdictOk : styles.verdictBad}`}>
		<Search size={14} strokeWidth={2} aria-hidden="true" />
		<span className={styles.verdictText}>{ok ? okText : badText}</span>
		<span className={styles.verdictDetail}>{detail}</span>
	</div>
);

// ── Reduction-direction demo ─────────────────────────────────────────────────

const GOAL_SOLVE = 'solve';
const GOAL_PROVE = 'prove';

const ReductionDirectionDemo = ({ onInteract }) => {
	const [goal, setGoal] = useState(GOAL_PROVE);
	const [picked, setPicked] = useState(null); // 'AtoB' | 'BtoA'

	// For the PROVE goal: B is the new problem; A = 3-SAT (known hard). Correct =
	// reduce A→B (3-SAT ≤p B). For the SOLVE goal: you have a solver for B and
	// want to solve A; correct = reduce A→B too — but the framing differs.
	const correct = goal === GOAL_PROVE ? 'AtoB' : 'AtoB';

	const choose = dir => {
		onInteract?.();
		setPicked(dir);
	};
	const reset = goalNext => {
		onInteract?.();
		setGoal(goalNext);
		setPicked(null);
	};

	const answered = picked !== null;
	const isCorrect = picked === correct;

	const labels =
		goal === GOAL_PROVE
			? {
					title:
						'Goal: PROVE that a new problem B is NP-hard. A = 3-SAT (known NP-hard).',
					AtoB: 'Reduce 3-SAT to B  (A ≤p B)',
					BtoA: 'Reduce B to 3-SAT  (B ≤p A)',
					rightWhy:
						'Correct. Mapping the known-hard 3-SAT INTO B shows B is at least as hard as 3-SAT — that is exactly what NP-hard means.',
					wrongWhy:
						'Wrong direction. B ≤p 3-SAT only shows B is no harder than 3-SAT (it does not even establish B is hard). A wrong-direction reduction proves nothing about B’s hardness.',
				}
			: {
					title:
						'Goal: SOLVE problem A using a solver you already have for B.',
					AtoB: 'Reduce A to B  (A ≤p B), run B’s solver',
					BtoA: 'Reduce B to A  (B ≤p A)',
					rightWhy:
						'Correct. Map A’s instance into B, let B’s solver answer, translate it back. The arrow points toward the tool you already have.',
					wrongWhy:
						'Wrong direction. Reducing B to A would let A solve B — the opposite of what you want. To USE B’s solver, the arrow must point A → B.',
				};

	return (
		<div className={styles.panel}>
			<div className={styles.segmented} role="tablist" aria-label="Reduction goal">
				<button
					type="button"
					role="tab"
					aria-selected={goal === GOAL_PROVE}
					className={`${styles.segment} ${goal === GOAL_PROVE ? styles.segmentOn : ''}`}
					onClick={() => reset(GOAL_PROVE)}
				>
					Prove B is hard
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={goal === GOAL_SOLVE}
					className={`${styles.segment} ${goal === GOAL_SOLVE ? styles.segmentOn : ''}`}
					onClick={() => reset(GOAL_SOLVE)}
				>
					Solve A using B
				</button>
			</div>

			<p className={styles.goalTitle}>{labels.title}</p>

			<div className={styles.dirChoices}>
				{['AtoB', 'BtoA'].map(dir => {
					const isPick = picked === dir;
					const isAns = dir === correct;
					return (
						<button
							key={dir}
							type="button"
							className={`${styles.dirChoice} ${
								answered && isAns ? styles.dirChoiceRight : ''
							} ${answered && isPick && !isAns ? styles.dirChoiceWrong : ''}`}
							onClick={() => !answered && choose(dir)}
							disabled={answered}
							aria-pressed={isPick}
						>
							{labels[dir]}
						</button>
					);
				})}
			</div>

			{answered && (
				<div
					className={`${styles.verdict} ${
						isCorrect ? styles.verdictOk : styles.verdictBad
					}`}
				>
					<span className={styles.verdictIcon} aria-hidden="true">
						{isCorrect ? (
							<Check size={14} strokeWidth={2.5} />
						) : (
							<X size={14} strokeWidth={2.5} />
						)}
					</span>
					<span className={styles.verdictText}>
						{isCorrect ? labels.rightWhy : labels.wrongWhy}
					</span>
				</div>
			)}

			{answered && (
				<button
					type="button"
					className={styles.resetBtn}
					onClick={() => reset(goal)}
				>
					<RotateCcw size={13} strokeWidth={2} aria-hidden="true" />
					Try again
				</button>
			)}
		</div>
	);
};

// ── Shell with tabs ──────────────────────────────────────────────────────────

const TABS = [
	{ id: 'sat', label: '3-SAT certificate' },
	{ id: 'graph', label: 'Graph certificate' },
	{ id: 'direction', label: 'Reduction direction' },
];

const NpCompletenessExplorer = ({ onUserInteract }) => {
	const [tab, setTab] = useState('sat');

	const select = id => {
		onUserInteract?.();
		setTab(id);
	};

	return (
		<div className={styles.shell}>
			<div className={styles.tabs} role="tablist" aria-label="Explorer tools">
				{TABS.map(t => (
					<button
						key={t.id}
						type="button"
						role="tab"
						aria-selected={tab === t.id}
						className={`${styles.tab} ${tab === t.id ? styles.tabOn : ''}`}
						onClick={() => select(t.id)}
					>
						{t.label}
					</button>
				))}
			</div>

			{tab === 'sat' && <SatVerifier onInteract={onUserInteract} />}
			{tab === 'graph' && <GraphVerifier onInteract={onUserInteract} />}
			{tab === 'direction' && (
				<ReductionDirectionDemo onInteract={onUserInteract} />
			)}
		</div>
	);
};

export default NpCompletenessExplorer;
