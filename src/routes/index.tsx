import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { demoCourses, categories, courseCover, formatDuration, formatMoney, type Course, type LessonSummary } from "@/lib/portal-data";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, BarChart3, BookOpen, Check, ChevronDown, CirclePlay, Clock3, Code2, Compass, CreditCard, Download, Filter, GraduationCap, Headphones, LayoutDashboard, ListFilter, LockKeyhole, LogIn, Menu, Pause, Play, Plus, Search, Settings2, ShieldCheck, Sparkles, Star, Users, Video, Volume2, X } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Learnova — Practical courses for what’s next" },
      { name: "description", content: "Find thoughtful, practical courses in design, data and marketing. Learn at your own pace with Learnova." },
      { property: "og:title", content: "Learnova — Practical courses for what’s next" },
      { property: "og:description", content: "Explore practical online courses and learn at your own pace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Learnova,
});

type View = "store" | "dashboard" | "admin";
type Profile = { id: string; display_name: string; avatar_url: string | null; email?: string };

const featuredLesson: LessonSummary = {
  id: "lesson-demo", course_id: demoCourses[0].id, title: "Welcome to product design",
  description: "Get oriented and start with a simple design challenge.", section_title: "Start here", duration_seconds: 360, sort_order: 1, is_preview: true,
};

function Learnova() {
  const [view, setView] = useState<View>("store");
  const [courses, setCourses] = useState<Course[]>(demoCourses);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All courses");
  const [selected, setSelected] = useState<Course | null>(null);
  const [player, setPlayer] = useState<{ course: Course; lesson: LessonSummary } | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [authForm, setAuthForm] = useState({ email: "", password: "", displayName: "" });
  const [mobileNav, setMobileNav] = useState(false);
  const [activeLesson, setActiveLesson] = useState<LessonSummary>(featuredLesson);
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [courseAccess, setCourseAccess] = useState<string[]>([]);
  const [progressRows, setProgressRows] = useState<Array<{ lesson_id: string; last_position_seconds: number; completed: boolean }>>([]);
  const [orders, setOrders] = useState<Array<{ id: string; order_number: string; amount: number; currency: string; status: string; created_at: string; course_id: string }>>([]);
  const [adminStats, setAdminStats] = useState({ sales: 0, orders: 0, learners: 0, plays: 0 });
  const [courseForm, setCourseForm] = useState({ title: "", category: "Design", price: "", description: "" });
  const [adminTab, setAdminTab] = useState("Overview");
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let active = true;
    const loadCourses = async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("visibility", "published").order("created_at", { ascending: false });
      if (!active || error || !data?.length) return;
      setCourses(data.map((course) => ({ ...course, cover: courseCover({ ...course, slug: course.slug }), rating: "4.8", students: "" })));
    };
    void loadCourses();
    void supabase.auth.getUser().then(({ data }) => {
      if (active && data.user) void hydrateUser(data.user.id, data.user.email ?? "");
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "SIGNED_OUT") {
        setProfile(null); setIsAdmin(false); setCourseAccess([]); setProgressRows([]); setOrders([]);
        setView("store");
      } else if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session?.user) {
        void hydrateUser(session.user.id, session.user.email ?? "");
      }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  async function hydrateUser(userId: string, email: string) {
    const [{ data: p }, { data: roles }, { data: access }, { data: progress }, { data: purchaseOrders }] = await Promise.all([
      supabase.from("profiles").select("id, display_name, avatar_url").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("course_access").select("course_id").eq("user_id", userId).eq("status", "active"),
      supabase.from("video_progress").select("lesson_id, last_position_seconds, completed").eq("user_id", userId),
      supabase.from("orders").select("id, order_number, amount, currency, status, created_at, course_id").eq("user_id", userId).order("created_at", { ascending: false }),
    ]);
    setProfile(p ? { ...p, email } : { id: userId, display_name: email.split("@")[0] ?? "Learner", avatar_url: null, email });
    setIsAdmin(roles?.some((r) => r.role === "admin") ?? false);
    setCourseAccess(access?.map((row) => row.course_id) ?? []);
    setProgressRows(progress ?? []);
    setOrders(purchaseOrders ?? []);
  }

  async function loadAdminStats() {
    const [{ data: paid }, { count: learners }, { count: plays }] = await Promise.all([
      supabase.from("orders").select("amount").eq("status", "paid"),
      supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "learner"),
      supabase.from("video_events").select("id", { count: "exact", head: true }).eq("event_type", "play"),
    ]);
    const total = paid?.reduce((sum, order) => sum + Number(order.amount), 0) ?? 0;
    const { count: orderCount } = await supabase.from("orders").select("id", { count: "exact", head: true });
    setAdminStats({ sales: total, orders: orderCount ?? 0, learners: learners ?? 0, plays: plays ?? 0 });
  }

  async function openCourse(course: Course) {
    setSelected(course);
    const { data } = await supabase.from("course_catalog_lessons").select("id, course_id, title, description, section_title, duration_seconds, sort_order, is_preview").eq("course_id", course.id).order("sort_order");
    setLessons((data as LessonSummary[] | null) ?? []);
    setActiveLesson((data?.[0] as LessonSummary | undefined) ?? { ...featuredLesson, course_id: course.id });
  }

  async function handleAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authForm.password.length < 8) { toast.error("Use a password with at least 8 characters."); return; }
    setBusy(true);
    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: authForm.email.trim(), password: authForm.password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: authForm.displayName.trim() } },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Check your email to confirm your new account.");
          setAuthMode("signin");
        } else {
          toast.success("Your learning account is ready.");
          setAuthOpen(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authForm.email.trim(), password: authForm.password });
        if (error) throw error;
        toast.success("Welcome back."); setAuthOpen(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We couldn’t sign you in. Try again.");
    } finally { setBusy(false); }
  }

  async function socialSignIn(provider: "google" | "lovable") {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
      if (result.error) throw result.error;
    } catch (error) { toast.error(error instanceof Error ? error.message : "Sign-in didn’t complete. Try again."); }
    finally { setBusy(false); }
  }

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("You’re signed out.");
  }

  async function addCourse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!courseForm.title.trim() || !courseForm.description.trim()) { toast.error("Add a course title and description first."); return; }
    const amount = Number(courseForm.price);
    if (!Number.isFinite(amount) || amount < 0) { toast.error("Enter a valid course price."); return; }
    const { data, error } = await supabase.from("courses").insert({
      title: courseForm.title.trim(), slug: courseForm.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      category: courseForm.category, description: courseForm.description.trim(), short_description: courseForm.description.trim().slice(0, 140),
      instructor_name: profile?.display_name ?? "Learnova instructor", price: amount, currency: "INR", visibility: "draft", created_by: profile?.id,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    toast.success("Your draft course has been saved.");
    setCourseForm({ title: "", category: "Design", price: "", description: "" });
    if (data) setCourses((prev) => [{ ...data, cover: courseCover(data), rating: "New", students: "0" }, ...prev]);
  }

  async function saveLessonProgress(course: Course, lesson: LessonSummary, seconds: number, completed: boolean) {
    if (!profile) return;
    const { error } = await supabase.from("video_progress").upsert({ user_id: profile.id, lesson_id: lesson.id, last_position_seconds: seconds, watched_seconds: seconds, completed }, { onConflict: "user_id,lesson_id" });
    if (error) toast.error("Progress couldn’t be saved.");
    else {
      setProgressRows((prev) => [...prev.filter((row) => row.lesson_id !== lesson.id), { lesson_id: lesson.id, last_position_seconds: seconds, completed }]);
      await supabase.from("video_events").insert({ user_id: profile.id, lesson_id: lesson.id, event_type: completed ? "complete" : "play", watched_seconds: seconds });
    }
    void course;
  }

  const filteredCourses = useMemo(() => courses.filter((course) => {
    const matchesSearch = `${course.title} ${course.short_description} ${course.category} ${course.instructor_name}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (category === "All courses" || course.category === category);
  }), [courses, search, category]);

  function go(next: View) {
    setMobileNav(false);
    if (next === "dashboard" && !profile) { setAuthMode("signin"); setAuthOpen(true); return; }
    if (next === "admin" && !isAdmin) { toast.error(profile ? "Your account doesn’t have administrator access." : "Sign in with an administrator account to continue."); if (!profile) setAuthOpen(true); return; }
    setView(next);
    if (next === "admin") void loadAdminStats();
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-[76px] max-w-[1320px] items-center justify-between gap-5 px-5 md:px-9">
          <Button variant="ghost" className="gap-2 px-0 text-foreground hover:bg-transparent" onClick={() => setView("store")} aria-label="Learnova home">
            <div className="flex items-center gap-3">
  {/* Logo image */}
  <img
    src="/vilaiyosai-logo.png"
    alt="Vilaiyosai Logo"
    className="h-10 w-10 object-contain"
  />

  {/* Website name */}
  <span className="text-2xl font-bold text-[#123B70]">
    Vilaiyosai
  </span>
</div>
          </Button>
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">
            <Button variant="ghost" className="px-1 text-sm" onClick={() => { setView("store"); document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" }); }}>Courses</Button>
            <Button variant="ghost" className="px-1 text-sm" onClick={() => go("dashboard")}>My learning</Button>
            <Button variant="ghost" className="px-1 text-sm" onClick={() => { setView("store"); document.getElementById("why-learnova")?.scrollIntoView({ behavior: "smooth" }); }}>Our approach</Button>
            <Button variant="ghost" className="px-1 text-sm" onClick={() => { setView("store"); document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" }); }}>Pricing</Button>
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <label className="flex h-10 w-[210px] items-center gap-2 rounded-full bg-neutral px-4 text-slate">
              <Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search anything" aria-label="Search courses" className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-slate" />
            </label>
            {profile ? <div className="flex items-center gap-2">
              {isAdmin && <Button size="sm" variant="outline" onClick={() => go("admin")}><Settings2 size={15} /> Admin</Button>}
              <Button variant="ghost" className="gap-2 px-1" onClick={() => go("dashboard")}><Avatar className="size-8"><AvatarImage src={profile.avatar_url ?? undefined} /><AvatarFallback className="bg-tint text-teal">{profile.display_name.slice(0, 1).toUpperCase()}</AvatarFallback></Avatar><span className="max-w-24 truncate text-sm">{profile.display_name}</span></Button>
            </div> : <><Button variant="ghost" onClick={() => { setAuthMode("signin"); setAuthOpen(true); }}>Log in</Button><Button onClick={() => { setAuthMode("signup"); setAuthOpen(true); }}>Sign up <ArrowRight size={15} /></Button></>}
          </div>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu" onClick={() => setMobileNav((v) => !v)}>{mobileNav ? <X /> : <Menu />}</Button>
        </div>
        {mobileNav && <div className="grid gap-2 border-t px-5 py-4 md:hidden"><Button variant="ghost" onClick={() => { setView("store"); setMobileNav(false); }}>Courses</Button><Button variant="ghost" onClick={() => go("dashboard")}>My learning</Button><Button variant="ghost" onClick={() => { setAuthOpen(true); setMobileNav(false); }}>{profile ? "Your account" : "Log in / Sign up"}</Button>{profile && <Button variant="ghost" onClick={() => void signOut()}>Sign out</Button>}</div>}
      </header>

      {view === "store" && <main>
        <section className="grain-surface overflow-hidden px-5 pb-10 pt-9 md:px-9 md:pb-14 md:pt-14">
          <div className="mx-auto grid max-w-[1240px] items-center gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
            <div className="relative z-10 py-4 lg:py-10">
              <Badge className="mb-6 border-0 bg-card px-3 py-1.5 font-medium text-teal shadow-none"><Sparkles size={14} className="mr-1.5" /> Learning that fits your future</Badge>
              <h1 className="max-w-[570px] font-display text-[44px] font-bold leading-[1.04] md:text-[62px]">Build skills.<br /><span className="text-teal">Shape tomorrow.</span></h1>
              <p className="mt-5 max-w-[455px] text-base leading-7 text-slate">Learn from industry experts through practical, thoughtfully made courses. Start anytime, learn anywhere.</p>
              <div className="mt-7 flex flex-wrap gap-3"><Button size="lg" className="h-12 px-6" onClick={() => { if (!profile) { setAuthMode("signup"); setAuthOpen(true); } else go("dashboard"); }}>Start learning free <ArrowRight size={17} /></Button><Button size="lg" variant="outline" className="h-12 border-teal/30 bg-card px-6" onClick={() => document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" })}>Browse courses</Button></div>
              <div className="mt-8 flex items-center gap-3"><div className="flex -space-x-2">{["A","M","R","S","K"].map((name, i) => <Avatar key={name} className="size-9 border-2 border-background"><AvatarFallback className={`text-xs font-semibold ${i % 2 ? "bg-tint text-teal" : "bg-secondary text-primary"}`}>{name}</AvatarFallback></Avatar>)}</div><div><div className="flex items-center gap-1 text-sm font-semibold"><span className="flex text-amber-500">{[0,1,2,3,4].map((i)=><Star key={i} size={13} fill="currentColor" />)}</span><span className="ml-1">4.8</span></div><p className="text-xs text-slate">Loved by learners around the world</p></div></div>
            </div>
            <div className="relative mx-auto w-full max-w-[620px] lg:mr-0">
              <div className="hero-frame relative aspect-[1.2/1] overflow-hidden rounded-[26px] bg-tint">
                <img src={courseCover(demoCourses[3])} alt="Learner studying an online course at home" width={1280} height={960} fetchPriority="high" className="h-full w-full object-cover" />
              </div>
              <div className="absolute left-3 top-4 w-[150px] rounded-xl bg-card p-3 shadow-lg md:left-[-22px] md:top-12 md:w-[175px]">
                <p className="text-xs text-slate">Your progress</p>
                <p className="mt-1 font-display text-xl font-bold">72%</p>
                <Progress value={72} className="mt-2 h-1.5 bg-tint" />
              </div>
              <div className="absolute bottom-4 left-3 rounded-xl bg-card px-3 py-2 shadow-lg md:bottom-8 md:left-[-16px]">
                <p className="text-[11px] text-slate">Weekly goal</p>
                <p className="font-display text-lg font-semibold">5 of 6 hours</p>
              </div>
              <div className="absolute bottom-4 right-3 flex items-center gap-2 rounded-lg bg-card/95 px-3 py-2 shadow-lg md:bottom-8 md:right-5">
                <ShieldCheck size={18} className="text-teal" />
                <span className="text-xs font-medium">Learn at your pace</span>
              </div>
              <span className="absolute -right-2 -top-2 size-16 rounded-full border-[9px] border-turquoise/25 md:-right-5 md:-top-5 md:size-24" aria-hidden="true" />
            </div>
          </div>
          <div className="mx-auto mt-12 grid max-w-[1240px] grid-cols-2 divide-x divide-white/15 overflow-hidden rounded-xl bg-teal text-primary-foreground sm:grid-cols-4">
            {[["25,000+","Active learners",Users],["1,200+","Expert instructors",GraduationCap],["3,500+","Premium courses",BookOpen],["98%","Learner satisfaction",ShieldCheck]].map(([value,label,Icon])=> <div key={String(label)} className="flex min-h-[78px] items-center justify-center gap-3 px-3 py-4 sm:justify-start sm:px-6"><span className="grid size-10 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10"><Icon size={19} /></span><span><strong className="block font-display text-lg">{String(value)}</strong><small className="text-xs text-white/75">{String(label)}</small></span></div>)}
          </div>
        </section>

        <section className="mx-auto max-w-[1320px] px-5 py-12 md:px-9 md:py-16" id="categories">
          <div className="flex items-end justify-between gap-4"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-teal">Find your next chapter</p><h2 className="font-display text-3xl font-bold">Explore top categories</h2><p className="mt-2 text-sm text-slate">Choose a field and start your learning journey.</p></div><Button variant="ghost" className="hidden sm:inline-flex" onClick={() => { setCategory("All courses"); document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" }); }}>View all <ArrowRight size={15} /></Button></div>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{categories.map((item) => <Button key={item.name} variant="outline" className="h-auto min-h-[122px] flex-col items-start justify-center gap-3 border-border bg-card p-4 text-left shadow-none hover:border-teal/50" onClick={() => { setCategory(item.name === "Development" || item.name === "Business" ? "All courses" : item.name); document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" }); }}><span className={`grid size-10 place-items-center rounded-full text-lg ${item.tint}`}>{item.icon}</span><span><strong className="block text-sm">{item.name}</strong><small className="mt-1 text-xs font-normal text-slate">{item.count} courses</small></span></Button>)}</div>
        </section>

        <section className="border-y border-border/70 bg-card px-5 py-12 md:px-9 md:py-16" id="courses">
          <div className="mx-auto max-w-[1320px]">
            <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-teal">Made to move you forward</p><h2 className="font-display text-3xl font-bold">Popular courses</h2><p className="mt-2 text-sm text-slate">Thoughtful lessons, real skills, measurable progress.</p></div><div className="flex flex-wrap items-center gap-2"><label className="flex h-10 items-center gap-2 rounded-md border border-input bg-card px-3 md:hidden"><Search size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search courses" aria-label="Search courses" className="w-36 bg-transparent text-sm outline-none" /></label><select aria-label="Filter courses by category" value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 rounded-md border border-input bg-card px-3 text-sm"><option>All courses</option>{[...new Set(courses.map((c) => c.category))].map((c) => <option key={c}>{c}</option>)}</select></div></div>
            {filteredCourses.length ? <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{filteredCourses.map((course, index) => <CourseCard key={course.id} course={course} featured={index === 0} onOpen={() => void openCourse(course)} />)}</div> : <div className="py-14 text-center text-slate">No courses match that search yet.</div>}
          </div>
        </section>

        <section className="mx-auto grid max-w-[1320px] gap-9 px-5 py-12 md:px-9 md:py-16 lg:grid-cols-[0.72fr_1.28fr]" id="why-learnova">
          <div className="max-w-[380px]"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-teal">Why learners choose us</p><h2 className="font-display text-3xl font-bold">Good learning changes everything.</h2><p className="mt-3 text-sm leading-6 text-slate">Practical guidance and a pace that makes room for the rest of your life.</p><Button variant="link" className="mt-3 h-auto p-0 text-teal" onClick={() => setAuthOpen(true)}>Meet the Learnova community <ArrowUpRight size={15} /></Button></div>
          <div className="grid gap-5 sm:grid-cols-3">{[[Users,"Learn from experts","Industry professionals with useful experience to share."],[Clock3,"Flexible learning","Learn at your own pace, whenever and wherever."],[Compass,"Practical by design","Hands-on projects and skills you can apply." ]].map(([Icon,title,copy]) => <div key={String(title)} className="border-l border-border pl-5"><Icon size={30} strokeWidth={1.5} className="text-teal" /><h3 className="mt-5 font-display text-lg font-semibold">{String(title)}</h3><p className="mt-2 text-sm leading-6 text-slate">{String(copy)}</p></div>)}</div>
        </section>
        <section className="bg-teal px-5 py-12 text-primary-foreground md:px-9"><div className="mx-auto grid max-w-[1320px] gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-turquoise">Continue your learning journey</p><h2 className="mt-3 font-display text-3xl font-bold">Small steps. Big momentum.</h2><p className="mt-2 text-sm text-white/75">Pick up where you left off and make today count.</p><Button variant="secondary" className="mt-5 bg-white/10 text-primary-foreground hover:bg-white/20" onClick={() => go("dashboard")}>View learning dashboard <ArrowRight size={15} /></Button></div><div className="grid gap-3 sm:grid-cols-3">{demoCourses.slice(0,3).map((course,i) => <button key={course.id} onClick={() => void openCourse(course)} className="flex items-center gap-3 rounded-lg border border-white/15 bg-white/5 p-3 text-left transition-colors hover:bg-white/10"><img src={course.cover} alt="" loading="lazy" width={960} height={720} className="size-14 shrink-0 rounded-md object-cover"/><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{course.title}</strong><small className="mt-1 block text-white/65">{[60,35,80][i]}% complete</small><span className="mt-2 block h-1 rounded-full bg-white/20"><span className="block h-full rounded-full bg-turquoise" style={{ width: `${[60,35,80][i]}%` }} /></span></span><ArrowRight size={15} className="shrink-0"/></button>)}</div></div></section>
        <section className="mx-auto max-w-[1320px] px-5 py-12 md:px-9 md:py-16"><div className="text-center"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal">The people behind the lessons</p><h2 className="mt-2 font-display text-3xl font-bold">Meet our expert instructors</h2><p className="mt-2 text-sm text-slate">Learn from professionals who love teaching.</p></div><div className="mx-auto mt-8 grid max-w-[840px] gap-4 sm:grid-cols-3">{[["CW","Cameron Williamson","Product designer","8 years experience"],["DR","Dianne Russell","Data scientist","10 years experience"],["DL","Devon Lane","Full-stack developer","7 years experience"]].map(([initials,name,role,experience],i)=><div key={name} className="border border-border/70 bg-card p-5 text-center"><Avatar className="mx-auto size-16"><AvatarFallback className={`text-xl ${i===1?"bg-tint text-teal":"bg-secondary text-primary"}`}>{initials.slice(0,1)}</AvatarFallback></Avatar><h3 className="mt-3 text-sm font-semibold">{name}</h3><p className="mt-1 text-xs text-slate">{role} · {experience}</p></div>)}</div></section>
        <section className="mx-5 mb-12 rounded-2xl bg-tint px-6 py-8 md:mx-9 md:px-12 md:py-10"><div className="mx-auto flex max-w-[1160px] flex-col items-start justify-between gap-5 md:flex-row md:items-center"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal">A note from the community</p><p className="mt-3 max-w-[740px] font-display text-2xl font-semibold leading-snug">“Learnova changed the way I learn. The courses are practical, engaging, and absolutely worth it.”</p><p className="mt-3 text-sm text-slate">Kristin Watson · Product manager & lifelong learner</p></div><span className="flex text-amber-500">{[0,1,2,3,4].map((i)=><Star key={i} size={17} fill="currentColor" />)}</span></div></section>
        
<section className="border-t border-border bg-card px-5 py-8 md:px-9">
  <div className="mx-auto grid max-w-[1320px] gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">

    {/* Brand logo and name */}
    <div>
      <Button variant="ghost" className="gap-3 px-0 text-foreground">
        <img
          src="/vilaiyosai-logo.png"
          alt="Vilaiyosai Logo"
          className="h-10 w-10 object-contain"
        />
        <span className="font-display text-lg font-bold text-[#123B70]">
          Vilaiyosai
        </span>
      </Button>

      <p className="mt-2 max-w-xs text-xs leading-5 text-slate">
        Learn, grow, and create your future with Vilaiyosai.
      </p>
    </div>

    {/* Explore */}
    <div>
      <h3 className="text-sm font-semibold">Explore</h3>
      <p className="mt-3 text-xs leading-7 text-slate">
        Courses<br />
        Learning paths<br />
        For business
      </p>
    </div>

    {/* Support */}
    <div>
      <h3 className="text-sm font-semibold">Support</h3>
      <p className="mt-3 text-xs leading-7 text-slate">
        Help center<br />
        Contact us<br />
        Privacy policy
      </p>
    </div>

    {/* Your learning */}
    <div>
      <h3 className="text-sm font-semibold">Your learning</h3>
      <Button
        variant="link"
        className="mt-2 h-auto p-0 text-xs text-teal"
        onClick={() => go("dashboard")}
      >
        My courses <ArrowRight size={13} />
      </Button>
      <br />
      <Button
        variant="link"
        className="mt-2 h-auto p-0 text-xs text-teal"
        onClick={() => go("admin")}
      >
        Administration <ArrowRight size={13} />
      </Button>
    </div>

  </div>
</section>

      </main>}

      {view === "dashboard" && profile && <Dashboard profile={profile} courses={courses} courseAccess={courseAccess} progressRows={progressRows} orders={orders} onBack={() => setView("store")} onOpenCourse={(course) => void openCourse(course)} onPlay={(course) => { setPlayer({ course, lesson: { ...featuredLesson, course_id: course.id } }); setPlaying(false); }} onSignOut={() => void signOut()} />}
      {view === "admin" && isAdmin && <AdminPanel courses={courses} stats={adminStats} tab={adminTab} setTab={setAdminTab} form={courseForm} setForm={setCourseForm} onCreate={(event) => void addCourse(event)} onPublish={async (course) => { const { error } = await supabase.from("courses").update({ visibility: "published" }).eq("id", course.id); if (error) toast.error(error.message); else { setCourses((prev) => prev.map((item) => item.id === course.id ? { ...item, visibility: "published" } : item)); toast.success("Course published."); } }} onBack={() => setView("store")} />}

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-h-[92vh] max-w-[760px] overflow-y-auto p-0">
          {selected && <><div className="relative course-cover overflow-hidden"><img src={courseCover(selected)} alt={`${selected.title} course cover`} width={960} height={720} /><Badge className="absolute left-5 top-5 border-0 bg-card text-teal">{selected.category}</Badge></div><div className="p-6 md:p-8"><DialogHeader><DialogTitle className="font-display text-3xl">{selected.title}</DialogTitle><DialogDescription className="mt-2 text-base">{selected.description}</DialogDescription></DialogHeader><div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate"><span className="flex items-center gap-1.5"><Users size={15}/>{selected.instructor_name}</span><span className="flex items-center gap-1.5"><Clock3 size={15}/>{formatDuration(selected.duration_minutes)}</span><span className="flex items-center gap-1.5"><Star size={15} className="fill-amber-400 text-amber-400"/>{selected.rating} learner rating</span></div><h3 className="mt-6 font-display text-lg font-semibold">What you’ll learn</h3><ul className="mt-3 grid gap-2 sm:grid-cols-2">{selected.learning_outcomes.map((outcome) => <li key={outcome} className="flex items-start gap-2 text-sm"><Check size={16} className="mt-0.5 shrink-0 text-teal"/>{outcome}</li>)}</ul><h3 className="mt-7 font-display text-lg font-semibold">Course outline <span className="text-sm font-normal text-slate">· {lessons.length} lessons</span></h3><Accordion type="single" collapsible className="mt-2">{Object.entries(lessons.reduce<Record<string, LessonSummary[]>>((acc, lesson) => { (acc[lesson.section_title] ??= []).push(lesson); return acc; }, {})).map(([section,items])=><AccordionItem key={section} value={section}><AccordionTrigger>{section}<span className="ml-auto mr-4 text-xs text-slate">{items.length} lessons</span></AccordionTrigger><AccordionContent>{items.map((lesson)=><div key={lesson.id} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="flex items-center gap-2"><CirclePlay size={16} className="text-teal"/>{lesson.title}{lesson.is_preview && <Badge variant="secondary">Preview</Badge>}</span><span className="text-xs text-slate">{Math.round(lesson.duration_seconds / 60)} min</span></div>)}</AccordionContent></AccordionItem>)}</Accordion><div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg bg-tint p-4"><div><p className="text-xs text-slate">One-time course price</p><p className="mt-1 font-display text-2xl font-bold">{formatMoney(selected.discount_price ?? selected.price, selected.currency)} <s className="ml-1 text-sm font-normal text-slate">{formatMoney(selected.price, selected.currency)}</s></p></div><Button size="lg" onClick={() => { const hasAccess = profile && courseAccess.includes(selected.id); if (hasAccess) { setPlayer({ course: selected, lesson: lessons[0] ?? { ...featuredLesson, course_id: selected.id } }); setPlaying(false); setSelected(null); } else { toast.info("Course checkout will be connected when payment setup is requested."); if (!profile) { setAuthMode("signup"); setAuthOpen(true); } } }}>{profile && courseAccess.includes(selected.id) ? "Start learning" : "Get this course"} <ArrowRight size={16}/></Button></div><p className="mt-3 text-xs text-slate">Secure access after purchase · Lifetime learning access · Contact us for support</p></div></>}
        </DialogContent>
      </Dialog>

      <Dialog open={!!player} onOpenChange={(open) => { if (!open) { setPlayer(null); setPlaying(false); } }}>
        <DialogContent className="max-h-[94vh] max-w-[900px] overflow-y-auto p-0">
          {player && <div><div className="video-stage relative grid place-items-center overflow-hidden bg-foreground"><img src={courseCover(player.course)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35"/><div className="absolute inset-0 bg-foreground/35"/><div className="relative z-10 flex flex-col items-center gap-3 text-center text-primary-foreground"><Button size="icon" className="size-16 rounded-full bg-turquoise text-foreground hover:bg-turquoise/90" aria-label={playing ? "Pause lesson" : "Play lesson"} onClick={() => { setPlaying((v) => !v); if (!player.lesson.id.startsWith("lesson-demo")) void supabase.from("video_events").insert({ user_id: profile?.id, lesson_id: player.lesson.id, event_type: playing ? "pause" : "play", watched_seconds: 0 }); }} >{playing ? <Pause size={25}/> : <Play size={25} fill="currentColor"/>}</Button><p className="max-w-[80%] font-display text-xl font-semibold">{player.lesson.title}</p>{!player.lesson.video_reference && <p className="max-w-[420px] text-sm text-white/80">This lesson is ready for its video. Your administrator can add the video file in the course editor.</p>}</div><div className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-3 bg-foreground/80 px-4 py-3 text-primary-foreground"><Button variant="ghost" size="icon" aria-label="Play or pause lesson" className="text-primary-foreground" onClick={() => setPlaying((v)=>!v)}>{playing?<Pause size={16}/>:<Play size={16}/>}</Button><input type="range" aria-label="Video position" min="0" max={Math.max(1,player.lesson.duration_seconds)} defaultValue="0" className="h-1 flex-1 accent-[var(--color-turquoise)]"/><span className="text-xs">0:{String(Math.floor(player.lesson.duration_seconds/60)).padStart(2,"0")}</span><Volume2 size={17}/><Button variant="ghost" size="icon" aria-label="Full screen video" className="text-primary-foreground" onClick={(e)=>{const stage=e.currentTarget.closest(".video-stage"); if(stage instanceof HTMLElement && document.fullscreenEnabled) void stage.requestFullscreen();}}><ArrowUpRight size={18}/></Button></div></div><div className="grid gap-6 p-5 md:grid-cols-[1.1fr_0.9fr] md:p-7"><div><DialogHeader><DialogTitle className="font-display text-xl">{player.course.title}</DialogTitle><DialogDescription>{player.lesson.section_title} · {player.lesson.description}</DialogDescription></DialogHeader><div className="mt-4 flex items-center gap-2 text-xs text-slate"><ShieldCheck size={15} className="text-teal"/>Lesson progress saves to your account</div><Button className="mt-4" variant="outline" onClick={()=>void saveLessonProgress(player.course,player.lesson,player.lesson.duration_seconds,true)}><Check size={15}/> Mark complete</Button></div><div><p className="mb-2 text-sm font-semibold">Course lessons</p><div className="max-h-48 space-y-1 overflow-auto">{(lessons.length?lessons:[player.lesson]).map((lesson)=>{const done=progressRows.some((row)=>row.lesson_id===lesson.id&&row.completed);return <Button key={lesson.id} variant="ghost" className="h-auto w-full justify-start gap-2 whitespace-normal py-2 text-left" onClick={()=>{setActiveLesson(lesson);setPlayer({...player,lesson});setPlaying(false);}}>{done?<Check size={15} className="text-teal"/>:<CirclePlay size={15} className="text-slate"/>}<span className="flex-1 truncate text-xs">{lesson.title}</span><span className="text-xs text-slate">{Math.round(lesson.duration_seconds/60)}m</span></Button>})}</div></div></div></div>}
        </DialogContent>
      </Dialog>

      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent className="max-w-[440px]">
          <DialogHeader><DialogTitle className="font-display text-2xl">{authMode === "signup" ? "Start learning with Learnova" : "Welcome back"}</DialogTitle><DialogDescription>{authMode === "signup" ? "Create an account to keep your learning in one place." : "Sign in to continue where you left off."}</DialogDescription></DialogHeader>
          <form className="mt-3 space-y-3" onSubmit={(event)=>void handleAuth(event)}>{authMode === "signup" && <Input required maxLength={80} value={authForm.displayName} onChange={(e)=>setAuthForm({...authForm,displayName:e.target.value})} placeholder="Your name" aria-label="Your name"/>}<Input required type="email" maxLength={255} value={authForm.email} onChange={(e)=>setAuthForm({...authForm,email:e.target.value})} placeholder="Email address" aria-label="Email address"/><Input required type="password" minLength={8} maxLength={72} value={authForm.password} onChange={(e)=>setAuthForm({...authForm,password:e.target.value})} placeholder="Password · at least 8 characters" aria-label="Password"/><Button disabled={busy} className="w-full" type="submit">{busy?"Please wait…":authMode==="signup"?"Create account":"Sign in"} <ArrowRight size={15}/></Button></form>
          <div className="my-1 flex items-center gap-3 text-[11px] text-slate"><span className="h-px flex-1 bg-border"/>OR CONTINUE WITH<span className="h-px flex-1 bg-border"/></div>
          <div className="grid grid-cols-2 gap-2"><Button disabled={busy} variant="outline" onClick={()=>void socialSignIn("google")}><GoogleMark/>Google</Button><Button disabled={busy} variant="outline" onClick={()=>void socialSignIn("lovable")}><span className="grid size-[18px] place-items-center rounded-sm bg-foreground text-[11px] font-bold text-background">L</span>Lovable</Button></div>
          <p className="text-center text-sm text-slate">{authMode==="signup"?"Already have an account?":"New to Learnova?"} <Button variant="link" className="h-auto p-0 text-teal" onClick={()=>setAuthMode(authMode==="signup"?"signin":"signup")}>{authMode==="signup"?"Sign in":"Create account"}</Button></p>
          {profile && <Button variant="ghost" onClick={()=>void signOut()}>Sign out</Button>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GoogleMark() {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>;
}

function CourseCard({ course, featured, onOpen }: { course: Course; featured: boolean; onOpen: () => void }) {
  return <article className="group overflow-hidden rounded-lg border border-border/80 bg-background transition-shadow hover:shadow-md"><button onClick={onOpen} className="course-cover relative block w-full overflow-hidden text-left"><img src={courseCover(course)} alt={`${course.title} course`} loading="lazy" width={960} height={720} className="transition-transform duration-500 group-hover:scale-[1.04]"/>{featured && <Badge className="absolute left-3 top-3 border-0 bg-primary text-primary-foreground">BESTSELLER</Badge>}<span className="absolute bottom-3 right-3 grid size-10 place-items-center rounded-full bg-card/95 text-teal"><CirclePlay size={19}/></span></button><div className="p-4"><p className="text-[11px] font-medium text-teal">{course.category} <span className="text-slate">· {course.level}</span></p><button onClick={onOpen} className="mt-1 block text-left font-display text-[16px] font-semibold leading-snug hover:text-teal">{course.title}</button><p className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-slate">{course.short_description}</p><div className="mt-3 flex items-center gap-2"><Avatar className="size-6"><AvatarFallback className="bg-tint text-[9px] text-teal">{course.instructor_name.slice(0,1)}</AvatarFallback></Avatar><span className="text-xs text-slate">{course.instructor_name}</span><span className="ml-auto flex items-center gap-1 text-xs font-medium"><Star size={13} className="fill-amber-400 text-amber-400"/>{course.rating}{course.students&&<span className="text-slate">({course.students})</span>}</span></div><div className="mt-3 flex items-center justify-between border-t border-border pt-3"><span className="font-display text-lg font-bold">{formatMoney(course.discount_price??course.price,course.currency)}<s className="ml-1 text-xs font-normal text-slate">{formatMoney(course.price,course.currency)}</s></span><Button size="sm" variant="ghost" className="h-8 px-2 text-teal" onClick={onOpen}>Explore <ArrowRight size={14}/></Button></div></div></article>;
}

function Dashboard({ profile, courses, courseAccess, progressRows, orders, onBack, onOpenCourse, onPlay, onSignOut }: { profile: Profile; courses: Course[]; courseAccess: string[]; progressRows: Array<{lesson_id:string;last_position_seconds:number;completed:boolean}>; orders: Array<{id:string;order_number:string;amount:number;currency:string;status:string;created_at:string;course_id:string}>; onBack:()=>void; onOpenCourse:(course:Course)=>void; onPlay:(course:Course)=>void; onSignOut:()=>void }) {
  const enrolled = courses.filter((course)=>courseAccess.includes(course.id));
  const completedLessons = progressRows.filter((row)=>row.completed).length;
  const overallProgress = progressRows.length ? Math.round(completedLessons/progressRows.length*100) : 0;
  return <main className="min-h-[calc(100vh-76px)] bg-background px-5 py-9 md:px-9 md:py-12"><div className="mx-auto max-w-[1240px]"><Button variant="ghost" className="mb-6 px-0 text-teal" onClick={onBack}><ArrowLeft size={16}/>Back to courses</Button><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm text-slate">Your learning space</p><h1 className="mt-1 font-display text-3xl font-bold">Welcome back, {profile.display_name}</h1><p className="mt-2 text-sm text-slate">A little progress today goes a long way.</p></div><Button variant="outline" onClick={onSignOut}><LogIn size={15}/>Sign out</Button></div><div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[[BookOpen,String(enrolled.length),"Courses in your library"],[Check,String(completedLessons),"Lessons completed"],[BarChart3,`${overallProgress}%`,"Overall progress"],[CreditCard,String(orders.length),"Orders"]].map(([Icon,value,label])=><div key={String(label)} className="flex items-center gap-3 border border-border bg-card p-4"><span className="grid size-10 place-items-center rounded-md bg-tint text-teal"><Icon size={19}/></span><span><strong className="font-display text-xl">{value}</strong><small className="mt-0.5 block text-xs text-slate">{label}</small></span></div>)}</div><div className="mt-9 flex items-end justify-between gap-3"><div><h2 className="font-display text-2xl font-bold">My courses</h2><p className="mt-1 text-sm text-slate">Continue learning right where you left off.</p></div><Button variant="outline" onClick={onBack}>Explore courses <ArrowRight size={15}/></Button></div>{enrolled.length ? <div className="mt-5 grid gap-4 md:grid-cols-2">{enrolled.map((course)=>{const lessonProgress=progressRows.filter((row)=>row.completed).length;const percent=lessonProgress?Math.min(100,lessonProgress*25):0;return <div key={course.id} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row"><img src={courseCover(course)} alt="" className="h-36 w-full rounded-md object-cover sm:h-[128px] sm:w-44"/><div className="flex min-w-0 flex-1 flex-col"><Badge variant="secondary" className="w-fit">{course.category}</Badge><h3 className="mt-2 font-display text-lg font-semibold">{course.title}</h3><p className="mt-1 text-xs text-slate">{course.instructor_name}</p><div className="mt-auto pt-4"><div className="mb-2 flex justify-between text-xs"><span>Course progress</span><span>{percent}%</span></div><Progress value={percent}/><Button className="mt-3" size="sm" onClick={()=>onPlay(course)}>Continue learning <ArrowRight size={14}/></Button></div></div></div>})}</div> : <div className="mt-5 border border-dashed border-border bg-card px-6 py-12 text-center"><BookOpen size={28} className="mx-auto text-teal"/><h3 className="mt-3 font-display text-lg font-semibold">Your learning library is ready</h3><p className="mx-auto mt-2 max-w-md text-sm text-slate">Courses you purchase or receive access to will appear here, with your progress and next lesson.</p><Button className="mt-5" onClick={onBack}>Browse courses <ArrowRight size={15}/></Button></div>}<div className="mt-10"><h2 className="font-display text-2xl font-bold">Order history</h2>{orders.length?<div className="mt-4 overflow-x-auto rounded-lg border border-border bg-card"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-neutral text-slate"><tr>{["Order","Course","Date","Status","Amount"].map((h)=><th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead><tbody>{orders.map((order)=><tr key={order.id} className="border-t border-border"><td className="px-4 py-3 font-medium">{order.order_number}</td><td className="px-4 py-3">{courses.find((c)=>c.id===order.course_id)?.title??"Course"}</td><td className="px-4 py-3">{new Date(order.created_at).toLocaleDateString()}</td><td className="px-4 py-3 capitalize">{order.status}</td><td className="px-4 py-3">{formatMoney(order.amount,order.currency)}</td></tr>)}</tbody></table></div>:<p className="mt-2 text-sm text-slate">Your payment history will appear here after checkout is configured.</p>}</div></div></main>;
}

function AdminPanel({ courses, stats, tab, setTab, form, setForm, onCreate, onPublish, onBack }: { courses: Course[]; stats:{sales:number;orders:number;learners:number;plays:number}; tab:string; setTab:(tab:string)=>void; form:{title:string;category:string;price:string;description:string}; setForm:(form:{title:string;category:string;price:string;description:string})=>void; onCreate:(event:React.FormEvent<HTMLFormElement>)=>void; onPublish:(course:Course)=>void; onBack:()=>void }) {
  const tabs=["Overview","Courses","Learners","Orders","Video analytics"];
  return <main className="min-h-[calc(100vh-76px)] bg-neutral px-5 py-8 md:px-9 md:py-11"><div className="mx-auto max-w-[1300px]"><div className="flex flex-wrap items-center justify-between gap-4"><div><Button variant="ghost" className="mb-3 px-0 text-teal" onClick={onBack}><ArrowLeft size={15}/>Back to storefront</Button><p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal">LEARNOVA ADMIN</p><h1 className="mt-1 font-display text-3xl font-bold">Good morning, admin.</h1><p className="mt-1 text-sm text-slate">Here’s how your learning community is doing.</p></div><Badge variant="secondary" className="gap-1.5 px-3 py-1.5"><ShieldCheck size={15}/>Administrator</Badge></div><div className="mt-7 flex gap-1 overflow-x-auto border-b border-border">{tabs.map((item)=><Button key={item} variant="ghost" className={`shrink-0 rounded-none border-b-2 px-3 ${tab===item?"border-teal text-teal":"border-transparent text-slate"}`} onClick={()=>setTab(item)}>{item}</Button>)}</div>{tab==="Overview"&&<><div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Total sales",formatMoney(stats.sales),"Verified paid orders",CreditCard],["Successful orders",String(stats.orders),"All recorded statuses",Check],["Registered learners",String(stats.learners),"Learner accounts",Users],["Video play events",String(stats.plays),"Recorded engagement",Video]].map(([label,value,note,Icon])=><div key={String(label)} className="flex items-start justify-between border border-border bg-card p-5"><div><p className="text-sm text-slate">{String(label)}</p><p className="mt-2 font-display text-3xl font-bold">{String(value)}</p><p className="mt-1 text-xs text-slate">{String(note)}</p></div><span className="grid size-10 place-items-center rounded-md bg-tint text-teal"><Icon size={19}/></span></div>)}</div><div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]"><div className="border border-border bg-card p-5"><div className="flex items-start justify-between"><div><h2 className="font-display text-lg font-semibold">Course performance</h2><p className="mt-1 text-xs text-slate">Catalogue visibility and current pricing</p></div><Button variant="outline" size="sm" onClick={()=>setTab("Courses")}>Manage courses</Button></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[450px] text-left text-sm"><thead><tr className="border-b border-border text-xs text-slate"><th className="py-3 font-medium">Course</th><th className="py-3 font-medium">Category</th><th className="py-3 font-medium">Price</th><th className="py-3 font-medium">Status</th></tr></thead><tbody>{courses.slice(0,5).map((course)=><tr key={course.id} className="border-b border-border/70"><td className="py-3 pr-3 font-medium">{course.title}</td><td className="py-3 text-slate">{course.category}</td><td className="py-3">{formatMoney(course.price,course.currency)}</td><td className="py-3"><Badge variant={course.visibility==="published"?"secondary":"outline"}>{course.visibility}</Badge></td></tr>)}</tbody></table></div></div><div className="border border-border bg-card p-5"><h2 className="font-display text-lg font-semibold">Quick actions</h2><p className="mt-1 text-xs text-slate">Keep the learning experience up to date.</p><div className="mt-4 grid gap-2"><Button className="justify-start" onClick={()=>setTab("Courses")}><Plus size={16}/>Create a course</Button><Button variant="outline" className="justify-start" onClick={()=>setTab("Video analytics")}><BarChart3 size={16}/>Review engagement</Button><Button variant="outline" className="justify-start" onClick={()=>setTab("Orders")}><CreditCard size={16}/>View order activity</Button></div></div></div></>}{tab==="Courses"&&<div className="mt-6 grid gap-5 lg:grid-cols-[0.75fr_1.25fr]"><form onSubmit={onCreate} className="space-y-3 border border-border bg-card p-5"><h2 className="font-display text-lg font-semibold">Create a course</h2><p className="text-xs text-slate">New courses are saved as drafts until you publish them.</p><Input required maxLength={120} value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} placeholder="Course title" aria-label="Course title"/><select className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm" value={form.category} onChange={(e)=>setForm({...form,category:e.target.value})} aria-label="Course category">{["Design","Development","Business","Marketing","Data Science","Personal Growth"].map((cat)=><option key={cat}>{cat}</option>)}</select><Input required type="number" min="0" step="1" value={form.price} onChange={(e)=>setForm({...form,price:e.target.value})} placeholder="Price in INR" aria-label="Course price in Indian rupees"/><textarea required maxLength={1200} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} placeholder="Course description" aria-label="Course description" className="min-h-28 w-full rounded-md border border-input bg-card p-3 text-sm outline-none focus:ring-1 focus:ring-ring"/><Button type="submit" className="w-full"><Plus size={15}/>Save draft course</Button></form><div className="space-y-3">{courses.map((course)=><div key={course.id} className="flex flex-wrap items-center gap-4 border border-border bg-card p-4"><img src={courseCover(course)} alt="" width={960} height={720} className="size-16 rounded object-cover"/><div className="min-w-0 flex-1"><p className="truncate font-medium">{course.title}</p><p className="mt-1 text-xs text-slate">{course.category} · {formatMoney(course.price,course.currency)} · {course.visibility}</p></div><div className="flex gap-2">{course.visibility!=="published"&&<Button size="sm" onClick={()=>onPublish(course)}>Publish</Button>}<Button size="icon" variant="outline" aria-label={`Edit ${course.title}`} onClick={()=>toast.info("Course editing is ready for your next content pass.")}><Settings2 size={15}/></Button></div></div>)}</div></div>}{tab==="Learners"&&<div className="mt-6 border border-border bg-card p-6"><Users size={24} className="text-teal"/><h2 className="mt-3 font-display text-xl font-semibold">Learner accounts</h2><p className="mt-2 max-w-xl text-sm text-slate">Registered learner totals are shown above. Open the account workspace to review a person’s profile and account access securely.</p><Button className="mt-4" onClick={()=>toast.info("Learner profiles are available in the account workspace.")}><Users size={15}/>Open learner workspace <ArrowUpRight size={15}/></Button></div>}{tab==="Orders"&&<div className="mt-6 border border-border bg-card p-6"><CreditCard size={24} className="text-teal"/><h2 className="mt-3 font-display text-xl font-semibold">Payment setup is deferred</h2><p className="mt-2 max-w-xl text-sm text-slate">Checkout, receipts, refunds and order exports will be connected after you choose your payment setup. No payments are collected yet.</p></div>}{tab==="Video analytics"&&<div className="mt-6 border border-border bg-card p-6"><BarChart3 size={24} className="text-teal"/><h2 className="mt-3 font-display text-xl font-semibold">Video engagement</h2><p className="mt-2 text-sm text-slate">{stats.plays} recorded lesson starts across the courses.</p><p className="mt-1 max-w-xl text-xs leading-5 text-slate">Watch time and completion measures will build as course videos and learner activity are added.</p></div>}</div></main>;
}