export function Button({ className = '', ...props }){
  const cls = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-black text-white hover:bg-neutral-800 h-9 px-4 py-2 ' + className
  return <button className={cls} {...props} />
}
