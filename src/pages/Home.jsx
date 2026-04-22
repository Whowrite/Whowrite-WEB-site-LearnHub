import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from '../components/layout/Navbar';
import { auth } from '../firebase/config';
import LessonCard from '../components/lesson/LessonCard';
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getAllLessons, getAllLessonsWithFilter, incrementViews } from '../firebase/firestoreService';

export default function Home({ user, onLoginClick }) {
  const navigate = useNavigate();

  const [lessons, setLessons] = useState([]);
  const [filteredLessons, setFilteredLessons] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
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

  // Пошук
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredLessons(lessons);
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    const filtered = lessons.filter(lesson =>
      (lesson.title || '').toLowerCase().includes(term) ||
      (lesson.author_name || lesson.author || '').toLowerCase().includes(term)
    );
    setFilteredLessons(filtered);
  }, [searchTerm, lessons]);

  const openLesson = async (lessonId) => {
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
    </div>
  );
}