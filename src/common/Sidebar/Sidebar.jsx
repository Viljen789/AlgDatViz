import { Fragment } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
	Activity,
	ArrowDownNarrowWide,
	BarChart3,
	BookOpen,
	Brain,
	Check,
	FileCheck,
	GitBranch,
	GraduationCap,
	Grid3x3,
	Hash,
	House,
	Layers,
	List,
	Lock,
	Network,
	Puzzle,
	Route,
	Share2,
	Sigma,
	SplitSquareHorizontal,
	Triangle,
	Workflow,
} from 'lucide-react';
import {
	BUILT_TOPICS,
	CURRICULUM,
	TOPIC_BY_ROUTE,
} from '../../data/curriculum.js';
import useProgress from '../../hooks/useProgress.js';
import ThemeToggle from '../ThemeToggle/ThemeToggle.jsx';
import styles from './Sidebar.module.css';

// Maps the `icon` name stored on each curriculum topic to a lucide component.
// (Icons can't be serialized in the data module, so the mapping lives here.)
const ICONS = {
	ArrowDownNarrowWide,
	BarChart3,
	Brain,
	GitBranch,
	Grid3x3,
	Hash,
	Layers,
	List,
	Lock,
	Network,
	Puzzle,
	Route,
	Share2,
	Sigma,
	SplitSquareHorizontal,
	Triangle,
	Workflow,
};

const Sidebar = () => {
	const { isVisited, isCompleted, overall } = useProgress();
	const { pathname } = useLocation();

	// The single forward affordance: the first built topic not yet completed.
	// Mirrors the home page's "Next up" path ring so wayfinding survives once you
	// leave home (the sidebar is the only chrome present deep inside a lesson).
	// Undefined when everything is complete — then no row is marked.
	const nextTopic = BUILT_TOPICS.find(t => !isCompleted(t.id));

	return (
		<nav className={styles.sidebar} aria-label="Primary">
			<div className={styles.logo}>
				<svg
					width="22"
					height="22"
					viewBox="0 0 22 22"
					fill="none"
					aria-hidden="true"
				>
					<rect
						x="1"
						y="1"
						width="8"
						height="8"
						rx="1.5"
						fill="var(--topic-sorting)"
						opacity="0.9"
					/>
					<rect
						x="13"
						y="1"
						width="8"
						height="8"
						rx="1.5"
						fill="var(--topic-graphs)"
						opacity="0.9"
					/>
					<rect
						x="1"
						y="13"
						width="8"
						height="8"
						rx="1.5"
						fill="var(--topic-hashing)"
						opacity="0.9"
					/>
					<rect
						x="13"
						y="13"
						width="8"
						height="8"
						rx="1.5"
						fill="var(--topic-trees)"
						opacity="0.9"
					/>
				</svg>
				<span className={styles.logoText}>AlgDatViz</span>
			</div>

			<ul className={styles.navList}>
				<li>
					<NavLink
						to="/"
						end
						className={({ isActive }) =>
							`${styles.navLink} ${isActive ? styles.activeLink : ''}`
						}
					>
						<span className={styles.navBar} aria-hidden="true" />
						<span className={styles.icon} aria-hidden="true">
							<House size={16} strokeWidth={2.2} />
						</span>
						<span className={styles.label}>Home</span>
					</NavLink>
				</li>
				<li>
					<NavLink
						to="/review"
						className={({ isActive }) =>
							`${styles.navLink} ${isActive ? styles.activeLink : ''}`
						}
					>
						<span className={styles.navBar} aria-hidden="true" />
						<span className={styles.icon} aria-hidden="true">
							<GraduationCap size={16} strokeWidth={2.2} />
						</span>
						<span className={styles.label}>Review</span>
					</NavLink>
				</li>
				<li>
					<NavLink
						to="/exam"
						className={({ isActive }) =>
							`${styles.navLink} ${isActive ? styles.activeLink : ''}`
						}
					>
						<span className={styles.navBar} aria-hidden="true" />
						<span className={styles.icon} aria-hidden="true">
							<FileCheck size={16} strokeWidth={2.2} />
						</span>
						<span className={styles.label}>Exam</span>
					</NavLink>
				</li>
				<li>
					<NavLink
						to="/reference"
						className={({ isActive }) =>
							`${styles.navLink} ${isActive ? styles.activeLink : ''}`
						}
					>
						<span className={styles.navBar} aria-hidden="true" />
						<span className={styles.icon} aria-hidden="true">
							<BookOpen size={16} strokeWidth={2.2} />
						</span>
						<span className={styles.label}>Reference</span>
					</NavLink>
				</li>
				<li>
					<NavLink
						to="/progress"
						className={({ isActive }) =>
							`${styles.navLink} ${isActive ? styles.activeLink : ''}`
						}
					>
						<span className={styles.navBar} aria-hidden="true" />
						<span className={styles.icon} aria-hidden="true">
							<Activity size={16} strokeWidth={2.2} />
						</span>
						<span className={styles.label}>Progress</span>
					</NavLink>
				</li>

				{CURRICULUM.map((topic, index) => {
					const Icon = ICONS[topic.icon] ?? List;

					// The five curriculum phases group the flat 15-item list so the
					// course's macro-shape reads at a glance. A non-interactive phase
					// header is emitted whenever the phase changes (the list is already
					// in teaching order, so a phase is one contiguous run of rows). The
					// header is decorative chrome (aria-hidden); each row still carries
					// its own full a11y label below.
					const phaseHeader =
						topic.phase !== CURRICULUM[index - 1]?.phase ? (
							<li
								key={`phase-${topic.phase}`}
								className={styles.phaseHead}
								aria-hidden="true"
							>
								{topic.phase}
							</li>
						) : null;

					// The teaching-order number, prefixing the label in muted mono.
					const numberPrefix = (
						<span className={styles.number} aria-hidden="true">
							{topic.number}
						</span>
					);

					// 'soon' placeholders are locked: rendered muted and inert (no
					// route, not focusable as a link, clearly labelled "coming soon").
					if (topic.status === 'soon') {
						return (
							<Fragment key={topic.id}>
								{phaseHeader}
								<li>
									<span
										className={`${styles.navLink} ${styles.locked}`}
										aria-disabled="true"
										aria-label={`${topic.name}, coming soon`}
									>
										<span className={styles.navBar} aria-hidden="true" />
										{numberPrefix}
										<span className={styles.icon} aria-hidden="true">
											<Lock size={14} strokeWidth={2.2} />
										</span>
										<span className={styles.label}>{topic.navLabel}</span>
										<span
											className={styles.soonBadge}
											aria-hidden="true"
											title="Coming soon"
										>
											Soon
										</span>
									</span>
								</li>
							</Fragment>
						);
					}

					const completed = isCompleted(topic.id);
					const visited = !completed && isVisited(topic.id);
					// Exactly one row carries the "Next" marker (nextTopic is the first
					// uncompleted built topic, or undefined when all are done).
					const isNext = nextTopic?.id === topic.id;
					const statusLabel = completed
						? 'completed'
						: visited
							? 'visited'
							: 'not started';
					// "Next" rides on the existing aria-label so it is announced, not
					// signalled by hue alone (the chip itself is decorative chrome).
					const rowLabel = isNext
						? `${topic.name}, ${statusLabel}, next up`
						: `${topic.name}, ${statusLabel}`;
					// A route can be shared (e.g. the `foundations` preview aliases
					// `/stacks-queues`). Only the topic that actually owns the route in
					// the topic model (TOPIC_BY_ROUTE — the real `ready` topic) may show
					// active, so exactly one nav item lights up per route. We compute
					// active explicitly (rather than via NavLink's render prop) so the
					// preview alias also drops its automatic aria-current.
					const ownsRoute = TOPIC_BY_ROUTE[topic.to]?.id === topic.id;
					const active = ownsRoute && pathname === topic.to;
					return (
						<Fragment key={topic.id}>
							{phaseHeader}
							<li>
								<NavLink
									to={topic.to}
									className={`${styles.navLink} ${
										active ? styles.activeLink : ''
									} ${completed ? styles.completed : ''} ${
										visited ? styles.visited : ''
									} ${isNext ? styles.next : ''}`}
									aria-current={active ? 'page' : undefined}
									style={{ '--accent': topic.accent }}
									aria-label={rowLabel}
								>
									<span className={styles.navBar} aria-hidden="true" />
									{numberPrefix}
									<span className={styles.icon} aria-hidden="true">
										<Icon size={16} strokeWidth={2.2} />
									</span>
									<span className={styles.label}>{topic.navLabel}</span>
									{isNext && (
										<span
											className={styles.nextChip}
											aria-hidden="true"
											title="Next up"
										>
											Next
										</span>
									)}
									<span
										className={styles.status}
										aria-hidden="true"
										title={statusLabel}
									>
										{completed ? (
											<Check
												size={12}
												strokeWidth={3}
												className={styles.statusCheck}
											/>
										) : (
											<span className={styles.statusDot} />
										)}
									</span>
								</NavLink>
							</li>
						</Fragment>
					);
				})}
			</ul>

			<div className={styles.footer}>
				<ThemeToggle />
				<div
					className={styles.progress}
					role="group"
					aria-label={`Overall progress: ${overall.completed} of ${overall.total} topics completed`}
				>
					<div className={styles.progressHead}>
						<span className={styles.progressLabel}>Progress</span>
						<span className={styles.progressCount}>
							{overall.completed}/{overall.total}
						</span>
					</div>
					<div
						className={styles.progressTrack}
						role="progressbar"
						aria-valuenow={overall.completed}
						aria-valuemin={0}
						aria-valuemax={overall.total}
						aria-label="Topics completed"
					>
						<span
							className={styles.progressFill}
							style={{ width: `${overall.percent}%` }}
						/>
					</div>
				</div>
			</div>
		</nav>
	);
};

export default Sidebar;
