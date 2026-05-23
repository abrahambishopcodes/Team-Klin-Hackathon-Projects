import { Outlet } from "react-router-dom"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "./components/app-sidebar"

const Layout = () => {
  return (
    <SidebarProvider>
      <AppSidebar />
      {/* Main content */}
      <main className="w-full flex flex-col flex-1 min-w-0 overflow-hidden min-h-screen lg:h-screen">
        <div className="p-4 w-full h-full">
          <SidebarTrigger className="" />
          <Outlet />
        </div>
      </main>
    </SidebarProvider>
  )
}

export default Layout