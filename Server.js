require('dotenv').config();
const express=require('express');
const axios=require('axios');
const app=express();
app.use(express.json());
const TOKEN=process.env.WHATSAPP_TOKEN;
const PHONE_ID=process.env.PHONE_NUMBER_ID;
const VERIFY=process.env.VERIFY_TOKEN;
let users={};
function getUser(id){if(!users[id])users[id]={saldo:0,masuk:0,keluar:0,transaksi:[]};return users[id];}
function fmt(n){return 'Rp '+Number(n).toLocaleString('id-ID');}
async function kirim(to,text){
await axios.post(`https://graph.facebook.com/v21.0/${PHONE_ID}/messages`,{messaging_product:'whatsapp',to:to,type:'text',text:{body:text}},{headers:{Authorization:`Bearer ${TOKEN}`}});
}
app.get('/webhook',(req,res)=>{
if(req.query['hub.mode']==='subscribe'&&req.query['hub.verify_token']===VERIFY){res.send(req.query['hub.challenge']);}else res.sendStatus(403);
});
app.post('/webhook',async(req,res)=>{
res.sendStatus(200);
try{
const msg=req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
if(!msg||msg.type!=='text')return;
const from=msg.from;
const body=msg.text.body.trim();
const lower=body.toLowerCase();
const user=getUser(from);
if(lower==='saldo'){await kirim(from,`💰 SALDO\nMasuk: ${fmt(user.masuk)}\nKeluar: ${fmt(user.keluar)}\nSisa: ${fmt(user.saldo)}`);return;}
if(lower==='riwayat'){
if(!user.transaksi.length){await kirim(from,'Belum ada transaksi. Coba: Kopi 25000');return;}
let list=user.transaksi.slice(-5).reverse().map((t,i)=>`${i+1}. ${t.ket} - ${fmt(t.nominal)}`).join('\n');
await kirim(from,`📋 RIWAYAT\n${list}\nSisa: ${fmt(user.saldo)}`);return;
}
if(lower==='halo'||lower==='hai'||lower==='help'||lower==='menu'){await kirim(from,`👋 DUITMATE\nCara pakai:\nKopi 25000 = catat keluar\nGaji 5000000 = catat masuk\nSaldo = cek saldo\nRiwayat = liat terakhir`);return;}
const m=body.match(/^(.+)\s+(\d+)(k|rb)?$/i);
if(m){
let ket=m[1].trim();
let nominal=parseInt(m[2]);
if(m[3])nominal=nominal*1000;
let isMasuk=/gaji|bonus|masuk|transfer|usaha/i.test(ket);
if(isMasuk){user.saldo+=nominal;user.masuk+=nominal;}else{user.saldo-=nominal;user.keluar+=nominal;}
user.transaksi.push({ket,nominal});
await kirim(from,`✅ DICATAT!\n${ket} : ${fmt(nominal)}\nSisa Saldo: ${fmt(user.saldo)}`);return;
}
await kirim(from,'Gak ngerti 😅 Coba: Kopi 25000 atau ketik Halo');
}catch(e){console.log(e.message);}
});
app.listen(process.env.PORT||3000,()=>console.log('Bot jalan!'));
