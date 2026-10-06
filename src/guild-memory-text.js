// Native text stays at device resolution, independently of the WebGL pixel budget.
export function createMemoryText(events,doc){
 const root=doc.createElement('section');root.className='memory-reading';root.hidden=true;
 root.setAttribute('aria-label','公会历史');
 const date=doc.createElement('time'),title=doc.createElement('h2'),body=doc.createElement('p');
 root.append(date,title,body);doc.body.append(root);let current=-1;
 return {root,update(state,visible=true){
  const event=events[state.eventIndex];root.hidden=!visible||!event;
  if(root.hidden)return;
  if(current!==state.eventIndex){current=state.eventIndex;date.textContent=event.date.replaceAll('-','.');date.setAttribute('datetime',event.date);title.textContent=event.title;body.textContent=event.body;}
  root.style.opacity=String(state.eventOpacity??1);
 },hide(){root.hidden=true;}};
}
