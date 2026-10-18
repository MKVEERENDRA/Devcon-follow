import {createHmac} from 'node:crypto';

export function createTicketVerifier(config){
  return {
    configured: Boolean(config.url?.startsWith('https://') && config.token && config.hmacKey?.length>=32),
    async verify({ticketSecret,subject,email}){
      if(!config.url||!config.token||!config.hmacKey||config.hmacKey.length<32){
        const e=new Error('Organizer-approved ticket verification not configured');e.statusCode=503;throw e;
      }
      if(!config.url.startsWith('https://'))throw new Error('Ticket provider URL must use HTTPS');
      const response=await fetch(config.url,{
        method:'POST',headers:{Authorization:`Bearer ${config.token}`,'Content-Type':'application/json'},
        body:JSON.stringify({credential:ticketSecret,subject,email}),signal:AbortSignal.timeout(8000),redirect:'error'
      });
      if(!response.ok){const e=new Error('Organizer verification unavailable or declined');e.statusCode=503;throw e;}
      const result=await response.json();
      // A shared ticket code alone is NOT proof of ownership. Provider must positively bind to a verified account identity.
      if(result.eligible!==true || result.identityBound!==true || !result.ticketId || !result.identitySubject || result.identitySubject!==subject){
        const e=new Error('Ticket ownership could not be verified');e.statusCode=403;throw e;
      }
      return {ticketDigest:createHmac('sha256',config.hmacKey).update(String(result.ticketId)).digest('hex'),
        status:'verified',attestedAt:new Date(),provider:'organizer',userId:subject};
    }
  };
}
