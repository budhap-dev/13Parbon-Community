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
import { SponsorsPage } from '@/features/sponsors'
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
  AdminNoticesPage,
  AdminOverviewPage,
  AdminPeoplePage,
  AdminSponsorsPage,
  AdminWritingPage,
} from '@/features/admin'
import { DashboardPage, HelpPage, HouseholdPage } from '@/features/portal'
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
      {
        // The sponsors, their logos on the home page and "sponsored by" on the evenings, all
        // behind the one switch.
        element: <SectionGate setting="showSponsors" />,
        children: [{ path: 'sponsors', Component: SponsorsPage }],
      },
      { path: 'about', Component: AboutPage },
      { path: 'contact', Component: ContactPage },
      { path: 'login', Component: LoginPage },
      { path: 'privacy', Component: PrivacyPage },
      { path: '*', Component: NotFoundPage },
    ],
  },
  {
    // The portal's own failures — a screen that would not render, a route that broke — answer
    // with the same panel as the public site rather than the router's bare default.
    Component: RequireSession,
    ErrorBoundary: RouteError,
    children: [
      {
        Component: PortalLayout,
        children: [
          { path: '/portal', Component: DashboardPage },
          { path: '/portal/household', Component: HouseholdPage },
          { path: '/portal/play', Component: PlayPage },
          { path: '/portal/play/:id', Component: PortalQuizPage },
          { path: '/portal/help', Component: HelpPage },
        ],
      },
    ],
  },
  {
    element: <RequireSession role="admin" />,
    ErrorBoundary: RouteError,
    children: [
      {
        Component: PortalLayout,
        children: [
          { path: '/admin', Component: AdminOverviewPage },
          { path: '/admin/people', Component: AdminPeoplePage },
          { path: '/admin/events', Component: AdminEventsPage },
          { path: '/admin/notices', Component: AdminNoticesPage },
          { path: '/admin/writing', Component: AdminWritingPage },
          { path: '/admin/content', Component: AdminContentPage },
          { path: '/admin/sponsors', Component: AdminSponsorsPage },
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
