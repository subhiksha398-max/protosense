import {useState,useEffect,useMemo,Dispatch,SetStateAction} from 'react'
import {LayoutDashboard,FilePlus2,Library,Network,ListChecks,FileText,Settings as Cog,Menu,Search,Printer,Download,Cpu,ArrowRight,Loader2,LogOut} from 'lucide-react'
import {PieChart,Pie,Cell,BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer,LineChart,Line,CartesianGrid} from 'recharts'
import {SEED,DOMAINS,CATEGORIES} from './data'
import {analyze,match,toQuery,STRONG} from './engine'
import {Experiment,Rec,Analysis,TestStatus} from './types'
import {Badge,Card,Metric,inp,btn,btn2,Field,Modal,Toast,Disclaimer} from './ui'
import {api} from './api'
import Login from './Login'
import {getSession,signOut,Session} from './auth'

function useLS<T>(k:string,i:T):[T,Dispatch<SetStateAction<T>>]{const [s,set]=useState<T>(()=>{try{const r=localStorage.getItem(k);return r?JSON.parse(r):i}catch{return i}});useEffect(()=>{try{localStorage.setItem(k,JSON.stringify(s))}catch{}},[k,s]);return [s,set]}
const today=()=>new Date().toISOString().slice(0,10)
const blank=()=>({id:'',proto:'',domain:'Electronics',comp:'',date:today(),cat:'Power Supply',symptoms:'',expected:'',actual:'',sev:'Medium',voltage:'',temp:'',load:'',driver:'',sensor:'Unknown',config:'',tests:'',fixes:'',results:'',notes:''})
const PAL=['#22d3ee','#3b82f6','#a78bfa','#34d399','#fbbf24','#f472b6','#94a3b8']
const NAV:[string,string,any][]=[['overview','Overview',LayoutDashboard],['new','New Failure Analysis',FilePlus2],['library','Experiment Library',Library],['patterns','Failure Patterns',Network],['recs','Recommendations',ListChecks],['reports','Reports',FileText],['settings','Settings',Cog]]
const count=(a:string[])=>Object.entries(a.reduce((m:Record<string,number>,x)=>(m[x]=(m[x]||0)+1,m),{})).map(([name,value])=>({name,value}))

export default function App(){
 const [page,setPage]=useState('home'),[open,setOpen]=useState(true)
 const [session,setSession]=useState<Session|null>(getSession),[after,setAfter]=useState('overview')
 const [user,setUser]=useLS<Experiment[]>('protosense.user',[]),[recs,setRecs]=useLS<Rec[]>('protosense.recs',[])
 const [f,setF]=useState<Record<string,string>>(blank()),[errs,setErrs]=useState<Record<string,string>>({})
 const [an,setAn]=useState<Analysis|null>(null),[loading,setLoading]=useState(false),[toast,setToast]=useState<any>(null),[view,setView]=useState<Experiment|null>(null),[confirmReset,setConfirm]=useState(false)
 const [remote,setRemote]=useState<Experiment[]|null>(null)
 useEffect(()=>{api.experiments().then(setRemote).catch(()=>setRemote(null));api.recs().then(setRecs).catch(()=>{})},[])
 const all=useMemo(()=>remote||[...SEED,...user],[remote,user])
 const say=(t:string,ok=true)=>{setToast({t,ok});setTimeout(()=>setToast(null),2500)}
 // Demo-only gate: app pages need a (browser-local) demo session; home/login/signup stay public.
 const go=(p:string)=>{if(!session&&!['home','login','signup'].includes(p)){setAfter(p);p='login'}setPage(p);window.scrollTo(0,0)}
 const logout=()=>{signOut();setSession(null);setPage('home');window.scrollTo(0,0)}
 const toExp=():Experiment=>({id:f.id.trim(),prototype:f.proto,domain:f.domain,component:f.comp,category:f.cat,symptom:f.symptoms,condition:[f.load,f.config,f.voltage&&f.voltage+' V supply',f.temp&&f.temp+' C'].filter(Boolean).join(', '),finding:f.results||f.actual,nextTest:'Pending analysis',cause:'Not yet determined',outcome:'Under Investigation',date:f.date,fixes:f.fixes})
 const validate=()=>{const e:Record<string,string>={};if(!f.id.trim())e.id='Required';else if(SEED.some(s=>s.id===f.id.trim()))e.id='ID already used by a sample record';if(!f.proto.trim())e.proto='Required';if(!f.comp.trim())e.comp='Required';if(f.symptoms.trim().length<5)e.symptoms='Describe the symptoms (min 5 characters)';if(f.voltage&&isNaN(+f.voltage))e.voltage='Must be a number';if(f.temp&&isNaN(+f.temp))e.temp='Must be a number';setErrs(e);if(Object.keys(e).length)say('Please fix the highlighted fields',false);return !Object.keys(e).length}
 const save=()=>{if(!validate())return;const x=toExp();setUser(u=>[...u.filter(y=>y.id!==x.id),x]);api.saveExp(x).then(()=>api.experiments().then(setRemote)).catch(()=>{});say('Experiment saved to library')}
 const run=()=>{if(!validate())return;setLoading(true);const x=toExp(),q={symptom:f.symptoms+' '+f.actual,component:f.comp,domain:f.domain,condition:[f.load,f.config,f.notes,f.voltage&&'voltage',f.driver].join(' '),category:f.cat}
  const done=(top:any,strong:boolean,causes:any,nr:Rec[])=>{setRecs(o=>[...o.filter(y=>y.expId!==x.id),...nr]);setAn({input:{...f},top,strong,causes,recIds:nr.map(y=>y.id)});setLoading(false);go('results')}
  Promise.all([api.analyze(x,q).catch(()=>null),new Promise(r=>setTimeout(r,1200))]).then(([res]:any)=>{
   if(res){api.experiments().then(setRemote).catch(()=>{});return done(res.top,res.strong,res.causes,res.recs)}
   const pool=all.filter(y=>y.id!==x.id),r=analyze(q,pool)
   const nr:Rec[]=r.strong?r.tests.map((t,i)=>({id:`${x.id}-T${i+1}`,expId:x.id,test:t.test,reason:t.why,support:t.ids,expected:`Historical outcome in ${t.ids[0]}: ${pool.find(p=>p.id===t.ids[0])!.finding}`,status:'Pending' as TestStatus,result:''})):[]
   done(r.top,r.strong,r.causes,nr)})}
 const upd=(id:string,p:Partial<Rec>)=>{setRecs(o=>o.map(r=>r.id===id?{...r,...p}:r));api.updRec(id,p).catch(()=>{})}

 if(page==='home')return <Landing go={go} session={session}/>
 if(page==='login'||page==='signup')return <Login mode={page} setMode={m=>setPage(m)} onBack={()=>go('home')} onSuccess={s=>{setSession(s);setPage(after);window.scrollTo(0,0)}}/>
 return <div className="flex min-h-screen"><aside className={`${open?'w-60':'w-16'} shrink-0 border-r border-white/10 bg-[#080c19] p-3 transition-all`}>
  <div className="mb-6 flex items-center gap-2"><button onClick={()=>setOpen(!open)} aria-label="Toggle sidebar"><Menu size={20}/></button>{open&&<button onClick={()=>go('home')} className="font-bold tracking-wide text-cyan-300">ProtoSense</button>}</div>
  {NAV.map(([k,l,I])=><button key={k} onClick={()=>go(k)} title={l} className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm ${page===k||(k==='new'&&page==='results')?'bg-cyan-500/15 text-cyan-300':'text-slate-400 hover:bg-white/5'}`}><I size={18}/>{open&&l}</button>)}{session&&<button onClick={logout} title="Log out" className="mb-1 mt-4 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/5"><LogOut size={18}/>{open&&<span className="truncate">Log out ({session.name})</span>}</button>}{open&&<p className="mt-6 px-3 text-[10px] text-slate-500">{remote?'Database connected':'Local demo mode (no backend)'}</p>}</aside>
  <main className="min-w-0 flex-1 space-y-4 p-4 md:p-6">
   {page==='overview'&&<Overview all={all} recs={recs} setView={setView} go={go}/>}
   {page==='new'&&<NewForm f={f} setF={setF} errs={errs} save={save} run={run} loading={loading} reset={()=>setConfirm(true)}/>}
   {page==='results'&&(an?<Results an={an} recs={recs} upd={upd} all={all} setView={setView} go={go} say={say} saveExp={save} reset={()=>{setF(blank());go('new')}}/>:<Empty t="No analysis yet" go={()=>go('new')}/>)}
   {page==='library'&&<Lib all={all} setView={setView} go={go}/>}
   {page==='patterns'&&<Patterns all={all} setView={setView}/>}
   {page==='recs'&&<RecsPage recs={recs} upd={upd} setView={setView} all={all} say={say}/>}
   {page==='reports'&&<Reports all={all} recs={recs}/>}
   {page==='settings'&&<Card><h2 className="text-lg font-semibold">Settings</h2><p className="my-2 text-sm text-slate-400">Data is stored in MySQL through the Flask API when it is running (see VITE_API_URL); otherwise it falls back to this browser's localStorage. Matching logic lives in backend/engine.py, with src/engine.ts as the offline fallback.</p><button className={btn2} onClick={()=>{localStorage.clear();location.reload()}}>Clear all saved data</button></Card>}
  </main>
  {view&&<Modal title={`${view.id} · ${view.prototype}`} onClose={()=>setView(null)}><Detail e={view}/></Modal>}
  {confirmReset&&<Modal title="Reset form?" onClose={()=>setConfirm(false)}><p className="mb-3 text-sm">All entered values will be cleared.</p><button className={btn} onClick={()=>{setF(blank());setErrs({});setConfirm(false);say('Form reset')}}>Yes, reset</button></Modal>}
  <Toast m={toast}/></div>}

const Empty=({t,go}:{t:string;go:()=>void})=><Card className="py-12 text-center"><p className="mb-3 text-slate-400">{t}</p><button className={btn} onClick={go}>Analyze a Failure</button></Card>
const Detail=({e}:{e:Experiment})=><div className="space-y-2 text-sm"><div className="flex gap-2"><Badge t={e.outcome}/><span className="text-slate-400">{e.date} · {e.domain} · {e.category}</span></div>{([['Component',e.component],['Symptom',e.symptom],['Conditions',e.condition],['Previous finding',e.finding],['Recorded next test',e.nextTest],['Documented cause',e.cause],['Fixes attempted',e.fixes]] as string[][]).map(([k,v])=><div key={k}><span className="text-slate-400">{k}: </span>{v}</div>)}<p className="text-xs text-slate-500">Illustrative sample record, not a validated experimental finding.</p></div>

function Landing({go,session}:{go:(p:string)=>void;session:Session|null}){
 const steps=['Record Failure','Find Similar Experiments','Identify Patterns','Recommend Next Test'],feats=[['Historical Failure Search','Search past experiments by symptom, component or ID.'],['Similarity-Based Matching','Transparent weighted matching across symptoms, component, domain, conditions and category.'],['Failure Pattern Analysis','Group recurring symptoms and components.'],['Evidence-Based Test Recommendations','Every suggestion cites a stored record.'],['Experiment History','Keep a persistent log of what was tried.'],['Knowledge Reuse','Stop repeating experiments that already failed.']]
 return <div className="relative overflow-hidden"><svg className="absolute inset-0 -z-0 h-[700px] w-full opacity-40" aria-hidden>{Array.from({length:18}).map((_,i)=>{const x=(i*97)%1200,y=(i*61)%600;return <g key={i}><line x1={x} y1={y} x2={(x+160)%1200} y2={(y+90)%600} stroke="#22d3ee" strokeOpacity=".15"/><circle className="node" style={{animationDelay:`${i*.3}s`}} cx={x} cy={y} r="3" fill="#22d3ee"/></g>})}</svg>
 <nav className="relative z-10 flex items-center justify-between p-5"><div className="flex items-center gap-2 font-bold tracking-wide text-cyan-300"><Cpu/>ProtoSense</div><div className="hidden gap-6 text-sm text-slate-300 md:flex"><a href="#top">Home</a><a href="#how">How It Works</a><a href="#features">Features</a><button onClick={()=>go('overview')}>Dashboard</button></div>{session?<button className={btn2} onClick={()=>go('overview')}>Open Dashboard</button>:<div className="flex gap-2"><button className={btn2} onClick={()=>go('login')}>Login</button><button className={`${btn} hidden sm:block`} onClick={()=>go('signup')}>Sign Up</button></div>}</nav>
 <section id="top" className="relative z-10 mx-auto max-w-4xl px-5 py-24 text-center"><p className="text-sm text-purple-300">Prototype Failure Pattern Predictor</p><h1 className="mt-3 text-4xl font-bold md:text-6xl">Turn Prototype Failures Into Engineering Insights.</h1><p className="mx-auto mt-4 max-w-2xl text-slate-400">Connect historical experiments, uncover recurring failure patterns, and discover your next diagnostic step.</p><div className="mt-8 flex justify-center gap-3"><button className={btn} onClick={()=>go('new')}>Analyze a Failure</button><button className={btn2} onClick={()=>go('overview')}>Explore Dashboard</button></div></section>
 <section id="how" className="relative z-10 mx-auto grid max-w-5xl gap-3 px-5 py-12 md:grid-cols-4">{steps.map((s,i)=><Card key={s}><div className="text-cyan-300">0{i+1}</div><div className="mt-1 font-medium">{s}</div></Card>)}</section>
 <section id="features" className="relative z-10 mx-auto grid max-w-5xl gap-3 px-5 py-12 md:grid-cols-3">{feats.map(([t,d])=><Card key={t}><div className="font-medium">{t}</div><p className="mt-1 text-sm text-slate-400">{d}</p></Card>)}</section>
 <section className="relative z-10 mx-auto max-w-3xl px-5 pb-16"><Disclaimer/></section></div>}

function Overview({all,recs,setView,go}:any){
 const cats=count(all.map((e:Experiment)=>e.category)),comps=count(all.map((e:Experiment)=>e.component)).sort((a,b)=>b.value-a.value).slice(0,6)
 const months=count(all.map((e:Experiment)=>e.date.slice(0,7))).sort((a,b)=>a.name.localeCompare(b.name))
 const similar=all.filter((e:Experiment)=>match(toQuery(e),all.filter((o:Experiment)=>o.id!==e.id))[0].score>=STRONG).length
 const patterns=cats.filter(c=>c.value>=2).length
 return <><div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Engineering Intelligence Dashboard</h1><span className="rounded bg-amber-500/15 px-2 py-1 text-xs text-amber-300">Demo data</span></div>
 <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Experiments recorded" value={all.length} note="sample + saved"/><Metric label="Recurring failure patterns" value={patterns} note="categories with 2+ records"/><Metric label="With similar historical cases" value={similar} note="demo match ≥ threshold"/><Metric label="Awaiting verification" value={recs.filter((r:Rec)=>r.status!=='Verified'&&r.status!=='Not Effective').length} note="recommendations"/></div>
 <div className="grid gap-3 lg:grid-cols-2">
 <Card><h3 className="mb-2 text-sm">Failure categories</h3><ResponsiveContainer height={220}><PieChart><Pie data={cats} dataKey="value" nameKey="name" outerRadius={80}>{cats.map((_,i)=><Cell key={i} fill={PAL[i%7]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></Card>
 <Card><h3 className="mb-2 text-sm">Most affected components</h3><ResponsiveContainer height={220}><BarChart data={comps} layout="vertical"><XAxis type="number" allowDecimals={false} stroke="#64748b"/><YAxis type="category" dataKey="name" width={110} stroke="#64748b" fontSize={11}/><Tooltip/><Bar dataKey="value" fill="#22d3ee"/></BarChart></ResponsiveContainer></Card>
 <Card><h3 className="mb-2 text-sm">Experiments recorded per month</h3><ResponsiveContainer height={220}><LineChart data={months}><CartesianGrid stroke="#1e293b"/><XAxis dataKey="name" stroke="#64748b" fontSize={11}/><YAxis allowDecimals={false} stroke="#64748b"/><Tooltip/><Line dataKey="value" stroke="#a78bfa"/></LineChart></ResponsiveContainer></Card>
 <Card><h3 className="mb-2 text-sm">Outcomes</h3><ResponsiveContainer height={220}><BarChart data={count(all.map((e:Experiment)=>e.outcome))}><XAxis dataKey="name" stroke="#64748b" fontSize={11}/><YAxis allowDecimals={false} stroke="#64748b"/><Tooltip/><Bar dataKey="value" fill="#3b82f6"/></BarChart></ResponsiveContainer></Card></div>
 <Card><h3 className="mb-2 text-sm">Recent Insights</h3><ul className="space-y-1 text-sm text-slate-300">{cats.filter(c=>c.value>=2).map(c=><li key={c.name}>{c.name}: {c.value} records in the sample data.</li>)}</ul></Card>
 <Card><div className="mb-2 flex justify-between"><h3 className="text-sm">Recent experiments</h3><button className="text-xs text-cyan-300" onClick={()=>go('library')}>View all</button></div><Table rows={[...all].sort((a:Experiment,b:Experiment)=>b.date.localeCompare(a.date)).slice(0,6)} setView={setView}/></Card></>}

const Table=({rows,setView}:{rows:Experiment[];setView:(e:Experiment)=>void})=><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-slate-400"><tr>{['ID','Prototype','Component','Category','Date','Status'].map(h=><th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{rows.map(e=><tr key={e.id} onClick={()=>setView(e)} className="cursor-pointer border-t border-white/5 hover:bg-white/5"><td className="p-2 text-cyan-300">{e.id}</td><td className="p-2">{e.prototype}</td><td className="p-2">{e.component}</td><td className="p-2">{e.category}</td><td className="p-2">{e.date}</td><td className="p-2"><Badge t={e.outcome}/></td></tr>)}</tbody></table></div>

function NewForm({f,setF,errs,save,run,loading,reset}:any){
 const s=(k:string)=>(e:any)=>setF({...f,[k]:e.target.value})
 const I=(k:string,label:string,o:{type?:string;ta?:boolean;hint?:string;opts?:string[];req?:boolean}={})=><Field key={k} label={label+(o.req?' *':'')} hint={o.hint} err={errs[k]}>{o.opts?<select className={inp} value={f[k]} onChange={s(k)}>{o.opts.map(x=><option key={x}>{x}</option>)}</select>:o.ta?<textarea rows={3} className={inp} value={f[k]} onChange={s(k)}/>:<input type={o.type||'text'} className={inp} value={f[k]} onChange={s(k)}/>}</Field>
 const Sec=({t,children}:any)=><Card><h3 className="mb-3 font-medium text-cyan-300">{t}</h3><div className="grid gap-3 md:grid-cols-2">{children}</div></Card>
 return <><h1 className="text-2xl font-semibold">Analyze a Prototype Failure</h1>
 <Sec t="A. Experiment Details">{I('id','Experiment ID',{req:true,hint:'e.g. EXP-101'})}{I('proto','Prototype Name',{req:true})}{I('domain','Engineering Domain',{opts:DOMAINS})}{I('comp','Component Name',{req:true})}{I('date','Experiment Date',{type:'date'})}</Sec>
 <Sec t="B. Observed Failure">{I('cat','Failure Category',{opts:CATEGORIES})}{I('sev','Severity',{opts:['Low','Medium','High','Critical']})}{I('symptoms','Failure Symptoms',{ta:true,req:true,hint:'What exactly happens?'})}{I('expected','Expected Behaviour',{ta:true})}{I('actual','Actual Behaviour',{ta:true})}</Sec>
 <Sec t="C. Technical Conditions">{I('voltage','Supply Voltage (V)',{type:'number',hint:'Optional'})}{I('temp','Operating Temperature (°C)',{type:'number'})}{I('load','Load Conditions',{hint:'e.g. voltage drops under load'})}{I('driver','Controller or Driver Used')}{I('sensor','Sensor Status',{opts:['Unknown','Working','Intermittent','Faulty','Not used']})}{I('config','Test Configuration')}</Sec>
 <Sec t="D. Troubleshooting History">{I('tests','Tests Already Performed',{ta:true})}{I('fixes','Previous Fixes Attempted',{ta:true})}{I('results','Test Results',{ta:true})}{I('notes','Additional Notes',{ta:true})}</Sec>
 <div className="flex flex-wrap gap-2">{loading?<span className="flex items-center gap-2 text-cyan-300"><Loader2 className="animate-spin" size={18}/>Searching historical experiments...</span>:<><button className={btn} onClick={run}>Analyze Failure</button><button className={btn2} onClick={save}>Save Experiment</button><button className={btn2} onClick={reset}>Reset Form</button></>}</div></>}

function RecCard({r,upd,setView,all,say}:{r:Rec;upd:any;setView:any;all:Experiment[];say:any}){
 const [d,setD]=useState(r.result)
 return <Card><div className="flex items-start justify-between gap-2"><div><div className="font-medium">{r.test}</div><div className="text-xs text-slate-400">For {r.expId}</div></div><Badge t={r.status}/></div>
 <p className="mt-2 text-sm text-slate-300"><b>Why:</b> {r.reason}</p><p className="text-sm text-slate-300"><b>Expected observation:</b> {r.expected}</p><p className="text-xs text-amber-300">Verify safely: disconnect power before re-wiring, confirm with a second measurement.</p>
 <div className="mt-2 flex flex-wrap gap-1 text-xs">{r.support.map(id=><button key={id} className="rounded bg-cyan-500/10 px-2 py-1 text-cyan-300" onClick={()=>setView(all.find(a=>a.id===id))}>View {id}</button>)}</div>
 <textarea className={`${inp} mt-2`} rows={2} placeholder="Observed result" value={d} onChange={e=>setD(e.target.value)}/>
 <div className="mt-2 flex flex-wrap gap-2"><button className={btn2} onClick={()=>upd(r.id,{status:'Completed'})}>Mark Test as Completed</button><button className={btn2} onClick={()=>{if(!d.trim())return say('Enter the observed result first',false);upd(r.id,{result:d,status:r.status==='Pending'?'Completed':r.status});say('Result recorded')}}>Record Test Result</button><select className={`${inp} !w-auto`} value={r.status} onChange={e=>upd(r.id,{status:e.target.value})}>{['Pending','Completed','Verified','Not Effective'].map(x=><option key={x}>{x}</option>)}</select></div></Card>}

function Results({an,recs,upd,all,setView,go,say,saveExp,reset}:any){
 const mine=recs.filter((r:Rec)=>an.recIds.includes(r.id))
 return <><h1 className="text-2xl font-semibold">Failure Analysis Results</h1><Disclaimer/>
 <Card><h3 className="mb-1 font-medium text-cyan-300">Failure summary</h3><p className="text-sm">{an.input.proto} · {an.input.comp} · {an.input.domain} · {an.input.cat}</p><p className="text-sm text-slate-300">{an.input.symptoms}</p><p className="text-xs text-slate-500">{[an.input.voltage&&an.input.voltage+' V',an.input.temp&&an.input.temp+' °C',an.input.load,an.input.config].filter(Boolean).join(' · ')}</p></Card>
 <h3 className="font-medium text-cyan-300">Similar historical experiments</h3>
 <div className="grid gap-3 lg:grid-cols-3">{an.top.map(({e,score}:any)=><Card key={e.id}><div className="flex justify-between"><b>{e.id}</b><span className="text-cyan-300">{Math.round(score*100)}%</span></div><div className="text-xs text-slate-500">Demo estimate from prototype matching logic</div><p className="mt-1 text-sm">{e.symptom}</p><p className="text-xs text-slate-400">Conditions: {e.condition}</p><p className="text-xs text-slate-400">Tried: {e.fixes}</p><div className="mt-1"><Badge t={e.outcome}/></div><button className="mt-2 text-xs text-cyan-300" onClick={()=>setView(e)}>View Historical Record</button></Card>)}</div>
 {!an.strong?<Card><b>No strong historical match found.</b><p className="text-sm text-slate-400">Review the experiment details and consider recording additional observations, then analyze again.</p></Card>:<>
 <h3 className="font-medium text-cyan-300">Possible failure causes</h3>{an.causes.map((c:any)=><Card key={c.cause}><div className="flex justify-between"><b>{c.cause}</b><span className="text-xs text-slate-400">Demo relevance {Math.round(c.rel*100)}</span></div><div className="my-2 h-1.5 rounded bg-white/10"><div className="h-1.5 rounded bg-cyan-400" style={{width:`${c.rel*100}%`}}/></div><p className="text-sm text-slate-300">Evidence: {c.ids.join(', ')}. {c.why}</p></Card>)}
 <h3 className="font-medium text-cyan-300">Recommended next diagnostic tests</h3>{mine.map((r:Rec)=><RecCard key={r.id} r={r} upd={upd} setView={setView} all={all} say={say}/>)}</>}
 <div className="flex flex-wrap gap-2"><button className={btn} onClick={()=>{saveExp();say('Analysis saved')}}>Save Analysis</button><button className={btn2} onClick={()=>go('reports')}>Open Report</button><button className={btn2} onClick={reset}>Analyze Another Failure</button></div></>}

function Lib({all,setView,go}:any){
 const [q,setQ]=useState(''),[dm,setDm]=useState(''),[ct,setCt]=useState(''),[oc,setOc]=useState(''),[asc,setAsc]=useState(false),[grid,setGrid]=useState(false),[pg,setPg]=useState(0)
 const rows=all.filter((e:Experiment)=>(!dm||e.domain===dm)&&(!ct||e.category===ct)&&(!oc||e.outcome===oc)&&(!q||[e.id,e.prototype,e.symptom,e.component].join(' ').toLowerCase().includes(q.toLowerCase()))).sort((a:Experiment,b:Experiment)=>(asc?1:-1)*a.date.localeCompare(b.date))
 const page=rows.slice(pg*8,pg*8+8),sel=(v:string,set:any,l:string,o:string[])=><select className={`${inp} !w-auto`} value={v} onChange={e=>{set(e.target.value);setPg(0)}}><option value="">{l}</option>{o.map(x=><option key={x}>{x}</option>)}</select>
 return <><div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Experiment Library</h1><button className={btn} onClick={()=>go('new')}>New Experiment</button></div>
 <div className="flex flex-wrap gap-2"><div className="relative"><Search size={14} className="absolute left-2 top-3 text-slate-500"/><input className={`${inp} pl-7`} placeholder="Search ID, prototype, symptom, component" value={q} onChange={e=>{setQ(e.target.value);setPg(0)}}/></div>{sel(dm,setDm,'All domains',DOMAINS)}{sel(ct,setCt,'All categories',CATEGORIES)}{sel(oc,setOc,'All outcomes',['Resolved','Verified','Under Investigation','Repeated Failure'])}<button className={btn2} onClick={()=>setAsc(!asc)}>Date {asc?'↑':'↓'}</button><button className={btn2} onClick={()=>setGrid(!grid)}>{grid?'Table':'Cards'} view</button></div>
 {!rows.length?<Card className="text-center text-slate-400">No experiments match these filters.</Card>:grid?<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{page.map((e:Experiment)=><Card key={e.id}><button className="w-full text-left" onClick={()=>setView(e)}><div className="flex justify-between"><b className="text-cyan-300">{e.id}</b><Badge t={e.outcome}/></div><div className="text-sm">{e.prototype}</div><div className="text-xs text-slate-400">{e.component} · {e.symptom}</div></button></Card>)}</div>:<Card><Table rows={page} setView={setView}/></Card>}
 <div className="flex items-center gap-2 text-sm"><button className={btn2} disabled={!pg} onClick={()=>setPg(pg-1)}>Prev</button>Page {pg+1} of {Math.max(1,Math.ceil(rows.length/8))}<button className={btn2} disabled={(pg+1)*8>=rows.length} onClick={()=>setPg(pg+1)}>Next</button></div></>}

function Patterns({all,setView}:any){
 const [sel,setSel]=useState<string>('')
 const groups=CATEGORIES.map(c=>({c,rs:all.filter((e:Experiment)=>e.category===c)})).filter(g=>g.rs.length)
 return <><h1 className="text-2xl font-semibold">Failure Pattern Explorer</h1><p className="text-sm text-slate-400">Groups are by failure category in the sample data only; no trends beyond these records are implied.</p>
 <Card><ResponsiveContainer height={200}><BarChart data={groups.map(g=>({name:g.c,value:g.rs.length}))}><XAxis dataKey="name" stroke="#64748b" fontSize={11}/><YAxis allowDecimals={false} stroke="#64748b"/><Tooltip/><Bar dataKey="value" fill="#a78bfa"/></BarChart></ResponsiveContainer></Card>
 {groups.map(({c,rs})=><Card key={c}><button className="flex w-full justify-between text-left" onClick={()=>setSel(sel===c?'':c)}><b>{c}</b><span className="text-xs text-slate-400">{rs.length} related records</span></button>
 <p className="mt-1 text-xs text-slate-400">Symptoms: {rs.map((e:Experiment)=>e.symptom).join('; ')}</p><p className="text-xs text-slate-400">Components: {[...new Set(rs.map((e:Experiment)=>e.component))].join(', ')}</p>
 {sel===c&&<div className="mt-2 space-y-1 border-t border-white/10 pt-2 text-sm"><div className="text-xs text-slate-400">Conditions and approaches in the evidence:</div>{rs.map((e:Experiment)=><div key={e.id}><button className="text-cyan-300" onClick={()=>setView(e)}>{e.id}</button> {e.condition}. Test: {e.nextTest} <Badge t={e.outcome}/></div>)}</div>}</Card>)}</>}

function RecsPage({recs,upd,setView,all,say}:any){
 const cols:[string,TestStatus][]=[['Pending Tests','Pending'],['Completed Tests','Completed'],['Verified Fixes','Verified'],['Ineffective Approaches','Not Effective']]
 return <><h1 className="text-2xl font-semibold">Recommendations Center</h1>{!recs.length&&<Empty t="No recommendations yet. Run a failure analysis to generate some." go={()=>location.reload()}/>}
 <div className="grid gap-4 xl:grid-cols-4">{cols.map(([t,s])=><div key={s} className="space-y-3"><h3 className="text-sm text-cyan-300">{t} ({recs.filter((r:Rec)=>r.status===s).length})</h3>{recs.filter((r:Rec)=>r.status===s).map((r:Rec)=><RecCard key={r.id+r.status} r={r} upd={upd} setView={setView} all={all} say={say}/>)}</div>)}</div></>}

function Reports({all,recs}:any){
 const [id,setId]=useState(all[0].id),e:Experiment=all.find((x:Experiment)=>x.id===id)||all[0]
 const r=analyze(toQuery(e),all.filter((x:Experiment)=>x.id!==e.id)),mine=recs.filter((x:Rec)=>x.expId===e.id)
 const csv=()=>{const h=['id','prototype','domain','component','category','symptom','condition','finding','nextTest','outcome','date'],q=(v:string)=>`"${String(v).replace(/"/g,'""')}"`;const b=new Blob([[h.join(','),...all.map((x:any)=>h.map(k=>q(x[k])).join(','))].join('\n')],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='protosense-experiments.csv';a.click()}
 return <><div className="noprint flex flex-wrap items-center gap-2"><h1 className="mr-auto text-2xl font-semibold">Reports</h1><select className={`${inp} !w-auto`} value={id} onChange={ev=>setId(ev.target.value)}>{all.map((x:Experiment)=><option key={x.id} value={x.id}>{x.id} · {x.prototype}</option>)}</select><button className={btn} onClick={()=>window.print()}><Printer className="mr-1 inline" size={14}/>Print / Save as PDF</button><button className={btn2} onClick={csv}><Download className="mr-1 inline" size={14}/>Export CSV</button></div>
 <Card className="space-y-3"><h2 className="text-xl font-semibold">ProtoSense Failure Report: {e.id}</h2><Detail e={e}/><h3 className="font-medium">Similar historical cases (demo scores)</h3><ul className="text-sm">{r.top.map(m=><li key={m.e.id}>{m.e.id} · {m.e.symptom} · {Math.round(m.score*100)}%</li>)}</ul><h3 className="font-medium">Possible causes</h3><ul className="text-sm">{r.causes.length?r.causes.map(c=><li key={c.cause}>{c.cause} (evidence: {c.ids.join(', ')})</li>):<li>No strong historical match found.</li>}</ul><h3 className="font-medium">Recommended tests and verification status</h3><ul className="text-sm">{(mine.length?mine.map((x:Rec)=>`${x.test}: ${x.status}${x.result?' - '+x.result:''}`):r.tests.map(t=>`${t.test}: not yet tracked`)).map((s:string)=><li key={s}>{s}</li>)}</ul><Disclaimer/></Card></>}
