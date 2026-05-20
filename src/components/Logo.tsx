import { Lightbulb } from "lucide-react";

export default function Logo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className} select-none`} id="custom-logo">
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full rounded-2xl overflow-hidden shadow-md"
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Rounded Container Background in Lilac #C6B4F9 */}
        <rect width="100" height="100" rx="20" fill="#C6B4F9" />

        {/* Subtle grid pattern overlay to match the original halftone/texture style */}
        <defs>
          <pattern id="dot-grid" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.45" fill="white" opacity="0.32" />
          </pattern>
        </defs>
        <rect width="100" height="100" rx="20" fill="url(#dot-grid)" />

        {/* Faded silhouette of Philippine Map in white */}
        <g opacity="0.35" fill="white">
          {/* Luzon Northern and Central outline */}
          <path d="M37 36l3-4h4l-1 5 3 2v6l-4 3-5-2-1-6-1-1 2-3z" />
          <path d="M41 43l3 4 1 6-2 1-4-2v-5l2-4z" />
          {/* Luzon Southern tail */}
          <path d="M43 49s0.5 2 2 1.5 2 3 1.5 4-2.5 1-3 .5-.5-6-.5-7z" />
          
          {/* Visayas islands */}
          <path d="M49 53s1.5 0.5 1.5 3-1 2-2 1.5-1.5-2.5 0.5-4.5z" />
          <circle cx="47" cy="57" r="1.2" />
          <circle cx="49" cy="59" r="0.8" />
          <path d="M44 54s1.5-0.5 2.5 2-1 3.5-2.5 2.5-1-3.5 0-4.5z" />
          <path d="M45 57h1.5l1.5 2.5-1 1-2-3.5z" />

          {/* Palawan */}
          <path d="M31 56l4 4.5-5 5.5-3-3.5 4-6.5z" />

          {/* Mindanao */}
          <path d="M46 64h4.5l6.5 1 2 4v4h-5.5l-3.5-3.5h-4l-1.5-3.5v-2z" />
          <path d="M54 67l3.5 3h1.5v3l-4-.5-1-5.5z" />
        </g>

        {/* White Compass Rose accent over Philippines area */}
        <g stroke="white" strokeWidth="0.4" opacity="0.5" transform="translate(28, 52)">
          <circle cx="0" cy="0" r="3" fill="none" />
          <line x1="-5" y1="0" x2="5" y2="0" />
          <line x1="0" y1="-5" x2="0" y2="5" />
          <polygon points="0,-4.5 1,-1 4,0 1,1 0,4.5 -1,1 -4,0 -1,-1" fill="white" />
        </g>

        {/* Glowing Yellow Lightbulb and its rays (Right side, tilted slightly) */}
        <g transform="translate(73, 44) rotate(-15)">
          {/* Yellow Glow behind bulb */}
          <circle cx="0" cy="0" r="6" fill="#FFD966" opacity="0.3" filter="blur(1px)" />
          {/* Bulb base */}
          <rect x="-1.5" y="3.5" width="3" height="1.5" fill="#FFFFFF" opacity="0.9" rx="0.3" />
          <rect x="-1" y="5" width="2" height="1" fill="#CCCCCC" rx="0.3" />
          {/* Bulb glass */}
          <path d="M-3-1 a3 3 0 0 1 6 0 c0 1.5-1 2.5-1.5 3.5 h-3 c-.5-1-1.5-2-1.5-3.5 z" fill="#FFD966" />
          {/* Filament */}
          <line x1="-0.8" y1="-1" x2="-0.8" y2="1.5" stroke="#FFFFFF" strokeWidth="0.4" strokeLinecap="round" />
          <line x1="0.8" y1="-1" x2="0.8" y2="1.5" stroke="#FFFFFF" strokeWidth="0.4" strokeLinecap="round" />
          {/* Filament spark */}
          <circle cx="0" cy="0" r="1.5" fill="#FFE599" />
          {/* Rays */}
          <line x1="0" y1="-5.5" x2="0" y2="-7" stroke="#FFD966" strokeWidth="0.8" strokeLinecap="round" />
          <line x1="4.5" y1="-3.5" x2="5.8" y2="-4.8" stroke="#FFD966" strokeWidth="0.8" strokeLinecap="round" />
          <line x1="5.5" y1="1" x2="7" y2="1.3" stroke="#FFD966" strokeWidth="0.8" strokeLinecap="round" />
          <line x1="-4.5" y1="-3.5" x2="-5.8" y2="-4.8" stroke="#FFD966" strokeWidth="0.8" strokeLinecap="round" />
          <line x1="-5.5" y1="1" x2="-7" y2="1.3" stroke="#FFD966" strokeWidth="0.8" strokeLinecap="round" />
        </g>

        {/* Three Pink/Accent radiating exclamation beams above the heads */}
        <g fill="#C27BA0" opacity="0.9">
          {/* Center beam */}
          <rect x="48.5" y="11" width="3" height="10" rx="1.5" />
          {/* Left beam */}
          <rect x="33.5" y="16.5" width="3" height="10" rx="1.5" transform="rotate(-35, 35, 21.5)" />
          {/* Right beam */}
          <rect x="63.5" y="16.5" width="3" height="10" rx="1.5" transform="rotate(35, 65, 21.5)" />
        </g>

        {/* Human figures - deep purple silhouette #6D5E9B */}
        <g fill="#6D5E9B">
          {/* Left Student */}
          {/* Head */}
          <circle cx="43.5" cy="51" r="5" />
          <path d="M43 55.5l1 3h-1.5z" />
          {/* Torso */}
          <path d="M43.5 58c-5.5 0-11 4.5-12 10.5v1.5h15.5v-1.5c0-3.5-1-5.5-3.5-10.5z" />
          {/* Writing Arm */}
          <path d="M30.5 69c1.5-2.5 4.5-4 7-3l3.5 4.5-2 1.5z" />
          {/* Pen held */}
          <line x1="39.5" y1="62.5" x2="37" y2="59.5" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" />
          <line x1="40" y1="63.5" x2="37.5" y2="60.5" stroke="#FFD966" strokeWidth="0.5" strokeLinecap="round" />

          {/* Right Student */}
          {/* Head */}
          <circle cx="55.5" cy="51.2" r="5" />
          <path d="M55 55.7l1 3h-1.5z" />
          {/* Torso */}
          <path d="M55.5 58.2c-2.5 5-3.5 7-3.5 10.8v1h15v-1c-1-5.5-6.5-10-11.5-10.8z" />
          {/* Leaning Arm */}
          <path d="M68 69.5c-2.3-2.3-5-2-7 1.5l-3 3h10z" />
        </g>

        {/* Book on study table (white open pages) */}
        <g>
          {/* Open pages shadow */}
          <path d="M34 70.8q7.5-4 15 1q7.5-5 15-1v2.5q-7.5-4-15 1q-7.5-5-15-1z" fill="#5A4E85" opacity="0.32" />
          {/* Open pages bottom */}
          <path d="M34 69.8q7.5-4 15 1q7.5-5 15-1l0.5 1.5q-8-4-15.5 1q-7.5-5-15-1.5z" fill="#FFFFFF" opacity="0.9" />
          {/* White pages */}
          <path d="M34 68.8q7.5-4 15 1q7.5-5 15-1l0.3 1.2q-7.8-4-15.3 1q-7.5-5-15-1.2z" fill="#FFFFFF" />
          {/* Book binding center decoration */}
          <circle cx="49" cy="70.3" r="0.6" fill="#C27BA0" />
          {/* Ribbon marker hanging */}
          <path d="M49 70.3l0.5 3.5-1 0.5z" fill="#C27BA0" />
        </g>
      </svg>
    </div>
  );
}
