// components/common/CategoryFilter.jsx
import { useState } from 'react';

const availableCategories = [
  "React", "JavaScript", "UI/UX", "Дизайн", "Кулінарія",
  "Музика", "Гітара", "Кар'єра", "IT",
  "Python", "English", "Математика", "Фізика", "Історія",
  "Література", "Філософія", "Мистецтво", "Фотографія", "Маркетинг",
  "Бізнес", "Фінанси", "Здоров'я", "Спорт", "Подорожі", "Українська мова",
  "Психологія", "Саморозвиток", "Медицина", "Геймінг"
];

export default function CategoryFilter({ selectedCategory, onCategoryChange, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {/* Кнопка вибору категорії */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <i className="fa-solid fa-filter text-gray-500"></i>
        <span className="text-gray-700">
          {selectedCategory || "Всі категорії"}
        </span>
        <i className={`fa-solid fa-chevron-down text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
      </button>

      {/* Випадаючий список категорій */}
      {isOpen && (
        <>
          {/* Затемнення фону для закриття при кліку поза межами */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          ></div>
          
          <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-96 overflow-y-auto">
            <div className="p-2">
              {/* Опція "Всі категорії" */}
              <button
                onClick={() => {
                  onCategoryChange('');
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                  !selectedCategory 
                    ? 'bg-blue-50 text-blue-600 font-medium' 
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                Всі категорії
              </button>
              
              {/* Розділювач */}
              <div className="my-2 border-t border-gray-100"></div>
              
              {/* Список категорій */}
              <div className="grid grid-cols-1 gap-1">
                {availableCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      onCategoryChange(category);
                      setIsOpen(false);
                    }}
                    className={`px-3 py-2 rounded-md text-left transition-colors ${
                      selectedCategory === category
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}