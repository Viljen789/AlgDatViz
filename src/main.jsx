import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@viljen789/study-ui/tokens.css';
import '@viljen789/study-ui/style.css';
import App from './App.jsx';
import './styles/globals.css';
import './styles/theme.css';
import './styles/study-ui.css';

createRoot(document.getElementById('root')).render(
	<StrictMode>
		<App />
	</StrictMode>
);
