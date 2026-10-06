'use strict';
const COLS=10,ROWS=20,CELL=32;
const COLORS={I:'#68daff',O:'#ffe066',T:'#ca7dff',S:'#70e6a0',Z:'#ff6e87',J:'#6c91ff',L:'#ffaa5c'};
const FACES=[':3','=w=','^w^','owo','uwu','>w<','=^='];
const SHAPES={
 I:[[[0,1],[1,1],[2,1],[3,1]],[[2,0],[2,1],[2,2],[2,3]]],
 O:[[[1,0],[2,0],[1,1],[2,1]]],
 T:[[[1,0],[0,1],[1,1],[2,1]],[[1,0],[1,1],[2,1],[1,2]],[[0,1],[1,1],[2,1],[1,2]],[[1,0],[0,1],[1,1],[1,2]]],
 S:[[[1,0],[2,0],[0,1],[1,1]],[[1,0],[1,1],[2,1],[2,2]]],
 Z:[[[0,0],[1,0],[1,1],[2,1]],[[2,0],[1,1],[2,1],[1,2]]],
 J:[[[0,0],[0,1],[1,1],[2,1]],[[1,0],[2,0],[1,1],[1,2]],[[0,1],[1,1],[2,1],[2,2]],[[1,0],[1,1],[0,2],[1,2]]],
 L:[[[2,0],[0,1],[1,1],[2,1]],[[1,0],[1,1],[1,2],[2,2]],[[0,1],[1,1],[2,1],[0,2]],[[0,0],[1,0],[1,1],[1,2]]]
};
const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d');
const holdCanvas=document.querySelector('#hold'),hctx=holdCanvas.getContext('2d');
const nextCanvas=document.querySelector('#next'),nctx=nextCanvas.getContext('2d');
const $=s=>document.querySelector(s),scoreEl=$('#score'),levelEl=$('#level'),linesEl=$('#lines'),overlay=$('#overlay'),overlayTitle=$('#overlayTitle'),overlayText=$('#overlayText'),overlayButton=$('#overlayButton'),toast=$('#toast');
let board,current,queue,bag,holdKind,canHold,score,lines,level,combo,paused,gameOver,last=0,dropTimer=0,lockTimer=0,toastTimer=0,particles=[];
const rnd=a=>a[Math.floor(Math.random()*a.length)];
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function fillQueue(){while(queue.length<6){if(!bag.length)bag=shuffle(Object.keys(SHAPES));queue.push(bag.pop())}}
function piece(kind){return{kind,x:3,y:-1,r:0,face:rnd(FACES)}}
function takePiece(){fillQueue();const p=piece(queue.shift());fillQueue();return p}
function cells(p=current,x=p.x,y=p.y,r=p.r){return SHAPES[p.kind][r%SHAPES[p.kind].length].map(([bx,by])=>[x+bx,y+by])}
function valid(p=current,x=p.x,y=p.y,r=p.r){return cells(p,x,y,r).every(([cx,cy])=>cx>=0&&cx<COLS&&cy<ROWS&&(cy<0||!board[cy][cx]))}
function reset(){board=Array.from({length:ROWS},()=>Array(COLS).fill(null));queue=[];bag=[];fillQueue();current=takePiece();holdKind=null;canHold=true;score=0;lines=0;level=1;combo=-1;paused=false;gameOver=false;dropTimer=0;lockTimer=0;particles=[];hideOverlay();updateUI()}
function move(dx,dy){if(paused||gameOver)return false;const nx=current.x+dx,ny=current.y+dy;if(valid(current,nx,ny)){current.x=nx;current.y=ny;if(dx)lockTimer=0;return true}return false}
function rotate(dir){if(paused||gameOver)return;const n=SHAPES[current.kind].length;if(n<=1)return;const target=(current.r+dir+n)%n;for(const[ox,oy]of[[0,0],[-1,0],[1,0],[-2,0],[2,0],[0,-1]])if(valid(current,current.x+ox,current.y+oy,target)){current.x+=ox;current.y+=oy;current.r=target;lockTimer=0;return}}
function ghostY(){let y=current.y;while(valid(current,current.x,y+1))y++;return y}
function hardDrop(){if(paused||gameOver)return;const y=ghostY(),d=y-current.y;current.y=y;score+=d*2;lockPiece()}
function hold(){if(paused||gameOver||!canHold)return;const old=current.kind;if(holdKind==null){holdKind=old;current=takePiece()}else{const swap=holdKind;holdKind=old;current=piece(swap)}canHold=false;lockTimer=0;if(!valid())endGame();updateUI()}
function lockPiece(){for(const[x,y]of cells()){if(y<0){endGame();return}board[y][x]={kind:current.kind,color:COLORS[current.kind],face:current.face}}const full=[];for(let y=0;y<ROWS;y++)if(board[y].every(Boolean))full.push(y);if(full.length)clearLines(full);else combo=-1;current=takePiece();canHold=true;lockTimer=0;if(!valid())endGame();updateUI()}
function clearLines(rows){for(const row of rows)for(let x=0;x<COLS;x++)for(let i=0;i<3;i++)particles.push({x:x*CELL+CELL/2,y:row*CELL+CELL/2,vx:(Math.random()-.5)*5.4,vy:-1.5-Math.random()*3.7,life:28+Math.random()*22,size:2+Math.random()*3,color:rnd(Object.values(COLORS))});for(const row of [...rows].sort((a,b)=>b-a))board.splice(row,1);for(let i=0;i<rows.length;i++)board.unshift(Array(COLS).fill(null));const count=rows.length;lines+=count;level=Math.floor(lines/10)+1;score+=({1:100,2:300,3:500,4:800}[count]||0)*level;combo++;if(combo>0)score+=50*combo*level;let msg=count===4?'NYAAAA~! TETRIS! :3':count===3?'TRIPLE NYA~!':count===2?'DOUBLE NYA~!':'NYA~!';if(combo>=1)msg+=`  COMBO x${combo+1}`;showToast(msg);updateUI()}
function showToast(s){toast.textContent=s;toast.classList.add('show');toastTimer=1100}
function endGame(){gameOver=true;showOverlay('GAME OVER','o neko ficou sem espaço pra dormir...\n\nscore: '+score,'tentar de novo :3')}
function togglePause(){if(gameOver)return;paused=!paused;if(paused)showOverlay('PAUSA','(＿ ＿*) Z z z','voltar');else hideOverlay()}
function showOverlay(t,p,b){overlayTitle.textContent=t;overlayText.textContent=p;overlayButton.textContent=b;overlay.classList.remove('hidden')}
function hideOverlay(){overlay.classList.add('hidden')}
overlayButton.onclick=()=>gameOver?reset():togglePause();$('#pauseTop').onclick=togglePause;
function updateUI(){scoreEl.textContent=String(score).padStart(8,'0');levelEl.textContent=level;linesEl.textContent=lines;drawPreviews()}
function drawBlock(c,x,y,color,face=':3',ghost=false,size=CELL){c.save();if(ghost){c.globalAlpha=.28;c.strokeStyle=color;c.lineWidth=2;c.strokeRect(x+3,y+3,size-6,size-6);c.restore();return}c.fillStyle='#0006';roundRect(c,x+2,y+5,size-4,size-5,7);c.fill();c.fillStyle=color;roundRect(c,x+2,y+2,size-4,size-5,7);c.fill();c.globalAlpha=.3;c.fillStyle='#fff';roundRect(c,x+5,y+5,size-10,4,3);c.fill();c.globalAlpha=1;if(size>=28){c.fillStyle='#291d35';c.font='bold 11px monospace';c.textAlign='center';c.textBaseline='middle';c.fillText(face,x+size/2,y+size/2+1)}c.restore()}
function roundRect(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r)}
function draw(){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#0e0d16';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.strokeStyle='#302b42';ctx.lineWidth=1;for(let x=0;x<=COLS;x++){ctx.beginPath();ctx.moveTo(x*CELL,0);ctx.lineTo(x*CELL,ROWS*CELL);ctx.stroke()}for(let y=0;y<=ROWS;y++){ctx.beginPath();ctx.moveTo(0,y*CELL);ctx.lineTo(COLS*CELL,y*CELL);ctx.stroke()}for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){const b=board[y][x];if(b)drawBlock(ctx,x*CELL,y*CELL,b.color,b.face)}if(!gameOver){const gy=ghostY();for(const[bx,by]of SHAPES[current.kind][current.r])if(gy+by>=0)drawBlock(ctx,(current.x+bx)*CELL,(gy+by)*CELL,COLORS[current.kind],current.face,true);for(const[bx,by]of SHAPES[current.kind][current.r])if(current.y+by>=0)drawBlock(ctx,(current.x+bx)*CELL,(current.y+by)*CELL,COLORS[current.kind],current.face)}for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/50);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1}
function mini(c,kind,cx,cy,size=20){if(!kind)return;const blocks=SHAPES[kind][0],xs=blocks.map(b=>b[0]),ys=blocks.map(b=>b[1]),minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys),w=(maxx-minx+1)*size,h=(maxy-miny+1)*size;for(const[bx,by]of blocks)drawBlock(c,cx-w/2+(bx-minx)*size,cy-h/2+(by-miny)*size,COLORS[kind],'',false,size)}
function drawPreviews(){hctx.clearRect(0,0,holdCanvas.width,holdCanvas.height);nctx.clearRect(0,0,nextCanvas.width,nextCanvas.height);mini(hctx,holdKind,48,42,19);queue.slice(0,3).forEach((k,i)=>mini(nctx,k,48,35+i*68,18))}
function update(dt){if(!paused&&!gameOver){dropTimer+=dt;const interval=Math.max(70,700-(level-1)*55);if(dropTimer>=interval){dropTimer=0;if(!move(0,1))lockTimer+=interval}if(!valid(current,current.x,current.y+1)){lockTimer+=dt;if(lockTimer>=450)lockPiece()}else lockTimer=0}for(const p of particles){p.x+=p.vx;p.y+=p.vy;p.vy+=.16;p.life-=dt/16.67}particles=particles.filter(p=>p.life>0);if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)toast.classList.remove('show')}}
function loop(t){const dt=Math.min(50,t-last||16);last=t;update(dt);draw();requestAnimationFrame(loop)}
const held={left:false,right:false,down:false},repeat={left:0,right:0,down:0};
function action(name,initial=true){if(name==='left')move(-1,0);else if(name==='right')move(1,0);else if(name==='down'){if(move(0,1))score++}else if(name==='rotate')rotate(1);else if(name==='hold')hold();else if(name==='drop')hardDrop();updateUI()}
document.querySelectorAll('[data-action]').forEach(btn=>{const a=btn.dataset.action;const start=e=>{e.preventDefault();btn.classList.add('active');if(['left','right','down'].includes(a)){held[a]=true;repeat[a]=0}action(a)};const end=e=>{e.preventDefault();btn.classList.remove('active');held[a]=false};btn.addEventListener('pointerdown',start);btn.addEventListener('pointerup',end);btn.addEventListener('pointercancel',end);btn.addEventListener('pointerleave',end)});
setInterval(()=>{if(paused||gameOver)return;for(const a of ['left','right','down'])if(held[a]){repeat[a]+=50;if(repeat[a]>=a==='down'?50:150){action(a);repeat[a]=a==='down'?0:95}}},50);
addEventListener('keydown',e=>{const keys=['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' ','x','X','z','Z','c','C','p','P','Escape'];if(keys.includes(e.key))e.preventDefault();if(e.repeat)return;if(e.key==='ArrowLeft')action('left');else if(e.key==='ArrowRight')action('right');else if(e.key==='ArrowDown')action('down');else if(e.key==='ArrowUp'||e.key.toLowerCase()==='x')action('rotate');else if(e.key.toLowerCase()==='z')rotate(-1);else if(e.key.toLowerCase()==='c')action('hold');else if(e.key===' ')action('drop');else if(e.key.toLowerCase()==='p'||e.key==='Escape')togglePause()},{passive:false});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&!paused&&!gameOver)togglePause()});
reset();requestAnimationFrame(loop);
