export const TOKEN_KEY:string;
export const SESSION_KEY:string;
export function clearStoredSession(store:{deleteItemAsync(key:string):Promise<void>},clearState:()=>void):Promise<void>;
