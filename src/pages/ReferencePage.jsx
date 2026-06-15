import { Link } from 'react-router-dom';
import { ArrowRight, Check, ChevronRight, X } from 'lucide-react';
import { accentTokens } from '../components/Review/reviewBank.js';
import {
	complexitySheet,
	sortComparison,
	decisionCards,
	greedyRule,
} from '../lib/referenceData.js';
import { TOPIC_BY_ID } from '../data/curriculum.js';
import styles from './ReferencePage.module.css';

/**
 * ReferencePage — the exam reference / cheat sheet (route /reference).
 *
 * The page a student opens the night before: one screen of the whole
 * curriculum's complexities, a side-by-side sort comparison, the "which
 * algorithm when" decision cards, and the greedy-optimal rule. Every cell is
 * DERIVED in src/lib/referenceData.js from the lessons' own data, so the sheet
 * can never drift from what the topics teach.
 *
 * Layout mirrors ExamPage / ProgressPage: the scrollable .page shell, a sticky
 * crumb bar, a hero, then token-built blocks. Yes/No in the sort table is a
 * glyph + text (color-blind safe, redundant by shape), never colour alone.
 */

// A small Yes / No cell: an icon AND a word, so the answer never relies on hue.
const YesNo = ({ value, yes = 'Yes', no = 'No' }) =>
	value ? (
		<span className={`${styles.flag} ${styles.flagYes}`}>
			<Check size={13} strokeWidth={2.6} aria-hidden="true" />
			{yes}
		</span>
	) : (
		<span className={`${styles.flag} ${styles.flagNo}`}>
			<X size={13} strokeWidth={2.6} aria-hidden="true" />
			{no}
		</span>
	);

// Resolve a topic's route from its id (decision cards + greedy items link out to
// the lesson). Falls back to the path home if an id is ever unmapped.
const topicRoute = topicId => TOPIC_BY_ID[topicId]?.to ?? '/';

const ReferencePage = () => {
	return (
		<div className={styles.page}>
			<header className={styles.topBar}>
				<nav className={styles.crumbs} aria-label="Breadcrumb">
					<Link to="/" className={styles.crumbLink}>
						Path
					</Link>
					<ChevronRight size={12} strokeWidth={2} aria-hidden="true" />
					<span className={styles.crumbCurrent}>Reference</span>
				</nav>
			</header>

			<section className={styles.hero} aria-labelledby="reference-title">
				<p className={styles.eyebrow}>Exam reference · Cheat sheet</p>
				<h1 id="reference-title" className={styles.title}>
					The night before, on one screen.
				</h1>
				<p className={styles.lede}>
					Every complexity, the sort comparison, and the decisions you have to
					make under pressure. Each value is pulled from the same lesson data
					the topics use, so this sheet says exactly what the algorithms do.
				</p>
			</section>

			{/* ---- Complexity at a glance ---- */}
			<section className={styles.block} aria-labelledby="complexity-heading">
				<h2 id="complexity-heading" className={styles.blockTitle}>
					Complexity at a glance
				</h2>
				<p className={styles.blockLede}>
					The headline cost for all fifteen topics, in teaching order.
				</p>
				<ul className={styles.complexityGrid}>
					{complexitySheet.map(row => {
						const tones = accentTokens(row.accent);
						return (
							<li
								key={row.id}
								className={styles.complexityCard}
								style={{
									'--q-accent': tones.accent,
									'--q-accent-ink': tones.ink,
								}}
							>
								<Link to={row.to} className={styles.complexityLink}>
									<span className={styles.complexityHead}>
										<span className={styles.complexityNum}>{row.number}</span>
										<span className={styles.complexityName}>{row.name}</span>
									</span>
									<code className={styles.complexityValue}>
										{row.complexity}
									</code>
								</Link>
							</li>
						);
					})}
				</ul>
			</section>

			{/* ---- Sort comparison ---- */}
			<section className={styles.block} aria-labelledby="sorts-heading">
				<h2 id="sorts-heading" className={styles.blockTitle}>
					Sorting, side by side
				</h2>
				<p className={styles.blockLede}>
					Best, average, and worst time, plus whether the sort is stable and in
					place.
				</p>
				<div className={styles.tableScroll}>
					<table className={styles.table}>
						<thead>
							<tr>
								<th scope="col" className={styles.thName}>
									Algorithm
								</th>
								<th scope="col">Best</th>
								<th scope="col">Average</th>
								<th scope="col">Worst</th>
								<th scope="col">Stable</th>
								<th scope="col">In place</th>
							</tr>
						</thead>
						<tbody>
							{sortComparison.map(row => (
								<tr key={row.id}>
									<th scope="row" className={styles.thName}>
										{row.name}
									</th>
									<td>
										<code className={styles.cellCode}>{row.best}</code>
									</td>
									<td>
										<code className={styles.cellCode}>{row.average}</code>
									</td>
									<td>
										<code className={styles.cellCode}>{row.worst}</code>
									</td>
									<td>
										<YesNo value={row.stable} />
									</td>
									<td>
										<YesNo value={row.inPlace} />
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>

			{/* ---- Decision cards ---- */}
			<section className={styles.block} aria-labelledby="decisions-heading">
				<h2 id="decisions-heading" className={styles.blockTitle}>
					Which algorithm when
				</h2>
				<p className={styles.blockLede}>
					The choice the exam asks you to make, and the property that decides
					it.
				</p>
				<ul className={styles.decisionGrid}>
					{decisionCards.map(card => {
						const accent = TOPIC_BY_ID[card.topicId]?.accent;
						const tones = accentTokens(accent);
						return (
							<li
								key={card.id}
								className={styles.decisionCard}
								style={{
									'--q-accent': tones.accent,
									'--q-accent-ink': tones.ink,
								}}
							>
								<div className={styles.decisionHead}>
									<Link
										to={topicRoute(card.topicId)}
										className={styles.decisionTitle}
									>
										{card.title}
										<ArrowRight
											size={13}
											strokeWidth={2.2}
											aria-hidden="true"
										/>
									</Link>
									<p className={styles.decisionQuestion}>{card.question}</p>
								</div>
								<ul className={styles.optionList}>
									{card.options.map(opt => (
										<li key={opt.pick} className={styles.option}>
											<span className={styles.optionWhen}>{opt.when}</span>
											<span className={styles.optionPick}>{opt.pick}</span>
											<span className={styles.optionBecause}>
												{opt.because}
											</span>
										</li>
									))}
								</ul>
								{card.note && (
									<p className={styles.decisionNote}>{card.note}</p>
								)}
							</li>
						);
					})}
				</ul>
			</section>

			{/* ---- Greedy rule ---- */}
			<section className={styles.block} aria-labelledby="greedy-heading">
				<h2 id="greedy-heading" className={styles.blockTitle}>
					{greedyRule.title}
				</h2>
				<p className={styles.blockLede}>{greedyRule.lede}</p>
				<div className={styles.greedyColumns}>
					<div className={`${styles.greedyCol} ${styles.greedySafe}`}>
						<h3 className={styles.greedyColTitle}>
							<Check size={15} strokeWidth={2.6} aria-hidden="true" />
							Greedy is exact
						</h3>
						<ul className={styles.greedyList}>
							{greedyRule.safe.map(item => (
								<li key={item.id} className={styles.greedyItem}>
									<Link
										to={topicRoute(item.topicId)}
										className={styles.greedyLabel}
									>
										{item.label}
									</Link>
									<p className={styles.greedyWhy}>{item.why}</p>
								</li>
							))}
						</ul>
					</div>
					<div className={`${styles.greedyCol} ${styles.greedyUnsafe}`}>
						<h3 className={styles.greedyColTitle}>
							<X size={15} strokeWidth={2.6} aria-hidden="true" />
							Greedy fails, use DP
						</h3>
						<ul className={styles.greedyList}>
							{greedyRule.unsafe.map(item => (
								<li key={item.id} className={styles.greedyItem}>
									<Link
										to={topicRoute(item.topicId)}
										className={styles.greedyLabel}
									>
										{item.label}
									</Link>
									<p className={styles.greedyWhy}>{item.why}</p>
								</li>
							))}
						</ul>
					</div>
				</div>
			</section>

			<footer className={styles.foot}>
				<p className={styles.footText}>
					Want to test recall instead of read it?{' '}
					<Link to="/exam" className={styles.footLink}>
						Sit a practice exam
					</Link>{' '}
					or{' '}
					<Link to="/review" className={styles.footLink}>
						run spaced review
					</Link>
					.
				</p>
			</footer>
		</div>
	);
};

export default ReferencePage;
