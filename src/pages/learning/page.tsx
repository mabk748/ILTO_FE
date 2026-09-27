import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import {
  getAssessmentAttempts,
  getBottlenecks,
  getDueCards,
  getLearningDashboard,
  getLearningGoals,
  getReadingList,
  getRoadmaps,
  getSkills,
  getStudySchedules,
  getStudySessions,
  getWeeklyReviews,
} from "@/lib/api/learning.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.tsx";
import LoadError from "@/components/LoadError.tsx";
import { useProjectsData } from "@/pages/projects/projects-data.ts";
import RoadmapList from "./_components/RoadmapList.tsx";
import ReviewQueue from "./_components/ReviewQueue.tsx";
import ReadingList from "./_components/ReadingList.tsx";
import LearningDashboardView from "./_components/LearningDashboardView.tsx";
import WeeklyPlanView from "./_components/WeeklyPlanView.tsx";
import BottleneckView from "./_components/BottleneckView.tsx";
import AssessmentsView from "./_components/AssessmentsView.tsx";
import WeeklyReviewsView from "./_components/WeeklyReviewsView.tsx";
import PhaseRoadmapView from "./_components/PhaseRoadmapView.tsx";
import { learningQueryKeys } from "./learning-query-keys.ts";

export default function LearningPage() {
  const dashboard = useQuery({
    queryKey: learningQueryKeys.dashboard,
    queryFn: ({ signal }) => getLearningDashboard({ signal }),
  });
  const goals = useQuery({
    queryKey: learningQueryKeys.goals,
    queryFn: ({ signal }) => getLearningGoals({ signal }),
  });
  const sessions = useQuery({
    queryKey: learningQueryKeys.sessions,
    queryFn: ({ signal }) => getStudySessions({}, { signal }),
  });
  const schedules = useQuery({
    queryKey: learningQueryKeys.schedules,
    queryFn: ({ signal }) => getStudySchedules(undefined, { signal }),
  });
  const assessments = useQuery({
    queryKey: learningQueryKeys.assessments,
    queryFn: ({ signal }) => getAssessmentAttempts(undefined, { signal }),
  });
  const bottlenecks = useQuery({
    queryKey: learningQueryKeys.bottlenecks,
    queryFn: ({ signal }) => getBottlenecks({}, { signal }),
  });
  const weeklyReviews = useQuery({
    queryKey: learningQueryKeys.weeklyReviews,
    queryFn: ({ signal }) => getWeeklyReviews(undefined, { signal }),
  });
  const projects = useProjectsData();

  const roadmaps = useQuery({
    queryKey: learningQueryKeys.roadmaps,
    queryFn: ({ signal }) => getRoadmaps({ signal }),
  });
  const skills = useQuery({
    queryKey: learningQueryKeys.skills,
    queryFn: ({ signal }) => getSkills(undefined, { signal }),
  });
  const dueCards = useQuery({
    queryKey: learningQueryKeys.dueCards,
    queryFn: ({ signal }) => getDueCards({ signal }),
  });
  const reading = useQuery({
    queryKey: learningQueryKeys.reading,
    queryFn: ({ signal }) => getReadingList({ signal }),
  });

  const queries = [
    dashboard,
    goals,
    schedules,
    sessions,
    assessments,
    bottlenecks,
    weeklyReviews,
    projects,
    roadmaps,
    skills,
    dueCards,
    reading,
  ];
  const error = queries.find((query) => query.error)?.error;
  const loading = queries.some((query) => query.isPending);
  const refetch = async () => {
    await Promise.all(queries.map((query) => query.refetch()));
  };
  const dueCount = dueCards.data?.length ?? 0;

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 shrink-0 text-primary" />
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Learning
            </h1>
            <p className="text-sm text-muted-foreground">
              Execute today, remove blockers, and monitor exam readiness.
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <LoadError error={error} onRetry={() => void refetch()} />
      ) : loading ||
        !dashboard.data ||
        !goals.data ||
        !schedules.data ||
        !sessions.data ||
        !assessments.data ||
        !bottlenecks.data ||
        !weeklyReviews.data ||
        !projects.data ||
        !roadmaps.data ||
        !skills.data ||
        !dueCards.data ||
        !reading.data ? (
        <div className="space-y-4" aria-label="Loading Learning plan">
          <Skeleton className="h-12 w-full" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-52 w-full" />
            <Skeleton className="h-52 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <Tabs defaultValue="dashboard">
          <TabsList
            className="h-auto w-full justify-start overflow-x-auto"
            variant="line"
          >
            <TabsTrigger value="dashboard">Today</TabsTrigger>
            <TabsTrigger value="week">Weekly plan</TabsTrigger>
            <TabsTrigger value="bottlenecks">What to study</TabsTrigger>
            <TabsTrigger value="assessments">Assessments</TabsTrigger>
            <TabsTrigger value="reviews">Weekly review</TabsTrigger>
            <TabsTrigger value="roadmap">FDE roadmap</TabsTrigger>
            <TabsTrigger value="resources">
              Resources{dueCount > 0 ? ` (${dueCount})` : ""}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-5">
            <LearningDashboardView
              dashboard={dashboard.data}
              goals={goals.data}
              projects={projects.data.projects}
            />
          </TabsContent>
          <TabsContent value="week" className="mt-5">
            <WeeklyPlanView
              schedules={schedules.data}
              sessions={sessions.data}
              goals={goals.data}
              projects={projects.data.projects}
            />
          </TabsContent>
          <TabsContent value="bottlenecks" className="mt-5">
            <BottleneckView
              bottlenecks={bottlenecks.data}
              goals={goals.data}
              assessments={assessments.data}
              projects={projects.data.projects}
            />
          </TabsContent>
          <TabsContent value="assessments" className="mt-5">
            <AssessmentsView
              goals={goals.data}
              assessments={assessments.data}
            />
          </TabsContent>
          <TabsContent value="reviews" className="mt-5">
            <WeeklyReviewsView
              reviews={weeklyReviews.data}
              goals={goals.data}
            />
          </TabsContent>
          <TabsContent value="roadmap" className="mt-5">
            <PhaseRoadmapView
              goals={goals.data}
              projects={projects.data.projects}
            />
          </TabsContent>
          <TabsContent value="resources" className="mt-5">
            <Tabs defaultValue="roadmaps">
              <TabsList>
                <TabsTrigger value="roadmaps">Roadmaps and skills</TabsTrigger>
                <TabsTrigger value="review">
                  Review queue{dueCount > 0 ? ` (${dueCount})` : ""}
                </TabsTrigger>
                <TabsTrigger value="reading">Reading</TabsTrigger>
              </TabsList>
              <TabsContent value="roadmaps" className="mt-4">
                <RoadmapList roadmaps={roadmaps.data} skills={skills.data} />
              </TabsContent>
              <TabsContent value="review" className="mt-4">
                <ReviewQueue cards={dueCards.data} />
              </TabsContent>
              <TabsContent value="reading" className="mt-4">
                <ReadingList entries={reading.data} />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
