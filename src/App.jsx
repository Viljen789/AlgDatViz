import { useState } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Sidebar from './common/Sidebar/Sidebar.jsx';
import GraphPage from './pages/GraphPage';
import SortingPage from './pages/SortingPage';
import styles from './App.module.css';

const AppLayout = () => {
	const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
	const location = useLocation();

	return (
		<div className={styles.appContainer}>
			<Sidebar
				isCollapsed={isSidebarCollapsed}
				onToggle={() => setIsSidebarCollapsed(prev => !prev)}
			/>
			<main className={styles.mainContent}>
				<AnimatePresence mode="wait">
					<Routes location={location} key={location.pathname}>
						<Route
							path="/graph"
							element={<GraphPage key={location.pathname} />}
						/>
						<Route
							path="/sorting"
							element={<SortingPage key={location.pathname} />}
						/>
						<Route path="/" element={<GraphPage key={location.pathname} />} />
					</Routes>
				</AnimatePresence>
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
