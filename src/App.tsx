import React from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { Courses } from './pages/Courses';
import { KnowledgeBase } from './pages/KnowledgeBase';
import { StudyAssistant } from './pages/StudyAssistant';
import { Quiz } from './pages/Quiz';
import { WrongQuestions } from './pages/WrongQuestions';
import { Settings } from './pages/Settings';
import { Profile } from './pages/Profile';

function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-6xl font-bold text-slate-600 mb-4">404</h1>
      <p className="text-xl text-slate-400 mb-6">页面未找到</p>
      <Link to="/" className="px-6 py-3 rounded-xl bg-gradient-to-r from-grad-from to-grad-to text-white font-medium">
        返回首页
      </Link>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="courses" element={<Courses />} />
            <Route path="knowledge" element={<KnowledgeBase />} />
            <Route path="assistant" element={<StudyAssistant />} />
            <Route path="quiz" element={<Quiz />} />
            <Route path="wrong" element={<WrongQuestions />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
}

export default App;
