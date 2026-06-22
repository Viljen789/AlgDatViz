import { Fragment, useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, Flame, GraduationCap, Lock } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import {
	BUILT_TOPICS,
	CURRICULUM,
	FIRST_TOPIC,
	TOPIC_BY_ID,
} from '../data/curriculum.js';
import { REVIEW_BANK } from '../components/Review/reviewBank.js';
import { dailyGoal, examNewCap } from '../lib/activityLog.js';
import useProgress from '../hooks/useProgress.js';
import useSrs from '../hooks/useSrs.js';
import useActivity from '../hooks/useActivity.js';
import HeroInstrument from './HeroInstrument.jsx';
import TopicFinder from './TopicFinder.jsx';
import styles from './HomePage.module.css';

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, MotionPathPlugin);

// The completion tick — GoalRing's exact two-segment geometry, framed by a
// cropped 16-unit viewBox (12 12 16 16) so it sits centred in the station dot.
// Rendered as an inline <path> so it can ink on (drawSVG) the first time a
// finished node scrolls into view.
const NODE_CHECK_D = 'M14.5 20.5 l3.5 3.5 l7 -8';

// A stable DOM id for a phase chapter, so the overview map can jump-scroll to it.
const phaseSlug = name =>
	`phase-${name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')}`;

// Roman numerals for the five acts — quieter and more "chapter" than 1..5.
const PHASE_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

// ---- Serpentine spine geometry ----------------------------------------------
// The rail is a gentle sine that snakes down the column instead of a dead-straight
// line. The path lives in a fixed 0..1000 user space (the rail SVG is stretched to
// the spine's true pixel height via preserveAspectRatio="none", x-scale 1 since the
// box width == the viewBox width). ONE amplitude + wave count drives three things
// that must agree: the drawn path, each station dot's horizontal nudge onto that
// path, and the comet that rides it. With no JS / reduced motion the rail stays a
// straight centred line (the static markup `d`), so nothing depends on the snake.
const RAIL_W = 48; // rail box + marker gutter width (px == viewBox units)
const RAIL_CX = RAIL_W / 2; // centreline
const RAIL_AMP = 13; // horizontal swing (px)
const RAIL_WAVES = 3.5; // gentle S-curves over the whole spine
// Horizontal offset from the centreline at vertical fraction f ∈ [0,1].
const railWaveX = f => RAIL_AMP * Math.sin(2 * Math.PI * RAIL_WAVES * f);
// The snake as an SVG path in 0..1000 user space (sampled finely enough to read as
// a smooth curve). Used for both the base + ink strokes once JS takes over.
const RAIL_PATH = (() => {
	const STEPS = 160;
	let d = '';
	for (let i = 0; i <= STEPS; i += 1) {
		const f = i / STEPS;
		const x = (RAIL_CX + railWaveX(f)).toFixed(2);
		const y = (f * 1000).toFixed(1);
		d += `${i === 0 ? 'M' : 'L'}${x} ${y} `;
	}
	return d.trim();
})();
// The straight centreline fallback drawn in the markup (no-JS / reduced motion).
const RAIL_STRAIGHT = `M${RAIL_CX} 0 L${RAIL_CX} 1000`;

const PreviewBars = () => (
	<svg
		viewBox="0 0 120 56"
		className={styles.preview}
		aria-hidden="true"
		preserveAspectRatio="none"
	>
		{[28, 12, 22, 8, 36, 16, 30, 20].map((h, i) => (
			<rect
				key={i}
				x={i * 14 + 4}
				y={48 - h}
				width="8"
				height={h}
				rx="1.5"
				fill="currentColor"
				opacity={0.35 + (i % 3) * 0.18}
			/>
		))}
	</svg>
);

const PreviewSplit = () => (
	<svg
		viewBox="0 0 120 56"
		className={styles.preview}
		aria-hidden="true"
		preserveAspectRatio="none"
	>
		<g stroke="currentColor" strokeWidth="1" fill="none" opacity="0.55">
			<line x1="60" y1="6" x2="28" y2="22" />
			<line x1="60" y1="6" x2="92" y2="22" />
			<line x1="28" y1="22" x2="14" y2="38" />
			<line x1="28" y1="22" x2="42" y2="38" />
			<line x1="92" y1="22" x2="78" y2="38" />
			<line x1="92" y1="22" x2="106" y2="38" />
		</g>
		<g fill="currentColor">
			<circle cx="60" cy="6" r="3" />
			<circle cx="28" cy="22" r="3" opacity="0.85" />
			<circle cx="92" cy="22" r="3" opacity="0.85" />
			<circle cx="14" cy="38" r="2.5" opacity="0.7" />
			<circle cx="42" cy="38" r="2.5" opacity="0.7" />
			<circle cx="78" cy="38" r="2.5" opacity="0.7" />
			<circle cx="106" cy="38" r="2.5" opacity="0.7" />
		</g>
	</svg>
);

const PreviewNetwork = () => (
	<svg
		viewBox="0 0 120 56"
		className={styles.preview}
		aria-hidden="true"
		preserveAspectRatio="none"
	>
		<g stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5">
			<line x1="20" y1="14" x2="56" y2="28" />
			<line x1="56" y1="28" x2="98" y2="14" />
			<line x1="20" y1="14" x2="36" y2="44" />
			<line x1="56" y1="28" x2="36" y2="44" />
			<line x1="56" y1="28" x2="84" y2="44" />
			<line x1="98" y1="14" x2="84" y2="44" />
		</g>
		<g fill="currentColor">
			<circle cx="20" cy="14" r="3.5" />
			<circle cx="56" cy="28" r="4" />
			<circle cx="98" cy="14" r="3.5" />
			<circle cx="36" cy="44" r="3" opacity="0.85" />
			<circle cx="84" cy="44" r="3" opacity="0.85" />
		</g>
	</svg>
);

const PreviewBuckets = () => (
	<svg
		viewBox="0 0 120 56"
		className={styles.preview}
		aria-hidden="true"
		preserveAspectRatio="none"
	>
		{[0, 1, 2, 3].map(i => (
			<g key={i} transform={`translate(${4 + i * 30}, 6)`}>
				<rect
					width="22"
					height="44"
					rx="3"
					fill="none"
					stroke="currentColor"
					strokeWidth="1"
					opacity="0.45"
				/>
				{Array.from({ length: [2, 3, 1, 2][i] }).map((_, j) => (
					<rect
						key={j}
						x="3"
						y={37 - j * 11}
						width="16"
						height="8"
						rx="1.5"
						fill="currentColor"
						opacity={0.55 + j * 0.15}
					/>
				))}
			</g>
		))}
	</svg>
);

// An indexed array row: six equal cells side by side, one subtly filled — the
// "everything lives in an array" primer (distinct from the sorting bars).
const PreviewArray = () => (
	<svg
		viewBox="0 0 120 56"
		className={styles.preview}
		aria-hidden="true"
		preserveAspectRatio="none"
	>
		{[0, 1, 2, 3, 4, 5].map(i => (
			<rect
				key={i}
				x={4 + i * 19}
				y="18"
				width="17"
				height="20"
				rx="1.5"
				fill="currentColor"
				fillOpacity={i === 2 ? 0.55 : 0}
				stroke="currentColor"
				strokeWidth="1"
				opacity={i === 2 ? 0.85 : 0.5}
			/>
		))}
	</svg>
);

// A LIFO stack: four boxed cells piled vertically with a small cap arrow at the
// top marking where the next push/pop happens.
const PreviewStack = () => (
	<svg
		viewBox="0 0 120 56"
		className={styles.preview}
		aria-hidden="true"
		preserveAspectRatio="none"
	>
		<g
			stroke="currentColor"
			strokeWidth="1"
			fill="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M60 4 l-7 8 h4 v6 h6 v-6 h4 Z" opacity="0.85" />
			{[0, 1, 2, 3].map(i => (
				<rect
					key={i}
					x="42"
					y={22 + i * 8}
					width="36"
					height="7"
					rx="1.5"
					fillOpacity={0.55 - i * 0.1}
					opacity={0.7}
				/>
			))}
		</g>
	</svg>
);

// Counting bins: four short tally columns of differing fill heights sitting on a
// baseline — the histogram of counts (smaller and bin-like, not sorting bars).
const PreviewCounts = () => (
	<svg
		viewBox="0 0 120 56"
		className={styles.preview}
		aria-hidden="true"
		preserveAspectRatio="none"
	>
		<line
			x1="8"
			y1="46"
			x2="112"
			y2="46"
			stroke="currentColor"
			strokeWidth="1"
			opacity="0.45"
		/>
		{[18, 30, 12, 24].map((h, i) => (
			<rect
				key={i}
				x={14 + i * 24}
				y={45 - h}
				width="14"
				height={h}
				rx="1.5"
				fill="currentColor"
				opacity={0.4 + i * 0.13}
			/>
		))}
	</svg>
);

// A binary search tree leaning right: a root with an ordered left/right cascade,
// the asymmetry reading as sorted-on-insert (distinct from the balanced split).
const PreviewTree = () => (
	<svg
		viewBox="0 0 120 56"
		className={styles.preview}
		aria-hidden="true"
		preserveAspectRatio="none"
	>
		<g stroke="currentColor" strokeWidth="1" fill="none" opacity="0.55">
			<line x1="44" y1="8" x2="22" y2="26" />
			<line x1="44" y1="8" x2="74" y2="26" />
			<line x1="74" y1="26" x2="58" y2="46" />
			<line x1="74" y1="26" x2="98" y2="46" />
		</g>
		<g fill="currentColor">
			<circle cx="44" cy="8" r="3.5" />
			<circle cx="22" cy="26" r="3" opacity="0.85" />
			<circle cx="74" cy="26" r="3" opacity="0.85" />
			<circle cx="58" cy="46" r="2.5" opacity="0.7" />
			<circle cx="98" cy="46" r="2.5" opacity="0.7" />
		</g>
	</svg>
);

// A compact heap: a tight triangle of nodes with an emphasized (larger, filled)
// root over two then three children — the always-best-on-top silhouette.
const PreviewHeap = () => (
	<svg
		viewBox="0 0 120 56"
		className={styles.preview}
		aria-hidden="true"
		preserveAspectRatio="none"
	>
		<g stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5">
			<line x1="60" y1="10" x2="42" y2="28" />
			<line x1="60" y1="10" x2="78" y2="28" />
			<line x1="42" y1="28" x2="30" y2="46" />
			<line x1="42" y1="28" x2="54" y2="46" />
			<line x1="78" y1="28" x2="90" y2="46" />
		</g>
		<g fill="currentColor">
			<circle cx="60" cy="10" r="4.5" />
			<circle cx="42" cy="28" r="3" opacity="0.8" />
			<circle cx="78" cy="28" r="3" opacity="0.8" />
			<circle cx="30" cy="46" r="2.5" opacity="0.65" />
			<circle cx="54" cy="46" r="2.5" opacity="0.65" />
			<circle cx="90" cy="46" r="2.5" opacity="0.65" />
		</g>
	</svg>
);

// A decision branch: one node forking into two routes, the chosen path drawn
// bolder — greedy/divide-and-conquer/DP "when to choose what".
const PreviewBranch = () => (
	<svg
		viewBox="0 0 120 56"
		className={styles.preview}
		aria-hidden="true"
		preserveAspectRatio="none"
	>
		<line
			x1="18"
			y1="28"
			x2="58"
			y2="12"
			stroke="currentColor"
			strokeWidth="2"
			fill="none"
			opacity="0.85"
		/>
		<line
			x1="18"
			y1="28"
			x2="58"
			y2="44"
			stroke="currentColor"
			strokeWidth="1"
			fill="none"
			opacity="0.4"
		/>
		<g fill="currentColor">
			<circle cx="18" cy="28" r="4" />
			<circle cx="58" cy="12" r="3.5" />
			<circle cx="58" cy="44" r="3" opacity="0.5" />
		</g>
	</svg>
);

// A minimum spanning tree: five nodes where the chosen edges are solid and a
// couple of rejected edges are faint/dashed — a connected subset of the graph.
const PreviewSpanning = () => (
	<svg
		viewBox="0 0 120 56"
		className={styles.preview}
		aria-hidden="true"
		preserveAspectRatio="none"
	>
		<g stroke="currentColor" strokeWidth="1" fill="none">
			<line x1="18" y1="14" x2="50" y2="30" opacity="0.85" />
			<line x1="50" y1="30" x2="86" y2="16" opacity="0.85" />
			<line x1="50" y1="30" x2="40" y2="48" opacity="0.85" />
			<line x1="86" y1="16" x2="100" y2="44" opacity="0.85" />
			<line
				x1="18"
				y1="14"
				x2="40"
				y2="48"
				strokeDasharray="3 3"
				opacity="0.3"
			/>
			<line
				x1="86"
				y1="16"
				x2="50"
				y2="30"
				strokeDasharray="3 3"
				opacity="0.3"
			/>
		</g>
		<g fill="currentColor">
			<circle cx="18" cy="14" r="3" />
			<circle cx="50" cy="30" r="3.5" />
			<circle cx="86" cy="16" r="3" />
			<circle cx="40" cy="48" r="3" />
			<circle cx="100" cy="44" r="3" />
		</g>
	</svg>
);

// A shortest path: a single bold polyline threading through four nodes while the
// off-path nodes sit faint — the one route relaxation settles on.
const PreviewPath = () => (
	<svg
		viewBox="0 0 120 56"
		className={styles.preview}
		aria-hidden="true"
		preserveAspectRatio="none"
	>
		<polyline
			points="14,40 44,16 76,36 108,12"
			stroke="currentColor"
			strokeWidth="2"
			fill="none"
			strokeLinecap="round"
			strokeLinejoin="round"
			opacity="0.85"
		/>
		<g fill="currentColor">
			<circle cx="14" cy="40" r="3.5" />
			<circle cx="44" cy="16" r="3.5" />
			<circle cx="76" cy="36" r="3.5" />
			<circle cx="108" cy="12" r="3.5" />
			<circle cx="40" cy="46" r="2.5" opacity="0.35" />
			<circle cx="92" cy="44" r="2.5" opacity="0.35" />
		</g>
	</svg>
);

// A DP table: a 4×3 lattice of dots — the all-pairs distance matrix filled in
// over intermediate vertices.
const PreviewMatrix = () => (
	<svg
		viewBox="0 0 120 56"
		className={styles.preview}
		aria-hidden="true"
		preserveAspectRatio="none"
	>
		<g fill="currentColor">
			{[0, 1, 2].map(row =>
				[0, 1, 2, 3].map(col => (
					<circle
						key={`${row}-${col}`}
						cx={24 + col * 24}
						cy={14 + row * 14}
						r="3"
						opacity={row === col ? 0.85 : 0.45}
					/>
				))
			)}
		</g>
	</svg>
);

// A flow network: a source on the left and a sink on the right, joined through
// two middle nodes by directed pipes of differing thickness (capacities).
const PreviewFlow = () => (
	<svg
		viewBox="0 0 120 56"
		className={styles.preview}
		aria-hidden="true"
		preserveAspectRatio="none"
	>
		<g stroke="currentColor" fill="none" strokeLinecap="round" opacity="0.7">
			<line x1="16" y1="28" x2="48" y2="14" strokeWidth="3" />
			<line x1="16" y1="28" x2="48" y2="44" strokeWidth="1.5" />
			<line x1="48" y1="14" x2="48" y2="44" strokeWidth="1.5" />
			<line x1="48" y1="14" x2="104" y2="28" strokeWidth="2" />
			<line x1="48" y1="44" x2="104" y2="28" strokeWidth="3" />
		</g>
		<g fill="currentColor">
			<circle cx="16" cy="28" r="4" />
			<circle cx="48" cy="14" r="3" opacity="0.85" />
			<circle cx="48" cy="44" r="3" opacity="0.85" />
			<circle cx="104" cy="28" r="4" />
		</g>
	</svg>
);

// Intractability: a small densely interconnected clique — five nodes wired to
// each other, the tangle that reads as combinatorially hard.
const PreviewClique = () => (
	<svg
		viewBox="0 0 120 56"
		className={styles.preview}
		aria-hidden="true"
		preserveAspectRatio="none"
	>
		<g stroke="currentColor" strokeWidth="1" fill="none" opacity="0.45">
			<line x1="60" y1="8" x2="30" y2="26" />
			<line x1="60" y1="8" x2="90" y2="26" />
			<line x1="60" y1="8" x2="42" y2="48" />
			<line x1="60" y1="8" x2="78" y2="48" />
			<line x1="30" y1="26" x2="90" y2="26" />
			<line x1="30" y1="26" x2="42" y2="48" />
			<line x1="30" y1="26" x2="78" y2="48" />
			<line x1="90" y1="26" x2="42" y2="48" />
			<line x1="90" y1="26" x2="78" y2="48" />
			<line x1="42" y1="48" x2="78" y2="48" />
		</g>
		<g fill="currentColor">
			<circle cx="60" cy="8" r="3" />
			<circle cx="30" cy="26" r="3" />
			<circle cx="90" cy="26" r="3" />
			<circle cx="42" cy="48" r="3" />
			<circle cx="78" cy="48" r="3" />
		</g>
	</svg>
);

const PREVIEW_BY_ID = {
	foundations: PreviewArray,
	'stacks-queues': PreviewStack,
	'master-theorem': PreviewSplit,
	sorting: PreviewBars,
	'linear-time-sorting': PreviewCounts,
	hashing: PreviewBuckets,
	trees: PreviewTree,
	heaps: PreviewHeap,
	graphs: PreviewNetwork,
	strategies: PreviewBranch,
	mst: PreviewSpanning,
	'shortest-paths': PreviewPath,
	apsp: PreviewMatrix,
	'max-flow': PreviewFlow,
	'np-completeness': PreviewClique,
};

// A small daily-goal ring: today's answered count against the goal.
const GoalRing = ({ value, goal, done }) => {
	const R = 15;
	const C = 2 * Math.PI * R;
	const frac = Math.max(0, Math.min(1, goal > 0 ? value / goal : 0));
	return (
		<svg
			className={styles.ring}
			width="40"
			height="40"
			viewBox="0 0 40 40"
			aria-hidden="true"
		>
			<circle className={styles.ringTrack} cx="20" cy="20" r={R} />
			<circle
				className={styles.ringFill}
				cx="20"
				cy="20"
				r={R}
				transform="rotate(-90 20 20)"
				style={{ strokeDasharray: C, strokeDashoffset: C * (1 - frac) }}
			/>
			{done && (
				<path className={styles.ringCheck} d="M14.5 20.5 l3.5 3.5 l7 -8" />
			)}
		</svg>
	);
};

const HomePage = () => {
	const navigate = useNavigate();
	const { lastVisited, markVisited, isCompleted, isVisited, overall } =
		useProgress();
	const { plan: srsPlan } = useSrs();
	const { todayCount, currentStreak, daysUntilExam } = useActivity();
	const pageRef = useRef(null);
	const nodeRefs = useRef([]);

	const allComplete = overall.allComplete;
	const started = overall.visited > 0;

	// Spaced-repetition: how many cards are due (or newly eligible) right now.
	// Closer to the exam ⇒ a larger new-card budget.
	const isNewEligible = useCallback(
		entry => isVisited(entry.topicId),
		[isVisited]
	);
	const duePlan = useMemo(
		() =>
			srsPlan(REVIEW_BANK, {
				newCap: examNewCap(daysUntilExam),
				isNewEligible,
			}),
		[srsPlan, isNewEligible, daysUntilExam]
	);
	const dueTotal = duePlan.dueCount + duePlan.freshCount;
	// The daily ring's target escalates as the exam nears (mirrors the new-card
	// ramp above), so the goal and the schedule push together. Defaults to the
	// base goal when no exam date is set.
	const goal = useMemo(() => dailyGoal(daysUntilExam), [daysUntilExam]);
	// True when the deadline has pushed today's target above the resting goal —
	// drives one honest line of copy explaining why the bar is higher.
	const goalRaised = goal > dailyGoal(null);
	const goalDone = started && todayCount >= goal;

	const lastTopic = lastVisited ? TOPIC_BY_ID[lastVisited] : null;
	const nextTopic = useMemo(() => {
		if (allComplete) return null;
		// First not-yet-completed *built* topic in teaching order (skips locked
		// coming-soon placeholders).
		const firstOpen = BUILT_TOPICS.find(topic => !isCompleted(topic.id));
		return firstOpen || FIRST_TOPIC;
	}, [allComplete, isCompleted]);

	// The macro-arc: the curriculum's `phase` field, collapsed to the ordered set
	// of acts with each act's topic count and how many are finished. Drives both
	// the at-a-glance overview map (in the header) and the inline chapter markers
	// on the spine. Derived from the same single source of truth as the nodes.
	const phases = useMemo(() => {
		const order = [];
		const byName = new Map();
		CURRICULUM.forEach(topic => {
			let entry = byName.get(topic.phase);
			if (!entry) {
				entry = { name: topic.phase, total: 0, done: 0 };
				byName.set(topic.phase, entry);
				order.push(entry);
			}
			entry.total += 1;
			if (isCompleted(topic.id)) entry.done += 1;
		});
		return order.map((entry, i) => ({ ...entry, index: i }));
	}, [isCompleted]);

	const phaseIndexByName = useMemo(
		() => new Map(phases.map(p => [p.name, p])),
		[phases]
	);

	// Jump-scroll the page's own scroller to a chapter. Programmatic smooth scroll
	// is safe here (the spine's scrubbed comet just rides along) — unlike a global
	// CSS scroll-behavior, which would desync the scrub.
	const scrollToPhase = useCallback(name => {
		const el = document.getElementById(phaseSlug(name));
		if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}, []);

	const heroState = useMemo(() => {
		if (allComplete) {
			return {
				titleLines: ['Reviewing?'],
				subtitle: 'Every topic is complete. Start anywhere on the path.',
				ctaLabel: 'Open the path',
				ctaTopic: FIRST_TOPIC,
			};
		}
		if (lastTopic) {
			// Resume where you actually stopped — the CTA reopens the last topic and
			// the scrolly drops you back at the furthest scene you reached. (Jumping
			// ahead to the next topic stays one click away via the path map below.)
			return {
				titleLines: ['Welcome back.'],
				subtitle: `Pick up ${lastTopic.name.toLowerCase()} right where you left off, or jump ahead on the path.`,
				ctaLabel: `Resume ${lastTopic.name.toLowerCase()}`,
				ctaTopic: lastTopic,
			};
		}
		return {
			titleLines: ['One dataset.', 'Every structure.'],
			subtitle:
				'Fourteen values, read as an array, a tree, a heap, and a graph — a guided, interactive path through all of TDT4120, built to make the why click, not just the what.',
			ctaLabel: `Begin with ${FIRST_TOPIC.name.toLowerCase()}`,
			ctaTopic: FIRST_TOPIC,
		};
	}, [allComplete, lastTopic]);

	const visit = topic => {
		markVisited(topic.id);
		navigate(topic.to);
	};

	// Scroll choreography. The whole sequence is gated behind
	// `prefers-reduced-motion: no-preference`, so reduced-motion (and no-JS)
	// users get the fully drawn rail and visible nodes from the CSS defaults —
	// nothing here strips a lesson, it only adds flow on top of a static page.
	useLayoutEffect(() => {
		const pageEl = pageRef.current;
		if (!pageEl) return undefined;

		const ctx = gsap.context(() => {
			const mm = gsap.matchMedia();
			mm.add('(prefers-reduced-motion: no-preference)', () => {
				const q = sel => pageEl.querySelector(sel);

				// ---- Hero entrance: the instrument inks in first, then the headline
				// sets. The lamp warms on underneath, an inked rule draws in under the
				// eyebrow, and the reading column cascades in after the headline. ----
				const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
				const lampEl = q('[data-hero-lamp]');
				const eyebrowEl = q('[data-hero-eyebrow]');
				const ruleEl = q('[data-hero-rule]');
				const titleLineEls = pageEl.querySelectorAll('[data-hero-title-line]');
				const subEl = q('[data-hero-sub]');
				const actionEls = pageEl.querySelectorAll('[data-hero-actions] > *');
				const progressEl = q('[data-hero-progress]');
				const instrumentEl = q('[data-hero-instrument]');

				// The lamp warms on: a soft, slightly oversized glow easing down into
				// place, like a desk lamp reaching temperature. Opacity + scale only,
				// so it stays cheap to composite.
				if (lampEl)
					heroTl.from(
						lampEl,
						{ autoAlpha: 0, scale: 1.14, duration: 1.7, ease: 'sine.out' },
						0
					);
				// The instrument leads — its plate settles in on the first beat, so the
				// figure is present (already at the array) before the words land.
				if (instrumentEl)
					heroTl.from(
						instrumentEl,
						{ autoAlpha: 0, scale: 0.98, duration: 0.85, ease: 'power2.out' },
						0
					);
				if (eyebrowEl)
					heroTl.from(eyebrowEl, { y: 14, opacity: 0, duration: 0.55 }, 0.12);
				// A hairline rule draws itself in under the eyebrow (scaleX from the
				// left), echoing the inked spine so the hero speaks the same language.
				if (ruleEl)
					heroTl.from(
						ruleEl,
						{
							scaleX: 0,
							transformOrigin: 'left center',
							duration: 0.7,
							ease: 'power2.out',
						},
						0.24
					);
				// The headline is the payoff beat, landing once the instrument has
				// begun forming. Each clause sets UP out of its own clipping mask with
				// no opacity (the mask already hides it below the line), so it reads as
				// type being set, not a fade. power4.out plus a touch more travel give
				// the decisive, confident landing.
				if (titleLineEls.length)
					heroTl.from(
						titleLineEls,
						{
							yPercent: 120,
							duration: 0.95,
							stagger: 0.1,
							ease: 'power4.out',
						},
						0.3
					);
				if (subEl)
					heroTl.from(subEl, { y: 18, opacity: 0, duration: 0.7 }, 0.5);
				if (actionEls.length)
					heroTl.from(
						actionEls,
						{ y: 14, opacity: 0, duration: 0.6, stagger: 0.09 },
						0.6
					);
				if (progressEl)
					heroTl.from(progressEl, { y: 12, opacity: 0, duration: 0.6 }, 0.7);

				// ---- Hero lamp drifts down a touch as you scroll past it ----
				const heroEl = q('[data-hero]');
				if (lampEl && heroEl)
					gsap.to(lampEl, {
						yPercent: 16,
						ease: 'none',
						scrollTrigger: {
							trigger: heroEl,
							scroller: pageEl,
							start: 'top top',
							end: 'bottom top',
							scrub: true,
						},
					});

				// ---- The spine is inked from the top down as you scroll ----
				// A faint BASE path stays solid (CSS) as the no-JS / reduced-motion
				// rail; the lit INK path draws 0%->100% on this scrubbed
				// ScrollTrigger, and the comet rides the literal ink tip via
				// MotionPath, so position-on-spine reads as progress honestly.
				const railEl = q('[data-rail]');
				const baseEl = q('[data-rail-base]');
				const fillEl = q('[data-rail-fill]');
				const headEl = q('[data-rail-head]');
				const glowEl = q('[data-rail-glow]');
				const spineEl = q('[data-spine]');

				// Seat each station on the sine at its own vertical fraction so the rail
				// threads through every stop. offsetTop (layout, transform-free) stays
				// correct even while nodes sit pre-reveal at opacity 0 / y:30.
				const offsetWithin = (el, stop) => {
					let t = 0;
					let n = el;
					while (n && n !== stop) {
						t += n.offsetTop;
						n = n.offsetParent;
					}
					return t;
				};
				const placeStations = () => {
					if (!railEl || !spineEl) return;
					// railEl is an <svg> (no offsetTop); its top inset is the CSS 22px and
					// its height is the spine minus the 22px top + 22px bottom insets.
					const railTop = 22;
					const railH = spineEl.offsetHeight - 44;
					if (railH <= 0) return;
					pageEl.querySelectorAll('[data-station]').forEach(st => {
						const cy = offsetWithin(st, spineEl) + st.offsetHeight / 2;
						const off = railWaveX((cy - railTop) / railH);
						gsap.set(
							st,
							st.dataset.station === 'diamond'
								? { x: off, rotation: 45 }
								: { x: off }
						);
					});
				};

				if (railEl && fillEl && spineEl) {
					// JS takes over: swap the straight fallback for the drawn serpentine.
					gsap.set([baseEl, fillEl].filter(Boolean), {
						attr: { d: RAIL_PATH },
					});
					gsap.set([headEl, glowEl].filter(Boolean), { opacity: 1 });
					// The base reads as the full filament from the first frame.
					if (baseEl) gsap.set(baseEl, { drawSVG: '100%' });
					placeStations();
					const railTl = gsap.timeline({
						scrollTrigger: {
							trigger: spineEl,
							scroller: pageEl,
							start: 'top 72%',
							// Re-seat the dots whenever ScrollTrigger re-measures (resize / fonts).
							onRefresh: placeStations,
							end: 'bottom 60%',
							// Lock the ink to the scroll position. scrub: true tracks the
							// reader 1:1 with no catch-up; 0.6 then 0.2 still read as the
							// line trailing behind, so exact tracking is what feels right.
							scrub: true,
						},
					});
					// The real technique: a hairline stroke inks on. No traveling
					// gradient pulse (that would tip into 'loading bar').
					railTl.fromTo(
						fillEl,
						{ drawSVG: '0%' },
						{ drawSVG: '100%', ease: 'none' },
						0
					);
					// The comet rides the literal ink tip. The spine is a straight
					// vertical line, so a direct y-translate (0 → the line's pixel
					// height) tracks the tip exactly and at the SCROLL's rate. The old
					// MotionPath sampled the path in its 1000-unit viewBox space, which
					// under preserveAspectRatio="none" mis-mapped to the stretched height
					// and crawled behind the reader. (44 = the 22px top+bottom insets.)
					// The comet rides the ink tip ALONG the curve: y tracks the scroll, x follows
					// the same sine the path + dots use, so it stays on the rail (a straight
					// y-translate would cut across the bends).
					if (headEl) {
						const head = { f: 0 };
						railTl.fromTo(
							head,
							{ f: 0 },
							{
								f: 1,
								ease: 'none',
								onUpdate: () =>
									gsap.set(headEl, {
										y: head.f * (spineEl.offsetHeight - 44),
										x: railWaveX(head.f),
									}),
							},
							0
						);
					}
					if (glowEl)
						railTl.fromTo(
							glowEl,
							{ y: () => -spineEl.offsetHeight * 0.1 },
							{ y: () => spineEl.offsetHeight * 0.9, ease: 'none' },
							0
						);
				}

				// ---- Each station rises and ignites as the line reaches it ----
				const nodes = gsap.utils.toArray('[data-node]');
				if (nodes.length) {
					gsap.set(nodes, { opacity: 0, y: 30 });
					const revealed = new WeakSet();
					// Mirrors `revealed`: guards the one-shot check ink so a finished
					// node's tick strokes on exactly once, the first time it enters.
					const inked = new WeakSet();
					ScrollTrigger.batch(nodes, {
						scroller: pageEl,
						start: 'top 90%',
						onEnter: batch => {
							const fresh = batch.filter(n => !revealed.has(n));
							if (!fresh.length) return;
							fresh.forEach(n => revealed.add(n));
							gsap.to(fresh, {
								opacity: 1,
								y: 0,
								duration: 0.8,
								ease: 'power3.out',
								stagger: 0.12,
								overwrite: true,
							});
							fresh.forEach((node, i) => {
								const dot = node.querySelector('[data-dot]');
								const check = node.querySelector('[data-check]');
								if (dot)
									gsap.fromTo(
										dot,
										{ scale: 0.68 },
										{
											scale: 1,
											duration: 0.7,
											ease: 'power3.out',
											delay: i * 0.12,
										}
									);
								// A completed station's tick inks on once (meaning: done), in
								// place of the old meaning-free spark ping.
								if (check && !inked.has(node)) {
									inked.add(node);
									gsap.fromTo(
										check,
										{ drawSVG: '0%' },
										{
											drawSVG: '100%',
											duration: 0.3,
											ease: 'power2.out',
											delay: i * 0.12 + 0.18,
										}
									);
								}
							});
						},
					});
				}
			});
		}, pageEl);

		// Positions depend on web-font metrics and the route mount transition;
		// recompute once both have settled.
		const raf = requestAnimationFrame(() => ScrollTrigger.refresh());
		if (document.fonts && document.fonts.ready) {
			document.fonts.ready.then(() => ScrollTrigger.refresh());
		}

		return () => {
			cancelAnimationFrame(raf);
			ctx.revert();
		};
	}, []);

	const onKeyNavigate = (event, idx) => {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			const next = nodeRefs.current[idx + 1];
			if (next) next.focus();
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			const prev = nodeRefs.current[idx - 1];
			if (prev) prev.focus();
		}
	};

	return (
		<div className={styles.page} ref={pageRef}>
			<section
				className={styles.hero}
				aria-labelledby="home-hero-title"
				data-hero
			>
				<div className={styles.lamp} aria-hidden="true" data-hero-lamp />
				<div className={styles.heroInner}>
					<div className={styles.eyebrowGroup}>
						<p className={styles.eyebrow} data-hero-eyebrow>
							AlgDatViz · TDT4120
						</p>
						<span
							className={styles.eyebrowRule}
							aria-hidden="true"
							data-hero-rule
						/>
					</div>
					<h1 id="home-hero-title" className={styles.heroTitle}>
						{heroState.titleLines.map((line, i) => (
							<span key={i} className={styles.heroTitleMask}>
								<span className={styles.heroTitleLine} data-hero-title-line>
									{line}
								</span>
							</span>
						))}
					</h1>
					<p className={styles.heroSubtitle} data-hero-sub>
						{heroState.subtitle}
					</p>
					<div className={styles.today} data-hero-actions>
						<div className={styles.todayTop}>
							<span className={styles.todayLabel}>
								{started ? 'Today' : 'Start here'}
							</span>
							{currentStreak > 0 && (
								<span className={styles.streak}>
									<Flame size={13} strokeWidth={2.4} aria-hidden="true" />
									{currentStreak}-day streak
								</span>
							)}
							{daysUntilExam != null && daysUntilExam >= 0 && (
								<Link to="/progress" className={styles.examChip}>
									Exam in {daysUntilExam}d
								</Link>
							)}
						</div>

						<div className={styles.todayActions}>
							<button
								type="button"
								className={styles.primaryCta}
								onClick={() => visit(heroState.ctaTopic)}
							>
								<span>{heroState.ctaLabel}</span>
								<ArrowRight size={16} strokeWidth={2} />
							</button>
							{started && dueTotal > 0 && (
								<Link
									to="/review"
									className={styles.reviewCta}
									aria-label={`Review ${dueTotal} due — spaced retrieval`}
								>
									<Clock size={14} strokeWidth={2.2} aria-hidden="true" />
									<span>
										Review <strong>{dueTotal}</strong> due
									</span>
								</Link>
							)}
						</div>

						{started && (
							<div className={styles.todayGoal}>
								<GoalRing value={todayCount} goal={goal} done={goalDone} />
								<div className={styles.goalText}>
									{goalDone ? (
										<>
											<span className={styles.goalHead}>Done for today</span>
											<span className={styles.goalSub}>
												{todayCount} answered · streak safe
											</span>
										</>
									) : (
										<>
											<span className={styles.goalHead}>
												{todayCount} / {goal} answered today
											</span>
											<span className={styles.goalSub}>
												{goalRaised
													? `Goal raised — exam in ${daysUntilExam}d`
													: `${overall.completed} of ${overall.total} topics complete`}
											</span>
										</>
									)}
								</div>
								<Link to="/progress" className={styles.progressLink}>
									Progress
									<ArrowRight size={13} strokeWidth={2} aria-hidden="true" />
								</Link>
							</div>
						)}
					</div>
				</div>
				<HeroInstrument />
			</section>

			<TopicFinder markVisited={markVisited} />

			<section className={styles.pathSection} aria-labelledby="path-heading">
				<header className={styles.pathHeader}>
					<p className={styles.label}>Your path</p>
					<h2 id="path-heading" className={styles.pathHeading}>
						{allComplete
							? `All ${overall.total} topics behind you — revisit anything below.`
							: overall.completed > 0
								? `${overall.completed} of ${overall.total} done — next up, ${nextTopic.name.toLowerCase()}.`
								: `Your route through all ${overall.total} topics of TDT4120.`}
					</h2>

					{/* Personal progress roadmap: one segment per phase, sized by its topic
					    count and filled by how much of it you've mastered, with a "you are
					    here" on the active phase and the exam as the finish line. The
					    segments double as jump links to each chapter on the spine. */}
					<div className={styles.roadmap}>
						<ol className={styles.roadmapTrack} aria-label="Progress by phase">
							{phases.map(phase => {
								const frac = phase.total ? phase.done / phase.total : 0;
								const done = phase.done === phase.total;
								const current = !allComplete && phase.name === nextTopic?.phase;
								return (
									<li
										key={phase.name}
										className={styles.seg}
										style={{ flexGrow: phase.total }}
										data-done={done || undefined}
										data-current={current || undefined}
									>
										<button
											type="button"
											className={styles.segBtn}
											onClick={() => scrollToPhase(phase.name)}
											title={`${phase.name} — ${phase.done} of ${phase.total} done`}
										>
											<span className={styles.segHead}>
												<span className={styles.segName}>{phase.name}</span>
												<span className={styles.segCount}>
													{phase.done}/{phase.total}
												</span>
											</span>
											<span className={styles.segBar}>
												<span
													className={styles.segFill}
													style={{ width: `${frac * 100}%` }}
												/>
											</span>
											{current && (
												<span className={styles.segHere}>you are here</span>
											)}
										</button>
									</li>
								);
							})}
							<li className={styles.segFinish}>
								<GraduationCap size={15} strokeWidth={2} aria-hidden="true" />
								<span>Exam</span>
							</li>
						</ol>
					</div>

					<p className={styles.pathMeta}>
						<span className={styles.pathMetaStrong}>
							{overall.completed}/{overall.total} mastered
						</span>
						{currentStreak > 0 && (
							<span className={styles.pathMetaItem}>
								<Flame size={12} strokeWidth={2.4} aria-hidden="true" />
								{currentStreak}-day streak
							</span>
						)}
						{daysUntilExam != null && daysUntilExam >= 0 && (
							<span className={styles.pathMetaItem}>
								Exam in {daysUntilExam} days
								{overall.completed < overall.total &&
									` · ${overall.total - overall.completed} to go`}
							</span>
						)}
						{started && dueTotal > 0 && (
							<Link to="/review" className={styles.pathMetaLink}>
								<Clock size={12} strokeWidth={2.2} aria-hidden="true" />
								{dueTotal} due to review
							</Link>
						)}
					</p>
				</header>

				<div className={styles.spineWrap} data-spine>
					<div className={styles.glow} aria-hidden="true" data-rail-glow />
					{/* The spine is a real inked stroke. Two stacked paths share one
					    vertical 'd': a faint BASE that is always solid (this is the
					    no-JS / reduced-motion rail), and a lit INK path the scroll
					    ScrollTrigger draws 0%→100% from the top down. The 10px comet
					    rides the literal ink tip via MotionPath, so its position on the
					    spine equals the reader's progress through the curriculum. */}
					<svg
						className={styles.rail}
						aria-hidden="true"
						data-rail
						viewBox={`0 0 ${RAIL_W} 1000`}
						preserveAspectRatio="none"
					>
						<defs>
							{/* Vertical fades match the old rail's softened ends. Stroked in
							    user space (y 0..1000) so preserveAspectRatio="none" only
							    distorts x, which a vertical line never uses. */}
							<linearGradient
								id="homeRailBase"
								x1="0"
								y1="0"
								x2="0"
								y2="1000"
								gradientUnits="userSpaceOnUse"
							>
								<stop
									offset="0"
									stopColor="var(--color-border)"
									stopOpacity="0"
								/>
								<stop offset="0.05" stopColor="var(--color-border)" />
								<stop offset="0.95" stopColor="var(--color-border)" />
								<stop
									offset="1"
									stopColor="var(--color-border)"
									stopOpacity="0"
								/>
							</linearGradient>
							<linearGradient
								id="homeRailInk"
								x1="0"
								y1="0"
								x2="0"
								y2="1000"
								gradientUnits="userSpaceOnUse"
							>
								<stop
									offset="0"
									stopColor="hsl(var(--brand-h) var(--brand-s) var(--brand-l) / 0.7)"
								/>
								<stop
									offset="1"
									stopColor="hsl(var(--brand-h) var(--brand-s) var(--brand-l))"
								/>
							</linearGradient>
						</defs>
						{/* No non-scaling-stroke here: with preserveAspectRatio="none" the
						    y-scale drives the dash lengths so drawSVG maps to the box
						    height, while the x-scale (box width == viewBox width, so 1)
						    keeps the stroke a crisp ~2px and the wave's amplitude honest.
						    The static `d` is the straight centreline (the no-JS /
						    reduced-motion rail); the motion layer swaps in the serpentine. */}
						<path
							className={styles.railBase}
							data-rail-base
							d={RAIL_STRAIGHT}
						/>
						<path
							className={styles.railFill}
							data-rail-fill
							d={RAIL_STRAIGHT}
						/>
					</svg>
					<span className={styles.railHead} aria-hidden="true" data-rail-head />

					<ol className={styles.spine} aria-label="Learning path">
						{CURRICULUM.map((topic, idx) => {
							// At each phase boundary, emit a chapter marker before the topic
							// so the spine reads as five labelled acts.
							const showPhase =
								idx === 0 || CURRICULUM[idx - 1].phase !== topic.phase;
							const phaseMeta = phaseIndexByName.get(topic.phase);
							const phaseHeader = showPhase ? (
								<li
									id={phaseSlug(topic.phase)}
									className={styles.phaseRow}
									data-done={phaseMeta.done === phaseMeta.total}
								>
									<div className={styles.phaseMarker} aria-hidden="true">
										<span
											className={styles.phaseDiamond}
											data-station="diamond"
										/>
									</div>
									<div className={styles.phaseLabel}>
										<span className={styles.phaseKicker}>
											Phase {PHASE_NUMERALS[phaseMeta.index]}
										</span>
										<h3 className={styles.phaseTitle}>{topic.phase}</h3>
									</div>
									<span className={styles.phaseCount}>
										{phaseMeta.done > 0
											? `${phaseMeta.done} / ${phaseMeta.total} done`
											: `${phaseMeta.total} topics`}
									</span>
								</li>
							) : null;

							// Coming-soon: a clearly-labelled, non-navigable, muted node.
							if (topic.status === 'soon') {
								return (
									<Fragment key={topic.id}>
										{phaseHeader}
										<li
											data-idx={idx}
											data-node
											ref={node => {
												nodeRefs.current[idx] = node;
											}}
											tabIndex={-1}
											className={`${styles.node} ${styles.nodeSoon}`}
											style={{ '--accent': topic.accent }}
										>
											<div className={styles.nodeMarker} aria-hidden="true">
												<span className={styles.nodeDot} data-dot data-station>
													<span className={styles.nodeDotInner} />
												</span>
											</div>
											<div
												className={styles.nodeBody}
												aria-label={`${topic.name} — coming soon`}
											>
												<div className={styles.nodeHead}>
													<span className={styles.nodeNumber}>
														{topic.number}
													</span>
													<span className={styles.nodeSoonBadge}>
														<Lock
															size={11}
															strokeWidth={2.4}
															aria-hidden="true"
														/>
														Coming soon
													</span>
												</div>
												<h4 className={styles.nodeName}>{topic.name}</h4>
												<p className={styles.nodeQuote}>{topic.pullQuote}</p>
												<div className={styles.nodeFoot}>
													<span className={styles.nodeComplexity}>
														{topic.complexity}
													</span>
												</div>
											</div>
										</li>
									</Fragment>
								);
							}

							const completed = isCompleted(topic.id);
							const visited = !completed && isVisited(topic.id);
							const isNext = !completed && topic.id === nextTopic?.id;
							const Preview = PREVIEW_BY_ID[topic.id];
							const statusText = completed
								? 'Completed'
								: isNext
									? 'Next up'
									: visited
										? 'In progress'
										: '';
							return (
								<Fragment key={topic.id}>
									{phaseHeader}
									<li
										data-idx={idx}
										data-node
										ref={node => {
											nodeRefs.current[idx] = node;
										}}
										tabIndex={-1}
										className={`${styles.node} ${
											completed ? styles.nodeComplete : ''
										} ${visited ? styles.nodeVisited : ''} ${
											isNext ? styles.nodeNext : ''
										}`}
										style={{
											'--accent': topic.accent,
											'--accent-contrast': `var(--topic-${topic.id}-contrast)`,
										}}
									>
										<div className={styles.nodeMarker} aria-hidden="true">
											<span className={styles.nodeDot} data-dot data-station>
												{completed ? (
													<svg
														className={styles.nodeCheck}
														viewBox="12 12 16 16"
														fill="none"
													>
														<path
															className={styles.nodeCheckPath}
															data-check
															d={NODE_CHECK_D}
															pathLength="1"
															vectorEffect="non-scaling-stroke"
														/>
													</svg>
												) : (
													<span className={styles.nodeDotInner} />
												)}
												{/* Inside the dot so it inherits the dot's serpentine x-nudge
												    (placeStations) — otherwise it floats at the gutter centre. */}
												{isNext && <span className={styles.nodeRing} />}
											</span>
										</div>

										<button
											type="button"
											className={styles.nodeBody}
											onClick={() => visit(topic)}
											onKeyDown={event => onKeyNavigate(event, idx)}
											aria-describedby={`node-quote-${topic.id}`}
										>
											<div className={styles.nodeHead}>
												<span className={styles.nodeNumber}>
													{topic.number}
												</span>
												{statusText && (
													<span className={styles.nodeStatus}>
														{statusText}
													</span>
												)}
											</div>
											<h4 className={styles.nodeName}>{topic.name}</h4>
											<p
												id={`node-quote-${topic.id}`}
												className={styles.nodeQuote}
											>
												{topic.pullQuote}
											</p>
											<div className={styles.nodeFoot}>
												<span className={styles.nodeComplexity}>
													{topic.complexity}
												</span>
												<span className={styles.nodeArrow} aria-hidden="true">
													Open
													<ArrowRight size={13} strokeWidth={2} />
												</span>
											</div>
										</button>

										{Preview && (
											<div className={styles.nodePreview} aria-hidden="true">
												<Preview />
											</div>
										)}
									</li>
								</Fragment>
							);
						})}
						<li className={styles.examStop}>
							<div className={styles.examMarker} aria-hidden="true">
								<span className={styles.examDot} data-station>
									<GraduationCap size={14} strokeWidth={2.2} />
								</span>
							</div>
							<div className={styles.examLabel}>
								<span className={styles.examKicker}>The finish line</span>
								<span className={styles.examName}>Exam</span>
							</div>
							<span className={styles.examMeta}>
								{daysUntilExam != null && daysUntilExam >= 0
									? `in ${daysUntilExam} days`
									: 'when you’re ready'}
							</span>
						</li>
					</ol>
				</div>

				<footer className={styles.pathFooter}>
					<p>
						The path is a guide, not a gate. Skip ahead, return, replay — every
						topic stays open.
					</p>
					{!allComplete && nextTopic && (
						<Link
							className={styles.footerLink}
							to={nextTopic.to}
							onClick={() => markVisited(nextTopic.id)}
						>
							Begin with {nextTopic.name.toLowerCase()}
							<ArrowRight size={13} strokeWidth={2} />
						</Link>
					)}
					<Link className={styles.footerLink} to="/review">
						Test yourself — cumulative review
						<ArrowRight size={13} strokeWidth={2} />
					</Link>
				</footer>
			</section>
		</div>
	);
};

export default HomePage;
