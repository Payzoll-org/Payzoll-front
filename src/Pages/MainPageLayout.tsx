import SideBar from "../Components/sideBar"
import AgentFolder from './../Components/agentFolder'
import AgentMenu from "../Components/agentMenu"
import { useState } from "react";

interface FolderType {
  id: string;
  name: string;
  createdAt: Date;
}

interface AgentType {
  id: string;
  name: string;
  folderId: string;
  // add more agent fields as needed
}

const MainPageLayout = () => {
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [agents, setAgents] = useState<AgentType[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('1');
  console.log(folders)
  // Add a new folder
  const addFolder = (name: string) => {
    const newFolder: FolderType = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name,
      createdAt: new Date()
    };
    setFolders([...folders, newFolder]);
  };

  // Select a folder
  const selectFolder = (folderId: string) => {
    setSelectedFolderId(folderId);
  };

  // Add a new agent to the selected folder
  const addAgent = (name: string) => {
    if (!selectedFolderId) return;
    const newAgent: AgentType = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name,
      folderId: selectedFolderId
    };
    setAgents([...agents, newAgent]);
  };

  // Filter agents by selected folder (show all if 'All Agents')
  const filteredAgents = selectedFolderId === '1'
    ? agents
    : agents.filter(agent => agent.folderId === selectedFolderId);

  // Edit a folder name
  const editFolder = (folderId: string, newName: string) => {
    setFolders(folders => folders.map(f => f.id === folderId ? { ...f, name: newName } : f));
  };

  // Delete a folder
  const deleteFolder = (folderId: string) => {
    setFolders(folders => folders.filter(f => f.id !== folderId));
    // Optionally, handle agents in deleted folder
    if (selectedFolderId === folderId) setSelectedFolderId('1');
  };

  return (
    <div className="h-screen overflow-hidden flex py-4 pr-4 w-screen bg-gray-100">
      <div className=" w-80 px-5 h-full">
        <SideBar />
      </div>
      <div className="flex gap-2 w-full">
        <div className="bg-white rounded-sm w-100 h-full">
          <AgentFolder
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={selectFolder}
            onAddFolder={addFolder}
            onEditFolder={editFolder}
            onDeleteFolder={deleteFolder}
          />
        </div>
        <div className="bg-white rounded-sm w-full h-full">
          <AgentMenu
            agents={filteredAgents}
            onAddAgent={addAgent}
            selectedFolderId={selectedFolderId}
            folders={folders}
          />
        </div>
      </div>
    </div>
  )
}

export default MainPageLayout