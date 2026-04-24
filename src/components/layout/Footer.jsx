// src/components/layout/Footer.jsx
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, getDocs, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { auth } from '../../firebase/config';

export default function Footer() {
  const [adminEmail, setAdminEmail] = useState('admin@learnhub.com');
  const [popularCategories, setPopularCategories] = useState([
    "React", "JavaScript", "Python", "UI/UX", "Дизайн"
  ]);
  const [currentYear] = useState(new Date().getFullYear());
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Завантаження email адміністратора з Firestore
  useEffect(() => {
    const fetchAdminEmail = async () => {
      try {
        // Шукаємо користувача з роллю admin
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('role', '==', 'admin'), where('full_name', '==', 'admin'), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const adminData = querySnapshot.docs[0].data();
          if (adminData.email) {
            setAdminEmail(adminData.email);
          }
        }
      } catch (err) {
        console.error("Помилка завантаження email адміністратора:", err);
      }
    };

    fetchAdminEmail();
  }, []);

  // Завантаження найбільш використовуваних категорій
  useEffect(() => {
    const fetchPopularCategories = async () => {
      try {
        setLoadingCategories(true);
        
        // Отримуємо всі затверджені уроки
        const lessonsRef = collection(db, 'lessons');
        const q = query(lessonsRef, where('status', '==', 'approved'));
        const querySnapshot = await getDocs(q);
        
        // Підраховуємо частоту використання кожної категорії
        const categoriesCount = new Map();
        
        querySnapshot.docs.forEach(doc => {
          const lessonData = doc.data();
          const lessonCategories = lessonData.categories || [];
          
          lessonCategories.forEach(category => {
            if (categoriesCount.has(category)) {
              categoriesCount.set(category, categoriesCount.get(category) + 1);
            } else {
              categoriesCount.set(category, 1);
            }
          });
        });
        
        // Сортуємо категорії за кількістю використання та беремо топ-5
        const sortedCategories = Array.from(categoriesCount.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([category]) => category);
        
        if (sortedCategories.length > 0) {
          setPopularCategories(sortedCategories);
        }
      } catch (err) {
        console.error("Помилка завантаження популярних категорій:", err);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchPopularCategories();
  }, []);

  const handleContactClick = () => {
    window.location.href = `mailto:${adminEmail}`;
  };

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-screen-2xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Логотип та опис */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-x-3 mb-4">
              <div className="w-10 h-10 bg-sky-500 rounded-3xl flex items-center justify-center text-white text-3xl shadow-inner">
                📹
              </div>
              <span className="text-2xl font-bold tracking-tighter text-gray-900">LearnHub</span>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              5-хвилинні відео-уроки від спільноти. 
              Навчайтеся та діліться знаннями з усім світом.
            </p>
          </div>

          {/* Швидкі посилання */}
          <div className="col-span-1">
            <h3 className="font-semibold text-gray-900 mb-4">Навігація</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-600 hover:text-sky-600 transition-colors text-sm">
                  Головна
                </Link>
              </li>
              <li>
                <Link to="/create" className="text-gray-600 hover:text-sky-600 transition-colors text-sm">
                  Створити урок
                </Link>
              </li>
              <li>
                <Link to="/profile" className="text-gray-600 hover:text-sky-600 transition-colors text-sm">
                  Мій профіль
                </Link>
              </li>
            </ul>
          </div>

          {/* Популярні категорії */}
          <div className="col-span-1">
            <h3 className="font-semibold text-gray-900 mb-4">Популярні категорії</h3>
            {loadingCategories ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-5 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            ) : (
              <ul className="space-y-2">
                {popularCategories.map((category) => (
                  <li key={category}>
                    <p 
                      to={`/?category=${encodeURIComponent(category)}`} 
                      className="text-gray-600 hover:text-sky-600 transition-colors text-sm flex items-center gap-2"
                    >
                      <i className="fa-solid fa-hashtag text-gray-400 text-xs"></i>
                      {category}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Контакти та соцмережі */}
          <div className="col-span-1">
            <h3 className="font-semibold text-gray-900 mb-4">Зв'язок з адміном</h3>
            
            {/* Email для зв'язку */}
            <button
              onClick={handleContactClick}
              className="flex items-center gap-3 w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all group mb-4"
            >
              <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center group-hover:bg-sky-200 transition-colors">
                <i className="fa-solid fa-envelope text-sky-600 text-xl"></i>
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-500">Написати адміну</p>
                <p className="text-sm font-medium text-gray-700">{adminEmail}</p>
              </div>
            </button>

            {/* Telegram (якщо є) */}
            <button
              onClick={() => window.open('https://t.me/learnhub_support', '_blank')}
              className="flex items-center gap-3 w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all group"
            >
              <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center group-hover:bg-sky-200 transition-colors">
                <i className="fa-brands fa-telegram text-sky-600 text-xl"></i>
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-500">Telegram</p>
                <p className="text-sm font-medium text-gray-700">@learnhub_support</p>
              </div>
            </button>
          </div>
        </div>

        {/* Нижній рядок з копірайтом */}
        <div className="border-t border-gray-100 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-sm">
            © {currentYear} LearnHub. Всі права захищено.
          </p>
          
          <div className="flex gap-6">
            <p className="text-gray-400 hover:text-gray-600 transition-colors text-sm">
              Політика конфіденційності
            </p>
            <p className="text-gray-400 hover:text-gray-600 transition-colors text-sm">
              Умови використання
            </p>
            <button
              onClick={() => window.location.href = `mailto:${adminEmail}`}
              className="text-gray-400 hover:text-gray-600 transition-colors text-sm"
            >
              Підтримка
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}