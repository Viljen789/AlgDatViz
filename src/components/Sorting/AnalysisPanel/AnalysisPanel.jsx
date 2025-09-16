import styles from './AnalysisPanel.module.css';
import Tabs from '../../../common/Tabs/Tabs';
import AlgorithmDetails from '../AlgorithmInfoPanel/Views/AlgorithmDetails/AlgorithmDetails.jsx';
import OperationsComparison from '../../../common/OperationsComparison/OperationsComparison.jsx';

const AnalysisPanel = ({ info, operationStats, arraySize, isSorting }) => {
	const tabItems = [
		{
			label: 'AlgorithmDetails',
			content: <AlgorithmDetails info={info} />,
		},
		{
			label: 'Performance Analysis',
			content: (
				<OperationsComparison
					operationStats={operationStats}
					algorithmInfo={info}
					arraySize={arraySize}
					isSorting={isSorting}
				/>
			),
		},
	];

	return (
		<div className={styles.analysisPanel}>
			<Tabs tabs={tabItems} defaultActive={1} />
		</div>
	);
};

export default AnalysisPanel;
