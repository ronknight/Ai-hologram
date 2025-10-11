import ChatView from "./components/ChatView";
import Hologram from './components/Hologram';

function App() {
  return (
    <div className="relative min-h-screen bg-black">
      <div style={{ position: 'absolute', width: '100vw', height: '100vh' }}>
        <Hologram isListening={false} isSpeaking={false} isIdle={true} />
      </div>
      <ChatView />
    </div>
  )
}

export default App
