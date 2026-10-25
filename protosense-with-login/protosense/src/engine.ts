// DEMO matching engine: weighted token similarity. Replaceable by TF-IDF or a Flask endpoint
// as long as analyze(query, pool) keeps its signature.
import {Experiment,Cause} from './types'
export interface Query{symptom:string;component:string;domain:string;condition:string;category:string}
const SW=new Set('the a an of on in to and or is are at when with during under after before it its for from by'.split(' '))
export const norm=(s:string)=>(s||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w&&!SW.has(w)).map(w=>w.length>3?w.replace(/s$/,''):w)
const cos=(a:string,b:string)=>{const A=new Set(norm(a)),B=new Set(norm(b));if(!A.size||!B.size)return 0;let n=0;A.forEach(x=>{if(B.has(x))n++});return n/Math.sqrt(A.size*B.size)}
export const WEIGHTS={symptom:.35,component:.2,condition:.2,category:.15,domain:.1}
export const STRONG=0.3
export const toQuery=(e:Experiment):Query=>({symptom:e.symptom,component:e.component,domain:e.domain,condition:e.condition+' '+e.finding,category:e.category})
export function match(q:Query,pool:Experiment[]){const w=WEIGHTS
 return pool.map(e=>({e,score:w.symptom*cos(q.symptom,e.symptom+' '+e.finding)+w.component*cos(q.component,e.component)+w.condition*cos(q.condition,e.condition+' '+e.finding)+w.category*(q.category===e.category?1:0)+w.domain*(q.domain===e.domain?1:0)})).sort((a,b)=>b.score-a.score)}
export function analyze(q:Query,pool:Experiment[]){
 const top=match(q,pool).slice(0,3),hit=top.filter(m=>m.score>=STRONG)
 const g=(key:'cause'|'nextTest')=>{const m=new Map<string,{rel:number;ids:string[];why:string}>();hit.forEach(({e,score})=>{const c=m.get(e[key])||{rel:0,ids:[],why:''};c.rel=Math.max(c.rel,score);c.ids.push(e.id);c.why=`Recorded in ${c.ids.join(', ')} for a similar failure ("${e.symptom}", ${e.component}).`;m.set(e[key],c)});return [...m.entries()].map(([k,v])=>({k,...v})).sort((a,b)=>b.rel-a.rel)}
 const causes:Cause[]=g('cause').map(x=>({cause:x.k,rel:x.rel,ids:x.ids,why:x.why}))
 const tests=g('nextTest').map(x=>({test:x.k,ids:x.ids,why:x.why}))
 return {top,strong:hit.length>0,causes,tests}}
