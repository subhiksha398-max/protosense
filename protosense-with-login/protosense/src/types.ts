export type Outcome='Resolved'|'Under Investigation'|'Repeated Failure'|'Verified'
export type TestStatus='Pending'|'Completed'|'Verified'|'Not Effective'
export interface Experiment{id:string;prototype:string;domain:string;component:string;category:string;symptom:string;condition:string;finding:string;nextTest:string;cause:string;outcome:Outcome;date:string;fixes:string}
export interface Rec{id:string;expId:string;test:string;reason:string;support:string[];expected:string;status:TestStatus;result:string}
export interface Cause{cause:string;rel:number;ids:string[];why:string}
export interface Analysis{input:Record<string,string>;top:{e:Experiment;score:number}[];strong:boolean;causes:Cause[];recIds:string[]}
