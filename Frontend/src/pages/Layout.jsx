import React, { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'
import { X, Menu } from 'lucide-react'
import Sidebar from '../components/SideBar'
import { SignIn, useUser } from '@clerk/clerk-react'

const Layout = () => {

    const navigate = useNavigate()
    const [sidebar, setSidebar] = useState(false)
    const { user } = useUser()

    return user ? (
        <div className="flex flex-col h-screen">
            <nav className="w-full px-8 min-h-14 flex items-center justify-between border-b border-gray-200">
                <img
                    src={assets.logo}
                    alt="Logo"
                    onClick={() => navigate('/')}
                    className="w-15 cursor-pointer"
                />
                {
                    sidebar ? (
                        <X
                            onClick={() => setSidebar(false)}
                            className="w-6 h-6 text-gray-600 sm:hidden cursor-pointer"
                        />
                    ) : (
                        <Menu
                            onClick={() => setSidebar(true)}
                            className="w-6 h-6 text-gray-600 sm:hidden cursor-pointer"
                        />
                    )
                }
            </nav>

            <div className="flex flex-1 w-full">
                <Sidebar
                    sidebar={sidebar}
                    setSidebar={setSidebar}
                />
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    ) : (
        <div className="flex items-center justify-center h-screen">
            <SignIn />
        </div>
    )
}

export default Layout