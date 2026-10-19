export function vercelConfig(apiOrigin){
 const fallback={source:'/((?!.well-known/|assets/|images/|icons/|v1/|health/|client-config|install.html|native-release.json|privacy.html|sw.js|manifest.webmanifest).*)',destination:'/index.html'};
 const manifestHeaders={source:'/native-release.json',headers:[{key:'Cache-Control',value:'no-store'}]};
 if(!apiOrigin)return {rewrites:[fallback],headers:[manifestHeaders,{source:'/client-config',headers:[{key:'Content-Type',value:'application/json'},{key:'Cache-Control',value:'private, no-store'}]}]};
 const url=new URL(apiOrigin);
 if(url.protocol!=='https:'||url.origin!==apiOrigin||url.username||url.password)throw new Error('A bare trusted HTTPS API origin is required');
 return {
  rewrites:[{source:'/v1/:path*',destination:apiOrigin+'/v1/:path*'},{source:'/client-config',destination:apiOrigin+'/client-config'},{source:'/health/:path*',destination:apiOrigin+'/health/:path*'},fallback],
  headers:[manifestHeaders,...['/v1/:path*','/client-config','/health/:path*'].map(source=>({source,headers:[{key:'Cache-Control',value:'private, no-store'},{key:'x-vercel-enable-rewrite-caching',value:'0'}]}))]
 };
}
