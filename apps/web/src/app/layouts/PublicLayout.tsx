import { Outlet } from 'react-router-dom'
import { PublicFooter } from './PublicFooter'
import { PublicHeader } from './PublicHeader'

export function PublicLayout(){return <div className="flex min-h-svh min-w-0 flex-col overflow-x-clip bg-background"><PublicHeader/><main className="min-w-0 flex-1"><Outlet/></main><PublicFooter/></div>}
