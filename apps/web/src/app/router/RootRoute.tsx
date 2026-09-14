import { Outlet, ScrollRestoration } from 'react-router-dom'

/**
 * The pathless route every other route sits inside, so the application has one place to put
 * behaviour that belongs to navigation itself rather than to any page.
 *
 * <p>Today that is exactly one thing: scroll position.
 *
 * <p><strong>Why this was needed.</strong> `createBrowserRouter` does not manage scroll at all —
 * unlike a real page load, a client-side navigation only swaps the DOM, and the browser leaves the
 * scroll offset exactly where it was. Opening an internship from halfway down the listing therefore
 * dropped the reader into the middle of the detail page, typically past the title and the apply
 * panel, with no indication that anything above them existed. The page was not broken; it was
 * simply never shown from the top.
 *
 * <p><strong>Why `ScrollRestoration` rather than a scrollTo effect.</strong> The naive fix — scroll
 * to top whenever the pathname changes — also destroys the one case where the previous position is
 * the correct one: pressing Back. `ScrollRestoration` distinguishes them, because the data router
 * knows the navigation type. A PUSH (following a link) starts at the top; a POP (Back or Forward)
 * restores the offset that location was left at. That is the behaviour a reader already expects
 * from every other website, and it is the browser's own behaviour on a full page load.
 *
 * <p>It restores per LOCATION KEY, not per pathname, so two visits to the same URL arrived at
 * differently keep their own offsets, and a filter change that only rewrites the query string does
 * not throw the reader back to the top mid-scroll.
 */
export function RootRoute() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  )
}
