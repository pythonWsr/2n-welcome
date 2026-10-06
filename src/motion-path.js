import * as T from 'three';
// Hermite interpolation: explicitly inherit endpoint velocity in viewport units.
export function motionPath(shots,incoming,outgoing){
 const point=new T.Vector3(),focus=new T.Vector3();
 function tangent(i,k){if(i===shots.length-1&&outgoing)return new T.Vector3(...outgoing[k]);if(i===0&&incoming)return new T.Vector3(...incoming[k]);const a=shots[Math.max(0,i-1)],b=shots[Math.min(shots.length-1,i+1)];return new T.Vector3(...b[k]).sub(new T.Vector3(...a[k])).divideScalar(b.t-a.t);}
 function sample(i,u,k,out){const a=shots[i],b=shots[i+1],h=b.t-a.t,s=u*u,q=s*u;return out.set(0,0,0).addScaledVector(new T.Vector3(...a[k]),2*q-3*s+1).addScaledVector(tangent(i,k),(q-2*s+u)*h).addScaledVector(new T.Vector3(...b[k]),-2*q+3*s).addScaledVector(tangent(i+1,k),(q-s)*h);}
 return (t,camera,portrait=false)=>{const u=T.MathUtils.clamp(t,0,1);let i=0;while(i<shots.length-2&&u>shots[i+1].t)i++;const v=(u-shots[i].t)/(shots[i+1].t-shots[i].t);sample(i,v,'p',point);sample(i,v,'target',focus);camera.position.copy(point);if(portrait)camera.position.y+=5*(1-T.MathUtils.smoothstep(u,0,.25));camera.lookAt(focus);return {position:camera.position.toArray(),target:focus.toArray()};};
}
