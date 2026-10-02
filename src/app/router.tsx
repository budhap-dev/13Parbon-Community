import { createBrowserRouter, type RouteObject } from 'react-router'
import { RouteError } from '@/components/RouteError'
import { AboutPage } from '@/features/about'
import { ContactPage } from '@/features/contact'
import { EventPage, EventPreviewPage, EventsPage } from '@/features/events'
import { FeedbackPage } from '@/features/feedback'
import { AlbumPage, GalleryPage } from '@/features/gallery'
import { LoginPage } from '@/features/membership'
import { PrivacyPage } from '@/features/privacy'
import { HomePage } from '@/features/home'
import { ArticlePage, NewsPage } from '@/features/news'
import { NotFoundPage } from '@/features/placeholder'
import { AdminPlayPage, PlayPage, PortalQuizPage, QuizPage, QuizzesPage } from '@/features/play'
import { SectionGate } from './SectionGate'
import {
  AdminAuditPage,
  AdminContentPage,
  AdminEventsPage,
  AdminFeedbackPage,
  AdminMediaPage,
  AdminMessagesPage,
  AdminOverviewPage,
  AdminPeoplePage,
} from '@/features/admin'
import { DashboardPage, HouseholdPage } from '@/features/portal'
import { PortalLayout } from './layouts/PortalLayout'
import { PublicLayout } from './layouts/PublicLayout'
import { RequireSession } from './layouts/RequireSession'

export const routes: RouteObject[] = [
  {
    path: '/',
    Component: PublicLayout,
    ErrorBoundary: RouteError,
    children: [
      { index: true, Component: HomePage },
      { path: 'events', Component: EventsPage },
      { path: 'events/:slug', Component: EventPage },
      { path: 'preview/event', Component: EventPreviewPage },
      {
        // Both sections answer as though they were not there while their switch is off, which
        // is what the switch says it does. See SectionGate.
        element: <SectionGate setting="showPhotos" />,
        children: [
          { path: 'gallery', Component: GalleryPage },
          { path: 'gallery/:slug', Component: AlbumPage },
        ],
      },
      {
        element: <SectionGate setting="showNews" />,
        children: [
          { path: 'news', Component: NewsPage },
          { path: 'news/:slug', Component: ArticlePage },
        ],
      },
      {
        // Off by default. Turning it off takes the page with it, not merely the link: a page
        // still answering with what strangers wrote is not a section the committee has
        // switched off, whatever the switch said.
        element: <SectionGate setting="showFeedback" />,
        children: [{ path: 'feedback', Component: FeedbackPage }],
      },
      {
        // Quizzes opened to everyone. Members play every quiz in the portal whatever this says.
        element: <SectionGate setting="showQuizzes" />,
        children: [
          { path: 'quizzes', Component: QuizzesPage },
          { path: 'quizzes/:id', Component: QuizPage },
        ],
      },
      { path: 'about', Component: AboutPage },
      { path: 'contact', Component: ContactPage },
      { path: 'login', Component: LoginPage },
      { path: 'privacy', Component: PrivacyPage },
      { path: '*', Component: NotFoundPage },
    ],
  },
  {
    Component: RequireSession,
    children: [
      {
        Component: PortalLayout,
        children: [
          { path: '/portal', Component: DashboardPage },
          { path: '/portal/household', Component: HouseholdPage },
          { path: '/portal/play', Component: PlayPage },
          { path: '/portal/play/:id', Component: PortalQuizPage },
        ],
      },
    ],
  },
  {
    element: <RequireSession role="admin" />,
    children: [
      {
        Component: PortalLayout,
        children: [
          { path: '/admin', Component: AdminOverviewPage },
          { path: '/admin/people', Component: AdminPeoplePage },
          { path: '/admin/events', Component: AdminEventsPage },
          { path: '/admin/content', Component: AdminContentPage },
          { path: '/admin/media', Component: AdminMediaPage },
          { path: '/admin/messages', Component: AdminMessagesPage },
          { path: '/admin/feedback', Component: AdminFeedbackPage },
          { path: '/admin/play', Component: AdminPlayPage },
          { path: '/admin/audit', Component: AdminAuditPage },
        ],
      },
    ],
  },
]

export function createAppRouter() {
  return createBrowserRouter(routes)
}
