import { createBrowserRouter, type RouteObject } from 'react-router'
import { HomePage } from '@/features/home'
import { ComingSoonPage, NotFoundPage } from '@/features/placeholder'
import { PublicLayout } from './layouts/PublicLayout'

export const routes: RouteObject[] = [
  {
    path: '/',
    Component: PublicLayout,
    children: [
      { index: true, Component: HomePage },
      { path: 'events', element: <ComingSoonPage title="Events" /> },
      { path: 'events/:slug', element: <ComingSoonPage title="Event" /> },
      { path: 'gallery', element: <ComingSoonPage title="Gallery" /> },
      { path: 'news', element: <ComingSoonPage title="News & announcements" /> },
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
