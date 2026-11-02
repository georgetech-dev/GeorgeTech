export function initTicketWizard({form,onStep=()=>{}}){
 const $=id=>document.getElementById(id);let step=0;
 function show(value){step=value;$('ticket-step-service').hidden=value!==0;$('ticket-step-details').hidden=value!==1;
  $('ticket-progress-service').setAttribute('aria-current',value===0?'step':'false');$('ticket-progress-details').setAttribute('aria-current',value===1?'step':'false');onStep(value);}
 function services(){const invalid=['product','category'].map($).find(e=>!e.checkValidity());if(invalid){show(0);invalid.reportValidity();return false;}return true;}
 $('ticket-next').onclick=()=>{if(services()){show(1);$('subject').focus();}};
 $('ticket-previous').onclick=()=>{show(0);$('product').focus();};
 form.addEventListener('reset',()=>show(0));
 return {start:()=>show(0),details(){if(services()){show(1);return true;}return false;},validate(){
  if(!services())return false;if(step===0){show(1);$('subject').focus();return false;}
  return ['subject','details'].every(id=>$(id).reportValidity());
 }};
}
