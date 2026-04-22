import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import { auth } from '../firebase/config';
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function AdminPanel({ user: initialUser, onLoginClick }) {
    const navigate = useNavigate();

    const [user, setUser] = useState(initialUser);     // ← локальний стан
    const [isAdmin, setIsAdmin] = useState(false);
    const [loadingUser, setLoadingUser] = useState(true);

    const [stats, setStats] = useState({
        totalUsers: 0,
        totalLessons: 0,
        pendingLessons: 0,
        totalComments: 0,
    });

    const [loadingStats, setLoadingStats] = useState(true);

    // Новий стан для модерації
    const [pendingLessons, setPendingLessons] = useState([]);
    const [loadingLessons, setLoadingLessons] = useState(false);
    const [showModeration, setShowModeration] = useState(false);
    const [showUsers, setShowUsers] = useState(false);
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

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

    // Завантажуємо повний профіль + роль з Firestore
    useEffect(() => {
        const loadUserRole = async () => {
            if (!auth.currentUser) {
                navigate('/');
                return;
            }

            try {
                const userRef = doc(db, 'users', auth.currentUser.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    const userData = userSnap.data();

                    const fullUser = {
                        ...initialUser,
                        ...userData,
                    };

                    setUser(fullUser);
                    setIsAdmin(userData.role === 'admin');
                } else {
                    setIsAdmin(false);
                }
            } catch (err) {
                console.error("Помилка завантаження ролі адміна:", err);
                setIsAdmin(false);
            } finally {
                setLoadingUser(false);
            }
        };

        loadUserRole();
    }, [initialUser, navigate]);

    // Перевірка прав доступу
    useEffect(() => {
        if (!loadingUser && !isAdmin) {
            alert("У вас немає прав доступу до адмін-панелі");
            navigate('/');
        }
    }, [isAdmin, loadingUser, navigate]);

    // Завантаження статистики (тільки якщо адмін)
    useEffect(() => {
        if (!isAdmin) return;

        const loadAdminStats = async () => {
            try {
                const [lessonsSnap, pendingSnap, usersSnap] = await Promise.all([
                    getDocs(collection(db, 'lessons')),
                    getDocs(query(collection(db, 'lessons'), where('status', '==', 'pending'))),
                    getDocs(collection(db, 'users')),
                ]);

                setStats({
                    totalUsers: usersSnap.size,
                    totalLessons: lessonsSnap.size,
                    pendingLessons: pendingSnap.size,
                    totalComments: 0, // пізніше можна додати
                });
            } catch (err) {
                console.error("Помилка завантаження статистики:", err);
            } finally {
                setLoadingStats(false);
            }
        };

        loadAdminStats();
    }, [isAdmin]);

    // Завантаження уроків на модерацію
    const loadPendingLessons = async () => {
        setLoadingLessons(true);
        try {
            const q = query(
                collection(db, 'lessons'),
                where('status', '==', 'pending')
            );
            const snap = await getDocs(q);

            const lessons = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setPendingLessons(lessons);
            setShowModeration(true);
        } catch (err) {
            console.error("Помилка завантаження уроків на модерацію:", err);
            alert("Не вдалося завантажити список уроків");
        } finally {
            setLoadingLessons(false);
        }
    };

    // Затвердити урок
    const handleApprove = async (lessonId) => {
        if (!window.confirm("Затвердити цей урок?")) return;

        try {
            const lessonRef = doc(db, 'lessons', lessonId);
            await updateDoc(lessonRef, {
                status: 'approved',
                // is_approved: true,        // для сумісності зі старим кодом
                approvedAt: new Date()
            });

            // Оновлюємо локальний список
            setPendingLessons(prev => prev.filter(l => l.id !== lessonId));

            // Оновлюємо статистику
            setStats(prev => ({ ...prev, pendingLessons: prev.pendingLessons - 1 }));

            alert("Урок успішно затверджено!");
        } catch (err) {
            console.error("Помилка затвердження:", err);
            alert("Не вдалося затвердити урок");
        }
    };

    // Відхилити урок
    const handleReject = async (lessonId) => {
        if (!window.confirm("Ви дійсно хочете ВІДХИЛИТИ цей урок?")) return;

        try {
            const lessonRef = doc(db, 'lessons', lessonId);
            await updateDoc(lessonRef, {
                status: 'rejected',
                // is_approved: false,
                rejectedAt: new Date()
            });

            setPendingLessons(prev => prev.filter(l => l.id !== lessonId));
            setStats(prev => ({ ...prev, pendingLessons: prev.pendingLessons - 1 }));

            alert("Урок відхилено");
        } catch (err) {
            console.error("Помилка відхилення:", err);
            alert("Не вдалося відхилити урок");
        }
    };

    // Завантаження всіх користувачів
    const loadAllUsers = async () => {
        setLoadingUsers(true);
        try {
            const snap = await getDocs(collection(db, 'users'));
            let data = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Сортування за ім'ям / email
            data.sort((a, b) =>
                (a.full_name || a.email || '').localeCompare(b.full_name || b.email || '')
            );

            setUsers(data);
            setShowUsers(true);
        } catch (err) {
            console.error("Помилка завантаження користувачів:", err);
            alert("Не вдалося завантажити список користувачів");
        } finally {
            setLoadingUsers(false);
        }
    };

    // Зміна ролі
    const updateUserRole = async (userId, newRole) => {
        if (!window.confirm(`Змінити роль на "${newRole}"?`)) return;

        try {
            await updateDoc(doc(db, 'users', userId), { role: newRole });
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
            alert('✅ Роль успішно змінено');
        } catch (err) {
            console.error(err);
            alert('Не вдалося змінити роль');
        }
    };

    // Блокування / розблокування
    const toggleBlockUser = async (userId, isCurrentlyBlocked) => {
        const newBlocked = !isCurrentlyBlocked;
        const action = newBlocked ? 'заблокувати' : 'розблокувати';

        if (!window.confirm(`Ви дійсно хочете ${action} цього користувача?`)) return;

        try {
            await updateDoc(doc(db, 'users', userId), { isBlocked: newBlocked });
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, isBlocked: newBlocked } : u));
            alert(newBlocked ? '🚫 Користувач заблокований' : '✅ Користувач розблокований');
        } catch (err) {
            console.error(err);
            alert('Не вдалося оновити статус блокування');
        }
    };

    // Поки перевіряємо права — показуємо тільки Navbar
    if (loadingUser) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar user={user} onLoginClick={onLoginClick} />
                <div className="flex justify-center items-center h-[calc(100vh-80px)]">
                    <div className="text-xl">Перевірка прав доступу...</div>
                </div>
            </div>
        );
    }

    // Якщо не адмін — перенаправлення користувача на головну
    if (!isAdmin) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar user={user} onLoginClick={onLoginClick} />

            <div className="max-w-6xl mx-auto px-6 py-10">
                {/* Header */}
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-4xl font-semibold text-gray-900">Адмін-панель</h1>
                        <p className="text-gray-600 mt-2">Управління платформою LearnHub</p>
                    </div>
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-2xl transition-all"
                    >
                        ← Повернутися на головну
                    </button>
                </div>
                
                {loadingStats ? (
                    <div className="flex justify-center py-20">
                        <div className="text-xl">Завантаження статистики...</div>
                    </div>
                ) : (
                    <>
                        {/* Дашборд (статистика + картки) — показується тільки коли нічого не відкрито */}
                        {!showModeration && !showUsers && (
                            <>
                                {/* Статистика */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                                    <div className="bg-white rounded-3xl p-6 shadow-sm">
                                        <p className="text-sm text-gray-500">Користувачів</p>
                                        <p className="text-4xl font-semibold mt-3">{stats.totalUsers}</p>
                                    </div>
                                    <div className="bg-white rounded-3xl p-6 shadow-sm">
                                        <p className="text-sm text-gray-500">Усього уроків</p>
                                        <p className="text-4xl font-semibold mt-3">{stats.totalLessons}</p>
                                    </div>
                                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-orange-200">
                                        <p className="text-sm text-orange-600">Чекають модерації</p>
                                        <p className="text-4xl font-semibold mt-3 text-orange-600">{stats.pendingLessons}</p>
                                    </div>
                                    <div className="bg-white rounded-3xl p-6 shadow-sm">
                                        <p className="text-sm text-gray-500">Коментарів</p>
                                        <p className="text-4xl font-semibold mt-3">{stats.totalComments}</p>
                                    </div>
                                </div>

                                {/* Розділи */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Модерація уроків */}
                                    <div className="bg-white rounded-3xl p-8">
                                        <h2 className="text-2xl font-semibold mb-6">Модерація уроків</h2>
                                        <div className="text-center py-12 text-gray-500">
                                            <i className="fa-solid fa-list-check text-5xl mb-4 text-gray-300"></i>
                                            <p className="text-lg">Список уроків на модерацію</p>
                                            <p className="text-sm mt-2">Уроки, які чекають затвердження</p>
                                            <button
                                                onClick={loadPendingLessons}
                                                disabled={loadingLessons}
                                                className="mt-6 px-8 py-3 bg-black text-white rounded-2xl hover:bg-gray-900 transition-all disabled:opacity-70"
                                            >
                                                {loadingLessons ? "Завантаження..." : "Перейти до модерації"}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Користувачі */}
                                    <div className="bg-white rounded-3xl p-8">
                                        <h2 className="text-2xl font-semibold mb-6">Користувачі</h2>
                                        <div className="text-center py-12 text-gray-500">
                                            <i className="fa-solid fa-users text-5xl mb-4 text-gray-300"></i>
                                            <p className="text-lg">Управління користувачами</p>
                                            <p className="text-sm mt-2">Блокування, ролі, статистика</p>
                                            <button
                                                onClick={loadAllUsers}
                                                disabled={loadingUsers}
                                                className="mt-6 px-8 py-3 bg-black text-white rounded-2xl hover:bg-gray-900 transition-all disabled:opacity-70"
                                            >
                                                {loadingUsers ? "Завантаження..." : "Перейти до списку користувачів"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Секція модерації уроків */}
                        {showModeration && (
                            <div>
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h2 className="text-3xl font-semibold">Уроки на модерацію ({pendingLessons.length})</h2>
                                        <p className="text-gray-500 mt-1">Перевірка та затвердження контенту</p>
                                    </div>
                                    <button
                                        onClick={() => setShowModeration(false)}
                                        className="px-6 py-2.5 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-2xl hover:bg-gray-50 transition-all"
                                    >
                                        ← Повернутися до панелі
                                    </button>
                                </div>

                                {pendingLessons.length === 0 ? (
                                    <div className="bg-white rounded-3xl p-16 text-center">
                                        <i className="fa-solid fa-check-circle text-6xl text-green-500 mb-4"></i>
                                        <p className="text-2xl font-medium text-gray-800">Всі уроки перевірено!</p>
                                        <p className="text-gray-500 mt-2">Наразі немає матеріалів, що очікують модерації.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {pendingLessons.map((lesson) => {
                                            // Правильна обробка serverTimestamp()
                                            let createdDate = 'Дата не вказана';
                                            if (lesson.uploaded_at) {
                                                const dateObj = lesson.uploaded_at.toDate ? lesson.uploaded_at.toDate() : new Date(lesson.uploaded_at);
                                                createdDate = dateObj.toLocaleDateString('uk-UA', {
                                                    day: 'numeric',
                                                    month: 'long',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                });
                                            }

                                            return (
                                                <div key={lesson.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
                                                    <div className="p-6 flex flex-col lg:flex-row gap-6">

                                                        {/* Thumbnail */}
                                                        {lesson.thumbnail_url ? (
                                                            <img
                                                                src={lesson.thumbnail_url}
                                                                alt={lesson.title}
                                                                className="w-full lg:w-64 h-40 object-cover rounded-2xl flex-shrink-0"
                                                            />
                                                        ) : (
                                                            <div className="w-full lg:w-64 h-40 bg-gray-200 rounded-2xl flex items-center justify-center flex-shrink-0">
                                                                <i className="fa-solid fa-video text-5xl text-gray-400"></i>
                                                            </div>
                                                        )}

                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="text-2xl font-semibold text-gray-900 leading-tight mb-1">
                                                                {lesson.title}
                                                            </h3>

                                                            {/* Автор + Дата */}
                                                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                                                                <div className="flex items-center gap-2">
                                                                    {lesson.author_avatar && (
                                                                        <img
                                                                            src={lesson.author_avatar}
                                                                            alt={lesson.author_name}
                                                                            className="w-6 h-6 rounded-full object-cover"
                                                                        />
                                                                    )}
                                                                    <span className="font-medium">{lesson.author_name || 'Невідомий автор'}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <i className="fa-solid fa-calendar-days"></i>
                                                                    <span>{createdDate}</span>
                                                                </div>
                                                            </div>

                                                            {/* Категорії */}
                                                            {lesson.categories && lesson.categories.length > 0 && (
                                                                <div className="flex flex-wrap gap-2 mb-6">
                                                                    {lesson.categories.map((category, index) => (
                                                                        <span
                                                                            key={index}
                                                                            className="px-4 py-1.5 bg-sky-100 text-sky-700 text-sm font-medium rounded-2xl"
                                                                        >
                                                                            {category}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {/* Опис */}
                                                            {lesson.description && (
                                                                <p className="text-gray-700 leading-relaxed line-clamp-3 mb-5">
                                                                    {lesson.description}
                                                                </p>
                                                            )}

                                                        </div>

                                                        {/* Кнопки дій */}
                                                        <div className="flex flex-col gap-3 lg:min-w-[220px] justify-center pt-2">
                                                            <button
                                                                onClick={() => navigate('/lesson/' + lesson.id, { state: { from: 'adminPanel' } })}
                                                                className="px-6 py-3 border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 text-gray-700 font-medium rounded-2xl transition-all flex items-center justify-center gap-2"
                                                            >
                                                                Переглянути детально
                                                            </button>

                                                            <button
                                                                onClick={() => handleApprove(lesson.id)}
                                                                className="px-8 py-3.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-2xl transition-all active:scale-[0.98]"
                                                            >
                                                                Затвердити
                                                            </button>

                                                            <button
                                                                onClick={() => handleReject(lesson.id)}
                                                                className="px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-2xl transition-all active:scale-[0.98]"
                                                            >
                                                                Відхилити
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Секція управління користувачами */}
                        {showUsers && (
                            <div>
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h2 className="text-3xl font-semibold">Управління користувачами ({users.length})</h2>
                                        <p className="text-gray-500 mt-1">Зміна ролей та блокування акаунтів</p>
                                    </div>
                                    <button
                                        onClick={() => setShowUsers(false)}
                                        className="px-6 py-2.5 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-2xl hover:bg-gray-50 transition-all"
                                    >
                                        ← Повернутися до панелі
                                    </button>
                                </div>

                                <div className="bg-white rounded-3xl overflow-hidden border border-gray-100">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Користувач</th>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Роль</th>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                                                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase">Дії</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {users.map((user) => {
                                                const isBlocked = !!user.isBlocked;
                                                return (
                                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-5">
                                                            <div className="flex items-center gap-3">
                                                                <img
                                                                    src={user.avatar_url || `https://i.pravatar.cc/128?u=${user.id}`}
                                                                    alt=""
                                                                    className="w-9 h-9 rounded-2xl object-cover ring-1 ring-gray-200"
                                                                />
                                                                <div>
                                                                    <p className="font-medium text-gray-900">
                                                                        {user.full_name || 'Без імені'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5 text-gray-600">{user.email || '—'}</td>
                                                        <td className="px-6 py-5">
                                                            <select
                                                                value={user.role || 'user'}
                                                                onChange={(e) => updateUserRole(user.id, e.target.value)}
                                                                className="bg-white border border-gray-300 focus:border-sky-500 rounded-2xl px-4 py-2 text-sm font-medium outline-none"
                                                            >
                                                                <option value="user">Користувач</option>
                                                                <option value="admin">Адміністратор</option>
                                                            </select>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <span
                                                                className={`inline-flex px-4 py-1 rounded-3xl text-xs font-medium ${isBlocked
                                                                        ? 'bg-red-100 text-red-700'
                                                                        : 'bg-emerald-100 text-emerald-700'
                                                                    }`}
                                                            >
                                                                {isBlocked ? '🚫 Заблоковано' : '✅ Активний'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-5 text-right">
                                                            <button
                                                                onClick={() => toggleBlockUser(user.id, isBlocked)}
                                                                className={`px-6 py-2.5 rounded-2xl text-sm font-medium transition-all ${isBlocked
                                                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                                        : 'bg-red-600 hover:bg-red-700 text-white'
                                                                    }`}
                                                            >
                                                                {isBlocked ? 'Розблокувати' : 'Заблокувати'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {users.length === 0 && (
                                    <div className="text-center py-12 text-gray-400">Список користувачів порожній</div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}