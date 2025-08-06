import SideBar from "../Components/SideBar"
import KnowledgeMenu from "../Components/KnowledgeMenu";
import KnowledgeFolder from "../Components/KnowledgeFolder";




const MainPageLayout = () => {
  
  

  return (
    <div className="h-screen overflow-hidden flex py-4 pr-4 w-screen bg-gray-100">
      <div className=" w-80 px-5 h-full">
         <SideBar />
      </div>
      <div className="flex gap-2 w-full">
        <div className="bg-white overflow-hidden rounded-sm w-100 h-full">
          <KnowledgeFolder />
        </div>
        <div className="bg-white rounded-sm w-full h-full">
          <KnowledgeMenu />
        </div>
      </div>
    </div>
  )
}

export default MainPageLayout