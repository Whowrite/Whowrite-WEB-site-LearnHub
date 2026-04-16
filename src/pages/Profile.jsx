// src/pages/Profile.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import LessonCard from '../components/lesson/LessonCard';
import { auth } from '../firebase/config';
import { doc, getDoc, updateDoc, deleteDoc, writeBatch, collection, query, where, getCountFromServer, getDocs } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db } from '../firebase/config';
import { getAllLessons } from '../firebase/firestoreService';

export default function Profile({ user, onLoginClick }) {
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState(null);
  const [userLessons, setUserLessons] = useState([]);
  const [allAvailableTags, setAllAvailableTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('published');
  const [learnedCount, setLearnedCount] = useState(0);
  const [passedTestsCount, setPassedTestsCount] = useState(0);
  const [learnedLessons, setLearnedLessons] = useState([]);

  // Модальні вікна
  const [isEditProfileModalOpen, setisEditProfileModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isEditLessonModalOpen, setIsEditLessonModalOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);

  const [editProfileForm, setEditProfileForm] = useState({
    displayName: '',
    bio: '',
    photoURL: '',
  });
  const [newAvatarUrl, setNewAvatarUrl] = useState('');
  const [avatarValidating, setAvatarValidating] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  const [editLessonForm, setEditLessonForm] = useState({
    title: '',
    description: '',
    youtubeUrl: '',
    duration_minutes: 5,
    categories: [],
    hasQuiz: false,
    quizQuestions: [],
  });

  const availableCategories = [
    "React", "JavaScript", "UI/UX", "Design", "Cooking", 
    "Music", "Guitar", "Psychology", "Career", "IT", 
    "Python", "English", "Математика", "Фізика", "Історія",
    "Література", "Філософія", "Мистецтво", "Фотографія", "Маркетинг",
    "Бізнес", "Фінанси", "Здоров'я", "Спорт", "Подорожі", "Українська мова",
     "Психологія", "Саморозвиток", "Медицина", "Геймінг"
  ];

  // Завантаження профілю та уроків користувача при відкритті сторінки
  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/');
      return;
    }
    loadProfile();
    loadUserLessons();
    loadUserStats();
    loadLearnedLessons();
  }, [navigate]);

  // Завантаження профілю
  const loadProfile = async () => {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setProfileData(data);
        setEditProfileForm({
          displayName: data.full_name || auth.currentUser.displayName || '',
          bio: data.bio || '',
          photoURL: data.avatar_url || auth.currentUser.photoURL || '',
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Завантаження уроків користувача
  const loadUserLessons = async () => {
    try {
      const allLessons = await getAllLessons();
      const myLessons = allLessons.filter(lesson => lesson.author_id === auth.currentUser.uid);
      setUserLessons(myLessons);

      // Збираємо всі унікальні теги з уроків користувача
      const tagsSet = new Set();
      myLessons.forEach(lesson => {
        if (lesson.categories) {
          lesson.categories.forEach(tag => tagsSet.add(tag));
        }
      });
      setAllAvailableTags(Array.from(tagsSet));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Завантаження вивчених уроків (з колекції progress)
  const loadLearnedLessons = async () => {
    if (!auth.currentUser) return;

    try {
      const progressQuery = query(
        collection(db, 'progress'),
        where('user_id', '==', auth.currentUser.uid),
        where('is_completed', '==', true)
      );

      const progressSnapshot = await getDocs(progressQuery);

      if (progressSnapshot.empty) {
        setLearnedLessons([]);
        return;
      }

      const learnedLessonIds = progressSnapshot.docs.map(doc => doc.data().lesson_id);

      const allLessons = await getAllLessons();
      const learned = allLessons
        .filter(lesson => learnedLessonIds.includes(lesson.id))
        .sort((a, b) => new Date(b.uploaded_at?.toDate?.() || b.uploaded_at) - new Date(a.uploaded_at?.toDate?.() || a.uploaded_at)); // новіші зверху

      setLearnedLessons(learned);
    } catch (err) {
      console.error("Помилка завантаження вивчених уроків:", err);
      setLearnedLessons([]);
    }
  };

  // Завантаження статистики користувача (вивчені уроки + пройдені тести)
  const loadUserStats = async () => {
    if (!auth.currentUser) return;

    try {
      // Кількість вивчених уроків (is_completed: true)
      const progressQuery = query(
        collection(db, 'progress'),
        where('user_id', '==', auth.currentUser.uid),
        where('is_completed', '==', true)
      );
      const progressSnapshot = await getCountFromServer(progressQuery);
      setLearnedCount(progressSnapshot.data().count);

      // Кількість успішно пройдених тестів (passed: true)
      const testsQuery = query(
        collection(db, 'testResults'),
        where('user_id', '==', auth.currentUser.uid),
        where('passed', '==', true)
      );
      const testsSnapshot = await getCountFromServer(testsQuery);
      setPassedTestsCount(testsSnapshot.data().count);

    } catch (err) {
      console.error("Помилка завантаження статистики:", err);
      // Якщо помилка — залишаємо 0
    }
  };

  // Валідація URL зображення
  const validateImageUrl = async (url) => {
    if (!url) return false;
    setAvatarValidating(true);
    setAvatarError('');

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { setAvatarValidating(false); resolve(true); };
      img.onerror = () => { 
        setAvatarValidating(false); 
        setAvatarError("Посилання не веде на зображення або недоступне"); 
        resolve(false); 
      };
      img.src = url;
    });
  };

  // Оновлення тільки аватара + оновлення у всіх уроках
  const saveAvatar = async () => {
    if (!newAvatarUrl) return;

    const isValid = await validateImageUrl(newAvatarUrl);
    if (!isValid) return;

    try {
      await updateProfile(auth.currentUser, { photoURL: newAvatarUrl });

      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { avatar_url: newAvatarUrl });

      const allLessons = await getAllLessons();
      const userLessonsToUpdate = allLessons.filter(
        lesson => lesson.author_id === auth.currentUser.uid
      );

      const batch = writeBatch(db);
      userLessonsToUpdate.forEach(lesson => {
        const lessonRef = doc(db, 'lessons', lesson.id);
        batch.update(lessonRef, { author_avatar: newAvatarUrl });
      });

      await batch.commit();

      alert("Фото профілю успішно оновлено у всіх уроках!");
      setIsAvatarModalOpen(false);
      window.location.reload();

    } catch (error) {
      console.error(error);
      alert("Не вдалося оновити фото");
    }
  };

  // Повне оновлення профілю
  const saveProfile = async () => {
    try {
      await updateProfile(auth.currentUser, {
        displayName: editProfileForm.displayName,
        photoURL: editProfileForm.photoURL,
      });

      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        full_name: editProfileForm.displayName,
        bio: editProfileForm.bio,
        avatar_url: editProfileForm.photoURL,
      });

      alert("Профіль успішно оновлено!");
      setisEditProfileModalOpen(false);
      window.location.reload();
    } catch (error) {
      alert("Помилка при збереженні профілю");
    }
  };

  // Відкриття редагування уроку
  const openEditLessonModal = (lesson) => {
    setSelectedLesson(lesson);
    setEditLessonForm({
      title: lesson.title,
      description: lesson.description || '',
      youtubeUrl: lesson.youtube_url || '',
      duration_minutes: lesson.duration_minutes || 5,
      categories: lesson.categories || [],
      hasQuiz: lesson.has_quiz || false,
      quizQuestions: lesson.quiz_questions || [],
    });
    setIsEditLessonModalOpen(true);
  };

  // Додавання нового питання
  const addQuestion = () => {
    if (editLessonForm.quizQuestions.length >= 5) return;
    setEditLessonForm(prev => ({
      ...prev,
      quizQuestions: [
        ...prev.quizQuestions,
        { question: '', options: ['', '', '', ''], correctAnswer: 0 }
      ]
    }));
  };

  // Оновлення питання
  const updateQuestion = (qIndex, field, value) => {
    setEditLessonForm(prev => {
      const newQuestions = [...prev.quizQuestions];
      newQuestions[qIndex][field] = value;
      return { ...prev, quizQuestions: newQuestions };
    });
  };

  // Оновлення варіанту відповіді
  const updateOption = (qIndex, optIndex, value) => {
    setEditLessonForm(prev => {
      const newQuestions = [...prev.quizQuestions];
      newQuestions[qIndex].options[optIndex] = value;
      return { ...prev, quizQuestions: newQuestions };
    });
  };

  // Видалення питання
  const removeQuestion = (qIndex) => {
    setEditLessonForm(prev => ({
      ...prev,
      quizQuestions: prev.quizQuestions.filter((_, i) => i !== qIndex)
    }));
  };

  // Перемикач наявності тесту
  const toggleQuiz = () => {
    setEditLessonForm(prev => ({
      ...prev,
      hasQuiz: !prev.hasQuiz,
      quizQuestions: !prev.hasQuiz ? prev.quizQuestions : []
    }));
  };

  // Збереження відредагованого уроку
  const saveEditedLesson = async () => {
    if (!selectedLesson) return;

    try {
      const lessonRef = doc(db, 'lessons', selectedLesson.id);
      await updateDoc(lessonRef, {
        title: editLessonForm.title.trim(),
        description: editLessonForm.description.trim(),
        youtube_url: editLessonForm.youtubeUrl.trim(),
        thumbnail_url: editLessonForm.youtubeUrl ? `https://img.youtube.com/vi/${extractYouTubeId(editLessonForm.youtubeUrl)}/maxresdefault.jpg` : '',
        duration_minutes: parseFloat(editLessonForm.duration_minutes),
        categories: editLessonForm.categories,
        has_quiz: editLessonForm.hasQuiz,
        quiz_questions: editLessonForm.hasQuiz ? editLessonForm.quizQuestions : [],
      });

      alert("Урок успішно оновлено!");
      setIsEditLessonModalOpen(false);
      loadUserLessons();
      loadUserStats();
    } catch (error) {
      alert("Не вдалося оновити урок");
    }
  };

  // Видалення уроку
  const deleteLesson = async (lessonId) => {
    if (!window.confirm("Ви дійсно хочете видалити цей урок?")) return;

    try {
      await deleteDoc(doc(db, 'lessons', lessonId));
      alert("Урок видалено");
      loadUserLessons();
      loadUserStats();
    } catch (error) {
      alert("Не вдалося видалити урок");
    }
  };

  const extractYouTubeId = (url) => {
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleLessonClick = (lessonId) => navigate(`/lesson/${lessonId}`);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Завантаження...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} onLoginClick={onLoginClick} />

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div 
            className="relative group cursor-pointer"
            onClick={() => setIsAvatarModalOpen(true)}
          >
            <img 
              src={profileData?.avatar_url || `https://i.pravatar.cc/128?u=${auth.currentUser.uid}`}
              alt="Аватар"
              className="w-32 h-32 rounded-3xl object-cover border-4 border-white shadow-md"
            />
            <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 flex items-center justify-center">
              <span className="text-white text-sm">Змінити фото</span>
            </div>
          </div>

          <div className="flex-1 pt-4">
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-semibold text-gray-900">
                {profileData?.full_name || user?.displayName}
              </h1>
              <button 
                onClick={() => setisEditProfileModalOpen(true)}
                className="text-sky-600 hover:text-sky-700 text-sm font-medium"
              >
                Редагувати профіль
              </button>
            </div>
            <p className="text-gray-600 mt-2 text-lg">
              {profileData?.bio || "Викладач програмування та веб-розробки"}
            </p>
          </div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-white rounded-3xl p-6">
            <p className="text-sm text-gray-500">Опубліковано уроків</p>
            <p className="text-4xl font-semibold mt-3">{userLessons.length}</p>
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

        <div className="mt-10 flex border-b">
          <button onClick={() => setActiveTab('published')} className={`px-8 py-4 font-medium ${activeTab === 'published' ? 'border-b-4 border-black' : 'text-gray-500'}`}>
            Опубліковані уроки ({userLessons.length})
          </button>
          <button onClick={() => setActiveTab('learned')} className={`px-8 py-4 font-medium ${activeTab === 'learned' ? 'border-b-4 border-black' : 'text-gray-500'}`}>
            Вивчені уроки ({learnedLessons.length})
          </button>
        </div>

        { /* Список уроків або повідомлення про відсутність */}
        <div className="mt-8">
          {activeTab === 'published' && userLessons.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {userLessons.map(lesson => (
                <div key={lesson.id} className="relative">
                  <LessonCard key={lesson.id} lesson={lesson} onClick={handleLessonClick} />

                  {/* Кнопки редагування та видалення */}
                  <div className="absolute top-4 right-4 flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditLessonModal(lesson); }}
                        className="bg-white p-2 rounded-full shadow hover:bg-gray-100"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteLesson(lesson.id); }}
                        className="bg-white p-2 rounded-full shadow hover:bg-red-50 text-red-600"
                      >
                        🗑️
                      </button>
                    </div>
                </div>
              ))}
            </div>
          ) : activeTab === 'learned' && learnedLessons.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {learnedLessons.map(lesson => (
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
          ) : activeTab === 'learned' ? (
            <div className="text-center py-20 text-gray-500">
              <p className="text-xl">Ви ще не вивчили жодного уроку</p>
              <p className="mt-2 text-sm">Пройдіть уроки та натисніть «Я вивчив» або пройдіть міні-тест</p>
            </div>
          ) : null}
        </div>
      </div>
      
      {/* Модальне вікно редагування уроку */}
      {isEditLessonModalOpen && selectedLesson && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col">

            {/* Заголовок */}
            <div className="px-8 pt-8 pb-4 border-b">
              <h2 className="text-2xl font-semibold">Редагувати урок</h2>
            </div>

            {/* Скроляча частина контенту */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">

              <div>
                <label className="block text-sm font-medium mb-2">Назва уроку</label>
                <input
                  type="text"
                  value={editLessonForm.title}
                  onChange={(e) => setEditLessonForm({ ...editLessonForm, title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Посилання на YouTube</label>
                <input
                  type="text"
                  value={editLessonForm.youtubeUrl}
                  onChange={(e) => setEditLessonForm({ ...editLessonForm, youtubeUrl: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Тривалість (хвилин)</label>
                <input
                  type="number"
                  step="0.5"
                  min="3"
                  max="7"
                  value={editLessonForm.duration_minutes}
                  onChange={(e) => setEditLessonForm({ ...editLessonForm, duration_minutes: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Опис</label>
                <textarea
                  value={editLessonForm.description}
                  onChange={(e) => setEditLessonForm({ ...editLessonForm, description: e.target.value })}
                  rows="5"
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-sky-500 resize-y min-h-[120px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">Теги (категорії)</label>
                <div className="flex flex-wrap gap-2">
                  {availableCategories.map((tag) => {
                    const isSelected = editLessonForm.categories.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setEditLessonForm(prev => ({
                            ...prev,
                            categories: isSelected
                              ? prev.categories.filter(t => t !== tag)
                              : [...prev.categories, tag]
                          }));
                        }}
                        className={`px-4 py-2 rounded-3xl text-sm font-medium transition-all ${isSelected
                            ? 'bg-sky-500 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
                {editLessonForm.categories.length > 0 && (
                  <p className="text-xs text-gray-500 mt-3">
                    Вибрано: {editLessonForm.categories.join(', ')}
                  </p>
                )}
              </div>

              {/* МІНІ-ТЕСТ */}
              <div className="pt-6 border-t">
                <div className="flex items-center justify-between mb-4">
                  <label className="flex items-center gap-3 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={editLessonForm.hasQuiz}
                      onChange={toggleQuiz}
                      className="w-4 h-4 accent-black"
                    />
                    Додати міні-тест після уроку (максимум 5 питань)
                  </label>
                  {editLessonForm.hasQuiz && (
                    <span className="text-xs text-gray-500">{editLessonForm.quizQuestions.length}/5</span>
                  )}
                </div>

                {editLessonForm.hasQuiz && (
                  <div className="space-y-8">
                    {editLessonForm.quizQuestions.map((q, qIndex) => (
                      <div key={qIndex} className="border border-gray-200 rounded-2xl p-6 bg-gray-50">
                        <div className="flex justify-between mb-4">
                          <h4 className="font-medium">Питання {qIndex + 1}</h4>
                          <button type="button" onClick={() => removeQuestion(qIndex)} className="text-red-600 text-xl">×</button>
                        </div>

                        <input
                          type="text"
                          value={q.question}
                          onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                          placeholder="Текст питання"
                          className="w-full px-4 py-3 border border-gray-300 rounded-2xl mb-4"
                        />

                        <div className="space-y-3">
                          {q.options.map((option, optIndex) => (
                            <div key={optIndex} className="flex items-center gap-3">
                              <input
                                type="radio"
                                name={`correct-${qIndex}`}
                                checked={q.correctAnswer === optIndex}
                                onChange={() => updateQuestion(qIndex, 'correctAnswer', optIndex)}
                                className="accent-black"
                              />
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                                placeholder={`Варіант ${optIndex + 1}`}
                                className="flex-1 px-4 py-3 border border-gray-300 rounded-2xl"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {editLessonForm.quizQuestions.length < 5 && (
                      <button
                        type="button"
                        onClick={addQuestion}
                        className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-600 hover:border-gray-400 hover:text-gray-800"
                      >
                        + Додати ще питання
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Фіксовані кнопки внизу */}
            <div className="px-8 py-6 border-t bg-white rounded-b-3xl flex gap-4">
              <button
                onClick={() => setIsEditLessonModalOpen(false)}
                className="flex-1 py-3 border border-gray-300 rounded-3xl hover:bg-gray-50 font-medium"
              >
                Скасувати
              </button>
              <button
                onClick={saveEditedLesson}
                className="flex-1 py-3 bg-black text-white rounded-3xl hover:bg-gray-800 font-medium"
              >
                Зберегти зміни
              </button>
            </div>

          </div>
        </div>
      )}

      { /* Модальне вікно редагування аватара */ }
      {isAvatarModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl w-full max-w-md p-8">
            <h2 className="text-2xl font-semibold mb-6">Змінити фото профілю</h2>
            <input
              type="text"
              placeholder="Вставте пряме посилання на зображення"
              value={newAvatarUrl}
              onChange={(e) => setNewAvatarUrl(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-2xl mb-4"
            />
            {avatarError && <p className="text-red-600 text-sm mb-4">{avatarError}</p>}

            <div className="flex gap-4">
              <button onClick={() => setIsAvatarModalOpen(false)} className="flex-1 py-3 border rounded-3xl">Скасувати</button>
              <button 
                onClick={saveAvatar} 
                disabled={avatarValidating || !newAvatarUrl}
                className="flex-1 py-3 bg-black text-white rounded-3xl disabled:bg-gray-400"
              >
                {avatarValidating ? "Перевірка..." : "Зберегти фото"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Повне редагування профілю */}
      {isEditProfileModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl w-full max-w-md p-8">
            <h2 className="text-2xl font-semibold mb-6">Редагувати профіль</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Ім'я</label>
                <input type="text" value={editProfileForm.displayName} onChange={(e) => setisEditProfileModalOpen({...editProfileForm, displayName: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-2xl" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Посилання на фото</label>
                <input type="text" value={editProfileForm.photoURL} onChange={(e) => setisEditProfileModalOpen({...editProfileForm, photoURL: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-2xl" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Біо</label>
                <textarea value={editProfileForm.bio} onChange={(e) => setisEditProfileModalOpen({...editProfileForm, bio: e.target.value})} rows="4" className="w-full px-4 py-3 border border-gray-300 rounded-2xl" />
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setisEditProfileModalOpen(false)} className="flex-1 py-3 border rounded-3xl">Скасувати</button>
              <button onClick={saveProfile} className="flex-1 py-3 bg-black text-white rounded-3xl">Зберегти зміни</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}