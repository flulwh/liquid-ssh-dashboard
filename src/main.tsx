import { createRoot } from 'react-dom/client';
import App from './App';
import './i18n';
import './index.css';

const root = document.getElementById('root')!;
createRoot(root).render(<App />);