import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import LessonCard from '../components/lesson/LessonCard';
import { getAllLessons } from '../firebase/firestoreService';
import { db } from '../firebase/config';
import { doc, getDoc, collection, query, where, getDocs, getCountFromServer } from 'firebase/firestore';
import MultiCategoryFilter from '../components/common/MultiCategoryFilter';

export default function PublicProfile({ user, onLoginClick }) {
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [profile, setProfile] = useState(null);
  const [publishedLessons, setPublishedLessons] = useState([]);
  const [learnedLessons, setLearnedLessons] = useState([]);
  const [publishedCount, setPublishedCount] = useState(0);
  const [learnedCount, setLearnedCount] = useState(0);
  const [passedTestsCount, setPassedTestsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('published');

  // Стан для пошуку
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [filteredPublishedLessons, setFilteredPublishedLessons] = useState([]);
  const [filteredLearnedLessons, setFilteredLearnedLessons] = useState([]);

  const fromLessonId = location.state?.fromLessonId;

  useEffect(() => {
    const loadPublicProfile = async () => {
      if (!userId) return;

      setLoading(true);

      try {
        // Дані профілю
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          setProfile({ full_name: "Користувач не знайдений" });
          setLoading(false);
          return;
        }

        const userData = userSnap.data();
        setProfile(userData);

        // Всі уроки
        const allLessons = await getAllLessons();

        // Створені уроки автора
        const published = allLessons
          .filter(lesson => lesson.author_id === userId)
          .sort((a, b) => new Date(b.uploaded_at || 0) - new Date(a.uploaded_at || 0));

        setPublishedLessons(published);
        setPublishedCount(published.length);

        // Кількість вивчених уроків (статистика)
        const progressQuery = query(
          collection(db, 'progress'),
          where('user_id', '==', userId),
          where('is_completed', '==', true)
        );
        const progressCountSnap = await getCountFromServer(progressQuery);
        setLearnedCount(progressCountSnap.data().count);

        // Кількість підтверджених знань (пройдені тести)
        const testsQuery = query(
          collection(db, 'testResults'),
          where('user_id', '==', userId),
          where('passed', '==', true)
        );
        const testsCountSnap = await getCountFromServer(testsQuery);
        setPassedTestsCount(testsCountSnap.data().count);

        // Завантаження самих вивчених уроків для табу
        const progressSnap = await getDocs(progressQuery);
        const learnedLessonIds = progressSnap.docs.map(doc => doc.data().lesson_id);

        const learned = allLessons
          .filter(lesson => learnedLessonIds.includes(lesson.id))
          .sort((a, b) => new Date(b.uploaded_at || 0) - new Date(a.uploaded_at || 0));

        setLearnedLessons(learned);

      } catch (err) {
        console.error("Помилка завантаження профілю:", err);
      } finally {
        setLoading(false);
      }
    };

    loadPublicProfile();
  }, [userId]);

  // Фільтрація опублікованих уроків
  useEffect(() => {
    let filtered = [...publishedLessons];

    // Фільтрація за пошуком
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(lesson =>
        (lesson.title || '').toLowerCase().includes(term) ||
        (lesson.description || '').toLowerCase().includes(term) ||
        (lesson.tags || []).some(tag => tag.toLowerCase().includes(term))
      );
    }

    // Фільтрація за категоріями (AND логіка)
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(lesson => {
        const lessonCategories = lesson.categories || [];
        return selectedCategories.every(selectedCategory => 
          lessonCategories.includes(selectedCategory) || lesson.category === selectedCategory
        );
      });
    }

    setFilteredPublishedLessons(filtered);
  }, [searchTerm, selectedCategories, publishedLessons]);

  // Фільтрація вивчених уроків
  useEffect(() => {
    let filtered = [...learnedLessons];

    // Фільтрація за пошуком
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(lesson =>
        (lesson.title || '').toLowerCase().includes(term) ||
        (lesson.description || '').toLowerCase().includes(term) ||
        (lesson.author_name || '').toLowerCase().includes(term)
      );
    }

    // Фільтрація за категоріями (AND логіка)
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(lesson => {
        const lessonCategories = lesson.categories || [];
        return selectedCategories.every(selectedCategory => 
          lessonCategories.includes(selectedCategory) || lesson.category === selectedCategory
        );
      });
    }

    setFilteredLearnedLessons(filtered);
  }, [searchTerm, selectedCategories, learnedLessons]);

  const handleLessonClick = (lessonId) => {
    navigate(`/lesson/${lessonId}`, { 
      state: {
        from: 'publicProfile', 
        fromUserId: userId,
        fromProfile: true
      } 
    });
  };

  const handleBackToLesson = () => {
    if (fromLessonId) {
      navigate(`/lesson/${fromLessonId}`);
    } else {
      navigate('/');
    }
  };

  // Виконуємо вибірку уроків для поточного табу
  const getCurrentLessons = () => {
    return activeTab === 'published' ? filteredPublishedLessons : filteredLearnedLessons;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Завантаження профілю...</div>
      </div>
    );
  }

  if (!profile || profile.full_name === "Користувач не знайдений") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <h2 className="text-2xl font-semibold text-red-600">Профіль не знайдено</h2>
        <button
          onClick={() => navigate('/')}
          className="mt-6 px-8 py-3 bg-black text-white rounded-3xl"
        >
          Повернутися на головну
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} onLoginClick={onLoginClick} />

      <div className="max-w-5xl mx-auto px-6 py-10">
        <button
          onClick={handleBackToLesson}
          className="flex items-center gap-x-2 text-gray-600 hover:text-gray-900 mb-8 font-medium"
        >
          ← {fromLessonId ? "Повернутися до уроку" : "На головну"}
        </button>

        {/* Шапка профілю */}
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <img
            src={profile.avatar_url || `https://i.pravatar.cc/128?u=${userId}`}
            alt={profile.full_name}
            className="w-32 h-32 rounded-3xl object-cover border-4 border-white shadow-md"
          />

          <div className="flex-1 pt-2">
            <h1 className="text-4xl font-semibold text-gray-900">
              {profile.full_name || "Без імені"}
            </h1>
            <p className="text-gray-600 mt-3 text-lg leading-relaxed">
              {profile.bio || "Викладач на платформі LearnHub"}
            </p>
          </div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-white rounded-3xl p-6">
            <p className="text-sm text-gray-500">Опубліковано уроків</p>
            <p className="text-4xl font-semibold mt-3">{publishedCount}</p>
          </div>
          <div className="bg-white rounded-3xl p-6">
            <p className="text-sm text-gray-500">Уроків вивчено</p>
            <p className="text-4xl font-semibold mt-3">{learnedCount}</p>
          </div>
          <div className="bg-white rounded-3xl p-6">
            <p className="text-sm text-gray-500">Знань підтверджено</p>
            <p className="text-4xl font-semibold mt-3">{passedTestsCount}</p>
          </div>
        </div>

        {/* Табули */}
        <div className="mt-10 flex border-b">
          <button
            onClick={() => setActiveTab('published')}
            className={`px-8 py-4 font-medium ${activeTab === 'published' ? 'border-b-4 border-black' : 'text-gray-500'}`}
          >
            Створені уроки ({publishedCount})
          </button>
          <button
            onClick={() => setActiveTab('learned')}
            className={`px-8 py-4 font-medium ${activeTab === 'learned' ? 'border-b-4 border-black' : 'text-gray-500'}`}
          >
            Вивчені уроки ({learnedCount})
          </button>
        </div>

        {/* Рядок фільтрації з відступом зверху */}
                <div className="mt-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <MultiCategoryFilter 
                      selectedCategories={selectedCategories}
                      onCategoriesChange={setSelectedCategories}
                    />
                    
                    {/* Поле пошуку */}
                    <div className="relative w-80">
                      <input
                        type="text"
                        placeholder={`Пошук серед ${activeTab === 'published' ? 'опублікованих' : 'вивчених'} уроків...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      )}
                    </div>
                  </div>
        
                  {/* Індикація логіки фільтрації */}
                  {selectedCategories.length > 1 && (
                    <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
                      <i className="fa-solid fa-info-circle"></i>
                      <span>Фільтрація за ВСІМА вибраними категоріями ({selectedCategories.length} категорії)</span>
                    </div>
                  )}
        
                  {/* Індикатор активних фільтрів */}
                  {(searchTerm || selectedCategories.length > 0) && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
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

        {/* Контент */}
        <div className="mt-8">
          {activeTab === 'published' ? (
            getCurrentLessons().length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {getCurrentLessons().map(lesson => (
                  <LessonCard key={lesson.id} lesson={lesson} onClick={handleLessonClick} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-gray-500">
                <p className="text-xl">Автор ще не опублікував жодного уроку</p>
              </div>
            )
          ) : (
            getCurrentLessons().length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {getCurrentLessons().map(lesson => (
                  <div key={lesson.id} className="relative">
                    <LessonCard lesson={lesson} onClick={handleLessonClick} />

                    {/* Позначка "Вивчено" */}
                    <div className="absolute top-4 right-4 bg-green-500 text-white text-xs px-3 py-1 rounded-3xl font-medium flex items-center gap-1">
                      <i className="fa-solid fa-check"></i>
                      Вивчено
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-gray-500">
                <p className="text-xl">Цей автор ще не вивчив жодного уроку</p>
              </div>
            )
          )}
        </div>
      </div>
      <Footer 
            />
    </div>
  );
}