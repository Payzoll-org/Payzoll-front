import { useState, useRef, useEffect } from "react";
import { IoCall, IoMic, } from "react-icons/io5";
import { PiWarningCircleFill } from "react-icons/pi";
import { startCall, endCall, hangupCall, handleUserInterrupt } from "../../libs/callUtils";

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
        // Display user's transcribed speech in chat
        addMessage('user', text);
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
              className={`text-center p-3 rounded-md flex-1 ${callStatus === "calling"
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
                  <div className="text-sm leading-relaxed">{msg.content}</div>
                  <div className={`text-xs mt-1 ${msg.type === 'user' ? 'opacity-70' : 'opacity-60'}`}>
                    {msg.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Test Message Input - Hidden since we have real voice transcription now */}
        {/* Uncomment below if you need to test with text input */}
        {/* {callStatus === "connected" && (
          <div className="flex gap-2">
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a test message..."
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
        )} */}

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