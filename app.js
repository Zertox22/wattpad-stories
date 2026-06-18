// App State
let stories = [];

// Load stories from /data/stories.json or localStorage fallback
async function loadStoriesData() {
    // PRIORITY 1: Always use localStorage first — this preserves admin panel edits
    try {
        const localStories = localStorage.getItem('wattpad_stories');
        if (localStories) {
            const parsed = JSON.parse(localStories);
            if (Array.isArray(parsed) && parsed.length > 0) {
                stories = parsed;
                return;
            }
        }
    } catch (e) { /* ignore parse errors */ }

    // PRIORITY 2: No localStorage data — load from data/stories.json (first visit or cleared cache)
    try {
        const response = await fetch('data/stories.json');
        if (response.ok) {
            const rawData = await response.json();

            if (rawData && !Array.isArray(rawData) && rawData.stories) {
                stories = rawData.stories;
                localStorage.setItem('wattpad_stories', JSON.stringify(stories));
                if (rawData.notifications) {
                    localStorage.setItem('wattpad_stories_notifications', JSON.stringify(rawData.notifications));
                }
            } else if (Array.isArray(rawData)) {
                stories = rawData;
                localStorage.setItem('wattpad_stories', JSON.stringify(stories));
            }
            return;
        }
    } catch (e) { /* CORS or fetch error — expected on file:// */ }

}

// Global Init
document.addEventListener("DOMContentLoaded", async () => {
    await loadStoriesData();
    initIcons();
    routePage();
    setupPublicExport();
});

function setupPublicExport() {
    const btn = document.getElementById('downloadJsonBtnPublic');
    if (btn) {
        btn.addEventListener('click', () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(stories, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", "stories.json");
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        });
    }
}

function initIcons() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// Router/Page Selector based on DOM elements
function routePage() {
    if (document.getElementById('featuredStoriesGrid')) {
        initHomePage();
    }
    if (document.getElementById('storiesGrid')) {
        initStoriesPage();
    }
    if (document.getElementById('planningTimeline')) {
        initPlanningPage();
    }
    if (document.getElementById('statStoriesCount')) {
        initAboutPage();
    }
    if (document.getElementById('notificationsContainer')) {
        initNotificationsPage();
    }
}

/* ==========================================================
   PAGE: NOTIFICATIONS (notifications.html)
   ========================================================== */
function initNotificationsPage() {
    const container = document.getElementById('notificationsContainer');
    if (!container) return;

    container.innerHTML = '';

    // Retrieve notifications from stories.json or localStorage (stored as an array inside a global wrapper or extracted from updates)
    // We'll read from a "notifications" property if it exists, otherwise provide default notifications.
    const localStorageData = localStorage.getItem('wattpad_stories_notifications');
    let notifications = [];
    
    if (localStorageData) {
        notifications = JSON.parse(localStorageData);
    } else {
        notifications = [
            {
                "id": "notif-1",
                "title": "Bienvenue sur mon espace d'actualités !",
                "content": "C'est ici que je publierai toutes les informations relatives à mes futurs projets d'écriture, l'avancement des chapitres et les annonces importantes. Restez connectés !",
                "date": "2026-06-18",
                "time": "20:00"
            }
        ];
        localStorage.setItem('wattpad_stories_notifications', JSON.stringify(notifications));
    }

    if (notifications.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                <i data-lucide="bell-off" style="width: 48px; height: 48px; margin-bottom: 1rem; color: #ff4b2b;"></i>
                <p>Aucune notification publiée pour le moment.</p>
            </div>
        `;
        initIcons();
        return;
    }

    // Sort by date/time descending (newest first)
    const sorted = [...notifications].sort((a, b) => new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`));

    sorted.forEach(notif => {
        const dateObj = new Date(`${notif.date}T${notif.time}`);
        const formattedDate = dateObj.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        const card = document.createElement('div');
        card.className = 'admin-card';
        card.style.position = 'relative';
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--border-color); padding-bottom: 0.8rem; margin-bottom: 1rem;">
                <h3 style="border-bottom: none; padding-bottom: 0; margin-bottom: 0; font-size: 1.25rem;"><i data-lucide="info" style="color: #ff4b2b; vertical-align: middle; margin-right: 8px;"></i> ${notif.title}</h3>
                <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;"><i data-lucide="calendar" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle; margin-right: 4px;"></i> Le ${formattedDate} à ${notif.time}</span>
            </div>
            <p style="color: var(--text-secondary); line-height: 1.7; font-size: 0.95rem; white-space: pre-wrap;">${notif.content}</p>
        `;
        container.appendChild(card);
    });

    initIcons();
}

/* ==========================================================
   DYNAMIC PLANNING RESOLUTION
   ========================================================== */
function getSortedReleases() {
    const allReleases = [];
    stories.forEach(story => {
        // Launch release
        if (story.releaseDate && story.releaseTime) {
            allReleases.push({
                id: 'launch-' + story.id,
                storyId: story.id,
                title: "Lancement de l'histoire",
                date: story.releaseDate,
                time: story.releaseTime,
                releaseType: "Livre"
            });
        }
        // Chapter releases
        if (story.chapters) {
            story.chapters.forEach(ch => {
                if (ch.date && ch.time) {
                    allReleases.push({
                        id: 'chapter-' + story.id + '-' + ch.id,
                        storyId: story.id,
                        title: ch.title,
                        date: ch.date,
                        time: ch.time,
                        releaseType: "Chapitre"
                    });
                }
            });
        }
    });
    return allReleases.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
}

/* ==========================================================
   PAGE: ABOUT (about.html)
   ========================================================== */
function initAboutPage() {
    const storiesCountEl = document.getElementById('statStoriesCount');
    const releasesCountEl = document.getElementById('statReleasesCount');

    if (storiesCountEl) storiesCountEl.textContent = stories.length;
    
    // Sum total chapters
    let chCount = 0;
    stories.forEach(s => { if (s.chapters) chCount += s.chapters.length; });
    if (releasesCountEl) releasesCountEl.textContent = chCount;
}

/* ==========================================================
   PAGE: ACCUEIL (index.html)
   ========================================================== */
function initHomePage() {
    const featuredGrid = document.getElementById('featuredStoriesGrid');
    const nextReleaseBox = document.getElementById('nextReleaseContent');
    const featuredBookBox = document.getElementById('featuredBookContent');

    // 1. Render Last 3 Stories
    featuredGrid.innerHTML = '';
    const lastThree = stories.slice(-3).reverse();
    lastThree.forEach(story => {
        featuredGrid.appendChild(createStoryCard(story));
    });

    // 2. Render Upcoming Publication
    const sortedReleases = getSortedReleases();
    const upcoming = sortedReleases.find(r => new Date(`${r.date}T${r.time}`) >= new Date());
    
    if (upcoming) {
        const storyTitle = stories.find(s => s.id === upcoming.storyId)?.title || 'Récit';
        const dateObj = new Date(`${upcoming.date}T${upcoming.time}`);
        const formattedDate = dateObj.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });

        const isLaunch = upcoming.releaseType === 'Livre';
        const releaseTag = isLaunch ? 'LANCEMENT LIVRE' : 'CHAPITRE';

        nextReleaseBox.innerHTML = `
            <div style="margin-bottom: 1rem;">
                <span class="story-tag" style="background: rgba(255, 65, 108, 0.15); color: #ff416c; font-weight: 700; font-size: 0.8rem;">${releaseTag}</span>
            </div>
            <h4 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.3rem;">${upcoming.title}</h4>
            <p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 1rem;"><i data-lucide="book-open" style="width: 14px; height: 14px; display: inline; vertical-align: middle; margin-right: 4px;"></i> ${storyTitle}</p>
            <div style="font-weight: 700; color: #ff4b2b; display: flex; align-items: center; gap: 0.5rem;">
                <i data-lucide="calendar"></i> Le ${formattedDate} à ${upcoming.time}
            </div>
        `;
    } else {
        nextReleaseBox.innerHTML = `
            <p style="color: var(--text-secondary); text-align: center; padding: 1.5rem 0;">Aucune sortie programmée prochainement.</p>
        `;
    }

    // 3. Highlighted story
    if (stories.length > 0) {
        const featured = stories[0];
        featuredBookBox.innerHTML = `
            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                <img src="${featured.cover || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=300&q=80'}" style="width: 90px; height: 130px; object-fit: cover; border-radius: 8px;" alt="Couverture">
                <div style="flex: 1; min-width: 150px;">
                    <h4 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 0.5rem;">${featured.title}</h4>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4; margin-bottom: 1rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">${featured.description}</p>
                    <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" id="featuredReadBtn"><i data-lucide="book-open" style="width: 14px; height: 14px;"></i> Lire l'histoire</button>
                </div>
            </div>
        `;
        document.getElementById('featuredReadBtn').addEventListener('click', () => openStoryDetail(featured));
    } else {
        featuredBookBox.innerHTML = `
            <p style="color: var(--text-secondary); text-align: center; padding: 1.5rem 0;">Aucune histoire disponible.</p>
        `;
    }

    initIcons();
}

/* ==========================================================
   PAGE: STORIES (stories.html)
   ========================================================== */
let activeTag = 'all';

function initStoriesPage() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', renderStoriesList);
    
    renderTagsFilter();
    renderStoriesList();
}

function renderTagsFilter() {
    const tagFilters = document.getElementById('tagFilters');
    if (!tagFilters) return;

    const allTags = new Set();
    stories.forEach(story => {
        if (story.tags) story.tags.forEach(tag => allTags.add(tag));
    });

    tagFilters.innerHTML = `<span class="tag ${activeTag === 'all' ? 'active' : ''}" data-tag="all">Tous</span>`;

    allTags.forEach(tag => {
        const tagEl = document.createElement('span');
        tagEl.className = `tag ${activeTag === tag ? 'active' : ''}`;
        tagEl.setAttribute('data-tag', tag);
        tagEl.textContent = tag;
        tagFilters.appendChild(tagEl);
    });

    document.querySelectorAll('.tag').forEach(tagEl => {
        tagEl.addEventListener('click', () => {
            document.querySelectorAll('.tag').forEach(t => t.classList.remove('active'));
            tagEl.classList.add('active');
            activeTag = tagEl.getAttribute('data-tag');
            renderStoriesList();
        });
    });
}

function renderStoriesList() {
    const storiesGrid = document.getElementById('storiesGrid');
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.toLowerCase().trim();

    storiesGrid.innerHTML = '';

    const filtered = stories.filter(story => {
        const matchesSearch = story.title.toLowerCase().includes(query) || 
                              story.description.toLowerCase().includes(query) ||
                              (story.tags && story.tags.some(tag => tag.toLowerCase().includes(query)));
        const matchesTag = activeTag === 'all' || (story.tags && story.tags.includes(activeTag));
        return matchesSearch && matchesTag;
    });

    if (filtered.length === 0) {
        storiesGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);">
                <i data-lucide="info" style="width: 48px; height: 48px; margin-bottom: 1rem; color: #ff4b2b;"></i>
                <p>Aucune histoire ne correspond à vos critères.</p>
            </div>
        `;
        initIcons();
        return;
    }

    filtered.forEach(story => {
        storiesGrid.appendChild(createStoryCard(story, false));
    });

    initIcons();
}

/* ==========================================================
   PAGE: PLANNING (planning.html)
   ========================================================== */
function initPlanningPage() {
    const planningTimeline = document.getElementById('planningTimeline');
    planningTimeline.innerHTML = '';

    const sortedReleases = getSortedReleases();

    if (sortedReleases.length === 0) {
        planningTimeline.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                <i data-lucide="calendar" style="width: 48px; height: 48px; margin-bottom: 1rem; color: #ff4b2b;"></i>
                <p>Aucune sortie programmée pour le moment.</p>
            </div>
        `;
        initIcons();
        return;
    }

    sortedReleases.forEach(release => {
        const linkedStory = stories.find(s => s.id === release.storyId);
        const storyTitle = linkedStory ? linkedStory.title : 'Histoire inconnue';
        
        const isLaunch = release.releaseType === 'Livre';
        const genreTags = linkedStory ? (linkedStory.tags || []) : [];
        
        const dateObj = new Date(`${release.date}T${release.time}`);
        const formattedDate = dateObj.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        const event = document.createElement('div');
        event.className = 'timeline-event';
        const typeBadge = isLaunch ? '<span class="story-status status-a-paraitre" style="position: static; font-size: 0.7rem; padding: 0.15rem 0.4rem; margin-left: 0.5rem; text-transform: uppercase; display: inline-block;">Lancement</span>' : '';
        const genreHtml = genreTags.length > 0 ? `<div style="margin-top: 0.6rem; display: flex; gap: 0.4rem; flex-wrap: wrap;">${genreTags.map(t => `<span class="story-tag">${t}</span>`).join('')}</div>` : '';
        
        event.innerHTML = `
            <div class="timeline-marker"></div>
            <div class="timeline-content">
                <div class="timeline-date"><i data-lucide="clock"></i> Le ${formattedDate} à ${release.time} ${typeBadge}</div>
                <h4 class="timeline-title">${release.title}</h4>
                <div class="timeline-story"><i data-lucide="book-open"></i> ${storyTitle}</div>
                ${genreHtml}
            </div>
        `;
        planningTimeline.appendChild(event);
    });

    initIcons();
}

/* ==========================================================
   USER CARD & MODAL (Click cards to read / details popup)
   ========================================================== */
function createStoryCard(story) {
    const coverSrc = story.cover || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=600&q=80';
    const card = document.createElement('div');
    card.className = 'story-card clickable-card';
    
    const statusClass = story.status === 'published' ? 'termine' : 'en-cours';
    const displayStatus = story.status === 'published' ? 'Terminé' : 'En cours';

    card.innerHTML = `
        <div class="story-cover-container">
            <img src="${coverSrc}" class="story-cover" alt="Couverture de ${story.title}">
            <span class="story-status status-${statusClass}">${displayStatus}</span>
        </div>
        <div class="story-details">
            <h3 class="story-title">${story.title}</h3>
            <div class="story-tags">
                ${(story.tags || []).map(t => `<span class="story-tag">${t}</span>`).join('')}
            </div>
            <p class="story-synopsis">${story.description}</p>
            <div class="story-footer">
                <button class="btn btn-primary btn-sm read-btn"><i data-lucide="book-open"></i> Lire sur le site</button>
            </div>
        </div>
    `;

    card.addEventListener('click', () => openStoryDetail(story));

    return card;
}

function openStoryDetail(story) {
    const coverSrc = story.cover || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=600&q=80';
    const statusClass = story.status === 'published' ? 'termine' : 'en-cours';
    const displayStatus = story.status === 'published' ? 'Terminé' : 'En cours';

    // List chapters
    let chaptersHtml = '';
    if (story.chapters && story.chapters.length > 0) {
        story.chapters.forEach(ch => {
            const hasRelease = ch.date && ch.time;
            const isReleased = !hasRelease || (new Date(`${ch.date}T${ch.time}`) <= new Date());
            
            if (isReleased) {
                chaptersHtml += `
                    <div class="read-chapter-item" data-chapterid="${ch.id}" style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 0.5rem; cursor: pointer; transition: var(--transition-smooth);">
                        <span style="font-size: 0.95rem; font-weight: 600;"><i data-lucide="book-open-check" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 8px; color: #ff4b2b;"></i>${ch.title}</span>
                        <span style="font-size: 0.8rem; color: var(--text-muted);">Lire le chapitre</span>
                    </div>`;
            } else {
                const dateObj = new Date(`${ch.date}T${ch.time}`);
                const formatted = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                chaptersHtml += `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: rgba(255,255,255,0.01); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 0.5rem; opacity: 0.5;">
                        <span style="font-size: 0.95rem; font-weight: 500; color: var(--text-secondary);"><i data-lucide="lock" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 8px;"></i>${ch.title}</span>
                        <span style="font-size: 0.8rem; color: #ff4b2b;">Le ${formatted}</span>
                    </div>`;
            }
        });
    } else {
        chaptersHtml = `<p style="color: var(--text-muted); font-size: 0.85rem;">Aucun chapitre n'est publié pour le moment.</p>`;
    }

    const overlay = document.createElement('div');
    overlay.className = 'details-modal-overlay';
    overlay.id = 'storyDetailModal';
    overlay.innerHTML = `
        <div class="details-modal" id="modalViewBody">
            <div class="details-modal-body">
                <button class="details-modal-close" id="detailCloseBtn">&times;</button>
                <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
                    <img src="${coverSrc}" style="width: 130px; height: 190px; object-fit: cover; border-radius: 10px; border: 2px solid rgba(255,65,108,0.3); flex-shrink: 0;" alt="Couverture">
                    <div style="flex: 1; min-width: 200px;">
                        <div style="margin-bottom: 0.8rem;">
                            <span class="story-status status-${statusClass}" style="position: static; display: inline-block;">${displayStatus}</span>
                        </div>
                        <h3 style="font-size: 1.6rem; font-weight: 800; line-height: 1.2; margin-bottom: 0.8rem;">${story.title}</h3>
                        <div style="display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 1rem;">
                            ${(story.tags || []).map(t => `<span class="story-tag">${t}</span>`).join('')}
                        </div>
                        <a href="${story.url || '#'}" target="_blank" class="btn btn-outline" style="padding: 0.5rem 1rem; font-size: 0.85rem;"><i data-lucide="external-link"></i> Voir sur Wattpad</a>
                    </div>
                </div>
                <div style="border-top: 1px solid var(--border-color); padding-top: 1.2rem; margin-bottom: 1.5rem;">
                    <h4 style="font-weight: 700; font-size: 1rem; margin-bottom: 0.6rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Synopsis</h4>
                    <p style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.7;">${story.description}</p>
                </div>
                <div>
                    <h4 style="font-weight: 700; font-size: 1rem; margin-bottom: 0.8rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Chapitres</h4>
                    <div id="modalChaptersList">
                        ${chaptersHtml}
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    initIcons();

    // Close handlers
    overlay.querySelector('#detailCloseBtn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    // Open Reader View
    overlay.querySelectorAll('.read-chapter-item').forEach(item => {
        item.addEventListener('click', () => {
            const chId = item.getAttribute('data-chapterid');
            const chapter = story.chapters.find(c => c.id === chId);
            if (chapter) {
                openReaderView(story, chapter);
            }
        });
    });
}

function openReaderView(story, chapter) {
    const modalViewBody = document.getElementById('modalViewBody');
    if (!modalViewBody) return;

    // Save previous HTML to restore on Back click
    const previousHtml = modalViewBody.innerHTML;

    // Split text paragraphs
    const paragraphs = chapter.content.split('\n').filter(p => p.trim() !== "");
    const paragraphsHtml = paragraphs.map(p => `<p style="margin-bottom: 1.25rem; font-size: 1.05rem; line-height: 1.8; color: #dcd7ec; text-align: justify; font-family: 'Outfit', sans-serif;">${p}</p>`).join('');

    modalViewBody.innerHTML = `
        <div class="details-modal-body" style="padding: 1.5rem 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 1.5rem;">
                <button class="btn btn-secondary btn-sm" id="readerBackBtn" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;"><i data-lucide="arrow-left" style="width: 14px; height: 14px;"></i> Retour</button>
                <div style="text-align: right;">
                    <small style="color: var(--text-muted); font-size: 0.75rem; display: block; text-transform: uppercase; font-weight: 700;">${story.title}</small>
                </div>
            </div>

            <h2 style="font-size: 1.8rem; font-weight: 800; text-align: center; margin-bottom: 2rem; background: var(--primary-grad); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${chapter.title}</h2>
            
            <div style="max-height: 50vh; overflow-y: auto; padding: 1rem 0.5rem; background: rgba(0,0,0,0.2); border-radius: 8px; border: 1px solid var(--border-color);">
                ${paragraphsHtml}
            </div>
            
            <div style="margin-top: 1.5rem; text-align: center; font-size: 0.85rem; color: var(--text-muted);">
                Fin de la lecture de ce chapitre.
            </div>
        </div>
    `;

    initIcons();

    // Back button listener
    document.getElementById('readerBackBtn').addEventListener('click', () => {
        // Restore view
        modalViewBody.innerHTML = previousHtml;
        initIcons();

        // Reattach close and chapter reading listeners
        document.getElementById('detailCloseBtn').addEventListener('click', () => document.getElementById('storyDetailModal').remove());
        
        // Re-get elements
        const overlay = document.getElementById('storyDetailModal');
        overlay.querySelectorAll('.read-chapter-item').forEach(item => {
            item.addEventListener('click', () => {
                const chId = item.getAttribute('data-chapterid');
                const ch = story.chapters.find(c => c.id === chId);
                if (ch) {
                    openReaderView(story, ch);
                }
            });
        });
    });
}
