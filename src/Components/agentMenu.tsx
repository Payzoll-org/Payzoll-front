import { ChevronDown, Search, X, MessageSquare, Mic, Plus } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgentManagementApi } from "../services/agentManagementApi";
import { useAuthStore } from "../Zustand/userStore";

interface AgentType {
  id: string;
  name: string;
  folderId: string;
  voice: string;
  category: string;
  createdAt: Date;
}

interface FolderType {
  id: string;
  name: string;
  createdAt: Date;
}

interface AgentMenuProps {
  agents: AgentType[];
  onAddAgent: (id: string ,name: string, category: string, voice: string ) => void;
  selectedFolderId: string;
  folders: FolderType[];
}

const AgentMenu: React.FC<AgentMenuProps> = ({ agents, onAddAgent, selectedFolderId, folders }) => {
  const [isCreateDropdownOpen, setIsCreateDropdownOpen] = useState(false);
  const [selectedAgentCategory, setSelectedAgentCategory] = useState<'voice' | 'text' | null>(null);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [selectedAgentType, setSelectedAgentType] = useState<string>('');
  const [agentName, setAgentName] = useState('');
  const [voiceType, setVoiceType] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showAgentTypeModal, setShowAgentTypeModal] = useState(false);
  const [selectedAgentTypeId, setSelectedAgentTypeId] = useState<string>('');
  const userId = useAuthStore((state) => state.user?.id || "");
  const navigate = useNavigate();

  const voiceAgentTypes = [
    { id: 'customer-service', name: 'Customer Service', description: 'Handle customer inquiries and support', icon: '🎧' , voice:'luma'},
    { id: 'sales-agent', name: 'Sales Agent', description: 'Generate leads and close sales', icon: '💰',voice:'luma' },
    { id: 'appointment-scheduler', name: 'Appointment Scheduler', description: 'Schedule and manage appointments', icon: '📅',voice:'luma'  },
    { id: 'survey-agent', name: 'Survey Agent', description: 'Conduct surveys and collect feedback', icon: '📊' ,voice:'luma' }
  ];

  const textAgentTypes = [
    { id: 'chat-support', name: 'Chat Support', description: 'Provide customer support via chat', icon: '💬' ,voice:'luma' },
    { id: 'lead-qualifier', name: 'Lead Qualifier', description: 'Qualify leads through conversation', icon: '🎯' ,voice:'luma' },
    { id: 'faq-bot', name: 'FAQ Bot', description: 'Answer frequently asked questions', icon: '❓' ,voice:'luma' },
    { id: 'conversation-agent', name: 'Conversation Agent', description: 'Engage in general conversations', icon: '🤖' ,voice:'luma' }
  ];


  const resetForm = () => {
    setSelectedAgentCategory(null);
    setSelectedAgentType('');
    setAgentName('');
    setVoiceType('');
    setPhoneNumber('');
    setShowForm(false);
    setIsCreateDropdownOpen(false);
    setIsTypeDropdownOpen(false);
    setShowAgentTypeModal(false);
    setSelectedAgentTypeId('');
  };

  const handleAgentCategorySelect = (category: 'voice' | 'text') => {
    setSelectedAgentCategory(category);
    setIsCreateDropdownOpen(false);
    setShowAgentTypeModal(true);
    
    // Set the first agent type as default selected
    const agentTypes = category === 'voice' ? voiceAgentTypes : textAgentTypes;
    if (agentTypes.length > 0) {
      setSelectedAgentTypeId(agentTypes[0].id);
    }
  };

  const handleAgentTypeSelect = (typeId: string) => {
    setSelectedAgentTypeId(typeId);
  };




  const handleCreateAgentFromModal = async () => {
    if (!selectedAgentTypeId || !selectedAgentCategory || !userId) return;
  
    // pick correct list
    const agentList =
      selectedAgentCategory === 'voice' ? voiceAgentTypes : textAgentTypes;
  
    // directly find selected agent type
    const selectedType = agentList.find((type) => type.id === selectedAgentTypeId);
    if (!selectedType) return;
  
    // build complete agent object (no temporary variables)
    const agentToSend = {
      name: `${selectedType.name} Agent`,
      category: selectedAgentCategory,
      voice: selectedType.voice || '',
      folderId: selectedFolderId,
      createdBy: userId,
    };


  
    try {
      const response = await AgentManagementApi.createAgent(agentToSend);

      if (response.success) {
        console.log('✅ Agent created successfully:', response.agent);
  
        // Update UI instantly
        onAddAgent(
          response.agent._id,
          response.agent.name,
          response.agent.category,
          response.agent.voice,
        );
  
        resetForm();
        setShowAgentTypeModal(false);
      } else {
        console.error('❌ Error creating agent:', response.message);
      }
    } catch (error) {
      console.error('🚨 Error while sending request:', error);
    }
  };



  // Find selected folder name
  const selectedFolder = folders.find(f => f.id === selectedFolderId);

  return (
    <div className="h-full px-5 py-5 w-full relative">
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
          
          {/* Create Agent Dropdown */}
          <div className="relative">
            <div className='flex w-42 px-3 py-1 rounded-sm bg-black text-white flex-1 gap-2 items-center cursor-pointer' onClick={() => setIsCreateDropdownOpen(!isCreateDropdownOpen)}>
              <button className="text-white">Create an agent</button>
              <ChevronDown className={`text-white transition-transform ${isCreateDropdownOpen ? 'rotate-180' : ''}`} size={18}/>
            </div>
            
            {/* Agent Category Dropdown */}
            {isCreateDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-42 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50">
                <div className="p-2">
                  <div 
                    className="flex items-center gap-3 px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                    onClick={() => handleAgentCategorySelect('voice')}
                  >
                    <Mic size={20} className="text-green-600 dark:text-green-400" />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Voice Agent</div>
                      
                    </div>
                  </div>
                  
                  <div 
                    className="flex items-center gap-3 px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                    onClick={() => handleAgentCategorySelect('text')}
                  >
                    <MessageSquare size={20} className="text-blue-600 dark:text-blue-400" />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Text Agent</div>
                     
                    </div>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>

      {/* Agent Type Selection Modal */}
      {showAgentTypeModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Choose {selectedAgentCategory === 'voice' ? 'Voice' : 'Text'} Agent Type
                </h2>
                <button
                  onClick={() => setShowAgentTypeModal(false)}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X size={20} className="text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {(selectedAgentCategory === 'voice' ? voiceAgentTypes : textAgentTypes).map((type) => (
                  <div 
                    key={type.id}
                    className={`border rounded-lg p-6 cursor-pointer transition-all ${
                      selectedAgentTypeId === type.id 
                        ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-lg' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg'
                    }`}
                    onClick={() => handleAgentTypeSelect(type.id)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-3xl">{type.icon}</div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          {type.name}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                          {type.description}
                        </p>
                        
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowAgentTypeModal(false)}
                  className="px-6 py-3 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAgentFromModal}
                  disabled={!selectedAgentTypeId}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Plus size={16} />
                  Create Agent
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className='w-full flex justify-between px-4 py-3 bg-gray-100 border-b text-sm rounded-tl-lg mt-8'>
        <h1>Agent Name</h1>
        <h1>Voice</h1>
        <h1>Category</h1>
        <h1>Created</h1>
        {/* Add more columns as needed */}
      </div>
      {agents.length === 0 ? (
        <div className="text-center text-gray-400 py-8">No agents in this folder.</div>
      ) : (
        agents.map(agent => (
          <div onClick={() => navigate(`/agent/${agent.id}`)}  key={agent.id} className='w-full flex justify-between px-4 py-3 hover:bg-gray-100 border-b text-sm'>
            <h1>{agent.name}</h1>
            <h1 className="capitalize">{agent.voice}</h1>
            <h1>{agent.category}</h1>
            <h1>{agent.createdAt.toLocaleDateString()}</h1>
            {/* Add more agent fields as needed */}
          </div>
        ))
      )}
    </div>
  );
};

export default AgentMenu;