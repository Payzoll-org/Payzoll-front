import { IoSettingsOutline } from "react-icons/io5";
import { IoIosArrowDown } from "react-icons/io";
import React, { useEffect, useState } from 'react';
import axios from "axios";
import { usePromptStore } from '../Zustand/AgentConfiguration';


const AgentConfiguration: React.FC = () => {
  const { prompt, setPrompt } = usePromptStore();
  const [savedPrompt, setSavedPrompt] = useState<string>("");
  const [isChanged, setIsChanged] = useState<boolean>(false);

  const [whoSpeaksFirst, setWhoSpeaksFirst] = useState<'user' | 'agent'>('user');
  const [silenceTime, setSilenceTime] = useState(5);
  const [userMessageType, setUserMessageType] = useState<'dynamic' | 'custom'>('dynamic');
  const [userCustomMessage, setUserCustomMessage] = useState('');
  const [agentMessageType, setAgentMessageType] = useState<'dynamic' | 'custom'>('dynamic');
  const [aiCustomMessage, setAiCustomMessage] = useState('');

  const [showOptions, setShowOptions] = useState(false);
  const [showAiMessageOptions, setShowAiMessageOptions] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [aiAfterSilence, setAiAfterSilence] = useState(false);
  const [showUserMessageOptions, setShowUserMessageOptions] = useState(false);
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

  const handleWhoSpeaksFirst = (id: 'user' | 'agent') => {
    setWhoSpeaksFirst(id);
    setShowAiMessageOptions(false);
    setShowUserMessageOptions(false);
    setShowOptions(false);
  };

  useEffect(() => {
    setIsChanged(prompt !== savedPrompt);
  }, [prompt, savedPrompt]);



  useEffect(() => {
  
    const timer = setTimeout(() => {
      const configData = {
        whoSpeaksFirst,
        aiAfterSilence,
        silenceTime,
        userMessageType,
        userCustomMessage,
        agentMessageType,
        aiCustomMessage,
      };

      axios.post("/api/agentconfig/save-config", configData)
        .then(() => console.log("✅ Config updated:", configData))
        .catch(err => console.error("❌ Error updating config:", err));
    }, 500); // wait 500ms after last change

    return () => clearTimeout(timer);
  }, [
    whoSpeaksFirst,
    aiAfterSilence,
    silenceTime,
    userMessageType,
    userCustomMessage,
    agentMessageType,
    aiCustomMessage,
  ]);


  const handleSavePrompte = async (): Promise<void> => {
    try {
      // ✅ Get current prompt from Zustand
      const prompt = usePromptStore.getState().prompt;
  
      // ✅ Save to localStorage
      localStorage.setItem("userPrompt", prompt);
  
      // ✅ Send request to backend
      const response = await axios.post("/api/prompt/save", {
        prompt: prompt,
      });
  
      console.log("✅ Prompt saved to backend:", response.data);
  
      // ✅ Update local state (if these come from useState)
      setSavedPrompt(prompt);
      setIsChanged(false);
    } catch (error) {
      console.error("❌ Error saving prompt:", error);
    }
  };

  const handleRevert = (): void => {
    setPrompt(savedPrompt);
    setIsChanged(false);
  };


  const handleAgentType = (id: 'dynamic' | 'custom') => {
    setAgentMessageType(id);
    setShowAiMessageOptions(false);
    if (id === 'dynamic') {
      setAiCustomMessage('');
    }
  };

  const handleUserMessageType = (id: 'dynamic' | 'custom') => {
    setUserMessageType(id);
    setShowUserMessageOptions(false);
    if (id === 'dynamic') {
      setUserCustomMessage('');
    }
  };

  const handleSave = () => {
    setSavedMessage(aiCustomMessage);
  };

  const handleSaveUserMessage = () => {
    setSavedUserMessage(userCustomMessage);
  };

  const handleSilenceTimeChange = (value: number) => {
    setSilenceTime(Math.min(Math.max(value, 1), 20));
  };

  return (
    <div >
        <div className="flex  gap-3 py-3">
            <div className="bg-gray-100 flex items-center rounded-sm  ">
               <div className="flex py-1 px-2 text-sm items-center gap-3 border-r">
                    <img className="h-4" src="data:image/png;base64,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" alt="" />
                    <h1>GPT 4.1</h1>
                    <IoIosArrowDown className="text-gray-400"/>
               </div>
                <div className="px-2">
                     <IoSettingsOutline />
                </div>
            </div>
            <div className="bg-gray-100 flex items-center rounded-sm  ">
               <div className="flex py-1 text-sm px-2 items-center gap-3 ">
                    <img className="h-4" src="data:image/png;base64,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" alt="" />
                    <h1>GPT 4.1</h1>
                    <IoIosArrowDown className="text-gray-400"/>
               </div>
                
            </div>
        </div>

        <div className="relative">
            <textarea value={prompt}
                onChange={(e) => setPrompt(e.target.value)} 
                placeholder="Type in a Universal agent for your agent, such its role, conversational style, objective ,etc." 
                className="border  p-3 text-sm  border-gray-300  rounded-md w-full min-h-50 h-100" 
                name="Prompte" 
                id="Prompte">


             </textarea>
             {isChanged && (
        <div className="absolute flex gap-3 px-4 bottom-10">
          <button
            onClick={handleSavePrompte}
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
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-left bg-white  flex justify-between items-center"
          onClick={() => setShowOptions((prev) => !prev)}
          type="button"
        >
          {options.find((o) => o.id === whoSpeaksFirst)?.label}
          <IoIosArrowDown className={`ml-2 transition-transform ${showOptions ? 'rotate-180' : ''}`} />
        </button>
        {showOptions && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded shadow">
            {options.map((option) => (
              <div
                key={option.id}
                className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${whoSpeaksFirst === option.id ? 'bg-gray-100 ' : ''}`}
                onClick={() => handleWhoSpeaksFirst(option.id as 'user' | 'agent')}
              >
                {option.label}
              </div>
            ))}
          </div>
        )}
      </div>
      

      {/* If User Speaks First, show AI after silence option */}
      {whoSpeaksFirst === 'user' && (
        <div className="mt-4">

          

          <div className="flex justify-between mb-3 pl-1 items-center">

            <div className="flex items-center gap-3 ">
              <span className="text-sm font-medium">AI starts speaking after silence</span>
                <button
                  className={`w-9 h-4 rounded-full transition-colors ${
                    aiAfterSilence ? 'bg-black' : 'bg-gray-300'
                  }`}
                  onClick={() => setAiAfterSilence(!aiAfterSilence)}
                  type="button"
                  >
                  <div
                    className={`w-3 h-3 bg-white rounded-full transition-transform ${
                      aiAfterSilence ? 'translate-x-5' : 'translate-x-1'
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
                   value={silenceTime}
                   onChange={(e) => handleSilenceTimeChange(parseInt(e.target.value))}
                   className="w-40 h-2 hidden bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <span className="text-sm text-gray-700">{silenceTime} sec</span>
              </div>
          </div>

            

          {aiAfterSilence && (
            <div className="space-y-3">
              

              <div className="relative w-full">
                <button
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-left bg-white   flex justify-between items-center"
                  onClick={() => setShowUserMessageOptions((prev) => !prev)}
                  type="button"
                >
                  {userMessageOptions.find((o) => o.id === userMessageType)?.label}
                  <IoIosArrowDown className={`ml-2 transition-transform ${showUserMessageOptions ? 'rotate-180' : ''}`} />
                </button>
                {showUserMessageOptions && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded shadow">
                    {userMessageOptions.map((option) => (
                      <div
                        key={option.id}
                        className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${userMessageType === option.id ? 'bg-gray-100 ' : ''}`}
                        onClick={() => handleUserMessageType(option.id as 'dynamic' | 'custom')}
                      >
                        {option.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {userMessageType === 'custom' && (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      className="border border-gray-300 rounded-sm w-full px-3 py-2 text-sm "
                      placeholder="Enter custom message..."
                      value={userCustomMessage}
                      onChange={e => setUserCustomMessage(e.target.value)}
                    />
                    <button
                      className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition whitespace-nowrap"
                      onClick={handleSaveUserMessage}
                      type="button"
                      disabled={!userCustomMessage.trim()}
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
      {whoSpeaksFirst === 'agent' && (
        <div className="mt-2">  
        <h1 className="text-sm mt-4 mb-2 pl-1 font-medium">Agent Speak Setting</h1>
             


          <div className="relative w-full mb-2">
            <button
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-left bg-white  flex justify-between items-center"
              onClick={() => setShowAiMessageOptions((prev) => !prev)}
              type="button"
            >
              {agentTypeOptions.find((o) => o.id === agentMessageType)?.label}
              <IoIosArrowDown className={`ml-2 transition-transform ${showAiMessageOptions ? 'rotate-180' : ''}`} />
            </button>
            {showAiMessageOptions && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded shadow">
                {agentTypeOptions.map((option) => (
                  <div
                    key={option.id}
                    className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${agentMessageType === option.id ? 'bg-gray-100' : ''}`}
                    onClick={() => handleAgentType(option.id as 'dynamic' | 'custom')}
                  >
                    {option.label}
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* If Custom Message, show input */}
          {agentMessageType === 'custom' && (
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex gap-3">
                <input
                  type="text"
                  className="border border-gray-300 rounded-sm w-full px-3 py-2 text-sm "
                  placeholder="Enter custom welcome message..."
                  value={aiCustomMessage}
                  onChange={e => setAiCustomMessage(e.target.value)}
                />
                <button
                  className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition whitespace-nowrap"
                  onClick={handleSave}
                  type="button"
                  disabled={!aiCustomMessage.trim()}
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
        className="w-full  object-cover" 
        alt="Tree Preview" 
      />
      <div className="z-10 border-gray-300 absolute bg-white border rounded-sm px-3 py-1">Edit Prompt Tree</div>
    </div>


        
    </div>
  )
}

export default AgentConfiguration