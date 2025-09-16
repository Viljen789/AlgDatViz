import styles from './AlgorithmInfoPanel.module.css';
import OperationsComparison from '../../../common/OperationsComparison/OperationsComparison.jsx';
import AlgorithmDetails from './Views/AlgorithmDetails/AlgorithmDetails.jsx';
import Tabs from '../../../common/Tabs/Tabs.jsx';

const AlgorithmInfoPanel = ({ info, operationStats, isSorting, arraySize }) => {
	if (!info) {
		return (
			<div className={styles.infoPanel}>
				<div className={styles.placeholderText}>
					Select an algorithm to see its details.
				</div>
			</div>
		);
	}

	const tabItems = [
		{
			label: 'AlgorithmDetails',
			content: <AlgorithmDetails info={info} />,
		},
		{
			label: 'Performance Analysis',
			content: operationStats ? (
				<OperationsComparison
					operationStats={operationStats}
					algorithmInfo={info}
					arraySize={arraySize}
					isSorting={isSorting}
				/>
			) : (
				<div className={styles.runSortPlaceholder}>
					Run the sort to see performance analysis.
				</div>
			),
		},
	];

	return (
		<div className={styles.infoPanel}>
			<Tabs tabs={tabItems} />
		</div>
	);
};

export default AlgorithmInfoPanel;
