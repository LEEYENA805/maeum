const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const characters = {
  girl: {name:"마음이", image:"assets/girl.png"},
  boy: {name:"도윤이", image:"assets/boy.png"}
};

let currentCharacter = localStorage.getItem("character") || "girl";
let listening = false;
let recognition = null;

const questions = [
  "오늘 아침에는 무엇을 드셨어요? 맛있게 드셨나요?",
  "어릴 때 가장 좋아했던 놀이는 무엇이었나요?",
  "어렸을 때 살던 집은 어떤 모습이었는지 기억나세요?",
  "가족과 함께 갔던 여행 중에 기억에 남는 곳이 있나요?",
  "젊었을 때 자주 듣던 노래가 있었나요?",
  "예전에 가장 좋아했던 음식은 무엇이었어요?",
  "학교 다닐 때 친하게 지냈던 친구가 생각나시나요?",
  "가족 중에서 자주 생각나는 사람이 있나요?",
  "예전에 하셨던 일 중에서 가장 기억에 남는 일이 있나요?",
  "오늘 기분을 색깔로 표현한다면 어떤 색일까요?",
  "옛날 사진을 본다면 어떤 사진부터 보고 싶으세요?",
  "예전에 살던 동네에서 기억나는 장소가 있나요?"
];

const responses = [
  "그랬군요. 말씀해 주셔서 고마워요. 그 이야기를 천천히 더 들어보고 싶어요.",
  "정말 따뜻한 이야기네요. 기억나는 만큼만 편하게 이야기해 주세요.",
  "아, 그런 일이 있었군요. 자세히 말씀해 주셔서 제가 더 잘 알게 된 것 같아요.",
  "좋은 기억이네요. 서두르지 않아도 괜찮아요. 생각나는 것부터 말씀해 주세요.",
  "그때의 모습이 조금 떠오르는 것 같아요. 혹시 그때 함께 있었던 사람도 기억나세요?"
];

function nowTime(){
  return new Date().toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"});
}
function showToast(msg){
  const t=$("#toast"); t.textContent=msg; t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),2200);
}
function updateClock(){
  const d=new Date();
  const days=["일","월","화","수","목","금","토"];
  $("#clock").textContent=`현재시각 : ${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 ${days[d.getDay()]}요일 ${d.toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"})}`;
}
setInterval(updateClock,1000); updateClock();

function getHistory(){
  try{return JSON.parse(localStorage.getItem("memoryChat")||"[]")}catch(e){return []}
}
function saveHistory(list){localStorage.setItem("memoryChat",JSON.stringify(list));}
function addMessage(role,text,character=currentCharacter){
  const list=getHistory();
  list.push({role,text,character,time:nowTime()});
  saveHistory(list);
  renderChat();
}
function renderChat(){
  const list=getHistory().filter(m=>m.character===currentCharacter);
  const box=$("#chatList");
  box.innerHTML="";
  if(!list.length){
    box.innerHTML='<div class="msg ai">안녕하세요. 오늘도 편하게 이야기해요. 😊<br><br>기억나는 이야기가 있으면 천천히 말씀해 주세요.</div>';
    return;
  }
  list.forEach(m=>{
    const row=document.createElement("div");
    row.className="chat-row";
    row.innerHTML=`<div class="msg ${m.role}">${escapeHtml(m.text)}</div><div class="msg-time">${m.time}</div>`;
    box.appendChild(row);
  });
  box.scrollTop=box.scrollHeight;
}
function escapeHtml(s){
  return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function setCharacter(key){
  currentCharacter=key;
  localStorage.setItem("character",key);
  $("#mainCharacter").src=characters[key].image;
  $("#mainCharacter").alt=characters[key].name;
  $("#chatCharacterName").textContent=characters[key].name;
  $$(".char-tab").forEach(b=>b.classList.toggle("active",b.dataset.character===key));
  $$(".choice-card").forEach(b=>b.classList.toggle("selected",b.dataset.choice===key));
}

function warmReply(userText){
  const reply=responses[Math.floor(Math.random()*responses.length)];
  const q=questions[Math.floor(Math.random()*questions.length)];
  return `${reply}\n\n${q}`;
}

function speak(text){
  if(!$("#voiceToggle").checked || !("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  u.lang="ko-KR"; u.rate=.92; u.pitch=1.05;
  speechSynthesis.speak(u);
}

function handleTranscript(text){
  text=text.trim();
  if(!text) return;
  addMessage("user",text);
  const reply=warmReply(text);
  setTimeout(()=>{
    addMessage("ai",reply);
    speak(reply);
  },450);
}

function setupRecognition(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){
    $("#voiceStatus").textContent="이 브라우저에서는 음성 인식을 지원하지 않아요. Chrome에서 사용해 주세요.";
    return null;
  }
  const r=new SR();
  r.lang="ko-KR";
  r.continuous=false;
  r.interimResults=true;
  r.maxAlternatives=3;
  r.onstart=()=>{
    listening=true; $("#micBtn").classList.add("listening");
    $("#voiceStatus").textContent="듣고 있어요. 천천히 말씀해 주세요.";
  };
  r.onresult=(e)=>{
    let interim="";
    let final="";
    for(let i=e.resultIndex;i<e.results.length;i++){
      if(e.results[i].isFinal) final+=e.results[i][0].transcript;
      else interim+=e.results[i][0].transcript;
    }
    $("#voiceStatus").textContent=final||interim||"말씀을 듣고 있어요…";
    if(final) handleTranscript(final);
  };
  r.onerror=(e)=>{
    $("#voiceStatus").textContent=e.error==="not-allowed"?"마이크 권한을 허용해 주세요.":"잘 듣지 못했어요. 다시 천천히 말씀해 주세요.";
  };
  r.onend=()=>{
    listening=false; $("#micBtn").classList.remove("listening");
    if($("#voiceStatus").textContent.includes("듣고")) $("#voiceStatus").textContent="마음이에게 편하게 말씀해 주세요.";
  };
  return r;
}
recognition=setupRecognition();

$("#micBtn").addEventListener("click",()=>{
  if(!recognition) return;
  try{ if(listening) recognition.stop(); else recognition.start(); }
  catch(e){ showToast("잠시 후 다시 눌러주세요."); }
});

function openPage(page){
  $("#home").classList.toggle("hidden",page!=="home");
  $("#chatPage").classList.toggle("hidden",page!=="chat");
  $("#settingsPage").classList.toggle("hidden",page!=="settings");
  if(page==="chat") renderChat();
}

$("#historyBtn").onclick=()=>openPage("chat");
$("#chatBackBtn").onclick=()=>openPage("home");
$("#settingsBtn").onclick=()=>openPage("settings");
$("#settingsBackBtn").onclick=()=>openPage("home");
$("#menuBtn").onclick=()=>$("#drawer").classList.remove("hidden");
$("#drawerClose").onclick=()=>$("#drawer").classList.add("hidden");
$("#drawerHistory").onclick=()=>{$("#drawer").classList.add("hidden");openPage("chat")};
$("#drawerSettings").onclick=()=>{$("#drawer").classList.add("hidden");openPage("settings")};

$("#clearChatBtn").onclick=()=>{
  if(confirm("현재 캐릭터의 대화기록을 지울까요?")){
    const kept=getHistory().filter(m=>m.character!==currentCharacter);
    saveHistory(kept); renderChat(); showToast("대화기록을 지웠어요.");
  }
};

$$(".char-tab").forEach(b=>b.onclick=()=>setCharacter(b.dataset.character));
$$(".choice-card").forEach(b=>b.onclick=()=>{setCharacter(b.dataset.choice);showToast(`${characters[b.dataset.choice].name}와 대화할게요.`)});

$$(".setting-item").forEach(b=>b.onclick=()=>{
  const p=$("#"+b.dataset.panel); p.classList.toggle("hidden");
});

const personal={name:localStorage.getItem("userName")||"",guardian:localStorage.getItem("guardianName")||"",phone:localStorage.getItem("guardianPhone")||""};
$("#userName").value=personal.name; $("#guardianName").value=personal.guardian; $("#guardianPhone").value=personal.phone;
$("#savePersonalBtn").onclick=()=>{
  localStorage.setItem("userName",$("#userName").value.trim());
  localStorage.setItem("guardianName",$("#guardianName").value.trim());
  localStorage.setItem("guardianPhone",$("#guardianPhone").value.trim());
  showToast("개인정보를 저장했어요.");
};

const voiceSaved=localStorage.getItem("voiceEnabled");
$("#voiceToggle").checked=voiceSaved!=="false";
$("#voiceToggle").onchange=()=>localStorage.setItem("voiceEnabled",$("#voiceToggle").checked);

$("#childCallBtn").onclick=()=>{
  const phone=localStorage.getItem("guardianPhone")||"";
  if(!phone){openPage("settings");$("#personalPanel").classList.remove("hidden");showToast("먼저 보호자 전화번호를 저장해 주세요.");return;}
  location.href="tel:"+phone.replace(/[^0-9+]/g,"");
};

$("#emergencyBtn").onclick=()=>$("#emergencyModal").classList.remove("hidden");
$("#cancelEmergency").onclick=()=>$("#emergencyModal").classList.add("hidden");
$("#confirmEmergency").onclick=()=>{
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(
      ()=>{ $("#emergencyModal").classList.add("hidden"); location.href="tel:119"; },
      ()=>{ $("#emergencyModal").classList.add("hidden"); location.href="tel:119"; }
    );
  }else{
    $("#emergencyModal").classList.add("hidden"); location.href="tel:119";
  }
};

setCharacter(currentCharacter);
