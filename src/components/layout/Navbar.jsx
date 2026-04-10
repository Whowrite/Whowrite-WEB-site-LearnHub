// src/components/layout/Navbar.jsx
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../../firebase/authService';

export default function Navbar({ user, onLoginClick }) {
  const navigate = useNavigate();

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
        
        {/* Logo */}
        <div className="flex items-center gap-x-3">
          <div className="w-10 h-10 bg-sky-500 rounded-3xl flex items-center justify-center text-white text-3xl shadow-inner">
            📹
          </div>
          <span className="text-3xl font-bold tracking-tighter text-gray-900">LearnHub</span>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-2xl mx-10">
          <div className="relative">
            <input
              type="text"
              placeholder="Шукати уроки..."
              className="w-full bg-gray-100 border border-transparent focus:border-gray-300 focus:bg-white h-12 pl-14 rounded-3xl text-base outline-none transition-all"
            />
            <i className="fa-solid fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 text-xl"></i>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-x-6">
          <button className="p-3 hover:bg-gray-100 rounded-3xl transition-colors">
            <i className="fa-solid fa-house text-2xl text-gray-700"></i>
          </button>

          {/* Виправлена кнопка "Створити урок" */}
          <button 
            onClick={handleCreateLesson}
            className="flex items-center gap-x-3 bg-black hover:bg-gray-900 text-white font-semibold px-7 py-3 rounded-3xl transition-all active:scale-[0.97]"
          >
            <i className="fa-solid fa-video"></i>
            <span>Створити урок</span>
          </button>

          {user ? (
            <div className="flex items-center gap-x-4">
              <div className="flex items-center gap-x-3">
                <img 
                  src={user.photoURL || `https://i.pravatar.cc/128?u=${user.uid}`} 
                  alt={user.displayName || 'Користувач'} 
                  className="w-9 h-9 rounded-2xl object-cover ring-2 ring-white shadow-sm"
                />
                <div className="hidden sm:block">
                  <p className="font-medium text-gray-800 text-sm leading-none">
                    {user.displayName || user.email?.split('@')[0]}
                  </p>
                  <p className="text-gray-500 text-xs">Онлайн</p>
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