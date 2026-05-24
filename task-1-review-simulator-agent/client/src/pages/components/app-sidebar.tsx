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
  // ─────────────────────────────────────────────────────────────
  // USER 1 — The Pragmatic Lagos Professional
  // Mid-range buyer, functional over flashy, detailed reviewer
  // ─────────────────────────────────────────────────────────────
  {
    id: "demo_user_chidi",
    name: "Chidi O.",
    summary:
      "Mid-range Lagos professional who values function over form. Writes detailed, balanced reviews. Rewards value for money and penalises poor build quality or confusing setup.",
    reviews: [
      {
        item: "Anker PowerCore 10000 Portable Charger",
        category: "Electronics",
        stars: 5,
        text: "This thing has saved me more times than I can count. Charges my phone twice on a single fill and fits easily in my work bag. No complicated setup — just plug and charge. Build quality feels solid, not cheap plastic. Absolutely worth the price.",
      },
      {
        item: "Logitech MX Keys Wireless Keyboard",
        category: "Electronics",
        stars: 4,
        text: "Comfortable to type on for long hours which matters a lot when you work desk-heavy like me. The backlighting is smart and the multi-device switching works without drama. Only reason it's not 5 stars is the price — a bit steep for what it is. But it does the job well.",
      },
      {
        item: "Herbalife Formula 1 Nutritional Shake",
        category: "Health & Personal Care",
        stars: 3,
        text: "Tastes decent enough but I expected more from the nutritional side. Keeps hunger down for maybe 2-3 hours. Price per serving adds up quickly if you're using it daily. I wouldn't say avoid it but there are better options at this price point.",
      },
      {
        item: "Instant Pot Duo 7-in-1 Electric Pressure Cooker",
        category: "Kitchen & Dining",
        stars: 5,
        text: "Changed how I cook at home completely. Beans that used to take hours are done in 25 minutes. The multiple functions actually work — I use the slow cook and sauté settings regularly. Instructions could be clearer for first-timers but once you get it, it's a game changer.",
      },
      {
        item: "Kindle Paperwhite E-Reader",
        category: "Electronics",
        stars: 5,
        text: "If you read regularly this is non-negotiable. Battery lasts weeks, not days. The waterproof feature sounds gimmicky until you realise you can read anywhere without stress. The screen is easy on the eyes even at night. Lightweight enough to carry everywhere.",
      },
      {
        item: "Resistance Bands Set with Door Anchor",
        category: "Sports & Fitness",
        stars: 4,
        text: "Good substitute for gym when you can't make it out. The bands have held up after months of use which I did not expect at this price. The door anchor works fine for pulling exercises. Instruction card inside is basic but YouTube fills the gap. Solid purchase.",
      },
      {
        item: "Moleskine Classic Notebook Large",
        category: "Office Products",
        stars: 3,
        text: "The quality is there — paper is thick, doesn't bleed through. But honestly the price is the problem. You're paying significantly for the brand name. A cheaper alternative would serve most people just as well. I bought it as a treat but I won't repurchase at full price.",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // USER 2 — The Enthusiastic Home Maker
  // Budget-conscious, emotional reviewer, loves sharing discoveries
  // Generous rater, writes from personal experience angle
  // ─────────────────────────────────────────────────────────────
  {
    id: "demo_user_amaka",
    name: "Amaka T.",
    summary:
      "Enthusiastic home-focused buyer who gets genuinely excited about products that make domestic life easier. Generous rater, writes from personal experience, budget-conscious but will splurge on things that genuinely help the household.",
    reviews: [
      {
        item: "Dyson V8 Cordless Vacuum Cleaner",
        category: "Home & Kitchen",
        stars: 5,
        text: "I cannot believe I waited this long to get this. Cleaning the house used to take so much energy dragging a heavy vacuum around. This one is so light and the suction is incredible — picks up everything including pet hair from the sofa. Yes it's expensive but oh my goodness it is worth every penny.",
      },
      {
        item: "Nivea Soft Moisturising Cream",
        category: "Health & Personal Care",
        stars: 5,
        text: "This is a staple in my house. Everyone uses it — me, my husband, my kids. It absorbs quickly without that heavy greasy feeling. Works great on dry elbows and heels too. The large tub lasts months. I have been using this for years and will never stop.",
      },
      {
        item: "Philips Air Fryer HD9252",
        category: "Kitchen Appliances",
        stars: 4,
        text: "Love what this does for chicken and chips. The food comes out crispy without drowning in oil which is great for the family's health. Cleaning the basket is a bit of a task but manageable. Wish it was slightly bigger for cooking larger portions but for everyday use it works really well.",
      },
      {
        item: "Gym Shark Seamless Leggings",
        category: "Sports & Fitness",
        stars: 3,
        text: "The quality is good and they look nice but I genuinely cannot justify spending this much on workout leggings. They fit well and don't roll down during exercise which is my main requirement. If price is no concern for you then yes get them. But there are equally good options for half the price.",
      },
      {
        item: "LEGO Classic Creative Bricks Set",
        category: "Toys & Games",
        stars: 5,
        text: "Bought this for my 7-year-old and honestly I ended up building with him for two hours. So many pieces and colour variety. Keeps him occupied for hours without needing a screen. The storage box is a nice touch. Would buy again as a gift without hesitation.",
      },
      {
        item: "Colgate Optic White Toothpaste",
        category: "Health & Personal Care",
        stars: 4,
        text: "Noticed a difference in whitening after about two weeks of consistent use. Tastes pleasant and leaves your mouth feeling clean. Nothing dramatic but it works as advertised. Fairly priced compared to other whitening options. Will continue buying.",
      },
      {
        item: "Oral-B Smart Electric Toothbrush",
        category: "Health & Personal Care",
        stars: 5,
        text: "My dentist asked what I changed at my last checkup and I told her this toothbrush. My teeth feel genuinely cleaner. The pressure sensor is clever — it stops you from brushing too hard. The battery lasts a long time on a charge. Expensive upfront but worth it for the long term.",
      },
      {
        item: "Jumia Grocery Bulk Rice 5kg",
        category: "Grocery & Gourmet Food",
        stars: 2,
        text: "Arrived with the bag slightly torn and some rice had spilled inside the delivery packaging. The rice itself is fine when cooked but I expected better packaging for something this heavy. Customer service took too long to respond. Will source locally next time.",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // USER 3 — The Critical Tech Enthusiast
  // Premium buyer, high standards, harsh and technical reviewer
  // Rarely gives 5 stars, always finds something to critique
  // ─────────────────────────────────────────────────────────────
  {
    id: "demo_user_emeka",
    name: "Emeka D.",
    summary:
      "Premium tech buyer with exacting standards. Rarely gives 5 stars. Reviews are technical, critical, and thorough. Rewards genuine innovation and penalises anything that feels like a compromise. Does not care about price if quality justifies it.",
    reviews: [
      {
        item: "Sony WH-1000XM5 Wireless Headphones",
        category: "Electronics",
        stars: 4,
        text: "The noise cancellation is class-leading — genuinely impressive in loud environments. Sound signature leans warm which suits most genres. My issue is the call quality microphone has actually regressed from the XM4. In windy conditions the other person can barely hear you. For music alone this is nearly perfect. For calls it disappoints.",
      },
      {
        item: "Apple MacBook Pro M3 14 inch",
        category: "Computers",
        stars: 5,
        text: "The M3 chip performance is legitimately remarkable. Compiling projects that used to take minutes now finish in seconds. The display is exceptional — color accuracy is as good as a reference monitor for most purposes. Thermal management is silent under most workloads. The notch is still a poor design decision but I have accepted Apple will not remove it. Otherwise this is the best laptop I have used.",
      },
      {
        item: "Garmin Forerunner 265 GPS Running Watch",
        category: "Sports & Fitness",
        stars: 4,
        text: "Accurate GPS lock, excellent heart rate tracking, and the running dynamics data is genuinely useful if you take training seriously. Battery life is exceptional compared to competitors. My critique is the interface feels dated — the menus are not intuitive for a device at this price point. You will spend time in settings figuring things out. Once configured it is excellent. Getting there is frustrating.",
      },
      {
        item: "Nespresso Vertuo Next Coffee Machine",
        category: "Kitchen Appliances",
        stars: 3,
        text: "The coffee quality is good and the convenience is undeniable. But this is a closed ecosystem which I find commercially aggressive. You are locked into Nespresso pods at premium pricing forever. The machine itself feels lightweight — plastic construction does not inspire confidence for the price. If you accept the pod ecosystem this makes excellent coffee. If you want flexibility look elsewhere.",
      },
      {
        item: "Bose QuietComfort Ultra Earbuds",
        category: "Electronics",
        stars: 3,
        text: "The active noise cancellation is impressive but trails the Sony WF-1000XM5 in my testing. The immersive audio mode is a gimmick for most content. Fit is comfortable but the case is unnecessarily large. At this price I expected more refinement in the companion app. Equaliser options are too limited for serious listeners. Not bad earbuds but Bose is trading on reputation more than performance at this point.",
      },
      {
        item: "Theragun Pro Percussive Therapy Device",
        category: "Health & Personal Care",
        stars: 5,
        text: "I was skeptical but the recovery difference is measurable. Post long run soreness that would last two days is gone overnight with consistent use. The force and speed settings give genuine control. Battery life is solid. It is loud — do not expect to use this while someone else is in the room. But for recovery it does exactly what it claims and the build quality matches the price.",
      },
      {
        item: "Kindle Scribe Digital Notebook",
        category: "Electronics",
        stars: 2,
        text: "Disappointing for the price. The writing experience with the pen has too much latency — you can feel the lag between stroke and ink appearing. The handwriting to text conversion is unreliable with anything less than print-perfect lettering. The library management is cumbersome. The e-ink display is beautiful but the software lets the hardware down significantly. Amazon has the hardware. The software team needs to catch up before this is worth recommending.",
      },
      {
        item: "Protein Works Whey Protein Isolate",
        category: "Health & Personal Care",
        stars: 4,
        text: "One of the cleaner ingredient lists in this category — minimal fillers, good amino acid profile. Mixes well without a blender which matters for convenience. The chocolate flavor is not synthetic tasting unlike competitors. Price per serving is fair for isolate quality. Only issue is the bag seal design is poor — starts letting in air after a week of use. Transfer to an airtight container immediately.",
      },
    ],
  },
];

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
