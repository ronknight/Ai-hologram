import React from 'react';

interface HologramProps {
  isListening: boolean;
  isSpeaking: boolean;
  isIdle: boolean;
}

const Hologram: React.FC<HologramProps> = ({ isListening, isSpeaking, isIdle }) => {
  const stateClasses = {
    listening: {
      bust: 'opacity-80 scale-105',
      eye: 'w-8 h-2 bg-cyan shadow-[0_0_12px_theme(colors.cyan)]',
    },
    speaking: {
      bust: 'opacity-90 scale-100',
      eye: 'h-[3px]',
    },
    idle: {
      bust: 'opacity-70 scale-95',
      eye: 'h-1',
    },
  };

  const currentState = isListening ? stateClasses.listening : isSpeaking ? stateClasses.speaking : stateClasses.idle;

  return (
    <>
      {/* --- Animations --- */}
      <style>{`
        @keyframes speak-mouth {
          0%, 100% { transform: scaleY(1) translateY(0); }
          20% { transform: scaleY(2.5) translateY(-1px); }
          40% { transform: scaleY(0.8) translateY(0); }
          60% { transform: scaleY(2.0) translateY(-1px); }
          80% { transform: scaleY(1.2) translateY(0); }
        }
        .animate-speak-mouth {
          animation: speak-mouth 1.2s ease-in-out infinite;
        }

        @keyframes idle-glow {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 0.9; }
        }
        .animate-idle-glow {
            animation: idle-glow 3s ease-in-out infinite;
        }
      `}</style>

      <div className="relative w-96 h-80 mb-4 flex items-center justify-center pointer-events-none animate-float">
        {/* Base Projector Glow */}
        <div className={`absolute bottom-0 w-64 h-24 bg-accent rounded-full filter blur-3xl transition-all duration-500`}></div>

        <div className="absolute w-full h-full" style={{ perspective: '1000px' }}>
          {/* --- Futuristic Human Bust --- */}
          <div
            className={`absolute w-full h-full top-[-2rem] flex items-center justify-center transition-all duration-500 ${currentState.bust}`}
            style={{ transformStyle: 'preserve-3d', transform: 'rotateX(10deg) rotateY(0deg)' }}
          >
            <div className="relative w-48 h-64">
              {/* Shoulders */}
              <div className="absolute top-24 w-full h-24 rounded-t-full border-t-2 border-x-2 border-accent/50"></div>
              <div className="absolute top-28 w-[calc(100%-2rem)] left-4 h-24 rounded-t-full border-t-2 border-accent/30"></div>

              {/* Neck */}
              <div className="absolute top-16 left-1/2 -translate-x-1/2 w-8 h-8 rounded-b-md border-b-2 border-x-2 border-accent/40"></div>

              {/* Head */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-36 rounded-full border-2 border-accent/60 flex items-center justify-center">
                 <div className="w-full h-full rounded-full border-t-2 border-cyan/50 animate-pulse"></div>
              </div>

              {/* --- Animated Face --- */}
              <div className="absolute top-14 left-1/2 -translate-x-1/2 w-20 h-10">
                  {/* Eyes */}
                  <div className={`absolute top-0 left-[-4px] w-6 rounded-full bg-cyan/70 transition-all duration-300 ${currentState.eye} ${isIdle ? 'animate-idle-glow' : ''}`}></div>
                  <div className={`absolute top-0 right-[-4px] w-6 rounded-full bg-cyan/70 transition-all duration-300 ${currentState.eye} ${isIdle ? 'animate-idle-glow' : ''}`} style={{ animationDelay: '0.5s' }}></div>

                  {/* Mouth */}
                  <div
                    className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-cyan/60 rounded-full origin-bottom ${isSpeaking ? 'animate-speak-mouth' : ''} ${isIdle ? 'animate-idle-glow' : ''}`}
                    style={{ animationDelay: '1s' }}
                  ></div>
              </div>
            </div>
          </div>

          {/* --- Original Ring Set (Adjusted) --- */}
          <div
            className={`absolute w-full h-full transition-all duration-500`}
            style={{ transformStyle: 'preserve-3d', transform: 'rotateX(75deg) scale(1.2)' }}
          >
            <div className="absolute inset-0 border-2 border-accent/80 rounded-full animate-spin-slow"></div>
            <div className="absolute inset-8 border border-light-accent/70 rounded-full animate-spin-medium" style={{ animationDirection: 'reverse' }}></div>
            <div className="absolute inset-16 border-2 border-cyan/90 rounded-full animate-spin-fast"></div>

            {isListening && (
              <>
                <div className="absolute top-1/2 left-1/2 w-px h-16 -mt-8 bg-gradient-to-b from-transparent via-cyan to-transparent animate-pulse"></div>
                <div className="absolute top-1/2 left-1/2 w-px h-16 -mt-8 bg-gradient-to-b from-transparent via-cyan to-transparent animate-pulse" style={{ transform: 'rotate(90deg)' }}></div>
              </>
            )}
             {isSpeaking && (
                <>
                  <div className="absolute w-full h-full border-t-2 border-cyan rounded-full animate-ping opacity-75"></div>
                  <div className="absolute w-full h-full border-b-2 border-light-accent rounded-full animate-ping opacity-50" style={{ animationDelay: '0.5s' }}></div>
                </>
             )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Hologram;