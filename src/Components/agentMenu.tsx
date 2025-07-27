import { ChevronDown, Search } from 'lucide-react';
import React, { useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';

interface AgentType {
  id: string;
  name: string;
  folderId: string;
}

interface FolderType {
  id: string;
  name: string;
  createdAt: Date;
}

interface AgentMenuProps {
  agents: AgentType[];
  onAddAgent: (name: string) => void;
  selectedFolderId: string;
  folders: FolderType[];
}

const AgentMenu: React.FC<AgentMenuProps> = ({ agents, onAddAgent, selectedFolderId, folders }) => {
  const [newAgentName, setNewAgentName] = useState('');

  const handleAddAgent = () => {
    if (newAgentName.trim()) {
      onAddAgent(newAgentName.trim());
      setNewAgentName('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddAgent();
    }
  };

  // Find selected folder name
  const selectedFolder = folders.find(f => f.id === selectedFolderId);

  return (
    <div className="h-full px-5 py-5 w-full">
      <div className='flex items-center justify-between w-full'>
        <div>
          <h3>{selectedFolder ? selectedFolder.name : 'All Agents'}</h3>
        </div>
        <div className='flex gap-3 items-center'>
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-1.5 w-full max-w-sm focus-within:ring-2 focus-within:ring-gray-500 transition-colors">
            <Search className="text-gray-600 dark:text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search…"
              className="bg-transparent outline-none w-full placeholder:text-gray-500 dark:placeholder:text-gray-400 text-gray-900 dark:text-gray-100"
              // Implement search if needed
            />
          </div>
          <div className='border-gray-200 border px-3 py-1 rounded'>
            <h3>Import</h3>
          </div>
          <div className='flex w-80 px-3 py-1 rounded-sm bg-black text-white flex-1 gap-2 items-center '>
            <input
              type="text"
              value={newAgentName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setNewAgentName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Create an agent"
              className="bg-transparent outline-none w-full placeholder:text-gray-200 text-white"
            />
            <button onClick={handleAddAgent} className="text-white">Create</button>
            <ChevronDown className="text-white dark:text-white" size={18}/>
          </div>
        </div>
      </div>
      <div className='w-full flex justify-between px-4 py-3 bg-gray-100 border-b text-sm rounded-tl-lg mt-8'>
        <h1>Agent Name</h1>
        {/* Add more columns as needed */}
      </div>
      {agents.length === 0 ? (
        <div className="text-center text-gray-400 py-8">No agents in this folder.</div>
      ) : (
        agents.map(agent => (
          <div key={agent.id} className='w-full flex justify-between px-4 py-3 hover:bg-gray-100 border-b text-sm'>
            <h1>{agent.name}</h1>
            {/* Add more agent fields as needed */}
          </div>
        ))
      )}
    </div>
  );
};

export default AgentMenu;