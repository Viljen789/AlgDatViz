import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion as Motion } from 'framer-motion';
import { lazy, Suspense, useEffect } from 'react';
import Sidebar from './common/Sidebar/Sidebar.jsx';
import { TOPIC_BY_ROUTE } from './data/curriculum.js';
import styles from './App.module.css';

const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const FoundationsPage = lazy(() => import('./pages/FoundationsPage.jsx'));
const GraphPage = lazy(() => import('./pages/GraphPage.jsx'));
const HashMapPage = lazy(() => import('./pages/HashMapPage.jsx'));
const TreePage = lazy(() => import('./pages/TreePage.jsx'));
const MasterTheoremPage = lazy(() => import('./pages/MasterTheoremPage.jsx'));
const StacksQueuesPage = lazy(() => import('./pages/StacksQueuesPage.jsx'));
const StrategiesPage = lazy(() => import('./pages/StrategiesPage.jsx'));
const LinearTimeSortingPage = lazy(
	() => import('./pages/LinearTimeSortingPage.jsx')
);
const HeapsPage = lazy(() => import('./pages/HeapsPage.jsx'));
const MstPage = lazy(() => import('./pages/MstPage.jsx'));
const ShortestPathsPage = lazy(() => import('./pages/ShortestPathsPage.jsx'));
const AllPairsShortestPathsPage = lazy(
	() => import('./pages/AllPairsShortestPathsPage.jsx')
);
const MaxFlowPage = lazy(() => import('./pages/MaxFlowPage.jsx'));
const NpCompletenessPage = lazy(() => import('./pages/NpCompletenessPage.jsx'));
const MergeSortLessonPage = lazy(
	() => import('./pages/MergeSortLessonPage.jsx')
);
const QuickSortLessonPage = lazy(
	() => import('./pages/QuickSortLessonPage.jsx')
);
const StyleGuide = lazy(() => import('./styles/styleguide/StyleGuide.jsx'));
const ReviewPage = lazy(() => import('./pages/ReviewPage.jsx'));
const ProgressPage = lazy(() => import('./pages/ProgressPage.jsx'));
const ExamPage = lazy(() => import('./pages/ExamPage.jsx'));
const ReferencePage = lazy(() => import('./pages/ReferencePage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));

const RouteFallback = () => (
	<div className={styles.routeFallback} role="status" aria-live="polite">
		<div className={styles.fallbackFrame} aria-hidden="true">
			<div className={styles.fallbackStage}>
				<span />
				<span />
				<span />
				<span />
				<span />
			</div>
		</div>
		<div className={styles.fallbackCopy}>
			<strong>Loading</strong>
			<p>Setting up the visual stage.</p>
		</div>
	</div>
);

// Tab/bookmark/history titles per route. Topic routes take the topic name;
// the rest come from this map.
const UTILITY_TITLES = {
	'/': null, // home keeps the product title
	'/review': 'Review',
	'/exam': 'Exam',
	'/reference': 'Reference',
	'/progress': 'Progress',
	'/lessons/merge-sort': 'Merge sort lesson',
	'/lessons/quicksort': 'Quicksort lesson',
	'/styleguide': 'Style reference',
};

const AppLayout = () => {
	const location = useLocation();

	useEffect(() => {
		const topic = TOPIC_BY_ROUTE[location.pathname];
		const label = topic ? topic.name : UTILITY_TITLES[location.pathname];
		document.title = label
			? `${label} · AlgDatViz`
			: 'AlgDatViz — Algorithm Visualizer';
	}, [location.pathname]);

	return (
		<div className={styles.appContainer}>
			<a href="#main" className={styles.skipLink}>
				Skip to content
			</a>
			<Sidebar />
			<main id="main" tabIndex={-1} className={styles.mainContent}>
				<div className={styles.content}>
					<AnimatePresence mode="wait">
						<Motion.div
							key={location.pathname}
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							// A near-instant exit: mode="wait" serializes exit+enter, so a
							// symmetric 320ms exit doubled perceived nav latency.
							exit={{ opacity: 0, transition: { duration: 0.1 } }}
							// The calm "quiet settle" curve from theme.css (--ease-quiet),
							// so route changes match the home's deliberate pace, not a snap.
							transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
							className={styles.pageWrapper}
						>
							<Suspense fallback={<RouteFallback />}>
								<Routes location={location}>
									<Route path="/" element={<HomePage />} />
									<Route path="/foundations" element={<FoundationsPage />} />
									<Route path="/graph" element={<GraphPage />} />
									<Route path="/hashmap" element={<HashMapPage />} />
									<Route path="/stacks-queues" element={<StacksQueuesPage />} />
									<Route path="/tree" element={<TreePage />} />
									<Route path="/strategies" element={<StrategiesPage />} />
									<Route
										path="/linear-time-sorting"
										element={<LinearTimeSortingPage />}
									/>
									<Route path="/heaps" element={<HeapsPage />} />
									<Route path="/mst" element={<MstPage />} />
									<Route
										path="/shortest-paths"
										element={<ShortestPathsPage />}
									/>
									<Route
										path="/all-pairs-shortest-paths"
										element={<AllPairsShortestPathsPage />}
									/>
									<Route path="/max-flow" element={<MaxFlowPage />} />
									<Route
										path="/np-completeness"
										element={<NpCompletenessPage />}
									/>
									<Route
										path="/master-theorem"
										element={<MasterTheoremPage />}
									/>
									<Route
										path="/lessons/merge-sort"
										element={<MergeSortLessonPage />}
									/>
									<Route
										path="/lessons/quicksort"
										element={<QuickSortLessonPage />}
									/>
									<Route path="/review" element={<ReviewPage />} />
									<Route path="/progress" element={<ProgressPage />} />
									<Route path="/exam" element={<ExamPage />} />
									<Route path="/reference" element={<ReferencePage />} />
									<Route path="/styleguide" element={<StyleGuide />} />
									<Route path="*" element={<NotFoundPage />} />
								</Routes>
							</Suspense>
						</Motion.div>
					</AnimatePresence>
				</div>
			</main>

		</div>
	);
};

function App() {
	return (
		<BrowserRouter>
			{/* Honor the OS reduced-motion setting for every framer-motion
			    animation (route transitions included) in one place. */}
			<MotionConfig reducedMotion="user">
				<AppLayout />
			</MotionConfig>
		</BrowserRouter>
	);
}

export default App;
