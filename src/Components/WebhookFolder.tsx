import React, { useState } from 'react';
import type { KeyboardEvent, ChangeEvent, MouseEvent } from 'react';
import { Bot, Plus, Folder, X, Check, MoreVertical, Edit3, Trash2 } from 'lucide-react';


const WebhookFolder = () => {
  return (
    <div className="h-full px-3 py-3 w-full bg-white dark:bg-gray-900">

    
    <div className="bg-gray-100 dark:bg-gray-800 flex items-center gap-2 py-2 px-2 rounded-sm">
      <span className="text-lg text-gray-700 dark:text-gray-300">🤖</span>
      <h1 className="text-gray-900 dark:text-white font-medium">Webhooks</h1>
    </div>
  

    <div className="mt-4 flex items-center justify-between px-2">
      <h1 className="text-gray-500 dark:text-gray-400 font-medium text-sm">FOLDERS</h1>
      <button className="text-xl text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
        ➕
      </button>
    </div>
  
  
    <div className="mt-5 space-y-2">
      <div className="bg-gray-50 dark:bg-gray-800 flex items-center gap-2 py-1 px-3 rounded-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer group relative ">
        <span className="text-gray-600 dark:text-gray-400">📂</span>
        <h1 className="text-sm text-gray-900 dark:text-white flex-1">Folder Name</h1>
        <div className="text-xs text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
          31/07/2025
        </div>
        <div className="relative">
          <button className="ml-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
            ⋮
          </button>
          <div className="absolute right-0 z-10 mt-2 w-28 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg py-1 hidden group-hover:block">
            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">✏️ Edit</button>
            <button className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700">🗑️ Delete</button>
          </div>
        </div>
      </div>   
    </div>
  

    <div className="mt-10 text-center py-8">
      <div className="mx-auto text-gray-300 dark:text-gray-600 mb-3 text-5xl">📁</div>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">No custom folders yet</p>
      <p className="text-gray-400 dark:text-gray-500 text-xs">Click the + button to create your first folder</p>
    </div>
  
  </div>
  )
}

export default WebhookFolder