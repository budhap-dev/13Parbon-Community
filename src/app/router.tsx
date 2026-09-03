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
import { PublicLayout } from './layouts/PublicLayout'

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
]

export function createAppRouter() {
  return createBrowserRouter(routes)
}
