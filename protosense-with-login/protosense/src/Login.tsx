import {useState,FormEvent} from 'react'
import {Cpu,Eye,EyeOff,Loader2,Mail,Lock,User,AlertCircle,ArrowLeft,Search,Network,ListChecks} from 'lucide-react'
import {btn} from './ui'
import {login,signup,Session,DEMO} from './auth'

const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const fld='w-full rounded-lg border bg-[#0d1426] py-2.5 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'

function Input({id,label,icon:I,err,right,...p}:any){
 return <div><label htmlFor={id} className="mb-1 block text-xs font-medium text-slate-300">{label}</label>
  <div className="relative"><I size={16} className="pointer-events-none absolute left-3 top-3 text-slate-500"/>
   <input id={id} aria-invalid={!!err} aria-describedby={err?id+'-err':undefined} className={`${fld} ${right?'pr-10':''} ${err?'border-rose-500/60':'border-white/10'}`} {...p}/>{right}</div>
  {err&&<p id={id+'-err'} role="alert" className="mt-1 text-xs text-rose-400">{err}</p>}</div>
}

export default function Login({mode,setMode,onSuccess,onBack}:{mode:'login'|'signup';setMode:(m:'login'|'signup')=>void;onSuccess:(s:Session)=>void;onBack:()=>void}){
 const isLogin=mode==='login'
 const [v,setV]=useState({name:'',email:'',password:'',confirm:''}),[errs,setErrs]=useState<Record<string,string>>({})
 const [show,setShow]=useState(false),[busy,setBusy]=useState(false),[formErr,setFormErr]=useState('')
 const set=(k:string)=>(e:any)=>{setV({...v,[k]:e.target.value});if(errs[k])setErrs({...errs,[k]:''});setFormErr('')}

 const validate=()=>{const e:Record<string,string>={}
  if(!isLogin&&v.name.trim().length<2)e.name='Please enter your full name.'
  if(!v.email.trim())e.email='Email is required.';else if(!EMAIL.test(v.email.trim()))e.email='Enter a valid email, e.g. name@college.edu.'
  if(!v.password)e.password='Password is required.'
  else if(!isLogin&&(v.password.length<8||!/[A-Za-z]/.test(v.password)||!/\d/.test(v.password)))e.password='Use at least 8 characters with a letter and a number.'
  if(!isLogin){if(!v.confirm)e.confirm='Please confirm your password.';else if(v.confirm!==v.password)e.confirm='Passwords do not match.'}
  setErrs(e);return !Object.keys(e).length}

 const submit=async(ev:FormEvent)=>{ev.preventDefault();if(busy||!validate())return
  setBusy(true);setFormErr('')
  const r=isLogin?await login(v.email,v.password):await signup(v.name,v.email,v.password)
  setBusy(false);r.ok?onSuccess(r.s):setFormErr(r.msg)}

 const swap=()=>{setMode(isLogin?'signup':'login');setErrs({});setFormErr('');setV({...v,password:'',confirm:''})}
 const useDemo=()=>{setV({...v,email:DEMO.email,password:DEMO.password});setErrs({});setFormErr('')}
 const eye=<button type="button" onClick={()=>setShow(!show)} aria-label={show?'Hide password':'Show password'} className="absolute right-2 top-2 rounded p-1 text-slate-400 hover:text-cyan-300">{show?<EyeOff size={16}/>:<Eye size={16}/>}</button>

 return <div className="relative flex min-h-screen overflow-hidden">
  <svg className="absolute inset-0 h-full w-full opacity-40" aria-hidden>{Array.from({length:18}).map((_,i)=>{const x=(i*97)%1200,y=(i*61)%800;return <g key={i}><line x1={x} y1={y} x2={(x+160)%1200} y2={(y+90)%800} stroke="#22d3ee" strokeOpacity=".15"/><circle className="node" style={{animationDelay:`${i*.3}s`}} cx={x} cy={y} r="3" fill="#22d3ee"/></g>})}</svg>
  <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl"/><div className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl"/>

  <aside className="relative z-10 hidden w-1/2 flex-col justify-between border-r border-white/10 bg-[#080c19]/70 p-12 backdrop-blur lg:flex">
   <div className="flex items-center gap-2 font-bold tracking-wide text-cyan-300"><Cpu/>ProtoSense</div>
   <div><p className="text-sm text-purple-300">Prototype Failure Pattern Predictor</p>
    <h2 className="mt-3 text-4xl font-bold leading-tight">Turn Prototype Failures Into Engineering Insights.</h2>
    <ul className="mt-8 space-y-4 text-sm text-slate-300">
     {([[Search,'Search past experiments by symptom, component or ID'],[Network,'Spot recurring failure patterns across your records'],[ListChecks,'Get evidence-backed next diagnostic tests']] as any[]).map(([I,t])=><li key={t} className="flex items-center gap-3"><span className="rounded-lg bg-cyan-500/10 p-2 text-cyan-300"><I size={16}/></span>{t}</li>)}</ul></div>
   <p className="text-xs text-slate-500">College project demonstration</p></aside>

  <main className="relative z-10 flex flex-1 items-center justify-center p-4 sm:p-8">
   <div className="w-full max-w-md">
    <div className="mb-6 flex items-center justify-between"><button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-400 hover:text-cyan-300"><ArrowLeft size={14}/>Back to home</button><div className="flex items-center gap-2 font-bold text-cyan-300 lg:hidden"><Cpu size={18}/>ProtoSense</div></div>
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-8">
     <h1 className="text-2xl font-semibold">{isLogin?'Welcome back':'Create your account'}</h1>
     <p className="mt-1 text-sm text-slate-400">{isLogin?'Log in to open your ProtoSense dashboard.':'Sign up to start analyzing prototype failures.'}</p>
     {formErr&&<div role="alert" className="mt-4 flex gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300"><AlertCircle size={16} className="mt-0.5 shrink-0"/>{formErr}</div>}
     <form onSubmit={submit} noValidate className="mt-5 space-y-4">
      {!isLogin&&<Input id="name" label="Full name" icon={User} err={errs.name} value={v.name} onChange={set('name')} placeholder="Your name" autoComplete="name"/>}
      <Input id="email" label="Email" icon={Mail} err={errs.email} type="email" value={v.email} onChange={set('email')} placeholder="you@college.edu" autoComplete="email"/>
      <Input id="password" label="Password" icon={Lock} err={errs.password} right={eye} type={show?'text':'password'} value={v.password} onChange={set('password')} placeholder={isLogin?'Enter your password':'At least 8 characters'} autoComplete={isLogin?'current-password':'new-password'}/>
      {!isLogin&&<Input id="confirm" label="Confirm password" icon={Lock} err={errs.confirm} type={show?'text':'password'} value={v.confirm} onChange={set('confirm')} placeholder="Re-enter your password" autoComplete="new-password"/>}
      <button type="submit" disabled={busy} className={`${btn} flex w-full items-center justify-center gap-2 py-2.5 disabled:opacity-60`}>{busy&&<Loader2 size={16} className="animate-spin"/>}{busy?(isLogin?'Logging in...':'Creating account...'):(isLogin?'Login':'Create Account')}</button>
     </form>
     <p className="mt-5 text-center text-sm text-slate-400">{isLogin?"Don't have an account? ":'Already have an account? '}<button onClick={swap} className="font-medium text-cyan-300 hover:underline">{isLogin?'Create Account':'Login'}</button></p>
     {isLogin&&<div className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-400"><div className="flex items-center justify-between gap-2"><span>Demo login: <b className="text-slate-200">{DEMO.email}</b> / <b className="text-slate-200">{DEMO.password}</b></span><button type="button" onClick={useDemo} className="shrink-0 text-cyan-300 hover:underline">Fill in</button></div></div>}
    </div>
    <p className="mt-4 text-center text-xs text-amber-300/80">Demo-only login: accounts are kept in this browser and are not securely authenticated by the server. Do not use a real password.</p>
   </div></main></div>}
