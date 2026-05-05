import { useState } from 'react';
import SortingDashboard from '../components/Sorting/SortingDashboard/SortingDashboard.jsx';
import SortingScrollytelling from '../components/Sorting/SortingScrollytelling/SortingScrollytelling.jsx';

const SortingPage = () => {
	const [mode, setMode] = useState('story');
	const [playgroundAlgorithm, setPlaygroundAlgorithm] = useState('bubbleSort');

	const openPlayground = algorithm => {
		setPlaygroundAlgorithm(algorithm || 'bubbleSort');
		setMode('playground');
	};

	if (mode === 'playground') {
		return (
			<SortingDashboard
				key={playgroundAlgorithm}
				initialAlgorithm={playgroundAlgorithm}
				onStoryRequest={() => setMode('story')}
			/>
		);
	}

	return <SortingScrollytelling onOpenPlayground={openPlayground} />;
};

export default SortingPage;
