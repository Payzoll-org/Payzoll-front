import { useState, useEffect } from "react";
import { getMessageHistory, MessageData } from "../../libs/messageUtils";

const MessageHistory = () => {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateMessages = () => {
      setMessages(getMessageHistory());
    };

    // Update messages every second to show real-time updates
    const interval = setInterval(updateMessages, 1000);
    updateMessages(); // Initial load

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'text-blue-600';
      case 'delivered': return 'text-green-600';
      case 'read': return 'text-purple-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'call' ? '📞' : '💬';
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
      >
        📋
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 h-96 bg-white border rounded-lg shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold">Message History</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No messages yet</p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className="border rounded-lg p-3 bg-gray-50"
            >
              <div className="flex items-center gap-2 mb-1">
                <span>{getTypeIcon(message.type)}</span>
                <span className="text-xs font-medium text-gray-600">
                  {message.type.toUpperCase()}
                </span>
                <span className={`text-xs ${getStatusColor(message.status)}`}>
                  {message.status}
                </span>
              </div>
              
              <p className="text-sm mb-1">{message.content}</p>
              
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>{formatTime(message.timestamp)}</span>
                {message.metadata?.phoneNumber && (
                  <span>📱 {message.metadata.phoneNumber}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t text-xs text-gray-500">
        Total messages: {messages.length}
      </div>
    </div>
  );
};

export default MessageHistory; 