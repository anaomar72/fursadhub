import { useTheme } from '../../lib/theme/useTheme'
import { Icon } from './Icon'
import { IconButton } from './IconButton'
export function ThemeToggle({className}:{className?:string}){const {theme,toggleTheme}=useTheme();return <IconButton className={className} label={theme==='light'?'Use dark theme':'Use light theme'} onClick={toggleTheme}><Icon name={theme==='light'?'moon':'sun'} className="size-5"/></IconButton>}
