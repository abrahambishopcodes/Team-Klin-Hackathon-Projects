import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-8">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <h2 className="text-2xl font-black tracking-tight text-primary-bold leading-none">
              REUVE
            </h2>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/80 font-bold mt-1">
              Review Simulator Agent
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-bold text-sm uppercase mb-4">
            DEMO CONTEXT
          </SidebarGroupLabel>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
