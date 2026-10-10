// Explicit aliases for this project's hosts, never a blanket CDN/domain guess.
export function assetProvider(url){
 try{const host=new URL(url,globalThis.location?.href||'https://local.invalid/').hostname;
  if(['2n.llhleo.top','2n-spatial-world.pages.dev'].includes(host))return 'Cloudflare';
  if(host==='2n-spatial-world.vercel.app')return 'Vercel';
  if(['2n.edgeone.llhleo.top','2n-edgeone.llhleo.top','2n-spatial-world.edgeone.dev'].includes(host))return 'EdgeOne';
  if(host==='llhleo.github.io')return 'GitHub Pages';
  if(host==='cdn.jsdelivr.net')return 'jsDelivr';
  return host==='local.invalid'?'本站':host;
 }catch{return '本站';}
}
