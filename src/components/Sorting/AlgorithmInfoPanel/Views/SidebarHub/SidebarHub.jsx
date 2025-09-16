import Tabs from '../../../../../common/Tabs/Tabs';
import PseudoCodeViewer from '../../../PseudoCodeViewer/PseudoCodeViewer';
import OperationsComparison from '../../../../../common/OperationsComparison/OperationsComparison';

const SidebarHub = ({
	sortingAlgorithm,
	currentFrame,
	operationStats,
	info,
	arraySize,
	isSorting,
	isFastMode,
}) => {
	const tabItems = [
		{
			label: 'Pseudocode',
			content: (
				<PseudoCodeViewer
					algorithm={sortingAlgorithm}
					activeLine={currentFrame.line}
					isFastMode={isFastMode}
				/>
			),
		},
		{
			label: 'Performance',
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

	return <Tabs tabs={tabItems} defaultActive={0} />;
};

export default SidebarHub;
