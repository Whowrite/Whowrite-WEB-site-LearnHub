// components/common/MultiCategoryFilter.jsx
import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';

const staticCategories = [
  "React", "JavaScript", "UI/UX", "Дизайн", "Кулінарія",
  "Музика", "Гітара", "Кар'єра", "IT",
  "Python", "English", "Математика", "Фізика", "Історія",
  "Література", "Філософія", "Мистецтво", "Фотографія", "Маркетинг",
  "Бізнес", "Фінанси", "Здоров'я", "Спорт", "Подорожі", "Українська мова",
  "Психологія", "Саморозвиток", "Медицина", "Геймінг"
];

export default function MultiCategoryFilter({ selectedCategories, onCategoriesChange, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [availableCategories, setAvailableCategories] = useState(staticCategories);
  const [searchTerm, setSearchTerm] = useState('');

  // Завантаження категорій з БД
  useEffect(() => {
    const fetchUniqueCategories = async () => {
      try {
        const lessonsRef = collection(db, 'lessons');
        const querySnapshot = await getDocs(lessonsRef);
        
        const categoriesSet = new Set();
        querySnapshot.docs.forEach(doc => {
          const lessonData = doc.data();
          const lessonCategories = lessonData.categories || [];
          lessonCategories.forEach(category => categoriesSet.add(category));
          if (lessonData.category) categoriesSet.add(lessonData.category);
        });
        
        if (categoriesSet.size > 0) {
          setAvailableCategories(Array.from(categoriesSet).sort());
        }
      } catch (error) {
        console.error("Помилка завантаження категорій:", error);
      }
    };
    
    fetchUniqueCategories();
  }, []);

  // Фільтрація категорій за пошуком
  const filteredCategories = availableCategories.filter(category =>
    category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCategoryToggle = (category) => {
    if (selectedCategories.includes(category)) {
      onCategoriesChange(selectedCategories.filter(c => c !== category));
    } else {
      onCategoriesChange([...selectedCategories, category]);
    }
  };

  const handleClearAll = () => {
    onCategoriesChange([]);
  };

  const handleSelectAll = () => {
    onCategoriesChange([...availableCategories]);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Кнопка-тригер */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <i className="fa-solid fa-filter text-gray-500"></i>
        <span className="text-gray-700">
          Категорії {selectedCategories.length > 0 && `(${selectedCategories.length})`}
        </span>
        <i className={`fa-solid fa-chevron-down text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
      </button>

      {/* Випадаюча панель */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          
          <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="p-4">
              {/* Заголовок з кнопками */}
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-gray-900">Виберіть категорії</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Вибрати всі
                  </button>
                  <button
                    onClick={handleClearAll}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Очистити
                  </button>
                </div>
              </div>

              {/* Пошук по категоріях */}
              <div className="relative mb-3">
                <input
                  type="text"
                  placeholder="Пошук категорій..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 pl-8 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              </div>

              {/* Список категорій з чекбоксами */}
              <div className="max-h-64 overflow-y-auto space-y-2">
                {filteredCategories.map((category) => (
                  <label
                    key={category}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category)}
                      onChange={() => handleCategoryToggle(category)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-700 text-sm">{category}</span>
                  </label>
                ))}
                
                {filteredCategories.length === 0 && (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    Категорій не знайдено
                  </div>
                )}
              </div>

              {/* Кнопки дій */}
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                >
                  Застосувати ({selectedCategories.length})
                </button>
                <button
                  onClick={() => {
                    handleClearAll();
                    setIsOpen(false);
                  }}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
                >
                  Скинути
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}