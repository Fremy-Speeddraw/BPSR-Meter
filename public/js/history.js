import{a as v,d as A,b as O}from"./assets/logger-DkynYDV8.js";let _="en",y={},w={};async function $(t){try{const a=await fetch(`/api/translations/${t}`);if(!a.ok)return O("Translation response not ok:",a.status),!1;const s=await a.json();return s.code===0&&s.data?(y=s.data,_=t,v("Loaded translations for language:",t),v("Skills loaded:",y.skills?Object.keys(y.skills).length:0),v("Sample skills:",y.skills?Object.keys(y.skills).slice(0,10):[]),!0):!1}catch{return!1}}function z(t,a){var o;const s=String(t),r=((o=y.skills)==null?void 0:o[s])||a;return v("Available translations:",y.skills?Object.keys(y.skills).length:0),r}function H(t){var a;return((a=y.professions)==null?void 0:a[t])||t}async function j(){try{const a=await(await fetch("/api/player-registry")).json();a.code===0&&a.data&&(w=a.data,v("Loaded player registry:",Object.keys(w).length,"players"))}catch{}}function P(t,a){return a&&a!=="Unknown"&&a.trim()!==""?a:w[t]?w[t].name:"Unknown"}function N(){const t=document.getElementById("drag-indicator");if(!t||!window.electronAPI)return;let a=!1,s=0,r=0;t.addEventListener("mousedown",async o=>{a=!0,s=o.screenX,r=o.screenY;const i=await window.electronAPI.getWindowPosition(),e=i.x,c=i.y,f=d=>{if(!a)return;const l=d.screenX-s,p=d.screenY-r;window.electronAPI.setWindowPosition(e+l,c+p)},u=()=>{a=!1,document.removeEventListener("mousemove",f),document.removeEventListener("mouseup",u)};document.addEventListener("mousemove",f),document.addEventListener("mouseup",u)})}N();const x=document.getElementById("close-button");x&&x.addEventListener("click",()=>{window.close()});function B(t){const a=Math.floor(t/1e3),s=Math.floor(a/60),r=Math.floor(s/60);return r>0?`${r}h ${s%60}m`:s>0?`${s}m ${a%60}s`:`${a}s`}function T(t){return new Date(t).toLocaleString()}function g(t){return t>=1e6?(t/1e6).toFixed(2)+"M":t>=1e3?(t/1e3).toFixed(1)+"K":t.toFixed(0)}async function C(){const t=document.getElementById("history-list");if(t){t.innerHTML=`
        <div class="loading-indicator">
            <i class="fa-solid fa-spinner fa-spin"></i>
            Loading history...
        </div>
    `;try{const s=await(await fetch("/api/history/list")).json();if(s.code!==0||!s.data||s.data.length===0){t.innerHTML=`
                <div class="empty-state">
                    <i class="fa-solid fa-clock-rotate-left" style="font-size: 32px; opacity: 0.3; margin-bottom: 12px;"></i>
                    <p>No combat history found</p>
                    <p style="font-size: 11px; opacity: 0.6; margin-top: 8px;">Enable history saving to record combat sessions</p>
                </div>
            `;return}const r=s.data.sort((i,e)=>parseInt(e)-parseInt(i)),o=[];for(const i of r)try{const c=await(await fetch(`/api/history/${i}/summary`)).json();o.push({timestamp:i,summary:c.code===0?c.data:void 0})}catch(e){A(`Failed to load summary for ${i}:`,e),o.push({timestamp:i})}t.innerHTML=o.map(({timestamp:i,summary:e})=>{const c=T(parseInt(i)),f=e?B(e.duration):"Unknown",u=(e==null?void 0:e.userCount)||0,d=e!=null&&e.topDamage?g(e.topDamage.total):"-";return`
                <div class="history-item" data-timestamp="${i}">
                    <div class="history-item-header">
                        <i class="fa-solid fa-clock"></i>
                        <span class="history-date">${c}</span>
                    </div>
                    <div class="history-item-stats">
                        <div class="history-stat">
                            <i class="fa-solid fa-hourglass-half"></i>
                            <span>${f}</span>
                        </div>
                        <div class="history-stat">
                            <i class="fa-solid fa-users"></i>
                            <span>${u} players</span>
                        </div>
                        <div class="history-stat">
                            <i class="fa-solid fa-burst"></i>
                            <span>${d}</span>
                        </div>
                    </div>
                </div>
            `}).join(""),document.querySelectorAll(".history-item").forEach(i=>{i.addEventListener("click",async()=>{const e=i.getAttribute("data-timestamp");e&&(document.querySelectorAll(".history-item").forEach(c=>c.classList.remove("active")),i.classList.add("active"),await U(e))})})}catch{t.innerHTML=`
            <div class="empty-state error">
                <i class="fa-solid fa-exclamation-triangle" style="font-size: 32px; color: #ff6b7a; margin-bottom: 12px;"></i>
                <p>Failed to load history</p>
            </div>
        `}}}async function U(t){const a=document.getElementById("history-details");if(a){a.innerHTML=`
        <div class="loading-indicator">
            <i class="fa-solid fa-spinner fa-spin"></i>
            Loading details...
        </div>
    `;try{const[s,r]=await Promise.all([fetch(`/api/history/${t}/summary`),fetch(`/api/history/${t}/data`)]),o=await s.json(),i=await r.json();if(o.code!==0||i.code!==0)throw new Error("Failed to load history data");const e=o.data,c=i.user,f=Object.entries(c).sort((d,l)=>l[1].total_damage.total-d[1].total_damage.total),u=f.reduce((d,[,l])=>d+l.total_damage.total,0);a.innerHTML=`
            <div class="history-details-header">
                <h4>Combat Session</h4>
                <div class="history-details-meta">
                    <div class="meta-item">
                        <i class="fa-solid fa-calendar"></i>
                        <span>${T(e.startTime)}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fa-solid fa-hourglass-half"></i>
                        <span>${B(e.duration)}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fa-solid fa-users"></i>
                        <span>${e.userCount} players</span>
                    </div>
                </div>
            </div>
            
            <div class="history-player-list">
                ${f.map(([d,l],p)=>{const n=u>0?l.total_damage.total/u*100:0,m=p+1,k=P(d,l.name),h=(l.profession||"").split("-"),L=h[0],E=h[1],F=H(L),S=E?H(E):null;return`
                        <div class="history-player-item">
                            <div class="player-rank">#${m}</div>
                            <div class="player-info">
                                <div class="player-name">${k}</div>
                                <div class="player-profession">${S||F}</div>
                            </div>
                            <div class="player-stats">
                                <div class="player-stat">
                                    <span class="stat-label">Damage</span>
                                    <span class="stat-value">${g(l.total_damage.total)}</span>
                                </div>
                                <div class="player-stat">
                                    <span class="stat-label">DPS</span>
                                    <span class="stat-value">${g(l.total_dps)}</span>
                                </div>
                                <div class="player-stat">
                                    <span class="stat-label">Hits</span>
                                    <span class="stat-value">${g(l.total_count.total)}</span>
                                </div>
                                <div class="player-stat">
                                    <span class="stat-label">Heals</span>
                                    <span class="stat-value">${g(l.total_healing.total)}</span>
                                </div>
                                <div class="player-stat">
                                    <span class="stat-label">Share</span>
                                    <span class="stat-value">${n.toFixed(1)}%</span>
                                </div>
                            </div>
                            <button class="view-skills-btn" data-timestamp="${t}" data-uid="${d}" title="View skill breakdown">
                                <i class="fa-solid fa-chart-bar"></i>
                            </button>
                        </div>
                    `}).join("")}
            </div>
        `,document.querySelectorAll(".view-skills-btn").forEach(d=>{d.addEventListener("click",async l=>{const p=l.currentTarget,n=p.getAttribute("data-timestamp"),m=p.getAttribute("data-uid");n&&m&&await X(n,m)})})}catch{a.innerHTML=`
            <div class="empty-state error">
                <i class="fa-solid fa-exclamation-triangle" style="font-size: 32px; color: #ff6b7a; margin-bottom: 12px;"></i>
                <p>Failed to load combat details</p>
            </div>
        `}}}async function X(t,a){const s=document.getElementById("skill-modal"),r=document.getElementById("skill-modal-title"),o=document.getElementById("skill-modal-body");if(!(!s||!r||!o)){s.style.display="flex",o.innerHTML=`
        <div class="loading-indicator">
            <i class="fa-solid fa-spinner fa-spin"></i>
            Loading skills...
        </div>
    `;try{const e=await(await fetch(`/api/history/${t}/skill/${a}`)).json();if(e.code!==0)throw new Error("Failed to load skill data");const c=e.data,f=c.skills,u=P(a,c.name);r.textContent=`${u} - Skill Breakdown`;const d=Object.entries(f).sort((p,n)=>n[1].totalDamage-p[1].totalDamage),l=d.reduce((p,[,n])=>p+n.totalDamage,0);o.innerHTML=`
            <div class="skill-list">
                ${d.map(([p,n])=>{const m=l>0?n.totalDamage/l*100:0,k=n.totalCount>0?n.critCount/n.totalCount*100:0,h=n.totalCount>0?n.luckyCount/n.totalCount*100:0;return`
                        <div class="skill-item">
                            <div class="skill-header">
                                <div class="skill-name">${z(p,n.displayName)}</div>
                                <div class="skill-damage">${g(n.totalDamage)}</div>
                            </div>
                            <div class="skill-details">
                                <div class="skill-detail">
                                    <span class="detail-label">Share:</span>
                                    <span class="detail-value">${m.toFixed(1)}%</span>
                                </div>
                                <div class="skill-detail">
                                    <span class="detail-label">Hits:</span>
                                    <span class="detail-value">${n.totalCount.toLocaleString()}</span>
                                </div>
                                <div class="skill-detail">
                                    <span class="detail-label">Crit:</span>
                                    <span class="detail-value">${k.toFixed(1)}%</span>
                                </div>
                                <div class="skill-detail">
                                    <span class="detail-label">Lucky:</span>
                                    <span class="detail-value">${h.toFixed(1)}%</span>
                                </div>
                            </div>
                            <div class="skill-progress">
                                <div class="progress-bar" style="width: ${m}%"></div>
                            </div>
                        </div>
                    `}).join("")}
            </div>
        `}catch{o.innerHTML=`
            <div class="empty-state error">
                <i class="fa-solid fa-exclamation-triangle" style="font-size: 32px; color: #ff6b7a; margin-bottom: 12px;"></i>
                <p>Failed to load skill breakdown</p>
            </div>
        `}}}async function R(){try{const a=await(await fetch("/api/settings")).json(),s=document.getElementById("enable-history-btn");s&&a.code===0&&(a.data.enableHistorySave||!1?(s.innerHTML='<i class="fa-solid fa-toggle-on"></i> Saving Enabled',s.classList.add("enabled")):(s.innerHTML='<i class="fa-solid fa-toggle-off"></i> Enable Saving',s.classList.remove("enabled")))}catch{}}async function Y(){try{const a=await(await fetch("/api/settings")).json();if(a.code!==0)return;const s=!a.data.enableHistorySave;(await(await fetch("/api/settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...a.data,enableHistorySave:s})})).json()).code===0&&(await R(),v(`History saving ${s?"enabled":"disabled"}`))}catch{}}const D=document.getElementById("refresh-history-btn");D&&D.addEventListener("click",C);const I=document.getElementById("enable-history-btn");I&&I.addEventListener("click",Y);const M=document.getElementById("close-skill-modal");M&&M.addEventListener("click",()=>{const t=document.getElementById("skill-modal");t&&(t.style.display="none")});const b=document.getElementById("skill-modal");b&&b.addEventListener("click",t=>{t.target===b&&(b.style.display="none")});(async()=>{try{const a=await(await fetch("/api/settings")).json();if(a.code===0&&a.data.language){const s=a.data.language;await $(s),v(`History window loaded with language: ${s}`)}else await $("en")}catch{await $("en")}await j(),await R(),await C()})();setInterval(j,1e4);
