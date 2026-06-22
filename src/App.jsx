import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import Sidebar from './common/Sidebar/Sidebar.jsx';
import HelpOverlay from './common/HelpOverlay/HelpOverlay.jsx';
import { PAGE_HELP } from './data/pageHelpContent';
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
// Throwaway design-language lab (not linked in nav) — reachable at /lab.
const LabPage = lazy(() => import('./pages/lab/LabPage.jsx'));

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
			<strong>Preparing lesson</strong>
			<p>Loading the visual stage.</p>
		</div>
	</div>
);

// Title + accent come from the single topic model (curriculum.js). Only the
// descriptive subtitle (page-level help copy, not topic identity) and the
// non-topic home entry live here.
const ROUTE_SUBTITLES = {
	'/': 'Interactive step-by-step visualizations with synchronized pseudocode',
	'/graph':
		'Explore traversals, shortest paths, spanning trees, max flow, and graph representations',
	'/hashmap':
		'See hashing, collisions, chaining, load factor, and resizing in action',
	'/stacks-queues':
		'Compare LIFO and FIFO behavior through push, pop, enqueue, and dequeue',
	'/tree': 'Practice binary search tree operations and traversal orders',
	'/strategies':
		'Learn when to use dynamic programming and when greedy choices are safe',
	'/master-theorem':
		'Compare recursion leaves, per-level work, and asymptotic cases',
	'/lessons/merge-sort':
		'Splits all the way down, then merges back up — guided by scroll, then by you.',
};

const HOME_META = {
	title: 'Algorithm Visualizer',
	accent: 'var(--color-accent-blue)',
};

const getPageMeta = pathname => {
	const topic = TOPIC_BY_ROUTE[pathname];
	const title = topic ? topic.name : HOME_META.title;
	const accent = topic ? topic.accent : HOME_META.accent;
	const sub = ROUTE_SUBTITLES[pathname] || ROUTE_SUBTITLES['/'];
	return { title, accent, sub };
};

// Routes that render their own hero/scrolly and therefore suppress the
// generic app header. Derived from the topic model plus home + the lesson.
const ROUTES_WITH_HERO = new Set([
	'/',
	'/review',
	'/progress',
	'/exam',
	'/reference',
	...Object.keys(TOPIC_BY_ROUTE),
]);

const AppLayout = () => {
	const location = useLocation();
	const meta = getPageMeta(location.pathname);
	const [isHelpOpen, setIsHelpOpen] = useState(false);

	const helpContent = PAGE_HELP[location.pathname] || PAGE_HELP['/'];
	const showAppHeader = !ROUTES_WITH_HERO.has(location.pathname);

	return (
		<div className={styles.appContainer}>
			<Sidebar />
			<main className={styles.mainContent}>
				{showAppHeader && (
					<header className={styles.header}>
						<div className={styles.headerContent}>
							<div className={styles.titleGroup}>
								<h1 className={styles.title}>{meta.title}</h1>
								<p className={styles.subtitle}>{meta.sub}</p>
							</div>
							<button
								className={styles.helpButton}
								onClick={() => setIsHelpOpen(true)}
								title="How to use this page"
							>
								<HelpCircle size={18} />
								<span>Help</span>
							</button>
						</div>
						<div
							className={styles.headerLine}
							style={{ background: meta.accent }}
						/>
					</header>
				)}
				<div className={styles.content}>
					<AnimatePresence mode="wait">
						<Motion.div
							key={location.pathname}
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -8 }}
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
									<Route path="/lab" element={<LabPage />} />
								</Routes>
							</Suspense>
						</Motion.div>
					</AnimatePresence>
				</div>
			</main>

			<HelpOverlay
				isOpen={isHelpOpen}
				onClose={() => setIsHelpOpen(false)}
				content={helpContent}
			/>
		</div>
	);
};

function App() {
	return (
		<BrowserRouter>
			<AppLayout />
		</BrowserRouter>
	);
}

export default App;
