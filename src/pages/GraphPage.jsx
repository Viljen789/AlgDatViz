import { motion } from 'framer-motion';
import GraphDashboard from '../components/Graph/GraphDashboard';

const pageVariants = {
	initial: {
		opacity: 0,
		y: 20,
	},
	in: {
		opacity: 1,
		y: 0,
	},
	out: {
		opacity: 0,
		y: -20,
	},
};

const pageTransition = {
	type: 'tween',
	ease: 'anticipate',
	duration: 0.5,
};

const GraphPage = () => {
	return (
		<motion.div
			initial="initial"
			animate="in"
			exit="out"
			variants={pageVariants}
			transition={pageTransition}
		>
			<h1>Graph Visualizer</h1>
			<GraphDashboard />
		</motion.div>
	);
};

export default GraphPage;
