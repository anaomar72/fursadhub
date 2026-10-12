import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PublicProfileHeader } from '../../src/components/ui/PublicProfileHeader'
import { ProfileBanner } from '../../src/components/ui/ProfileBanner'
import '../../src/lib/i18n'

describe('public profile media', () => {
 it('recovers when a failed source is replaced on the same mounted banner', () => {
  const {rerender}=render(<ProfileBanner coverUrl="/old.png" imageLabel="Cover" viewLabel="View cover" variant="public"/>)
  fireEvent.error(screen.getByRole('img',{name:'Cover'}))
  expect(screen.queryByRole('img',{name:'Cover'})).not.toBeInTheDocument()
  expect(screen.queryByRole('link',{name:'View cover'})).not.toBeInTheDocument()
  rerender(<ProfileBanner coverUrl="/new.png" imageLabel="Cover" viewLabel="View cover" variant="public"/>)
  expect(screen.getByRole('img',{name:'Cover'})).toHaveAttribute('src','/new.png')
  expect(screen.getByRole('link',{name:'View cover'})).toHaveAttribute('href','/new.png')
 })
 it.each([[true,true],[true,false],[false,true],[false,false]])('preserves identity with cover %s and logo %s', (cover,logo) => {
  render(<PublicProfileHeader name="A long university name" verified coverUrl={cover?'/cover.png':undefined} logoUrl={logo?'/logo.png':undefined} actions={<button>Existing action</button>}/>)
  expect(screen.getByRole('heading',{level:1,name:'A long university name'})).toBeInTheDocument()
  expect(screen.getByRole('button',{name:'Existing action'})).toBeInTheDocument()
  expect(screen.getByText('Verified')).toBeInTheDocument()
  expect(screen.queryByRole('img',{name:'A long university name cover image'})!==null).toBe(cover)
 })
})
