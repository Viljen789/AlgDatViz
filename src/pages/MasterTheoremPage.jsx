import TopicRoute from '../common/TopicScrollytelling/TopicRoute.jsx';
import MasterTheoremDashboard from '../components/MasterTheorem/MasterTheoremDashboard.jsx';
import { TOPIC_STORIES } from '../data/topicStories.js';

const MasterTheoremPage = () => (
	<TopicRoute topic={TOPIC_STORIES.masterTheorem}>
		<MasterTheoremDashboard />
	</TopicRoute>
);

export default MasterTheoremPage;
