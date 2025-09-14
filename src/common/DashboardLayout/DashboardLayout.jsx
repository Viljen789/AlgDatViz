import styles from "./DashboardLayout.module.css";

/**
 * A reusable layout component for all dashboard pages.
 * @param {React.ReactNode} controls - The component to render in the top controls bar.
 * @param {React.ReactNode} children - The main content to render below the controls.
 */
const DashboardLayout = ({ controls, children }) => {
  return (
    <div className={styles.dashboardContainer}>
      {/* Slot for the top controls bar */}
      <div className={styles.controlsArea}>{controls}</div>

      {/* Slot for the main page content */}
      <div className={styles.mainContentArea}>{children}</div>
    </div>
  );
};

export default DashboardLayout;
