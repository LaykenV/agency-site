'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { flushSync } from 'react-dom'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

interface AnimatedThemeTogglerProps {
  className?: string
  duration?: number
}

export const AnimatedThemeToggler = ({ className, duration = 400 }: AnimatedThemeTogglerProps) => {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = useCallback(async () => {
    const btn = buttonRef.current
    if (!btn) return

    const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const supportsVT = 'startViewTransition' in document
    
    // Determine the next theme
    const currentTheme = resolvedTheme || theme
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark'

    // If View Transitions are not supported or user prefers reduced motion, just switch
    if (!supportsVT || prefersReduce) {
      setTheme(nextTheme)
      return
    }

    // Use View Transition API for smooth animation
    await document.startViewTransition(() => {
      flushSync(() => {
        setTheme(nextTheme)
      })
    }).ready

    const { top, left, width, height } = btn.getBoundingClientRect()
    const x = left + width / 2
    const y = top + height / 2
    const maxRadius = Math.hypot(
      Math.max(left, window.innerWidth - left),
      Math.max(top, window.innerHeight - top)
    )

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${maxRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration,
        easing: 'ease-in-out',
        pseudoElement: '::view-transition-new(root)',
      }
    )
  }, [theme, resolvedTheme, setTheme, duration])

  // Prevent flash during SSR
  if (!mounted) {
    return (
      <button ref={buttonRef} className={cn('btn-icon', className)} aria-label="Toggle theme">
        <Sun />
      </button>
    )
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <button ref={buttonRef} onClick={toggleTheme} className={cn('btn-icon', className)} aria-label="Toggle theme">
      {isDark ? <Sun /> : <Moon />}
    </button>
  )
}
