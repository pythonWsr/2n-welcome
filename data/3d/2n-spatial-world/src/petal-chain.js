// Stable identities: never select a different model as the camera advances.
export function chainLayout(width,height){
 const count=width<600?5:6,pixels=Math.min(64,width/(count*1.65));
 return Array.from({length:count*2},(_,i)=>({sourceIndex:Math.round(i*13/(count*2-1)),x:(i%count/(count-1)*2-1)*.75,y:i<count?.73:-.73,pixels}));
}
