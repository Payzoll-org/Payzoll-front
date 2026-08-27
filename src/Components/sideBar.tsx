import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  User,
  Clock,
  BarChart3,
  Folder,
  FolderOpen,
  Settings,
  Search,
  LogOut
} from 'lucide-react';

import { IoNotificationsOutline } from "react-icons/io5";
import logo from "../assets/payzoll.png";
import { useAuthStore } from "../Zustand/userStore";
import { logoutUser } from "../services/authApi";
import HelpSupportModal from "./HelpSupportModal";
import KycRequiredModal from "./KycRequiredModal";


interface NavigationChild {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }> | null;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  isFolder: boolean;
  children?: NavigationChild[];
  route?: string;
  disabled?: boolean;
  disabledReason?: string;
  requiresKyc?: boolean;
}



interface ExpandedFolders {
  [key: string]: boolean;
}

const sideBAr: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const [expandedFolders, setExpandedFolders] = useState<ExpandedFolders>({
    history: false,
    agents: false
  });
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [kycModalOpen, setKycModalOpen] = useState(false);

  const toggleFolder = (folderName: string): void => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  };

  const handleLogout = async (): Promise<void> => {
    try {
      await logoutUser();
    } finally {
      navigate("/auth");
    }
  };

  // International Banking only opens once there's something real to show
  // there - a USD receiving account (account activated) and stablecoin
  // payments enabled, both real server-driven flags on the authenticated
  // user, not just a static "coming soon" like Invoices below.
  const internationalBankingReady = !!(user?.accountStatus === "activated" && user?.stablecoinEnabled);

  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: User,
      isFolder: false,
      route: '/dashboard',
    },
    {
      id: 'transactionshistory',
      label: 'Transaction History',
      icon: Clock,
      isFolder: false,
      route: '/transactionhistory',
      requiresKyc: true,
    },
     {
      id: 'international Banking',
      label: 'International Banking',
      icon: BarChart3,
      isFolder: false,
      route: internationalBankingReady ? '/international-banking' : undefined,
      disabled: !internationalBankingReady,
      disabledReason: 'Unlocks once your USD account and stablecoin payments are both active',
    },
    {
        id: 'invoices',
        label: 'Invoices',
        icon: Clock,
        isFolder: false,
        disabled: true,
        disabledReason: 'Coming soon',
      },

    {
        id: 'referandearn',
        label: 'Refer & Earn',
        icon: BarChart3,
        isFolder: false,
        disabled: true,
        disabledReason: 'Coming soon',
      },



      {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
        isFolder: false,
        route: '/settings',
      },
  ];

  const [localActiveItem, setLocalActiveItem] = useState<string>('');
  const routedActiveId = navigationItems.find((item) => item.route === location.pathname)?.id;
  const activeItem = routedActiveId ?? localActiveItem;

  const handleItemClick = (item: NavigationItem): void => {
    if (item.disabled) return;
    if (item.isFolder) {
      toggleFolder(item.id);
      return;
    }
    if (item.requiresKyc && !user?.kycVerified) {
      setKycModalOpen(true);
      return;
    }
    if (item.route) {
      navigate(item.route);
      return;
    }
    setLocalActiveItem(item.id);
  };



  return (
    <div className="relative h-full">
    <div>
        <div className=" pt-4 ">
          <div className="flex justify-between items-center space-x-3  mb-4">
            <div className='flex items-center  gap-2'>
              <div className='size-10 flex justify-center items-center rounded-md bg-gray-200 dark:bg-gray-700 overflow-hidden'>
                <img src={logo} alt="Payzoll logo" className='w-full h-full object-contain p-1.5' />
              </div>
              <div className='text-black dark:text-white'>
                <h4 className="text-black dark:text-white">{user?.name || "Loading..."}</h4>
               
              </div>
            </div>
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen((v) => !v)}
                className='text-black dark:text-white'
                aria-label="Profile menu"
              >
                {profileMenuOpen ? (
                  <ChevronUp className="text-black dark:text-white" size={18} />
                ) : (
                  <ChevronDown className="text-black dark:text-white" size={18} />
                )}
              </button>
              {profileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setProfileMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 min-w-[160px] z-20">
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        navigate("/settings");
                      }}
                      className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <Settings size={14} />
                      Settings
                    </button>
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <LogOut size={14} />
                      Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
    </div>

    

    <div className="flex-1  overflow-y-auto">
          <nav className="space-y-1">
            {navigationItems.map((item) => (
              <div key={item.id}>
                <button
                  onClick={() => handleItemClick(item)}
                  disabled={item.disabled}
                  title={item.disabled ? item.disabledReason : undefined}
                  className={`w-full flex items-center gap-3  py-1.5 rounded-sm pl-3 pr-3 text-left transition-all duration-200 group ${
                    item.disabled
                      ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                      : activeItem === item.id && !item.isFolder
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {item.isFolder ? (
                      expandedFolders[item.id] ? (
                        <FolderOpen className="text-blue-500" size={16} />
                      ) : (
                        <Folder size={15} />
                      )
                    ) : (
                      <item.icon size={18} />
                    )}
                    <span className="font-medium text-sm truncate">{item.label}</span>
                  </div>
                  {item.disabled ? (
                    <span className="text-xs text-gray-300 dark:text-gray-600 shrink-0">
                      {item.disabledReason === 'Coming soon' ? 'Coming soon' : 'Locked'}
                    </span>
                  ) : item.isFolder ? (
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${
                        expandedFolders[item.id] ? 'rotate-180' : ''
                      }`}
                    />
                  ) : null}
                </button>

                {/* Folder Children */}
                {item.isFolder && expandedFolders[item.id] && item.children && (
                  <div className=" mt-1 space-y-1">
                    {item.children.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => setLocalActiveItem(child.id)}
                        className={`w-full flex items-center gap-3 px-3 py-1 pl-10 rounded-sm text-left transition-all duration-200 ${
                          activeItem === child.id
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >
                        {child.icon && <child.icon size={16} />}
                        <span className="text-sm">{child.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>


         <div className={`text-sm   absolute bottom-25 `}>
            <div className="px-4 gap-5">
              <h1>Book a Demo</h1>

              <button
                onClick={() => setHelpModalOpen(true)}
                className="pt-4 text-left hover:text-blue-600 dark:hover:text-blue-400 transition-colors block"
              >
                Help and Support
              </button>
            </div>



        </div>



        {/* Bottom Section */}
        <div className="flex text-sm items-center gap-16 justify-between absolute bottom-5 left-0 right-0">

            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 shrink-0">
                <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </div>
              <div className='dark:text-white min-w-30'>
                <h2 className="text-xs font-medium text-gray-900 dark:text-gray-100 ">
                  User Profile
                </h2>
                <h2
                  className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate"
                  title={user?.name || undefined}
                >
                  {user?.name || "..."}
                </h2>
              </div>
            </div>


          <div className="flex gap-2 items-center shrink-0">

            <IoNotificationsOutline
              className="text-gray-700 text-lg hover:text-purple-600 dark:text-gray-300 dark:hover:text-purple-400 cursor-pointer transition-colors"
            />
            <button
              onClick={handleLogout}
              aria-label="Log out"
              title="Log out"
              className="text-gray-700 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400 transition-colors"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <HelpSupportModal open={helpModalOpen} onClose={() => setHelpModalOpen(false)} />
        <KycRequiredModal
          open={kycModalOpen}
          onCancel={() => setKycModalOpen(false)}
          onProceed={() => {
            setKycModalOpen(false);
            navigate("/kyc");
          }}
        />
    </div>
  )
}

export default sideBAr
