export default function HeroSection({ icon: Icon, label, title, description, children }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-neon/10 via-dark-card to-dark-light p-8 border border-neon/10">
      <div className="absolute top-0 right-0 w-64 h-64 bg-neon/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-neon/5 rounded-full blur-3xl" />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <Icon className="text-neon text-lg" />
          <span className="text-neon text-sm font-semibold uppercase tracking-widest">
            {label}
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
          {title}
        </h1>
        <p className="text-gray-400 max-w-lg mb-6">{description}</p>
        {children}
      </div>
    </div>
  );
}
