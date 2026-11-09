export function formatMoney(value,currency="RUB"){
  const amount=Number(value);
  if(!Number.isFinite(amount))return "—";
  const code=String(currency||"RUB").toUpperCase();
  try{
    return new Intl.NumberFormat("ru-RU",{style:"currency",currency:code,maximumFractionDigits:Number.isInteger(amount)?0:2}).format(amount);
  }catch{
    return new Intl.NumberFormat("ru-RU",{maximumFractionDigits:2}).format(amount)+" "+code;
  }
}

export function formatPaymentDate(value){
  if(!value)return "Без даты оплаты";
  const due=new Date(value+"T12:00:00");
  if(Number.isNaN(due.getTime()))return "Дата не указана";
  const today=new Date();
  today.setHours(12,0,0,0);
  const days=Math.round((due-today)/86400000);
  if(days===0)return "сегодня";
  if(days===1)return "завтра";
  if(days>1)return "через "+days+" дн.";
  if(days===-1)return "просрочен на 1 дн.";
  return "просрочен на "+Math.abs(days)+" дн.";
}
