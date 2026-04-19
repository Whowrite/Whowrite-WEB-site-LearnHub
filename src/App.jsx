// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';

import Home from './pages/Home';
import CreateLesson from './pages/CreateLesson';
import LessonPage from './pages/LessonPage';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import AuthModal from './components/auth/AuthModal';
import { onAuthStateChange } from './firebase/authService';

function App() {
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={
            <Home 
              user={user}
              onLoginClick={() => setShowAuthModal(true)}
            />
          } 
        />
        
        <Route 
          path="/create" 
          element={
            <CreateLesson 
              user={user} 
              onLoginClick={() => setShowAuthModal(true)} 
            />
          } 
        />

        <Route 
          path="/lesson/:lessonId" 
          element={
            <LessonPage 
              user={user} 
              onLoginClick={() => setShowAuthModal(true)} 
              />
            } 
        />

        <Route 
          path="/u/:userId" 
          element={
            <PublicProfile 
              user={user} 
              onLoginClick={() => setShowAuthModal(true)} 
              />
            } 
        />

        <Route 
          path="/profile" 
          element={
          <Profile 
            user={user} 
            onLoginClick={() => setShowAuthModal(true)} 
          />
        } 
        />
      </Routes>

      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />
    </Router>
  );
}

export default App;