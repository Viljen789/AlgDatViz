import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import styles from './Sidebar.module.css';

const Sidebar = ({ isCollapsed, onToggle }) => {
	const location = useLocation();
	const [activeLinkStyle, setActiveLinkStyle] = useState({});
	const linkRefs = useRef(new Map());

	useEffect(() => {
		const activeLinkRef = linkRefs.current.get(location.pathname);
		if (activeLinkRef) {
			setActiveLinkStyle({
				top: activeLinkRef.offsetTop,
				height: activeLinkRef.offsetHeight,
			});
		}
	}, [location.pathname, isCollapsed]);

	return (
		<nav
			className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}
		>
			<div className={styles.header}>
				<div className={styles.logo}></div>
				<button onClick={onToggle} className={styles.toggleButton}>
					{isCollapsed ? '›' : '‹'}
				</button>
			</div>
			<ul className={styles.navList}>
				<div
					className={styles.activeIndicator}
					style={activeLinkStyle}
				></div>

				<li>
					<NavLink
						to="/graph"
						ref={el => linkRefs.current.set('/graph', el)}
						className={({ isActive }) =>
							isActive
								? `${styles.navLink} ${styles.activeLink}`
								: styles.navLink
						}
					>
						<span className={styles.icon}>G</span>
						<span className={styles.label}>Graphs</span>
					</NavLink>
				</li>
				<li>
					<NavLink
						to="/sorting"
						ref={el => linkRefs.current.set('/sorting', el)}
						className={({ isActive }) =>
							isActive
								? `${styles.navLink} ${styles.activeLink}`
								: styles.navLink
						}
					>
						<span className={styles.icon}>S</span>
						<span className={styles.label}>Sorting</span>
					</NavLink>
				</li>
			</ul>
		</nav>
	);
};

export default Sidebar;
