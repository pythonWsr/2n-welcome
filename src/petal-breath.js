// Phase belongs to the authored anchor, independent of nearest-pool slots.
export function petalBreath(anchorId,time,height,depth){
 let hash=0;for(let i=0;i<anchorId.length;i++)hash=(hash*31+anchorId.charCodeAt(i))>>>0;
 const phase=(hash%997)/997*Math.PI*2,period=4.5+(hash%151)/100;
 const amplitude=Math.min(1.3,8*Math.max(0,depth)*Math.tan(Math.PI*24/180)/Math.max(1,height));
 return {offset:Math.sin(time*Math.PI*2/period+phase)*amplitude,angle:Math.sin(time*Math.PI*2/period+phase+.6)*Math.PI/90,amplitude};
}
