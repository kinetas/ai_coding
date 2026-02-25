/**
 * 포트폴리오 소개 페이지 - 우클릭 위치 생성, 드래그 이동
 */

let editMode = false;
let lastRightClick = { x: 0, y: 0, pageId: null, canvas: null };

const STORAGE_KEY = 'portfolio_canvas_data';
const GRID_SNAP = 8; // 배치 보정용 그리드 간격 (px)

const dynamicItemConfig = {
    paper: { title: '논문 추가', fields: [
        { name: 'title', label: '논문명', type: 'text' },
        { name: 'journal', label: '학술지/학회', type: 'text' },
        { name: 'date', label: '발표일', type: 'text' }
    ]},
    certification: { title: '자격증 추가', fields: [
        { name: 'name', label: '자격증명', type: 'text' },
        { name: 'org', label: '발급기관', type: 'text' },
        { name: 'date', label: '취득일', type: 'text' }
    ]},
    program: { title: '프로그램 추가', fields: [
        { name: 'name', label: '프로그램명', type: 'text' },
        { name: 'level', label: '숙련도 (선택)', type: 'text' }
    ]},
    project: { title: '프로젝트 추가', fields: [
        { name: 'name', label: '프로젝트명', type: 'text' },
        { name: 'role', label: '역할', type: 'text' },
        { name: 'desc', label: '설명 (선택)', type: 'text' }
    ]}
};

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initEditMode();
    initToolbox();
    initModals();
    initDrag();
    loadSavedData();
    updateDeleteButtonsVisibility();
});

// ===== 네비게이션 =====
function initNavigation() {
    const links = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = link.dataset.page;
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            pages.forEach(p => {
                p.classList.toggle('active', p.dataset.page === pageId);
            });
        });
    });
}

// ===== 편집모드 =====
function initEditMode() {
    const toggle = document.getElementById('editModeToggle');
    const status = document.querySelector('.edit-status');

    toggle?.addEventListener('click', () => {
        editMode = !editMode;
        toggle.textContent = editMode ? '편집모드 종료' : '편집모드';
        toggle.classList.toggle('active', editMode);
        status.textContent = editMode ? '편집 가능 (우클릭)' : '편집 불가';

        document.querySelectorAll('.dynamic-area').forEach(area => {
            area.classList.toggle('edit-zone', editMode);
        });

        updateDeleteButtonsVisibility();
        if (!editMode) {
            hideToolbox();
            saveAllData();
        }
    });
}

// 편집모드에서만 삭제 버튼 표시
function updateDeleteButtonsVisibility() {
    document.body.classList.toggle('edit-mode', editMode);
    document.querySelectorAll('.box-delete, .item-delete, .table-delete, .label-delete, .image-delete').forEach(btn => {
        btn.style.pointerEvents = editMode ? '' : 'none';
        btn.style.visibility = editMode ? '' : 'hidden';
    });
}

// ===== 툴박스 - 편집모드에서 캔버스 영역 우클릭 시 =====
function initToolbox() {
    document.addEventListener('contextmenu', (e) => {
        if (!editMode) return;

        const canvas = e.target.closest('.canvas-area');
        if (!canvas) return;

        e.preventDefault();
        lastRightClick = {
            x: e.clientX,
            y: e.clientY,
            pageId: canvas.dataset.pageId,
            canvas
        };

        const toolbox = document.getElementById('contextToolbox');
        toolbox.innerHTML = '';

        const addBtn = (text, action) => {
            const btn = document.createElement('button');
            btn.className = 'tool-btn';
            btn.textContent = text;
            btn.onclick = () => { hideToolbox(); handleToolAction(action); };
            toolbox.appendChild(btn);
        };

        addBtn('컨텐츠 박스 추가', 'addContentBox');
        addBtn('이미지 추가', 'addImage');
        addBtn('표 추가', 'addTable');
        addBtn('검색', 'search');

        if (lastRightClick.pageId === 'career') addBtn('논문 추가', 'addPaper');
        if (lastRightClick.pageId === 'skills') {
            addBtn('구역 제목 추가', 'addSectionLabel');
            addBtn('자격증 추가', 'addCertification');
            addBtn('프로그램 추가', 'addProgram');
        }
        if (lastRightClick.pageId === 'portfolio') addBtn('프로젝트 추가', 'addProject');

        showToolbox(e.clientX, e.clientY);
    });

    document.addEventListener('click', () => hideToolbox());
}

function showToolbox(x, y) {
    const toolbox = document.getElementById('contextToolbox');
    toolbox.classList.remove('hidden');
    toolbox.style.left = `${x}px`;
    toolbox.style.top = `${y}px`;
    const rect = toolbox.getBoundingClientRect();
    if (rect.right > window.innerWidth) toolbox.style.left = `${x - rect.width}px`;
    if (rect.bottom > window.innerHeight) toolbox.style.top = `${y - rect.height}px`;
}

function hideToolbox() {
    document.getElementById('contextToolbox').classList.add('hidden');
}

function handleToolAction(action) {
    switch (action) {
        case 'addContentBox': openContentBoxModal(); break;
        case 'addImage': openImageModal(); break;
        case 'addTable': openTableModal(); break;
        case 'search': openSearchModal(); break;
        case 'addSectionLabel': addSectionLabel(); break;
        case 'addPaper': openDynamicItemModal('paper'); break;
        case 'addCertification': openDynamicItemModal('certification'); break;
        case 'addProgram': openDynamicItemModal('program'); break;
        case 'addProject': openDynamicItemModal('project'); break;
    }
}

// ===== 캔버스 기준 좌표 계산 (그리드 스냅 적용) =====
function snapToGrid(val) {
    return Math.round(val / GRID_SNAP) * GRID_SNAP;
}

function getCanvasPosition(canvas, clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const left = clientX - rect.left + (canvas.scrollLeft || 0);
    const top = clientY - rect.top + (canvas.scrollTop || 0);
    return {
        left: Math.max(0, snapToGrid(left)),
        top: Math.max(0, snapToGrid(top))
    };
}

// ===== 드래그 =====
function initDrag() {
    document.addEventListener('mousedown', (e) => {
        if (!editMode) return;
        const item = e.target.closest('.draggable-item');
        if (!item) return;

        if (e.target.closest('.box-delete, .item-delete, .table-delete, .label-delete, .image-delete')) return;
        if (e.target.closest('[contenteditable="true"]')) return;
        if (item.classList.contains('table-wrapper') && !e.target.closest('.table-drag-handle')) return;

        e.preventDefault();
        const canvas = item.closest('.canvas-area');
        if (!canvas) return;

        const itemRect = item.getBoundingClientRect();
        const offsetX = e.clientX - itemRect.left;
        const offsetY = e.clientY - itemRect.top;

        item.classList.add('dragging');

        const onMove = (ev) => {
            const cr = canvas.getBoundingClientRect();
            const left = snapToGrid(ev.clientX - cr.left - offsetX);
            const top = snapToGrid(ev.clientY - cr.top - offsetY);
            item.style.left = `${Math.max(0, left)}px`;
            item.style.top = `${Math.max(0, top)}px`;
        };

        const onUp = () => {
            item.classList.remove('dragging');
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            ensureCanvasHeight(canvas);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });
}

// ===== 컨텐츠 박스 =====
function openContentBoxModal() {
    document.getElementById('contentBoxModal').classList.remove('hidden');
    document.getElementById('contentBoxText').value = '';
    document.getElementById('contentBoxTags').value = '';
    document.getElementById('contentBoxImage').value = '';
}

function addContentBox() {
    const text = document.getElementById('contentBoxText').value.trim();
    const tags = document.getElementById('contentBoxTags').value.trim();
    const imageUrl = document.getElementById('contentBoxImage').value.trim();

    if (!lastRightClick.canvas) return;

    const pos = getCanvasPosition(lastRightClick.canvas, lastRightClick.x, lastRightClick.y);
    const colors = ['yellow', 'blue', 'green'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const box = document.createElement('div');
    box.className = `content-box draggable-item ${color}`;
    box.dataset.id = 'box_' + Date.now();
    box.dataset.type = 'contentBox';
    box.dataset.pageId = lastRightClick.pageId;
    box.style.left = pos.left + 'px';
    box.style.top = pos.top + 'px';

    let html = '';
    if (text) html += `<div class="box-text">${escapeHtml(text)}</div>`;
    if (imageUrl) html += `<img src="${escapeHtml(imageUrl)}" alt="이미지" onerror="this.style.display='none'">`;
    if (tags) html += `<div class="box-tags">#${tags.split(',').map(t => t.trim()).join(' #')}</div>`;
    box.innerHTML = html + `<button class="box-delete" aria-label="삭제">×</button>`;

    box.querySelector('.box-delete')?.addEventListener('click', (e) => { e.stopPropagation(); box.remove(); });

    lastRightClick.canvas.appendChild(box);
    ensureCanvasHeight(lastRightClick.canvas);
    updateDeleteButtonsVisibility();
    document.getElementById('contentBoxModal').classList.add('hidden');
}

// ===== 표 =====
function openTableModal() {
    document.getElementById('tableModal').classList.remove('hidden');
    document.getElementById('tableRows').value = 3;
    document.getElementById('tableCols').value = 3;
}

function addTable() {
    const rows = parseInt(document.getElementById('tableRows').value) || 3;
    const cols = parseInt(document.getElementById('tableCols').value) || 3;
    if (!lastRightClick.canvas) return;

    const pos = getCanvasPosition(lastRightClick.canvas, lastRightClick.x, lastRightClick.y);

    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper draggable-item';
    wrapper.dataset.id = 'table_' + Date.now();
    wrapper.dataset.type = 'table';
    wrapper.dataset.pageId = lastRightClick.pageId;
    wrapper.style.left = pos.left + 'px';
    wrapper.style.top = pos.top + 'px';

    let tableHtml = '<table class="data-table"><thead><tr>';
    for (let c = 0; c < cols; c++) tableHtml += `<th contenteditable="true">제목${c + 1}</th>`;
    tableHtml += '</tr></thead><tbody>';
    for (let r = 0; r < rows - 1; r++) {
        tableHtml += '<tr>';
        for (let c = 0; c < cols; c++) tableHtml += `<td contenteditable="true"></td>`;
        tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table><div class="table-drag-handle" title="드래그하여 이동">⋮⋮</div><button class="table-delete">표 삭제</button>';

    wrapper.innerHTML = tableHtml;
    wrapper.querySelector('.table-delete')?.addEventListener('click', () => wrapper.remove());

    lastRightClick.canvas.appendChild(wrapper);
    ensureCanvasHeight(lastRightClick.canvas);
    updateDeleteButtonsVisibility();
    document.getElementById('tableModal').classList.add('hidden');
}

// ===== 이미지 추가 =====
function openImageModal() {
    document.getElementById('imageModal').classList.remove('hidden');
    document.getElementById('imageUrl').value = '';
    document.getElementById('imageFile').value = '';
    document.getElementById('imageFileName').textContent = '';
}

function addImage() {
    const urlInput = document.getElementById('imageUrl').value.trim();
    const fileInput = document.getElementById('imageFile');

    if (urlInput) {
        addImageToCanvas(urlInput);
        document.getElementById('imageModal').classList.add('hidden');
    } else if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            addImageToCanvas(e.target.result);
            document.getElementById('imageModal').classList.add('hidden');
        };
        reader.readAsDataURL(file);
    }
}

function addImageToCanvas(src) {
    if (!lastRightClick.canvas) return;

    const pos = getCanvasPosition(lastRightClick.canvas, lastRightClick.x, lastRightClick.y);

    const wrapper = document.createElement('div');
    wrapper.className = 'image-item draggable-item';
    wrapper.dataset.id = 'image_' + Date.now();
    wrapper.dataset.type = 'image';
    wrapper.dataset.pageId = lastRightClick.pageId;
    wrapper.style.left = pos.left + 'px';
    wrapper.style.top = pos.top + 'px';

    const img = document.createElement('img');
    img.src = src;
    img.alt = '이미지';
    img.draggable = false;
    wrapper.appendChild(img);
    const delBtn = document.createElement('button');
    delBtn.className = 'image-delete';
    delBtn.setAttribute('aria-label', '삭제');
    delBtn.textContent = '×';
    wrapper.appendChild(delBtn);

    wrapper.querySelector('.image-delete')?.addEventListener('click', (e) => {
        e.stopPropagation();
        wrapper.remove();
    });

    lastRightClick.canvas.appendChild(wrapper);
    ensureCanvasHeight(lastRightClick.canvas);
    updateDeleteButtonsVisibility();
}

// ===== 구역 제목 (자격증/프로그램 등 구역 나누기용) =====
function addSectionLabel() {
    if (!lastRightClick.canvas) return;

    const label = prompt('구역 제목 (예: 자격증, 다룰 수 있는 프로그램)', '자격증');
    if (!label || !label.trim()) return;

    const pos = getCanvasPosition(lastRightClick.canvas, lastRightClick.x, lastRightClick.y);

    const el = document.createElement('div');
    el.className = 'section-label draggable-item';
    el.dataset.id = 'section_' + Date.now();
    el.dataset.type = 'sectionLabel';
    el.dataset.pageId = lastRightClick.pageId;
    el.style.left = pos.left + 'px';
    el.style.top = pos.top + 'px';
    el.innerHTML = `<span class="label-text">${escapeHtml(label.trim())}</span><button class="label-delete" aria-label="삭제">×</button>`;

    el.querySelector('.label-delete')?.addEventListener('click', (e) => { e.stopPropagation(); el.remove(); });
    el.addEventListener('dblclick', (e) => {
        if (e.target.closest('.label-delete')) return;
        const newLabel = prompt('구역 제목 수정', el.textContent);
        if (newLabel && newLabel.trim()) el.textContent = newLabel.trim();
    });

    lastRightClick.canvas.appendChild(el);
    ensureCanvasHeight(lastRightClick.canvas);
    updateDeleteButtonsVisibility();
}

// ===== 동적 항목 (논문/자격증/프로그램/프로젝트) =====
function openDynamicItemModal(type) {
    const config = dynamicItemConfig[type];
    if (!config) return;

    document.getElementById('dynamicItemTitle').textContent = config.title;
    const fieldsDiv = document.getElementById('dynamicItemFields');
    fieldsDiv.innerHTML = '';

    config.fields.forEach(f => {
        const label = document.createElement('label');
        label.innerHTML = `${f.label}: <input type="${f.type}" data-field="${f.name}" placeholder="${f.label} 입력">`;
        fieldsDiv.appendChild(label);
    });

    document.getElementById('dynamicItemModal').classList.remove('hidden');

    document.getElementById('dynamicItemAdd').onclick = () => {
        const values = {};
        config.fields.forEach(f => {
            const input = fieldsDiv.querySelector(`[data-field="${f.name}"]`);
            values[f.name] = input?.value?.trim() || '';
        });
        addDynamicItem(type, values);
        document.getElementById('dynamicItemModal').classList.add('hidden');
    };
}

function addDynamicItem(type, values) {
    if (!lastRightClick.canvas) return;

    const config = dynamicItemConfig[type];
    const pos = getCanvasPosition(lastRightClick.canvas, lastRightClick.x, lastRightClick.y);

    const item = document.createElement('div');
    item.className = `dynamic-item draggable-item`;
    item.dataset.id = type + '_' + Date.now();
    item.dataset.type = type;
    item.dataset.pageId = lastRightClick.pageId;
    item.style.left = pos.left + 'px';
    item.style.top = pos.top + 'px';

    let html = '<div class="item-content">';
    Object.entries(values).forEach(([key, val]) => {
        if (val) html += `<span><strong>${config.fields.find(f => f.name === key)?.label}:</strong> ${escapeHtml(val)}</span><br>`;
    });
    html += '</div><button class="item-delete" aria-label="삭제">×</button>';
    item.innerHTML = html;

    item.querySelector('.item-delete')?.addEventListener('click', () => item.remove());
    lastRightClick.canvas.appendChild(item);
    ensureCanvasHeight(lastRightClick.canvas);
    updateDeleteButtonsVisibility();
}

// ===== 검색 =====
function openSearchModal() {
    document.getElementById('searchModal').classList.remove('hidden');
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').innerHTML = '';
}

function executeSearch() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    const resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = '';

    if (!query) return;

    const items = [];
    document.querySelectorAll('.content-box, .dynamic-item, .table-wrapper, .section-label, .image-item').forEach(el => {
        const text = el.textContent || '';
        if (text.toLowerCase().includes(query)) items.push({ el, text });
    });

    if (items.length === 0) {
        resultsDiv.innerHTML = '<p>검색 결과가 없습니다.</p>';
        return;
    }

    items.forEach(({ el, text }) => {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        div.textContent = text.substring(0, 80) + (text.length > 80 ? '...' : '');
        div.onclick = () => {
            el.scrollIntoView({ behavior: 'smooth' });
            el.classList.add('highlight');
            setTimeout(() => el.classList.remove('highlight'), 2000);
        };
        resultsDiv.appendChild(div);
    });
}

// ===== 모달 =====
function initModals() {
    document.getElementById('contentBoxAdd')?.addEventListener('click', addContentBox);
    document.getElementById('contentBoxCancel')?.addEventListener('click', () => document.getElementById('contentBoxModal').classList.add('hidden'));

    document.getElementById('tableAdd')?.addEventListener('click', addTable);
    document.getElementById('tableCancel')?.addEventListener('click', () => document.getElementById('tableModal').classList.add('hidden'));

    document.getElementById('searchExecute')?.addEventListener('click', executeSearch);
    document.getElementById('searchInput')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') executeSearch(); });
    document.getElementById('searchClose')?.addEventListener('click', () => document.getElementById('searchModal').classList.add('hidden'));

    document.getElementById('dynamicItemCancel')?.addEventListener('click', () => document.getElementById('dynamicItemModal').classList.add('hidden'));

    document.getElementById('imageAdd')?.addEventListener('click', addImage);
    document.getElementById('imageCancel')?.addEventListener('click', () => document.getElementById('imageModal').classList.add('hidden'));
    document.getElementById('imageFile')?.addEventListener('change', (e) => {
        const name = e.target.files[0]?.name || '';
        document.getElementById('imageFileName').textContent = name ? `선택: ${name}` : '';
    });
}

// ===== 저장/로드 =====
function saveAllData() {
    const data = { items: [] };

    document.querySelectorAll('.draggable-item').forEach(el => {
        const item = {
            id: el.dataset.id,
            type: el.dataset.type,
            pageId: el.dataset.pageId,
            left: parseFloat(el.style.left) || 0,
            top: parseFloat(el.style.top) || 0
        };

        if (el.dataset.type === 'contentBox') {
            const text = el.querySelector('.box-text')?.innerHTML || '';
            const tags = el.querySelector('.box-tags')?.textContent || '';
            const img = el.querySelector('img');
            item.color = el.className.match(/yellow|blue|green/)?.[0] || 'yellow';
            item.text = text;
            item.tags = tags;
            item.imageUrl = img?.src || '';
        } else if (el.dataset.type === 'table') {
            const table = el.querySelector('table');
            if (table) {
                const rows = [];
                table.querySelectorAll('tr').forEach(tr => {
                    const cells = [];
                    tr.querySelectorAll('th, td').forEach(cell => cells.push(cell.textContent));
                    rows.push(cells);
                });
                item.rows = rows;
            }
        } else if (el.dataset.type === 'sectionLabel') {
            item.label = el.querySelector('.label-text')?.textContent || el.textContent || '';
        } else if (el.dataset.type === 'image') {
            const img = el.querySelector('img');
            item.src = img?.src || '';
        } else {
            const config = dynamicItemConfig[el.dataset.type];
            if (config) {
                const content = el.querySelector('.item-content');
                config.fields.forEach(f => {
                    const span = content?.querySelector(`span`);
                    const spans = content?.querySelectorAll('span') || [];
                    const s = Array.from(spans).find(x => x.textContent.includes(f.label));
                    if (s) item[f.name] = s.textContent.replace(s.querySelector('strong')?.textContent || '', '').trim();
                });
            }
        }
        data.items.push(item);
    });

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('저장 실패:', e);
    }
}

function loadSavedData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;

        const data = JSON.parse(raw);
        (data.items || []).forEach(item => restoreItem(item));

        document.querySelectorAll('.canvas-area').forEach(ensureCanvasHeight);
    } catch (e) {
        console.warn('로드 실패:', e);
    }
}

function restoreItem(item) {
    const canvas = document.getElementById('canvas-' + item.pageId);
    if (!canvas) return;

    if (item.type === 'contentBox') {
        const box = document.createElement('div');
        box.className = `content-box draggable-item ${item.color || 'yellow'}`;
        box.dataset.id = item.id;
        box.dataset.type = 'contentBox';
        box.dataset.pageId = item.pageId;
        box.style.left = (item.left || 0) + 'px';
        box.style.top = (item.top || 0) + 'px';

        let html = '';
        if (item.text) html += `<div class="box-text">${item.text}</div>`;
        if (item.imageUrl) html += `<img src="${item.imageUrl}" alt="이미지">`;
        if (item.tags) html += `<div class="box-tags">${item.tags}</div>`;
        box.innerHTML = html + '<button class="box-delete" aria-label="삭제">×</button>';
        box.querySelector('.box-delete')?.addEventListener('click', (e) => { e.stopPropagation(); box.remove(); });
        canvas.appendChild(box);
    } else if (item.type === 'table') {
        const wrapper = document.createElement('div');
        wrapper.className = 'table-wrapper draggable-item';
        wrapper.dataset.id = item.id;
        wrapper.dataset.type = 'table';
        wrapper.dataset.pageId = item.pageId;
        wrapper.style.left = (item.left || 0) + 'px';
        wrapper.style.top = (item.top || 0) + 'px';

        const rows = item.rows || [];
        let tableHtml = '<table class="data-table">';
        rows.forEach((row, ri) => {
            if (ri === 0) tableHtml += '<thead><tr>';
            else if (ri === 1) tableHtml += '</thead><tbody><tr>';
            else tableHtml += '<tr>';
            (row || []).forEach(cell => {
                const tag = ri === 0 ? 'th' : 'td';
                tableHtml += `<${tag} contenteditable="true">${escapeHtml(cell)}</${tag}>`;
            });
            tableHtml += '</tr>';
        });
        if (rows.length) tableHtml += '</tbody>';
        tableHtml += '</table><div class="table-drag-handle" title="드래그하여 이동">⋮⋮</div><button class="table-delete">표 삭제</button>';
        wrapper.innerHTML = tableHtml;
        wrapper.querySelector('.table-delete')?.addEventListener('click', () => wrapper.remove());
        canvas.appendChild(wrapper);
    } else if (item.type === 'sectionLabel') {
        const el = document.createElement('div');
        el.className = 'section-label draggable-item';
        el.dataset.id = item.id;
        el.dataset.type = 'sectionLabel';
        el.dataset.pageId = item.pageId;
        el.style.left = (item.left || 0) + 'px';
        el.style.top = (item.top || 0) + 'px';
        el.innerHTML = `<span class="label-text">${escapeHtml(item.label || '구역')}</span><button class="label-delete" aria-label="삭제">×</button>`;
        el.querySelector('.label-delete')?.addEventListener('click', (e) => { e.stopPropagation(); el.remove(); });
        el.addEventListener('dblclick', (e) => {
            if (e.target.closest('.label-delete')) return;
            const txt = el.querySelector('.label-text');
            const newLabel = prompt('구역 제목 수정', txt?.textContent || '');
            if (newLabel && newLabel.trim()) { if (txt) txt.textContent = newLabel.trim(); }
        });
        canvas.appendChild(el);
    } else if (item.type === 'image') {
        const wrapper = document.createElement('div');
        wrapper.className = 'image-item draggable-item';
        wrapper.dataset.id = item.id;
        wrapper.dataset.type = 'image';
        wrapper.dataset.pageId = item.pageId;
        wrapper.style.left = (item.left || 0) + 'px';
        wrapper.style.top = (item.top || 0) + 'px';

        const img = document.createElement('img');
        img.src = item.src || '';
        img.alt = '이미지';
        img.draggable = false;
        wrapper.appendChild(img);
        const delBtn = document.createElement('button');
        delBtn.className = 'image-delete';
        delBtn.setAttribute('aria-label', '삭제');
        delBtn.textContent = '×';
        wrapper.appendChild(delBtn);

        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            wrapper.remove();
        });
        canvas.appendChild(wrapper);
    } else {
        const config = dynamicItemConfig[item.type];
        if (!config) return;

        const values = {};
        config.fields.forEach(f => { values[f.name] = item[f.name] || ''; });

        const el = document.createElement('div');
        el.className = 'dynamic-item draggable-item';
        el.dataset.id = item.id;
        el.dataset.type = item.type;
        el.dataset.pageId = item.pageId;
        el.style.left = (item.left || 0) + 'px';
        el.style.top = (item.top || 0) + 'px';

        let html = '<div class="item-content">';
        config.fields.forEach(f => {
            const val = values[f.name];
            if (val) html += `<span><strong>${f.label}:</strong> ${escapeHtml(val)}</span><br>`;
        });
        html += '</div><button class="item-delete" aria-label="삭제">×</button>';
        el.innerHTML = html;
        el.querySelector('.item-delete')?.addEventListener('click', () => el.remove());
        canvas.appendChild(el);
    }
}

// 캔버스 높이 확보 (아이템이 공간을 차지하도록)
function ensureCanvasHeight(canvas) {
    let maxBottom = 0;
    canvas.querySelectorAll('.draggable-item').forEach(el => {
        const top = parseFloat(el.style.top) || 0;
        const h = el.offsetHeight;
        maxBottom = Math.max(maxBottom, top + h);
    });
    if (maxBottom > 0) {
        canvas.style.minHeight = Math.max(500, maxBottom + 40) + 'px';
    }
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
