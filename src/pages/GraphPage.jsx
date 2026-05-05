import TopicRoute from '../common/TopicScrollytelling/TopicRoute.jsx';
import GraphDashboard from '../components/Graph/GraphDashboard';
import { TOPIC_STORIES } from '../data/topicStories.js';

const GraphPage = () => (
	<TopicRoute topic={TOPIC_STORIES.graph}>
		<GraphDashboard />
	</TopicRoute>
);

export default GraphPage;
