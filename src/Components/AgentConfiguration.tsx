import { IoSettingsOutline } from "react-icons/io5";
import { IoIosArrowDown } from "react-icons/io";
import React, { useEffect, useState } from 'react';
import { usePromptStore } from '../Zustand/AgentConfiguration';
import { useParams } from "react-router-dom";
import { AgentManagementApi } from "../services/agentManagementApi";

interface AgentConfig {
  whoSpeaksFirst: 'user' | 'agent';
  aiAfterSilence: boolean;
  silenceTime: number;
  userMessageType: 'dynamic' | 'custom';
  userCustomMessage: string;
  agentMessageType: 'dynamic' | 'custom';
  aiCustomMessage: string;
  prompt?: string;
}

const AgentConfiguration: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { prompt, setPrompt } = usePromptStore();
  
  const [savedPrompt, setSavedPrompt] = useState<string>("");
  const [isChanged, setIsChanged] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  // Configuration state - single source of truth
  const [config, setConfig] = useState<AgentConfig>({
    whoSpeaksFirst: "user",
    aiAfterSilence: false,
    silenceTime: 5,
    userMessageType: "dynamic",
    userCustomMessage: "",
    agentMessageType: "dynamic",
    aiCustomMessage: "",
  });

  // UI state for dropdowns
  const [showOptions, setShowOptions] = useState(false);
  const [showAiMessageOptions, setShowAiMessageOptions] = useState(false);
  const [showUserMessageOptions, setShowUserMessageOptions] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [savedUserMessage, setSavedUserMessage] = useState('');

  const options = [
    { id: 'user', label: 'User Speaks First' },
    { id: 'agent', label: 'Agent Speaks First' },
  ];

  const agentTypeOptions = [
    { id: 'dynamic', label: 'Dynamic Message' },
    { id: 'custom', label: 'Custom Message' },
  ];

  const userMessageOptions = [
    { id: 'dynamic', label: 'Dynamic Message Based on Prompt' },
    { id: 'custom', label: 'Custom Message' },
  ];

  // 1. FETCH INITIAL CONFIG FROM BACKEND
  useEffect(() => {
    const fetchConfig = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const res = await AgentManagementApi.getAgentConfig(id);
        
        if (res?.data) {
          const fetchedConfig = res.data;
          
          // Update config state with fetched data
          setConfig({
            whoSpeaksFirst: fetchedConfig.whoSpeaksFirst || "user",
            aiAfterSilence: fetchedConfig.aiAfterSilence || false,
            silenceTime: fetchedConfig.silenceTime || 5,
            userMessageType: fetchedConfig.userMessageType || "dynamic",
            userCustomMessage: fetchedConfig.userCustomMessage || "",
            agentMessageType: fetchedConfig.agentMessageType || "dynamic",
            aiCustomMessage: fetchedConfig.aiCustomMessage || "",
          });
          
          // Update saved messages
          if (fetchedConfig.userCustomMessage) {
            setSavedUserMessage(fetchedConfig.userCustomMessage);
          }
          if (fetchedConfig.aiCustomMessage) {
            setSavedMessage(fetchedConfig.aiCustomMessage);
          }
          
          // Update prompt if exists
          if (fetchedConfig.prompt) {
            setPrompt(fetchedConfig.prompt);
            setSavedPrompt(fetchedConfig.prompt);
          }
        }
      } catch (error) {
        console.error("❌ Error fetching config:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [id]);

  // 2. TRACK PROMPT CHANGES
  useEffect(() => {
    setIsChanged(prompt !== savedPrompt);
  }, [prompt, savedPrompt]);



  // 3. AUTO-SAVE CONFIG CHANGES (DEBOUNCED)
  useEffect(() => {
    // Skip auto-save during initial load
    if (loading) return;

    const timer = setTimeout(() => {
      saveConfigToBackend();
    }, 500);

    return () => clearTimeout(timer);
  }, [config, loading]);

  // SAVE CONFIG TO BACKEND
  const saveConfigToBackend = async () => {
    if (!id) return;
    
    try {
      // Merge prompt into config
      const updatedConfig = {
        ...config,
        prompt, // include the current prompt in the same payload
      };
  
      await AgentManagementApi.saveAgentConfig(id, updatedConfig);
  
      console.log("✅ Config (with prompt) auto-saved:", updatedConfig);
      setSavedPrompt(prompt); // update local state
      setIsChanged(false);
    } catch (error) {
      console.error("❌ Error saving config:", error);
    }
  };

 

  // REVERT PROMPT
  const handleRevert = (): void => {
    setPrompt(savedPrompt);
    setIsChanged(false);
  };

  // UPDATE CONFIG HELPER
  const updateConfig = (updates: Partial<AgentConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  // HANDLERS
  const handleWhoSpeaksFirst = (id: 'user' | 'agent') => {
    updateConfig({ whoSpeaksFirst: id });
    setShowAiMessageOptions(false);
    setShowUserMessageOptions(false);
    setShowOptions(false);
  };

  const handleAgentType = (id: 'dynamic' | 'custom') => {
    updateConfig({ 
      agentMessageType: id,
      aiCustomMessage: id === 'dynamic' ? '' : config.aiCustomMessage
    });
    setShowAiMessageOptions(false);
  };

  const handleUserMessageType = (id: 'dynamic' | 'custom') => {
    updateConfig({ 
      userMessageType: id,
      userCustomMessage: id === 'dynamic' ? '' : config.userCustomMessage
    });
    setShowUserMessageOptions(false);
  };

  const handleSave = () => {
    setSavedMessage(config.aiCustomMessage);
  };

  const handleSaveUserMessage = () => {
    setSavedUserMessage(config.userCustomMessage);
  };

  const handleSilenceTimeChange = (value: number) => {
    const clampedValue = Math.min(Math.max(value, 1), 20);
    updateConfig({ silenceTime: clampedValue });
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="flex gap-3 py-3">
        <div className="bg-gray-100 flex items-center rounded-sm">
          <div className="flex py-1 px-2 text-sm items-center gap-3 border-r">
            <img className="h-4" src="" alt="" />
            <h1>GPT 4.1</h1>
            <IoIosArrowDown className="text-gray-400"/>
          </div>
          <div className="px-2">
            <IoSettingsOutline />
          </div>
        </div>
        <div className="bg-gray-100 flex items-center rounded-sm">
          <div className="flex py-1 text-sm px-2 items-center gap-3">
            <img className="h-4" src="" alt="" />
            <h1>GPT 4.1</h1>
            <IoIosArrowDown className="text-gray-400"/>
          </div>
        </div>
      </div>

      <div className="relative">
        <textarea 
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)} 
          placeholder="Type in a Universal agent for your agent, such its role, conversational style, objective ,etc." 
          className="border p-3 text-sm border-gray-300 rounded-md w-full min-h-50 h-100" 
          name="Prompte" 
          id="Prompte"
        />
        {isChanged && (
          <div className="absolute flex gap-3 px-4 bottom-10">
            <button
              onClick={saveConfigToBackend}
              className="text-white bg-black border-gray-300 border px-4 py-2 rounded-sm"
            >
              Save
            </button>
            <button
              onClick={handleRevert}
              className="text-black bg-white border-gray-300 border px-4 py-2 rounded-sm"
            >
              Revert
            </button>
          </div>
        )}
        <p className="text-sm">Use {'{{}}'} to add variables. (Learn more)</p>
      </div>

      <div className="mt-3">
        <h3 className="text-lg font-semibold mb-2">Welcome Message</h3>

        {/* Custom Dropdown for Who Speaks First */}
        <div className="relative w-full mb-2">
          <button
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-left bg-white flex justify-between items-center"
            onClick={() => setShowOptions((prev) => !prev)}
            type="button"
          >
            {options.find((o) => o.id === config.whoSpeaksFirst)?.label}
            <IoIosArrowDown className={`ml-2 transition-transform ${showOptions ? 'rotate-180' : ''}`} />
          </button>
          {showOptions && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded shadow">
              {options.map((option) => (
                <div
                  key={option.id}
                  className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${config.whoSpeaksFirst === option.id ? 'bg-gray-100 ' : ''}`}
                  onClick={() => handleWhoSpeaksFirst(option.id as 'user' | 'agent')}
                >
                  {option.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* If User Speaks First, show AI after silence option */}
        {config.whoSpeaksFirst === 'user' && (
          <div className="mt-4">
            <div className="flex justify-between mb-3 pl-1 items-center">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">AI starts speaking after silence</span>
                <button
                  className={`w-9 h-4 rounded-full transition-colors ${
                    config.aiAfterSilence ? 'bg-black' : 'bg-gray-300'
                  }`}
                  onClick={() => updateConfig({ aiAfterSilence: !config.aiAfterSilence })}
                  type="button"
                >
                  <div
                    className={`w-3 h-3 bg-white rounded-full transition-transform ${
                      config.aiAfterSilence ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Silence Time:</label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={config.silenceTime}
                  onChange={(e) => handleSilenceTimeChange(parseInt(e.target.value))}
                  className="w-40 h-2 hidden bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <span className="text-sm text-gray-700">{config.silenceTime} sec</span>
              </div>
            </div>

            {config.aiAfterSilence && (
              <div className="space-y-3">
                <div className="relative w-full">
                  <button
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-left bg-white flex justify-between items-center"
                    onClick={() => setShowUserMessageOptions((prev) => !prev)}
                    type="button"
                  >
                    {userMessageOptions.find((o) => o.id === config.userMessageType)?.label}
                    <IoIosArrowDown className={`ml-2 transition-transform ${showUserMessageOptions ? 'rotate-180' : ''}`} />
                  </button>
                  {showUserMessageOptions && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded shadow">
                      {userMessageOptions.map((option) => (
                        <div
                          key={option.id}
                          className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${config.userMessageType === option.id ? 'bg-gray-100 ' : ''}`}
                          onClick={() => handleUserMessageType(option.id as 'dynamic' | 'custom')}
                        >
                          {option.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {config.userMessageType === 'custom' && (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        className="border border-gray-300 rounded-sm w-full px-3 py-2 text-sm"
                        placeholder="Enter custom message..."
                        value={config.userCustomMessage}
                        onChange={e => updateConfig({ userCustomMessage: e.target.value })}
                      />
                      <button
                        className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition whitespace-nowrap"
                        onClick={handleSaveUserMessage}
                        type="button"
                        disabled={!config.userCustomMessage.trim()}
                      >
                        Save
                      </button>
                    </div>
                    {savedUserMessage && (
                      <span className="text-green-600 text-xs">Saved: {savedUserMessage}</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* If Agent Speaks First, show another dropdown */}
        {config.whoSpeaksFirst === 'agent' && (
          <div className="mt-2">  
            <h1 className="text-sm mt-4 mb-2 pl-1 font-medium">Agent Speak Setting</h1>

            <div className="relative w-full mb-2">
              <button
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-left bg-white flex justify-between items-center"
                onClick={() => setShowAiMessageOptions((prev) => !prev)}
                type="button"
              >
                {agentTypeOptions.find((o) => o.id === config.agentMessageType)?.label}
                <IoIosArrowDown className={`ml-2 transition-transform ${showAiMessageOptions ? 'rotate-180' : ''}`} />
              </button>
              {showAiMessageOptions && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded shadow">
                  {agentTypeOptions.map((option) => (
                    <div
                      key={option.id}
                      className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${config.agentMessageType === option.id ? 'bg-gray-100' : ''}`}
                      onClick={() => handleAgentType(option.id as 'dynamic' | 'custom')}
                    >
                      {option.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {config.agentMessageType === 'custom' && (
              <div className="flex flex-col gap-2 mt-2">
                <div className="flex gap-3">
                  <input
                    type="text"
                    className="border border-gray-300 rounded-sm w-full px-3 py-2 text-sm"
                    placeholder="Enter custom welcome message..."
                    value={config.aiCustomMessage}
                    onChange={e => updateConfig({ aiCustomMessage: e.target.value })}
                  />
                  <button
                    className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition whitespace-nowrap"
                    onClick={handleSave}
                    type="button"
                    disabled={!config.aiCustomMessage.trim()}
                  >
                    Save
                  </button>
                </div>
                {savedMessage && (
                  <span className="text-green-600 text-xs">Saved: {savedMessage}</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border mt-3 flex items-center justify-center relative mb-2 h-64 w-full rounded-md overflow-hidden">
        <img 
          src="./tree_preview.webp" 
          className="w-full object-cover" 
          alt="Tree Preview" 
        />
        <div className="z-10 border-gray-300 absolute bg-white border rounded-sm px-3 py-1">Edit Prompt Tree</div>
      </div>
    </div>
  );
};

export default AgentConfiguration;