import { useState, useRef, useEffect } from "react";
import { IoSend } from "react-icons/io5";
import { sendChatMessage } from "../../libs/messageUtils";

interface Message {
  id: string;
  text: string;
  sender: "user" | "agent";
  timestamp: Date;
}

interface ChatUIProps {
  onSendMessage: (message: string) => void;
}

const ChatUI = ({ onSendMessage }: ChatUIProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! How can I help you today?",
      sender: "agent",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    
    try {
      await sendChatMessage(inputMessage);
      onSendMessage(inputMessage);
      setInputMessage("");

      // Simulate agent response
      setTimeout(() => {
        const agentResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: "I received your message. How can I assist you further?",
          sender: "agent",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, agentResponse]);
      }, 1000);
    } catch (error) {
      console.error("Error sending chat message:", error);
      // Remove the message if sending failed
      setMessages(prev => prev.filter(msg => msg.id !== newMessage.id));
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
      {/* Chat Header */}
      

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
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="py-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border border-gray-300 ring-black rounded-md focus:outline-none focus:ring-1 focus:ring-black focus:border-transparent"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim()}
            className="px-4 py-2 bg-black text-white rounded-md  disabled:cursor-not-allowed transition-colors"
          >
            <IoSend className="text-lg" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatUI; 