// src/components/layout/Navbar.jsx
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { signOut } from 'firebase/auth';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { logoutUser } from '../../firebase/authService';

export default function Navbar({ user: initialUser, onLoginClick, searchTerm, onSearchChange }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(initialUser);
  const [isAdmin, setIsAdmin] = useState(false);

  // Завантажуємо повний профіль з Firestore, щоб отримати роль
  useEffect(() => {
  const loadUserProfile = async () => {
    if (!auth.currentUser) return;

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const firestoreData = userSnap.data();

        // Зливаємо Auth + Firestore дані в один об'єкт користувача
        setUser(prevUser => ({
          ...prevUser,
          ...firestoreData,
        }));

        setIsAdmin(firestoreData.role === 'admin');
      }
    } catch (err) {
      console.error("Помилка завантаження профілю:", err);
    }
  };

    loadUserProfile();
  }, []);

  const handleCreateLesson = () => {
    if (user) {
      navigate('/create');
    } else {
      onLoginClick();
    }
  };

  const handleLogout = async () => {
    if (window.confirm("Ви дійсно хочете вийти з акаунту?")) {
      try {
        await logoutUser();
      } catch (error) {
        console.error("Помилка виходу:", error);
        alert("Не вдалося вийти. Спробуйте ще раз.");
      }
    }
  };

  return (
    <nav className="bg-white border-b sticky top-0 z-50 shadow-sm">
      <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">
        
        {/* Логотип */}
        <div 
          className="flex items-center gap-x-3"
          onClick={() => navigate('/')}
        >
          <div className="w-10 h-10 bg-sky-500 rounded-3xl flex items-center justify-center text-white text-3xl shadow-inner">
            📹
          </div>
          <span className="text-3xl font-bold tracking-tighter text-gray-900">LearnHub</span>
        </div>

        {/* Пошуковий рядок */}
          <div className="flex-1 max-w-2xl mx-10">
            <div className="relative">
              <input
                type="text"
                placeholder="Шукати уроки за назвою, автором або описом..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-gray-100 border border-transparent focus:border-gray-300 focus:bg-white h-12 pl-14 pr-12 rounded-3xl text-base outline-none transition-all"
              />
              <i className="fa-solid fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 text-xl"></i>
              
              {/* Кнопка очищення пошуку */}
              {searchTerm && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <i className="fa-solid fa-xmark text-xl"></i>
                </button>
              )}
            </div>
          </div>

        {/* Right side */}
        <div className="flex items-center gap-x-6">
          <button className="p-3 hover:bg-gray-100 rounded-3xl transition-colors" onClick={() => navigate('/')}>
            <i className="fa-solid fa-house text-2xl text-gray-700"></i>
          </button>

          {/* Кнопка "Створити урок" */}
          <button 
            onClick={handleCreateLesson}
            className="flex items-center gap-x-3 bg-black hover:bg-gray-900 text-white font-semibold px-7 py-3 rounded-3xl transition-all active:scale-[0.97]"
          >
            <i className="fa-solid fa-video"></i>
            <span>Створити урок</span>
          </button>
          
          {/* Кнопка "Адмін-панель" */}
          {isAdmin && (
            <Link 
              to="/admin" 
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-medium transition-all"
            >
              <i className="fa-solid fa-shield-halved"></i>
              Адмін-панель
            </Link>
          )}

          {user ? (
            <div className="flex items-center gap-x-4">
              <div 
                className="flex items-center gap-x-3"
                onClick={() => navigate('/profile')}
              >
                <img 
                  src={user.photoURL || `https://i.pravatar.cc/128?u=${user.uid}`} 
                  alt={user.displayName || 'Користувач'} 
                  className="w-9 h-9 rounded-2xl object-cover ring-2 ring-white shadow-sm"
                />
                <div className="hidden sm:block">
                  <p className="font-medium text-gray-800 text-sm leading-none">
                    {user.displayName || user.email?.split('@')[0]}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="px-5 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-3xl transition-all border border-red-200 hover:border-red-300"
              >
                Вийти
              </button>
            </div>
          ) : (
            <button 
              onClick={onLoginClick}
              className="px-6 py-2.5 border-2 border-gray-800 hover:bg-gray-900 hover:text-white font-semibold rounded-3xl transition-all"
            >
              Увійти
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}