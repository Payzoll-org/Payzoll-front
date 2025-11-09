import React, { useState } from 'react';
import type { KeyboardEvent, ChangeEvent, MouseEvent } from 'react';
import { Bot, Plus, Folder, X, Check, MoreVertical, Edit3, Trash2 } from 'lucide-react';
import axios from "axios";

interface FolderType {
  id: string;
  name: string;
  createdAt: Date;
}

interface AgentFolderProps {
  folders: FolderType[];
  selectedFolderId: string;
  onSelectFolder: (folderId: string) => void;
  onAddFolder: (name: string) => void;
  onEditFolder: (folderId: string, newName: string) => void; // NEW PROP
  onDeleteFolder: (folderId: string) => void; // NEW PROP
}

const AgentFolder: React.FC<AgentFolderProps> = ({ folders, selectedFolderId, onSelectFolder, onAddFolder, onEditFolder, onDeleteFolder }) => {
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null); // For 3-dot menu
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [deleteTargetFolder, setDeleteTargetFolder] = useState<FolderType | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState<string>('');


  const createFolder = async (): Promise<void> => {
    if (!newFolderName.trim()) return;
  
    try {
      const response = await axios.post("/api/folder/create", {
        name: newFolderName.trim(),
      });
  
      // Handle success
      console.log("✅ Folder created:", response.data);
      onAddFolder(response.data); // Optionally add it to your UI
      setNewFolderName("");
      setIsCreating(false);
    } catch (error: any) {
      console.error("❌ Error creating folder:", error.response?.data || error.message);
      alert("Failed to create folder!");
    }
  };

  const cancelCreation = (): void => {
    setNewFolderName('');
    setIsCreating(false);
  };

  const startEditing = (folder: FolderType): void => {
    setEditingId(folder.id);
    setEditingName(folder.name);
  };

  const saveEdit = async (): Promise<void> => {
    if (!editingId || !editingName.trim()) return;
  
    try {
      const response = await axios.put(
        `/api/folder/update/${editingId}`,
        { name: editingName.trim() }
      );
  
      console.log("✅ Folder updated:", response.data);
  
      // Update UI
      onEditFolder(editingId, editingName.trim());
      setEditingId(null);
      setEditingName("");
    } catch (error: any) {
      console.error("❌ Error updating folder:", error.response?.data || error.message);
      alert("Failed to update folder name!");
    }
  };

  const cancelEdit = (): void => {
    setEditingId(null);
    setEditingName('');
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      createFolder();
    } else if (e.key === 'Escape') {
      cancelCreation();
    }
  };

  const handleEditKeyPress = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  const openDeleteModal = (folder: FolderType): void => {
    setDeleteTargetFolder(folder);
    setDeleteConfirmInput('');
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = (): void => {
    setIsDeleteModalOpen(false);
    setDeleteTargetFolder(null);
    setDeleteConfirmInput('');
  };

  const confirmDelete = async (): Promise<void> => {
    if (!deleteTargetFolder) return;
  
    try {
      await axios.delete(`/api/folder/delete/${deleteTargetFolder.id}`);
  
      console.log("🗑️ Folder deleted successfully");
  
      // Update UI after delete
      onDeleteFolder(deleteTargetFolder.id);
      closeDeleteModal();
    } catch (error: any) {
      console.error("❌ Error deleting folder:", error.response?.data || error.message);
      alert("Failed to delete folder!");
    }
  };

  return (
    <div className='h-full px-3 py-5 w-full dark:bg-gray-900'>
      {/* Header */}
      <div className='bg-gray-100 dark:bg-gray-800 flex items-center gap-2 py-2 px-2 rounded-sm'>
        <Bot className='text-lg text-gray-700 dark:text-gray-300'/>
        <h1 className='text-gray-900 dark:text-white font-medium'>All Agents</h1>
      </div>

      {/* Folders Section Header */}
      <div className='mt-4 flex text-md items-center justify-between px-2'>
        <h1 className='text-gray-500 dark:text-gray-400 font-medium text-sm'>FOLDERS</h1>
        <button
          onClick={() => setIsCreating(true)}
          className='text-xl text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800'
          disabled={isCreating}
        >
          <Plus size={20}/>
        </button>
      </div>

      {/* Create Folder Input */}
     {isCreating && (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    {/* Blurry background */}
    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={cancelCreation} />
    {/* Modal */}
    <div className="relative bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-sm p-5 w-full max-w-md shadow-lg z-10">
      <div className="flex items-center gap-2 mb-4">
        <Folder size={16} className="text-blue-600 dark:text-blue-400" />
        <input
          type="text"
          value={newFolderName}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setNewFolderName(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Enter folder name..."
          className="flex-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          autoFocus
        />
      </div>
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={cancelCreation}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        >
          <X size={14} />
          Cancel
        </button>
        <button
          onClick={createFolder}
          disabled={!newFolderName.trim()}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Check size={14} />
          Create
        </button>
      </div>
    </div>
  </div>
)}

{/* Edit Folder Modal */}
{editingId && (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={cancelEdit} />
    <div className="relative bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-sm p-5 w-full max-w-md shadow-lg z-10">
      <div className="flex items-center gap-2 mb-4">
        <Edit3 size={16} className="text-blue-600 dark:text-blue-400" />
        <input
          type="text"
          value={editingName}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setEditingName(e.target.value)}
          onKeyDown={handleEditKeyPress}
          placeholder="Edit folder name..."
          className="flex-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          autoFocus
        />
      </div>
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={cancelEdit}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        >
          <X size={14} />
          Cancel
        </button>
        <button
          onClick={saveEdit}
          disabled={!editingName.trim()}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Check size={14} />
          Save
        </button>
      </div>
    </div>
  </div>
)}

{/* Delete Folder Modal */}
{isDeleteModalOpen && deleteTargetFolder && (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={closeDeleteModal} />
    <div className="relative bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800 rounded-sm p-5 w-full max-w-md shadow-lg z-10">
      <div className="flex items-center gap-2 mb-4">
        <Trash2 size={20} className="text-red-600 dark:text-red-400" />
        <span className="text-red-700 dark:text-red-300 font-semibold">Delete Folder</span>
      </div>
      <p className="text-gray-700 dark:text-gray-300 mb-2 text-sm">To confirm deletion, type <span className="font-bold">{deleteTargetFolder.name}</span> below:</p>
      <input
        type="text"
        value={deleteConfirmInput}
        onChange={e => setDeleteConfirmInput(e.target.value)}
        placeholder={`Type "${deleteTargetFolder.name}" to confirm`}
        className="w-full text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 mb-4"
        autoFocus
      />
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={closeDeleteModal}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        >
          <X size={14} />
          Cancel
        </button>
        <button
          onClick={confirmDelete}
          disabled={deleteConfirmInput !== deleteTargetFolder.name}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>
    </div>
  </div>
)}

      {/* Folders List */}
      <div className='mt-5 space-y-2'>
        {folders.map((folder) => (
          <div 
            key={folder.id}
            className={`bg-gray-50 dark:bg-gray-800 flex items-center gap-2 py-2 px-2 rounded-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer group relative ${selectedFolderId === folder.id ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => onSelectFolder(folder.id)}
          >
            <Folder size={16} className='text-gray-600 dark:text-gray-400'/>
            <h1 className='text-sm text-gray-900 dark:text-white flex-1'>{folder.name}</h1>
            <div className='text-xs text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity'>
              {folder.createdAt.toLocaleDateString()}
            </div>
            {/* 3-dot menu button */}
            <div className="relative">
              <button
                className="ml-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === folder.id ? null : folder.id); }}
                tabIndex={-1}
              >
                <MoreVertical size={16} className="text-gray-500 dark:text-gray-400" />
              </button>
              {/* Dropdown menu */}
              {menuOpenId === folder.id && (
                <div className="absolute right-0 z-10 mt-2 w-28 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg py-1">
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={e => { e.stopPropagation(); setMenuOpenId(null); startEditing(folder); }}
                  >
                    <Edit3 size={14} className="inline mr-2" />Edit
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700"
                    onClick={e => { e.stopPropagation(); setMenuOpenId(null); openDeleteModal(folder); }}
                  >
                    <Trash2 size={14} className="inline mr-2" />Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {folders.length === 0 && !isCreating && (
        <div className='mt-10 text-center py-8'>
          <Folder size={48} className='mx-auto text-gray-300 dark:text-gray-600 mb-3'/>
          <p className='text-gray-500 dark:text-gray-400 text-sm mb-2'>No custom folders yet</p>
          <p className='text-gray-400 dark:text-gray-500 text-xs'>Click the + button to create your first folder</p>
        </div>
      )}
    </div>
  );
};

export default AgentFolder;