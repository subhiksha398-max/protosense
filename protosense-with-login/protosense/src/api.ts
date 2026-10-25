import {Experiment,Rec} from './types'
const B:string=(import.meta as any).env?.VITE_API_URL||'http://localhost:5000'
async function j(p:string,o?:RequestInit){const r=await fetch(B+p,{headers:{'Content-Type':'application/json'},...o});if(!r.ok)throw new Error(String(r.status));return r.json()}
export const api={
 experiments:():Promise<Experiment[]>=>j('/api/experiments'),
 recs:():Promise<Rec[]>=>j('/api/recommendations'),
 saveExp:(e:Experiment)=>j('/api/experiments',{method:'POST',body:JSON.stringify(e)}),
 analyze:(experiment:Experiment,query:Record<string,string>)=>j('/api/analyze',{method:'POST',body:JSON.stringify({experiment,query})}),
 updRec:(id:string,p:Partial<Rec>)=>j('/api/recommendations/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify(p)})}
