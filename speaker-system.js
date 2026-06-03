// ============================================================
// SPEAKER SYSTEM & SPL MAPPING MODULE
// ============================================================

// Definição de tipos de falantes disponíveis
const SPEAKER_TYPES = {
    fullrange: { label: 'Full Range', coverage: 90, maxSPL: 130, power: 1000 },
    linearray: { label: 'Line Array', coverage: 120, maxSPL: 135, power: 2000 },
    point: { label: 'Point Source', coverage: 60, maxSPL: 128, power: 800 },
    wedge: { label: 'Monitor Wedge', coverage: 80, maxSPL: 125, power: 500 },
    column: { label: 'Column Speaker', coverage: 140, maxSPL: 120, power: 600 }
};

// Estado global para sistemas de som
let speakerSystems = [];
let speakerSystemIdCounter = 0;
let splMappingEnabled = false;
let selectedSpeakerSystem = null;

// Adiciona caixa de som personalizada ao canvas a partir do painel
function addSpeakerFromPanel() {
    const center = screenToWorld(mainCanvas.width / 2, mainCanvas.height / 2);
    addSpeakerSystem(center.x - 70, center.y - 50);
}

// Adiciona caixa de som personalizada ao canvas
function addSpeakerSystem(wx, wy) {
    const system = {
        id: ++speakerSystemIdCounter,
        x: wx,
        y: wy,
        width: 140,
        height: 100,
        rotation: 0,
        // Configurações do sistema
        speakerType: 'fullrange',
        quantity: 2,
        powerWatts: 1000,
        enabled: true,
        // Cálculos de SPL
        calculatedSPL: 0,
        coverageAngle: 90,
        // Visualização
        color: '#ff7755',
        label: 'PA SYSTEM'
    };
    
    calculateSPL(system);
    speakerSystems.push(system);
    selectedSpeakerSystem = system;
    showSpeakerProps(system);
    render();
    save();
    return system;
}

// Calcula SPL baseado nas configurações
function calculateSPL(system) {
    const type = SPEAKER_TYPES[system.speakerType];
    if (!type) return;
    
    // Fórmula simplificada de SPL:
    // SPL base + 10*log10(quantidade) + ajuste de potência
    const baseSPL = type.maxSPL;
    const quantityBonus = system.quantity > 1 ? 10 * Math.log10(system.quantity) : 0;
    const powerRatio = system.powerWatts / type.power;
    const powerBonus = powerRatio > 1 ? 10 * Math.log10(powerRatio) : 0;
    
    system.calculatedSPL = Math.round(baseSPL + quantityBonus + powerBonus);
    system.coverageAngle = type.coverage;
}

// Desenha todos os sistemas de som
function drawSpeakerSystems() {
    for (const system of speakerSystems) {
        drawSpeakerSystem(system, system === selectedSpeakerSystem);
        
        // Desenha SPL Mapping se ativado
        if (splMappingEnabled && system.enabled) {
            drawSPLCoverage(system);
        }
    }
}

// Desenha um sistema de som individual
function drawSpeakerSystem(system, selected) {
    const sp = worldToScreen(system.x, system.y);
    const bw = system.width * viewScale;
    const bh = system.height * viewScale;
    
    ctx.save();
    
    // Aplica rotação
    const cx = sp.x + bw / 2;
    const cy = sp.y + bh / 2;
    ctx.translate(cx, cy);
    ctx.rotate((system.rotation || 0) * Math.PI / 180);
    ctx.translate(-bw / 2, -bh / 2);
    
    // Opacidade baseada no estado lig/desl
    const alpha = system.enabled ? 1 : 0.5;
    ctx.globalAlpha = alpha;
    
    // Sombra
    ctx.shadowColor = system.color;
    ctx.shadowBlur = selected ? 20 : 8;
    
    // Corpo da caixa
    ctx.fillStyle = selected ? getCSSVar('--eq-body-sel') : getCSSVar('--eq-body');
    ctx.strokeStyle = selected ? system.color : getCSSVar('--border');
    ctx.lineWidth = selected ? 2 : 1;
    
    ctx.beginPath();
    ctx.roundRect(sp.x, sp.y, bw, bh, 6);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Topo colorido
    ctx.fillStyle = system.color;
    ctx.beginPath();
    ctx.roundRect(sp.x, sp.y, bw, 6, [6, 6, 0, 0]);
    ctx.fill();
    
    // Ícone e label
    const iconSize = Math.min(20, bh * 0.3);
    ctx.font = `${iconSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('🔊', sp.x + bw / 2, sp.y + bh * 0.35);
    
    ctx.fillStyle = system.color;
    ctx.font = `bold ${Math.max(10, 12 * viewScale)}px "Rajdhani", sans-serif`;
    ctx.fillText(system.label, sp.x + bw / 2, sp.y + bh * 0.55);
    
    // Informações técnicas
    ctx.fillStyle = getCSSVar('--text-dim');
    ctx.font = `${Math.max(8, 10 * viewScale)}px "Share Tech Mono", monospace`;
    ctx.fillText(`${system.quantity}x ${SPEAKER_TYPES[system.speakerType].label}`, sp.x + bw / 2, sp.y + bh * 0.7);
    ctx.fillText(`SPL: ${system.calculatedSPL}dB`, sp.x + bw / 2, sp.y + bh * 0.85);
    
    // Indicador de estado
    if (system.enabled) {
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.arc(sp.x + bw - 8, sp.y + 8, 4, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(sp.x + bw - 8, sp.y + 8, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sp.x + bw - 12, sp.y + 4);
        ctx.lineTo(sp.x + bw - 4, sp.y + 12);
        ctx.stroke();
    }
    
    // Seleção
    if (selected) {
        ctx.strokeStyle = system.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.globalAlpha = 0.5;
        ctx.strokeRect(sp.x - 4, sp.y - 4, bw + 8, bh + 8);
    }
    
    ctx.restore();
}

// Desenha cobertura de SPL (heatmap simplificado)
function drawSPLCoverage(system) {
    const sp = worldToScreen(system.x, system.y);
    const bw = system.width * viewScale;
    const bh = system.height * viewScale;
    const cx = sp.x + bw / 2;
    const cy = sp.y + bh / 2;
    
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((system.rotation || 0) * Math.PI / 180);
    
    // Cone de cobertura
    const range = Math.min(mainCanvas.width, mainCanvas.height) * 0.4;
    const angleRad = (system.coverageAngle * Math.PI) / 180;
    
    // Gradiente de SPL
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, range);
    gradient.addColorStop(0, `rgba(255, 0, 0, 0.4)`);      // Vermelho (alto SPL)
    gradient.addColorStop(0.4, `rgba(255, 165, 0, 0.3)`);  // Laranja
    gradient.addColorStop(0.7, `rgba(255, 255, 0, 0.2)`);  // Amarelo
    gradient.addColorStop(1, `rgba(0, 255, 0, 0.1)`);      // Verde (baixo SPL)
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, range, -angleRad / 2, angleRad / 2);
    ctx.closePath();
    ctx.fill();
    
    // Linhas de contorno
    ctx.strokeStyle = `rgba(255, 255, 255, 0.3)`;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    
    // Arcos concêntricos para referência de distância
    for (let i = 1; i <= 4; i++) {
        const r = (range / 4) * i;
        ctx.beginPath();
        ctx.arc(0, 0, r, -angleRad / 2, angleRad / 2);
        ctx.stroke();
        
        // Label de distância estimada
        ctx.fillStyle = `rgba(255, 255, 255, 0.5)`;
        ctx.font = '10px "Share Tech Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${i * 5}m`, Math.sin(angleRad / 2) * r * 0.3, -r * 0.8);
    }
    
    // Linhas de ângulo
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(-angleRad / 2) * range, Math.sin(-angleRad / 2) * range);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angleRad / 2) * range, Math.sin(angleRad / 2) * range);
    ctx.stroke();
    
    ctx.restore();
    
    // Label de SPL máximo
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText(`MAX: ${system.calculatedSPL}dB @ 1m`, cx, cy - bh);
    ctx.restore();
}

// Hit test para sistemas de som
function hitTestSpeaker(sx, sy) {
    for (const system of speakerSystems) {
        const sp = worldToScreen(system.x, system.y);
        const bw = system.width * viewScale;
        const bh = system.height * viewScale;
        const cx = sp.x + bw / 2;
        const cy = sp.y + bh / 2;
        
        const dx = sx - cx;
        const dy = sy - cy;
        const angle = -(system.rotation || 0) * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;
        
        if (localX >= -bw / 2 && localX <= bw / 2 && localY >= -bh / 2 && localY <= bh / 2) {
            return system;
        }
    }
    return null;
}

// Mostra propriedades do sistema de som no painel
function showSpeakerProps(system) {
    const typeOptions = Object.entries(SPEAKER_TYPES).map(([key, val]) => 
        `<option value="${key}" ${key === system.speakerType ? 'selected' : ''}>${val.label}</option>`
    ).join('');
    
    document.getElementById('props-content').innerHTML = `
        <div class="prop-title">🔊 SISTEMA DE SOM</div>
        
        <div class="prop-row">
            <div class="prop-label">NOME</div>
            <input class="prop-input" value="${system.label}" onchange="setSpeakerLabel(${system.id}, this.value)">
        </div>
        
        <div class="prop-row">
            <div class="prop-label">TIPO DE FALANTE</div>
            <select class="prop-input" onchange="setSpeakerType(${system.id}, this.value)" style="width:100%;padding:6px;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:4px;">
                ${typeOptions}
            </select>
        </div>
        
        <div class="prop-row">
            <div class="prop-label">QUANTIDADE: ${system.quantity}</div>
            <input type="range" min="1" max="16" value="${system.quantity}" 
                   oninput="setSpeakerQuantity(${system.id}, this.value)" 
                   style="width:100%">
        </div>
        
        <div class="prop-row">
            <div class="prop-label">POTÊNCIA (W): ${system.powerWatts}</div>
            <input type="range" min="100" max="5000" step="100" value="${system.powerWatts}" 
                   oninput="setSpeakerPower(${system.id}, this.value)" 
                   style="width:100%">
        </div>
        
        <div class="prop-row">
            <div class="prop-label">STATUS</div>
            <button class="toolbar-btn ${system.enabled ? 'active' : ''}" 
                    onclick="toggleSpeakerEnabled(${system.id})" 
                    style="width:100%">
                    ${system.enabled ? '✓ LIGADO' : '✕ DESLIGADO'}
            </button>
        </div>
        
        <div class="prop-row">
            <div class="prop-label">ROTAÇÃO: ${system.rotation || 0}°</div>
            <div style="display:flex; gap:4px;">
                <button class="toolbar-btn" style="flex:1;padding:4px" onclick="rotateSpeaker(${system.id}, -45)">↺ -45°</button>
                <button class="toolbar-btn" style="flex:1;padding:4px" onclick="rotateSpeaker(${system.id}, 45)">↻ +45°</button>
                <button class="toolbar-btn" style="flex:1;padding:4px" onclick="rotateSpeaker(${system.id}, 0)">0°</button>
            </div>
        </div>
        
        <div class="prop-row" style="background:rgba(255,255,255,0.05);padding:10px;border-radius:4px;margin-top:8px;">
            <div class="prop-label" style="margin-bottom:8px;">📊 RESULTADOS SPL</div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; font-size:12px;">
                <div style="color:var(--text-dim)">SPL Máximo:</div>
                <div style="color:#ff7755;font-weight:bold">${system.calculatedSPL} dB @ 1m</div>
                <div style="color:var(--text-dim)">Cobertura:</div>
                <div style="color:#44aaff;font-weight:bold">${system.coverageAngle}°</div>
                <div style="color:var(--text-dim)">Potência Total:</div>
                <div style="color:#ffcc00;font-weight:bold">${system.quantity * system.powerWatts} W</div>
            </div>
        </div>
        
        <div class="prop-row">
            <div class="prop-label">COR</div>
            <input class="prop-input" type="color" value="${system.color}" 
                   onchange="setSpeakerColor(${system.id}, this.value)" 
                   style="height:34px; padding:2px; cursor:pointer;">
        </div>
        
        <button class="prop-btn danger" onclick="deleteSpeakerSystem(${system.id})">🗑 REMOVER SISTEMA</button>
    `;
}

// Funções de manipulação
function setSpeakerLabel(id, val) {
    const sys = speakerSystems.find(s => s.id === id);
    if (sys) { sys.label = val; render(); save(); }
}

function setSpeakerType(id, val) {
    const sys = speakerSystems.find(s => s.id === id);
    if (sys) { 
        sys.speakerType = val; 
        calculateSPL(sys);
        render(); 
        save();
        showSpeakerProps(sys);
    }
}

function setSpeakerQuantity(id, val) {
    const sys = speakerSystems.find(s => s.id === id);
    if (sys) { 
        sys.quantity = parseInt(val);
        calculateSPL(sys);
        render(); 
        save();
        showSpeakerProps(sys);
    }
}

function setSpeakerPower(id, val) {
    const sys = speakerSystems.find(s => s.id === id);
    if (sys) { 
        sys.powerWatts = parseInt(val);
        calculateSPL(sys);
        render(); 
        save();
        showSpeakerProps(sys);
    }
}

function toggleSpeakerEnabled(id) {
    const sys = speakerSystems.find(s => s.id === id);
    if (sys) { 
        sys.enabled = !sys.enabled;
        render(); 
        save();
        showSpeakerProps(sys);
    }
}

function rotateSpeaker(id, angle) {
    const sys = speakerSystems.find(s => s.id === id);
    if (sys) {
        sys.rotation = (sys.rotation || 0) + angle;
        render();
        save();
        showSpeakerProps(sys);
    }
}

function setSpeakerColor(id, val) {
    const sys = speakerSystems.find(s => s.id === id);
    if (sys) { 
        sys.color = val; 
        render(); 
        save(); 
    }
}

function deleteSpeakerSystem(id) {
    speakerSystems = speakerSystems.filter(s => s.id !== id);
    if (selectedSpeakerSystem && selectedSpeakerSystem.id === id) {
        selectedSpeakerSystem = null;
        showNoSel();
    }
    render();
    save();
}

// Toggle SPL Mapping
function toggleSPLMapping() {
    splMappingEnabled = !splMappingEnabled;
    const btn = document.getElementById('btn-spl');
    if (btn) {
        btn.classList.toggle('active', splMappingEnabled);
        btn.textContent = splMappingEnabled ? '🔥 SPL: ON' : '🔥 SPL: OFF';
    }
    render();
    save();
}

// Integração com eventos do canvas
const originalCanvasMouseDown = window.canvasMouseDown;
window.canvasMouseDown = function(event) {
    if (event.button === 2) {
        showContextMenu(event);
        return;
    }
    
    const pos = getCanvasPos(event);
    hideContextMenu();
    
    // Verifica clique em sistema de som
    const speaker = hitTestSpeaker(pos.x, pos.y);
    if (speaker) {
        selectedSpeakerSystem = speaker;
        selectedEq = null;
        selectedCable = null;
        selectedEnv = null;
        showSpeakerProps(speaker);
        isDragging = true;
        dragEq = null; // Não é equipamento normal
        const wp = screenToWorld(pos.x, pos.y);
        dragOffX = wp.x - speaker.x;
        dragOffY = wp.y - speaker.y;
        render();
        return;
    }
    
    // Chama função original se existir
    if (originalCanvasMouseDown) {
        originalCanvasMouseDown(event);
    }
};

const originalCanvasMouseMove = window.canvasMouseMove;
window.canvasMouseMove = function(event) {
    const pos = getCanvasPos(event);
    
    // Arrastar sistema de som
    if (isDragging && selectedSpeakerSystem && !dragEq) {
        const wp = screenToWorld(pos.x, pos.y);
        selectedSpeakerSystem.x = wp.x - dragOffX;
        selectedSpeakerSystem.y = wp.y - dragOffY;
        render();
        return;
    }
    
    // Chama função original se existir
    if (originalCanvasMouseMove) {
        originalCanvasMouseMove(event);
    }
};

const originalCanvasMouseUp = window.canvasMouseUp;
window.canvasMouseUp = function(event) {
    if (isDragging && selectedSpeakerSystem && !dragEq) {
        save();
    }
    isDragging = false;
    
    // Chama função original se existir
    if (originalCanvasMouseUp) {
        originalCanvasMouseUp(event);
    }
};

// Integração com renderização
const originalRender = window.render;
window.render = function() {
    if (originalRender) {
        originalRender();
    } else {
        // Fallback se render original não existir
        const w = mainCanvas.width, h = mainCanvas.height;
        ctx.clearRect(0, 0, w, h);
        
        // Draw Environments
        for (const env of environments) {
            drawEnvironment(env, env === selectedEnv);
        }
        
        // Draw Cables
        for (const cable of cables) {
            drawCable(cable, cable === selectedCable);
        }
        
        // Draw Equipment
        for (const eq of sortedEquipments) {
            drawEquipment(eq, eq === selectedEq);
        }
    }
    
    // Desenha sistemas de som após equipamentos
    drawSpeakerSystems();
    
    updateStatus();
};

// Salvar/Carregar estado
const originalSave = window.save;
window.save = function() {
    if (originalSave) {
        originalSave();
    }
};

const originalLoadSaved = window.loadSaved;
window.loadSaved = function() {
    let loaded = false;
    if (originalLoadSaved) {
        loaded = originalLoadSaved();
    }
    
    try {
        const raw = localStorage.getItem('signal-flow-state');
        if (raw) {
            const data = JSON.parse(raw);
            if (data.speakerSystems) {
                speakerSystems = data.speakerSystems;
                speakerSystemIdCounter = Math.max(0, ...speakerSystems.map(s => s.id || 0));
                splMappingEnabled = data.splMappingEnabled || false;
                loaded = true;
            }
        }
    } catch(e) {
        console.warn('[load speaker] falhou:', e);
    }
    
    return loaded;
};

// Sobrescreve função save para incluir speaker systems
(function overrideSave() {
    const SAVE_KEY = 'signal-flow-state';
    let saveTimer = null;
    
    window.save = function() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            try {
                const state = JSON.stringify({ 
                    equipments, 
                    cables, 
                    environments, 
                    eqIdCounter, 
                    cableIdCounter, 
                    envIdCounter, 
                    viewX, 
                    viewY, 
                    viewScale, 
                    showGrid, 
                    gridScale,
                    speakerSystems,
                    speakerSystemIdCounter,
                    splMappingEnabled
                });
                localStorage.setItem(SAVE_KEY, state);
                console.log('[save] ok —', equipments.length, 'eq,', environments.length, 'env,', cables.length, 'cabos,', speakerSystems.length, 'speakers');
            } catch(e) { console.warn('[save] falhou:', e); }
        }, 500);
    };
})();

// Inicializa botão SPL na toolbar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    const topbar = document.getElementById('topbar');
    if (topbar) {
        const btn = document.createElement('button');
        btn.className = 'toolbar-btn';
        btn.id = 'btn-spl';
        btn.textContent = '🔥 SPL: OFF';
        btn.onclick = toggleSPLMapping;
        btn.title = 'Ativar/Desativar visualização de cobertura SPL';
        
        const gridSlider = document.getElementById('grid-scale-slider');
        if (gridSlider) {
            topbar.insertBefore(btn, gridSlider.nextSibling);
        }
        
        // Restaura estado do botão
        if (splMappingEnabled) {
            btn.classList.add('active');
            btn.textContent = '🔥 SPL: ON';
        }
    }
});

console.log('[Speaker System Module] Loaded');
