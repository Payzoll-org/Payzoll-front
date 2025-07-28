import { PiBracketsCurly } from "react-icons/pi";
import { useState } from "react";
import { IoMdCall } from "react-icons/io";
import { IoChatbubbles } from "react-icons/io5";
import CallUI from "./UI/CallUI";
import ChatUI from "./UI/ChatUI";
import {  sendChatMessage } from "../libs/messageUtils";

const AgentInput = () => {
  const [activeTab, setActiveTab] = useState<'call' | 'chat'>('call');

  const handleTabClick = (tab: 'call' | 'chat') => {
    setActiveTab(tab);
  };

  const handleSendMessage = async (message: string) => {
    try {
      if (activeTab === 'call') {
        // For call, we'll handle this in the CallUI component
        console.log('Call message:', message);
      } else {
        // For chat messages
        await sendChatMessage(message);
        console.log('Chat message sent:', message);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  

  return (
    <div className="h-full w-full flex flex-col">
      {/* Tab Navigation */}
      <div className="flex gap-3 border-b py-3 items-center ">
        <div className="flex justify-between py-1 px-2 gap-2 rounded-sm w-full bg-gray-100">
          <div 
            className={`rounded-sm flex gap-2 items-center py-1 w-full justify-center cursor-pointer text-sm transition-colors duration-200 ${
              activeTab === 'call' 
                ? 'bg-black text-white' 
                : 'text-gray-700'
            }`}
            onClick={() => handleTabClick('call')}
          >
            <IoMdCall />
            <h1>Call</h1>
          </div>
          <div 
            className={`rounded-sm flex gap-2 items-center justify-center w-full text-sm cursor-pointer transition-colors duration-200 ${
              activeTab === 'chat' 
                ? 'bg-black text-white' 
                : 'text-gray-700'
            }`}
            onClick={() => handleTabClick('chat')}
          >
            <IoChatbubbles />
            <h1>Chat</h1>
          </div>
        </div>
        <div className="border p-2 rounded-sm">
          <PiBracketsCurly />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'call' ? (
          <CallUI onSendMessage={handleSendMessage} />
        ) : (
          <ChatUI onSendMessage={handleSendMessage} />
        )}
      </div>
    </div>
  );
};

export default AgentInput;