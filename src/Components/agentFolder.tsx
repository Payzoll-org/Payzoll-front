import React, { useEffect, useState } from 'react';
import type { KeyboardEvent, ChangeEvent } from 'react';
import { Bot, Plus, Folder, MoreVertical, Edit3, Trash2 } from 'lucide-react';
import axios from "axios";

interface FolderType {
  id: string;
  name: string;
  createdAt: Date;
}

interface AgentFolderProps {
  folders: FolderType[];
  selectedFolderId: string;
  setSelectedFolderId: (id: string) => void;
  setFolders: React.Dispatch<React.SetStateAction<FolderType[]>>;
  onEditFolder: (folderId: string, newName: string) => void; // NEW PROP
  onDeleteFolder: (folderId: string) => void; // NEW PROP
}

const AgentFolder: React.FC<AgentFolderProps> = ({ folders, selectedFolderId,setSelectedFolderId, setFolders, onEditFolder, onDeleteFolder }) => {
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null); // For 3-dot menu
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [deleteTargetFolder, setDeleteTargetFolder] = useState<FolderType | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState<string>('');

  const folderToEdit = folders.find(f => f.id === editingId);





  useEffect(() => {
    const fetchFolders = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await axios.get("/api/folders");
        setFolders(res.data.folders || []);
      } catch (err: any) {
        console.error("Error fetching folders:", err);
        setError(err.response?.data?.message || "Failed to load folders");
      } finally {
        setLoading(false);
      }
    };

    fetchFolders();
  }, []);



  const createFolder = async (): Promise<void> => {
    if (!newFolderName.trim()) return;
  
    setLoading(true); // show loader
  
    try {
      // Step 1: Send request to backend
      const response = await axios.post("/api/folder/create", {
        name: newFolderName.trim(),
      });
  
      // Step 2: Extract folder data
      const folder = response.data.folder;
  
      // Step 3: Add folder to local state
      const newFolder: FolderType = {
        id: folder._id || Date.now().toString(),
        name: folder.name,
        createdAt: folder.createdAt ? new Date(folder.createdAt) : new Date(),
      };
  
      setFolders([...folders, newFolder]);
  
      // Step 4: Reset
      setNewFolderName("");
      setIsCreating(false);
      console.log("✅ Folder created successfully:", folder);
    } catch (error: any) {
      console.error("❌ Error creating folder:", error.response?.data || error.message);
      alert("Failed to create folder!");
    } finally {
      setLoading(false); // hide loader
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
      setLoading(true);
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
    } finally {
      setLoading(false);
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
      setLoading(true);
      await axios.delete(`/api/folder/delete/${deleteTargetFolder.id}`);
  
      console.log("🗑️ Folder deleted successfully");
  
      // Update UI after delete
      onDeleteFolder(deleteTargetFolder.id);
      closeDeleteModal();
    } catch (error: any) {
      console.error("❌ Error deleting folder:", error.response?.data || error.message);
      alert("Failed to delete folder!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='h-full px-3 py-5 w-full dark:bg-gray-900'>
      {/* Header */}
      <div
        className="bg-gray-100 dark:bg-gray-800 flex items-center gap-2 py-2 px-2 rounded-sm 
            hover:bg-gray-200 dark:hover:bg-gray-700 
            transition-colors cursor-pointer"
            onClick={() => setSelectedFolderId("1")}
          >
            <Bot className="text-lg text-gray-700 dark:text-gray-300" />
            <h1 className="text-gray-900 dark:text-white font-medium">All Agents</h1>
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
    <div
      className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      onClick={cancelCreation}
    />

    {/* Modal */}
    <div className="relative bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-5 py-4 w-full max-w-md shadow-xl z-10 transition-all">
      <h1 className=' text-medium'>Enter folder's name</h1>
      <h1 className='text-sm text-gray-500 mb-4'>numbers should be more then three letters !!</h1>
      <div className="flex items-center gap-3 mb-3">
        <Folder size={25} className="text-black dark:text-white" />
        <input
          type="text"
          value={newFolderName}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setNewFolderName(e.target.value)
          }
          onKeyDown={handleKeyPress}
          placeholder="Enter folder name..."
          className="flex-1 text-sm border-b border-black dark:bg-gray-800  dark:border-gray-700  py-1 focus:outline-none focus:ring-0 text-black dark:text-white placeholder-gray-400"
          autoFocus
        />
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={cancelCreation}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors disabled:opacity-50"
        >
   
          Cancel
        </button>

        <button
          onClick={createFolder}
          disabled={newFolderName.trim().length < 3 || loading}
          className="flex items-center gap-2 px-3 py-1 text-sm bg-black text-white rounded hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <svg
              className="animate-spin h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          ) : (
            ""
          )}
          {loading ? "Creating..." : "Create"}
        </button>
      </div>
    </div>
  </div>
)}
{/* Edit Folder Modal */}

{editingId && (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    {/* Background overlay */}
    <div
      className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      onClick={cancelCreation}
    />

    {/* Modal */}
    <div className="relative bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-5 w-full max-w-md shadow-2xl z-10 transition-all">
      {/* Header */}
      <h1 className="text-lg font-medium text-gray-900 dark:text-gray-100">
        Edit Folder Name
      </h1>
      <p className="text-sm text-gray-500 mb-4">
        Folder name must be at least <span className="font-semibold">3 characters</span>.
      </p>

      {/* Input */}
      <div className="flex items-center gap-3 mb-5">
        <Edit3 size={22} className="text-black dark:text-white" />
        <input
          type="text"
          value={editingName}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setEditingName(e.target.value)
          }
          onKeyDown={handleEditKeyPress}
          placeholder="New folder name..."
          className={`flex-1 text-sm border-b py-1 bg-transparent focus:outline-none focus:ring-0 text-black dark:text-white placeholder-gray-400 
            ${editingName.trim().length > 0 && editingName.trim().length < 3 
              ? "border-red-500" 
              : "border-black dark:border-gray-700"
            }`}
          autoFocus
        />
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={cancelEdit}
          disabled={loading}
          className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          onClick={saveEdit}
          disabled={
            editingName.trim().length < 3 || 
            editingName.trim() === folderToEdit?.name.trim() || 
            loading
          }
          className="flex items-center gap-2 px-3 py-1 text-sm bg-black text-white rounded hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading && (
            <svg
              className="animate-spin h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          )}
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  </div>
)}

{/* Delete Folder Modal */}
{isDeleteModalOpen && deleteTargetFolder && (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    {/* Blurry background */}
    <div
      className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      onClick={closeDeleteModal}
    />

    {/* Modal */}
    <div className="relative bg-white dark:bg-gray-900 border border-red-300 dark:border-red-800 rounded-md px-6 py-5 w-full max-w-lg shadow-xl z-10 transition-all">
      
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Trash2 size={22} className="text-red-600 dark:text-red-400" />
        <h1 className="text-lg font-medium text-red-700 dark:text-red-300">
          Delete Folder
        </h1>
      </div>

      {/* Warning Text */}
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
        You are about to delete the folder 
        <span className="font-medium text-red-600 text-sm dark:text-red-400"> "{deleteTargetFolder.name}"</span>.
        <br />
        <span className="text-red-600 dark:text-red-400 text-sm font-medium">
          All agents inside this folder will also be permanently deleted.
        </span>
      </p>

      {/* Confirmation Instruction */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        To confirm deletion, type the folder name below:
      </p>

      {/* Input Field */}
      <input
        type="text"
        value={deleteConfirmInput}
        onChange={e => setDeleteConfirmInput(e.target.value)}
        placeholder={`Type "${deleteTargetFolder.name}" to confirm`}
        className="w-full text-sm bg-white dark:bg-gray-800 border-b border-black dark:border-gray-700  py-2 outline-none   text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 mb-5"
        autoFocus
      />

      {/* Buttons */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={closeDeleteModal}
          disabled={loading}
          className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          onClick={confirmDelete}
          disabled={deleteConfirmInput !== deleteTargetFolder.name || loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <svg
              className="animate-spin h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          ) : (
            <Trash2 size={14} />
          )}
          {loading ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  </div>
)}


      {/* Folders List */}
      <div className="mt-5 space-y-2">
  {folders.map((folder) => (
    <div
      key={folder.id}
      className={`relative bg-gray-50 dark:bg-gray-800 flex items-center gap-2 py-2 px-2 rounded-sm 
        hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer group 
        ${selectedFolderId === folder.id ? '' : ''}`}
      onClick={() => setSelectedFolderId(folder.id)}
      onMouseLeave={() => {
        // Close the menu when leaving the folder & its dropdown
        if (menuOpenId === folder.id) setMenuOpenId(null);
      }}
    >
      <Folder size={16} className="text-gray-600 dark:text-gray-400" />
      <h1 className="text-sm text-gray-900 dark:text-white flex-1">{folder.name}</h1>
      <div className="text-xs text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
        {folder.createdAt.toLocaleDateString()}
      </div>

      {/* 3-dot menu button */}
      <div className="relative">
        <button
          className="ml-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpenId(menuOpenId === folder.id ? null : folder.id);
          }}
          tabIndex={-1}
        >
          <MoreVertical size={16} className="text-gray-500 dark:text-gray-400" />
        </button>

        {/* Dropdown menu */}
        {menuOpenId === folder.id && (
          <div
            className="absolute right-0 z-20 mt-2 w-28 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg"
            onMouseLeave={() => setMenuOpenId(null)} // hide when leaving the menu
            onClick={(e) => e.stopPropagation()} // prevent folder click
          >
            <button
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => {
                setMenuOpenId(null);
                startEditing(folder);
              }}
            >
              <Edit3 size={14} className="inline mr-2" /> Edit
            </button>
            <button
              className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700"
              onClick={() => {
                setMenuOpenId(null);
                openDeleteModal(folder);
              }}
            >
              <Trash2 size={14} className="inline mr-2" /> Delete
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
          {error && (
      <p className="text-red-500 mt-2 text-sm">{error}</p>
    )}
        </div>
      )}
    </div>
  );
};

export default AgentFolder;