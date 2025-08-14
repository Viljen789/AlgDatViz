// This file contains the pure logic for generating sorting animations.
export const PSEUDO_CODE = {
	bubbleSort: [
		'for i from 0 to n-1:',
		'  for j from 0 to n-i-2:',
		'    if array[j] > array[j+1]:',
		'      swap(array[j], array[j+1])',
		'  mark array[n-i-1] as sorted',
	],
	quickSort: [
		'function quickSort(array, low, high):',
		'  if low < high:',
		'    pivot_index = partition(array, low, high)',
		'    quickSort(array, low, pivot_index - 1)',
		'    quickSort(array, pivot_index + 1, high)',
		'mark pivot as sorted',
	],
	mergeSort: [
		'function mergeSort(array, left, right)',
		'  if left < right',
		'    mid = floor((left + right) / 2)',
		'    mergeSort(array, left, mid)',
		'    mergeSort(array, mid + 1, right)',
		'    merge(array, left, mid, right)',
		'',
		'function merge(array, left, mid, right)',
		'  copy left half to auxiliary array',
		'  copy right half to auxiliary array',
		'  while there are elements in both halves',
		'    compare elements and merge back into main array',
		'  copy any remaining elements',
	],
	heapSort: [
		'buildMaxHeap(array)',
		'for i from n-1 down to 1:',
		'  swap(array[0], array[i])',
		'  heapify(array, i, 0)',
		'mark array as sorted',
	],
	insertionSort: [
		'for i from 1 to n-1:',
		'  key = array[i]',
		'  j = i - 1',
		'  while j >= 0 and array[j] > key:',
		'    array[j+1] = array[j]',
		'    j = j - 1',
		'  array[j+1] = key',
	],
	selectionSort: [
		'for i from 0 to n-1:',
		'  min_index = i',
		'  for j from i+1 to n-1:',
		'    if array[j] < array[min_index]:',
		'      min_index = j',
		'  swap(array[i], array[min_index])',
		'mark array[i] as sorted',
	],
};

export const getBubbleSortAnimations = (array) => {
	const animations = [];
	const arrayCopy = [...array];
	const n = arrayCopy.length;

	for (let i = 0; i < n; i++) {
		animations.push({type: 'line', line: 1});
		for (let j = 0; j < n - i - 1; j++) {
			animations.push({type: 'line', line: 2});
			animations.push({type: 'compare', indices: [j, j + 1], line: 3});
			if (arrayCopy[j] > arrayCopy[j + 1]) {
				animations.push({type: 'line', line: 4});
				animations.push({type: 'swap', indices: [j, j + 1]});
				[arrayCopy[j], arrayCopy[j + 1]] = [arrayCopy[j + 1], arrayCopy[j]];
			}
		}
		animations.push({type: 'sorted', index: n - i - 1, line: 5});
	}
	return animations;
}

export const getQuickSortAnimations = (array) => {
	const animations = [];
	const n = array.length;
	if (array.length <= 1) return animations;
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
	// Mark any remaining unsorted elements as sorted
	const sortedIndices = new Set(animations.filter(a => a.type === 'sorted').map(a => a.index));
	for (let i = 0; i < arrayCopy.length; i++) {
		if (!sortedIndices.has(i)) {
			animations.push({type: 'sorted', index: i});
		}
	}
	return animations;
}

export const getMergeSortAnimations = (array) => {
	const animations = [];
	const auxiliaryArray = array.slice();
	const arrayCopy = array.slice();

	function mergeSort(mainArray, auxArray, start, end, lineOffset = 0) {
		animations.push({type: 'line', line: 1 + lineOffset});
		if (start === end) return;

		const middle = Math.floor((start + end) / 2);
		animations.push({type: 'line', line: 2 + lineOffset});

		mergeSort(auxArray, mainArray, start, middle, lineOffset);
		animations.push({type: 'line', line: 3 + lineOffset});

		mergeSort(auxArray, mainArray, middle + 1, end, lineOffset);
		animations.push({type: 'line', line: 4 + lineOffset});

		merge(mainArray, auxArray, start, middle, end, lineOffset);
	}

	function merge(mainArray, auxArray, start, middle, end, lineOffset) {
		animations.push({type: 'line', line: 8 + lineOffset});
		let i = start;
		let j = middle + 1;
		let k = start;

		while (i <= middle && j <= end) {
			animations.push({type: 'compare', indices: [i, j], line: 16 + lineOffset});

			if (auxArray[i] <= auxArray[j]) {
				animations.push({type: 'overwrite', indices: [k], value: auxArray[i], line: 18 + lineOffset});
				mainArray[k++] = auxArray[i++];
			} else {
				animations.push({type: 'overwrite', indices: [k], value: auxArray[j], line: 21 + lineOffset});
				mainArray[k++] = auxArray[j++];
			}
		}

		while (i <= middle) {
			animations.push({type: 'overwrite', indices: [k], value: auxArray[i], line: 27 + lineOffset});
			mainArray[k++] = auxArray[i++];
		}

		while (j <= end) {
			animations.push({type: 'overwrite', indices: [k], value: auxArray[j], line: 32 + lineOffset});
			mainArray[k++] = auxArray[j++];
		}

		// Mark sorted range
		for (let idx = start; idx <= end; idx++) {
			animations.push({type: 'sorted', index: idx, line: 37 + lineOffset});
		}
	}

	mergeSort(arrayCopy, auxiliaryArray, 0, array.length - 1);
	return animations;
}

export const getInsertionSortAnimations = (array) => {
	const animations = [];
	const n = array.length;
	for (let i = 1; i < n; i++) {
		animations.push({type: 'line', line: 1});
		let key = array[i];
		animations.push({type: 'overwrite', index: i, value: key, line: 2});
		let j = i - 1;
		animations.push({type: 'line', line: 3});
		while (j >= 0 && array[j] > key) {
			animations.push({type: 'compare', indices: [j, i], line: 4});
			animations.push({type: 'overwrite', index: j + 1, value: array[j], line: 5});
			array[j + 1] = array[j];
			j = j - 1;
			animations.push({type: 'line', line: 6});
		}
		animations.push({type: 'overwrite', index: j + 1, value: key, line: 7});
		array[j + 1] = key;
	}
	for (let i = 0; i < n; i++) animations.push({type: 'sorted', index: i});
	return animations;
}

export const getSelectionSortAnimations = (array) => {
	const animations = [];
	const n = array.length;
	for (let i = 0; i < n; i++) {
		animations.push({type: 'line', line: 1});
		let min_idx = i;
		animations.push({type: 'line', line: 2});
		for (let j = i + 1; j < n; j++) {
			animations.push({type: 'compare', indices: [j, min_idx], line: 3});
			if (array[j] < array[min_idx]) {
				animations.push({type: 'line', line: 4});
				min_idx = j;
				animations.push({type: 'line', line: 5});
			}
		}
		animations.push({type: 'swap', indices: [i, min_idx], line: 6});
		[array[i], array[min_idx]] = [array[min_idx], array[i]];
		animations.push({type: 'sorted', index: i, line: 7});
	}
	return animations;
}

export const getHeapSortAnimations = (array) => {
	const animations = [];
	const arrayCopy = [...array];
	const n = arrayCopy.length;

	// Build max heap
	for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
		animations.push({type: 'line', line: 3});
		heapify(arrayCopy, n, i, animations);
	}

	// Extract elements from heap one by one
	for (let i = n - 1; i > 0; i--) {
		animations.push({type: 'line', line: 8});
		// Swap root with last element
		animations.push({type: 'compare', indices: [0, i], line: 9});
		animations.push({type: 'swap', indices: [0, i], line: 10});
		[arrayCopy[0], arrayCopy[i]] = [arrayCopy[i], arrayCopy[0]];

		// Mark current position as sorted
		animations.push({type: 'sorted', index: i, line: 11});

		// Call heapify on reduced heap
		heapify(arrayCopy, i, 0, animations);
	}

	// Mark the first element as sorted
	animations.push({type: 'sorted', index: 0, line: 16});

	return animations;

	const heapify = (arr, heapSize, rootIndex, animations) => {
		animations.push({type: 'line', line: 20});
		let largest = rootIndex;
		const left = 2 * rootIndex + 1;
		const right = 2 * rootIndex + 2;

		// Compare with left child
		if (left < heapSize) {
			animations.push({type: 'compare', indices: [largest, left], line: 24});
			if (arr[left] > arr[largest]) {
				largest = left;
			}
		}

		// Compare with right child
		if (right < heapSize) {
			animations.push({type: 'compare', indices: [largest, right], line: 29});
			if (arr[right] > arr[largest]) {
				largest = right;
			}
		}

		// If largest is not root
		if (largest !== rootIndex) {
			animations.push({type: 'line', line: 34});
			animations.push({type: 'swap', indices: [rootIndex, largest], line: 35});
			[arr[rootIndex], arr[largest]] = [arr[largest], arr[rootIndex]];

			// Recursively heapify the affected sub-tree
			heapify(arr, heapSize, largest, animations);
		}
	}
}
