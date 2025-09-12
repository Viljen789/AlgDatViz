import styles from './infoSection.module.css';

const InfoSection = ({ title, children }) => {
  return (
    <div className={styles.infoSection}>
      <div className={styles.sectionHeader}>
        <h4>{title}</h4>
        <span className={styles.expandIcon}>›</span>
      </div>
      <div className={styles.sectionContent}>
        <div className={styles.contentWrapper}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default InfoSection;
