import { useTheme } from '../../lib/theme/useTheme'
import { useTranslation } from 'react-i18next'
import { Icon } from './Icon'
import { IconButton } from './IconButton'
export function ThemeToggle({className}:{className?:string}){const {t}=useTranslation();const {theme,toggleTheme}=useTheme();return <IconButton className={className} label={t(theme==='light'?'common:theme.useDark':'common:theme.useLight')} onClick={toggleTheme}><Icon name={theme==='light'?'moon':'sun'} className="size-5"/></IconButton>}
