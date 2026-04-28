import { NavLink } from 'react-router-dom';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
	{
		to: '/',
		label: 'Home',
		accent: '#4f7cf8',
		icon: (
			<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
				<path
					d="M8 2L2 7v7h4v-4h4v4h4V7L8 2z"
					stroke="currentColor"
					strokeWidth="1.4"
					strokeLinejoin="round"
					fill="none"
				/>
			</svg>
		),
	},
	{
		to: '/sorting',
		label: 'Sorting',
		accent: '#4f7cf8',
		icon: (
			<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
				<rect x="2" y="10" width="3" height="4" rx="0.5" fill="currentColor" opacity="0.9" />
				<rect x="6.5" y="6" width="3" height="8" rx="0.5" fill="currentColor" opacity="0.7" />
				<rect x="11" y="2" width="3" height="12" rx="0.5" fill="currentColor" opacity="0.5" />
			</svg>
		),
	},
	{
		to: '/graph',
		label: 'Graphs',
		accent: '#38c9a0',
		icon: (
			<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
				<circle cx="3.5" cy="3.5" r="2" fill="currentColor" opacity="0.9" />
				<circle cx="12.5" cy="3.5" r="2" fill="currentColor" opacity="0.7" />
				<circle cx="8" cy="12" r="2" fill="currentColor" opacity="0.5" />
				<line x1="3.5" y1="3.5" x2="12.5" y2="3.5" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
				<line x1="3.5" y1="3.5" x2="8" y2="12" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
				<line x1="12.5" y1="3.5" x2="8" y2="12" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
			</svg>
		),
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
						<span className={styles.icon}>{item.icon}</span>
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
