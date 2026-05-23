import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useReviewsStore } from "@/hooks/useReviewsStore";
import type { ReviewFormValues } from "./add-review-dialog";
import { useLocation, useNavigate } from "react-router-dom";

type DemoUser = {
  id: string
  name: string
  summary: string
  reviews: ReviewFormValues[]
}

const demoUsers: DemoUser[] = [
  {
    id: "adaeze",
    name: "Adaeze",
    summary: "Balanced beauty reviewer who cares about ingredients, texture, and value.",
    reviews: [
      {
        item: "CeraVe Moisturizing Cream",
        category: "Beauty",
        stars: 5,
        text: "This cream worked better than I expected. It is thick but it does not sit heavily on my skin and my face stayed soft all day. No fragrance, no drama, just a solid moisturizer."
      },
      {
        item: "The Ordinary Niacinamide 10% + Zinc 1%",
        category: "Beauty",
        stars: 4,
        text: "It helped reduce some oiliness on my T-zone after about two weeks. The texture can pill if you rush your routine, so apply small small and let it settle first."
      },
      {
        item: "La Roche-Posay Anthelios SPF 50",
        category: "Beauty",
        stars: 5,
        text: "Very lightweight sunscreen and no white cast on me. I like that it layers well under makeup and did not sting my eyes. Price is not cheap but I can say it is worth it."
      },
      {
        item: "Aztec Secret Indian Healing Clay",
        category: "Beauty",
        stars: 3,
        text: "It cleans deeply but this one is not for every week unless you want your face to feel too tight. I use it once in a while and mix with apple cider vinegar only when my skin is acting up."
      }
    ]
  },
  {
    id: "tunde",
    name: "Tunde",
    summary: "Tough electronics buyer focused on performance, battery life, and build quality.",
    reviews: [
      {
        item: "Anker 737 Power Bank",
        category: "Electronics",
        stars: 5,
        text: "This thing is a beast. It charges my laptop and phone without struggling, and the screen is actually useful instead of being one gimmick. Heavy, yes, but that is expected for this size."
      },
      {
        item: "JBL Tune 760NC Headphones",
        category: "Electronics",
        stars: 3,
        text: "Sound is decent and battery life is good, but the ear cups start to feel hot after long use. Noise cancelling helps on flights but it is not on the level of the more expensive options."
      },
      {
        item: "Logitech MX Master 3S",
        category: "Electronics",
        stars: 4,
        text: "Comfort is excellent and the scroll wheel feels premium. My only issue is the price because it is not a small jump, but if you work long hours on a computer you will notice the difference."
      },
      {
        item: "Amazon Basics USB-C Cable",
        category: "Electronics",
        stars: 2,
        text: "It worked fine initially, then charging started cutting in and out after a few weeks. Maybe I got a bad unit, but I do not trust cables that become unreliable this quickly."
      }
    ]
  },
  {
    id: "mama-bisi",
    name: "Mama Bisi",
    summary: "Expressive home and kitchen shopper with a warm, conversational Nigerian tone.",
    reviews: [
      {
        item: "Instant Pot Duo 7-in-1",
        category: "Home & Kitchen",
        stars: 5,
        text: "I was afraid this pot would just confuse me but it is actually straightforward after the first try. Beans cooked faster and the stew came out well well. For busy days, this helps a lot o."
      },
      {
        item: "BLACK+DECKER Hand Mixer",
        category: "Home & Kitchen",
        stars: 4,
        text: "Good little mixer for cake and small batter jobs. It is not too loud and the grip is comfortable. I only wish the storage for the beaters was better, but overall I am happy with it sha."
      },
      {
        item: "Rubbermaid Brilliance Food Storage Set",
        category: "Home & Kitchen",
        stars: 5,
        text: "No leaking, no smell trapped inside, and my soup stayed fresh. That alone made me smile. If you like tidy fridge organization, this one makes sense."
      },
      {
        item: "Chefman Electric Kettle",
        category: "Home & Kitchen",
        stars: 3,
        text: "It boils water quickly, I will give it that, but the lid started feeling loose too soon. Still usable, but for the price I expected something a bit sturdier."
      }
    ]
  }
]

export function AppSidebar() {
  const setReviews = useReviewsStore((state) => state.setReviews)
  const navigate = useNavigate()
  const location = useLocation()

  const loadDemoUser = (reviews: ReviewFormValues[]) => {
    setReviews(reviews)
    if (location.pathname !== "/") {
      navigate("/")
    }
  }

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-8">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <h2 className="text-2xl font-black tracking-tight text-primary-bold leading-none">
              REVUE
            </h2>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/80 font-bold mt-1">
              Review Simulator Agent
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="mb-4 text-sm font-bold uppercase">
            Demo Context
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {demoUsers.map((user) => (
                <SidebarMenuItem key={user.id}>
                  <SidebarMenuButton
                    className="h-auto items-start py-3"
                    onClick={() => loadDemoUser(user.reviews)}
                  >
                    <div className="flex flex-col items-start gap-1 text-left">
                      <span className="font-semibold">{user.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {user.summary}
                      </span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
