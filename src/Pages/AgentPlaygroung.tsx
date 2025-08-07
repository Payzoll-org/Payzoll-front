import { useState } from 'react';
import AgentInput from "../Components/AgentInput";
import AgentPlagroundNavbar from "../Components/AgentPlagroundNavbar";
import AgentSetting from "../Components/AgentSetting";
import AgentHistory from "../Components/AgentHistory";
import AgentConfiguration from '../Components/AgentConfiguration';

const AgentPlaygroung = () => {
  const [showHistory, setShowHistory] = useState<boolean>(false);  // Type-safe state

  return (
    <div className="h-screen flex relative flex-col overflow-hidden bg-gray-100 p-3 w-screen">
      <AgentPlagroundNavbar onToggleHistory={() => setShowHistory(true)} />

      <div className="flex w-full h-[calc(100vh-80px)] gap-3">
        <div className="bg-white px-3 pt-2 py-2 overflow-y-auto rounded-md w-full">
          <AgentConfiguration />
        </div>

        <div className="bg-white px-3 pt-2 overflow-y-auto rounded-md w-200">
          <AgentSetting />
        </div>

        <div className={`bg-white px-3 pt-2 rounded-md ${
            showHistory ? 'w-250' : 'w-200'
          }`}>
          <AgentInput />
        </div>

        {showHistory && (
          <div className="bg-white px-3 pt-2 rounded-md w-200 relative">
           
            <AgentHistory onToggleHistory={() => setShowHistory(false)}  />
          </div>
        )}
      </div>

   
    </div>
  );
};

export default AgentPlaygroung;