// ============================================================
// Proposed frontend/backend contract. The backend is implemented separately.
// See docs/backend-api.md for routes, payloads, and response conventions.
// ============================================================

export type ISODateString = string; // ISO 8601 UTC
export type CalendarDateString = string; // YYYY-MM-DD, no timezone conversion

// --- SHARED ---
export type DomainName =
  | "projects"
  | "infrastructure"
  | "health"
  | "finances"
  | "learning"
  | "work"
  | "social"
  | "appearance"
  | "logistics";

export type Priority = "low" | "medium" | "high" | "critical";
export type Status = "active" | "paused" | "completed" | "archived";

// --- PROJECTS DOMAIN ---
export type ProjectStatus =
  "planning" | "active" | "on_hold" | "completed" | "archived";
export type SprintStatus = "planned" | "active" | "completed";
export type TaskStatus = "backlog" | "todo" | "in_progress" | "review" | "done";

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: Priority;
  start_date: CalendarDateString;
  end_date: CalendarDateString | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface Sprint {
  id: string;
  project_id: string;
  name: string;
  goal: string;
  status: SprintStatus;
  start_date: CalendarDateString;
  end_date: CalendarDateString;
  velocity: number;
  created_at: ISODateString;
}

export interface Task {
  id: string;
  sprint_id: string | null;
  project_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assignee: string | null;
  story_points: number;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description: string;
  due_date: CalendarDateString;
  completed_at: ISODateString | null;
  created_at: ISODateString;
}

// --- INFRASTRUCTURE DOMAIN ---
export type NodeStatus = "online" | "degraded" | "offline";

export interface InfraNode {
  id: string;
  name: string;
  hostname: string;
  type: "laptop" | "server" | "raspberry_pi" | "mobile";
  status: NodeStatus;
  ip_address: string;
  os: string;
  last_seen: ISODateString | null;
}

export interface SystemMetric {
  id: string;
  node_id: string;
  timestamp: ISODateString;
  cpu_percent: number;
  ram_percent: number;
  disk_percent: number;
  uptime_seconds: number;
  temperature_celsius: number | null;
}

export interface GitActivity {
  id: string;
  repo: string;
  branch: string;
  commits_today: number;
  commits_week: number;
  last_commit_at: ISODateString;
  velocity_score: number; // 0-100
}

// --- HEALTH DOMAIN ---
export type WorkoutType =
  "strength" | "cardio" | "flexibility" | "hiit" | "rest";

export interface TrainingPlan {
  id: string;
  name: string;
  goal: string;
  weeks_total: number;
  week_current: number;
  status: Status;
  created_at: ISODateString;
}

export interface WorkoutSession {
  id: string;
  plan_id: string | null;
  type: WorkoutType;
  name: string;
  duration_minutes: number;
  completed_at: ISODateString;
  notes: string;
  rpe: number; // Rate of Perceived Exertion 1-10
}

export interface HealthMetric {
  id: string;
  date: ISODateString;
  weight_kg: number | null;
  sleep_hours: number | null;
  resting_hr: number | null;
  hrv: number | null;
  steps: number | null;
  calories_consumed: number | null;
}

// --- FINANCES DOMAIN ---
export type TransactionType = "income" | "expense" | "transfer" | "investment";
export type FinanceCurrency = "EUR" | "MAD" | "USD";
export type PaymentType =
  | "cash"
  | "bank_transfer"
  | "card"
  | "mobile_payment"
  | "direct_debit"
  | "other";
export type AssetClass =
  "cash" | "equity" | "crypto" | "real_estate" | "bond" | "other";

export interface BudgetCategory {
  id: string;
  name: string;
  monthly_limit: number;
  spent_this_month: number;
  currency: FinanceCurrency;
  color: string;
}

export interface Transaction {
  id: string;
  category_id: string;
  type: TransactionType;
  amount: number;
  currency: FinanceCurrency;
  payment_type: PaymentType;
  description: string;
  date: ISODateString;
  tags: string[];
}

export interface TradeEntry {
  id: string;
  ticker: string;
  asset_class: AssetClass;
  action: "buy" | "sell";
  quantity: number;
  price: number;
  currency: FinanceCurrency;
  date: ISODateString;
  notes: string;
}

export interface NetWorthSnapshot {
  id: string;
  date: ISODateString;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  currency: FinanceCurrency;
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  currency: FinanceCurrency;
  due_date: ISODateString;
  recurrence: "monthly" | "quarterly" | "annual" | "one_time";
  paid: boolean;
  category: string;
}

// --- LEARNING DOMAIN ---
export type SkillLevel = "beginner" | "intermediate" | "advanced" | "expert";

export interface LearningRoadmap {
  id: string;
  name: string;
  goal: string;
  skills_total: number;
  skills_completed: number;
  status: Status;
  created_at: ISODateString;
}

export interface SkillNode {
  id: string;
  roadmap_id: string;
  name: string;
  category: string;
  current_level: SkillLevel;
  target_level: SkillLevel;
  gap_score: number; // 0-100
  resources: string[];
}

export interface SpacedRepetitionCard {
  id: string;
  topic: string;
  question: string;
  answer: string;
  ease_factor: number; // SM-2
  interval_days: number;
  next_review: ISODateString;
  times_reviewed: number;
}

export interface ReadingEntry {
  id: string;
  title: string;
  author: string;
  pages_total: number;
  pages_read: number;
  words_per_minute: number;
  started_at: ISODateString;
  completed_at: ISODateString | null;
  tags: string[];
}

export type LearningGoalType =
  "certification" | "language" | "course" | "skill";
export type LearningGoalStatus = "planned" | "active" | "paused" | "completed";
export type StudySessionType =
  | "study"
  | "practice_questions"
  | "mock_exam"
  | "practical_project"
  | "review"
  | "language"
  | "other";
export type AssessmentType =
  "baseline" | "question_set" | "mock_exam" | "real_exam";
export type BottleneckStatus = "open" | "improving" | "resolved";
export type LearningMilestoneStatus = "planned" | "completed";

export interface LearningGoal {
  id: string;
  title: string;
  provider: string;
  type: LearningGoalType;
  status: LearningGoalStatus;
  start_date: CalendarDateString;
  target_date: CalendarDateString | null;
  exam_date: CalendarDateString | null;
  phase: string | null;
  description: string;
  priority: Priority;
  linked_project_id: string | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface StudySchedule {
  id: string;
  learning_goal_id: string;
  weekday: number;
  session_type: StudySessionType;
  planned_minutes: number;
  topic: string;
  notes: string;
  start_date: CalendarDateString;
  end_date: CalendarDateString | null;
  active: boolean;
  linked_project_id: string | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface StudySession {
  id: string;
  learning_goal_id: string;
  date: CalendarDateString;
  session_type: StudySessionType;
  planned_minutes: number;
  actual_minutes: number;
  topic: string;
  notes: string;
  completed: boolean;
  linked_project_id: string | null;
  bottleneck_id: string | null;
  study_schedule_id: string | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface AssessmentAttempt {
  id: string;
  learning_goal_id: string;
  date: CalendarDateString;
  assessment_type: AssessmentType;
  score_percent: number;
  source: string | null;
  notes: string;
  duration_minutes: number | null;
  created_at: ISODateString;
}

export interface LearningBottleneck {
  id: string;
  learning_goal_id: string;
  assessment_attempt_id: string | null;
  topic: string;
  description: string;
  priority: Priority;
  status: BottleneckStatus;
  created_at: ISODateString;
  resolved_at: ISODateString | null;
}

export interface LearningMilestone {
  id: string;
  learning_goal_id: string;
  title: string;
  target_date: CalendarDateString;
  completed_at: ISODateString | null;
  status: LearningMilestoneStatus;
  created_at: ISODateString;
}

export interface WeeklyReview {
  id: string;
  week_start: CalendarDateString;
  learning_goal_id: string | null;
  learned: string;
  can_do_now: string;
  main_bottleneck: string;
  applied_to_project: string;
  next_week_focus: string;
  notes: string;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface AssessmentScorePoint {
  learning_goal_id: string;
  date: CalendarDateString;
  score_percent: number;
}

export interface UpcomingLearningDate {
  id: string;
  learning_goal_id: string;
  title: string;
  date: CalendarDateString;
  kind: "milestone" | "exam";
}

export interface LearningNextFocus {
  kind: "bottleneck" | "milestone" | "study_session";
  id: string;
  learning_goal_id: string;
  title: string;
  detail: string;
  target_date: CalendarDateString | null;
}

export interface LearningDashboard {
  active_goals: LearningGoal[];
  today_sessions: StudySession[];
  week_sessions: StudySession[];
  minutes_planned: number;
  minutes_completed: number;
  latest_assessment: AssessmentAttempt | null;
  assessment_score_history: AssessmentScorePoint[];
  open_bottlenecks: LearningBottleneck[];
  upcoming_dates: UpcomingLearningDate[];
  latest_weekly_review: WeeklyReview | null;
  linked_project_activity: StudySession[];
  next_focus: LearningNextFocus | null;
}

export interface LearningGoalProgress {
  goal: LearningGoal;
  total_study_minutes: number;
  weekly_study_minutes: number;
  assessment_score_history: AssessmentScorePoint[];
  open_bottlenecks: LearningBottleneck[];
  resolved_bottlenecks: LearningBottleneck[];
  milestones: LearningMilestone[];
  milestones_completed: number;
  milestones_total: number;
  recent_sessions: StudySession[];
  practical_project_sessions: StudySession[];
  next_focus: LearningNextFocus | null;
}

// --- WORK DOMAIN ---
export type CertStatus = "planned" | "in_progress" | "completed" | "expired";

export interface CareerMilestone {
  id: string;
  title: string;
  description: string;
  target_date: ISODateString;
  completed_at: ISODateString | null;
  category: "role" | "skill" | "certification" | "project" | "network";
}

export interface Certification {
  id: string;
  name: string;
  provider: string;
  status: CertStatus;
  exam_date: ISODateString | null;
  expiry_date: ISODateString | null;
  study_hours_logged: number;
  study_hours_target: number;
}

export interface WorkDeadline {
  id: string;
  title: string;
  project_or_context: string;
  due_date: ISODateString;
  priority: Priority;
  status: "pending" | "completed" | "overdue";
  notes: string;
}

export interface ComplianceItem {
  id: string;
  category: string;
  title: string;
  description: string;
  due_date: ISODateString | null;
  completed: boolean;
  recurrence: string | null;
}

// --- SOCIAL DOMAIN ---
export type ContactStatus = "active" | "dormant" | "lost";
export type RelationshipType =
  "professional" | "personal" | "mentor" | "mentee" | "client";

export interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  relationship: RelationshipType;
  status: ContactStatus;
  last_contact: ISODateString | null;
  next_followup: ISODateString | null;
  notes: string;
  tags: string[];
}

export interface NetworkingGoal {
  id: string;
  title: string;
  target_contacts: number;
  current_contacts: number;
  due_date: ISODateString;
  status: Status;
}

export interface FollowUpPrompt {
  id: string;
  contact_id: string;
  contact_name: string;
  prompt: string;
  due_date: ISODateString;
  completed: boolean;
  priority: Priority;
}

// --- APPEARANCE DOMAIN ---
export type ClothingCategory =
  | "tops"
  | "bottoms"
  | "outerwear"
  | "footwear"
  | "accessories"
  | "formal"
  | "activewear";
export type WardrobeCondition =
  "excellent" | "good" | "worn" | "needs_repair" | "retired";
export type Season = "spring" | "summer" | "autumn" | "winter" | "all_season";

export interface WardrobeItem {
  id: string;
  name: string;
  brand: string | null;
  category: ClothingCategory;
  color: string;
  season: Season;
  condition: WardrobeCondition;
  times_worn: number;
  last_worn: ISODateString | null;
  purchase_date: ISODateString | null;
  purchase_price: number | null;
  tags: string[];
  image_placeholder: string;
}

export interface OutfitLog {
  id: string;
  date: ISODateString;
  item_ids: string[];
  occasion: string;
  rating: number;
  notes: string;
}

export interface GroomingRoutine {
  id: string;
  name: string;
  frequency: "daily" | "weekly" | "bi_weekly" | "monthly";
  duration_minutes: number;
  last_done: ISODateString | null;
  next_due: ISODateString;
  streak_days: number;
  category:
    "skincare" | "haircare" | "fitness" | "hygiene" | "dental" | "other";
  steps: string[];
}

export interface AppearanceSpend {
  id: string;
  date: ISODateString;
  item_name: string;
  category: ClothingCategory | "grooming" | "accessories";
  amount: number;
  currency: string;
  notes: string;
}

// --- LOGISTICS DOMAIN ---
export type TripStatus =
  "planned" | "confirmed" | "active" | "completed" | "cancelled";
export type DocumentType =
  | "passport"
  | "id_card"
  | "drivers_license"
  | "visa"
  | "insurance"
  | "subscription"
  | "certification"
  | "other";

export interface Trip {
  id: string;
  name: string;
  destination: string;
  status: TripStatus;
  departure_date: ISODateString;
  return_date: ISODateString;
  notes: string;
  tags: string[];
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  type: "travel" | "admin" | "renewal" | "custom";
  items: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  category: string;
  priority: Priority;
}

export interface DocumentRecord {
  id: string;
  name: string;
  type: DocumentType;
  issuer: string | null;
  issue_date: ISODateString | null;
  expiry_date: ISODateString | null;
  days_until_expiry: number | null;
  renewal_lead_days: number;
  notes: string;
  status: "valid" | "expiring_soon" | "expired";
}

export interface LogisticsEvent {
  id: string;
  title: string;
  type: "trip" | "appointment" | "renewal" | "admin" | "reminder";
  date: ISODateString;
  end_date: ISODateString | null;
  notes: string;
  linked_trip_id: string | null;
  completed: boolean;
}

// --- API RESPONSE WRAPPER ---
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
