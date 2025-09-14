import * as React from 'react'
import { cn } from '../../lib/utils'

export function ScrollArea({ className, style, children }){
  return (
    <div className={cn('overflow-auto', className)} style={style}>
      {children}
    </div>
  )
}
