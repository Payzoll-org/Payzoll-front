import { ChevronDown, Search, X, MessageSquare, Mic, ArrowRight, Plus } from 'lucide-react';
import type { ChangeEvent, KeyboardEvent } from 'react';


const KnowledgeMenu = () => {
  return (
    <div className="px-5">
      <div className='flex items-center py-4 justify-between w-full'>
        <div>
          <h3>Knowledge</h3>
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
        </div>
      </div>

      <div className='w-full flex justify-between px-4 py-3 bg-gray-100 border-b text-sm rounded-tl-lg mt-1'>
        <h1>Agent Name</h1>
        <h1>Type</h1>
        <h1>Created</h1>
        {/* Add more columns as needed */}
      </div>



    </div>
  )
}

export default KnowledgeMenu