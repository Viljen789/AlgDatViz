import { Fragment, useState } from 'react';
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
	Menu,
	Network,
	Puzzle,
	Route,
	Search,
	Share2,
	Sigma,
	SplitSquareHorizontal,
	Triangle,
	Workflow,
} from 'lucide-react';
import { Sheet } from '@viljen789/study-ui';
import {
	BUILT_TOPICS,
	CURRICULUM,
	TOPIC_BY_ROUTE,
} from '../../data/curriculum.js';
import useProgress from '../../hooks/useProgress.js';
import ThemeToggle from '../ThemeToggle/ThemeToggle.jsx';
import Eyebrow from '../Eyebrow/Eyebrow.jsx';
import Badge from '../Badge/Badge.jsx';
import BrandMark from '../BrandMark/BrandMark.jsx';
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
	const [topicsOpen, setTopicsOpen] = useState(false);
	const currentTopic = TOPIC_BY_ROUTE[pathname];

	// The single forward affordance: the first built topic not yet completed.
	// Mirrors the home page's "Next up" path ring so wayfinding survives once you
	// leave home (the sidebar is the only chrome present deep inside a lesson).
	// Undefined when everything is complete — then no row is marked.
	const nextTopic = BUILT_TOPICS.find(t => !isCompleted(t.id));

	return (
		<nav className={styles.sidebar} aria-label="Primary">
			<NavLink to="/" end className={styles.logo} aria-label="AlgDatViz home">
				<BrandMark size={24} className={styles.brandMark} />
				<span className={styles.logoCopy}>
					<span className={styles.logoText}>
						AlgDat<span>Viz</span>
					</span>
					<span className={styles.logoMeta}>Algorithm desk</span>
				</span>
			</NavLink>
			<button
				type="button"
				className={styles.mobileCurrent}
				onClick={() => setTopicsOpen(true)}
				aria-haspopup="dialog"
				aria-expanded={topicsOpen}
				aria-label={
					currentTopic
						? `Open navigation, current topic: ${currentTopic.name}`
						: 'Open course navigation'
				}
			>
				<span>{currentTopic ? currentTopic.name : 'Course topics'}</span>
				<small>{currentTopic ? currentTopic.phase : 'Choose a lesson'}</small>
			</button>

			<ul className={styles.navList}>
				<li className={styles.utilityItem}>
					<NavLink
						to="/"
						end
						className={({ isActive }) =>
							`${styles.navLink} ${isActive ? styles.activeLink : ''}`
						}
						aria-label="Today"
					>
						<span className={styles.navBar} aria-hidden="true" />
						{/* Empty number gutter so utility icons share the curriculum
						    rows' icon column (those rows lead with a 2ch number). */}
						<span className={styles.number} aria-hidden="true" />
						<span className={styles.icon} aria-hidden="true">
							<House size={16} strokeWidth={2.2} />
						</span>
						<span className={styles.label}>Today</span>
					</NavLink>
				</li>
				<li className={`${styles.utilityItem} ${styles.mobileSecondary}`}>
					<NavLink
						to="/path"
						className={({ isActive }) =>
							`${styles.navLink} ${isActive ? styles.activeLink : ''}`
						}
						aria-label="Learning path"
					>
						<span className={styles.navBar} aria-hidden="true" />
						<span className={styles.number} aria-hidden="true" />
						<span className={styles.icon} aria-hidden="true">
							<Route size={16} strokeWidth={2.2} />
						</span>
						<span className={styles.label}>Path</span>
					</NavLink>
				</li>
				<li className={styles.utilityItem}>
					<NavLink
						to="/review"
						className={({ isActive }) =>
							`${styles.navLink} ${isActive ? styles.activeLink : ''}`
						}
						aria-label="Review"
					>
						<span className={styles.navBar} aria-hidden="true" />
						<span className={styles.number} aria-hidden="true" />
						<span className={styles.icon} aria-hidden="true">
							<GraduationCap size={16} strokeWidth={2.2} />
						</span>
						<span className={styles.label}>Review</span>
					</NavLink>
				</li>
				<li className={styles.utilityItem}>
					<NavLink
						to="/exam"
						className={({ isActive }) =>
							`${styles.navLink} ${isActive ? styles.activeLink : ''}`
						}
						aria-label="Exam"
					>
						<span className={styles.navBar} aria-hidden="true" />
						<span className={styles.number} aria-hidden="true" />
						<span className={styles.icon} aria-hidden="true">
							<FileCheck size={16} strokeWidth={2.2} />
						</span>
						<span className={styles.label}>Exam</span>
					</NavLink>
				</li>
				<li className={`${styles.utilityItem} ${styles.mobileSecondary}`}>
					<NavLink
						to="/reference"
						className={({ isActive }) =>
							`${styles.navLink} ${isActive ? styles.activeLink : ''}`
						}
						aria-label="Reference"
					>
						<span className={styles.navBar} aria-hidden="true" />
						<span className={styles.number} aria-hidden="true" />
						<span className={styles.icon} aria-hidden="true">
							<BookOpen size={16} strokeWidth={2.2} />
						</span>
						<span className={styles.label}>Reference</span>
					</NavLink>
				</li>
				<li className={`${styles.utilityItem} ${styles.mobileSecondary}`}>
					<NavLink
						to="/progress"
						className={({ isActive }) =>
							`${styles.navLink} ${isActive ? styles.activeLink : ''}`
						}
						aria-label="Progress"
					>
						<span className={styles.navBar} aria-hidden="true" />
						<span className={styles.number} aria-hidden="true" />
						<span className={styles.icon} aria-hidden="true">
							<Activity size={16} strokeWidth={2.2} />
						</span>
						<span className={styles.label}>Progress</span>
					</NavLink>
				</li>
				<li className={`${styles.utilityItem} ${styles.mobileTopics}`}>
					<button
						type="button"
						className={styles.navLink}
						onClick={() => setTopicsOpen(true)}
						aria-haspopup="dialog"
						aria-expanded={topicsOpen}
						aria-label="Open navigation menu"
					>
						<span className={styles.navBar} aria-hidden="true" />
						<span className={styles.number} aria-hidden="true" />
						<span className={styles.icon} aria-hidden="true">
							<Menu size={16} strokeWidth={2.2} />
						</span>
						<span className={styles.label}>More</span>
					</button>
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
							<Eyebrow
								key={`phase-${topic.phase}`}
								as="li"
								className={styles.phaseHead}
								aria-hidden="true"
							>
								{topic.phase}
							</Eyebrow>
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
										<Badge
											tone="soon"
											className={styles.soonBadge}
											aria-hidden="true"
											title="Coming soon"
										>
											Soon
										</Badge>
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
									} ${visited ? styles.visited : ''} ${
										isNext ? styles.next : ''
									}`}
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
										<Badge
											tone="accent"
											className={styles.nextChip}
											aria-hidden="true"
											title="Next up"
										>
											Next
										</Badge>
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

			<Sheet
				open={topicsOpen}
				onClose={() => setTopicsOpen(false)}
				title="Navigate"
				description="Open a lesson, check your progress, or adjust the interface."
				placement="bottom"
			>
				<MobileNavigation
					isCompleted={isCompleted}
					isVisited={isVisited}
					onClose={() => setTopicsOpen(false)}
				/>
			</Sheet>

			<div className={styles.footer}>
				<ThemeToggle />
				<div
					className={styles.progress}
					role="group"
					aria-label={`Overall progress: ${overall.completed} of ${overall.total} topics completed`}
				>
					<div className={styles.progressHead}>
						<Eyebrow as="span">Progress</Eyebrow>
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

const MobileNavigation = ({ isCompleted, isVisited, onClose }) => {
	const [query, setQuery] = useState('');
	const needle = query.trim().toLowerCase();
	const topics = BUILT_TOPICS.filter(topic =>
		needle
			? `${topic.name} ${topic.navLabel} ${topic.keywords}`
					.toLowerCase()
					.includes(needle)
			: true
	);

	return (
		<div className={styles.topicSheet}>
			<section aria-labelledby="mobile-study-tools">
				<Eyebrow as="h3" id="mobile-study-tools">
					Study tools
				</Eyebrow>
				<div className={styles.mobileUtilityGrid}>
					<NavLink
						to="/path"
						onClick={onClose}
						className={styles.mobileUtilityLink}
					>
						<Route size={17} aria-hidden="true" />
						<span>
							<strong>Learning path</strong>
							<small>All topics in teaching order</small>
						</span>
					</NavLink>
					<NavLink
						to="/reference"
						onClick={onClose}
						className={styles.mobileUtilityLink}
					>
						<BookOpen size={17} aria-hidden="true" />
						<span>
							<strong>Reference</strong>
							<small>Complexities and definitions</small>
						</span>
					</NavLink>
					<NavLink
						to="/progress"
						onClick={onClose}
						className={styles.mobileUtilityLink}
					>
						<Activity size={17} aria-hidden="true" />
						<span>
							<strong>Progress</strong>
							<small>Coverage and weak topics</small>
						</span>
					</NavLink>
				</div>
				<div className={styles.mobileAppearanceControl}>
					<ThemeToggle inline />
				</div>
			</section>

			<section className={styles.mobileTopicSection} aria-labelledby="mobile-topics">
				<Eyebrow as="h3" id="mobile-topics">
					Course topics
				</Eyebrow>
				<label className={styles.topicSearch}>
					<Search size={15} aria-hidden="true" />
					<input
						value={query}
						onChange={event => setQuery(event.target.value)}
						placeholder="Search topics or algorithms"
						aria-label="Search curriculum topics"
					/>
				</label>
				<div className={styles.topicResults}>
					{topics.map(topic => {
						const Icon = ICONS[topic.icon] ?? List;
						const completed = isCompleted(topic.id);
						const visited = !completed && isVisited(topic.id);
						return (
							<NavLink
								key={topic.id}
								to={topic.to}
								onClick={onClose}
								className={styles.topicResult}
								style={{ '--accent': topic.accent }}
							>
								<span className={styles.topicResultNumber}>
									{topic.number}
								</span>
								<Icon size={16} aria-hidden="true" />
								<span className={styles.topicResultCopy}>
									<strong>{topic.name}</strong>
									<small>{topic.phase}</small>
								</span>
								<span className={styles.topicResultStatus}>
									{completed ? 'Done' : visited ? 'In progress' : 'Open'}
								</span>
							</NavLink>
						);
					})}
					{topics.length === 0 && (
						<p className={styles.topicEmpty}>No topics match that search.</p>
					)}
				</div>
			</section>
		</div>
	);
};

export default Sidebar;
