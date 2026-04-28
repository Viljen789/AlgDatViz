import { NavLink } from 'react-router-dom';
import {
	BarChart3,
	Brain,
	GitBranch,
	Hash,
	House,
	List,
	Network,
	Sigma,
} from 'lucide-react';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
	{
		to: '/',
		label: 'Home',
		accent: '#4f7cf8',
		Icon: House,
	},
	{
		to: '/sorting',
		label: 'Sorting',
		accent: '#4f7cf8',
		Icon: BarChart3,
	},
	{
		to: '/graph',
		label: 'Graphs',
		accent: '#38c9a0',
		Icon: Network,
	},
	{
		to: '/hashmap',
		label: 'Hash Maps',
		accent: '#f8a74f',
		Icon: Hash,
	},
	{
		to: '/stacks-queues',
		label: 'Stacks/Queues',
		accent: '#7fa4fc',
		Icon: List,
	},
	{
		to: '/tree',
		label: 'Trees',
		accent: '#c97af8',
		Icon: GitBranch,
	},
	{
		to: '/strategies',
		label: 'Strategies',
		accent: '#38c9a0',
		Icon: Brain,
	},
	{
		to: '/master-theorem',
		label: 'Master',
		accent: '#f8c040',
		Icon: Sigma,
	},
];

const Sidebar = () => {
	return (
		<nav className={styles.sidebar}>
			<div className={styles.logo}>
				<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
					<rect x="1" y="1" width="8" height="8" rx="1.5" fill="#4f7cf8" opacity="0.9" />
					<rect x="13" y="1" width="8" height="8" rx="1.5" fill="#38c9a0" opacity="0.9" />
					<rect x="1" y="13" width="8" height="8" rx="1.5" fill="#f8a74f" opacity="0.9" />
					<rect x="13" y="13" width="8" height="8" rx="1.5" fill="#c97af8" opacity="0.9" />
				</svg>
				<span className={styles.logoText}>AlgDatViz</span>
			</div>

			<div className={styles.navList}>
				{NAV_ITEMS.map(item => (
					<NavLink
						key={item.to}
						to={item.to}
						end={item.to === '/'}
						className={({ isActive }) =>
							`${styles.navLink} ${isActive ? styles.activeLink : ''}`
						}
						style={({ isActive }) => ({
							'--accent': item.accent,
							color: isActive ? item.accent : undefined,
							background: isActive ? `${item.accent}14` : undefined,
						})}
					>
						<span
							className={styles.navBar}
							style={{ background: 'currentColor' }}
						/>
						<span className={styles.icon}>
							<item.Icon size={16} strokeWidth={2.2} />
						</span>
						<span className={styles.label}>{item.label}</span>
					</NavLink>
				))}
			</div>

			<div className={styles.footer}>
				<div className={styles.footerDot} />
				<span className={styles.footerText}>Educational · Open Source</span>
			</div>
		</nav>
	);
};

export default Sidebar;
