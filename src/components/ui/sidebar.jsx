import * as React from 'react'
import { cn } from '../../lib/utils'

export function Sidebar({ className, header, children }){
  return (
    <aside className={cn('border-r border-neutral-200 bg-white', className)}>
      {header && (
        <div className="px-4 py-3 border-b border-neutral-200">{header}</div>
      )}
      <div className="h-[calc(100vh-48px)]">
        {children}
      </div>
    </aside>
  )
}