import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import Sidebar from './common/Sidebar/Sidebar.jsx';
import HomePage from './pages/HomePage';
import GraphPage from './pages/GraphPage';
import SortingPage from './pages/SortingPage';
import HashMapPage from './pages/HashMapPage';
import TreePage from './pages/TreePage';
import MasterTheoremPage from './pages/MasterTheoremPage';
import StacksQueuesPage from './pages/StacksQueuesPage';
import StrategiesPage from './pages/StrategiesPage';
import styles from './App.module.css';

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

const AppLayout = () => {
	const location = useLocation();
	const meta = PAGE_META[location.pathname] || PAGE_META['/'];

	return (
		<div className={styles.appContainer}>
			<Sidebar />
			<main className={styles.mainContent}>
				<header className={styles.header}>
					<h1 className={styles.title}>{meta.title}</h1>
					<p className={styles.subtitle}>{meta.sub}</p>
					<div
						className={styles.headerLine}
						style={{ background: meta.accent }}
					/>
				</header>
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
			<AppLayout />
		</BrowserRouter>
	);
}

export default App;
