import styles from './DashboardLayout.module.css';

const DashboardLayout = ({ controls, children }) => {
	return (
		<div className={styles.dashboardContainer}>
			<div className={styles.controlsArea}>{controls}</div>

			<div className={styles.mainContentArea}>{children}</div>
		</div>
	);
};

export default DashboardLayout;
