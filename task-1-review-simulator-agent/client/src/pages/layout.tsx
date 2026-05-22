import { Outlet } from "react-router-dom"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "./components/app-sidebar"

const Layout = () => {
  return (
    <SidebarProvider>
      <AppSidebar />
      {/* Main content */}
      <div className="w-full flex flex-col flex-1 min-w-0 overflow-hidden h-screen">
          <main className="p-4 w-full h-full">
            <Outlet />
          </main>
        </div>
    </SidebarProvider>
  )
}

export default Layout