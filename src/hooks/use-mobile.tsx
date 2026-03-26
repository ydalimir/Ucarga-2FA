import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkSize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    // Check on initial mount
    checkSize();

    // Set up event listener for window resize
    window.addEventListener("resize", checkSize)

    // Clean up event listener
    return () => window.removeEventListener("resize", checkSize)
  }, [])

  return isMobile
}
