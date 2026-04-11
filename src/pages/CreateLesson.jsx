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
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const availableCategories = [
    "React", "JavaScript", "UI/UX", "Design", "Cooking", 
    "Music", "Guitar", "Psychology", "Career", "IT", 
    "Python", "English"
  ];

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