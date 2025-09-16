import styles from './AlgorithmDetails.module.css';
import InfoSection from '../../../../../common/InfoSection/InfoSection.jsx';

const AlgorithmDetails = ({ info }) => {
	if (!info) {
		return (
			<div className={styles.detailsContainer}>
				<p>Algorithm details not available.</p>
			</div>
		);
	}

	return (
		<div className={styles.detailsContainer}>
			<InfoSection title="How it works" defaultExpanded={true}>
				<p className={styles.description}>{info.description}</p>
			</InfoSection>

			<InfoSection title="Properties & Complexity">
				<div className={styles.propertiesGrid}>
					<div className={styles.propRow}>
						<span className={styles.propLabel}>Stable:</span>
						<span className={styles.propValue}>
							{info.properties.stable ? 'Yes' : 'No'}
						</span>
					</div>
					<div className={styles.propRow}>
						<span className={styles.propLabel}>In-place:</span>
						<span className={styles.propValue}>
							{info.properties.inPlace ? 'Yes' : 'No'}
						</span>
					</div>
					<div className={styles.propRow}>
						<span className={styles.propLabel}>
							Space complexity:
						</span>
						<span className={styles.propValue}>
							{info.complexity.space.worst}
						</span>
					</div>
				</div>
			</InfoSection>

			<InfoSection title="Best & Worst Cases">
				<div className={styles.cases}>
					<div className={styles.caseItem}>
						<h5>Best Case</h5>
						<p>{info.cases.best}</p>
					</div>
					<div className={styles.caseItem}>
						<h5>Worst Case</h5>
						<p>{info.cases.worst}</p>
					</div>
				</div>
			</InfoSection>
		</div>
	);
};

export default AlgorithmDetails;
