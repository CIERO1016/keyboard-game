import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './components/Home';
import KeyLocationGame from './components/KeyLocationGame';
import TypingGame from './components/TypingGame';
import KokonTozaiGame from './components/KokonTozaiGame';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/keylocation" element={<KeyLocationGame />} />
        <Route path="/keylocation/:difficulty" element={<KeyLocationGame />} />
        <Route path="/typing" element={<TypingGame />} />
        <Route path="/typing/:difficulty" element={<TypingGame />} />
        <Route path="/kokontozai" element={<KokonTozaiGame />} />
        <Route path="/kokontozai/:difficulty" element={<KokonTozaiGame />} />
        {/* 旧しりとりURLからのリダイレクト */}
        <Route path="/shiritori" element={<Navigate to="/" replace />} />
        <Route path="/shiritori/:difficulty" element={<Navigate to="/" replace />} />
        {/* 存在しないパスはホームへ */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
