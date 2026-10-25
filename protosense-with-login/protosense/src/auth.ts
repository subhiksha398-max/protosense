// DEMO-ONLY authentication. Accounts and the session live in this browser's
// localStorage. There is no server-side check, so this is NOT secure authentication.
export type Session={name:string;email:string}
type Acct={name:string;email:string;hash:string}
const USERS='protosense.demo.users',SESSION='protosense.session'
export const DEMO={name:'Demo User',email:'demo@protosense.com',password:'demo1234'}

const read=<T,>(k:string,i:T):T=>{try{const r=localStorage.getItem(k);return r?JSON.parse(r):i}catch{return i}}
const write=(k:string,v:unknown)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}}

// Light obfuscation so passwords are not kept as plain text. Not a security measure.
async function hash(p:string){
 try{if(crypto?.subtle){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('protosense-demo:'+p));return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('')}}catch{}
 return 'b64:'+btoa(unescape(encodeURIComponent(p)))
}
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms))

export const getSession=():Session|null=>read<Session|null>(SESSION,null)
export const signOut=()=>{try{localStorage.removeItem(SESSION)}catch{}}

export async function login(email:string,password:string):Promise<{ok:true;s:Session}|{ok:false;msg:string}>{
 await wait(600)
 const e=email.trim().toLowerCase()
 let s:Session|null=null
 if(e===DEMO.email&&password===DEMO.password)s={name:DEMO.name,email:DEMO.email}
 else{const a=read<Acct[]>(USERS,[]).find(u=>u.email===e);if(a&&a.hash===await hash(password))s={name:a.name,email:a.email}}
 if(!s)return{ok:false,msg:'That email and password do not match. Please check them and try again.'}
 write(SESSION,s);return{ok:true,s}
}


export async function signup(
  name: string,
  email: string,
  password: string
): Promise<{ok: true; s: Session} | {ok: false; msg: string}> {
  try {
    const response = await fetch('http://127.0.0.1:5000/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {ok: false, msg: data.error || 'Registration failed.'};
    }

    const s: Session = {
      name: name.trim(),
      email: email.trim().toLowerCase()
    };

    return {ok: true, s};
  } catch {
    return {
      ok: false,
      msg: 'Cannot connect to server. Please check that the backend is running.'
    };
  }
}
