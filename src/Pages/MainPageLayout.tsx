import SideBar from "../Components/SideBar"
import AgentFolder from './../Components/agentFolder'
import AgentMenu from "../Components/agentMenu"
import { useState, useEffect } from "react";
import { AgentManagementApi } from "../services/agentManagementApi";

interface FolderType {
  id: string;
  name: string;
  createdAt: Date;
}

interface AgentType {
  id: string;
  name: string;
  category: string;
  voice: string;
  folderId: string;
  createdAt: Date;
  // add more agent fields as needed
}

const MainPageLayout = () => {
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [agents, setAgents] = useState<AgentType[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('1');

  // Fetch agents on component mount
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await AgentManagementApi.getAgentsByUser();
        if (response.success && response.agents) {
          // Transform the API response to match AgentType interface
          const fetchedAgents: AgentType[] = response.agents.map((agent: any) => ({
            id: agent._id,
            name: agent.name,
            category: agent.category,
            voice: agent.voice,
            folderId: agent.folderId || '1', // Default to 'All Agents' if no folder
            createdAt: new Date(agent.createdAt)
          }));
          setAgents(fetchedAgents);
        }
      } catch (error) {
        console.error("Error fetching agents:", error);
      }
    };

    fetchAgents();
  }, []);


  // Add a new agent to the selected folder
  const addAgent = (id: string, name: string, category: string, voice: string,) => {
    if (!selectedFolderId) return;
    const newAgent: AgentType = {
      id: id,
      name,
      category,
      voice,
      folderId: selectedFolderId,
      createdAt: new Date()
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
            setFolders={setFolders}
            selectedFolderId={selectedFolderId}
            setSelectedFolderId={setSelectedFolderId}
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