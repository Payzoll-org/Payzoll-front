import AgentInput from "../Components/AgentInput"
import AgentPlagroundNavbar from "../Components/AgentPlagroundNavbar"
import MessageHistory from "../Components/UI/MessageHistory"
import AgentSetting from "../Components/AgentSetting"
import AgentHistory from "../Components/AgentHistory"
import AgentConfiguration from '../Components/AgentConfiguration'

const AgentPlaygroung = () => {
  return (
    <div className="h-screen flex relative flex-col overflow-hidden  bg-gray-100 p-3 w-screen">
      
      <AgentPlagroundNavbar />
      <div className="flex w-full h-[calc(100vh-80px)]  gap-3">

            <div className="bg-white px-3  pt-2 py-2   overflow-y-auto  rounded-md w-full">
                <AgentConfiguration />
            </div>

            <div className="bg-white px-3 pt-2 overflow-y-auto rounded-md w-200">
                <AgentSetting />
            </div>

            <div className="bg-white px-3 pt-2 rounded-md w-250">
                <AgentInput />
            </div>

            <div className="bg-white px-3  pt-2 rounded-md w-200">
                <AgentHistory />
            </div>
      </div>

      <MessageHistory />
    </div>
  )
}

export default AgentPlaygroung