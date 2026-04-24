import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { auth } from '../firebase/config';
import LessonCard from '../components/lesson/LessonCard';
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getAllLessons, getAllLessonsWithFilter, incrementViews } from '../firebase/firestoreService';
import MultiCategoryFilter from '../components/common/MultiCategoryFilter';

export default function Home({ user, onLoginClick }) {
  const navigate = useNavigate();

  const [lessons, setLessons] = useState([]);
  const [filteredLessons, setFilteredLessons] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Перевірка на бан користувача
  useEffect(() => {
    const checkUserBlockStatus = async () => {
      if (!auth.currentUser) {
        navigate('/');
        return;
      }

      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();

          if (userData.isBlocked === true) {
            alert("Ваш акаунт заблоковано. Зверніться до адміністратора.");
            await auth.signOut();
            return;
          }
        } else {
          console.error("Користувача не знайдено в БД");
        }
      } catch (err) {
        console.error("Помилка перевірки блокування:", err);
        alert("Сталася помилка. Спробуйте пізніше.");
      }
      finally {
        navigate(0); // Перезавантажуємо сторінку для оновлення стану
      }
    };

    checkUserBlockStatus();
  }, [navigate]);

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        setLoading(true);
        const data = await getAllLessonsWithFilter('approved'); // Завантажуємо лише затверджені уроки
        setLessons(data);
        setFilteredLessons(data);
      } catch (err) {
        console.error("Помилка завантаження уроків:", err);
        setError("Не вдалося завантажити уроки.");
      } finally {
        setLoading(false);
      }
    };

    fetchLessons();
  }, []);

  // Фільтрація уроків за пошуком та категорією
  useEffect(() => {
    let filtered = [...lessons];

    // Фільтрація за пошуком
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(lesson =>
        (lesson.title || '').toLowerCase().includes(term) ||
        (lesson.author_name || lesson.author || '').toLowerCase().includes(term) ||
        (lesson.description || '').toLowerCase().includes(term)
      );
    }

    // Фільтрація за ВСІМА вибраними категоріями (AND)
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(lesson => {
        const lessonCategories = lesson.categories || [];
        
        // Перевіряємо, чи містить урок ВСІ вибрані категорії
        return selectedCategories.every(selectedCategory => 
          lessonCategories.includes(selectedCategory) || lesson.category === selectedCategory
        );
      });
    }

    setFilteredLessons(filtered);
  }, [searchTerm, selectedCategories, lessons]);

  const openLesson = async (lessonId) => {
    if (!user) {
      onLoginClick();
      return;
    }

    try {
      await incrementViews(lessonId);
    } catch (e) {
      console.error(e);
    }
    // alert(`🎬 Відкривається урок #${lessonId}`);
    navigate(`/lesson/${lessonId}`);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-xl">Завантаження...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar 
        user={user} 
        onLoginClick={onLoginClick}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      <div className="max-w-screen-2xl mx-auto px-6 pt-10 pb-16">
        <div className="mb-10">
          <h1 className="text-5xl font-semibold tracking-tighter text-gray-900">
            Відкрийте для себе нові знання
          </h1>
          <p className="text-2xl text-gray-600 mt-4">
            5-хвилинні відео-уроки від спільноти
          </p>
        </div>

        {/* Рядок фільтрації */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <MultiCategoryFilter 
            selectedCategories={selectedCategories}
            onCategoriesChange={setSelectedCategories}
          />
          
          {/* Індикатор активних фільтрів */}
          {(searchTerm || selectedCategories.length > 0) && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600">Активні фільтри:</span>
              
              {searchTerm && (
                <span className="bg-gray-200 px-2 py-1 rounded-full text-sm flex items-center gap-1">
                  Пошук: {searchTerm}
                  <button onClick={() => setSearchTerm('')} className="text-gray-500">×</button>
                </span>
              )}
              
              {selectedCategories.map(category => (
                <span key={category} className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-sm flex items-center gap-1">
                  {category}
                  <button 
                    onClick={() => setSelectedCategories(selectedCategories.filter(c => c !== category))}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    ×
                  </button>
                </span>
              ))}
              
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategories([]);
                }}
                className="text-red-500 hover:text-red-600 text-sm"
              >
                Очистити всі
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredLessons.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              onClick={openLesson}
            />
          ))}
        </div>

        {filteredLessons.length === 0 && (
          <div className="text-center py-20 text-gray-400 text-xl">
            😕 Уроків не знайдено
          </div>
        )}
      </div>
      <Footer 
      />
    </div>
  );
}