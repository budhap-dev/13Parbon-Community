import { createBrowserRouter, type RouteObject } from 'react-router'
import { EventPage, EventsPage } from '@/features/events'
import { HomePage } from '@/features/home'
import { ArticlePage, NewsPage } from '@/features/news'
import { ComingSoonPage, NotFoundPage } from '@/features/placeholder'
import { PublicLayout } from './layouts/PublicLayout'

export const routes: RouteObject[] = [
  {
    path: '/',
    Component: PublicLayout,
    children: [
      { index: true, Component: HomePage },
      { path: 'events', Component: EventsPage },
      { path: 'events/:slug', Component: EventPage },
      { path: 'gallery', element: <ComingSoonPage title="Gallery" /> },
      { path: 'news', Component: NewsPage },
      { path: 'news/:slug', Component: ArticlePage },
      { path: 'about', element: <ComingSoonPage title="About us" /> },
      { path: 'contact', element: <ComingSoonPage title="Contact us" /> },
      { path: 'join', element: <ComingSoonPage title="Join the community" /> },
      { path: 'login', element: <ComingSoonPage title="Member login" /> },
      { path: 'privacy', element: <ComingSoonPage title="Privacy" /> },
      { path: '*', Component: NotFoundPage },
    ],
  },
]

export function createAppRouter() {
  return createBrowserRouter(routes)
}
