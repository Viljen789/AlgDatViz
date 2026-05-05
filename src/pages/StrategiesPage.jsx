import TopicRoute from '../common/TopicScrollytelling/TopicRoute.jsx';
import StrategiesDashboard from '../components/Strategies/StrategiesDashboard.jsx';
import { TOPIC_STORIES } from '../data/topicStories.js';

const StrategiesPage = () => (
	<TopicRoute topic={TOPIC_STORIES.strategies}>
		<StrategiesDashboard />
	</TopicRoute>
);

export default StrategiesPage;
