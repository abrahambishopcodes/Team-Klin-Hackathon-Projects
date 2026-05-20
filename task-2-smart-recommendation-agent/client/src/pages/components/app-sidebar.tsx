import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from "@/components/ui/sidebar"

// import { Button } from "@/components/ui/button"

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-8">
        <div className="flex items-center gap-3">
          <div className="flex aspect-square size-11 items-center justify-center overflow-hidden rounded-xl ring-1 ring-sidebar-border shadow-md">
            <img 
              src="/reco_logo.svg" 
              alt="Reco AI" 
              className="size-16 scale-150" 
            />
          </div>
          <div className="flex flex-col">
            <h2 className="text-xl font-black tracking-tight text-primary-bold leading-none">RECO AI</h2>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/80 font-bold mt-1">Smart Assistant</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup />
        <SidebarGroup />
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  )
}