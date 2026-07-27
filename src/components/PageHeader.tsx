import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface PageHeaderProps {
  title: string
  icon?: LucideIcon
  description?: ReactNode
  actions?: ReactNode
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, icon: Icon, description, actions }) => (
  <div className="mb-4 flex min-h-11 items-start justify-between gap-4">
    <div className="min-w-0">
      <h2 className="flex items-center gap-2.5 text-xl font-bold text-green-800">
        {Icon && <Icon size={20} strokeWidth={2} className="shrink-0" />}
        {title}
      </h2>
      {description && <div className="mt-1 text-sm text-green-900/70">{description}</div>}
    </div>
    {actions && <div className="shrink-0">{actions}</div>}
  </div>
)
