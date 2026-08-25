import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { AppLayout } from './layouts/AppLayout';
import { LoginScreen } from './components/LoginScreen';
import { useAuthStore } from './store/useAuthStore';
import { usePrefsStore } from './store/usePrefsStore';
import Dashboard from './pages/Dashboard';
import Servers from './pages/Servers';
import TerminalPage from './pages/TerminalPage';
import Files from './pages/Files';
import Monitoring from './pages/Monitoring';
import Settings from './pages/Settings';
import About from './pages/About';

function Shell() {
  const motionEnabled = usePrefsStore((s) => s.motion);
  return (
    <MotionConfig reducedMotion={motionEnabled ? 'user' : 'always'}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/servers" element={<Servers />} />
            <Route path="/terminal" element={<TerminalPage />} />
            <Route path="/files" element={<Files />} />
            <Route path="/monitoring" element={<Monitoring />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<Dashboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </MotionConfig>
  );
}

export default function App() {
  const authed = useAuthStore((s) => s.authed);
  const setAuthed = useAuthStore((s) => s.setAuthed);

  if (!authed) {
    return <LoginScreen onSuccess={() => setAuthed(true)} />;
  }
  return <Shell />;
}