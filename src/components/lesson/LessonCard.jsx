// src/components/lesson/LessonCard.jsx
export default function LessonCard({ lesson, onClick }) {
  // Підтримка різних назв полів (Firestore може мати author_name, author_id тощо)
  const authorName = lesson.author_name || lesson.author || "Невідомий автор";

  const views = lesson.views_count || lesson.views || 0;
  const likes = lesson.likes_count || lesson.likes || 0;

  const duration = lesson.duration_minutes 
    ? `${Math.floor(lesson.duration_minutes)}:${String(Math.round((lesson.duration_minutes % 1) * 60)).padStart(2, '0')}` 
    : lesson.duration || "5:00";

  return (
    <div 
      onClick={() => onClick(lesson.id)}
      className="card-hover bg-white rounded-3xl overflow-hidden border border-gray-100 cursor-pointer group"
    >
      <div className="relative">
        <img 
          src={lesson.thumbnail_url || lesson.thumbnail || "https://picsum.photos/id/1015/640/360"} 
          alt={lesson.title}
          className="w-full aspect-video object-cover group-hover:scale-[1.03] transition-transform duration-500"
        />
        <div className="duration-badge absolute bottom-4 right-4 text-white text-sm font-medium px-3.5 py-1 rounded-2xl flex items-center gap-x-1">
          <i className="fa-solid fa-clock text-xs"></i>
          <span>{duration}</span>
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-[22px] leading-tight font-semibold text-gray-900 line-clamp-2 min-h-[66px]">
          {lesson.title}
        </h3>

        <div className="flex items-center gap-x-3 mt-6">
          <img 
            src={lesson.author_avatar || `https://i.pravatar.cc/128?u=${lesson.author_id}`}
            alt={authorName}
            className="w-9 h-9 rounded-2xl object-cover ring-2 ring-white shadow-sm"
          />
          <p className="font-medium text-gray-800">{authorName}</p>
        </div>

        <div className="flex flex-wrap gap-2 mt-7">
          {lesson.categories && lesson.categories.map((tag, i) => (
            <span 
              key={i}
              className="text-xs font-medium bg-gray-100 text-gray-700 px-4 py-2 rounded-3xl hover:bg-gray-200 transition-colors"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Статистика: Перегляди + Лайки */}
        <div className="mt-8 flex items-center justify-between text-sm">
          {/* Перегляди */}
          <div className="flex items-center gap-x-1.5 text-gray-500">
            <i className="fa-solid fa-eye"></i>
            <span>{views.toLocaleString('uk-UA')}</span>
          </div>

          {/* Лайки */}
          <div className="flex items-center gap-x-1.5 text-gray-500">
            <i className={`fa-solid fa-heart ${likes > 0 ? 'text-red-500' : 'text-gray-400'}`}></i>
            <span className={likes > 0 ? 'text-red-500 font-medium' : ''}>
              {likes}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}