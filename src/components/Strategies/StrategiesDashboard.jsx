import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import LearningPanel from '../../common/LearningPanel/LearningPanel.jsx';
import styles from './StrategiesDashboard.module.css';

const DP_STEPS = [
	{
		title: 'Define the subproblem',
		text: 'Let dp[i] mean the number of ways to climb i stairs using 1-step or 2-step moves.',
		values: [1, 1, null, null, null, null, null],
		active: [0, 1],
		line: 0,
	},
	{
		title: 'Fill dp[2]',
		text: 'To reach stair 2, come from stair 1 with one step or stair 0 with two steps.',
		values: [1, 1, 2, null, null, null, null],
		active: [0, 1, 2],
		line: 3,
	},
	{
		title: 'Fill dp[3]',
		text: 'Reuse earlier answers: dp[3] = dp[2] + dp[1].',
		values: [1, 1, 2, 3, null, null, null],
		active: [1, 2, 3],
		line: 3,
	},
	{
		title: 'Fill dp[4]',
		text: 'The pattern continues. Every new cell depends on two solved cells.',
		values: [1, 1, 2, 3, 5, null, null],
		active: [2, 3, 4],
		line: 3,
	},
	{
		title: 'Fill dp[5]',
		text: 'No recursive recomputation is needed because the table remembers answers.',
		values: [1, 1, 2, 3, 5, 8, null],
		active: [3, 4, 5],
		line: 3,
	},
	{
		title: 'Answer dp[6]',
		text: 'The final table entry gives the answer for the original problem.',
		values: [1, 1, 2, 3, 5, 8, 13],
		active: [4, 5, 6],
		line: 4,
	},
];

const GREEDY_STEPS = [
	{
		title: 'Sort by finish time',
		text: 'For interval scheduling, the safe local choice is the activity that finishes earliest.',
		active: ['A'],
		chosen: [],
		line: 0,
	},
	{
		title: 'Choose A',
		text: 'A finishes first, leaving the most room for future compatible intervals.',
		active: ['A'],
		chosen: ['A'],
		line: 3,
	},
	{
		title: 'Reject B',
		text: 'B overlaps A, so taking it would break compatibility.',
		active: ['B'],
		chosen: ['A'],
		rejected: ['B'],
		line: 5,
	},
	{
		title: 'Choose C',
		text: 'C starts after A finishes, so it is compatible and becomes part of the solution.',
		active: ['C'],
		chosen: ['A', 'C'],
		rejected: ['B'],
		line: 3,
	},
	{
		title: 'Reject D',
		text: 'D overlaps C, so the greedy solution skips it.',
		active: ['D'],
		chosen: ['A', 'C'],
		rejected: ['B', 'D'],
		line: 5,
	},
	{
		title: 'Choose E',
		text: 'E fits after C, producing a maximum-size compatible set for this example.',
		active: ['E'],
		chosen: ['A', 'C', 'E'],
		rejected: ['B', 'D'],
		line: 3,
	},
];

const INTERVALS = [
	{ id: 'A', start: 0, end: 2 },
	{ id: 'B', start: 1, end: 4 },
	{ id: 'C', start: 3, end: 5 },
	{ id: 'D', start: 4, end: 7 },
	{ id: 'E', start: 6, end: 8 },
];

const CONTENT = {
	dp: {
		name: 'Dynamic Programming',
		category: 'Algorithm strategy',
		summary:
			'Dynamic programming solves overlapping subproblems once, stores the answers, and reuses them.',
		intuition:
			'DP is disciplined remembering. Instead of solving the same recursive branch many times, name the subproblem and cache its answer.',
		strategy: [
			'Define a subproblem that is smaller than the original problem.',
			'Find the recurrence that combines smaller answers.',
			'Choose base cases.',
			'Fill the memo/table in an order where dependencies are already known.',
			'Read the answer from the state representing the original problem.',
		],
		complexity: {
			time: { average: 'states × transition cost', worst: 'O(n)' },
			space: { worst: 'O(n)' },
			variables: [
				{ symbol: 'states', label: 'unique subproblems' },
				{ symbol: 'transition', label: 'work per state' },
			],
			why: [
				'Each table state is computed once.',
				'Each state performs a small transition using earlier states.',
				'The table stores one answer per state.',
			],
		},
		tradeoffs: {
			useWhen: [
				'The problem has overlapping subproblems.',
				'The optimal answer can be built from optimal smaller answers.',
			],
			watchOut: [
				'Choosing the wrong state can make the table huge.',
				'DP often needs careful order or memoization to avoid missing dependencies.',
			],
		},
		legend: [
			{ label: 'Known state', color: 'var(--color-accent-green)' },
			{ label: 'Dependency', color: 'var(--color-accent-blue)' },
			{ label: 'Current state', color: 'var(--color-accent-orange)' },
		],
		compareCards: [
			{
				label: 'Signature',
				title: 'Remember answers',
				text: 'DP pays memory to avoid repeated work.',
			},
			{
				label: 'Proof style',
				title: 'Recurrence',
				text: 'Correctness comes from showing the recurrence covers all choices.',
			},
		],
		pseudocode: [
			'define dp[0] and dp[1]',
			'for i from 2 to n:',
			'  left = dp[i - 1]',
			'  right = dp[i - 2]',
			'  dp[i] = left + right',
			'return dp[n]',
		],
		conceptChecks: [
			{
				question: 'How do you recognize a DP problem?',
				answer:
					'Look for repeated subproblems and a recurrence where larger answers are built from smaller answers.',
			},
		],
	},
	greedy: {
		name: 'Greedy Algorithms',
		category: 'Algorithm strategy',
		summary:
			'Greedy algorithms repeatedly make the locally best safe choice and never revise it.',
		intuition:
			'Greedy is powerful when a local choice can be proven not to block an optimal global answer.',
		strategy: [
			'Sort or prioritize candidates by a rule.',
			'Pick the best available candidate.',
			'Keep it only if it preserves feasibility.',
			'Repeat without revisiting earlier choices.',
			'Prove the local rule is safe with an exchange argument.',
		],
		complexity: {
			time: { average: 'O(n log n)', worst: 'O(n log n)' },
			space: { worst: 'O(n)' },
			variables: [{ symbol: 'n', label: 'candidates' }],
			why: [
				'Most greedy algorithms sort or use a priority queue.',
				'After sorting, the scan is usually linear.',
				'The chosen set stores up to n candidates.',
			],
		},
		tradeoffs: {
			useWhen: [
				'A locally optimal choice can be proven globally safe.',
				'You want a simple fast algorithm for scheduling, MSTs, intervals, or shortest paths with the right assumptions.',
			],
			watchOut: [
				'Many problems look greedy but require DP instead.',
				'You need a proof, not just an appealing rule.',
			],
		},
		legend: [
			{ label: 'Current candidate', color: 'var(--color-accent-orange)' },
			{ label: 'Chosen', color: 'var(--color-accent-green)' },
			{ label: 'Rejected', color: 'var(--color-accent-red)' },
		],
		compareCards: [
			{
				label: 'Signature',
				title: 'Commit safely',
				text: 'Greedy does not explore alternatives once a choice is accepted.',
			},
			{
				label: 'Proof style',
				title: 'Exchange argument',
				text: 'Show any optimal solution can be transformed to include the greedy choice.',
			},
		],
		pseudocode: [
			'sort intervals by finish time',
			'lastFinish = -infinity',
			'for each interval:',
			'  if interval.start >= lastFinish:',
			'    choose interval',
			'    lastFinish = interval.end',
			'  else reject interval',
		],
		conceptChecks: [
			{
				question: 'Why is earliest finish time safe for interval scheduling?',
				answer:
					'Choosing the earliest finishing compatible interval leaves at least as much room as any other first choice.',
			},
		],
	},
};

const StrategiesDashboard = () => {
	const [strategy, setStrategy] = useState('dp');
	const [stepIndex, setStepIndex] = useState(0);
	const steps = strategy === 'dp' ? DP_STEPS : GREEDY_STEPS;
	const step = steps[stepIndex];
	const content = CONTENT[strategy];
	const accent =
		strategy === 'dp' ? 'var(--color-accent-blue)' : 'var(--color-accent-green)';

	const trace = useMemo(
		() => ({
			title: step.title,
			text: step.text,
			steps:
				strategy === 'dp'
					? [
							{ label: 'State', text: 'dp[i] = ways to solve prefix i.' },
							{
								label: 'Dependencies',
								text: step.active.map(index => `dp[${index}]`).join(', '),
							},
						]
					: [
							{ label: 'Chosen', text: step.chosen.join(', ') || 'none yet' },
							{ label: 'Current', text: step.active.join(', ') },
						],
		}),
		[step, strategy]
	);

	const switchStrategy = nextStrategy => {
		setStrategy(nextStrategy);
		setStepIndex(0);
	};

	return (
		<div className={styles.dashboard}>
			<section className={styles.workbench}>
				<div className={styles.controlBand}>
					<div className={styles.titleBlock}>
						<strong>Algorithm strategy lab</strong>
						<span>Learn when to remember answers and when to commit early</span>
					</div>
					<div className={styles.modeSwitch}>
						<button
							type="button"
							className={strategy === 'dp' ? styles.modeActive : ''}
							onClick={() => switchStrategy('dp')}
						>
							Dynamic Programming
						</button>
						<button
							type="button"
							className={strategy === 'greedy' ? styles.modeActive : ''}
							onClick={() => switchStrategy('greedy')}
						>
							Greedy
						</button>
					</div>
					<div className={styles.stepControls}>
						<button
							type="button"
							onClick={() => setStepIndex(index => Math.max(index - 1, 0))}
							disabled={stepIndex === 0}
							title="Previous step"
						>
							<ChevronLeft size={18} />
						</button>
						<button
							type="button"
							onClick={() =>
								setStepIndex(index => Math.min(index + 1, steps.length - 1))
							}
							disabled={stepIndex === steps.length - 1}
							title="Next step"
						>
							<ChevronRight size={18} />
						</button>
						<button
							type="button"
							onClick={() => setStepIndex(0)}
							title="Reset walkthrough"
						>
							<RotateCcw size={16} />
						</button>
						<span>
							{stepIndex + 1}/{steps.length}
						</span>
					</div>
				</div>

				<div className={styles.stage}>
					{strategy === 'dp' ? (
						<div className={styles.dpBoard}>
							<div className={styles.stageCard}>
								<span>Current question</span>
								<strong>{step.title}</strong>
								<p>{step.text}</p>
							</div>
							<div className={styles.dpTable}>
								{step.values.map((value, index) => (
									<div
										key={index}
										className={`${styles.dpCell} ${
											step.active.includes(index) ? styles.cellActive : ''
										} ${value != null ? styles.cellKnown : ''}`}
									>
										<span>dp[{index}]</span>
										<strong>{value ?? '?'}</strong>
									</div>
								))}
							</div>
						</div>
					) : (
						<div className={styles.greedyBoard}>
							<div className={styles.stageCard}>
								<span>Current rule</span>
								<strong>{step.title}</strong>
								<p>{step.text}</p>
							</div>
							<div className={styles.timeline}>
								{INTERVALS.map(interval => {
									const isActive = step.active.includes(interval.id);
									const isChosen = step.chosen.includes(interval.id);
									const isRejected = step.rejected?.includes(interval.id);
									return (
										<div key={interval.id} className={styles.intervalRow}>
											<span>{interval.id}</span>
											<div className={styles.intervalTrack}>
												<div
													className={`${styles.intervalBar} ${
														isChosen
															? styles.intervalChosen
															: isRejected
																? styles.intervalRejected
																: isActive
																	? styles.intervalActive
																	: ''
													}`}
													style={{
														left: `${interval.start * 10}%`,
														width: `${(interval.end - interval.start) * 10}%`,
													}}
												>
													{interval.start}-{interval.end}
												</div>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					)}
				</div>
			</section>

			<aside className={styles.lessonPanel}>
				<LearningPanel
					content={content}
					trace={trace}
					activeLine={step.line}
					accent={accent}
				/>
			</aside>
		</div>
	);
};

export default StrategiesDashboard;
