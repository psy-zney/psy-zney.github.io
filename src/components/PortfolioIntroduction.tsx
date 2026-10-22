import { ArrowUpRight } from 'lucide-react';
import { personalProfile } from '../data/personalProfile';
import type { Language } from '../data/portfolio';

/** The portfolio's identity and evidence are readable without opening a disclosure. */
export function PortfolioIntroduction({ lang }: { lang: Language }) {
  return <article className="portfolio-introduction" aria-labelledby="portfolio-introduction-name">
    <p className="portfolio-introduction-label">{lang === 'vie' ? 'GIỚI THIỆU / NỀN TẢNG & KINH NGHIỆM' : 'ABOUT ME / BACKGROUND & EXPERIENCE'}</p>
    <h2 id="portfolio-introduction-name">{personalProfile.name}</h2>
    <p className="portfolio-introduction-role">{personalProfile.role[lang]}</p>
    <p className="portfolio-introduction-meta">{personalProfile.education[lang]}<br/>{personalProfile.location[lang]} · {personalProfile.graduation[lang]}</p>
    <p className="portfolio-introduction-bio">{personalProfile.introduction[lang]}</p>
    <ul className="portfolio-experience" aria-label={lang === 'vie' ? 'Kinh nghiệm thực tế' : 'Hands-on experience'}>
      {personalProfile.experience.map(area => <li key={area.href}>
        <h3>{area.title[lang]}</h3>
        <p>{area.description[lang]}</p>
        <a href={area.href} {...(area.href.startsWith('https://') ? {target:'_blank',rel:'noopener noreferrer'} : {})}>{area.evidence[lang]}<ArrowUpRight size={15}/></a>
      </li>)}
    </ul>
  </article>;
}
