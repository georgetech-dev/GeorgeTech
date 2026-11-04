export function appointmentWindow(a,now=Date.now()){
 const opens=Date.parse(a.join_opens_at||a.starts_at)- (a.join_opens_at?0:600000),end=Date.parse(a.ends_at);
 if(a.status!=='scheduled')return{available:false,label:a.status==='cancelled'?'Appointment cancelled':'Appointment ended'};
 if(now>=end)return{available:false,label:'Appointment ended'};
 const seconds=Math.max(0,Math.ceil((opens-now)/1000));if(!seconds)return{available:true,label:'Join appointment'};
 const days=Math.floor(seconds/86400),h=Math.floor(seconds%86400/3600),m=Math.floor(seconds%3600/60),s=seconds%60,pad=n=>String(n).padStart(2,'0');
 return{available:false,label:'Join opens in '+(days?days+'d ':'')+(h?pad(h)+':':'')+pad(m)+':'+pad(s)};
}
