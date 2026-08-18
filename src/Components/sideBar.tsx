import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Lock,
  ChevronDown,
  ChevronUp,
  User,
  Clock,
  BarChart3,
  MessageCircle,
  Phone,
  Folder,
  FolderOpen,
  Settings,
  Search
} from 'lucide-react';

import { IoNotificationsOutline } from "react-icons/io5";


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
}



interface ExpandedFolders {
  [key: string]: boolean;
}

const sideBAr: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedFolders, setExpandedFolders] = useState<ExpandedFolders>({
    history: false,
    agents: false
  });

  const toggleFolder = (folderName: string): void => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  };

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
    },
     {
      id: 'international Banking',
      label: 'International Banking',
      icon: BarChart3,
      isFolder: false
    },
    {
        id: 'invoices',
        label: 'Invoices',
        icon: Clock,
        isFolder: true,
        children: [
          { id: 'create-invoice', label: 'Create Invoice', icon: MessageCircle },
          { id: 'draft-invoices', label: 'Draft Invoices', icon: Phone }
        ]
      },
   
    {
        id: 'referandearn',
        label: 'Refer & Earn',
        icon: BarChart3,
        isFolder: false
      },

    
      
      {
        id: 'setting',
        label: 'Setting',
        icon: Settings,
        isFolder: false
      },
  ];

  const [localActiveItem, setLocalActiveItem] = useState<string>('');
  const routedActiveId = navigationItems.find((item) => item.route === location.pathname)?.id;
  const activeItem = routedActiveId ?? localActiveItem;

  const handleItemClick = (item: NavigationItem): void => {
    if (item.isFolder) {
      toggleFolder(item.id);
      return;
    }
    if (item.route) {
      navigate(item.route);
      return;
    }
    setLocalActiveItem(item.id);
  };



  return (
    <>
    <div>
        <div className=" pt-4 ">
          <div className="flex justify-between items-center space-x-3  mb-4">
            <div className='flex items-center  gap-2'>
              <div className='size-10 flex justify-center items-center rounded-md bg-gray-200 dark:bg-gray-700'>
                <Lock className='text-gray-600 dark:text-gray-300 font-bold' size={20}/>
              </div>
              <div className='text-black dark:text-white'>
                <h4 className="text-black dark:text-white">Manjeet Sharma</h4>
                <p className='text-xs text-gray-600 dark:text-gray-400'>Standard plan</p>
              </div>
            </div>
            <div className='text-black dark:text-white'>
              <ChevronUp className="text-black dark:text-white" size={18}/>
              <ChevronDown className="text-black dark:text-white" size={18}/>
            </div>
          </div>
        </div>
    </div>

    <div className="mb-4  flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-1.5 w-full max-w-sm focus-within:ring-2 focus-within:ring-gray-500 transition-colors">
        <Search className="text-gray-600 dark:text-gray-400" size={20} />
            <input
            type="text"
            placeholder="Search…"
            className="bg-transparent outline-none w-full placeholder:text-gray-500 dark:placeholder:text-gray-400 text-gray-900 dark:text-gray-100"
        />
    </div>

    <div className="flex-1  overflow-y-auto">
          <nav className="space-y-1">
            {navigationItems.map((item) => (
              <div key={item.id}>
                <button
                  onClick={() => handleItemClick(item)}
                  className={`w-full flex items-center gap-3  py-1.5 rounded-sm pl-3 pr-1 text-left transition-all duration-200 group ${
                    activeItem === item.id && !item.isFolder
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {item.isFolder ? (
                      expandedFolders[item.id] ? (
                        <FolderOpen className="text-blue-500" size={16} />
                      ) : (
                        <Folder size={15} />
                      )
                    ) : (
                      <item.icon size={18} />
                    )}
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                  {item.isFolder && (
                    <ChevronDown 
                      size={14}
                      className={`transition-transform duration-200 ${
                        expandedFolders[item.id] ? 'rotate-180' : ''
                      }`} 
                    />
                  )}
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

              <h1 className='pt-4'>Help and Support</h1>
            </div>

       

        
        </div>



        {/* Bottom Section */}
        <div className={`flex text-sm  items-center gap-16 justify-between absolute bottom-5 `}>
        
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </div>
              <div className='dark:text-white'>
                <h2 className="text-xs font-medium text-gray-900 dark:text-gray-100">
                  User Profile
                </h2>
                <h2 className="text-xs font-medium text-gray-900 dark:text-gray-100">
                  Manjeet
                </h2>
              </div>
            </div>
       

          <div className={`flex gap-2 items-center`}>
           
            <IoNotificationsOutline
              className="text-gray-700 text-lg hover:text-purple-600 dark:text-gray-300 dark:hover:text-purple-400 cursor-pointer transition-colors"
            />
          </div>
        </div>
        
    
    </>
  )
}

export default sideBAr