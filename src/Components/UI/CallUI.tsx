import { useState, useRef, useEffect } from "react";
import { IoCall, IoMic,} from "react-icons/io5";
import { PiWarningCircleFill } from "react-icons/pi";
import { startCall, endCall, hangupCall, sendTextMessage, handleUserInterrupt } from "../../libs/callUtils";

interface Message {
  type: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
}

const CallUI = () => {
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState<"idle" | "calling" | "connected" | "ended">("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const addMessage = (type: 'user' | 'agent' | 'system', content: string) => {
    setMessages(prev => [...prev, {
      type,
      content,
      timestamp: new Date()
    }]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleCall = () => {
    setIsCalling(true);
    setCallStatus("calling");
    addMessage('system', 'Connecting to audio service...');

    startCall({
      onOpen: () => {
        setCallStatus("connected");
        setIsListening(true);
        addMessage('system', 'Connected! Audio capture started.');
      },
      
      onMessage: (msg) => {
        addMessage('agent', msg);
      },
      
      onClose: () => {
        setCallStatus("ended");
        setIsCalling(false);
        setIsListening(false);
        addMessage('system', 'Call ended.');
      },
      
      onError: (error) => {
        setCallStatus("ended");
        setIsCalling(false);
        setIsListening(false);
        addMessage('system', `Error: ${error.message || 'Connection failed'}`);
      },
      
      onTranscript: (text) => {
        // Real-time transcript display (when we add STT)
        console.log("Real-time transcript:", text);
      }
    });
  };

  const handleEndCall = () => {
    endCall();
    setIsCalling(false);
    setIsListening(false);
    setCallStatus("ended");
    setTimeout(() => setCallStatus("idle"), 1000);
  };

  const handleHangup = () => {
    hangupCall();
    setIsCalling(false);
    setIsListening(false);
    setCallStatus("idle");
  };

  const handleSendTestMessage = () => {
    if (testMessage.trim() && isCalling) {
      addMessage('user', testMessage);
      sendTextMessage(testMessage);
      setTestMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendTestMessage();
    }
  };

  const handleInterrupt = () => {
    handleUserInterrupt();
    addMessage('system', 'Interrupted agent response');
  };

  return (
    <div className="flex h-full item-center justify-center flex-col gap-4 p-4">
      <div className="text-center">
        <h2 className="text-lg mb-2">Voice Agent - Audio Service</h2>
        <div className="text-gray-600 text-xs gap-1 flex items-center justify-center bg-gray-100 rounded-sm py-1">
          <PiWarningCircleFill />
          <p>Now using professional audio pipeline with Socket.io streaming</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Call Status */}
        {callStatus !== "idle" && (
          <div className="flex items-center justify-center gap-2">
            <div
              className={`text-center p-3 rounded-md flex-1 ${
                callStatus === "calling"
                  ? "bg-yellow-100 text-yellow-800"
                  : callStatus === "connected"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {callStatus === "calling" && "Connecting to Audio Service..."}
              {callStatus === "connected" && (
                <div className="flex items-center justify-center gap-2">
                  <IoMic className={isListening ? "text-green-600" : "text-gray-400"} />
                  <span>Audio Service Connected</span>
                  {isListening && <span className="text-xs">(Listening)</span>}
                </div>
              )}
              {callStatus === "ended" && "Call Ended"}
            </div>
            
            {callStatus === "connected" && (
              <button
                onClick={handleInterrupt}
                className="px-3 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 text-sm"
              >
                Interrupt
              </button>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="border p-3 h-64 overflow-y-auto text-sm bg-gray-50 space-y-2">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-xs px-3 py-2 rounded-lg ${
                  msg.type === 'user'
                    ? "bg-blue-500 text-white"
                    : msg.type === 'agent'
                    ? "bg-gray-200 text-gray-800"
                    : "bg-yellow-100 text-yellow-800 text-xs text-center"
                }`}
              >
                <div className="font-medium">
                  {msg.type === 'user' ? 'You' : msg.type === 'agent' ? 'Agent' : 'System'}
                </div>
                <div>{msg.content}</div>
                <div className="text-xs opacity-70 mt-1">
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Test Message Input (for testing before STT is ready) */}
        {callStatus === "connected" && (
          <div className="flex gap-2">
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a test message (while STT is being added)..."
              className="flex-1 px-3 py-2 border rounded-md text-sm"
              disabled={!isCalling}
            />
            <button
              onClick={handleSendTestMessage}
              disabled={!testMessage.trim() || !isCalling}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
            >
              Send
            </button>
          </div>
        )}

        {/* Call Controls */}
        <div className="flex gap-3 justify-center">
          {!isCalling ? (
            <button
              onClick={handleCall}
              className="flex items-center justify-center gap-2 px-8 py-3 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
            >
              <IoCall className="text-lg" />
              <span>Start Voice Call</span>
            </button>
          ) : (
            <>
              <button
                onClick={handleEndCall}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
              >
                <IoCall className="text-lg" />
                <span>End Call</span>
              </button>
              {callStatus === "calling" && (
                <button
                  onClick={handleHangup}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors"
                >
                  <span>Cancel</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Connection Info */}
        {callStatus === "connected" && (
          <div className="text-center text-xs text-gray-500 space-y-1">
            <p>🔗 Connected to Audio Service (localhost:3001)</p>
            <p>🎙️ Audio chunks being sent in real-time</p>
            <p>📡 Ready for STT/TTS integration</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallUI;