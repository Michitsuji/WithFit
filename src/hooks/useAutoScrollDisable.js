import { useEffect } from 'react';

export function useAutoScrollDisable() {
  useEffect(() => {
    const checkScroll = () => {
      if (document.documentElement.scrollHeight <= window.innerHeight) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    };

    checkScroll();
    window.addEventListener('resize', checkScroll);
    
    const observer = new MutationObserver(checkScroll);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    return () => {
      window.removeEventListener('resize', checkScroll);
      observer.disconnect();
      document.body.style.overflow = '';
    };
  }, []);
}
