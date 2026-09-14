import { RouterProvider } from 'react-router-dom'
import { AppProviders } from './app/providers/AppProviders'
import { RouteSuspense } from './app/router/RouteFallback'
import { router } from './app/router'

function App() {
  return (
    <AppProviders>
      {/*
        The outermost route boundary. Each layout wraps its own <Outlet /> so a page chunk only
        ever blanks the content column, never the rail or the header — but the area LAYOUTS are
        themselves lazily loaded, and those sit above every one of those inner boundaries. This
        catches them, so a first navigation into a portal has somewhere to suspend.
      */}
      <RouteSuspense>
        <RouterProvider router={router} />
      </RouteSuspense>
    </AppProviders>
  )
}

export default App
