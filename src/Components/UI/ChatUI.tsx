import { useRef, useEffect, useState } from "react";
import { IoSend } from "react-icons/io5";
import { sendChatMessage } from "../../libs/messageUtils";
import { useChatStore } from "../../Zustand/chatMessageStore"; // Zustand store

const ChatUI = () => {
  const { messages, addMessage, addSession } = useChatStore(); // Zustand global state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAgentTyping]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    try {
      setIsLoading(true);

      const tempSessionId = sessionId || Date.now().toString();

      // Add user's message immediately
      const userMessage = {
        id: Date.now().toString(),
        text: inputMessage,
        sender: "user" as const,
        timestamp: new Date(),
        session_id: tempSessionId,
      };
      setInputMessage("");
      addMessage(userMessage);

      // Show agent typing bubble
      setIsAgentTyping(true);

      // Send message to API and get agent's reply + sessionId
      const { message: agentReply, sessionId: updatedSessionId } = await sendChatMessage(
        inputMessage,
        sessionId || undefined
      );

      // If sessionId not set, update it and add to sessions list
      if (!sessionId && updatedSessionId) {
        setSessionId(updatedSessionId);
        addSession({
          sessionId: updatedSessionId,
          createdAt: new Date().toISOString(),
        });
      }

      const finalSessionId = sessionId || updatedSessionId;

      // Add agent's message
      const agentMessage = {
        id: Date.now().toString() + "_agent",
        text: agentReply.content,
        sender: "agent" as const,
        timestamp: new Date(),
        session_id: finalSessionId,
      };
      addMessage(agentMessage);

      // Clear input
      

    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsAgentTyping(false);
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-sm ${
                message.sender === "user"
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              <p className="text-sm">{message.text}</p>
            </div>
          </div>
        ))}

        {/* Agent Typing Loader */}
        {isAgentTyping && (
          <div className="flex justify-start">
            <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-sm bg-gray-100 text-gray-800">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="py-4 px-1 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 text-sm px-3 py-2 border border-gray-300 ring-black rounded-md focus:outline-none focus:ring-1 focus:ring-black focus:border-transparent"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="px-4 py-2 bg-black text-white rounded-md disabled:cursor-not-allowed transition-colors"
          >
            <IoSend className="text-lg" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatUI;