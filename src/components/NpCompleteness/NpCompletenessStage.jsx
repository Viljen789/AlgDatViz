import { useMemo } from 'react';
import { ArrowRight, Check, Search, X } from 'lucide-react';
import { SCENES } from './scenes.js';
import {
	reduce3SatToIndependentSet,
	satisfyingAssignmentToIndependentSet,
	verify3SAT,
} from './certificates.js';
import styles from './NpCompletenessStage.module.css';

// The synchronized concept stage for NP-completeness. It reacts to the active
// scrolly scene *by id* and switches between conceptual boards:
//   • landscape  — the P ⊆ NP ⊆ NP-hard / NP-complete map (nested classes).
//   • verify     — a 3-SAT certificate checked clause by clause (the "easy to
//                  verify" idea made tangible, graded by the pure verify3SAT).
//   • roster     — the standard NP-complete problems vs the P problems.
//   • direction  — the reduction arrow, pointing the SOLVE way vs the PROVE way.
//   • reduction  — the worked 3-SAT → Independent-Set construction.
// Everything is token-tinted; the topic hue arrives via --topic-accent.

// The formula used in the 'verify-it' scene + the worked reduction.
const DEMO_FORMULA = {
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
	],
};

const clauseText = clause =>
	clause
		.map(l => `${l.negated ? '¬' : ''}${l.var}`)
		.join(' ∨ ');

// The assignment shown in the 'verify-it' scene (matches the scene's numeric
// check). Hoisted so it is a stable reference for the verifier memo.
const VERIFY_ASSIGNMENT = { x1: true, x2: false, x3: false };

// ── Landscape: nested complexity-class map ───────────────────────────────────

const LandscapeBoard = ({ sceneId }) => {
	// Which ring to emphasize per scene.
	const focus =
		sceneId === 'the-line'
			? 'p'
			: sceneId === 'np-is-verify'
				? 'np'
				: sceneId === 'hard-vs-complete'
					? 'npc'
					: 'all';
	return (
		<div className={styles.landscape} data-focus={focus}>
			{/* Containment anchor: the nesting named once, so the shape (three
			    classes, one inside the next) reads before the prose explains it.
			    The current scene's class is the single highlighted link. */}
			<div className={styles.chain} aria-hidden="true">
				<span
					className={`${styles.chainLink} ${focus === 'p' ? styles.chainLinkLit : ''}`}
				>
					P
				</span>
				<span className={styles.chainOp}>⊆</span>
				<span
					className={`${styles.chainLink} ${focus === 'np' ? styles.chainLinkLit : ''}`}
				>
					NP
				</span>
				<span className={styles.chainOp}>⊆</span>
				<span
					className={`${styles.chainLink} ${focus === 'npc' ? styles.chainLinkLit : ''}`}
				>
					NP-hard
				</span>
			</div>
			<div
				className={`${styles.ring} ${styles.ringHard} ${
					focus === 'npc' ? styles.ringLit : ''
				}`}
			>
				<span className={styles.ringLabel}>NP-hard</span>
				<div
					className={`${styles.ring} ${styles.ringNp} ${
						focus === 'np' ? styles.ringLit : ''
					}`}
				>
					<span className={styles.ringLabel}>NP — verifiable</span>
					<div
						className={`${styles.ring} ${styles.ringP} ${
							focus === 'p' ? styles.ringLit : ''
						}`}
					>
						<span className={styles.ringLabel}>P — solvable</span>
					</div>
					{/* NP-complete = the intersection lens of NP and NP-hard */}
					<span
						className={`${styles.npcBadge} ${
							focus === 'npc' ? styles.npcBadgeLit : ''
						}`}
					>
						NP-complete
						<small>NP ∩ NP-hard</small>
					</span>
				</div>
			</div>
			<p className={styles.caption}>
				{focus === 'p' && 'P sits inside NP: solving fast implies verifying fast.'}
				{focus === 'np' &&
					'NP — every yes-instance has a poly-time-checkable certificate.'}
				{focus === 'npc' &&
					'NP-complete = in NP AND NP-hard. NP-hard alone can sit outside NP.'}
				{focus === 'all' && 'P ⊆ NP ⊆ NP-hard frontier; NP-complete is the overlap.'}
			</p>
		</div>
	);
};

// ── Verify: a 3-SAT certificate checked clause by clause ─────────────────────

const VerifyBoard = () => {
	const assignment = VERIFY_ASSIGNMENT;
	const result = useMemo(() => verify3SAT(DEMO_FORMULA, assignment), [assignment]);
	return (
		<div className={styles.verifyBoard}>
			<div className={styles.assignRow} aria-label="Proposed assignment">
				<span className={styles.assignTag}>certificate</span>
				{DEMO_FORMULA.vars.map(v => (
					<span key={v} className={styles.assignChip}>
						{v.replace('x', 'x')} = {String(assignment[v])}
					</span>
				))}
			</div>
			<ul className={styles.clauseList}>
				{DEMO_FORMULA.clauses.map((clause, i) => {
					const sat = result.perClause[i];
					return (
						<li
							key={i}
							className={`${styles.clause} ${
								sat ? styles.clauseSat : styles.clauseUnsat
							}`}
						>
							<span className={styles.clauseIcon} aria-hidden="true">
								{sat ? (
									<Check size={14} strokeWidth={2.5} />
								) : (
									<X size={14} strokeWidth={2.5} />
								)}
							</span>
							<code className={styles.clauseCode}>({clauseText(clause)})</code>
							<span className={styles.clauseVerdict}>
								{sat ? 'satisfied' : 'no true literal'}
							</span>
						</li>
					);
				})}
			</ul>
			<p
				className={`${styles.caption} ${
					result.ok ? styles.captionGood : styles.captionBad
				}`}
			>
				<Search size={13} strokeWidth={2} aria-hidden="true" />
				{result.satisfiedClauses}/{result.totalClauses} clauses — verifier{' '}
				{result.ok ? 'accepts' : 'rejects'}, in one linear pass
			</p>
		</div>
	);
};

// ── Roster: the standard NP-complete problems vs P ───────────────────────────

const NPC_PROBLEMS = [
	'SAT',
	'3-SAT',
	'CLIQUE',
	'VERTEX-COVER',
	'INDEP-SET',
	'HAM-CYCLE',
	'TSP',
	'SUBSET-SUM',
];
const P_PROBLEMS = ['Shortest path', 'MST', 'Sorting', 'Max flow'];

const RosterBoard = () => (
	<div className={styles.roster}>
		<div className={styles.rosterCol}>
			<span className={`${styles.colTag} ${styles.colTagNpc}`}>
				NP-complete — all inter-reducible
			</span>
			<ul className={styles.chipGrid}>
				{NPC_PROBLEMS.map(p => (
					<li key={p} className={`${styles.chip} ${styles.chipNpc}`}>
						{p}
					</li>
				))}
			</ul>
		</div>
		<div className={styles.rosterCol}>
			<span className={styles.colTag}>In P — poly-time solvable</span>
			<ul className={styles.chipGrid}>
				{P_PROBLEMS.map(p => (
					<li key={p} className={styles.chip}>
						{p}
					</li>
				))}
			</ul>
		</div>
		<p className={styles.caption}>
			A polynomial solver for any one NP-complete problem would crack them all.
		</p>
	</div>
);

// ── Direction: the reduction arrow — solve way vs prove way ──────────────────

const DirectionBoard = ({ sceneId }) => {
	// 'reduction-tool' = the SOLVE direction; 'wrong-direction' = the PROVE rule.
	const proving = sceneId === 'wrong-direction';
	return (
		<div className={styles.direction}>
			<div className={styles.dirRow}>
				<div className={`${styles.dirNode} ${proving ? '' : styles.dirNodeFrom}`}>
					A
					<small>{proving ? 'known-hard (3-SAT)' : 'problem to solve'}</small>
				</div>
				<div className={styles.dirArrow}>
					<ArrowRight size={26} strokeWidth={2} aria-hidden="true" />
					<span className={styles.dirArrowLabel}>≤p</span>
				</div>
				<div className={`${styles.dirNode} ${proving ? styles.dirNodeTo : ''}`}>
					B
					<small>{proving ? 'prove this hard' : 'solver you have'}</small>
				</div>
			</div>
			<div
				className={`${styles.dirCallout} ${
					proving ? styles.dirCalloutProve : styles.dirCalloutSolve
				}`}
			>
				{proving ? (
					<>
						<strong>To PROVE B is NP-hard:</strong> reduce a known-hard problem
						(A = 3-SAT) <em>into</em> B. A ≤p B means B is at least as hard as A.
						<span className={styles.dirWrong}>
							Reducing B ≤p 3-SAT instead proves nothing about B.
						</span>
					</>
				) : (
					<>
						<strong>To SOLVE A with B’s solver:</strong> reduce A <em>into</em> B
						(A ≤p B), run B’s solver, translate the answer back. The arrow points
						toward the tool you already have.
					</>
				)}
			</div>
		</div>
	);
};

// ── Reduction: the worked 3-SAT → Independent-Set construction ───────────────

const ReductionBoard = () => {
	const { built, picks } = useMemo(() => {
		const b = reduce3SatToIndependentSet(DEMO_FORMULA);
		const p = satisfyingAssignmentToIndependentSet(DEMO_FORMULA, {
			x1: true,
			x2: true,
			x3: false,
		});
		return { built: b, picks: new Set(p) };
	}, []);

	return (
		<div className={styles.reduction}>
			<div className={styles.redHead}>
				<span className={styles.redFrom}>3-SAT instance</span>
				<ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
				<span className={styles.redTo}>Independent-Set instance (k = {built.k})</span>
			</div>
			<div className={styles.gadgets}>
				{DEMO_FORMULA.clauses.map((clause, ci) => (
					<div key={ci} className={styles.gadget}>
						<span className={styles.gadgetTag}>clause {ci + 1}</span>
						<div className={styles.gadgetNodes}>
							{clause.map((lit, li) => {
								const id = `c${ci}_${li}`;
								const chosen = picks.has(id);
								return (
									<span
										key={id}
										className={`${styles.litNode} ${
											chosen ? styles.litNodeChosen : ''
										}`}
									>
										{`${lit.negated ? '¬' : ''}${lit.var}`}
									</span>
								);
							})}
						</div>
					</div>
				))}
			</div>
			<p className={`${styles.caption} ${styles.captionGood}`}>
				Glowing = one true literal per clause → an independent set of size k.
				φ satisfiable ⇔ size-k independent set exists.
			</p>
		</div>
	);
};

// Map each scene id to the board it drives + the accessible label + notation.
const SCENE_BOARDS = {
	'the-line': 'landscape',
	'np-is-verify': 'landscape',
	'verify-it': 'verify',
	'hard-vs-complete': 'landscape',
	'the-roster': 'roster',
	'reduction-tool': 'direction',
	'wrong-direction': 'direction',
	'worked-reduction': 'reduction',
};

const BOARD_META = {
	landscape: {
		label: 'Nested complexity classes: P inside NP inside the NP-hard frontier, with NP-complete as the overlap',
		notation: 'P ⊆ NP ⊆ NP-hard',
	},
	verify: {
		label: 'A 3-SAT certificate checked clause by clause in polynomial time',
		notation: 'verify in O(literals)',
	},
	roster: {
		label: 'The standard NP-complete problems beside problems that are in P',
		notation: 'NPC vs P',
	},
	direction: {
		label: 'The reduction arrow A ≤p B, pointing the solve direction versus the hardness-proof direction',
		notation: 'A ≤p B · direction',
	},
	reduction: {
		label: 'The worked reduction from 3-SAT to Independent-Set with clause gadgets',
		notation: '3-SAT ≤p INDEP-SET',
	},
};

const NpCompletenessStage = ({ activeScene = 0 }) => {
	const sceneId = SCENES[activeScene]?.id ?? SCENES[0].id;
	const board = SCENE_BOARDS[sceneId] ?? 'landscape';
	const meta = BOARD_META[board];

	return (
		<div
			className={styles.wrap}
			data-scene={activeScene}
			role="img"
			aria-label={meta.label}
		>
			{board === 'landscape' && <LandscapeBoard sceneId={sceneId} />}
			{board === 'verify' && <VerifyBoard />}
			{board === 'roster' && <RosterBoard />}
			{board === 'direction' && <DirectionBoard sceneId={sceneId} />}
			{board === 'reduction' && <ReductionBoard />}

			<div className={styles.notation} aria-hidden="true">
				{meta.notation}
			</div>
		</div>
	);
};

export default NpCompletenessStage;
