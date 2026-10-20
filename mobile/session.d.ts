export const TOKEN_KEY:string;
export const SESSION_KEY:string;
export function clearStoredSession(store:{deleteItemAsync(key:string):Promise<void>},clearState:()=>void):Promise<void>;
export type StoredSession={refreshToken:string|null;idToken:string|null;expiresAt:number};
export function restoreStoredSession(options:{token:string|null;session:Partial<StoredSession>|null;refresh:(token:string)=>Promise<{accessToken:string;refreshToken?:string;idToken?:string;expiresIn?:number}>;loadAccount:(token:string)=>Promise<Response>;persist:(token:string,session:StoredSession)=>Promise<void>;clear:()=>Promise<void>;now?:()=>number}):Promise<{token:string;session:StoredSession;account:any}|null>;
