const $=id=>document.getElementById(id);
const LINES=Array.from({length:18},(_,i)=>`Line ${i+1}`);
const MACHINES=["Material Transport (MT)","Extruder (EXT)","Vacuum Cooling Unit (VCU)","Haul Off (HO)","CCM (Cutting Machine)","BE","Mixer 1","Mixer 2","Chiller","Compressor","Distribution Pump","Electricity","All","Generator","Dryer"];
const APPS=["AVEVA InTouch","AVEVA Historian","Dashboard MES to KPI","Report MES","HMI Pooling","HMI BE","HMI Extruder","Sensor","Telegram","Software di luar MES","Upgrade PLC"];
const PICS=["Digital Manufacturing","Produksi","Maintenance","Mitra Automation", "IT"];
const STATUS=["Open","In progress","Completed"];
let data=JSON.parse(JSON.stringify(window.APP_DATA));
let attach=[]; let dashState={}; let metricMode="number";
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const uniq=a=>[...new Set(a.filter(Boolean))].sort();
const iso=()=>new Date().toISOString().slice(0,10);
const fmt=d=>d?new Date(d+"T00:00:00").toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"}):"—";
const pct=(n,total)=>total?((n/total)*100).toFixed(1)+"%":"0.0%";
const PIC_MAP={DM:"Digital Manufacturing",PRD:"Produksi",MA:"Mitra Automation"};
function displayPIC(v){return PIC_MAP[v]||v||"Unassigned"}
function rawPIC(v){return Object.keys(PIC_MAP).find(k=>PIC_MAP[k]===v)||v}
function normalizeHistorical(){data.forEach(r=>{if(PIC_MAP[r.pic])r.pic=PIC_MAP[r.pic]; if(r.application==="AVEVA In Touch")r.application="AVEVA InTouch";});}
function opts(id,a,all=""){const el=$(id);if(!el)return;el.innerHTML=(all?`<option value="">${all}</option>`:"")+a.map(x=>`<option>${esc(x)}</option>`).join("")}
function toast(x){let t=$("toast");t.textContent=x;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
function save(){localStorage.setItem("ngoroRepo",JSON.stringify(data))}
try{let s=localStorage.getItem("ngoroRepo");if(s)data=JSON.parse(s)}catch(e){}
normalizeHistorical();
function nav(p){document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));$(p).classList.add("active");document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===p));$("title").textContent={dashboard:"Issue Dashboard",report:"Report New Issue",repository:"Issue Repository",analysis:"Issue Analysis",lesson:"Lesson Learned",master:"Master Data"}[p];if(p==="dashboard")dash();if(p==="repository")repo();if(p==="analysis")analysis();if(p==="lesson")lessons();if(p==="master")master()}
document.querySelectorAll(".nav").forEach(x=>x.onclick=()=>nav(x.dataset.page));
function openReport(id=""){formReset();if(id)edit(id);nav("report")}
function formReset(){attach=[];$("form").reset();$("editId").value="";opts("line",LINES);opts("application",APPS);opts("machine",MACHINES);opts("pic",PICS);opts("status",STATUS);opts("failure",uniq(FAILURE_MODE_MASTER.map(x=>x["Failure Mode"])));$("category").innerHTML="<option></option>";$("date").value=iso();$("attachments").innerHTML=""}
function edit(id){let r=data.find(x=>x.id===id);if(!r)return;$("editId").value=id;["issue","date","line","application","machine","requestBy","pic","status","due","close","rca","ca","pa","verification","notes"].forEach(k=>$(k).value=r[{issue:"issue",date:"issueDate",line:"line",application:"application",machine:"machine",requestBy:"requestBy",pic:"pic",status:"status",due:"dueDate",close:"actualCloseDate",rca:"rootCause",ca:"correctiveAction",pa:"preventiveAction",verification:"verification",notes:"notes"}[k]]||"");$("failure").value=r.failureMode;category();$("category").value=r.category;attach=r.attachments||[];showAttach()}
function category(){let f=$("failure").value,c=uniq(FAILURE_MODE_MASTER.filter(x=>x["Failure Mode"]===f).map(x=>x.Category));opts("category",c);if(c.length===1)$("category").value=c[0]}
$("failure").onchange=category;
$("files").onchange=async e=>{attach=[];for(let f of e.target.files){let d=await new Promise((a,b)=>{let r=new FileReader();r.onload=()=>a(r.result);r.onerror=b;r.readAsDataURL(f)});attach.push({name:f.name,data:d})}showAttach()};
function showAttach(){$("attachments").innerHTML=attach.map(a=>`<div class="att"><img src="${a.data}"></div>`).join("")}
$("form").onsubmit=e=>{e.preventDefault();let id=$("editId").value,old=id&&data.find(x=>x.id===id);if(!id){let y=$("date").value.slice(0,4),n=data.reduce((m,r)=>Math.max(m,+(r.id||"").split("-").pop()||0),0)+1;id=`NGR-MES-${y}-${String(n).padStart(4,"0")}`}let r={...(old||{}),id,issueDate:$("date").value,issue:$("issue").value.trim(),line:$("line").value,application:$("application").value,machine:$("machine").value,requestBy:$("requestBy").value.trim(),pic:$("pic").value,status:$("status").value,dueDate:$("due").value,actualCloseDate:$("close").value,failureMode:$("failure").value,category:$("category").value,rootCause:$("rca").value.trim(),correctiveAction:$("ca").value.trim(),preventiveAction:$("pa").value.trim(),verification:$("verification").value.trim(),notes:$("notes").value.trim(),attachments:attach,mappingStatus:$("failure").value?(old?.mappingStatus==="Mapped from Monitoring"?"Mapped from Monitoring":"Manually Classified"):"Need Classification",mappingScore:old?.mappingScore||0};let i=data.findIndex(x=>x.id===id);if(i>=0)data[i]=r;else data.unshift(r);save();toast((old?"Updated ":"Created ")+id);repo();lessons();nav("repository")};
function range(from,to){return data.filter(r=>(!from||r.issueDate>=from)&&(!to||r.issueDate<=to))}
function counts(a,k){let o={};a.forEach(r=>{let v=(r[k]||"Unclassified").trim();o[v]=(o[v]||0)+1});return Object.entries(o).sort((a,b)=>b[1]-a[1])}
function periodRange(){let p=$("period").value,t=iso(),d=new Date(),f=$("from").value||t;if(p==="daily"){f=t} else if(p==="weekly"){d.setDate(d.getDate()-6);f=d.toISOString().slice(0,10)} else if(p==="monthly"){f=new Date(d.getFullYear(),d.getMonth(),1).toISOString().slice(0,10)} else if(p==="yearly"){f=new Date(d.getFullYear(),0,1).toISOString().slice(0,10)} else {f=$("from").value||t;t=$("to").value||t}if(p!=="custom"){$("from").value=f;$(`to`).value=t}return [$("from").value,$("to").value]}
function applyDash(a){return a.filter(r=>Object.entries(dashState).every(([k,v])=>(r[k]||"Unclassified")===v))}
function clearDash(){dashState={};dash()}
function clickDash(k,v){if(dashState[k]===v)delete dashState[k];else dashState[k]=v;dash()}
function barValue(n,total){return metricMode==="percent"?pct(n,total):n}
function bars(id,pairs,n=8,key="",total=1){let a=pairs.slice(0,n),m=a[0]?.[1]||1;$(id).innerHTML=a.length?`<div class="bars">${a.map(x=>`<div class="barrow clickable" data-k="${esc(key)}" data-v="${esc(x[0])}"><span title="${esc(x[0])}">${esc(x[0])}</span><div class="barbg"><div class="barfill" style="width:${Math.max(3,x[1]/m*100)}%"></div></div><span class="barvalue">${barValue(x[1],total)}</span></div>`).join("")}</div>`:"<div class='empty'>No data for selected filter.</div>";$(id).querySelectorAll(".clickable").forEach(el=>el.onclick=()=>clickDash(el.dataset.k,el.dataset.v))}
function dash(){let [from,to]=periodRange(),a=applyDash(range(from,to)),n=a.length,c=a.filter(r=>r.status==="Completed").length,o=a.filter(r=>r.status==="Open").length,pr=a.filter(r=>r.status==="In progress").length,cl=a.filter(r=>r.failureMode).length;let rv=a.filter(r=>r.issueDate&&r.actualCloseDate).map(r=>(new Date(r.actualCloseDate)-new Date(r.issueDate))/864e5);$("dashFilterState").innerHTML=Object.keys(dashState).length?`<span><b>Active filter:</b> ${Object.entries(dashState).map(([k,v])=>`${esc(k)} = ${esc(v)}`).join(" · ")}</span><button class="secondary" onclick="clearDash()">Clear Filter</button>`:`<span>Click any Application, Machine, Line, PIC or Pareto bar to filter the dashboard.</span>`;$("kpis").innerHTML=[["TOTAL ISSUE",barValue(n,n),"records"],["COMPLETED",barValue(c,n),n?pct(c,n)+" completed":"0%"],["IN PROGRESS",barValue(pr,n),"being handled"],["OPEN",barValue(o,n),"needs attention"],["CLASSIFIED",barValue(cl,n),n?pct(cl,n)+" classified":"0%"],["AVG RESOLUTION",rv.length?(rv.reduce((x,y)=>x+y,0)/rv.length).toFixed(1):"—","days"]].map(x=>`<div class="kpi"><small>${x[0]}</small><b>${x[1]}</b><span>${x[2]}</span></div>`).join("");bars("appbars",counts(a,"application"),8,"application",n);bars("machinebars",counts(a,"machine"),8,"machine",n);bars("linebars",counts(a,"line"),10,"line",n);bars("picbars",counts(a,"pic"),8,"pic",n);pareto("pareto",counts(a,"failureMode"),n);trend(a);donut(a)}
function trend(a){let m={};a.forEach(r=>{if(r.issueDate)m[r.issueDate]=(m[r.issueDate]||0)+1});let ds=Object.keys(m).sort(),mx=Math.max(...ds.map(x=>m[x]),1),w=850,h=240,p=30;if(!ds.length){$("trend").innerHTML="<div class='empty'>No data for selected filter.</div>";return}let pts=ds.map((x,i)=>[p+(ds.length===1?(w-2*p)/2:i*(w-2*p)/(ds.length-1)),h-p-m[x]/mx*(h-2*p)]),step=Math.max(1,Math.ceil(ds.length/10)),labels=ds.filter((x,i)=>i%step===0||i===ds.length-1);let path=pts.map((x,i)=>(i?"L":"M")+x[0].toFixed(1)+" "+x[1].toFixed(1)).join(" ");$("trend").innerHTML=`<svg viewBox="0 0 ${w} ${h}" width="100%" height="100%" preserveAspectRatio="none"><path d="M${p} ${h-p}H${w-p}" stroke="#e2e7ed"/><path d="${path}" fill="none" stroke="#245da8" stroke-width="3"/>${pts.map((x,i)=>{let n=m[ds[i]],lab=metricMode==="percent"?pct(n,a.length):n;return `<circle class="tip-target" cx="${x[0]}" cy="${x[1]}" r="3.5" fill="#245da8" data-tip="<b>${esc(fmt(ds[i]))}</b><br>Issue: ${n}<br>Share: ${pct(n,a.length)}"></circle><text class="pointlabel" x="${x[0]}" y="${Math.max(12,x[1]-9)}" text-anchor="middle" font-size="9" font-weight="700" fill="#17396e">${esc(String(lab))}</text>`}).join("")}${labels.map(x=>{let i=ds.indexOf(x);return `<text x="${pts[i][0]}" y="${h-5}" text-anchor="middle" font-size="8" fill="#788">${esc(ds[i].slice(5))}</text>`}).join("")}</svg>`;tipBind($("trend"))}
function tipBind(root){root.querySelectorAll(".tip-target").forEach(el=>{el.onmouseenter=e=>showTip(e,el.dataset.tip);el.onmouseleave=hideTip})}
function showTip(e,content){let t=$("chartTip");if(!t){t=document.createElement("div");t.id="chartTip";document.body.appendChild(t)}t.innerHTML=content;t.style.left=Math.min(window.innerWidth-230,e.clientX+12)+"px";t.style.top=Math.min(window.innerHeight-100,e.clientY+12)+"px";t.classList.add("show")}
function hideTip(){if($("chartTip"))$("chartTip").classList.remove("show")}
function donut(a){let p=counts(a,"status"),tot=a.length||1,col=["#245da8","#e5232a","#16825f","#9aa5b1"],deg=0,st=[];p.forEach((x,i)=>{let q=x[1]/tot*360;st.push(`${col[i%4]} ${deg}deg ${deg+q}deg`);deg+=q});$("donut").innerHTML=`<div class="donut" style="background:conic-gradient(${st.join(",")})"></div><div class="legend">${p.map((x,i)=>`<div class="tip-target" data-tip="<b>${esc(x[0])}</b><br>Issue: ${x[1]}<br>Share: ${pct(x[1],tot)}"><i style="background:${col[i%4]}"></i>${esc(x[0])}: <b>${barValue(x[1],tot)}</b></div>`).join("")}</div>`;tipBind($("donut"))}
function pareto(id,p,total){p=p.filter(x=>x[0]!=="Unclassified").slice(0,12);if(!p.length){$(id).innerHTML="<div class='empty'>No classified data for selected filter.</div>";return}let m=p[0][1],tot=total||p.reduce((s,x)=>s+x[1],0);$(id).innerHTML=p.map(x=>`<div class="pcol clickable" data-v="${esc(x[0])}"><div class="pnum">${barValue(x[1],tot)}</div><div class="pbar" style="height:${Math.max(3,x[1]/m*190)}px"></div><div class="plabel" title="${esc(x[0])}">${esc(x[0])}</div></div>`).join("");$(id).querySelectorAll(".pcol").forEach(el=>{el.onclick=()=>clickDash("failureMode",el.dataset.v);el.onmouseenter=e=>showTip(e,`<b>${esc(el.dataset.v)}</b><br>Issue: ${p.find(x=>x[0]===el.dataset.v)[1]}<br>Share: ${pct(p.find(x=>x[0]===el.dataset.v)[1],tot)}`);el.onmouseleave=hideTip})}
$("period").onchange=()=>{dashState={};dash()};$("from").onchange=()=>{$("period").value="custom";dash()};$("to").onchange=()=>{$("period").value="custom";dash()};$("metricNumber").onclick=()=>{metricMode="number";$("metricNumber").classList.add("active");$("metricPercent").classList.remove("active");dash()};$("metricPercent").onclick=()=>{metricMode="percent";$("metricPercent").classList.add("active");$("metricNumber").classList.remove("active");dash()};
let repoFilterInitialized=false;
function initRepoFilters(){
  if(repoFilterInitialized)return;
  opts("rstatus",STATUS,"All Status");
  opts("rfailure",uniq(data.map(r=>r.failureMode)),"All Failure Mode");
  opts("rapp",uniq(APPS.concat(data.map(r=>r.application||""))),"All Application");
  opts("rline",LINES,"All Line");
  opts("rmachine",uniq(data.map(r=>r.machine)),"All Machine");
  opts("rpic",PICS,"All PIC");
  opts("rcategory",uniq(data.map(r=>r.category)),"All Category");
  repoFilterInitialized=true;
}
function repo(){
  initRepoFilters();
  const q=($("search").value||"").toLowerCase().trim();
  const from=$("rfrom").value,to=$("rto").value;
  const st=$("rstatus").value,f=$("rfailure").value,a=$("rapp").value;
  const l=$("rline").value,m=$("rmachine").value,p=$("rpic").value,c=$("rcategory").value;
  const x=data.filter(r=>
    (!q||[r.id,r.issue,r.machine,r.line,r.pic,r.application,r.failureMode,r.category,r.rootCause,r.correctiveAction,r.preventiveAction,r.lessonLearned].join(" ").toLowerCase().includes(q))&&
    (!from||r.issueDate>=from)&&
    (!to||r.issueDate<=to)&&
    (!st||r.status===st)&&
    (!f||r.failureMode===f)&&
    (!a||r.application===a)&&
    (!l||r.line===l)&&
    (!m||r.machine===m)&&
    (!p||r.pic===p)&&
    (!c||r.category===c)
  );
  $("repoCount").textContent=`Showing ${x.length} of ${data.length} issues`;
  $("tbody").innerHTML=x.length?x.map(r=>`<tr><td><b>${esc(r.id)}</b></td><td>${fmt(r.issueDate)}</td><td>${esc(r.issue)}</td><td>${esc(r.application)}</td><td>${esc(r.line)}</td><td>${esc(r.machine)}</td><td>${esc(r.failureMode||"Need Classification")}</td><td>${esc(r.category||"—")}</td><td>${esc(r.pic||"—")}</td><td><span class="status ${r.status.replace(" ","-")}">${esc(r.status||"—")}</span></td><td><button class="action" onclick="openReport('${r.id}')">Edit</button> <button class="action danger-action" onclick="deleteIssue('${r.id}')">Delete</button></td></tr>`).join(""):`<tr><td colspan="11">No matching records.</td></tr>`;
}
function bindRepo(){
  initRepoFilters();
  ["search","rfrom","rto","rstatus","rfailure","rapp","rline","rmachine","rpic","rcategory"].forEach(i=>{
    if($(i)){ $(i).oninput=repo; $(i).onchange=repo; }
  });
  if($("resetRepo"))$("resetRepo").onclick=()=>{
    ["search","rfrom","rto","rstatus","rfailure","rapp","rline","rmachine","rpic","rcategory"].forEach(i=>{if($(i))$(i).value=""});
    repo();
  };
}
function analysis(){let a=range($("afrom").value,$("ato").value),k=$("group").value;pareto("apareto",counts(a,k),a.length);$("top").innerHTML=a.slice().sort((x,y)=>y.issueDate.localeCompare(x.issueDate)).slice(0,10).map(r=>`<div style="padding:9px 0;border-bottom:1px solid #e2e7ed"><b>${esc(r.id)}</b><br><small>${fmt(r.issueDate)} · ${esc(r.application)} · ${esc(r.line)}</small><br>${esc(r.issue)}</div>`).join("")}

function getLessonText(r){
  return String(
    r.problemSolvingLesson ??
    r.lessonLearned ??
    r.lesson ??
    r.guidance ??
    r.knowledge ??
    r.lesson_learned ??
    ""
  ).trim();
}

function lessonRows(){
  const q=($("lsearch")?.value||"").toLowerCase().trim();

  const source=data.filter(r=>{
    const lesson=String(r.problemSolvingLesson ?? r.lessonLearned ?? r.lesson ?? r.guidance ?? r.knowledge ?? r.lesson_learned ?? "").trim();
    const hasKnowledge=!!(r.rootCause||r.correctiveAction||r.preventiveAction||r.verification||r.notes);
    return hasKnowledge &&
      (!q||[r.id,r.issue,r.rootCause,r.correctiveAction,r.preventiveAction,lesson,r.notes,r.application,r.failureMode,r.category].join(" ").toLowerCase().includes(q));
  });

  // One card per issue. If an issue was updated, keep only its latest record.
  const byIssue=new Map();
  source.forEach(r=>{
    const key=String(r.id);
    const old=byIssue.get(key);
    const time=new Date(r.problemSolvingUpdatedAt||r.issueDate||0).getTime();
    const oldTime=old?new Date(old.problemSolvingUpdatedAt||old.issueDate||0).getTime():-1;
    if(!old || time>=oldTime)byIssue.set(key,r);
  });

  return [...byIssue.values()].sort((a,b)=>{
    const ta=new Date(a.problemSolvingUpdatedAt||a.issueDate||0).getTime();
    const tb=new Date(b.problemSolvingUpdatedAt||b.issueDate||0).getTime();
    return tb-ta;
  });
}

function renderLessonCards(){
  const a=lessonRows();
  const box=$("lessons");
  if(!box)return;

  box.innerHTML=a.length?a.map(r=>{
    const lesson=String(r.problemSolvingLesson ?? r.lessonLearned ?? r.lesson ?? r.guidance ?? r.knowledge ?? r.lesson_learned ?? "").trim();
    const updated=r.problemSolvingUpdatedAt
      ? new Date(r.problemSolvingUpdatedAt).toLocaleString("id-ID",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})
      : "";

    return `<article class="lesson">
      <div class="lesson-topline"><span class="lesson-updated">${updated?"Updated "+esc(updated):""}</span></div>
      <h3>${esc(r.id)} — ${esc(r.issue)}</h3>
      <span class="chip">${esc(r.application||"—")}</span>
      <span class="chip">${esc(r.line||"—")}</span>
      <span class="chip">${esc(r.failureMode||"Need Classification")}</span>
      <p><b>Root Cause:</b> ${esc(r.rootCause||"Not documented")}</p>
      <p><b>Corrective Action:</b> ${esc(r.correctiveAction||"Not documented")}</p>
      <p><b>Preventive Action:</b> ${esc(r.preventiveAction||"Not documented")}</p>
      <p><b>Verification:</b> ${esc(r.verification||"Not documented")}</p>
      <p><b>Notes:</b> ${esc(r.notes||"Not documented")}</p>
    </article>`;
  }).join(""):"<div class='empty'>Belum ada Lesson Learned.</div>";
}

function lessons(){renderLessonCards();}
function master(){$("masterbody").innerHTML=FAILURE_MODE_MASTER.map(x=>`<tr><td>${esc(x.Application)}</td><td>${esc(x["Failure Mode"])}</td><td>${esc(x.Category)}</td></tr>`).join("");$("lists").innerHTML=[["Lines",LINES],["Application",APPS],["Machine",MACHINES],["PIC",PICS],["Status",STATUS]].map(x=>`<div class="system"><b>${x[0]}</b><p>${esc(x[1].join(" • "))}</p></div>`).join("")}
function tableFile(rows,headers,fields,filename){let body=[headers.join("\t")].concat(rows.map(r=>fields.map(f=>String(r[f]??"").replace(/\t/g," ").replace(/\n/g," ")).join("\t"))).join("\n");let blob=new Blob(["\ufeff"+body],{type:"application/vnd.ms-excel;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
function repoRows(){let q=($("search").value||"").toLowerCase().trim(),from=$("rfrom").value,to=$("rto").value,st=$("rstatus").value,f=$("rfailure").value,a=$("rapp").value,l=$("rline").value,m=$("rmachine").value,p=$("rpic").value,c=$("rcategory").value;return data.filter(r=>(!q||[r.id,r.issue,r.machine,r.line,r.pic,r.application,r.failureMode,r.category,r.rootCause,r.correctiveAction,r.preventiveAction,r.lessonLearned].join(" ").toLowerCase().includes(q))&&(!from||r.issueDate>=from)&&(!to||r.issueDate<=to)&&(!st||r.status===st)&&(!f||r.failureMode===f)&&(!a||r.application===a)&&(!l||r.line===l)&&(!m||r.machine===m)&&(!p||r.pic===p)&&(!c||r.category===c))}
function printReport(title,content){let w=window.open("","_blank");w.document.write(`<html><head><title>${esc(title)}</title><style>body{font:10px Arial;padding:24px;color:#18222c}h1{color:#17396e}table{border-collapse:collapse;width:100%;font-size:8px}th,td{border:1px solid #ccd3da;padding:5px;text-align:left;vertical-align:top}th{background:#eef3f8}.btn{padding:7px 10px;margin-bottom:12px}</style></head><body><button class="btn" onclick="window.print()">Print / Save as PDF</button><h1>${esc(title)}</h1><p>Plant Ngoro · ${new Date().toLocaleString("id-ID")}</p>${content}</body></html>`);w.document.close();w.focus()}

function deleteIssue(id){
  const r=data.find(x=>x.id===id);
  if(!r) return;

  const ok=window.confirm(
    `Hapus issue ${r.id}?\n\n${r.issue||""}\n\nData yang dihapus tidak dapat dikembalikan.`
  );
  if(!ok) return;

  data=data.filter(x=>x.id!==id);

  if(typeof save==="function"){
    save();
  }else{
    localStorage.setItem(STORAGE_KEY,JSON.stringify(data));
  }

  if(typeof repo==="function") repo();
  if(typeof dash==="function") dash();
  if(typeof lessons==="function") lessons();

  toast(`Issue ${id} berhasil dihapus.`);
}

function exportHistory(){let rows=repoRows();tableFile(rows,["Issue ID","Date","Issue","Application","Line","Machine","Failure Mode","Category","Issue By","PIC","Status","RCA","Corrective","Preventive","Verification","Notes","Lesson Learned"],["id","issueDate","issue","application","line","machine","failureMode","category","requestBy","pic","status","rootCause","correctiveAction","preventiveAction","verification","notes","lessonLearned"],"MES_Issue_History_Ngoro.xls");toast("History exported to Excel")}
function pdfHistory(){let rows=repoRows();let h=["ID","Date","Issue","Application","Line","Machine","Failure Mode","Category","PIC","Status"],f=["id","issueDate","issue","application","line","machine","failureMode","category","pic","status"];printReport("MES Issue History — Plant Ngoro",`<table><thead><tr>${h.map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${f.map(k=>`<td>${esc(r[k]||"—")}</td>`).join("")}</tr>`).join("")}</tbody></table>`) }
function exportLessons(){let rows=lessonRows();tableFile(rows,["Issue ID","Issue","Application","Line","Failure Mode","Root Cause","Corrective Action","Preventive Action","Verification","Notes","Lesson Learned"],["id","issue","application","line","failureMode","rootCause","correctiveAction","preventiveAction","verification","notes","lessonLearned"],"MES_Lesson_Learned_Ngoro.xls");toast("Lesson Learned exported to Excel")}
function pdfLessons(){let rows=lessonRows();printReport("MES Lesson Learned — Plant Ngoro",rows.map(r=>`<h3>${esc(r.id)} — ${esc(r.issue)}</h3><p><b>Root Cause:</b> ${esc(r.rootCause||"—")}</p><p><b>Corrective Action:</b> ${esc(r.correctiveAction||"—")}</p><p><b>Preventive Action:</b> ${esc(r.preventiveAction||"—")}</p><p><b>Verification:</b> ${esc(r.verification||"—")}</p><p><b>Lesson Learned / Guidance:</b> ${esc(r.lessonLearned||"—")}</p><hr>`).join(""))}
function exportAnalysis(){let a=range($("afrom").value,$("ato").value),p=counts(a,$("group").value);let rows=p.map(x=>({group:x[0],issue:x[1],percentage:pct(x[1],a.length)}));tableFile(rows,["Group","Issue","Percentage"],["group","issue","percentage"],"MES_Issue_Analysis_Ngoro.xls");toast("Analysis exported to Excel")}
function pdfAnalysis(){let a=range($("afrom").value,$("ato").value),p=counts(a,$("group").value);printReport("MES Issue Analysis — Plant Ngoro",`<table><thead><tr><th>Group</th><th>Issue</th><th>Percentage</th></tr></thead><tbody>${p.map(x=>`<tr><td>${esc(x[0])}</td><td>${x[1]}</td><td>${pct(x[1],a.length)}</td></tr>`).join("")}</tbody></table>`)}
function pdfDashboard(){let [from,to]=periodRange(),a=applyDash(range(from,to));printReport("MES Dashboard — Plant Ngoro",`<h2>${fmt(from)} — ${fmt(to)}</h2><p><b>Total Issue:</b> ${a.length} · <b>Completed:</b> ${a.filter(r=>r.status==="Completed").length} · <b>Open:</b> ${a.filter(r=>r.status==="Open").length} · <b>In Progress:</b> ${a.filter(r=>r.status==="In progress").length}</p><h3>Failure Mode Pareto</h3><ol>${counts(a,"failureMode").filter(x=>x[0]!=="Unclassified").map(x=>`<li>${esc(x[0])}: ${x[1]} (${pct(x[1],a.length)})</li>`).join("")}</ol><h3>Application</h3><ol>${counts(a,"application").map(x=>`<li>${esc(x[0])}: ${x[1]} (${pct(x[1],a.length)})</li>`).join("")}</ol>`)}
function initLessonEditor(){
  const el=$("lessonIssue");
  if(!el)return;

  const completed=data.filter(r=>String(r.status).toLowerCase()==="completed");
  el.innerHTML=`<option value="">Select Completed Issue</option>`+
    completed.map(r=>`<option value="${esc(r.id)}">${esc(r.id)} — ${esc(r.issue)}</option>`).join("");

  el.onchange=()=>{
    const r=data.find(x=>String(x.id)===String(el.value));
    if(!r)return;

    if($("lessonIssueMeta"))$("lessonIssueMeta").textContent=
      `${r.application||"—"} · ${r.line||"—"} · ${r.failureMode||"Need Classification"}`;

    $("rca").value=r.rootCause||"";
    $("ca").value=r.correctiveAction||"";
    $("pa").value=r.preventiveAction||"";
    $("verification").value=r.verification||"";
    $("notes").value=r.notes||"";
    $("lesson").value=String(r.problemSolvingLesson ?? r.lessonLearned ?? "").trim();
  };
}
function saveLessonEditor(){
  const issueEl=$("lessonIssue");
  if(!issueEl){toast("Form Problem Solving belum siap.");return false;}

  const id=String(issueEl.value||"").trim();
  if(!id){toast("Pilih issue yang sudah Completed terlebih dahulu.");return false;}

  const index=data.findIndex(x=>String(x.id)===id);
  if(index<0){toast("Issue tidak ditemukan.");return false;}

  const get=id=>String($(id)?.value||"").trim();
  const r=data[index];

  r.rootCause=get("rca");
  r.correctiveAction=get("ca");
  r.preventiveAction=get("pa");
  r.verification=get("verification");
  r.notes=get("notes");

  // Dedicated field for the Problem Solving & Knowledge textbox.
  r.problemSolvingLesson=get("lesson");
  r.problemSolvingUpdatedAt=new Date().toISOString();

  try{
    save();

    // Re-read the same issue from storage and verify the dedicated field.
    const stored=JSON.parse(localStorage.getItem("ngoroRepo")||"[]");
    const saved=stored.find(x=>String(x.id)===id);
    if(!saved || String(saved.problemSolvingLesson||"").trim()!==r.problemSolvingLesson){
      throw new Error("Problem Solving Lesson persistence verification failed");
    }

    data=stored;
    renderLessonCards();

    // Clear every Problem Solving field, including Guidance, after save.
    ["rca","ca","pa","verification","notes","lesson"].forEach(id=>{
      const el=$(id);
      if(el)el.value="";
    });
    if($("lessonIssue"))$("lessonIssue").value="";
    if($("lessonIssueMeta"))$("lessonIssueMeta").textContent="";

    if($("lessonSaveStatus"))$("lessonSaveStatus").textContent=
      "✓ Saved — "+new Date().toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"});
    toast("Problem Solving & Knowledge berhasil disimpan.");
    return true;
  }catch(e){
    console.error(e);
    toast("Data belum berhasil disimpan.");
    return false;
  }
}
function clearLessonEditor(){
  ["rca","ca","pa","verification","notes","lesson"].forEach(id=>{
    const el=$(id); if(el)el.value="";
  });
  if($("lessonIssue"))$("lessonIssue").value="";
  if($("lessonIssueMeta"))$("lessonIssueMeta").textContent="";
  if($("lessonSaveStatus"))$("lessonSaveStatus").textContent="";
}
formReset();initLessonEditor();$("saveLesson").onclick=saveLessonEditor;$("clearLesson").onclick=clearLessonEditor;let now=iso(),dd=new Date();$("from").value=new Date(dd.getFullYear(),dd.getMonth(),1).toISOString().slice(0,10);$("to").value=now;$("afrom").value=$("from").value;$("ato").value=now;bindRepo();$("exportHistoryXls").onclick=exportHistory;$("exportHistoryPdf").onclick=pdfHistory;$("exportLessonXls").onclick=exportLessons;$("exportLessonPdf").onclick=pdfLessons;$("exportAnalysisXls").onclick=exportAnalysis;$("exportAnalysisPdf").onclick=pdfAnalysis;$("exportDashPdf").onclick=pdfDashboard;dash();repo();master();lessons();
function initCompletedIssueSelector(){
  const el=$("lessonIssue");
  if(!el) return;

  const completed=data.filter(r=>r.status==="Completed");
  const current=el.value;

  el.innerHTML=`<option value="">Select Completed Issue</option>`+
    completed.map(r=>`<option value="${esc(r.id)}">${esc(r.id)} — ${esc(r.issue)}</option>`).join("");

  if(current && completed.some(r=>r.id===current)) el.value=current;

  el.onchange=()=>{
    const r=data.find(x=>x.id===el.value);
    if(!r) return;
    const set=(id,v)=>{const e=$(id);if(e)e.value=v||""};
    set("lessonRca",r.rootCause);
    set("lessonCa",r.correctiveAction);
    set("lessonPa",r.preventiveAction);
    set("lessonVerification",r.verification);
    set("lessonNotes",r.notes);
    set("lessonGuidance",r.lessonLearned);
  };
}

(function(){
  function showLoading(text){
    const o=document.getElementById("appLoading");
    const t=document.getElementById("loadingText");
    if(!o)return;
    if(t)t.textContent=text||"Loading...";
    o.classList.add("show");
    clearTimeout(window.__dmLoadTimer);
    window.__dmLoadTimer=setTimeout(()=>o.classList.remove("show"),260);
  }
  function addClickFeedback(){
    document.querySelectorAll("button,.nav-item,.chartbar,.filter-card,.kpi-card").forEach(el=>{
      el.classList.add("interactive-click");
      if(!el.__dmBound){
        el.addEventListener("click",()=>showLoading("Updating..."),{passive:true});
        el.__dmBound=true;
      }
    });
  }
  function markActiveFilters(){
    document.querySelectorAll(".filters select,.filters input").forEach(el=>{
      const active=!!el.value;
      el.classList.toggle("filter-active",active);
    });
  }
  document.addEventListener("change",e=>{
    if(e.target.matches("select,input")) {
      markActiveFilters();
      showLoading("Applying filter...");
      setTimeout(addClickFeedback,30);
    }
  });
  document.addEventListener("click",e=>{
    if(e.target.closest("button,.nav-item,.chartbar,.filter-card,.kpi-card")){
      setTimeout(addClickFeedback,30);
    }
  });
  setTimeout(addClickFeedback,100);
  setTimeout(markActiveFilters,120);
})();
