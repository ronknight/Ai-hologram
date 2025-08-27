import React from 'react';

interface HologramProps {
  isListening: boolean;
  isSpeaking: boolean;
  isIdle: boolean;
}

const Hologram: React.FC<HologramProps> = ({ isListening, isSpeaking, isIdle }) => {
  const stateClasses = {
    listening: {
      core: 'scale-110 bg-cyan',
      rings: 'scale-105 opacity-100',
      glow: 'opacity-100 scale-125',
    },
    speaking: {
      core: 'scale-100 bg-light-accent animate-pulse',
      rings: 'scale-110 opacity-100',
      glow: 'opacity-75 scale-110',
    },
    idle: {
      core: 'scale-90 bg-accent',
      rings: 'scale-100 opacity-70',
      glow: 'opacity-50 scale-100',
    },
  };

  const currentState = isListening ? stateClasses.listening : isSpeaking ? stateClasses.speaking : stateClasses.idle;

  return (
    <div className="relative w-72 h-40 mb-4 flex items-center justify-center pointer-events-none animate-float">
      {/* Base Projector Glow */}
      <div className={`absolute bottom-0 w-48 h-12 bg-accent rounded-full filter blur-3xl transition-all duration-500 ${currentState.glow}`}></div>
      
      <div className="absolute w-full h-full" style={{ perspective: '1000px' }}>
        {/* Core sphere */}
        <div className={`absolute w-12 h-12 left-1/2 top-1/2 -ml-6 -mt-6 rounded-full filter blur-sm transition-all duration-500 ${currentState.core}`}></div>
        <div className={`absolute w-12 h-12 left-1/2 top-1/2 -ml-6 -mt-6 rounded-full opacity-75 transition-all duration-500 ${currentState.core}`}></div>

        {/* Ring Set */}
        <div 
          className={`absolute w-full h-full transition-all duration-500 ${currentState.rings}`} 
          style={{ transformStyle: 'preserve-3d', transform: 'rotateX(75deg)' }}
        >
          {/* Outer Ring */}
          <div className="absolute inset-0 border-2 border-accent/80 rounded-full animate-spin-slow"></div>
          {/* Middle Ring */}
          <div className="absolute inset-8 border border-light-accent/70 rounded-full animate-spin-medium" style={{ animationDirection: 'reverse' }}></div>
          {/* Inner Ring */}
          <div className="absolute inset-16 border-2 border-cyan/90 rounded-full animate-spin-fast"></div>
          
          {/* Vertical analysis bars for listening state */}
          {isListening && (
            <>
              <div className="absolute top-1/2 left-1/2 w-px h-16 -mt-8 bg-gradient-to-b from-transparent via-cyan to-transparent animate-pulse"></div>
              <div className="absolute top-1/2 left-1/2 w-px h-16 -mt-8 bg-gradient-to-b from-transparent via-cyan to-transparent animate-pulse" style={{ transform: 'rotate(90deg)' }}></div>
            </>
          )}

           {/* Speaking energy particles */}
           {isSpeaking && (
              <>
                <div className="absolute w-full h-full border-t-2 border-cyan rounded-full animate-ping opacity-75"></div>
                <div className="absolute w-full h-full border-b-2 border-light-accent rounded-full animate-ping opacity-50" style={{ animationDelay: '0.5s' }}></div>
              </>
           )}
        </div>
      </div>
    </div>
  );
};

export default Hologram;