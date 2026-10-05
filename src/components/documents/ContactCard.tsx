import { useRef, useState, useEffect } from 'react';
import { Github, Linkedin, Mail, Copy, ArrowUpRight } from 'lucide-react';
import { confirmFeedback } from '../../utils/uiFeedback';
export function ContactCard() {
  const [status, setStatus] = useState(''); const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return <article className="contact-document"><span className="contact-avatar" aria-hidden="true">LK</span><p className="reader-kicker">LET'S CONNECT</p><h1>Lê Quang Khánh</h1>
    <p>zney · Information Technology student at UEH</p>
    <h2>Have something in mind?</h2><p>Let's talk about the idea, the problem, and what we can build.</p>
    <div className="contact-rows"><a href="mailto:lequangkhanh295@gmail.com"><Mail/>lequangkhanh295@gmail.com<ArrowUpRight/></a>
      <a href="https://github.com/psy-zney" target="_blank" rel="noopener noreferrer"><Github/>GitHub<ArrowUpRight/></a>
      <a href="https://www.linkedin.com/in/psy-zney295" target="_blank" rel="noopener noreferrer"><Linkedin/>LinkedIn<ArrowUpRight/></a>
      <a href="https://www.facebook.com/psyotic.zney/" target="_blank" rel="noopener noreferrer">Facebook<ArrowUpRight/></a>
      <a href="https://zalo.me/0394426827" target="_blank" rel="noopener noreferrer">Zalo<ArrowUpRight/></a></div>
    <button className="reader-primary" onClick={async () => {
      try { await navigator.clipboard.writeText('lequangkhanh295@gmail.com'); setStatus('Copied'); confirmFeedback(); }
      catch { setStatus('Select the email above to copy it.'); }
      window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setStatus(''), 1500);
    }}><Copy size={16}/> Copy email</button><span role="status">{status}</span>
  </article>;
}
