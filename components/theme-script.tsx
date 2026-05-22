export function ThemeScript() {
  const script = `(function(){try{var k='expensea-theme',t=localStorage.getItem(k);if(!t){t=localStorage.getItem('lunch-khata-theme');if(t)localStorage.setItem(k,t);}var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var el=document.documentElement;el.classList.remove('light','dark');if(t==='dark'||(t!=='light'&&d)){el.classList.add('dark');el.style.colorScheme='dark';}else{el.classList.add('light');el.style.colorScheme='light';}}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
