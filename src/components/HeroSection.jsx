export default function HeroSection({ icon: Icon, label, title, description, children }) {
  return (
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-neon/10 via-dark-card to-dark-light p-4 sm:p-6 md:p-8 border border-neon/10">
      <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 bg-neon/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-32 h-32 sm:w-48 sm:h-48 bg-neon/5 rounded-full blur-3xl" />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          <Icon className="text-neon text-base sm:text-lg" />
          <span className="text-neon text-[10px] sm:text-sm font-semibold uppercase tracking-widest">
            {label}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-2 sm:mb-4">
          {title}
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-gray-400 max-w-lg mb-4 sm:mb-6">{description}</p>
        {children}
      </div>
    </div>
  );
}
