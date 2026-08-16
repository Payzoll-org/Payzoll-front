import SideBar from "./../Components/sideBar"
import KycBanner from "../Components/KycBanner"
import StablecoinBanner from "../Components/StablecoinBanner"


const MainPageLayout = () => {

  return (
    <div className="h-screen overflow-hidden flex flex-col w-screen bg-gray-100">
      <KycBanner />
      <StablecoinBanner />
      <div className="flex flex-1 overflow-hidden py-4 pr-4">
        <div className=" w-80 px-5 h-full">
          <SideBar />
        </div>
        <div className="flex gap-2 w-full">

          <div className="bg-white rounded-sm w-full h-full">

          </div>
        </div>
      </div>
    </div>
  )
}

export default MainPageLayout
