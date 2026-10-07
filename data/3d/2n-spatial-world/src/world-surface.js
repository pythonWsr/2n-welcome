const smooth=(x,a,b)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
// Garden formula is unchanged. Desert continues into Ocean without a basin
// or an artificial dark edge between biomes.
export function worldHeight(x,z){
 const dune=smooth(x,238,365),ridge=Math.sin(x*.021+Math.sin(z*.028)*1.7)*4.8+Math.cos(z*.033+x*.008)*3.4;
 const close=Math.sin(x*.073+z*.045)*1.05+Math.cos(z*.088-x*.052)*.7,long=Math.sin(z*.014+x*.012)*3.6;
 const sea=smooth(x,500,660),land=49+ridge+close+dune*long;
 const seabed=43+Math.sin(x*.028+z*.013)*2.1+Math.cos(z*.043-x*.012)*1.3;
 const jungle=smooth(x,820,1000),forest=48+Math.sin(x*.023+z*.017)*3.8+Math.cos(z*.034-x*.01)*2.4;
 const hell=smooth(x,1220,1400),embers=48+Math.sin(x*.025+Math.sin(z*.017))*3.7+Math.cos(z*.031-x*.009)*2.2;
 const edge=smooth(x,42,77)*(1-smooth(x,1700,1800))*smooth(z,-350,-290)*(1-smooth(z,250,320));
 return -85+edge*(((land*(1-sea)+seabed*sea)*(1-jungle)+forest*jungle)*(1-hell)+embers*hell);
}
export function desertSurface(x,z){
 if(x<296||x>520||z< -365||z>330)return worldHeight(x,z);
 const x0=x<404?296:404,x1=x<404?404:520,dx=(x1-x0)/56,dz=695/68;
 const ix=Math.min(55,Math.floor((x-x0)/dx)),iz=Math.min(67,Math.floor((z+365)/dz));
 const X=x0+ix*dx,Z=-365+iz*dz,u=(x-X)/dx,v=(z-Z)/dz;
 return u+v<=1?(1-u-v)*worldHeight(X,Z)+u*worldHeight(X+dx,Z)+v*worldHeight(X,Z+dz):(u+v-1)*worldHeight(X+dx,Z+dz)+(1-v)*worldHeight(X+dx,Z)+(1-u)*worldHeight(X,Z+dz);
}
