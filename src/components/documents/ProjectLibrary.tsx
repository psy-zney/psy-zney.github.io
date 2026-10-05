import { useEffect, useState } from 'react';
import { ArrowUpRight, BookOpen, Search, List, Grid2X2 } from 'lucide-react';
import { projects, type Language, type Project } from '../../data/portfolio';
import { navigateHash } from '../../utils/appRoutes';

let savedLibrary = { query: '', category: 'all', sort: 'featured', list: false };
export function ProjectLibrary({ lang, basePath = '#/workspace/library' }: { lang: Language; basePath?: string }) {
  const [query, setQuery] = useState(savedLibrary.query), [search, setSearch] = useState(savedLibrary.query);
  const [category, setCategory] = useState(savedLibrary.category), [sort, setSort] = useState(savedLibrary.sort), [list, setList] = useState(savedLibrary.list);
  useEffect(() => { const timer = window.setTimeout(() => setSearch(query), 150); return () => window.clearTimeout(timer); }, [query]);
  useEffect(() => { savedLibrary = { query, category, sort, list }; }, [query, category, sort, list]);
  const filtered = projects.filter(project => (category === 'all' || project.category === category)
    && `${project.name} ${project.headline[lang]} ${project.stack.join(' ')}`.toLowerCase().includes(search.trim().toLowerCase()));
  if (sort === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'year') filtered.sort((a, b) => b.year.localeCompare(a.year));
  const t = (vie: string, eng: string) => lang === 'vie' ? vie : eng;
  return <section className="project-library"><header><p className="reader-kicker">FROM THE WORKSPACE</p>
    <h1>{t('Thư viện dự án', 'Project library')}</h1><p>{t('Bối cảnh, kiến trúc và những quyết định sau mỗi dự án.', 'The context, connected parts, and decisions behind each project.')}</p></header>
    <div className="library-toolbar"><label><Search size={18}/><input type="search" aria-label="Search projects" placeholder="Search name, tools, or purpose" value={query} onChange={event => setQuery(event.target.value)}/></label>
      <select aria-label="Sort projects" value={sort} onChange={event => setSort(event.target.value)}><option value="featured">Featured</option><option value="name">Name</option><option value="year">Year</option></select>
      <button aria-label={list ? 'Grid view' : 'List view'} onClick={() => setList(value => !value)}>{list ? <Grid2X2 size={20}/> : <List size={20}/>}</button></div>
    <div className="library-layout"><nav className="library-filters" aria-label="Project categories">{['all', 'web', 'systems', 'mobile', 'creative'].map(item =>
      <button key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item === 'all' ? 'All' : item} <small>{projects.filter(project => item === 'all' || project.category === item).length}</small></button>)}</nav>
    {filtered.length === 0 && <div className="library-empty"><BookOpen/><p>No projects match “{query}”.</p><button onClick={() => { setQuery(''); setSearch(''); setCategory('all'); }}>Clear filters</button></div>}
    <div className={`library-books${list ? ' is-list' : ''}`}>{filtered.map((project: Project, index) => <a key={project.id} className="library-book" href={`${basePath}/${project.id}/overview`} onClick={event => { event.preventDefault(); navigateHash(`${basePath}/${project.id}/overview`); }} style={{ '--book-color': project.color, '--book-index': Math.min(index, 2) } as React.CSSProperties}>
      <div className="book-cover" aria-hidden="true"><span>{project.category} / {project.year}</span><div className="book-orbit"><i/><b/></div><strong>{project.name}</strong><small>PROJECT NOTES</small></div>
      <div className="book-description"><h2>{project.name}<ArrowUpRight size={16}/></h2><p>{project.headline[lang]}</p><small>{project.role[lang]}</small></div></a>)}</div>
  </div></section>;
}
