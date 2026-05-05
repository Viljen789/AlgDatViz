import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import Sidebar from './common/Sidebar/Sidebar.jsx';
import HelpOverlay from './common/HelpOverlay/HelpOverlay.jsx';
import { PAGE_HELP } from './data/pageHelpContent';
import styles from './App.module.css';

const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const GraphPage = lazy(() => import('./pages/GraphPage.jsx'));
const SortingPage = lazy(() => import('./pages/SortingPage.jsx'));
const HashMapPage = lazy(() => import('./pages/HashMapPage.jsx'));
const TreePage = lazy(() => import('./pages/TreePage.jsx'));
const MasterTheoremPage = lazy(() => import('./pages/MasterTheoremPage.jsx'));
const StacksQueuesPage = lazy(() => import('./pages/StacksQueuesPage.jsx'));
const StrategiesPage = lazy(() => import('./pages/StrategiesPage.jsx'));

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

const PAGE_META = {
	'/': {
		title: 'Algorithm Visualizer',
		sub: 'Interactive step-by-step visualizations with synchronized pseudocode',
		accent: '#4f7cf8',
	},
	'/sorting': {
		title: 'Sorting Algorithms',
		sub: 'Watch sorting algorithms organize data - step by step',
		accent: '#4f7cf8',
	},
	'/graph': {
		title: 'Graph Visualizer',
		sub: 'Explore traversals, shortest paths, spanning trees, max flow, and graph representations',
		accent: '#38c9a0',
	},
	'/hashmap': {
		title: 'Hash Maps',
		sub: 'See hashing, collisions, chaining, load factor, and resizing in action',
		accent: '#f8a74f',
	},
	'/stacks-queues': {
		title: 'Stacks & Queues',
		sub: 'Compare LIFO and FIFO behavior through push, pop, enqueue, and dequeue',
		accent: '#7fa4fc',
	},
	'/tree': {
		title: 'Trees',
		sub: 'Practice binary search tree operations and traversal orders',
		accent: '#c97af8',
	},
	'/strategies': {
		title: 'Algorithm Strategies',
		sub: 'Learn when to use dynamic programming and when greedy choices are safe',
		accent: '#38c9a0',
	},
	'/master-theorem': {
		title: 'Master Theorem',
		sub: 'Compare recursion leaves, per-level work, and asymptotic cases',
		accent: '#f8c040',
	},
};

const ROUTES_WITH_HERO = new Set([
	'/sorting',
	'/graph',
	'/tree',
	'/hashmap',
	'/stacks-queues',
	'/strategies',
	'/master-theorem',
]);

const AppLayout = () => {
	const location = useLocation();
	const meta = PAGE_META[location.pathname] || PAGE_META['/'];
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
							transition={{ duration: 0.2, ease: 'easeOut' }}
							className={styles.pageWrapper}
						>
							<Suspense fallback={<RouteFallback />}>
								<Routes location={location}>
									<Route path="/" element={<HomePage />} />
									<Route path="/sorting" element={<SortingPage />} />
									<Route path="/graph" element={<GraphPage />} />
									<Route path="/hashmap" element={<HashMapPage />} />
									<Route path="/stacks-queues" element={<StacksQueuesPage />} />
									<Route path="/tree" element={<TreePage />} />
									<Route path="/strategies" element={<StrategiesPage />} />
									<Route path="/master-theorem" element={<MasterTheoremPage />} />
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
