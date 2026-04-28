export const ALGORITHM_INFO = {
	bubbleSort: {
		name: 'Bubble Sort',
		description:
			'Bubble Sort sammenligner tilstøtende elementer i arrayet og bytter dem hvis de er i feil rekkefølge. Etter hver gjennomgang er det største elementet garantert på sin endelige posisjon. Algoritmen fortsetter å gjøre gjennomganger til ingen bytter er nødvendig, noe som indikerer at arrayet er sortert.',
		intuition:
			'Think of the array as full of small local inversions. Bubble Sort fixes only neighboring inversions, so large values drift right one swap at a time.',
		thoughtProcess:
			'The algorithm asks the same simple question again and again: are these two neighbors in the wrong order? Each pass guarantees that one more large value reaches the sorted suffix.',
		strategy: [
			'Scan adjacent pairs from left to right.',
			'Swap a pair when the left value is larger than the right value.',
			'Treat the end of the array as locked after every pass.',
			'Stop early if a full pass makes no swaps.',
		],
		complexityReason: [
			'In the average and worst case, the algorithm scans prefixes of size n, n - 1, n - 2, and so on, which adds up to quadratic work.',
			'The best case is linear because one no-swap pass proves the array is already sorted.',
			'It only needs a temporary value for swapping, so the extra space is constant.',
		],
		tradeoffs: {
			useWhen: [
				'Teaching adjacent comparisons, swaps, and inversions.',
				'Tiny or already-nearly-sorted inputs where readability matters more than speed.',
			],
			watchOut: [
				'It performs many comparisons on large arrays.',
				'Reversed input causes the maximum number of swaps.',
			],
		},
		complexity: {
			time: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
			space: { worst: 'O(1)' },
		},
		properties: {
			stable: 1,
			inPlace: 1,
		},
		cases: {
			best: 'Det beste tilfellet inntreffer når arrayet allerede er sortert. En enkelt gjennomgang er nok til å bekrefte dette.',
			worst:
				'Det verste tilfellet inntreffer når arrayet er sortert i omvendt rekkefølge. Det krever maksimalt antall bytter og sammenligninger.',
		},
	},
	selectionSort: {
		name: 'Selection Sort',
		description:
			'Selection Sort deler arrayet i en sortert og usortert del. For hver posisjon i den sorterte delen finner algoritmen det minste elementet i den usorterte delen og bytter det med elementet på gjeldende posisjon. Dette fortsetter til hele arrayet er sortert, hvor den sorterte delen vokser med ett element for hver iterasjon.',
		intuition:
			'Selection Sort behaves like repeatedly picking the next smallest card from a messy hand and placing it into a fixed position.',
		thoughtProcess:
			'Instead of making many local repairs, it commits to one position at a time. The cost is that every position still requires a search through the unsorted remainder.',
		strategy: [
			'Split the array into a sorted prefix and an unsorted suffix.',
			'Search the suffix for the smallest remaining value.',
			'Swap that value into the first unsorted position.',
			'Grow the sorted prefix by one element.',
		],
		complexityReason: [
			'Finding the minimum requires scanning the unsorted suffix for every output position.',
			'Those scans have lengths n, n - 1, n - 2, and so on, so best, average, and worst cases are all quadratic.',
			'It swaps at most once per outer pass and uses constant extra space.',
		],
		tradeoffs: {
			useWhen: [
				'You want a simple algorithm with very few writes.',
				'You are teaching the idea of growing a sorted prefix.',
			],
			watchOut: [
				'It does not get faster when the input is already sorted.',
				'The direct swap can move equal values past each other, so it is not stable.',
			],
		},
		complexity: {
			time: { best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)' },
			space: { worst: 'O(1)' },
		},
		properties: {
			stable: 0,
			inPlace: 1,
		},
		cases: {
			best: 'Det beste tilfellet har samme tidskompleksitet som det verste, siden algoritmen alltid må finne minimum i hver runde.',
			worst:
				'Det verste tilfellet inntreffer når arrayet er sortert i omvendt rekkefølge, men tidskompleksiteten forblir O(n²).',
		},
	},
	insertionSort: {
		name: 'Insertion Sort',
		description:
			'Insertion Sort bygger den sorterte listen ett element av gangen ved å ta hvert element fra den usorterte delen og sette det inn på riktig posisjon i den sorterte delen. Den sammenligner det gjeldende elementet med elementene til venstre og flytter dem til høyre til den finner riktig posisjon for innsetting.',
		intuition:
			'Insertion Sort feels like sorting playing cards in your hand: take the next card and slide it left until it fits.',
		thoughtProcess:
			'The sorted prefix is always correct. The algorithm only has to figure out where the next value belongs inside that prefix.',
		strategy: [
			'Assume the first element is a sorted prefix.',
			'Pick the next unsorted value as the key.',
			'Shift larger prefix values one position to the right.',
			'Insert the key into the gap that remains.',
		],
		complexityReason: [
			'Nearly sorted input is cheap because each key usually checks only its immediate predecessor.',
			'Random or reversed input forces many keys to slide across a long prefix, creating quadratic work.',
			'The algorithm rearranges the array in place and only stores the current key.',
		],
		tradeoffs: {
			useWhen: [
				'Inputs are small, nearly sorted, or arriving one item at a time.',
				'You need a stable, in-place comparison sort.',
			],
			watchOut: [
				'Large reversed arrays trigger many shifts.',
				'It is usually a helper inside bigger hybrid sorting algorithms, not the main choice for large data.',
			],
		},
		complexity: {
			time: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
			space: { worst: 'O(1)' },
		},
		properties: {
			stable: 1,
			inPlace: 1,
		},
		cases: {
			best: 'Det beste tilfellet inntreffer når arrayet allerede er sortert. Algoritmen trenger bare å sammenligne hvert element med forgjengeren.',
			worst:
				'Det verste tilfellet inntreffer når arrayet er sortert i omvendt rekkefølge. Hvert element må flyttes til begynnelsen av arrayet.',
		},
	},
	mergeSort: {
		name: 'Merge Sort',
		description:
			'Merge Sort deler arrayet rekursivt i to like store halvdeler til hver del inneholder kun ett element. Deretter fletter den disse halvdelene sammen ved å sammenligne elementer fra hver halvdel og velge det minste til det nye arrayet. Fletteprosessen fortsetter rekursivt oppover til hele arrayet er rekonstruert i sortert rekkefølge.',
		intuition:
			'Merge Sort wins by making the problem boring: split until every piece is already sorted, then merge those pieces in order.',
		thoughtProcess:
			'The hard part of sorting is replaced by two easier habits: divide evenly, then combine two already-sorted lists with a left-vs-right comparison.',
		strategy: [
			'Split the array into two halves until each piece has one value.',
			'Merge neighboring sorted pieces by repeatedly taking the smaller front value.',
			'Copy leftovers when one side runs out.',
			'Keep merging upward until the original range is sorted.',
		],
		complexityReason: [
			'Halving creates about log2(n) levels of recursion.',
			'Each level touches every element once during merging, so the total time is n work per level times log n levels.',
			'Merging needs auxiliary storage for the values being combined, which is why the extra space is linear.',
		],
		tradeoffs: {
			useWhen: [
				'You want predictable O(n log n) time regardless of input order.',
				'Stability matters, such as sorting records by multiple fields.',
			],
			watchOut: [
				'It uses extra memory for merging.',
				'For tiny arrays, the overhead can be larger than simpler sorts.',
			],
		},
		complexity: {
			time: {
				best: 'O(n log n)',
				average: 'O(n log n)',
				worst: 'O(n log n)',
			},
			space: { worst: 'O(n)' },
		},
		properties: {
			stable: 1,
			inPlace: 0,
		},
		cases: {
			best: 'Det beste tilfellet har samme tidskompleksitet som andre tilfeller på grunn av algoritmens konsistente deling og fletting.',
			worst:
				'Det verste tilfellet har også O(n log n) tidskompleksitet, noe som gjør flettesortering forutsigbar i ytelse.',
		},
	},
	quickSort: {
		name: 'Quick Sort',
		description:
			'Quick Sort velger et pivot-element og partisjonerer arrayet slik at alle elementer mindre enn pivot kommer til venstre og alle større elementer kommer til høyre. Pivot plasseres på sin endelige sorterte posisjon. Algoritmen fortsetter rekursivt på venstre og høyre partisjon til alle sub-arrayer inneholder kun ett element.',
		intuition:
			'Quick Sort asks one value to act as a divider: smaller values go left, larger values go right, and the divider lands in its final place.',
		thoughtProcess:
			'The algorithm tries to make progress by doing one linear partition pass, then trusting recursion to solve the two smaller sides.',
		strategy: [
			'Choose a pivot value.',
			'Partition the range so smaller values are before the pivot and larger values are after it.',
			'The pivot is now fixed.',
			'Repeat the same idea on the left and right partitions.',
		],
		complexityReason: [
			'A partition pass scans the current range once.',
			'Balanced pivots create about log2(n) recursive levels, giving O(n log n) time.',
			'Bad pivots create one huge side and one tiny side, causing n levels and O(n²) time.',
			'Recursive calls use stack space: about O(log n) when balanced, but O(n) in the worst case.',
		],
		tradeoffs: {
			useWhen: [
				'You want a fast average-case in-place sort.',
				'Memory use matters more than stability.',
			],
			watchOut: [
				'Poor pivot choices can degrade to quadratic time.',
				'It is not stable unless implemented with extra machinery.',
			],
		},
		complexity: {
			time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)' },
			space: { worst: 'O(n)' },
		},
		properties: {
			stable: 0,
			inPlace: 1,
		},
		cases: {
			best: 'Det beste tilfellet inntreffer når pivot-elementet alltid er medianen av arrayet, noe som fører til perfekt balanserte partisjoner.',
			worst:
				'Det verste tilfellet inntreffer når pivot alltid er det minste eller største elementet, noe som fører til ubalanserte partisjoner og degradering til O(n²).',
		},
	},
	heapSort: {
		name: 'Heap Sort',
		description:
			'Heap Sort bygger først en max-heap fra arrayet hvor hver foreldre-node er større enn sine barn. Deretter fjerner den gjentatte ganger det største elementet (roten) fra heap, plasserer det på slutten av arrayet, og gjenoppbygger heap-egenskapen for de gjenværende elementene. Dette fortsetter til heap er tom og arrayet er sortert.',
		intuition:
			'Heap Sort turns the array into a tournament where the largest remaining value is always at the root and ready to be removed.',
		thoughtProcess:
			'First build a structure that makes the maximum cheap to find. Then repeatedly move that maximum to the sorted end and repair the heap.',
		strategy: [
			'Arrange the array as a max-heap.',
			'Swap the root with the last unsorted element.',
			'Shrink the heap so the moved maximum stays fixed.',
			'Heapify the root to restore parent-greater-than-children order.',
		],
		complexityReason: [
			'Building the heap can be done in linear time.',
			'Each of n extractions may push a value down the heap height, which is O(log n).',
			'The extraction phase dominates, so best, average, and worst cases are O(n log n).',
			'The heap is stored inside the array, so extra space stays constant.',
		],
		tradeoffs: {
			useWhen: [
				'You need guaranteed O(n log n) time with O(1) extra space.',
				'You want to teach the connection between heaps and priority queues.',
			],
			watchOut: [
				'It is not stable.',
				'Its memory access pattern is less cache-friendly than some alternatives.',
			],
		},
		complexity: {
			time: {
				best: 'O(n log n)',
				average: 'O(n log n)',
				worst: 'O(n log n)',
			},
			space: { worst: 'O(1)' },
		},
		properties: {
			stable: 0,
			inPlace: 1,
		},
		cases: {
			best: 'Det beste tilfellet har samme tidskompleksitet som andre tilfeller på grunn av heap-operasjonenes natur.',
			worst:
				'Det verste tilfellet opprettholder O(n log n) ytelse, noe som gjør haugsortering til et pålitelig valg for kritiske applikasjoner.',
		},
	},
	countingSort: {
		name: 'Counting Sort',
		description:
			'Counting Sort oppretter et hjelpende array for å telle frekvensen av hvert element i input-arrayet. Den itererer gjennom input-arrayet og inkrementerer telleren for hvert element. Deretter rekonstruerer den det sorterte arrayet ved å iterere gjennom telling-arrayet og plassere hvert element det antallet ganger det forekom.',
		intuition:
			'Counting Sort avoids comparisons entirely. If values are small integers, just count how many of each value exists and play the counts back in order.',
		thoughtProcess:
			'The algorithm trades comparison work for direct addressing. The value itself becomes an index into a frequency table.',
		strategy: [
			'Find the value range.',
			'Create a count slot for every possible value.',
			'Count how often each value appears.',
			'Reconstruct the sorted array by walking the count table from low to high.',
		],
		complexityReason: [
			'Counting the input costs O(n).',
			'Scanning the count table costs O(k), where k is the size of the value range.',
			'The total time is O(n + k), and the count table uses O(k) extra space.',
		],
		tradeoffs: {
			useWhen: [
				'Values are non-negative integers in a small range.',
				'You want linear time and can afford a count table.',
			],
			watchOut: [
				'It is inefficient when the value range is much larger than the number of items.',
				'It does not directly handle arbitrary objects or negative values without adaptation.',
			],
		},
		complexity: {
			time: { best: 'O(n + k)', average: 'O(n + k)', worst: 'O(n + k)' },
			space: { worst: 'O(k)' },
		},
		properties: {
			stable: 1,
			inPlace: 0,
		},
		cases: {
			best: 'Det beste tilfellet inntreffer når området av verdier (k) er lite sammenlignet med antall elementer (n).',
			worst:
				'Det verste tilfellet inntreffer når området av verdier er svært stort, noe som krever mye ekstra minne for tellearrayet.',
		},
	},
	radixSort: {
		name: 'Radix Sort',
		description:
			'Radix Sort sorterer elementene ved å prosessere hvert siffer individuelt fra høyre til venstre (minst til mest signifikant). For hvert siffer-posisjon bruker den en stabil sorteringsalgoritme (vanligvis counting sort) for å sortere elementene basert på det gjeldende sifferet. Dette sikrer at rekkefølgen fra tidligere siffer-sorteringer bevares.',
		intuition:
			'Radix Sort sorts numbers the way a filing system might: group by one digit, keep the order stable, then move to the next digit.',
		thoughtProcess:
			'Instead of comparing whole numbers, it repeatedly sorts by a smaller key. Stability preserves the meaning of previous digit passes.',
		strategy: [
			'Start with the least significant digit.',
			'Bucket or counting-sort values by that digit.',
			'Collect values in stable order.',
			'Repeat for the next digit until all digits have been processed.',
		],
		complexityReason: [
			'Each digit pass costs O(n + k): n values plus k possible digit buckets.',
			'There are d digit positions, so the total time is O(d x (n + k)).',
			'The stable digit pass needs output storage and buckets, giving O(n + k) space.',
		],
		tradeoffs: {
			useWhen: [
				'Keys are integers or fixed-width strings with a manageable number of digits.',
				'You want to show how stable sub-sorts compose into a full sort.',
			],
			watchOut: [
				'Many digits increase the number of passes.',
				'It depends on a stable inner sorting step.',
			],
		},
		complexity: {
			time: {
				best: 'O(d × (n + k))',
				average: 'O(d × (n + k))',
				worst: 'O(d × (n + k))',
			},
			space: { worst: 'O(n + k)' },
		},
		properties: {
			stable: 1,
			inPlace: 0,
		},
		cases: {
			best: 'Det beste tilfellet inntreffer når tallene har få siffer (liten d) og sifferområdet er begrenset (liten k).',
			worst:
				'Det verste tilfellet inntreffer når tallene har mange siffer, noe som øker antall gjennomganger som trengs.',
		},
	},
	bucketSort: {
		name: 'Bucket Sort',
		description:
			'Bucket Sort fordeler elementene i flere bøtter (sub-arrayer) basert på elementenes verdier. Hvert element plasseres i en bøtte ved å beregne en bøtte-indeks fra elementets verdi. Deretter sorteres hver bøtte individuelt med en annen sorteringsalgoritme, og til slutt settes alle sorterte bøtter sammen til det endelige sorterte arrayet.',
		intuition:
			'Bucket Sort assumes values can be spread into neighborhoods. If each neighborhood is small, sorting inside each one becomes cheap.',
		thoughtProcess:
			'The algorithm tries to use distribution to reduce comparison work: place similar values together, sort locally, then concatenate globally.',
		strategy: [
			'Create buckets that cover ranges of values.',
			'Send each value to the bucket matching its range.',
			'Sort each bucket independently.',
			'Concatenate buckets from lowest range to highest range.',
		],
		complexityReason: [
			'Distributing and collecting values costs O(n + k), where k is the number of buckets.',
			'If values are evenly spread, each bucket is small and local sorting is cheap.',
			'If many values land in one bucket, the algorithm falls back to the cost of sorting that large bucket, often O(n²).',
			'Buckets store the input values plus bucket structure, so space is O(n + k).',
		],
		tradeoffs: {
			useWhen: [
				'Input values are roughly uniformly distributed.',
				'You want to show how distribution can reduce sorting work.',
			],
			watchOut: [
				'Skewed data can collapse into one expensive bucket.',
				'Choosing bucket ranges poorly can erase the advantage.',
			],
		},
		complexity: {
			time: { best: 'O(n + k)', average: 'O(n + k)', worst: 'O(n²)' },
			space: { worst: 'O(n + k)' },
		},
		properties: {
			stable: 1,
			inPlace: 0,
		},
		cases: {
			best: 'Det beste tilfellet inntreffer når elementene er jevnt distribuert mellom bøttene, noe som minimerer arbeidet i hver bøtte.',
			worst:
				'Det verste tilfellet inntreffer når alle elementene havner i samme bøtte, noe som degraderer til ytelsen til den interne sorteringsalgoritmen.',
		},
	},
};

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

// In mergeSort.js - replace the existing function
export function getMergeSortStepsWithStats(array) {
	const arr = [...array];
	const n = arr.length;
	let comparisons = 0;
	let swaps = 0;
	const steps = [];

	const createStats = () => ({
		comparisons,
		swaps,
		arraySize: n,
		totalOperations: comparisons + swaps,
	});

	steps.push({
		array: [...arr],
		comparing: [],
		swapping: [],
		sorted: [],
		line: null,
		stats: createStats(),
		metadata: { phase: 'initializing' },
	});

	function merge(mainArray, start, middle, end, auxArray, level) {
		let k = start,
			i = start,
			j = middle + 1;

		// Add merge metadata with target and source ranges
		steps.push({
			array: [...mainArray],
			comparing: [],
			swapping: [],
			sorted: [],
			line: 8,
			stats: createStats(),
			metadata: {
				phase: 'merging',
				target: [start, end],
				left: [start, middle],
				right: [middle + 1, end],
				level,
				leftArray: auxArray.slice(start, middle + 1),
				rightArray: auxArray.slice(middle + 1, end + 1),
			},
		});

		while (i <= middle && j <= end) {
			comparisons++;
			if (auxArray[i] <= auxArray[j]) {
				swaps++;
				mainArray[k++] = auxArray[i++];
			} else {
				swaps++;
				mainArray[k++] = auxArray[j++];
			}

			steps.push({
				array: [...mainArray],
				comparing: [i - 1, j - 1].filter(idx => idx >= 0),
				swapping: [k - 1],
				sorted: [],
				line: 11,
				stats: createStats(),
				metadata: {
					phase: 'merging',
					target: [start, end],
					left: [start, middle],
					right: [middle + 1, end],
					level,
					leftArray: auxArray.slice(start, middle + 1),
					rightArray: auxArray.slice(middle + 1, end + 1),
				},
			});
		}

		while (i <= middle) {
			swaps++;
			mainArray[k++] = auxArray[i++];
		}
		while (j <= end) {
			swaps++;
			mainArray[k++] = auxArray[j++];
		}
	}

	function mergeSortHelper(mainArray, start, end, auxArray, level) {
		if (start >= end) return;

		const middle = Math.floor((start + end) / 2);

		// Add dividing metadata with range and children
		steps.push({
			array: [...mainArray],
			comparing: [],
			swapping: [],
			sorted: [],
			line: 3,
			stats: createStats(),
			metadata: {
				phase: 'dividing',
				range: [start, end],
				left: [start, middle],
				right: [middle + 1, end],
				level,
			},
		});

		mergeSortHelper(auxArray, start, middle, mainArray, level + 1);
		mergeSortHelper(auxArray, middle + 1, end, mainArray, level + 1);
		merge(mainArray, start, middle, end, auxArray, level);
	}

	mergeSortHelper(arr, 0, n - 1, arr.slice(), 0);

	const finalStats = createStats();
	steps.push({
		array: [...arr],
		comparing: [],
		swapping: [],
		sorted: Array.from({ length: n }, (_, k) => k),
		line: null,
		stats: finalStats,
		metadata: { phase: 'completed' },
	});

	return { steps, finalStats };
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
