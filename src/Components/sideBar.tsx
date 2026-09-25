import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  User,
  Clock,
  BarChart3,
  Folder,
  FolderOpen,
  Settings,
  LogOut
} from 'lucide-react';

import { getCalApi } from '@calcom/embed-react';


import toast from "react-hot-toast";
import logo from "../assets/cta-coin.webp";
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

  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [kycModalOpen, setKycModalOpen] = useState(false);

  // Initialise Cal.com embed – runs once on mount
  useEffect(() => {
    (async function () {
      const cal = await getCalApi({ namespace: "payzoll-booking" });
      cal("ui", {
        theme: "light",
        styles: { branding: { brandColor: "#ab823f" } },
        hideEventTypeDetails: false,
        layout: "month_view",
      });
    })();
  }, []);

  const toggleFolder = (folderName: string): void => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  };

  const handleLogout = async (): Promise<void> => {
    try {
      await logoutUser();
    } catch {
      // Local session is cleared either way (see authApi.ts) - this is
      // just letting the user know the server-side session might still be
      // considered active until it expires naturally.
      toast.error("Logged out here, but couldn't reach the server to end the session remotely.");
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
      route: '/refer',
      requiresKyc: true,
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
              <div className='size-9 flex justify-center items-center overflow-hidden'>
                <img src={logo} alt="Payzoll logo" className='w-full h-full object-contain' />
              </div>
              <div className='text-black dark:text-white'>
                <h4 className="text-black dark:text-white">{user?.name || "Loading..."}</h4>

              </div>
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
                className={`w-full flex items-center gap-3  py-1.5 rounded-sm pl-3 pr-3 text-left transition-all duration-200 group ${item.disabled
                  ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : activeItem === item.id && !item.isFolder
                    ? 'bg-arc-gold-50 dark:bg-arc-gold-900/20 text-arc-gold-600 dark:text-arc-gold-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {item.isFolder ? (
                    expandedFolders[item.id] ? (
                      <FolderOpen className="text-arc-gold-500" size={16} />
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
                    className={`transition-transform duration-200 ${expandedFolders[item.id] ? 'rotate-180' : ''
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
                      className={`w-full flex items-center gap-3 px-3 py-1 pl-10 rounded-sm text-left transition-all duration-200 ${activeItem === child.id
                        ? 'bg-arc-gold-50 dark:bg-arc-gold-900/20 text-arc-gold-600 dark:text-arc-gold-400'
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


      {/* Bottom Section */}
      <div className="absolute bottom-5 left-0 right-0 px-3 space-y-1">
        <button
          data-cal-link="payzoll/30min"
          data-cal-namespace="payzoll-booking"
          data-cal-config={JSON.stringify({
            layout: "month_view",
            theme: "light",
            ...(user?.name ? { name: user.name } : {}),
            ...(user?.email ? { email: user.email } : {}),
          })}
          className="w-full flex items-center gap-3 py-1.5 px-3 rounded-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
        >
          <span className="font-medium text-sm">Book a Demo</span>
        </button>

        <button
          onClick={() => setHelpModalOpen(true)}
          className="w-full flex items-center gap-3 py-1.5 px-3 rounded-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
        >
          <span className="font-medium text-sm">Help and Support</span>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 py-1.5 px-3 rounded-sm text-left text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
        >
          <LogOut size={18} />
          <span className="font-medium text-sm">Log out</span>
        </button>
      </div>

      <HelpSupportModal open={helpModalOpen} onClose={() => setHelpModalOpen(false)} />
      <KycRequiredModal
        open={kycModalOpen}
        underReview={user?.accountStatus === "verifying"}
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
