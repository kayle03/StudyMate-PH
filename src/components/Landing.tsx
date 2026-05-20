import { motion } from "motion/react";
import { ArrowRight, Sparkles, Files, Users, Zap } from "lucide-react";

interface LandingProps {
  onGetStarted: () => void;
}

export default function Landing({ onGetStarted }: LandingProps) {
  const universities = [
    { name: "UP System", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/3/3d/University_of_the_Philippines_Seal.svg/1200px-University_of_the_Philippines_Seal.svg.png" },
    { name: "De La Salle University", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/c/c2/De_La_Salle_University_Seal.svg/1200px-De_La_Salle_University_Seal.svg.png" },
    { name: "Ateneo de Manila", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/c/c2/Ateneo_de_Manila_University_seal.svg/1200px-Ateneo_de_Manila_University_seal.svg.png" },
    { name: "UST", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/b/b2/University_of_Santo_Tomas_Seal.svg/1200px-University_of_Santo_Tomas_Seal.svg.png" },
    { name: "Mapúa University", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/7/75/Mapua_University_logo.svg/1200px-Mapua_University_logo.svg.png" },
    { name: "National University", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/4/44/National_University_Philippines_seal.svg/1200px-National_University_Philippines_seal.svg.png" },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-bg-light pt-16 pb-24 lg:pt-32 lg:pb-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center lg:text-left grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase tracking-widest mb-6 border border-primary/20">
                Built by Kalingan Tech for the Pinoy Student
              </span>
              <h1 className="font-serif text-5xl lg:text-7xl leading-tight text-gray-900 mb-6">
                Review smarter with <span className="text-primary">Bayanihan</span> spirit.
              </h1>
              <p className="text-xl text-gray-600 font-sans mb-10 max-w-xl leading-relaxed mx-auto lg:mx-0">
                Stop drowning in messy group chats. Access curated reviewers, notes, and AI-generated summaries from students and professors across the Philippines.
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 justify-center lg:justify-start">
                <button 
                  onClick={onGetStarted}
                  className="bg-primary text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-primary-dark transition-all flex items-center justify-center space-x-2 group shadow-xl shadow-primary/20"
                >
                  <span>Start Studying Now</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="border border-primary/20 text-primary px-8 py-4 rounded-full text-lg font-bold hover:bg-primary/5 transition-colors">
                  Browse Resources
                </button>
              </div>
            </motion.div>
          </div>

          <motion.div 
            className="relative"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border-8 border-white">
              <img 
                src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80" 
                alt="Filipino students studying together" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            {/* Contextual UI Mockup Elements */}
            <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl border border-gray-100 hidden sm:block">
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <Sparkles className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">New Summary</p>
                  <p className="text-sm font-bold text-gray-800">ITP 101 - Intro to Programming</p>
                </div>
              </div>
            </div>
            <div className="absolute -top-6 -right-6 bg-white p-4 rounded-2xl shadow-xl border border-gray-100 hidden sm:block">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Active Groups</p>
                  <p className="text-sm font-bold text-gray-800">UPM Med-Sci Study Hub</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* University Logos */}
      <section className="bg-white py-12 border-y border-gray-100 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-xs uppercase tracking-[0.2em] font-bold text-gray-400 mb-10">Trusted by students from</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all">
            {universities.map((uni) => (
              <div key={uni.name} className="h-10 flex items-center">
                <img src={uni.logo} alt={uni.name} className="h-full object-contain" referrerPolicy="no-referrer" />
                <span className="ml-2 font-bold text-gray-500 text-sm hidden lg:block">{uni.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="font-serif text-4xl text-gray-900 mb-4">A Legacy of Collaboration, Reinvented.</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our platform brings together the traditional Filipino spirit of helping one another with cutting-edge academic tools.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { 
                icon: Files, 
                title: "Organized Library", 
                desc: "Search by university, college, professor, or subject. Never lose a handout again.",
                color: "bg-orange-50 text-orange-600"
              },
              { 
                icon: Zap, 
                title: "AI Summaries", 
                desc: "Turn 50 pages of notes into a 5-minute read with our Gemini-powered summaries.",
                color: "bg-purple-50 text-purple-600"
              },
              { 
                icon: Users, 
                title: "Bayanihan Study Groups", 
                desc: "Join real-time peer groups. Share tips, reviewers, and moral support.",
                color: "bg-green-50 text-green-600"
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -5 }}
                className="p-8 rounded-3xl border border-gray-100 hover:shadow-xl transition-all"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${feature.color}`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary text-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="font-serif text-4xl mb-6">Ready to ace your exams?</h2>
          <p className="text-xl opacity-90 mb-10 max-w-2xl mx-auto font-light">
            Join thousands of fellow Iskolar, Archers, Eagles, Tigers, and Bulldogs today. Scholarship-worthy results are just a click away.
          </p>
          <button 
            onClick={onGetStarted}
            className="bg-secondary text-primary-dark px-10 py-4 rounded-full text-lg font-bold hover:bg-white transition-colors shadow-lg shadow-black/10"
          >
            Create My Account
          </button>
          <p className="mt-6 text-sm opacity-60">No credit card required. Free basic tools forever.</p>
        </div>
      </section>
    </div>
  );
}
