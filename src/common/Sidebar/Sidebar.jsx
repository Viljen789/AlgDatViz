import { NavLink, useLocation } from 'react-router-dom';
import {
	BarChart3,
	Brain,
	Check,
	GitBranch,
	Hash,
	House,
	Layers,
	List,
	Lock,
	Network,
	Sigma,
} from 'lucide-react';
import { CURRICULUM, TOPIC_BY_ROUTE } from '../../data/curriculum.js';
import useProgress from '../../hooks/useProgress.js';
import styles from './Sidebar.module.css';

// Maps the `icon` name stored on each curriculum topic to a lucide component.
// (Icons can't be serialized in the data module, so the mapping lives here.)
const ICONS = {
	BarChart3,
	Brain,
	GitBranch,
	Hash,
	Layers,
	List,
	Lock,
	Network,
	Sigma,
};

const Sidebar = () => {
	const { isVisited, isCompleted, overall } = useProgress();
	const { pathname } = useLocation();

	return (
		<nav className={styles.sidebar} aria-label="Primary">
			<div className={styles.logo}>
				<svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
					<rect x="1" y="1" width="8" height="8" rx="1.5" fill="var(--topic-sorting)" opacity="0.9" />
					<rect x="13" y="1" width="8" height="8" rx="1.5" fill="var(--topic-graphs)" opacity="0.9" />
					<rect x="1" y="13" width="8" height="8" rx="1.5" fill="var(--topic-hashing)" opacity="0.9" />
					<rect x="13" y="13" width="8" height="8" rx="1.5" fill="var(--topic-trees)" opacity="0.9" />
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

				{CURRICULUM.map(topic => {
					const Icon = ICONS[topic.icon] ?? List;

					// 'soon' placeholders are locked: rendered muted and inert (no
					// route, not focusable as a link, clearly labelled "coming soon").
					if (topic.status === 'soon') {
						return (
							<li key={topic.id}>
								<span
									className={`${styles.navLink} ${styles.locked}`}
									aria-disabled="true"
									aria-label={`${topic.name} — coming soon`}
								>
									<span className={styles.navBar} aria-hidden="true" />
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
						);
					}

					const completed = isCompleted(topic.id);
					const visited = !completed && isVisited(topic.id);
					const statusLabel = completed
						? 'completed'
						: visited
							? 'visited'
							: 'not started';
					// A route can be shared (e.g. the `foundations` preview aliases
					// `/stacks-queues`). Only the topic that actually owns the route in
					// the topic model (TOPIC_BY_ROUTE — the real `ready` topic) may show
					// active, so exactly one nav item lights up per route. We compute
					// active explicitly (rather than via NavLink's render prop) so the
					// preview alias also drops its automatic aria-current.
					const ownsRoute = TOPIC_BY_ROUTE[topic.to]?.id === topic.id;
					const active = ownsRoute && pathname === topic.to;
					return (
						<li key={topic.id}>
							<NavLink
								to={topic.to}
								className={`${styles.navLink} ${
									active ? styles.activeLink : ''
								} ${completed ? styles.completed : ''} ${
									visited ? styles.visited : ''
								}`}
								aria-current={active ? 'page' : undefined}
								style={{ '--accent': topic.accent }}
								aria-label={`${topic.name} — ${statusLabel}`}
							>
								<span className={styles.navBar} aria-hidden="true" />
								<span className={styles.icon} aria-hidden="true">
									<Icon size={16} strokeWidth={2.2} />
								</span>
								<span className={styles.label}>{topic.navLabel}</span>
								<span
									className={styles.status}
									aria-hidden="true"
									title={statusLabel}
								>
									{completed ? (
										<Check size={12} strokeWidth={3} className={styles.statusCheck} />
									) : (
										<span className={styles.statusDot} />
									)}
								</span>
							</NavLink>
						</li>
					);
				})}
			</ul>

			<div className={styles.footer}>
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
