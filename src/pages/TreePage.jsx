import TopicRoute from '../common/TopicScrollytelling/TopicRoute.jsx';
import Tree from '../components/Tree/Tree.jsx';
import { TOPIC_STORIES } from '../data/topicStories.js';

const TreePage = () => (
	<TopicRoute topic={TOPIC_STORIES.tree}>
		<Tree />
	</TopicRoute>
);

export default TreePage;
