export function normalizeHistory(raw){
 const errors=[],ids=new Set(),events=[];
 if(!Array.isArray(raw?.events)||raw.events.length!==3)return {events,errors:['公会历史需要三条已确认事件。']};
 for(const event of raw.events){
  if(!event||typeof event!=='object'){errors.push('历史事件无效');continue;}
  const validDate=/^\d{4}-\d{2}-\d{2}$/.test(event.date)&&Number.isFinite(Date.parse(event.date))&&new Date(event.date).toISOString().slice(0,10)===event.date;
  if(typeof event.id!=='string'||!event.id||ids.has(event.id)||!validDate||typeof event.title!=='string'||!event.title.trim()||typeof event.body!=='string'||!event.body.trim()||event.approved!==true)errors.push('历史事件字段无效或未经确认。');
  ids.add(event.id);events.push({...event});
 }
 return {events:errors.length?[]:events,errors};
}
