import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Plus, RotateCw, Settings } from "lucide-react";

import { Loader } from "@/components/ui/loader";
import { type DemoUser } from "@/types";
import { getAllDemoUsers } from "@/api/index.api";
import { useQuery } from "@tanstack/react-query";
import { CircleUserIcon } from "lucide-react";

export function AppSidebar() {

  const {data: demoUsers, isLoading} = useQuery({
    queryKey: ["all-demo-users"],
    queryFn: getAllDemoUsers,
    select: (data) => data.data as DemoUser[],
  })

  console.log("demo users", demoUsers)

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
            <h2 className="text-xl font-black tracking-tight text-primary-bold leading-none">
              RECO AI
            </h2>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/80 font-bold mt-1">
              Smart Assistant
            </p>
          </div>
        </div>

        <Button className="button mt-4 h-10">
          <Plus className="size-5" />
          New Search
        </Button>
        <Button variant="outline" className="button mt-1 h-10 bg-transparent">
          <RotateCw className="size-5" />
          Cold Start
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-bold text-sm uppercase mb-4">DEMO CONTEXT</SidebarGroupLabel>
          <div className="flex flex-col gap-2 px-4">
          {
            isLoading ? <Loader className="mt-4" size={26} /> : (
              demoUsers?.map((demoUser, index) => (
                <SidebarMenuItem className="flex items-center gap-2" key={demoUser.id} >
                  <img src={demoUser.avatarUrl} alt={demoUser.user_name} className="size-5 rounded-full" />
                  <span className="truncate">{demoUser.user_name}</span>
                </SidebarMenuItem>
              ))
            )
          }
          </div>
        </SidebarGroup>
      </SidebarContent>
        <SidebarFooter className="p-2 mb-4 ml-2">
          <SidebarMenuItem className="flex items-center gap-2">
            <Settings />
            Settings
          </SidebarMenuItem>
        </SidebarFooter>
    </Sidebar>
  );
}
