import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './common/Sidebar/Sidebar.jsx';
import HomePage from './pages/HomePage';
import GraphPage from './pages/GraphPage';
import SortingPage from './pages/SortingPage';
import styles from './App.module.css';

const PAGE_META = {
	'/': {
		title: 'Algorithm Visualizer',
		sub: 'Interactive step-by-step visualizations with synchronized pseudocode',
		accent: '#4f7cf8',
	},
	'/sorting': {
		title: 'Sorting Algorithms',
		sub: 'Watch sorting algorithms organize data — step by step',
		accent: '#4f7cf8',
	},
	'/graph': {
		title: 'Graph Visualizer',
		sub: 'Explore graph structures with adjacency lists and matrices',
		accent: '#38c9a0',
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
						<motion.div
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
							</Routes>
						</motion.div>
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
