import { RxCross2 } from "react-icons/rx";
import { Search } from 'lucide-react';


const AgentHistory = () => {
  return (
    <div>

        <div className="flex items-center border-b  py-4 justify-between">
          <h1>History</h1>
          <RxCross2 className="text-lg"/>
        </div>
        <div className="flex items-center gap-2 mt-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-1.5 w-full max-w-sm focus-within:ring-2 focus-within:ring-gray-500 transition-colors">
            <Search className="text-gray-600 dark:text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search…"
              className="bg-transparent outline-none w-full placeholder:text-gray-500 dark:placeholder:text-gray-400 text-gray-900 dark:text-gray-100"
              // Implement search if needed
            />
          </div>
    </div>
  )
}

export default AgentHistory