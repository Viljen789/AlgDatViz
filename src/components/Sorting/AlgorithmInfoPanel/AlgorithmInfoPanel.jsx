// Enhanced AlgorithmInfoPanel.jsx
import styles from './AlgorithmInfoPanel.module.css';
import InfoSection from "../../../common/InfoSection/InfoSection.jsx";
import ToggleSwitch from "../../../common/ToggleSwitch/ToggleSwitch.jsx";
import OperationsComparison from "../../../common/OperationsComparison/OperationsComparison.jsx";

const AlgorithmInfoPanel = ({info, operationStats, isGraphVisible, onToggleGraph, algorithmInfo, isSorting, arraySize}) => {
    if (!info) {
        return (
            <div className={styles.infoPanel}>
                <div className={styles.placeholderText}>
                    Select an algorithm to see its details.
                </div>
            </div>
        );
    }

    return (
        <div className={styles.infoPanel}>
            <div className={styles.overview}>
                <h3 className={styles.title}>{info.name}</h3>
                <div className={styles.quickStats}>
                    <div className={styles.statItem}>
                        <span className={styles.label}>Best:</span>
                        <span className={styles.value}>{info.complexity.time.best}</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.label}>Average:</span>
                        <span className={styles.value}>{info.complexity.time.average}</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.label}>Worst:</span>
                        <span className={styles.value}>{info.complexity.time.worst}</span>
                    </div>
                </div>
            </div>

            <InfoSection title="How it works" defaultExpanded={true}>
                <p className={styles.description}>{info.description}</p>
            </InfoSection>

            <InfoSection title="Properties & Complexity">
                <div className={styles.propertiesGrid}>
                    <div className={styles.propRow}>
                        <span className={styles.propLabel}>Stable:</span>
                        <span className={styles.propValue}>{info.properties.stable ? 'Yes' : 'No'}</span>
                    </div>
                    <div className={styles.propRow}>
                        <span className={styles.propLabel}>In-place:</span>
                        <span className={styles.propValue}>{info.properties.inPlace ? 'Yes' : 'No'}</span>
                    </div>
                    <div className={styles.propRow}>
                        <span className={styles.propLabel}>Space complexity:</span>
                        <span className={styles.propValue}>{info.complexity.space.worst}</span>
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

            {operationStats && (
                <div className={styles.analysisSection}>
                    <div className={styles.toggleWrapper}>
                        <ToggleSwitch
                            label="Show Performance Analysis"
                            checked={isGraphVisible}
                            onChange={onToggleGraph}
                        />
                    </div>

                    {isGraphVisible && (
                        <div className={styles.graphWrapper}>
                            <OperationsComparison
                                operationStats={operationStats}
                                algorithmInfo={algorithmInfo}
                                arraySize={arraySize}
                                isSorting={isSorting}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AlgorithmInfoPanel;
