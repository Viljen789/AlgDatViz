import { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, Flame, RotateCcw } from 'lucide-react';
import { BUILT_TOPICS, FIRST_TOPIC } from '../data/curriculum.js';
import { REVIEW_BANK } from '../components/Review/reviewBank.js';
import { allMastery } from '../lib/mastery.js';
import { addDays, todayKey } from '../lib/activityLog.js';
import useProgress from '../hooks/useProgress.js';
import useSrs from '../hooks/useSrs.js';
import useActivity from '../hooks/useActivity.js';
import styles from './ProgressPage.module.css';

const HEAT_WEEKS = 13;
const pct = s => Math.round(s * 100);

// The heatmap colour ramp, brightest at the right: empty, then three brand-tinted
// steps. The legend and every day-cell read from this one array so "Less → More"
// always matches the squares above it. Both themes inherit the brand hue.
const HEAT_RAMP = [
	'var(--color-border-subtle)',
	'hsl(var(--brand-h) var(--brand-s) var(--brand-l) / 0.3)',
	'hsl(var(--brand-h) var(--brand-s) var(--brand-l) / 0.6)',
	'hsl(var(--brand-h) var(--brand-s) var(--brand-l) / 0.95)',
];

// One day's count → its ramp colour (0 answered → empty; thresholds at 3 and 6).
const heat = c => HEAT_RAMP[c <= 0 ? 0 : c < 3 ? 1 : c < 6 ? 2 : 3];

// Month labels keyed to the first week-column that begins in each month, so the
// strip above the heatmap reads like a calendar without one label per week.
const MONTHS = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec',
];

/**
 * ProgressPage (/progress) — the mastery dashboard.
 *
 * Turns the data the app already collects (correct checks + SRS cards + the new
 * activity log) into the diagnostic that actually matters for exam prep: which
 * topics have decayed, how the streak is doing, and how long until the exam.
 */
const ProgressPage = () => {
	const { checks, isCompleted, isVisited, overall, reset: resetProgress } =
		useProgress();
	const { cards, reset: resetSrs } = useSrs();
	const {
		days,
		examDate,
		currentStreak,
		longestStreak,
		daysUntilExam,
		setExamDate,
		reset: resetActivity,
	} = useActivity();

	const mastery = useMemo(
		() => allMastery({ bank: REVIEW_BANK, checks, cards }),
		[checks, cards]
	);

	const topics = useMemo(
		() =>
			BUILT_TOPICS.map(t => {
				const m = mastery[t.id];
				const completed = isCompleted(t.id);
				const score = m
					? m.score
					: completed
						? 1
						: isVisited(t.id)
							? 0.3
							: 0;
				return {
					...t,
					score,
					answered: m?.answered ?? 0,
					total: m?.total ?? 0,
					hasData: m?.hasData ?? false,
				};
			}),
		[mastery, isCompleted, isVisited]
	);

	const weak = useMemo(
		() =>
			topics
				.filter(t => t.hasData && t.score < 0.6)
				.sort((a, b) => a.score - b.score)
				.slice(0, 4),
		[topics]
	);

	// "Touched" = the student has answered a check or finished the topic. We sort
	// the grid by mastery ascending so the cards that need work float to the top
	// (the grid becomes a prioritization map, not 15 identical tiles); untouched
	// topics, which all sit at 0, keep their teaching order beneath the rest.
	// Anything with any progress (a visited 0.3, a completed 1, or real check data)
	// counts as touched, so a card that shows a bar also floats above the 0% cards
	// and wears the active style — bar, prominence, and order stay consistent.
	const isTouched = useCallback(t => t.hasData || t.score > 0, []);

	const orderedTopics = useMemo(
		() =>
			[...topics].sort((a, b) => {
				const ta = isTouched(a);
				const tb = isTouched(b);
				if (ta !== tb) return ta ? -1 : 1; // touched first
				if (ta) return a.score - b.score; // weakest of the touched first
				return 0; // untouched keep teaching order (stable sort)
			}),
		[topics, isTouched]
	);

	const today = todayKey();
	const weeks = useMemo(() => {
		const dow = new Date(`${today}T00:00:00`).getDay();
		const start = addDays(today, -(dow + (HEAT_WEEKS - 1) * 7));
		return Array.from({ length: HEAT_WEEKS }, (_, w) =>
			Array.from({ length: 7 }, (_, d) => {
				const k = addDays(start, w * 7 + d);
				return { k, count: days[k] || 0, future: k > today };
			})
		);
	}, [days, today]);

	const daysStudied = Object.keys(days).length;

	// A label for each week-column that opens a new month (blank otherwise), so the
	// strip above the heatmap reads as a calendar without crowding every week.
	const monthLabels = useMemo(
		() =>
			weeks.map((col, w) => {
				const first = col.find(cell => !cell.future) ?? col[0];
				const month = new Date(`${first.k}T00:00:00`).getMonth();
				const prev =
					w === 0
						? null
						: new Date(
								`${(weeks[w - 1].find(c => !c.future) ?? weeks[w - 1][0]).k}T00:00:00`
							).getMonth();
				return month !== prev ? MONTHS[month] : '';
			}),
		[weeks]
	);

	// First-run: nothing answered and nothing finished. Drives the guidance card,
	// the "Start here" tag, and the empty heatmap caption.
	const hasNoActivity = daysStudied === 0 && overall.completed === 0;

	const handleReset = useCallback(() => {
		if (
			window.confirm(
				'Reset all progress, the review schedule, and your study history? This cannot be undone.'
			)
		) {
			resetProgress();
			resetSrs();
			resetActivity();
		}
	}, [resetProgress, resetSrs, resetActivity]);

	return (
		<div className={styles.page}>
			<header className={styles.topBar}>
				<nav className={styles.crumbs} aria-label="Breadcrumb">
					<Link to="/" className={styles.crumbLink}>
						Path
					</Link>
					<ChevronRight size={12} strokeWidth={2} aria-hidden="true" />
					<span className={styles.crumbCurrent}>Progress</span>
				</nav>
			</header>

			<section className={styles.hero} aria-labelledby="progress-title">
				<p className={styles.eyebrow}>Mastery · Spaced retrieval</p>
				<h1 id="progress-title" className={styles.title}>
					Where you stand.
				</h1>

				<dl className={styles.stats}>
					<div className={styles.stat}>
						<dt className={styles.statLabel}>Streak</dt>
						<dd className={styles.statValue}>
							<Flame size={18} strokeWidth={2.2} aria-hidden="true" />
							{currentStreak}
						</dd>
						<p className={styles.statSub}>longest {longestStreak}</p>
					</div>
					<div className={styles.stat}>
						<dt className={styles.statLabel}>Days studied</dt>
						<dd className={styles.statValue}>{daysStudied}</dd>
					</div>
					<div className={styles.stat}>
						<dt className={styles.statLabel}>Topics complete</dt>
						<dd className={styles.statValue}>
							{overall.completed}
							<span className={styles.statOf}>/{overall.total}</span>
						</dd>
						<p className={styles.statSub}>curriculum topics</p>
					</div>
					<div className={`${styles.stat} ${styles.statExam}`}>
						<dt className={styles.statLabel}>Exam</dt>
						{daysUntilExam != null && daysUntilExam >= 0 ? (
							<dd className={styles.statValue}>
								{daysUntilExam}
								<span className={styles.statOf}>days</span>
							</dd>
						) : (
							<dd className={styles.statValueMuted}>not set</dd>
						)}
						<label className={styles.examInput}>
							<span className={styles.srOnly}>Exam date</span>
							<input
								type="date"
								value={examDate || ''}
								min={today}
								onChange={e => setExamDate(e.target.value)}
							/>
						</label>
					</div>
				</dl>
			</section>

			<section className={styles.block} aria-labelledby="heatmap-title">
				<h2 id="heatmap-title" className={styles.blockTitle}>
					Activity
				</h2>
				<div className={styles.heatScroll}>
					<div className={styles.heatMonths} aria-hidden="true">
						{monthLabels.map((label, w) => (
							<span key={w} className={styles.heatMonth}>
								{label}
							</span>
						))}
					</div>
					<div
						className={styles.heatmap}
						role="img"
						aria-label={`${daysStudied} days studied`}
					>
						{weeks.map((col, w) => (
							<div key={w} className={styles.heatCol}>
								{col.map(cell => (
									<span
										key={cell.k}
										className={styles.heatCell}
										title={`${cell.k}: ${cell.count} answered`}
										style={{
											background: cell.future ? 'transparent' : heat(cell.count),
											opacity: cell.future ? 0 : 1,
										}}
									/>
								))}
							</div>
						))}
					</div>
				</div>
				<div className={styles.heatLegend} aria-hidden="true">
					<span className={styles.heatLegendLabel}>Less</span>
					{HEAT_RAMP.map((swatch, i) => (
						<span
							key={i}
							className={styles.heatLegendSwatch}
							style={{ background: swatch }}
						/>
					))}
					<span className={styles.heatLegendLabel}>More</span>
				</div>
				{hasNoActivity && (
					<p className={styles.heatCaption}>
						No study days logged yet. Each square is a day; answer a review or a
						topic check to light one up.
					</p>
				)}
			</section>

			{weak.length > 0 && (
				<section className={styles.block} aria-labelledby="weak-title">
					<h2 id="weak-title" className={styles.blockTitle}>
						Shore these up
					</h2>
					<p className={styles.blockLede}>
						Your weakest topics by recall, worth a pass before the exam.
					</p>
					<ul className={styles.weakList}>
						{weak.map(t => (
							<li key={t.id}>
								<Link
									to={t.to}
									className={styles.weakRow}
									style={{ '--accent': t.accent }}
								>
									<span className={styles.weakNum}>{t.number}</span>
									<span className={styles.weakName}>{t.name}</span>
									<span className={styles.weakBar}>
										<span
											className={styles.weakFill}
											style={{ width: `${pct(t.score)}%` }}
										/>
									</span>
									<span className={styles.weakPct}>{pct(t.score)}%</span>
									<ArrowRight size={14} strokeWidth={2.2} aria-hidden="true" />
								</Link>
							</li>
						))}
					</ul>
				</section>
			)}

			<section className={styles.block} aria-labelledby="topics-title">
				<h2 id="topics-title" className={styles.blockTitle}>
					All topics
				</h2>

				{hasNoActivity && (
					<div className={styles.firstRun}>
						<p className={styles.firstRunText}>
							Nothing tracked yet. Open a topic to start.
						</p>
						<Link
							to={FIRST_TOPIC.to}
							className={styles.firstRunLink}
							style={{ '--accent': FIRST_TOPIC.accent }}
						>
							<span>Start with {FIRST_TOPIC.name}</span>
							<ArrowRight size={14} strokeWidth={2.2} aria-hidden="true" />
						</Link>
					</div>
				)}

				<ul className={styles.grid}>
					{orderedTopics.map(t => {
						const touched = isTouched(t);
						// Topic 01 carries a quiet "Start here" tag until the student has
						// touched anything, so a blank dashboard names its own first move.
						const startHere = hasNoActivity && t.id === FIRST_TOPIC.id;
						return (
							<li key={t.id}>
								<Link
									to={t.to}
									className={`${styles.card} ${touched ? '' : styles.cardIdle}`}
									style={{ '--accent': t.accent }}
								>
									<div className={styles.cardHead}>
										<span className={styles.cardNum}>{t.number}</span>
										{startHere ? (
											<span className={styles.cardStart}>Start here</span>
										) : (
											<span className={styles.cardPct}>{pct(t.score)}%</span>
										)}
									</div>
									<span className={styles.cardName}>{t.name}</span>
									{/* The progress track only appears once a topic has data; an
									    empty rail on every untouched card was just noise. */}
									{touched && (
										<span className={styles.cardBar}>
											<span
												className={styles.cardFill}
												style={{ width: `${pct(t.score)}%` }}
											/>
										</span>
									)}
									<span className={styles.cardMeta}>
										{t.hasData
											? `${t.answered}/${t.total} checks`
											: isCompleted(t.id)
												? 'completed'
												: 'not started'}
									</span>
								</Link>
							</li>
						);
					})}
				</ul>
			</section>

			<footer className={styles.footer}>
				<button type="button" className={styles.resetBtn} onClick={handleReset}>
					<RotateCcw size={14} strokeWidth={2} aria-hidden="true" />
					<span>Reset all progress</span>
				</button>
			</footer>
		</div>
	);
};

export default ProgressPage;
