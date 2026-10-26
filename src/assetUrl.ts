/** Resolve public assets under both localhost and a GitHub Pages project path. */
export function assetUrl(path:string){
 if(!path.startsWith('/')||path.startsWith('//'))return path;
 return `${import.meta.env.BASE_URL}${path.slice(1)}`;
}
