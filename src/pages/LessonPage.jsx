// src/pages/LessonPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import { getLessonById, incrementViews, saveTestResult, updateLessonProgress } from '../firebase/firestoreService';
import { auth, db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';

export default function LessonPage({ user, onLoginClick }) {
  const { lessonId } = useParams();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);

  // Стан модального вікна тесту
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [testCompleted, setTestCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const fetchLessonAndProgress = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      try {
        // 1. Завантажуємо дані уроку
        const lessonData = await getLessonById(lessonId);
        if (!lessonData) {
          setError("Урок не знайдено");
          return;
        }
        setLesson(lessonData);
        await incrementViews(lessonId);

        // 2. Перевіряємо, чи урок вже пройдено користувачем
        const progressId = `${auth.currentUser.uid}_${lessonId}`;
        const progressRef = doc(db, 'progress', progressId);   // потрібно імпортувати doc
        const progressSnap = await getDoc(progressRef);

        if (progressSnap.exists()) {
          const progressData = progressSnap.data();
          setIsCompleted(progressData.is_completed === true);
        }
      } catch (err) {
        console.error("Помилка завантаження уроку або прогресу:", err);
        setError("Не вдалося завантажити урок");
      } finally {
        setLoading(false);
      }
    };

    fetchLessonAndProgress();
  }, [lessonId]);

  // === Виправлена функція отримання YouTube ID ===
  const getYouTubeVideoId = (url) => {
    if (!url) return null;

    // Регулярний вираз для різних форматів YouTube посилань
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const videoId = getYouTubeVideoId(lesson?.youtube_url);
  const embedUrl = videoId 
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1` 
    : null;

  // Форматування дати
  const formatDate = (timestamp) => {
    if (!timestamp) return "Дата не вказана";

    let date;
    if (timestamp?.toDate) date = timestamp.toDate();
    else if (timestamp instanceof Date) date = timestamp;
    else date = new Date(timestamp);

    return isNaN(date.getTime()) 
      ? "Дата не вказана" 
      : date.toLocaleDateString('uk-UA', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        });
  };

  // === Логіка тесту ===
  const startTest = () => {
    if (!user) {
      onLoginClick();
      return;
    }
    if (!lesson?.has_quiz || !lesson.quiz_questions?.length) {
      alert("Для цього уроку тест ще не додано");
      return;
    }

    setIsTestModalOpen(true);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setTestCompleted(false);
    setShowResults(false);
    setScore(0);
  };

  const handleAnswerSelect = (questionIndex, optionIndex) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: optionIndex
    }));
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < lesson.quiz_questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      finishTest();
    }
  };

  const finishTest = () => {
    let correctCount = 0;
    const questions = lesson.quiz_questions;

    questions.forEach((q, index) => {
      if (selectedAnswers[index] === q.correctAnswer) {
        correctCount++;
      }
    });

    const finalScore = Math.round((correctCount / questions.length) * 100);
    const passed = finalScore >= 70; // прохідний бал 70%

    setScore(finalScore);
    setTestCompleted(true);
    setShowResults(true);

    // Зберігаємо результат у Firebase
    if (auth.currentUser) {
      saveTestResult(auth.currentUser.uid, lessonId, {
        score: finalScore,
        max_score: 100,
        passed: passed,
        answers: Object.entries(selectedAnswers).map(([qIndex, ans]) => ({
          questionIndex: parseInt(qIndex),
          selectedAnswer: ans
        }))
      }).catch(err => console.error("Помилка збереження результату:", err));
    }

    if (passed) {
      setIsCompleted(true);
    }
  };

  const resetTest = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowResults(false);
    setTestCompleted(false);
    setScore(0);
  };

  const closeTestModal = () => {
    setIsTestModalOpen(false);
    // Якщо тест пройдено успішно — залишаємо completed
  };

  const handleMarkAsLearned = () => {
    if (!user) {
      onLoginClick();
      return;
    }
    setIsCompleted(true);
    alert("✅ Урок позначено як вивчений!");
  };

  const handleTakeTest = () => {
    if (!user) {
      onLoginClick();
      return;
    }
    alert("🧪 Функціонал тестування буде додано пізніше");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Завантаження уроку...</div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <h2 className="text-2xl font-semibold text-red-600 mb-4">
          {error || "Урок не знайдено"}
        </h2>
        <button 
          onClick={() => navigate('/')}
          className="mt-6 px-8 py-3 bg-black text-white rounded-3xl hover:bg-gray-800"
        >
          Повернутися на головну
        </button>
      </div>
    );
  }

  const currentQuestion = lesson.quiz_questions?.[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} onLoginClick={onLoginClick} />

      <div className="max-w-6xl mx-auto px-6 py-8">
        
        {/* Кнопка повернення */}
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-x-2 text-gray-600 hover:text-gray-900 mb-8 font-medium"
        >
          ← Повернутися на головну
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Відео + основний контент */}
          <div className="lg:col-span-8">
            {/* Відео плеєр */}
            <div className="bg-black rounded-3xl overflow-hidden shadow-2xl aspect-video">
              {embedUrl ? (
                <iframe
                  width="100%"
                  height="100%"
                  src={embedUrl}
                  title={lesson.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                ></iframe>
              ) : (
                <div className="flex items-center justify-center h-full text-white">
                  Не вдалося завантажити відео
                </div>
              )}
            </div>

            {/* Назва уроку */}
            <h1 className="text-3xl font-semibold text-gray-900 mt-8 leading-tight">
              {lesson.title}
            </h1>

            {/* Метадані */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-5 text-gray-600">
              <div className="flex items-center gap-1.5">
                <i className="fa-solid fa-eye"></i>
                <span>{lesson.views_count?.toLocaleString('uk-UA') || 0} переглядів</span>
              </div>
              <div className="flex items-center gap-1.5">
                <i className="fa-solid fa-clock"></i>
                <span>{lesson.duration_minutes || 5} хв</span>
              </div>
              <div className="flex items-center gap-1.5">
                <i className="fa-solid fa-calendar"></i>
                <span>{formatDate(lesson.uploaded_at)}</span>
              </div>
            </div>

            {/* Теги */}
            {lesson.categories && lesson.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-6">
                {lesson.categories.map((tag, i) => (
                  <span key={i} className="bg-gray-100 px-4 py-1.5 rounded-3xl text-sm text-gray-700">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Кнопки дій */}
            <div className="flex gap-4 mt-10">
              <button
                onClick={handleMarkAsLearned}
                className={`flex-1 py-4 rounded-3xl font-semibold text-lg flex items-center justify-center gap-2 transition-all ${
                  isCompleted ? 'bg-green-600 text-white' : 'bg-black hover:bg-gray-900 text-white'
                }`}
              >
                <i className="fa-solid fa-check"></i>
                {isCompleted ? "Вивчено ✓" : "Я вивчив"}
              </button>

              <button
                onClick={startTest}
                disabled={!lesson.has_quiz || !lesson.quiz_questions?.length}
                className="flex-1 py-4 border-2 border-gray-800 hover:bg-gray-900 hover:text-white font-semibold text-lg rounded-3xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {lesson.has_quiz ? "Пройти міні-тест" : "Тест скоро буде"}
              </button>
            </div>

            {/* Опис */}
            <div className="mt-12">
              <h3 className="text-xl font-semibold mb-4">Про урок</h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {lesson.description || "Опис уроку поки що відсутній."}
              </p>
            </div>
          </div>

          {/* Бічна колонка */}
          <div className="lg:col-span-4">
            <div className="sticky top-8">
              <div className="bg-white rounded-3xl p-6">
                <p className="text-sm text-gray-500 mb-3">Автор</p>
                <div className="flex items-center gap-4">
                  <img 
                    src={lesson.author_avatar || `https://i.pravatar.cc/128?u=${lesson.author_id}`}
                    alt={lesson.author_name}
                    className="w-14 h-14 rounded-2xl"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">{lesson.author_name}</p>
                    <p className="text-sm text-sky-600 cursor-pointer hover:underline">
                      Переглянути профіль
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ====================== МОДАЛЬНЕ ВІКНО ТЕСТУ ====================== */}
      {isTestModalOpen && lesson?.quiz_questions && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Заголовок */}
            <div className="px-8 py-6 border-b flex items-center justify-between bg-gray-50 rounded-t-3xl">
              <h2 className="text-2xl font-semibold">Міні-тест</h2>
              <button onClick={closeTestModal} className="text-3xl text-gray-400 hover:text-gray-600">×</button>
            </div>

            {/* Контент тесту */}
            <div className="flex-1 p-8 overflow-y-auto">
              {!showResults ? (
                // Питання
                <div>
                  <div className="flex justify-between text-sm text-gray-500 mb-6">
                    <span>Питання {currentQuestionIndex + 1} з {lesson.quiz_questions.length}</span>
                    <span>{Math.round(((currentQuestionIndex + 1) / lesson.quiz_questions.length) * 100)}%</span>
                  </div>

                  <h3 className="text-xl font-medium mb-8 leading-relaxed">
                    {currentQuestion?.question}
                  </h3>

                  <div className="space-y-3">
                    {currentQuestion?.options.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleAnswerSelect(currentQuestionIndex, index)}
                        className={`w-full text-left px-6 py-4 rounded-2xl border transition-all ${
                          selectedAnswers[currentQuestionIndex] === index
                            ? 'border-sky-500 bg-sky-50 text-sky-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                // Результати
                <div className="text-center py-8">
                  <div className={`text-7xl mb-6 ${score >= 70 ? 'text-green-500' : 'text-orange-500'}`}>
                    {score >= 70 ? '🎉' : '📝'}
                  </div>
                  <h3 className="text-3xl font-semibold mb-2">
                    Ваш результат: <span className={score >= 70 ? 'text-green-600' : 'text-orange-600'}>{score}%</span>
                  </h3>
                  <p className="text-gray-600 mb-8">
                    {score >= 70 
                      ? "Відмінно! Ви успішно пройшли тест." 
                      : "Можна краще! Спробуйте ще раз."}
                  </p>

                  <button
                    onClick={resetTest}
                    className="px-8 py-3 bg-black text-white rounded-3xl hover:bg-gray-800 mb-4"
                  >
                    Спробувати ще раз
                  </button>
                </div>
              )}
            </div>

            {/* Кнопки управління */}
            {!showResults && (
              <div className="p-8 border-t bg-white">
                <button
                  onClick={goToNextQuestion}
                  disabled={selectedAnswers[currentQuestionIndex] === undefined}
                  className="w-full py-4 bg-black text-white font-semibold rounded-3xl disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {currentQuestionIndex === lesson.quiz_questions.length - 1 ? "Завершити тест" : "Наступне питання"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}