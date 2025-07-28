import { BiDotsHorizontalRounded } from "react-icons/bi";
import { LuFileInput } from "react-icons/lu";
import { MdOutlineHistory } from "react-icons/md";
import { IoChevronBackSharp } from "react-icons/io5";

const AgentPlagroundNavbar = () => {
  return (
    <div className="pb-3 flex items-center justify-between">
        <div>
            <div className="flex items-center gap-4">
                <div className="text-2xl">
                    <IoChevronBackSharp />
                </div>

                <div className="flex flex-col">
                    <h1>MulitiAgent</h1>
                    <div className="text-xs flex gap-3">
                        <p>Agent ID: ag...cf8</p>
                        <p>Retell LLM ID: ll...78e</p>
                        <p>$0.115/min</p>
                        <p>970-1300ms latency</p>
                        <p>10-110 tokens</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div className="flex  absolute  top-0 left-1/2 -translate-x-1/2">
            <h1 className="border-t-2 px-3 border-black py-2 ">Create</h1>
            <h1 className="py-2  px-3 border-black py-2 ">Simulation</h1>
        </div>

        <div className="flex items-center gap-3">
            <h1 className="text-sm">Auto saved at 21:03</h1>
            <div className="bg-white flex justify-center items-center size-9 rounded-md"><BiDotsHorizontalRounded /></div>
                <div className="bg-white flex justify-center items-center size-9 rounded-md"><MdOutlineHistory /></div>
                <div className="bg-black text-white flex gap-2 justify-center items-center px-3 py-1.5 rounded-md">
                    <LuFileInput />
                    <p>Publish</p>
                </div>
            </div>
        </div>
  )
}

export default AgentPlagroundNavbar