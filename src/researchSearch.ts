export interface SearchableResearch {id:string;title:string;summary:string;searchText:string;label:string}
export function rankResearchSearch<T extends SearchableResearch>(entries:T[],query:string):T[]{
  const normalized=query.normalize('NFKC').trim().toLocaleLowerCase();
  if(!normalized)return entries;
  const terms=normalized.split(/\s+/u).filter(Boolean);
  const fold=(text:string)=>text.normalize('NFKC').toLocaleLowerCase();
  return entries.map((entry,index)=>{
    const title=fold(entry.title),summary=fold(entry.summary),all=`${title} ${summary} ${fold(entry.searchText)}`;
    const matches=terms.every(term=>all.includes(term));
    const score=(title===normalized?1000:0)+(title.includes(normalized)?120+60*normalized.length/title.length:0)+terms.reduce((n,t)=>n+(title.includes(t)?30:0)+(summary.includes(t)?8:0),0);
    return {entry,index,matches,score};
  }).filter(item=>item.matches).sort((a,b)=>b.score-a.score||a.index-b.index).map(item=>item.entry);
}
