import TopicRoute from '../common/TopicScrollytelling/TopicRoute.jsx';
import StacksQueuesDashboard from '../components/StacksQueues/StacksQueuesDashboard.jsx';
import { TOPIC_STORIES } from '../data/topicStories.js';

const StacksQueuesPage = () => (
	<TopicRoute topic={TOPIC_STORIES.stacksQueues}>
		<StacksQueuesDashboard />
	</TopicRoute>
);

export default StacksQueuesPage;
