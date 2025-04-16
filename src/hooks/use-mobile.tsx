
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Combined detection for most accurate results
    const detectMobile = () => {
      // 1. Check screen width
      const isMobileByWidth = window.innerWidth < MOBILE_BREAKPOINT;
      
      // 2. Check user agent for mobile devices
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileByAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|mobile safari|tablet|iPad|playbook|silk/.test(userAgent);
      
      // 3. Check for touch support (most mobile devices have touch)
      const isMobileByTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // 4. Check for specific mobile browser features
      const isMobileByOrientation = typeof window.orientation !== 'undefined';
      
      // Consider a device mobile if at least two of these checks pass
      const checks = [isMobileByWidth, isMobileByAgent, isMobileByTouch, isMobileByOrientation];
      const trueChecks = checks.filter(Boolean).length;
      
      return trueChecks >= 2;
    };

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(detectMobile());
    }
    
    mql.addEventListener("change", onChange)
    setIsMobile(detectMobile())
    
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
