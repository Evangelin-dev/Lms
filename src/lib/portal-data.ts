import type { Tables } from "@/integrations/supabase/types";
import designImage from "@/assets/course-design.jpg";
import dataImage from "@/assets/course-data.jpg";
import marketingImage from "@/assets/course-marketing.jpg";
import heroImage from "@/assets/learnova-hero.jpg";

export type Course = Tables<"courses"> & { cover: string; rating: string; students: string };
export type LessonSummary = {
  id: string;
  course_id: string;
  title: string;
  description: string;
  section_title: string;
  duration_seconds: number;
  sort_order: number;
  is_preview: boolean;
  video_reference?: string | null;
  video_provider?: string | null;
};

export const courseImages: Record<string, string> = {
  "ui-ux-design-masterclass": designImage,
  "python-for-data-science": dataImage,
  "digital-marketing-strategy": marketingImage,
  "productivity-time-management": heroImage,
};

export const demoCourses: Course[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    title: "UI/UX Design Masterclass",
    slug: "ui-ux-design-masterclass",
    short_description: "Design digital products people love to use.",
    description: "A practical journey through user research, visual systems, wireframing and high-fidelity prototyping. Build a portfolio-ready product experience from first principles.",
    category: "Design",
    instructor_name: "Jane Cooper",
    price: 4999,
    discount_price: 3499,
    currency: "INR",
    duration_minutes: 840,
    level: "Beginner",
    thumbnail_url: designImage,
    learning_outcomes: ["Map real user needs", "Create a confident visual system", "Prototype and test a complete flow"],
    visibility: "published",
    is_free: false,
    access_duration_days: null,
    created_by: null,
    created_at: "2026-06-12T00:00:00.000Z",
    updated_at: "2026-06-12T00:00:00.000Z",
    cover: designImage,
    rating: "4.9",
    students: "2.1k",
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    title: "Python for Data Science",
    slug: "python-for-data-science",
    short_description: "Turn raw data into clear, useful insight.",
    description: "Learn a modern Python workflow for analysis, visualization and applied machine learning, with guided datasets and exercises throughout.",
    category: "Data Science",
    instructor_name: "Brooklyn Simmons",
    price: 3999,
    discount_price: 2799,
    currency: "INR",
    duration_minutes: 960,
    level: "Beginner",
    thumbnail_url: dataImage,
    learning_outcomes: ["Explore and clean real datasets", "Build clear data visualizations", "Create a first machine-learning model"],
    visibility: "published",
    is_free: false,
    access_duration_days: null,
    created_by: null,
    created_at: "2026-06-10T00:00:00.000Z",
    updated_at: "2026-06-10T00:00:00.000Z",
    cover: dataImage,
    rating: "4.8",
    students: "1.8k",
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    title: "Digital Marketing Strategy",
    slug: "digital-marketing-strategy",
    short_description: "Build campaigns with a clear point of view.",
    description: "Plan a complete digital strategy across audience research, brand storytelling, content and measurement. Finish with a campaign plan you can put to work.",
    category: "Marketing",
    instructor_name: "Wade Warren",
    price: 2999,
    discount_price: 1999,
    currency: "INR",
    duration_minutes: 600,
    level: "All levels",
    thumbnail_url: marketingImage,
    learning_outcomes: ["Define a sharp audience and offer", "Plan a thoughtful content engine", "Measure outcomes that matter"],
    visibility: "published",
    is_free: false,
    access_duration_days: null,
    created_by: null,
    created_at: "2026-06-08T00:00:00.000Z",
    updated_at: "2026-06-08T00:00:00.000Z",
    cover: marketingImage,
    rating: "4.7",
    students: "1.6k",
  },
  {
    id: "10000000-0000-4000-8000-000000000004",
    title: "Productivity & Time Management",
    slug: "productivity-time-management",
    short_description: "Make room for meaningful, focused work.",
    description: "A calm, practical system for priorities, focus sessions and sustainable routines—built for busy people who want more clarity in their week.",
    category: "Personal Growth",
    instructor_name: "Esther Howard",
    price: 1999,
    discount_price: 1299,
    currency: "INR",
    duration_minutes: 420,
    level: "All levels",
    thumbnail_url: heroImage,
    learning_outcomes: ["Set priorities with intention", "Build a reliable focus routine", "Protect your time and energy"],
    visibility: "published",
    is_free: false,
    access_duration_days: null,
    created_by: null,
    created_at: "2026-06-06T00:00:00.000Z",
    updated_at: "2026-06-06T00:00:00.000Z",
    cover: heroImage,
    rating: "4.9",
    students: "2.3k",
  },
];

export const categories = [
  { name: "Design", count: "120+", icon: "✳", tint: "bg-tint text-teal" },
  { name: "Development", count: "180+", icon: "⌘", tint: "bg-secondary text-primary" },
  { name: "Business", count: "100+", icon: "▣", tint: "bg-tint text-teal" },
  { name: "Marketing", count: "80+", icon: "↗", tint: "bg-secondary text-primary" },
  { name: "Data Science", count: "90+", icon: "▥", tint: "bg-tint text-teal" },
  { name: "Personal Growth", count: "60+", icon: "✿", tint: "bg-secondary text-primary" },
];

export function courseCover(course: Pick<Course, "slug" | "thumbnail_url" | "category">) {
  return courseImages[course.slug] ?? course.thumbnail_url ?? (course.category === "Marketing" ? marketingImage : designImage);
}

export function formatMoney(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}h ${remainder ? `${remainder}m` : ""}`.trim() : `${remainder}m`;
}