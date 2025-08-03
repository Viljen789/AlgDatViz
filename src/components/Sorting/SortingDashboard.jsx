import styles from './SortingDashboard.module.css';
import SortingControls from './SortingControls/SortingControls';
import ArrayVisualizer from './ArrayVisualizer/ArrayVisualizer';
import {useEffect, useState} from 'react';

const SortingDashboard = () => {
	const [array, setArray] = useState([]);
	const [arraySize, setArraySize] = useState(50);
	const [animationSpeed, setAnimationSpeed] = useState(50);
	const [sortingAlgorithm, setSortingAlgorithm] = useState('bubbleSort');
	const [isSorting, setIsSorting] = useState(false);
	const [comparingIndices, setComparingIndices] = useState([]);
	const [swappingIndices, setSwappingIndices] = useState([]);
	const [sortedIndices, setSortedIndices] = useState([]);

	const generateArray = () => {
		const newArray = [];
		for (let i = 0; i < arraySize; i++) {
			newArray.push(Math.floor(Math.random() * 300) + 10);
		}
		setArray(newArray);
		setComparingIndices([]);
		setSwappingIndices([]);
		setSortedIndices([]);
	};

	useEffect(() => {
		generateArray();
	}, [arraySize]);

	const getAnimationDelay = () => {
		return 210 - animationSpeed;
	};

	const bubbleSort = async () => {
		const animations = [];
		const arrayCopy = [...array];
		const n = arrayCopy.length;

		for (let i = 0; i < n; i++) {
			for (let j = 0; j < n - i - 1; j++) {
				animations.push({type: 'compare', indices: [j, j + 1]});

				if (arrayCopy[j] > arrayCopy[j + 1]) {
					animations.push({type: 'swap', indices: [j, j + 1]});
					[arrayCopy[j], arrayCopy[j + 1]] = [arrayCopy[j + 1], arrayCopy[j]];
				}
			}
			animations.push({type: 'sorted', index: n - i - 1});
		}

		await playAnimations(animations);
	};

	const quickSort = async () => {
		const animations = [];
		const arrayCopy = [...array];

		const partition = (arr, low, high) => {
			const pivot = arr[high];
			let i = low - 1;

			for (let j = low; j < high; j++) {
				animations.push({type: 'compare', indices: [j, high]});

				if (arr[j] < pivot) {
					i++;
					animations.push({type: 'swap', indices: [i, j]});
					[arr[i], arr[j]] = [arr[j], arr[i]];
				}
			}

			animations.push({type: 'swap', indices: [i + 1, high]});
			[arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];

			return i + 1;
		};

		const quickSortHelper = (arr, low, high) => {
			if (low < high) {
				const pivotIndex = partition(arr, low, high);

				animations.push({type: 'sorted', index: pivotIndex});

				quickSortHelper(arr, low, pivotIndex - 1);
				quickSortHelper(arr, pivotIndex + 1, high);
			} else if (low === high) {
				animations.push({type: 'sorted', index: low});
			}
		};

		quickSortHelper(arrayCopy, 0, arrayCopy.length - 1);
		await playAnimations(animations);
	};

	const mergeSort = async () => {
		const animations = [];
		const arrayCopy = [...array];
		const tempArray = [...arrayCopy];

		const mergeSortHelper = (arr, temp, left, right) => {
			if (left >= right) return;

			const mid = Math.floor((left + right) / 2);
			mergeSortHelper(arr, temp, left, mid);
			mergeSortHelper(arr, temp, mid + 1, right);
			merge(arr, temp, left, mid, right);
		};

		const merge = (arr, temp, left, mid, right) => {
			for (let i = left; i <= right; i++) {
				temp[i] = arr[i];
			}

			let i = left;
			let j = mid + 1;
			let k = left;

			while (i <= mid && j <= right) {
				animations.push({type: 'compare', indices: [i, j]});

				if (temp[i] <= temp[j]) {
					animations.push({type: 'overwrite', indices: [k], value: temp[i]});
					arr[k++] = temp[i++];
				} else {
					animations.push({type: 'overwrite', indices: [k], value: temp[j]});
					arr[k++] = temp[j++];
				}
			}

			while (i <= mid) {
				animations.push({type: 'overwrite', indices: [k], value: temp[i]});
				arr[k++] = temp[i++];
			}

			while (j <= right) {
				animations.push({type: 'overwrite', indices: [k], value: temp[j]});
				arr[k++] = temp[j++];
			}

			for (let i = left; i <= right; i++) {
				animations.push({type: 'sorted', index: i});
			}
		};

		mergeSortHelper(arrayCopy, tempArray, 0, arrayCopy.length - 1);
		await playAnimations(animations);
	};

	const playAnimations = async (animations) => {
		setIsSorting(true);
		setSortedIndices([]);

		const sortedIndicesSet = new Set();

		for (let i = 0; i < animations.length; i++) {
			const {type, indices, value} = animations[i];

			if (type === 'compare') {
				setComparingIndices(indices);
				setSwappingIndices([]);
			} else if (type === 'swap') {
				setComparingIndices([]);
				setSwappingIndices(indices);
				setArray(prevArray => {
					const newArray = [...prevArray];
					[newArray[indices[0]], newArray[indices[1]]] = [newArray[indices[1]], newArray[indices[0]]];
					return newArray;
				});
			} else if (type === 'overwrite') {
				setComparingIndices([]);
				setSwappingIndices(indices);
				setArray(prevArray => {
					const newArray = [...prevArray];
					newArray[indices[0]] = value;
					return newArray;
				});
			} else if (type === 'sorted') {
				sortedIndicesSet.add(indices.index);
				setSortedIndices([...sortedIndicesSet]);
			}

			await new Promise(resolve => setTimeout(resolve, getAnimationDelay()));
		}

		setSortedIndices(Array.from({length: array.length}, (_, i) => i));
		setComparingIndices([]);
		setSwappingIndices([]);
		setIsSorting(false);
	};

	const startSort = () => {
		if (isSorting) return;

		switch (sortingAlgorithm) {
			case 'bubbleSort':
				bubbleSort();
				break;
			case 'quickSort':
				quickSort();
				break;
			case 'mergeSort':
				mergeSort();
				break;
			default:
				bubbleSort();
		}
	};

	return (
		<div className={styles.dashboardContainer}>
			<SortingControls
				generateArray={generateArray}
				setArraySize={setArraySize}
				arraySize={arraySize}
				setAnimationSpeed={setAnimationSpeed}
				animationSpeed={animationSpeed}
				setSortingAlgorithm={setSortingAlgorithm}
				sortingAlgorithm={sortingAlgorithm}
				startSort={startSort}
				isSorting={isSorting}
			/>
			<ArrayVisualizer
				array={array}
				comparingIndices={comparingIndices}
				swappingIndices={swappingIndices}
				sortedIndices={sortedIndices}
			/>
		</div>
	);
};

export default SortingDashboard;
