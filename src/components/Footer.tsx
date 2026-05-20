import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="bg-[#f5f5f0] border-t border-[#5A5A40]/10 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center mb-4">
              <Logo className="w-10 h-10 mr-2" />
              <span className="font-serif text-xl font-bold text-primary">StudyMate</span>
              <span className="font-sans text-[10px] font-bold bg-secondary text-primary-dark px-1 py-0.5 rounded ml-1">PH</span>
            </div>
            <p className="text-sm text-gray-500 font-sans leading-relaxed">
              Ang learning matagal nang tradisyon ng pagtutulungan. Developed by <span className="font-bold text-primary">Kalingan Tech</span>, reimagining Bayanihan for the digital age.
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-bold text-[#5A5A40] uppercase tracking-wider mb-4">Platform</h3>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="#" className="hover:text-[#5A5A40]">Resource Library</a></li>
              <li><a href="#" className="hover:text-[#5A5A40]">AI Summarizer</a></li>
              <li><a href="#" className="hover:text-[#5A5A40]">Quiz Generator</a></li>
              <li><a href="#" className="hover:text-[#5A5A40]">Study Groups</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold text-[#5A5A40] uppercase tracking-wider mb-4">Community</h3>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="#" className="hover:text-[#5A5A40]">Universities</a></li>
              <li><a href="#" className="hover:text-[#5A5A40]">Top Contributors</a></li>
              <li><a href="#" className="hover:text-[#5A5A40]">Peer Review</a></li>
              <li><a href="#" className="hover:text-[#5A5A40]">Ambassadors</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold text-[#5A5A40] uppercase tracking-wider mb-4">Legal</h3>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="#" className="hover:text-[#5A5A40]">Terms of Use</a></li>
              <li><a href="#" className="hover:text-[#5A5A40]">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[#5A5A40]">Academic Integrity</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-[#5A5A40]/10 flex flex-col md:flex-row justify-between items-center text-xs text-gray-400">
          <p>© 2026 StudyMate PH. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <p>Built with ❤️ by <span className="font-bold">Kalingan Tech</span></p>
          </div>
        </div>
      </div>
    </footer>
  );
}
