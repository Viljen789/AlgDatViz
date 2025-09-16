import CountingSortView from './CountingSort/CountingSortView.jsx';
import BucketSortView from './BucketSort/BucketSortView.jsx';
import MergeSortView from './MergeSort/MergeSortView.jsx';
import HeapSortView from './HeapSort/HeapSortView.jsx';
import RadixSortView from './RadixSort/RadixSortView.jsx';
import BoxView from '../BoxView';

const AlgorithmSpecificView = ({
	algorithm,
	array,
	currentFrame,
	...props
}) => {
	const viewComponents = {
		countingSort: CountingSortView,
		bucketSort: BucketSortView,
		mergeSort: MergeSortView,
		heapSort: HeapSortView,
		radixSort: RadixSortView,
	};

	const ViewComponent = viewComponents[algorithm] || BoxView;

	return (
		<ViewComponent array={array} currentFrame={currentFrame} {...props} />
	);
};

export default AlgorithmSpecificView;
