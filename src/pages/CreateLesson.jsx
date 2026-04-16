// src/pages/CreateLesson.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import { addLesson } from '../firebase/firestoreService';
import { auth } from '../firebase/config';

export default function CreateLesson() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    youtubeUrl: '',
    duration_minutes: 5,
    categories: [],
    hasQuiz: false,
    quizQuestions: []
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const availableCategories = [
    "React", "JavaScript", "UI/UX", "Design", "Cooking", 
    "Music", "Guitar", "Psychology", "Career", "IT", 
    "Python", "English", "Математика", "Фізика", "Історія",
    "Література", "Філософія", "Мистецтво", "Фотографія", "Маркетинг",
    "Бізнес", "Фінанси", "Здоров'я", "Спорт", "Подорожі", "Українська мова",
     "Психологія", "Саморозвиток", "Медицина", "Геймінг"
  ];

  // Додавання нового питання
  const addQuestion = () => {
    if (formData.quizQuestions.length >= 5) return;

    setFormData(prev => ({
      ...prev,
      quizQuestions: [
        ...prev.quizQuestions,
        {
          question: '',
          options: ['', '', '', ''],
          correctAnswer: 0
        }
      ]
    }));
  };

// Зміна питання
  const updateQuestion = (index, field, value) => {
    setFormData(prev => {
      const newQuestions = [...prev.quizQuestions];
      newQuestions[index][field] = value;
      return { ...prev, quizQuestions: newQuestions };
    });
  };

  // Зміна варіанту відповіді
  const updateOption = (qIndex, optIndex, value) => {
    setFormData(prev => {
      const newQuestions = [...prev.quizQuestions];
      newQuestions[qIndex].options[optIndex] = value;
      return { ...prev, quizQuestions: newQuestions };
    });
  };

  // Видалення питання
  const removeQuestion = (index) => {
    setFormData(prev => ({
      ...prev,
      quizQuestions: prev.quizQuestions.filter((_, i) => i !== index)
    }));
  };

  // Перемикач "Додати міні-тест"
  const toggleQuiz = () => {
    setFormData(prev => ({
      ...prev,
      hasQuiz: !prev.hasQuiz,
      quizQuestions: prev.hasQuiz ? [] : prev.quizQuestions
    }));
  };

  // Перевірка авторизації
  useEffect(() => {
    if (!auth.currentUser) {
      alert("Для створення уроку потрібно увійти в акаунт");
      navigate('/');
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleCategory = (category) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(cat => cat !== category)
        : [...prev.categories, category]
    }));
  };

  const isValidYouTubeUrl = (url) => {
    const regex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    return regex.test(url);
  };

  const extractYouTubeId = (url) => {
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.title.trim()) {
      setError("Вкажіть назву уроку");
      setLoading(false);
      return;
    }

    if (!formData.youtubeUrl || !isValidYouTubeUrl(formData.youtubeUrl)) {
      setError("Введіть коректне посилання на YouTube");
      setLoading(false);
      return;
    }

    if (formData.categories.length === 0) {
      setError("Оберіть хоча б одну категорію");
      setLoading(false);
      return;
    }

    // Валідація питань, якщо тест увімкнено
    if (formData.hasQuiz && formData.quizQuestions.length === 0) {
      setError("Додайте хоча б одне питання до тесту");
      setLoading(false);
      return;
    }

    try {
      const youtubeId = extractYouTubeId(formData.youtubeUrl);
      const thumbnailUrl = youtubeId 
        ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`
        : '';

      const currentUser = auth.currentUser;

      const lessonData = {
        title: formData.title.trim(),
        description: formData.description.trim() || '',
        youtube_url: formData.youtubeUrl.trim(),
        thumbnail_url: thumbnailUrl,
        duration_minutes: parseFloat(formData.duration_minutes),
        categories: formData.categories,
        
        // === Дані автора ===
        author_id: currentUser.uid,
        author_name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Анонім',
        author_avatar: currentUser.photoURL || `https://i.pravatar.cc/128?u=${currentUser.uid}`, // ← Додано
        
        // Міні-тест
        has_quiz: formData.hasQuiz,
        quiz_questions: formData.hasQuiz ? formData.quizQuestions : [],

        uploaded_at: new Date(),
        is_approved: false,
        views_count: 0,
        likes_count: 0,
        completions_count: 0,
      };

      await addLesson(lessonData);

      setSuccess(true);

      setTimeout(() => {
        navigate('/');
      }, 1800);

    } catch (err) {
      console.error(err);
      setError("Не вдалося створити урок. Спробуйте ще раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={auth.currentUser} onLoginClick={() => {}} />

      <div className="max-w-2xl mx-auto px-6 pt-8 pb-16">
        <div className="mb-10">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-x-2 text-gray-600 hover:text-gray-900 mb-6 font-medium"
          >
            ← Повернутися на головну
          </button>

          <h1 className="text-4xl font-semibold tracking-tighter text-gray-900">
            Створити новий урок
          </h1>
          <p className="text-gray-600 mt-3 text-lg">
            Поділіться своїми знаннями у форматі 5-хвилинного відео
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm p-10 space-y-8">
          
          {/* Назва уроку */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Назва уроку *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-5 py-4 border border-gray-300 rounded-2xl focus:outline-none focus:border-sky-500 text-lg"
              placeholder="Наприклад: Основи React Hooks за 5 хвилин"
              required
            />
          </div>

          {/* YouTube посилання */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Посилання на YouTube відео *
            </label>
            <input
              type="url"
              name="youtubeUrl"
              value={formData.youtubeUrl}
              onChange={handleChange}
              className="w-full px-5 py-4 border border-gray-300 rounded-2xl focus:outline-none focus:border-sky-500"
              placeholder="https://youtu.be/... або https://www.youtube.com/watch?v=..."
              required
            />
          </div>

          {/* Тривалість */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Тривалість (хвилин) *</label>
            <input
              type="number"
              name="duration_minutes"
              value={formData.duration_minutes}
              onChange={handleChange}
              min="3"
              max="7"
              step="0.5"
              className="w-full px-5 py-4 border border-gray-300 rounded-2xl focus:outline-none focus:border-sky-500"
              required
            />
          </div>

          {/* Опис */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Опис уроку</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              className="w-full px-5 py-4 border border-gray-300 rounded-2xl focus:outline-none focus:border-sky-500 resize-y"
              placeholder="Коротко опишіть, що дізнається учень..."
            />
          </div>

          {/* Категорії */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Категорії *</label>
            <div className="flex flex-wrap gap-3">
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`px-5 py-2.5 rounded-3xl text-sm font-medium transition-all ${
                    formData.categories.includes(cat)
                      ? 'bg-sky-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          
          {/* === НОВИЙ БЛОК: Міні-тест === */}
          <div className="pt-6 border-t">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.hasQuiz}
                  onChange={toggleQuiz}
                  className="w-4 h-4 accent-black"
                />
                Додати міні-тест після уроку (макс. 5 питань)
              </label>
              {formData.hasQuiz && (
                <span className="text-xs text-gray-500">
                  {formData.quizQuestions.length}/5
                </span>
              )}
            </div>

            {formData.hasQuiz && (
              <div className="space-y-8">
                {formData.quizQuestions.map((q, qIndex) => (
                  <div key={qIndex} className="border border-gray-200 rounded-2xl p-6 bg-gray-50">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-medium">Питання {qIndex + 1}</h3>
                      <button
                        type="button"
                        onClick={() => removeQuestion(qIndex)}
                        className="text-red-600 hover:text-red-700 text-xl leading-none"
                      >
                        ×
                      </button>
                    </div>

                    <input
                      type="text"
                      value={q.question}
                      onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                      placeholder="Введіть текст питання"
                      className="w-full px-4 py-3 border border-gray-300 rounded-2xl mb-4"
                    />

                    <div className="space-y-3">
                      {q.options.map((option, optIndex) => (
                        <div key={optIndex} className="flex gap-3 items-center">
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

                {formData.quizQuestions.length < 5 && (
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-all"
                  >
                    + Додати ще питання
                  </button>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-2xl text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 text-green-700 p-4 rounded-2xl text-sm">
              Урок успішно опубліковано! Перенаправляємо на головну...
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black hover:bg-gray-900 disabled:bg-gray-400 text-white font-semibold py-4 rounded-3xl text-lg transition-all"
          >
            {loading ? "Публікуємо урок..." : "Опублікувати урок"}
          </button>
        </form>
      </div>
    </div>
  );
}