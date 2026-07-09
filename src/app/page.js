import Link from 'next/link';
import ActionCard from '../components/ActionCard';
import HomeSearchBar from '../components/HomeSearchBar';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-900 font-sans relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob animation-delay-4000"></div>
      
      <main className="flex-1 relative z-10 w-full max-w-5xl mx-auto p-6 sm:p-8 flex flex-col items-center justify-center min-h-[80vh]">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
            What do you want to explore?
          </h1>
          <p className="text-lg text-indigo-100/80 max-w-2xl mx-auto">
            Discover the best experiences near you, perfectly tailored to your mood and interests.
          </p>
        </div>

        <HomeSearchBar />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full mb-16">
          <ActionCard 
            title="Hikes near me"
            icon="🥾"
            description="Find the best trails and nature walks."
            href="/search?q=hikes"
          />
          <ActionCard 
            title="Food I like"
            icon="🍔"
            description="Discover restaurants based on your taste."
            href="/search?q=food"
          />
          <ActionCard 
            title="Suggested for you"
            icon="✨"
            description="Discover what like-minded people with your interests are doing."
            href="/search?q=popular activities for people like me"
          />
          <ActionCard 
            title="Kid-friendly"
            icon="👨‍👩‍👧‍👦"
            description="Activities perfect for you and your kids."
            href="/search?q=kids"
          />
        </div>

        <div className="text-center bg-white/5 backdrop-blur-lg p-8 rounded-3xl border border-white/10 w-full max-w-2xl">
          <h2 className="text-2xl font-bold text-white mb-4">Want better recommendations?</h2>
          <p className="text-indigo-200 mb-6">Tell us a bit more about what you love, and we&apos;ll personalize everything for you.</p>
          <Link href="/personalize">
            <button className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-bold rounded-full shadow-lg hover:shadow-indigo-500/30 transition-all duration-300 transform hover:-translate-y-1">
              Personalize My Preferences ✨
            </button>
          </Link>
        </div>
      </main>
    </div>
  );
}
