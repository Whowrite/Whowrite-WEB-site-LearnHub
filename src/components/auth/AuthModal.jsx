// src/components/auth/AuthModal.jsx
import { useState } from 'react';
import { registerUser, loginUser } from '../../firebase/authService';

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await loginUser(email, password);
      } else {
        if (!displayName) throw new Error("Вкажіть ім'я");
        await registerUser(email, password, displayName);
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Щось пішло не так. Спробуйте ще раз.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b">
          <h2 className="text-3xl font-semibold text-gray-900">
            {isLogin ? 'Вхід' : 'Реєстрація'}
          </h2>
          <p className="text-gray-600 mt-2">
            {isLogin 
              ? 'Увійдіть, щоб використовувати всі можливості' 
              : 'Створіть обліковий запис за 30 секунд'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ім'я</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-sky-500"
                placeholder="Олена Коваленко"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-sky-500"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-sky-500"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 p-3 rounded-2xl">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black hover:bg-gray-900 text-white font-semibold py-3.5 rounded-2xl transition-all disabled:opacity-70"
          >
            {loading ? 'Обробка...' : isLogin ? 'Увійти' : 'Зареєструватися'}
          </button>
        </form>

        <div className="px-8 py-6 border-t bg-gray-50 flex justify-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-sky-600 hover:text-sky-700 font-medium"
          >
            {isLogin 
              ? 'Немає акаунту? Зареєструватися' 
              : 'Вже є акаунт? Увійти'}
          </button>
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
        >
          ✕
        </button>
      </div>
    </div>
  );
}