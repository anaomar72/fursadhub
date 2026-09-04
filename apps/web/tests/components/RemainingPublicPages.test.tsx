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
  it('builds organizations only from real public opportunity responses and filters by type',async()=>{
    vi.stubGlobal('fetch',vi.fn(()=>response({content:[{id:'o1',organization:{id:'org1',name:'Real Company',slug:'real',type:'COMPANY',verified:true},title:'Intern',description:'Role',mode:'PUBLIC',numberOfOpenings:1,workMode:'REMOTE',location:null,startDate:'2027-01-01',endDate:'2027-02-01',applicationDeadline:null,publishedAt:null},{id:'o2',organization:{id:'org2',name:'Real NGO',slug:'ngo',type:'NGO',verified:false},title:'Intern',description:'Role',mode:'PUBLIC',numberOfOpenings:1,workMode:'REMOTE',location:null,startDate:'2027-01-01',endDate:'2027-02-01',applicationDeadline:null,publishedAt:null}],page:0,size:50,totalElements:2,totalPages:1})))
    const user=userEvent.setup();renderPage(<PublicOrganizationListPage/>)
    expect(await screen.findByText('Real Company')).toBeInTheDocument()
    expect(screen.getByText('Real NGO')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Organization type'),'NGO')
    expect(screen.queryByText('Real Company')).not.toBeInTheDocument()
    expect(screen.getByText('Real NGO')).toBeInTheDocument()
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
