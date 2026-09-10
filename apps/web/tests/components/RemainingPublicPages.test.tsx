import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AboutPage } from '../../src/app/pages/AboutPage'
import { PublicOrganizationListPage } from '../../src/features/organization/pages/PublicOrganizationListPage'
import { PublicUniversitiesPage } from '../../src/features/university/pages/PublicUniversitiesPage'
import i18n from '../../src/lib/i18n'

const response=(body:unknown,status=200)=>Promise.resolve(new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}}))
function renderPage(page:ReactNode){
  const queryClient=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}})
  return render(<MemoryRouter><QueryClientProvider client={queryClient}>{page}</QueryClientProvider></MemoryRouter>)
}

describe('remaining public pages',()=>{
  beforeEach(async()=>{await i18n.changeLanguage('en')})
  it('renders translated About and University marketing content',async()=>{
    renderPage(<><AboutPage/><PublicUniversitiesPage/></>)
    expect(screen.getByRole('heading',{name:/Building Better Connections/})).toBeInTheDocument()
    expect(screen.getByRole('heading',{name:'Benefits for Universities'})).toBeInTheDocument()
    expect(screen.getByRole('link',{name:'Get Started'})).toHaveAttribute('href','/register?role=university')
  },15_000)
  it('renders organizations from the real public organization directory and filters by type', async () => {
    // The directory endpoint is the source of truth — the page must not re-derive organizations
    // from the opportunity feed, and must not invent the counts the approved card footer shows.
    const fetchMock = vi.fn((url: unknown) => {
      const requested = String(url)
      const wantsNgo = requested.includes('type=NGO')
      const rows = wantsNgo ? [{"id":"org2","name":"Real NGO","slug":"real-ngo","type":"NGO","industry":null,"city":"Mogadishu","countryCode":"SO","shortDescription":"Real NGO description","description":null,"website":null,"verified":false,"hasLogo":false,"hasCover":false,"openOpportunityCount":2}] : [{"id":"org1","name":"Real Company","slug":"real-company","type":"COMPANY","industry":null,"city":"Mogadishu","countryCode":"SO","shortDescription":"Real Company description","description":null,"website":null,"verified":true,"hasLogo":false,"hasCover":false,"openOpportunityCount":7}, {"id":"org2","name":"Real NGO","slug":"real-ngo","type":"NGO","industry":null,"city":"Mogadishu","countryCode":"SO","shortDescription":"Real NGO description","description":null,"website":null,"verified":false,"hasLogo":false,"hasCover":false,"openOpportunityCount":2}]
      return response({ content: rows, page: 0, size: 12, totalElements: rows.length, totalPages: 1 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderPage(<PublicOrganizationListPage />)

    expect(await screen.findByText('Real Company')).toBeInTheDocument()
    expect(screen.getByText('Real NGO')).toBeInTheDocument()
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/public/organizations')
    expect(screen.getByText('7 open opportunities')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Organization type'), 'NGO')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(await screen.findByText('Real NGO')).toBeInTheDocument()
    expect(screen.queryByText('Real Company')).not.toBeInTheDocument()
  })
  it('shows the organization API error state',async()=>{
    vi.stubGlobal('fetch',vi.fn(()=>response({code:'ERROR',message:'failed'},500)))
    renderPage(<PublicOrganizationListPage/>)
    expect(await screen.findByText('Organizations could not be loaded.')).toBeInTheDocument()
  })
  it('renders Somali public-page headings',async()=>{
    await i18n.changeLanguage('so');renderPage(<AboutPage/>)
    expect(screen.getByRole('heading',{name:/Dhisidda Xidhiidh Wanaagsan/})).toBeInTheDocument()
  })
})
