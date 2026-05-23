import { useEffect, useRef, useState } from 'react'

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function useAnimatedCounter(target: number, duration = 800): number {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const start = performance.now()

    const animate = (now: number) => {
      const elapsed  = now - start
      const progress = Math.min(elapsed / duration, 1)
      setValue(target * easeOutCubic(progress))
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
      else setValue(target)
    }

    setValue(0)
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return value
}
