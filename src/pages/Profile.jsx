// src/pages/Profile.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import LessonCard from '../components/lesson/LessonCard';
import { auth } from '../firebase/config';
import { getAllLessons } from '../firebase/firestoreService';

export default function Profile({ user, onLoginClick }) {
  const navigate = useNavigate();
  const [userLessons, setUserLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('published'); // 'published' або 'learned'

  // Якщо користувач не авторизований — перенаправляємо на головну
  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/');
    }
  }, [navigate]);

  // Завантажуємо уроки користувача
  useEffect(() => {
    const fetchUserLessons = async () => {
      try {
        const allLessons = await getAllLessons();
        // Фільтруємо уроки, створені поточним користувачем
        const myLessons = allLessons.filter(
          lesson => lesson.author_id === auth.currentUser?.uid
        );
        setUserLessons(myLessons);
      } catch (err) {
        console.error("Помилка завантаження уроків:", err);
      } finally {
        setLoading(false);
      }
    };

    if (auth.currentUser) {
      fetchUserLessons();
    }
  }, []);

  const handleLessonClick = (lessonId) => {
    navigate(`/lesson/${lessonId}`);
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Завантаження профілю...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} onLoginClick={onLoginClick} />

      <div className="max-w-5xl mx-auto px-6 py-10">
        
        {/* Кнопка повернення */}
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-x-2 text-gray-600 hover:text-gray-900 mb-8 font-medium"
        >
          ← Повернутися на головну
        </button>


        {/* Шапка профілю */}
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <img 
            src={user.photoURL || `https://i.pravatar.cc/128?u=${user.uid}`} 
            alt={user.displayName || 'Користувач'}
            className="w-28 h-28 rounded-3xl object-cover border-4 border-white shadow-md"
          />

          <div className="flex-1">
            <h1 className="text-4xl font-semibold text-gray-900">
              {user.displayName || 'Користувач'}
            </h1>
            <p className="text-gray-600 mt-1 text-lg">
              Викладач програмування та веб-розробки
            </p>
            <p className="text-gray-500 mt-2 max-w-md">
              Допомагаю початківцям швидко освоювати сучасні технології через короткі практичні уроки.
            </p>
          </div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Опубліковано уроків</p>
                <p className="text-4xl font-semibold mt-2">{userLessons.length}</p>
              </div>
              <div className="text-4xl opacity-30">🎥</div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Уроків вивчено</p>
                <p className="text-4xl font-semibold mt-2">0</p>
              </div>
              <div className="text-4xl opacity-30">📖</div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Знань підтверджено</p>
                <p className="text-4xl font-semibold mt-2">0</p>
                <p className="text-xs text-gray-500 mt-1">з пройденими вікторинами</p>
              </div>
              <div className="text-4xl opacity-30">🏆</div>
            </div>
          </div>
        </div>

        {/* Табули */}
        <div className="mt-10">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('published')}
              className={`px-8 py-4 font-medium text-lg transition-all ${
                activeTab === 'published' 
                  ? 'border-b-4 border-black text-black' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Опубліковані уроки ({userLessons.length})
            </button>
            <button
              onClick={() => setActiveTab('learned')}
              className={`px-8 py-4 font-medium text-lg transition-all ${
                activeTab === 'learned' 
                  ? 'border-b-4 border-black text-black' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Вивчені уроки (0)
            </button>
          </div>
        </div>

        {/* Контент табу */}
        <div className="mt-8">
          {activeTab === 'published' ? (
            userLessons.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {userLessons.map(lesson => (
                  <LessonCard 
                    key={lesson.id} 
                    lesson={lesson} 
                    onClick={handleLessonClick} 
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-gray-500">
                <p className="text-2xl">Ви ще не опублікували жодного уроку</p>
                <button 
                  onClick={() => navigate('/create')}
                  className="mt-6 px-8 py-3 bg-black text-white rounded-3xl hover:bg-gray-800"
                >
                  Створити перший урок
                </button>
              </div>
            )
          ) : (
            <div className="text-center py-20 text-gray-500">
              <p className="text-2xl">Ви ще не вивчили жодного уроку</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}