import { useState, useRef, useEffect } from "react";
import { IoMic } from "react-icons/io5";
import { PiWarningCircleFill } from "react-icons/pi";
import { startCall, endCall } from "../../libs/callUtils";

interface Message {
  id: string;
  type: 'user' | 'agent' | 'system';
  text: string;
  timestamp: Date;
}

const CallUI = () => {
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'connected' | 'ended'>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const addMessage = (type: 'user' | 'agent' | 'system', text: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      type,
      text,
      timestamp: new Date()
    }]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleStartCall = () => {
    setCallStatus('connecting');
    addMessage('system', 'Connecting to LiveKit...');

    startCall({
      onOpen: () => {
        console.log("Call connected");
        setCallStatus('connected');
        setIsListening(true);
        addMessage('system', 'Connected! LiveKit audio streaming active.');
      },

      onTranscript: (text) => {
        console.log("📝 Transcript received:", text);
        addMessage('user', text);
      },

      onMessage: (text) => {
        console.log("🤖 Agent message:", text);
        addMessage('agent', text);
      },

      onClose: () => {
        console.log("Call ended");
        setCallStatus('ended');
        setIsListening(false);
        addMessage('system', 'Call ended.');
      },

      onError: (error) => {
        console.error("Call error:", error);
        setCallStatus('ended');
        setIsListening(false);
        addMessage('system', `Error: ${error.message || 'Connection failed'}`);
      }
    });
  };

  const handleEndCall = () => {
    endCall();
    setCallStatus('ended');
  };

  return (
    <div className="flex h-full item-center justify-center flex-col gap-4 p-4">
      <div className="text-center">
        <h2 className="text-lg mb-2">Voice Agent - LiveKit Integration</h2>
        <div className="text-gray-600 text-xs gap-1 flex items-center justify-center bg-gray-100 rounded-sm py-1">
          <PiWarningCircleFill />
          <p>Real-time voice communication powered by LiveKit</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Call Status */}
        {callStatus !== "idle" && (
          <div className="flex items-center justify-center gap-2">
            <div
              className={`text-center p-3 rounded-md flex-1 ${callStatus === "connecting"
                ? "bg-yellow-100 text-yellow-800"
                : callStatus === "connected"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
                }`}
            >
              {callStatus === "connecting" && "Connecting to LiveKit..."}
              {callStatus === "connected" && (
                <div className="flex items-center justify-center gap-2">
                  <IoMic className={isListening ? "text-green-600" : "text-gray-400"} />
                  <span>LiveKit Connected</span>
                  {isListening && <span className="text-xs">(Listening)</span>}
                </div>
              )}
              {callStatus === "ended" && "Call Ended"}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="border border-gray-300 rounded-lg p-4 h-96 overflow-y-auto bg-white shadow-inner space-y-3">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              Start speaking to see the conversation...
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[70%] px-4 py-2 rounded-2xl shadow-sm ${msg.type === 'user'
                    ? "bg-blue-500 text-white rounded-br-sm"
                    : msg.type === 'agent'
                      ? "bg-gray-200 text-gray-800 rounded-bl-sm"
                      : "bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs text-center mx-auto"
                    }`}
                >
                  {msg.type !== 'system' && (
                    <div className="text-xs font-semibold mb-1 opacity-80">
                      {msg.type === 'user' ? 'You' : 'Agent'}
                    </div>
                  )}
                  <div className="text-sm leading-relaxed">{msg.text}</div>
                  <div className={`text-xs mt-1 ${msg.type === 'user' ? 'opacity-70' : 'opacity-60'}`}>
                    {msg.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Call Controls */}
        <div className="flex gap-4 mb-6 justify-center">
          {callStatus === 'idle' && (
            <button
              onClick={handleStartCall}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-lg"
            >
              Start Call
            </button>
          )}

          {callStatus === 'connected' && (
            <button
              onClick={handleEndCall}
              className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-lg"
            >
              End Call
            </button>
          )}

          {callStatus === 'connecting' && (
            <button
              disabled
              className="px-8 py-3 bg-gray-400 text-white rounded-lg cursor-not-allowed font-medium"
            >
              Connecting...
            </button>
          )}
        </div>

        {/* Connection Info */}
        {callStatus === "connected" && (
          <div className="text-center text-xs text-gray-500 space-y-1">
            <p>🔗 Connected via LiveKit WebRTC</p>
            <p>🎙️ Voice Activity Detection enabled</p>
            <p>🤖 AI Agent ready</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallUI;