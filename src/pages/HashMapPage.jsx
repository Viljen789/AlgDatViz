import TopicRoute from '../common/TopicScrollytelling/TopicRoute.jsx';
import HashMapDashboard from '../components/HashMap/HashMapDashboard.jsx';
import { TOPIC_STORIES } from '../data/topicStories.js';

const HashMapPage = () => (
	<TopicRoute topic={TOPIC_STORIES.hashmap}>
		<HashMapDashboard />
	</TopicRoute>
);

export default HashMapPage;
