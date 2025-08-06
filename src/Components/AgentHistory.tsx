import { useState } from "react";
import { RxCross2 } from "react-icons/rx";
import { Search } from 'lucide-react';
import { useChatStore } from "../Zustand/chatMessageStore";


interface AgentHistoryProps {
  onToggleHistory: () => void;
}

const AgentHistory: React.FC<AgentHistoryProps> = ({onToggleHistory}) => {
  const { sessions } = useChatStore();
  const [searchTerm, setSearchTerm] = useState("");

  // Filter sessions based on search term
  const filteredSessions = sessions.filter((session) =>
    session.sessionId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center border-b py-5 justify-between">
        <h1>History</h1>
        <button onClick={onToggleHistory} ><RxCross2 className="text-lg" /></button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2 mt-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-1.5 w-full max-w-sm focus-within:ring-2 focus-within:ring-gray-500 transition-colors">
        <Search className="text-gray-600 dark:text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent outline-none w-full placeholder:text-gray-500 dark:placeholder:text-gray-400 text-gray-900 dark:text-gray-100"
        />
      </div>

      {/* Session List */}
      <div className="mt-4 space-y-2">
        {filteredSessions.length === 0 ? (
          <p className="text-sm text-gray-500">No sessions found.</p>
        ) : (
          filteredSessions.map((session) => (
            <div
              key={session.sessionId}
              className="border px-3 py-2 rounded-md flex flex-col cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              // You can add onClick to navigate to /chat/{sessionId} if needed
            >
              <span className="text-sm font-mono truncate">{session.sessionId}</span>
              <span className="text-xs text-gray-500">{new Date(session.createdAt).toLocaleString()}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AgentHistory;