export const PSEUDO_CODE = {
	bubbleSort: [
		'for i from 0 to n-1',
		'  for j from 0 to n-i-2',
		'    if array[j] > array[j+1]',
		'      swap(array[j], array[j+1])',
		'  mark array[n-i-1] as sorted',
	],
	selectionSort: [
		'for i from 0 to n-1:',
		'  min_index = i',
		'  for j from i+1 to n-1:',
		'    if array[j] < array[min_index]:',
		'      min_index = j',
		'  swap(array[i], array[min_index])',
		'  mark array[i] as sorted',
	],
	insertionSort: [
		'for i from 1 to n-1:',
		'  key = array[i]',
		'  j = i - 1',
		'  while j >= 0 and array[j] > key:',
		'    array[j+1] = array[j] (shift right)',
		'    j = j - 1',
		'  array[j+1] = key (insert)',
	],
	mergeSort: [
		'// Recursive function to split the array',
		'function mergeSort(array, left, right)',
		'  if left < right:',
		'    mid = floor((left + right) / 2)',
		'    mergeSort(array, left, mid)',
		'    mergeSort(array, mid + 1, right)',
		'    merge(array, left, mid, right)',
		'',
		'// Function to merge two sorted halves',
		'function merge(left_half, right_half)',
		'  while elements remain in both halves:',
		'    compare elements and copy smaller to main array',
		'  copy any remaining elements',
	],
	quickSort: [
		'function quickSort(array, low, high)',
		'  if low < high:',
		'    pivot_index = partition(array, low, high)',
		'    quickSort(array, low, pivot_index - 1)',
		'    quickSort(array, pivot_index + 1, high)',
		'',
		'function partition(array, low, high)',
		'  pivot = array[high]',
		'  i = low - 1',
		'  for j from low to high-1:',
		'    if array[j] < pivot:',
		'      i++',
		'      swap(array[i], array[j])',
		'  swap(array[i+1], array[high])',
		'  return i+1 (pivot_index)',
	],
	heapSort: [
		'buildMaxHeap(array)',
		'for i from n-1 down to 1:',
		'  swap(array[0], array[i])',
		'  mark array[i] as sorted',
		'  heapify(array, i, 0)',
	],
	countingSort: [
		'// Note: Works for non-negative integers',
		'find the maximum value (max) in the array',
		'create a count array of size max+1, initialized to zeros',
		'for each element in the input array:',
		'  increment count[element]',
		'clear the input array',
		'for i from 0 to max:',
		'  while count[i] > 0:',
		'    add i to the input array',
		'    decrement count[i]',
	],
	radixSort: [
		'// Note: Works for non-negative integers',
		'find the maximum value (max) in the array',
		'exp = 1 // Represents the current digit place (1s, 10s, 100s...)',
		'while max / exp > 0:',
		'  perform a stable sort (like counting sort) on the array',
		'  based on the digit at the current exponent (exp)',
		'  exp = exp * 10',
	],
	bucketSort: [
		'// Note: Assumes input is uniformly distributed',
		'create n empty buckets (where n is array size)',
		'find the maximum value (max) in the array',
		'for each element in the input array:',
		'  calculate bucket_index for the element',
		'  place element into buckets[bucket_index]',
		'for each bucket:',
		'  sort the bucket (e.g., using insertion sort)',
		'concatenate all sorted buckets back into the original array',
	],
};

export function getBubbleSortSteps(array) {
	const arr = [...array];
	const steps = [
		{
			array: [...arr],
			comparing: [],
			swapping: [],
			sorted: [],
			line: null,
		},
	];
	const n = arr.length;
	let sortedCount = 0;

	for (let i = 0; i < n - 1; i++) {
		steps.push({
			array: [...arr],
			comparing: [],
			swapping: [],
			sorted: Array.from({ length: sortedCount }, (_, k) => n - 1 - k),
			line: 1,
		});
		for (let j = 0; j < n - i - 1; j++) {
			steps.push({
				array: [...arr],
				comparing: [j, j + 1],
				swapping: [],
				sorted: Array.from({ length: sortedCount }, (_, k) => n - 1 - k),
				line: 2,
			});
			if (arr[j] > arr[j + 1]) {
				steps.push({
					array: [...arr],
					comparing: [j, j + 1],
					swapping: [],
					sorted: Array.from({ length: sortedCount }, (_, k) => n - 1 - k),
					line: 3,
				});
				[arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
				steps.push({
					array: [...arr],
					comparing: [],
					swapping: [j, j + 1],
					sorted: Array.from({ length: sortedCount }, (_, k) => n - 1 - k),
					line: 4,
				});
			}
		}
		sortedCount++;
		steps.push({
			array: [...arr],
			comparing: [],
			swapping: [],
			sorted: Array.from({ length: sortedCount }, (_, k) => n - 1 - k),
			line: 5,
		});
	}
	steps.push({
		array: [...arr],
		comparing: [],
		swapping: [],
		sorted: Array.from({ length: n }, (_, k) => k),
		line: null,
	});
	return steps;
}

export function getSelectionSortSteps(array) {
	const arr = [...array];
	const steps = [
		{
			array: [...arr],
			comparing: [],
			swapping: [],
			sorted: [],
			line: null,
		},
	];
	const n = arr.length;

	for (let i = 0; i < n - 1; i++) {
		steps.push({
			array: [...arr],
			comparing: [],
			swapping: [],
			sorted: Array.from({ length: i }, (_, k) => k),
			line: 1,
		});
		let minIdx = i;
		steps.push({
			array: [...arr],
			comparing: [i],
			swapping: [],
			sorted: Array.from({ length: i }, (_, k) => k),
			line: 2,
		});
		for (let j = i + 1; j < n; j++) {
			steps.push({
				array: [...arr],
				comparing: [j, minIdx],
				swapping: [],
				sorted: Array.from({ length: i }, (_, k) => k),
				line: 3,
			});
			if (arr[j] < arr[minIdx]) {
				steps.push({
					array: [...arr],
					comparing: [j, minIdx],
					swapping: [],
					sorted: Array.from({ length: i }, (_, k) => k),
					line: 4,
				});
				minIdx = j;
				steps.push({
					array: [...arr],
					comparing: [minIdx],
					swapping: [],
					sorted: Array.from({ length: i }, (_, k) => k),
					line: 5,
				});
			}
		}
		if (minIdx !== i) {
			steps.push({
				array: [...arr],
				comparing: [],
				swapping: [i, minIdx],
				sorted: Array.from({ length: i }, (_, k) => k),
				line: 6,
			});
			[arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
		}
		steps.push({
			array: [...arr],
			comparing: [],
			swapping: [],
			sorted: Array.from({ length: i + 1 }, (_, k) => k),
			line: 7,
		});
	}
	steps.push({
		array: [...arr],
		comparing: [],
		swapping: [],
		sorted: Array.from({ length: n }, (_, k) => k),
		line: null,
	});
	return steps;
}

export function getInsertionSortSteps(array) {
	const arr = [...array];
	const steps = [
		{
			array: [...arr],
			comparing: [],
			swapping: [],
			sorted: [],
			line: null,
		},
	];
	const n = arr.length;
	let sortedCount = 1;

	for (let i = 1; i < n; i++) {
		steps.push({
			array: [...arr],
			comparing: [],
			swapping: [],
			sorted: Array.from({ length: sortedCount }, (_, k) => k),
			line: 1,
		});
		let key = arr[i];
		let j = i - 1;
		steps.push({
			array: [...arr],
			comparing: [i],
			swapping: [],
			sorted: Array.from({ length: sortedCount }, (_, k) => k),
			line: 2,
		});
		steps.push({
			array: [...arr],
			comparing: [i],
			swapping: [],
			sorted: Array.from({ length: sortedCount }, (_, k) => k),
			line: 3,
		});

		while (j >= 0 && arr[j] > key) {
			steps.push({
				array: [...arr],
				comparing: [j, i],
				swapping: [],
				sorted: Array.from({ length: sortedCount }, (_, k) => k),
				line: 4,
			});
			arr[j + 1] = arr[j];
			steps.push({
				array: [...arr],
				comparing: [],
				swapping: [j, j + 1],
				sorted: Array.from({ length: sortedCount }, (_, k) => k),
				line: 5,
			});
			j = j - 1;
			steps.push({
				array: [...arr],
				comparing: [i],
				swapping: [],
				sorted: Array.from({ length: sortedCount }, (_, k) => k),
				line: 6,
			});
		}
		arr[j + 1] = key;
		steps.push({
			array: [...arr],
			comparing: [],
			swapping: [j + 1],
			sorted: Array.from({ length: sortedCount }, (_, k) => k),
			line: 7,
		});
		sortedCount++;
	}
	steps.push({
		array: [...arr],
		comparing: [],
		swapping: [],
		sorted: Array.from({ length: n }, (_, k) => k),
		line: null,
	});
	return steps;
}

export function getMergeSortSteps(array) {
	const arr = [...array];
	const steps = [
		{
			array: [...arr],
			comparing: [],
			swapping: [],
			sorted: [],
			line: null,
		},
	];

	function merge(mainArray, startIdx, middleIdx, endIdx, auxiliaryArray) {
		let k = startIdx;
		let i = startIdx;
		let j = middleIdx + 1;
		steps.push({
			array: [...mainArray],
			comparing: Array.from(
				{ length: endIdx - startIdx + 1 },
				(_, x) => startIdx + x
			),
			swapping: [],
			sorted: [],
			line: 10,
		});

		while (i <= middleIdx && j <= endIdx) {
			steps.push({
				array: [...mainArray],
				comparing: [i, j],
				swapping: [],
				sorted: [],
				line: 12,
			});
			if (auxiliaryArray[i] <= auxiliaryArray[j]) {
				steps.push({
					array: [...mainArray],
					comparing: [i, j],
					swapping: [k],
					sorted: [],
					line: 13,
				});
				mainArray[k++] = auxiliaryArray[i++];
			} else {
				steps.push({
					array: [...mainArray],
					comparing: [i, j],
					swapping: [k],
					sorted: [],
					line: 13,
				});
				mainArray[k++] = auxiliaryArray[j++];
			}
		}
		while (i <= middleIdx) {
			steps.push({
				array: [...mainArray],
				comparing: [i],
				swapping: [k],
				sorted: [],
				line: 14,
			});
			mainArray[k++] = auxiliaryArray[i++];
		}
		while (j <= endIdx) {
			steps.push({
				array: [...mainArray],
				comparing: [j],
				swapping: [k],
				sorted: [],
				line: 14,
			});
			mainArray[k++] = auxiliaryArray[j++];
		}
	}

	function mergeSortHelper(mainArray, startIdx, endIdx, auxiliaryArray) {
		if (startIdx === endIdx) return;
		steps.push({
			array: [...mainArray],
			comparing: [],
			swapping: [],
			sorted: [],
			line: 2,
		});
		steps.push({
			array: [...mainArray],
			comparing: [],
			swapping: [],
			sorted: [],
			line: 3,
		});
		const middleIdx = Math.floor((startIdx + endIdx) / 2);
		steps.push({
			array: [...mainArray],
			comparing: [],
			swapping: [],
			sorted: [],
			line: 4,
		});
		mergeSortHelper(auxiliaryArray, startIdx, middleIdx, mainArray);
		steps.push({
			array: [...mainArray],
			comparing: [],
			swapping: [],
			sorted: [],
			line: 5,
		});
		mergeSortHelper(auxiliaryArray, middleIdx + 1, endIdx, mainArray);
		steps.push({
			array: [...mainArray],
			comparing: [],
			swapping: [],
			sorted: [],
			line: 6,
		});
		merge(mainArray, startIdx, middleIdx, endIdx, auxiliaryArray);
		steps.push({
			array: [...mainArray],
			comparing: [],
			swapping: [],
			sorted: [],
			line: 7,
		});
	}

	mergeSortHelper(arr, 0, arr.length - 1, arr.slice());
	steps.push({
		array: [...arr],
		comparing: [],
		swapping: [],
		sorted: Array.from({ length: arr.length }, (_, k) => k),
		line: null,
	});
	return steps;
}

export function getQuickSortSteps(array) {
	const arr = [...array];
	const steps = [
		{
			array: [...arr],
			comparing: [],
			swapping: [],
			sorted: [],
			line: null,
		},
	];
	const sortedTracker = new Set();

	function partition(low, high) {
		steps.push({
			array: [...arr],
			comparing: [],
			swapping: [],
			sorted: [...sortedTracker],
			line: 7,
		});
		const pivot = arr[high];
		steps.push({
			array: [...arr],
			comparing: [high],
			swapping: [],
			sorted: [...sortedTracker],
			line: 8,
		});
		let i = low - 1;

		for (let j = low; j < high; j++) {
			steps.push({
				array: [...arr],
				comparing: [j, high],
				swapping: [],
				sorted: [...sortedTracker],
				line: 10,
			});
			if (arr[j] < pivot) {
				steps.push({
					array: [...arr],
					comparing: [j, high],
					swapping: [],
					sorted: [...sortedTracker],
					line: 11,
				});
				i++;
				steps.push({
					array: [...arr],
					comparing: [j, high],
					swapping: [],
					sorted: [...sortedTracker],
					line: 12,
				});
				[arr[i], arr[j]] = [arr[j], arr[i]];
				steps.push({
					array: [...arr],
					comparing: [],
					swapping: [i, j],
					sorted: [...sortedTracker],
					line: 13,
				});
			}
		}
		[arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
		steps.push({
			array: [...arr],
			comparing: [],
			swapping: [i + 1, high],
			sorted: [...sortedTracker],
			line: 14,
		});
		sortedTracker.add(i + 1);
		steps.push({
			array: [...arr],
			comparing: [],
			swapping: [],
			sorted: [...sortedTracker],
			line: 15,
		});
		return i + 1;
	}

	function quickSortHelper(low, high) {
		if (low < high) {
			steps.push({
				array: [...arr],
				comparing: [],
				swapping: [],
				sorted: [...sortedTracker],
				line: 2,
			});
			const pivotIndex = partition(low, high);
			steps.push({
				array: [...arr],
				comparing: [],
				swapping: [],
				sorted: [...sortedTracker],
				line: 3,
			});
			quickSortHelper(low, pivotIndex - 1);
			steps.push({
				array: [...arr],
				comparing: [],
				swapping: [],
				sorted: [...sortedTracker],
				line: 4,
			});
			quickSortHelper(pivotIndex + 1, high);
			steps.push({
				array: [...arr],
				comparing: [],
				swapping: [],
				sorted: [...sortedTracker],
				line: 5,
			});
		} else if (low === high) {
			sortedTracker.add(low);
		}
	}

	quickSortHelper(0, arr.length - 1);
	steps.push({
		array: [...arr],
		comparing: [],
		swapping: [],
		sorted: Array.from({ length: arr.length }, (_, k) => k),
		line: null,
	});
	return steps;
}

export function getHeapSortSteps(array) {
	const arr = [...array];
	const n = arr.length;
	const steps = [
		{
			array: [...arr],
			comparing: [],
			swapping: [],
			sorted: [],
			line: null,
		},
	];
	let sortedCount = 0;

	function heapify(size, i) {
		let largest = i;
		const left = 2 * i + 1;
		const right = 2 * i + 2;

		if (left < size) {
			steps.push({
				array: [...arr],
				comparing: [left, largest],
				swapping: [],
				sorted: Array.from({ length: sortedCount }, (_, k) => n - 1 - k),
			});
			if (arr[left] > arr[largest]) largest = left;
		}
		if (right < size) {
			steps.push({
				array: [...arr],
				comparing: [right, largest],
				swapping: [],
				sorted: Array.from({ length: sortedCount }, (_, k) => n - 1 - k),
			});
			if (arr[right] > arr[largest]) largest = right;
		}
		if (largest !== i) {
			[arr[i], arr[largest]] = [arr[largest], arr[i]];
			steps.push({
				array: [...arr],
				comparing: [],
				swapping: [i, largest],
				sorted: Array.from({ length: sortedCount }, (_, k) => n - 1 - k),
			});
			heapify(size, largest);
		}
	}

	steps.push({
		array: [...arr],
		comparing: [],
		swapping: [],
		sorted: [],
		line: 1,
	});
	for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
		heapify(n, i);
	}

	for (let i = n - 1; i > 0; i--) {
		steps.push({
			array: [...arr],
			comparing: [],
			swapping: [],
			sorted: Array.from({ length: sortedCount }, (_, k) => n - 1 - k),
			line: 2,
		});
		[arr[0], arr[i]] = [arr[i], arr[0]];
		steps.push({
			array: [...arr],
			comparing: [],
			swapping: [0, i],
			sorted: Array.from({ length: sortedCount }, (_, k) => n - 1 - k),
			line: 3,
		});
		sortedCount++;
		steps.push({
			array: [...arr],
			comparing: [],
			swapping: [],
			sorted: Array.from({ length: sortedCount }, (_, k) => n - 1 - k),
			line: 4,
		});
		heapify(i, 0);
		steps.push({
			array: [...arr],
			comparing: [],
			swapping: [],
			sorted: Array.from({ length: sortedCount }, (_, k) => n - 1 - k),
			line: 5,
		});
	}
	steps.push({
		array: [...arr],
		comparing: [],
		swapping: [],
		sorted: Array.from({ length: arr.length }, (_, k) => k),
		line: null,
	});
	return steps;
}

export function getCountingSortSteps(array) {
	const arr = [...array];
	const n = arr.length;
	const steps = [
		{
			array: [...arr],
			comparing: [],
			swapping: [],
			sorted: [],
			line: null,
		},
	];
	if (n === 0) return steps;

	steps.push({
		array: [...arr],
		comparing: Array.from({ length: n }, (_, k) => k),
		swapping: [],
		sorted: [],
		line: 2,
	});
	const max = Math.max(...arr);
	const count = new Array(max + 1).fill(0);

	steps.push({
		array: [...arr],
		comparing: [],
		swapping: [],
		sorted: [],
		line: 3,
	});
	for (let i = 0; i < n; i++) {
		steps.push({
			array: [...arr],
			comparing: [i],
			swapping: [],
			sorted: [],
			line: 4,
		});
		count[arr[i]]++;
		steps.push({
			array: [...arr],
			comparing: [i],
			swapping: [],
			sorted: [],
			line: 5,
		});
	}

	let sortedIndex = 0;
	steps.push({
		array: [...arr],
		comparing: [],
		swapping: [],
		sorted: [],
		line: 6,
	});
	for (let i = 0; i <= max; i++) {
		steps.push({
			array: [...arr],
			comparing: [],
			swapping: [],
			sorted: Array.from({ length: sortedIndex }, (_, k) => k),
			line: 7,
		});
		while (count[i] > 0) {
			steps.push({
				array: [...arr],
				comparing: [],
				swapping: [],
				sorted: Array.from({ length: sortedIndex }, (_, k) => k),
				line: 8,
			});
			arr[sortedIndex] = i;
			steps.push({
				array: [...arr],
				comparing: [],
				swapping: [sortedIndex],
				sorted: Array.from({ length: sortedIndex }, (_, k) => k),
				line: 9,
			});
			count[i]--;
			sortedIndex++;
			steps.push({
				array: [...arr],
				comparing: [],
				swapping: [],
				sorted: Array.from({ length: sortedIndex }, (_, k) => k),
				line: 10,
			});
		}
	}
	steps.push({
		array: [...arr],
		comparing: [],
		swapping: [],
		sorted: Array.from({ length: n }, (_, k) => k),
		line: null,
	});
	return steps;
}

export function getRadixSortSteps(array) {
	const arr = [...array];
	const n = arr.length;
	const steps = [
		{
			array: [...arr],
			comparing: [],
			swapping: [],
			sorted: [],
			line: null,
		},
	];
	if (n === 0) return steps;

	steps.push({
		array: [...arr],
		comparing: Array.from({ length: n }, (_, k) => k),
		swapping: [],
		sorted: [],
		line: 2,
	});
	const max = Math.max(...arr);

	for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
		steps.push({
			array: [...arr],
			comparing: [],
			swapping: [],
			sorted: [],
			line: 4,
		});
		const output = new Array(n);
		const count = new Array(10).fill(0);
		steps.push({
			array: [...arr],
			comparing: [],
			swapping: [],
			sorted: [],
			line: 5,
		});

		for (let i = 0; i < n; i++) {
			const digit = Math.floor(arr[i] / exp) % 10;
			count[digit]++;
		}

		for (let i = 1; i < 10; i++) {
			count[i] += count[i - 1];
		}

		for (let i = n - 1; i >= 0; i--) {
			const digit = Math.floor(arr[i] / exp) % 10;
			output[count[digit] - 1] = arr[i];
			count[digit]--;
		}

		for (let i = 0; i < n; i++) {
			arr[i] = output[i];
		}
		steps.push({
			array: [...arr],
			comparing: [],
			swapping: Array.from({ length: n }, (_, k) => k),
			sorted: [],
			line: 6,
		});
		steps.push({
			array: [...arr],
			comparing: [],
			swapping: [],
			sorted: [],
			line: 7,
		});
	}
	steps.push({
		array: [...arr],
		comparing: [],
		swapping: [],
		sorted: Array.from({ length: n }, (_, k) => k),
		line: null,
	});
	return steps;
}

export function getBucketSortSteps(array) {
	const arr = [...array];
	const n = arr.length;
	const steps = [
		{
			array: [...arr],
			comparing: [],
			swapping: [],
			sorted: [],
			line: null,
		},
	];
	if (n === 0) return steps;

	steps.push({
		array: [...arr],
		comparing: [],
		swapping: [],
		sorted: [],
		line: 2,
	});
	const bucketCount = Math.floor(Math.sqrt(n)) || 1;
	const buckets = new Array(bucketCount);
	for (let i = 0; i < bucketCount; i++) {
		buckets[i] = [];
	}

	steps.push({
		array: [...arr],
		comparing: Array.from({ length: n }, (_, k) => k),
		swapping: [],
		sorted: [],
		line: 3,
	});
	const max = Math.max(...arr, 0);

	for (let i = 0; i < n; i++) {
		steps.push({
			array: [...arr],
			comparing: [i],
			swapping: [],
			sorted: [],
			line: 4,
		});
		const bucketIndex = Math.floor(((bucketCount - 1) * arr[i]) / max);
		steps.push({
			array: [...arr],
			comparing: [i],
			swapping: [],
			sorted: [],
			line: 5,
		});
		buckets[bucketIndex].push(arr[i]);
		steps.push({
			array: [...arr],
			comparing: [i],
			swapping: [],
			sorted: [],
			line: 6,
		});
	}

	let currentIndex = 0;
	for (let i = 0; i < bucketCount; i++) {
		steps.push({
			array: [...arr],
			comparing: [],
			swapping: [],
			sorted: Array.from({ length: currentIndex }, (_, k) => k),
			line: 7,
		});

		const bucket = buckets[i];
		for (let k = 1; k < bucket.length; k++) {
			let key = bucket[k];
			let l = k - 1;
			while (l >= 0 && bucket[l] > key) {
				bucket[l + 1] = bucket[l];
				l = l - 1;
			}
			bucket[l + 1] = key;
		}
		steps.push({
			array: [...arr],
			comparing: [],
			swapping: [],
			sorted: Array.from({ length: currentIndex }, (_, k) => k),
			line: 8,
		});

		for (let j = 0; j < buckets[i].length; j++) {
			arr[currentIndex] = buckets[i][j];
			steps.push({
				array: [...arr],
				comparing: [],
				swapping: [currentIndex],
				sorted: Array.from({ length: currentIndex }, (_, k) => k),
				line: 9,
			});
			currentIndex++;
		}
	}

	steps.push({
		array: [...arr],
		comparing: [],
		swapping: [],
		sorted: Array.from({ length: n }, (_, k) => k),
		line: null,
	});
	return steps;
}
