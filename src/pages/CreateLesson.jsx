// src/pages/CreateLesson.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import { addLesson } from '../firebase/firestoreService';
import { auth } from '../firebase/config';
import { db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';

export default function CreateLesson() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    videoSource: 'youtube', // 'youtube' або 'googledrive'
    thumbnailOption: 'auto', // для YouTube: 'auto' або 'custom'
    thumbnailUrl: '',
    duration_minutes: 5,
    categories: [],
    hasQuiz: false,
    quizQuestions: [],
    allowComments: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [videoPreview, setVideoPreview] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [extractingThumbnail, setExtractingThumbnail] = useState(false);

  const availableCategories = [
    "React", "JavaScript", "UI/UX", "Дизайн", "Кулінарія",
    "Музика", "Гітара", "Кар'єра", "IT",
    "Python", "English", "Математика", "Фізика", "Історія",
    "Література", "Філософія", "Мистецтво", "Фотографія", "Маркетинг",
    "Бізнес", "Фінанси", "Здоров'я", "Спорт", "Подорожі", "Українська мова",
    "Психологія", "Саморозвиток", "Медицина", "Геймінг"
  ];

  // Функція для конвертації Google Drive URL в пряме посилання
  const convertGoogleDriveToDirectLink = (url) => {
    if (!url) return null;
    
    // Патерни для різних типів посилань Google Drive
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9_-]+)/,           // https://drive.google.com/file/d/FILE_ID/view
      /id=([a-zA-Z0-9_-]+)/,                    // ?id=FILE_ID
      /\/d\/([a-zA-Z0-9_-]+)/,                  // /d/FILE_ID
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        // Пряме посилання для вбудовування
        return `https://drive.google.com/uc?export=download&id=${match[1]}`;
      }
    }
    return null;
  };

  // Функція для отримання ID відео з Google Drive
  const getGoogleDriveId = (url) => {
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9_-]+)/,
      /id=([a-zA-Z0-9_-]+)/,
      /\/d\/([a-zA-Z0-9_-]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  // Функція для отримання URL для вбудовування (embed)
  const getEmbedUrl = (url, source) => {
    if (source === 'youtube') {
      // YouTube embed
      const youtubeId = extractYouTubeId(url);
      return youtubeId ? `https://www.youtube.com/embed/${youtubeId}` : null;
    } else if (source === 'googledrive') {
      // Google Drive embed
      const fileId = getGoogleDriveId(url);
      return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : null;
    }
    return null;
  };

  // Функція для отримання мініатюри з YouTube
  const getYouTubeThumbnail = (url) => {
    const youtubeId = extractYouTubeId(url);
    return youtubeId ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg` : null;
  };

  // Перевірка валідності URL залежно від джерела
  const isValidVideoUrl = (url, source) => {
    if (!url) return false;
    
    if (source === 'youtube') {
      const regex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
      return regex.test(url);
    } else if (source === 'googledrive') {
      const regex = /drive\.google\.com\/file\/d\/|drive\.google\.com\/open\?id=/;
      return regex.test(url);
    }
    return false;
  };

  const isValidImageUrl = (url) => {
    if (!url) return false;
    const regex = /^(https?:\/\/).+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;
    return regex.test(url);
  };

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
            navigate('/');
            return;
          }
        } else {
          console.error("Користувача не знайдено в БД");
        }
      } catch (err) {
        console.error("Помилка перевірки блокування:", err);
        alert("Сталася помилка. Спробуйте пізніше.");
      }
    };

    checkUserBlockStatus();
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

  // Оновлення попереднього перегляду відео
  useEffect(() => {
    if (formData.videoUrl && formData.videoSource === 'googledrive') {
      const embedUrl = getEmbedUrl(formData.videoUrl, 'googledrive');
      setVideoPreview(embedUrl);
    } else {
      setVideoPreview(null);
    }
  }, [formData.videoUrl, formData.videoSource]);

  const handleVideoSourceChange = (source) => {
    setFormData(prev => ({ 
      ...prev, 
      videoSource: source,
      videoUrl: '',
      thumbnailOption: source === 'youtube' ? 'auto' : 'custom',
      thumbnailUrl: ''
    }));
    setVideoPreview(null);
    setThumbnailPreview(null);
  };

  // Автоматичне отримання мініатюри для YouTube
  useEffect(() => {
    if (formData.videoSource === 'youtube' && formData.thumbnailOption === 'auto' && formData.videoUrl) {
      setExtractingThumbnail(true);
      const thumbnail = getYouTubeThumbnail(formData.videoUrl);
      setThumbnailPreview(thumbnail);
      setFormData(prev => ({ ...prev, thumbnailUrl: thumbnail || '' }));
      setExtractingThumbnail(false);
    }
  }, [formData.videoSource, formData.videoUrl, formData.thumbnailOption]);

  // Оновлення попереднього перегляду кастомної мініатюри
  useEffect(() => {
    if (formData.thumbnailOption === 'custom' && formData.thumbnailUrl) {
      setThumbnailPreview(formData.thumbnailUrl);
    }
  }, [formData.thumbnailOption, formData.thumbnailUrl]);

  const handleThumbnailSourceChange = (source) => {
    setFormData(prev => ({ 
      ...prev, 
      thumbnailSource: source,
      thumbnailUrl: source === 'url' ? prev.thumbnailUrl : '',
      thumbnailDriveUrl: source === 'googledrive' ? prev.thumbnailDriveUrl : '',
    }));
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

    if (!formData.videoUrl || !isValidVideoUrl(formData.videoUrl, formData.videoSource)) {
      setError(formData.videoSource === 'youtube' 
        ? "Введіть коректне посилання на YouTube"
        : "Введіть коректне посилання на Google Drive");
      setLoading(false);
      return;
    }

    // Валідація мініатюри для YouTube (якщо вибрано кастомне посилання)
    if (formData.videoSource === 'youtube' && 
        formData.thumbnailOption === 'custom' && 
        !isValidImageUrl(formData.thumbnailUrl)) {
      setError("Введіть коректне посилання на зображення (jpg, png, gif, webp)");
      setLoading(false);
      return;
    }

    // Валідація мініатюри для Google Drive (обов'язково потрібне посилання)
    if (formData.videoSource === 'googledrive' && !isValidImageUrl(formData.thumbnailUrl)) {
      setError("Введіть коректне посилання на зображення для мініатюри (jpg, png, gif, webp)");
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
      // Формування даних про відео
      let videoData;
      let embedUrl = '';
      let finalThumbnailUrl = '';

      if (formData.videoSource === 'youtube') {
        const youtubeId = extractYouTubeId(formData.videoUrl);
        embedUrl = `https://www.youtube.com/embed/${youtubeId}`;
        videoData = formData.videoUrl;
        
        // Визначаємо мініатюру для YouTube
        if (formData.thumbnailOption === 'auto') {
          finalThumbnailUrl = getYouTubeThumbnail(formData.videoUrl) || '';
        } else {
          finalThumbnailUrl = formData.thumbnailUrl;
        }
      } 
      else if (formData.videoSource === 'googledrive') {
        const fileId = getGoogleDriveId(formData.videoUrl);
        embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
        videoData = {
          original: formData.videoUrl,
          fileId: fileId,
          embedUrl: embedUrl
        };
        // Для Google Drive використовуємо кастомне посилання на зображення
        finalThumbnailUrl = formData.thumbnailUrl;
      }

      const currentUser = auth.currentUser;

      const lessonData = {
        title: formData.title.trim(),
        description: formData.description.trim() || '',
        video_url: videoData,
        video_source: formData.videoSource,
        embed_url: embedUrl,
        thumbnail_url: finalThumbnailUrl,
        duration_minutes: parseFloat(formData.duration_minutes),
        categories: formData.categories,
        
        // Дані автора
        author_id: currentUser.uid,
        author_name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Анонім',
        author_avatar: currentUser.photoURL || `https://i.pravatar.cc/128?u=${currentUser.uid}`, // ← Додано
        
        // Дозвіл на коментарі
        allow_comments: formData.allowComments,

        // Міні-тест
        has_quiz: formData.hasQuiz,
        quiz_questions: formData.hasQuiz ? formData.quizQuestions : [],

        uploaded_at: new Date(),
        // is_approved: false,
        status: 'pending',
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

          {/* Вибір джерела відео */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Джерело відео *
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => handleVideoSourceChange('youtube')}
                className={`px-6 py-2 rounded-xl font-medium transition-colors ${
                  formData.videoSource === 'youtube'
                    ? 'bg-sky-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                YouTube
              </button>
              <button
                type="button"
                onClick={() => handleVideoSourceChange('googledrive')}
                className={`px-6 py-2 rounded-xl font-medium transition-colors ${
                  formData.videoSource === 'googledrive'
                    ? 'bg-sky-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Google Drive
              </button>
            </div>
          </div>

          {/* Посилання на відео */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {formData.videoSource === 'youtube' 
                ? 'Посилання на YouTube відео *'
                : 'Посилання на Google Drive відео *'}
            </label>
            <input
              type="url"
              name="videoUrl"
              value={formData.videoUrl}
              onChange={handleChange}
              className="w-full px-5 py-4 border border-gray-300 rounded-2xl focus:outline-none focus:border-sky-500 text-lg"
              placeholder={formData.videoSource === 'youtube'
                ? "https://youtu.be/... або https://www.youtube.com/watch?v=..."
                : "https://drive.google.com/file/d/.../view"}
              required
            />
            {formData.videoSource === 'googledrive' && (
              <p className="text-sm text-gray-500 mt-2">
                💡 Вставте посилання на відео з Google Drive (наприклад: https://drive.google.com/file/d/FILE_ID/view)
              </p>
            )}
          </div>

          {/* Попередній перегляд відео для Google Drive */}
          {videoPreview && formData.videoSource === 'googledrive' && (
            <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50">
              <p className="text-sm font-medium text-gray-700 mb-3">Попередній перегляд відео:</p>
              <iframe
                src={videoPreview}
                className="w-full h-64 rounded-xl"
                allow="autoplay"
                allowFullScreen
                title="Google Drive Video Preview"
              ></iframe>
            </div>
          )}

          {/* Мініатюра - різна логіка для YouTube та Google Drive */}
          <div className="border-t pt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Мініатюра (обкладинка) уроку
              {formData.videoSource === 'googledrive' && <span className="text-red-500 ml-1">*</span>}
            </label>

            {/* Для YouTube - вибір між автоматичною та кастомною мініатюрою */}
            {formData.videoSource === 'youtube' && (
              <>
                <div className="flex gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, thumbnailOption: 'auto', thumbnailUrl: '' }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.thumbnailOption === 'auto'
                        ? 'bg-sky-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    🎬 Автоматично з YouTube
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, thumbnailOption: 'custom' }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.thumbnailOption === 'custom'
                        ? 'bg-sky-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    📷 Своє посилання
                  </button>
                </div>

                {/* Кастомне посилання для YouTube */}
                {formData.thumbnailOption === 'custom' && (
                  <div className="mb-4">
                    <input
                      type="url"
                      name="thumbnailUrl"
                      value={formData.thumbnailUrl}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-sky-500"
                      placeholder="https://example.com/image.jpg"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Пряме посилання на зображення (jpg, png, gif, webp)
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Для Google Drive - тільки кастомне посилання на фото */}
            {formData.videoSource === 'googledrive' && (
              <div>
                <input
                  type="url"
                  name="thumbnailUrl"
                  value={formData.thumbnailUrl}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-sky-500"
                  placeholder="https://example.com/image.jpg"
                  required
                />
                <p className="text-sm text-gray-500 mt-2">
                  💡 Вставте пряме посилання на зображення для мініатюри
                </p>
              </div>
            )}

            {/* Попередній перегляд мініатюри */}
            {extractingThumbnail ? (
              <div className="flex items-center justify-center p-8 bg-gray-100 rounded-xl mt-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
                <span className="ml-2 text-gray-500">Отримання мініатюри...</span>
              </div>
            ) : thumbnailPreview && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Попередній перегляд:</p>
                <div className="relative group">
                  <img
                    src={thumbnailPreview}
                    alt="Прев'ю уроку"
                    className="w-full max-h-64 object-cover rounded-xl border border-gray-200"
                    onError={(e) => {
                      e.target.src = '/images/placeholder-image.jpg';
                      setError('Не вдалося завантажити зображення');
                    }}
                  />
                </div>
              </div>
            )}

            {formData.videoSource === 'youtube' && formData.thumbnailOption === 'auto' && formData.videoUrl && (
              <p className="text-sm text-green-600 mt-2">
                ✅ Мініатюра буде автоматично взята з YouTube відео
              </p>
            )}

            {formData.videoSource === 'youtube' && formData.thumbnailOption === 'custom' && !formData.thumbnailUrl && (
              <p className="text-sm text-gray-500 mt-2">
                📷 Додайте посилання на зображення для кастомної мініатюри
              </p>
            )}
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
          
          {/* Дозволити коментарі */}
          <div className="pt-4 border-t">
            <label className="flex items-center gap-3 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={formData.allowComments}
                onChange={(e) => setFormData(prev => ({ ...prev, allowComments: e.target.value === 'on' }))}
                className="w-4 h-4 accent-black"
              />
              Дозволити коментарі під уроком
            </label>
          </div>

          {/* НОВИЙ БЛОК: Міні-тест */}
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