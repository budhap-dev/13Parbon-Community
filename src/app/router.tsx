import { createBrowserRouter, type RouteObject } from 'react-router'
import { AboutPage } from '@/features/about'
import { ContactPage } from '@/features/contact'
import { EventPage, EventsPage } from '@/features/events'
import { AlbumPage, GalleryPage } from '@/features/gallery'
import { LoginPage } from '@/features/membership'
import { PrivacyPage } from '@/features/privacy'
import { HomePage } from '@/features/home'
import { ArticlePage, NewsPage } from '@/features/news'
import { NotFoundPage } from '@/features/placeholder'
import { AdminContentPage, AdminEventsPage, AdminMessagesPage, AdminOverviewPage, AdminPeoplePage } from '@/features/admin'
import { DashboardPage, DirectoryPage, DocumentsPage, HouseholdPage } from '@/features/portal'
import { PortalLayout } from './layouts/PortalLayout'
import { PublicLayout } from './layouts/PublicLayout'
import { RequireSession } from './layouts/RequireSession'

export const routes: RouteObject[] = [
  {
    path: '/',
    Component: PublicLayout,
    children: [
      { index: true, Component: HomePage },
      { path: 'events', Component: EventsPage },
      { path: 'events/:slug', Component: EventPage },
      { path: 'gallery', Component: GalleryPage },
      { path: 'gallery/:slug', Component: AlbumPage },
      { path: 'news', Component: NewsPage },
      { path: 'news/:slug', Component: ArticlePage },
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
          { path: '/portal/directory', Component: DirectoryPage },
          { path: '/portal/documents', Component: DocumentsPage },
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
          { path: '/admin/messages', Component: AdminMessagesPage },
        ],
      },
    ],
  },
]

export function createAppRouter() {
  return createBrowserRouter(routes)
}
