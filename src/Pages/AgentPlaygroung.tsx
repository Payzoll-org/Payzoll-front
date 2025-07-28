import AgentInput from "../Components/AgentInput"
import AgentPlagroundNavbar from "../Components/AgentPlagroundNavbar"
import MessageHistory from "../Components/UI/MessageHistory"
import AgentSetting from "../Components/AgentSetting"

const AgentPlaygroung = () => {
  return (
    <div className="h-screen flex relative flex-col overflow-hidden bg-gray-100 p-3 w-screen">
      
      <AgentPlagroundNavbar />
      <div className="flex w-full h-full  gap-3">
            <div className="bg-white  rounded-md w-full">

            </div>

            <div className="bg-white px-3 pt-2 rounded-md w-200">
                <AgentSetting />
            </div>

            <div className="bg-white px-3 pt-2 rounded-md w-250">
                <AgentInput />
            </div>

            <div className="bg-white  rounded-md w-200">

            </div>
      </div>

      <MessageHistory />
    </div>
  )
}

export default AgentPlaygroung