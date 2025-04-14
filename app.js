document.addEventListener('DOMContentLoaded', () => {
    const app = new ShoppingListApp();
    app.init();
});

class ShoppingListApp {
    constructor() {
        // Data
        this.appData = {
            lists: [],
            archivedLists: [],
            masterStores: [] // Store master item list separate from active lists
        };
        this.activeListId = null;
        this.draggedItemInfo = null; // { listType: 'master'/'shopping', itemId, element }

        // DOM Elements (Cache main elements)
        this.cacheDOMElements();

        // Templates
        this.cacheTemplates();
    }

    // --- Initialization ---
    init() {
        console.log("Initializing Shopping List App...");
        this.loadData();
        // Render first to ensure elements exist before attaching some listeners
        this.render(); 
        // Setup listeners after initial render
        this.setupEventListeners(); 

        // Attach delegated listeners directly after initial render
        console.log("Attaching delegated listeners in init...");
        this.dom.storeContainers.addEventListener('click', this.handleMasterListEvents.bind(this));
        this.dom.shoppingListItemsContainer.addEventListener('click', this.handleShoppingListEvents.bind(this));
        this.dom.archivedListsContainer.addEventListener('click', this.handleArchivedListEvents.bind(this));

        console.log("App Initialized.");
    }

    cacheDOMElements() {
        this.dom = {
            // List Selection & Controls
            activeListSelect: document.getElementById('active-list-select'),
            newListBtn: document.getElementById('new-list-btn'),
            archiveListBtn: document.getElementById('archive-list-btn'),
            viewArchivedBtn: document.getElementById('view-archived-btn'),
            exportDataBtn: document.getElementById('export-data-btn'),
            importDataBtn: document.getElementById('import-data-btn'),
            importFileInput: document.getElementById('import-file-input'),

            // Item Management Panel
            itemManagementSection: document.getElementById('item-management'),
            addStoreBtn: document.getElementById('add-store-btn'),
            filterStoreSelect: document.getElementById('filter-store-select'),
            searchMasterItemsInput: document.getElementById('search-master-items-input'),
            storeContainers: document.getElementById('store-containers'),

            // Shopping List Panel
            shoppingListSection: document.getElementById('shopping-list'),
            activeListNameDisplay: document.getElementById('active-list-name-display'),
            shoppingListItemsContainer: document.getElementById('shopping-list-items-container'),

            // Archived Lists Panel
            archivedListsPanel: document.getElementById('archived-lists-panel'),
            closeArchivedPanelBtn: document.getElementById('close-archived-panel-btn'),
            archivedListsContainer: document.getElementById('archived-lists-container'),

            // Modals (assuming IDs match the keys, e.g., 'newListModal')
            modals: {
                newList: document.getElementById('new-list-modal'),
                addStore: document.getElementById('add-store-modal'),
                editStore: document.getElementById('edit-store-modal'),
                addCategory: document.getElementById('add-category-modal'),
                editCategory: document.getElementById('edit-category-modal'),
                editItem: document.getElementById('edit-item-modal'),
                duplicateItem: document.getElementById('duplicate-item-modal')
            }
        };
    }

    cacheTemplates() {
        this.templates = {
            store: document.getElementById('store-template'),
            category: document.getElementById('category-template'),
            item: document.getElementById('item-template'),
            shoppingListStore: document.getElementById('shopping-list-store-template'),
            shoppingListCategory: document.getElementById('shopping-list-category-template'),
            shoppingListItem: document.getElementById('shopping-list-item-template'),
            archivedList: document.getElementById('archived-list-template')
        };
    }

    // Helper function to convert kebab-case to camelCase
    kebabToCamelCase(str) {
        return str.replace(/-([a-z])/g, (match, char) => char.toUpperCase());
    }

    setupEventListeners() {
        // Header List Controls
        this.dom.activeListSelect.addEventListener('change', this.handleListChange.bind(this));
        this.dom.newListBtn.addEventListener('click', () => this.openModal('newList'));
        this.dom.archiveListBtn.addEventListener('click', this.archiveActiveList.bind(this));
        this.dom.viewArchivedBtn.addEventListener('click', this.showArchivedPanel.bind(this));
        this.dom.closeArchivedPanelBtn.addEventListener('click', this.hideArchivedPanel.bind(this));
        this.dom.exportDataBtn.addEventListener('click', this.exportData.bind(this));
        this.dom.importDataBtn.addEventListener('click', () => this.dom.importFileInput.click());
        this.dom.importFileInput.addEventListener('change', this.importData.bind(this));

        // Item Management Controls
        this.dom.addStoreBtn.addEventListener('click', () => this.openModal('addStore'));
        this.dom.filterStoreSelect.addEventListener('change', this.renderMasterStores.bind(this));
        this.dom.searchMasterItemsInput.addEventListener('input', this.renderMasterStores.bind(this));

        // Modals - General Close
        document.querySelectorAll('.modal .close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                 const modalId = e.target.closest('.modal').id;
                 // Convert kebab-case ID fragment to camelCase key
                 const modalName = this.kebabToCamelCase(modalId.replace('-modal', '')); 
                 console.log(`Close button clicked for modal ID: ${modalId}, derived name: ${modalName}`);
                 this.closeModal(modalName);
            });
        });
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) { // Click on backdrop
                    const modalId = modal.id;
                    // Convert kebab-case ID fragment to camelCase key
                    const modalName = this.kebabToCamelCase(modalId.replace('-modal', '')); 
                    console.log(`Backdrop clicked for modal ID: ${modalId}, derived name: ${modalName}`);
                    this.closeModal(modalName);
                }
            });
        });

        // Modals - Specific Confirm Actions (Get elements within the handler)
        this.dom.modals.newList.querySelector('#confirm-new-list-btn').addEventListener('click', this.handleCreateList.bind(this));
        this.dom.modals.addStore.querySelector('#confirm-add-store-btn').addEventListener('click', this.handleAddMasterStore.bind(this));
        this.dom.modals.editStore.querySelector('#confirm-edit-store-btn').addEventListener('click', this.handleEditMasterStore.bind(this));
        this.dom.modals.addCategory.querySelector('#confirm-add-category-btn').addEventListener('click', this.handleAddCategory.bind(this));
        this.dom.modals.editCategory.querySelector('#confirm-edit-category-btn').addEventListener('click', this.handleEditCategory.bind(this));
        this.dom.modals.editItem.querySelector('#confirm-edit-item-btn').addEventListener('click', this.handleEditItem.bind(this));
        this.dom.modals.duplicateItem.querySelector('#confirm-duplicate-item-btn').addEventListener('click', this.handleDuplicateItemConfirm.bind(this));

        // Delegated event listeners for dynamic content (stores, categories, items)
        // MOVED TO init()

        // Drag and Drop (using delegation on containers)
        document.addEventListener('dragstart', this.handleDragStart.bind(this));
        document.addEventListener('dragover', this.handleDragOver.bind(this));
        document.addEventListener('dragleave', this.handleDragLeave.bind(this));
        document.addEventListener('drop', this.handleDrop.bind(this));
        document.addEventListener('dragend', this.handleDragEnd.bind(this));
    }

    // --- Data Handling ---
    loadData() {
        console.log("Loading data from localStorage...");
        const savedData = localStorage.getItem('shoppingListAppData_v2'); // Use new key for fresh start
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                // Basic validation
                if (parsedData && Array.isArray(parsedData.lists) && Array.isArray(parsedData.archivedLists) && Array.isArray(parsedData.masterStores)) {
                    this.appData = parsedData;
                    console.log("Data loaded successfully.");
                } else {
                    console.warn("Loaded data has incorrect structure. Initializing default.");
                    this.initializeDefaultData();
                }
            } catch (error) {
                console.error("Error parsing localStorage data:", error);
                this.initializeDefaultData();
            }
        } else {
            console.log("No saved data found. Initializing default.");
            this.initializeDefaultData();
        }

        // Set initial active list
        if (this.appData.lists.length > 0) {
             // Find last active list ID from localStorage if available, otherwise use first list
            const lastActiveId = localStorage.getItem('shoppingListLastActiveId');
            if (lastActiveId && this.appData.lists.some(l => l.id === lastActiveId)) {
                this.activeListId = lastActiveId;
            } else {
                this.activeListId = this.appData.lists[0].id;
            }
        } else {
            // If no lists exist after loading/init, create one
            this.createList("My First List"); // Creates and sets activeListId
        }
        console.log("Final appData after load/init:", JSON.parse(JSON.stringify(this.appData)));
        console.log(`Active list ID set to: ${this.activeListId}`);
    }

    initializeDefaultData() {
        this.appData = {
            lists: [],
            archivedLists: [],
            masterStores: [
                { id: this.generateId(), name: 'Supermercado', categories: [
                    { id: this.generateId(), name: 'Frutas', items: [
                        { id: this.generateId(), name: 'Manzanas', order: 0 },
                        { id: this.generateId(), name: 'Plátanos', order: 1 }
                    ], order: 0 },
                    { id: this.generateId(), name: 'Verduras', items: [
                        { id: this.generateId(), name: 'Zanahorias', order: 0 }
                    ], order: 1 }
                ], order: 0 },
                { id: this.generateId(), name: 'Ferretería', categories: [
                     { id: this.generateId(), name: 'Herramientas', items: [
                         { id: this.generateId(), name: 'Martillo', order: 0 }
                     ], order: 0 }
                ], order: 1 }
            ]
        };
        this.activeListId = null;
        // Don't save immediately, let createList handle it if needed
    }

    saveData() {
        console.log("Saving data to localStorage...");
        localStorage.setItem('shoppingListAppData_v2', JSON.stringify(this.appData));
        if(this.activeListId) {
            localStorage.setItem('shoppingListLastActiveId', this.activeListId);
        }
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    }

    getActiveList() {
        return this.appData.lists.find(list => list.id === this.activeListId);
    }

    findMasterStore(storeId) {
        return this.appData.masterStores.find(s => s.id === storeId);
    }

    findMasterCategory(storeId, categoryId) {
        const store = this.findMasterStore(storeId);
        return store ? store.categories.find(c => c.id === categoryId) : null;
    }

    findMasterItem(storeId, categoryId, itemId) {
        const category = this.findMasterCategory(storeId, categoryId);
        return category ? category.items.find(i => i.id === itemId) : null;
    }

    // --- Rendering ---
    render() {
        console.log("Rendering UI...");
        this.renderListSelect();
        this.renderMasterStores();
        this.renderShoppingList();
        this.renderArchivedLists(); // Keep panel content up-to-date
        console.log("UI Render complete.");
    }

    renderListSelect() {
        this.dom.activeListSelect.innerHTML = '';
        if (this.appData.lists.length === 0) {
             // Handle case with no active lists (shouldn't happen with auto-create)
            const option = document.createElement('option');
            option.textContent = "No Lists Available";
            option.disabled = true;
            this.dom.activeListSelect.appendChild(option);
            this.dom.archiveListBtn.disabled = true;
        } else {
            this.appData.lists.forEach(list => {
                const option = document.createElement('option');
                option.value = list.id;
                option.textContent = list.name;
                option.selected = list.id === this.activeListId;
                this.dom.activeListSelect.appendChild(option);
            });
            this.dom.archiveListBtn.disabled = this.appData.lists.length <= 1; // Can't archive last list
        }
    }

    renderMasterStores() {
        console.log("Rendering master stores...");
        this.dom.storeContainers.innerHTML = '';
        
        // --- Filter & Search Logic --- 
        const filterStoreId = this.dom.filterStoreSelect.value;
        const searchTerm = this.dom.searchMasterItemsInput.value.trim().toLowerCase();
        console.log(`Filtering Stores by: ${filterStoreId}, Searching for: "${searchTerm}"`);

        let storesToRender = this.appData.masterStores;

        // 1. Filter by selected Store ID
        if (filterStoreId !== 'all') {
            storesToRender = storesToRender.filter(store => store.id === filterStoreId);
        }

        // 2. Filter by Search Term (if any)
        let foundResults = false;
        if (searchTerm) {
            storesToRender = storesToRender.map(store => {
                // Clone store and categories/items to avoid modifying original data
                const filteredStore = { ...store, categories: [] }; 

                store.categories.forEach(category => {
                    const itemsMatchingSearch = category.items.filter(item => 
                        item.name.toLowerCase().includes(searchTerm)
                    );

                    const categoryNameMatches = category.name.toLowerCase().includes(searchTerm);

                    // Keep category if its name matches OR it has items that match
                    if (categoryNameMatches || itemsMatchingSearch.length > 0) {
                         // If only category name matches, include all items
                         // If items match, include only matching items
                        const itemsToInclude = categoryNameMatches ? category.items : itemsMatchingSearch;
                        filteredStore.categories.push({ ...category, items: itemsToInclude });
                        foundResults = true; // Mark that we found something
                    }
                });
                // Keep store only if it has matching categories after filtering
                return filteredStore.categories.length > 0 ? filteredStore : null;
            }).filter(Boolean); // Remove nulls (stores with no matching content)
        } else {
            foundResults = storesToRender.length > 0; // If no search term, results depend on store filter
        }

        // --- Update Store Filter Dropdown (Always use full list) ---
        this.dom.filterStoreSelect.innerHTML = '<option value="all">Todas las Tiendas</option>'; // Reset filter
        this.appData.masterStores.forEach(store => {
            const option = document.createElement('option');
            option.value = store.id;
            option.textContent = store.name;
            option.selected = store.id === filterStoreId; // Reflect current selection
            this.dom.filterStoreSelect.appendChild(option);
        });

        // --- Render Filtered/Searched Stores --- 
        if (storesToRender.length === 0) {
             let message = "No hay tiendas.";
             if (this.appData.masterStores.length > 0) { // Check if stores exist at all
                  if (filterStoreId !== 'all') {
                       message = searchTerm ? "Ningún artículo coincide con la búsqueda en esta tienda." : "Esta tienda no tiene categorías.";
                  } else {
                       message = searchTerm ? "Ningún artículo coincide con la búsqueda." : "No hay tiendas creadas."; // Default if stores exist but filter removed them
                  }
             }
             this.dom.storeContainers.innerHTML = `<p class="empty-state">${message}</p>`;
        } else {
            storesToRender.sort((a, b) => (a.order || 0) - (b.order || 0)).forEach((store, index, arr) => {
                const storeEl = this.createStoreElement(store, searchTerm); // Pass search term
                // Disable up/down buttons based on the *rendered* list
                storeEl.querySelector('.move-store-up-btn').disabled = index === 0;
                storeEl.querySelector('.move-store-down-btn').disabled = index === arr.length - 1;
                this.dom.storeContainers.appendChild(storeEl);
            });
        }
    }

    createStoreElement(store, searchTerm) { // Accept searchTerm
        const storeEl = this.templates.store.content.cloneNode(true).firstElementChild;
        storeEl.dataset.storeId = store.id;
        storeEl.querySelector('.store-name').textContent = store.name;
        const categoriesWrapper = storeEl.querySelector('.categories-wrapper');
        categoriesWrapper.innerHTML = '';
        
        let categoriesToRender = store.categories;
        
        // If filtering occurred in renderMasterStores due to search, categoriesToRender is already pre-filtered.
        // We just need to sort and render them.
        
        categoriesToRender.sort((a, b) => (a.order || 0) - (b.order || 0)).forEach((category, index, arr) => {
            // Pass searchTerm to createCategoryElement to filter items if necessary
            const categoryEl = this.createCategoryElement(category, store.id, searchTerm); 
            if (categoryEl) { // Only append if category has content after item filtering
                 // Disable up/down buttons based on the *rendered* list
                 categoryEl.querySelector('.move-category-up-btn').disabled = index === 0;
                 categoryEl.querySelector('.move-category-down-btn').disabled = index === arr.length - 1;
                 categoriesWrapper.appendChild(categoryEl);
            }
        });
        return storeEl;
    }

    createCategoryElement(category, storeId, searchTerm) { // Accept searchTerm
        const categoryEl = this.templates.category.content.cloneNode(true).firstElementChild;
        categoryEl.dataset.categoryId = category.id;
        categoryEl.dataset.storeId = storeId;
        categoryEl.querySelector('.category-name').textContent = category.name;

        const categoryColor = this.getCategoryColor(category.id);
        categoryEl.style.borderLeftColor = categoryColor;
        categoryEl.querySelector('.category-header').style.borderBottomColor = categoryColor;

        const itemList = categoryEl.querySelector('.item-list');
        itemList.dataset.droppable = 'true';
        itemList.innerHTML = '';
        
        let itemsToRender = category.items;

        // Filter items if a search term is active and the category name itself didn't match
        // (If category name matched, renderMasterStores included all items already)
        if (searchTerm && !category.name.toLowerCase().includes(searchTerm)) {
            itemsToRender = itemsToRender.filter(item => item.name.toLowerCase().includes(searchTerm));
        }

        if (itemsToRender.length === 0) {
            // If search term is active, show search-specific message, otherwise normal empty state
             if (searchTerm) {
                 itemList.innerHTML = '<li class="empty-state">Ningún artículo coincide aquí.</li>';
                 // If the category name also didn't match, don't render the category at all
                 if (!category.name.toLowerCase().includes(searchTerm)) return null; 
             } else {
                 itemList.innerHTML = '<li class="empty-state">No hay artículos en esta categoría.</li>';
             }
        } else {
             itemsToRender.sort((a, b) => (a.order || 0) - (b.order || 0)).forEach((item, index, arr) => {
                const itemEl = this.createItemElement(item, category.id, storeId);
                 itemEl.querySelector('.move-item-up-btn').disabled = index === 0;
                 itemEl.querySelector('.move-item-down-btn').disabled = index === arr.length - 1;
                itemList.appendChild(itemEl);
            });
        }
        
        // Only return the element if it has items or matches the category name search
        return categoryEl;
    }

    createItemElement(item, categoryId, storeId) {
        const itemEl = this.templates.item.content.cloneNode(true).firstElementChild;
        itemEl.dataset.itemId = item.id;
        itemEl.dataset.categoryId = categoryId;
        itemEl.dataset.storeId = storeId;
        itemEl.querySelector('.item-name').textContent = item.name;

        // Check if item is already in the active shopping list
        const activeList = this.getActiveList();
        const isInList = activeList && activeList.shoppingList.some(listItem => listItem.id === item.id);
        const addBtn = itemEl.querySelector('.add-to-shopping-list-btn');
        if (isInList) {
            addBtn.disabled = true;
            addBtn.textContent = '✓'; // Indicate it's added
        } else {
             addBtn.disabled = false;
             addBtn.textContent = '+';
        }

        return itemEl;
    }

    renderShoppingList() {
        console.log("Rendering shopping list...");
        this.dom.shoppingListItemsContainer.innerHTML = '';
        const list = this.getActiveList();

        // Update the active list name display
        if (list) {
            this.dom.activeListNameDisplay.textContent = list.name;
            this.dom.activeListNameDisplay.style.display = ''; // Make visible
        } else {
            this.dom.activeListNameDisplay.textContent = 'Ninguna lista activa seleccionada';
            this.dom.activeListNameDisplay.style.display = 'block'; // Ensure visible even if no list
        }

        if (!list) {
            this.dom.shoppingListItemsContainer.innerHTML = '<p class="empty-state">Selecciona o crea una lista de compras.</p>';
            console.warn("No active list to render.");
            return;
        }

        if (list.shoppingList.length === 0) {
            this.dom.shoppingListItemsContainer.innerHTML = '<p class="empty-state">La lista de compras está vacía. Añade artículos desde el panel izquierdo.</p>';
            return; // Keep the name displayed, but show empty state for items
        }

        // Group items by store, then by category
        const grouped = {};
        list.shoppingList.forEach(item => {
            const storeId = item.storeId;
            const categoryId = item.categoryId;
            if (!storeId || !categoryId) {
                console.warn("Artículo en lista de compras sin ID de tienda o categoría:", item);
                return; // Skip malformed items
            }
            if (!grouped[storeId]) {
                const storeInfo = this.findMasterStore(storeId);
                grouped[storeId] = { name: storeInfo ? storeInfo.name : 'Tienda Desconocida', categories: {} };
            }
            if (!grouped[storeId].categories[categoryId]) {
                 const categoryInfo = this.findMasterCategory(storeId, categoryId);
                grouped[storeId].categories[categoryId] = { name: categoryInfo ? categoryInfo.name : 'Categoría Desconocida', items: [] };
            }
            grouped[storeId].categories[categoryId].items.push(item);
        });

        // Render grouped items
        Object.keys(grouped).sort((a, b) => grouped[a].name.localeCompare(grouped[b].name)).forEach(storeId => {
            const storeData = grouped[storeId];
            const storeGroupEl = this.templates.shoppingListStore.content.cloneNode(true).firstElementChild;
            storeGroupEl.querySelector('.store-name').textContent = storeData.name;
            const categoriesWrapper = storeGroupEl.querySelector('.shopping-list-categories-wrapper');

            Object.keys(storeData.categories).sort((a, b) => storeData.categories[a].name.localeCompare(storeData.categories[b].name)).forEach(categoryId => {
                const categoryData = storeData.categories[categoryId];
                const categoryGroupEl = this.templates.shoppingListCategory.content.cloneNode(true).firstElementChild;
                categoryGroupEl.querySelector('.category-name').textContent = categoryData.name;
                 // Assign category color consistent with master list
                 const categoryColor = this.getCategoryColor(categoryId); 
                 categoryGroupEl.style.borderLeftColor = categoryColor;
                 categoryGroupEl.querySelector('.category-name').style.color = categoryColor; // Color the text too

                const itemListEl = categoryGroupEl.querySelector('.shopping-list-item-list');
                itemListEl.dataset.droppable = 'true';
                categoryData.items.sort((a, b) => (a.order || 0) - (b.order || 0)).forEach(item => {
                    itemListEl.appendChild(this.createShoppingListItemElement(item));
                });
                categoriesWrapper.appendChild(categoryGroupEl);
            });
            this.dom.shoppingListItemsContainer.appendChild(storeGroupEl);
        });
    }

    createShoppingListItemElement(item) {
        const itemEl = this.templates.shoppingListItem.content.cloneNode(true).firstElementChild;
        itemEl.dataset.itemId = item.id;
        itemEl.dataset.storeId = item.storeId;
        itemEl.dataset.categoryId = item.categoryId;
        itemEl.querySelector('.item-name').textContent = item.name;
        
        // Notes display logic removed
        
        itemEl.querySelector('.item-checkbox').checked = item.checked;
        if (item.checked) {
            itemEl.classList.add('checked');
        }
        // Link checkbox and label implicitly by structure or add `for` attribute if needed
        const uniqueId = `item-${item.id}`;
        itemEl.querySelector('.item-label').htmlFor = uniqueId;
        itemEl.querySelector('.item-checkbox').id = uniqueId;
        return itemEl;
    }

    renderArchivedLists() {
        this.dom.archivedListsContainer.innerHTML = '';
        if (this.appData.archivedLists.length === 0) {
            this.dom.archivedListsContainer.innerHTML = '<p class="empty-state">No hay listas archivadas.</p>';
        } else {
            this.appData.archivedLists.sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt)).forEach(list => {
                const archivedEl = this.templates.archivedList.content.cloneNode(true).firstElementChild;
                archivedEl.dataset.listId = list.id;
                archivedEl.querySelector('.list-name').textContent = list.name;
                archivedEl.querySelector('.list-date').textContent = `Archivado: ${new Date(list.archivedAt).toLocaleDateString()}`;
                this.dom.archivedListsContainer.appendChild(archivedEl);
            });
        }
    }

    // --- Event Handlers ---
    handleListChange() {
        this.activeListId = this.dom.activeListSelect.value;
        console.log(`Active list changed to: ${this.activeListId}`);
        localStorage.setItem('shoppingListLastActiveId', this.activeListId); // Remember selection
        this.renderShoppingList(); // Only need to re-render the shopping list side
        this.renderMasterStores(); // Re-render master list to update add button states
        this.dom.archiveListBtn.disabled = this.appData.lists.length <= 1; // Update archive button state
    }

    handleMasterListEvents(event) {
        const target = event.target;
        // Find closest relevant elements
        const categoryDiv = target.closest('.category-container');
        const storeDiv = target.closest('.store-container');
        const itemLi = target.closest('li.item'); // Target master list items

        // Early exit if no relevant context
        if (!categoryDiv && !storeDiv && !itemLi && !target.matches('.add-store-btn') && !target.matches('#filter-store-select') && !target.matches('#search-master-items-input')) {
            console.log("[handleMasterListEvents] Click outside relevant areas.");
            return;
        }

        // Store level actions
        if (storeDiv && !categoryDiv) { // Ensure we are not inside a category
             const storeId = storeDiv.dataset.storeId;
             console.log(`[handleMasterListEvents] Store context: ${storeId}`);
             if (target.matches('.add-category-btn')) {
                 this.openModal('addCategory', { storeId });
             } else if (target.matches('.edit-store-btn')) {
                 this.openModal('editStore', { storeId });
             } else if (target.matches('.delete-store-btn')) {
                 this.deleteMasterStore(storeId);
             } else if (target.matches('.move-store-up-btn')) {
                 this.moveStore(storeId, -1);
             } else if (target.matches('.move-store-down-btn')) {
                  this.moveStore(storeId, 1);
             }
        }

        // Category level actions (must have categoryDiv)
        if (categoryDiv) {
            const categoryId = categoryDiv.dataset.categoryId;
            const storeId = categoryDiv.dataset.storeId;
            console.log(`[handleMasterListEvents] Category context: Cat ${categoryId}, Store ${storeId}`);

            if (target.matches('.edit-category-btn')) {
                this.openModal('editCategory', { storeId, categoryId });
            } else if (target.matches('.delete-category-btn')) {
                this.deleteMasterCategory(storeId, categoryId);
            } else if (target.matches('.add-item-btn')) {
                const input = categoryDiv.querySelector('.new-item-input');
                console.log("[handleMasterListEvents] Matched .add-item-btn");
                this.addMasterItem(storeId, categoryId, input.value.trim());
                input.value = '';
            } else if (target.matches('.move-category-up-btn')) {
                 this.moveCategory(storeId, categoryId, -1);
            } else if (target.matches('.move-category-down-btn')) {
                 this.moveCategory(storeId, categoryId, 1);
            } else if (target.matches('.new-item-input') && event.key === 'Enter') {
                console.log("[handleMasterListEvents] Matched .new-item-input Enter key");
                this.addMasterItem(storeId, categoryId, target.value.trim());
                target.value = '';
            } else if (itemLi) { // Check for item actions *within* the category check
                const itemId = itemLi.dataset.itemId;
                console.log(`[handleMasterListEvents] Item context: Item ${itemId}, Cat ${categoryId}, Store ${storeId}`);

                if (target.matches('.add-to-shopping-list-btn')) {
                    console.log("[handleMasterListEvents] Matched .add-to-shopping-list-btn");
                    this.addItemToShoppingList(storeId, categoryId, itemId);
                } else if (target.matches('.edit-item-btn')) {
                    this.openModal('editItem', { storeId, categoryId, itemId });
                } else if (target.matches('.delete-item-btn')) {
                    this.deleteMasterItem(storeId, categoryId, itemId);
                } else if (target.matches('.move-item-up-btn')) {
                    this.moveItem(storeId, categoryId, itemId, -1);
                } else if (target.matches('.move-item-down-btn')) {
                    this.moveItem(storeId, categoryId, itemId, 1);
                } else if (target.matches('.duplicate-item-btn')) {
                    this.openModal('duplicateItem', { storeId, categoryId, itemId });
                }
            }
        }

        // Search functionality (outside specific store/category context checks)
        if (target === this.dom.searchMasterItemsInput) {
             console.log("[handleMasterListEvents] Search input changed/entered");
             this.renderMasterStores(); // Re-render with search term
             // Debounce might be good here in a real app
        }

        // Filter functionality
        if (target === this.dom.filterStoreSelect) {
            console.log("[handleMasterListEvents] Filter select changed");
            this.renderMasterStores(); // Re-render with filter
        }

        // Handle Inline Notes Input Change <-- REMOVED BLOCK
        // if (target.matches('.item-notes-input')) { ... }
    }

    handleShoppingListEvents(event) {
        const target = event.target;
        const itemLi = target.closest('li.shopping-list-item');

        if (itemLi) {
             const itemId = itemLi.dataset.itemId;
             if (target.matches('.item-checkbox')) {
                 this.toggleShoppingListItemChecked(itemId);
             } else if (target.matches('.remove-from-list-btn')) {
                 this.removeItemFromShoppingList(itemId);
             }
        }
    }

    handleArchivedListEvents(event) {
         const target = event.target;
         const archivedItemDiv = target.closest('.archived-list-item');
         if (!archivedItemDiv) return;

         const listId = archivedItemDiv.dataset.listId;
         if (target.matches('.restore-list-btn')) {
             this.restoreArchivedList(listId);
         } else if (target.matches('.delete-archived-list-btn')) {
             this.deleteArchivedList(listId);
         }
    }

    // --- Modal Handling ---
    openModal(modalName, data = {}) {
        const modal = this.dom.modals[modalName];
        if (!modal) {
            console.error(`Modal "${modalName}" no encontrado.`);
            return;
        }

        // Store data in modal dataset for handlers
        modal.dataset.context = JSON.stringify(data); 

        // Pre-fill based on modal type and data
        switch (modalName) {
            case 'editStore':
                const store = this.findMasterStore(data.storeId);
                if (store) modal.querySelector('#edit-store-name').value = store.name;
                break;
            case 'addCategory':
                // No prefill needed, just need storeId from data.context
                 modal.querySelector('#new-category-name').value = ''; // Clear previous input
                break;
             case 'editCategory':
                const category = this.findMasterCategory(data.storeId, data.categoryId);
                if (category) modal.querySelector('#edit-category-name').value = category.name;
                break;
            case 'editItem':
                const item = this.findMasterItem(data.storeId, data.categoryId, data.itemId);
                if (item) {
                     modal.querySelector('#edit-item-name').value = item.name;
                     // Notes field removed from modal
                     this.populateEditItemSelectors(data.storeId, data.categoryId);
                }
                break;
             case 'newList':
                modal.querySelector('#new-list-name').value = '';
                break;
             case 'addStore':
                 modal.querySelector('#new-store-name').value = '';
                 break;
            case 'duplicateItem':
                const itemToDup = this.findMasterItem(data.storeId, data.categoryId, data.itemId);
                if (itemToDup) {
                    modal.querySelector('#duplicate-item-name-display').textContent = itemToDup.name;
                    // Populate selectors, maybe default to current store/category or first available
                    this.populateDuplicateItemSelectors(data.storeId, data.categoryId);
                } else {
                    console.error("Item to duplicate not found!");
                    alert("Error: Could not find the item to duplicate.");
                    return; // Don't open modal if item not found
                }
                break;
        }

        modal.classList.add('show');
    }

    closeModal(modalName) {
         console.log(`Attempting to close modal with name: ${modalName}`);
         const modal = this.dom.modals[modalName];
         if (modal) {
             modal.classList.remove('show');
             delete modal.dataset.context; // Clear context
             console.log(`Modal ${modalName} closed successfully.`);
         } else {
             console.warn(`Tried to close non-existent modal: ${modalName}`);
         }
    }

    populateEditItemSelectors(currentStoreId, currentCategoryId) {
        const storeSelect = this.dom.modals.editItem.querySelector('#edit-item-store-select');
        const categorySelect = this.dom.modals.editItem.querySelector('#edit-item-category-select');

        storeSelect.innerHTML = '';
        this.appData.masterStores.forEach(store => {
            const option = document.createElement('option');
            option.value = store.id;
            option.textContent = store.name;
            option.selected = store.id === currentStoreId;
            storeSelect.appendChild(option);
        });

        // Function to update categories based on selected store
        const updateCategories = (storeId) => {
            categorySelect.innerHTML = '';
            const selectedStore = this.findMasterStore(storeId);
            if (selectedStore) {
                selectedStore.categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    // Select the original category only if the original store is selected
                    option.selected = (storeId === currentStoreId && category.id === currentCategoryId);
                    categorySelect.appendChild(option);
                });
            }
        };

        // Initial population
        updateCategories(currentStoreId);

        // Update categories when store changes
        storeSelect.onchange = () => {
            updateCategories(storeSelect.value);
        };
    }

    populateDuplicateItemSelectors(currentStoreId, currentCategoryId) {
        const storeSelect = this.dom.modals.duplicateItem.querySelector('#duplicate-item-store-select');
        const categorySelect = this.dom.modals.duplicateItem.querySelector('#duplicate-item-category-select');

        storeSelect.innerHTML = '';
        this.appData.masterStores.forEach(store => {
            const option = document.createElement('option');
            option.value = store.id;
            option.textContent = store.name;
             // Maybe default to the current store? Or first store?
            option.selected = store.id === currentStoreId;
            storeSelect.appendChild(option);
        });

        // Function to update categories based on selected store
        const updateCategories = (storeId) => {
            categorySelect.innerHTML = '';
            const selectedStore = this.findMasterStore(storeId);
            if (selectedStore) {
                selectedStore.categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    // Select the current category only if the current store is selected, otherwise select first
                    option.selected = (storeId === currentStoreId && category.id === currentCategoryId);
                    categorySelect.appendChild(option);
                });
                 // Ensure a category is selected if options exist
                 if (categorySelect.options.length > 0 && categorySelect.selectedIndex === -1) {
                    categorySelect.options[0].selected = true;
                }
            }
        };

        // Initial population
        updateCategories(storeSelect.value || currentStoreId); // Use selected value or current as fallback

        // Update categories when store changes
        storeSelect.onchange = () => {
            updateCategories(storeSelect.value);
        };
    }

    // --- List Actions ---
    handleCreateList() {
        const input = this.dom.modals.newList.querySelector('#new-list-name');
        const name = input.value.trim();
        if (name) {
            this.createList(name);
            input.value = '';
            this.closeModal('newList');
        } else {
            alert('Por favor, introduce un nombre para la lista.');
        }
    }

    createList(name) {
        const newList = {
            id: this.generateId(),
            name: name,
            createdAt: new Date().toISOString(),
            shoppingList: []
        };
        this.appData.lists.push(newList);
        this.activeListId = newList.id; // Switch to the new list
        this.saveData();
        this.renderListSelect();
        this.renderShoppingList(); // Render the empty shopping list
        this.renderMasterStores(); // Update add button states
        console.log(`List "${name}" created and set active.`);
    }

    archiveActiveList() {
        if (!this.activeListId || this.appData.lists.length <= 1) {
            alert("Cannot archive the last active list.");
            return;
        }
        const listIndex = this.appData.lists.findIndex(l => l.id === this.activeListId);
        if (listIndex > -1) {
            const listToArchive = this.appData.lists.splice(listIndex, 1)[0];
            listToArchive.archivedAt = new Date().toISOString();
            this.appData.archivedLists.push(listToArchive);

            // Set new active list (first one remaining)
            this.activeListId = this.appData.lists[0].id;
            this.saveData();
            this.render(); // Full re-render needed
            console.log(`List "${listToArchive.name}" archived.`);
        } else {
             console.error("Could not find active list to archive.");
        }
    }

    showArchivedPanel() {
        this.renderArchivedLists();
        this.dom.archivedListsPanel.classList.add('show');
    }

    hideArchivedPanel() {
        this.dom.archivedListsPanel.classList.remove('show');
    }

    restoreArchivedList(listId) {
        const listIndex = this.appData.archivedLists.findIndex(l => l.id === listId);
        if (listIndex > -1) {
            const listToRestore = this.appData.archivedLists.splice(listIndex, 1)[0];
            delete listToRestore.archivedAt;
            this.appData.lists.push(listToRestore);
            // Optionally switch to the restored list
            this.activeListId = listToRestore.id;
            this.saveData();
            this.render(); // Full re-render
             this.hideArchivedPanel(); // Close panel after restoring
            console.log(`List "${listToRestore.name}" restored.`);
        }
    }

    deleteArchivedList(listId) {
        if (confirm("Are you sure you want to permanently delete this archived list?")) {
            const initialLength = this.appData.archivedLists.length;
            this.appData.archivedLists = this.appData.archivedLists.filter(l => l.id !== listId);
            if(this.appData.archivedLists.length < initialLength) {
                this.saveData();
                this.renderArchivedLists(); // Just re-render the panel
                console.log(`Archived list ${listId} deleted.`);
            }
        }
    }

    // --- Master List Actions (Stores, Categories, Items) ---
    handleAddMasterStore() {
        const input = this.dom.modals.addStore.querySelector('#new-store-name');
        const name = input.value.trim();
        if (name) {
            const newStore = {
                id: this.generateId(),
                name: name,
                categories: [
                    { id: this.generateId(), name: 'General', items: [], order: 0 } // Start with a General category
                ]
            };
            this.appData.masterStores.push(newStore);
            this.saveData();
            this.renderMasterStores();
            input.value = '';
            this.closeModal('addStore');
            console.log(`Master store "${name}" added.`);
        } else {
            alert('Por favor, introduce un nombre para la tienda.');
        }
    }

    handleEditMasterStore() {
        const context = JSON.parse(this.dom.modals.editStore.dataset.context || '{}');
        const storeId = context.storeId;
        const input = this.dom.modals.editStore.querySelector('#edit-store-name');
        const newName = input.value.trim();
        const store = this.findMasterStore(storeId);

        if (newName && store) {
            store.name = newName;
            this.saveData();
            this.renderMasterStores();
            this.renderShoppingList(); // Need to update store names in shopping list too
            this.closeModal('editStore');
            console.log(`Master store ${storeId} renamed to "${newName}".`);
        } else if (!store) {
             alert("Error: Store not found.");
        } else {
            alert("Por favor, introduce un nuevo nombre para la tienda.");
        }
    }

    deleteMasterStore(storeId) {
        if (confirm(`¿Estás seguro de que quieres eliminar la tienda "${store.name}" y todas sus categorías y artículos? Esta acción no se puede deshacer.`)) {
            const initialLength = this.appData.masterStores.length;
            this.appData.masterStores = this.appData.masterStores.filter(s => s.id !== storeId);
            
            if(this.appData.masterStores.length < initialLength) {
                 // Also remove items from this store from ALL active/archived shopping lists
                 this.appData.lists.forEach(list => {
                     list.shoppingList = list.shoppingList.filter(item => item.storeId !== storeId);
                 });
                 this.appData.archivedLists.forEach(list => {
                    list.shoppingList = list.shoppingList.filter(item => item.storeId !== storeId);
                 });

                this.saveData();
                this.renderMasterStores();
                this.renderShoppingList(); // Update shopping list view
                console.log(`Master store ${storeId} deleted.`);
            } else {
                 console.warn(`Store ${storeId} not found for deletion.`);
            }
        }
    }

    handleAddCategory() {
        const context = JSON.parse(this.dom.modals.addCategory.dataset.context || '{}');
        const storeId = context.storeId;
        const input = this.dom.modals.addCategory.querySelector('#new-category-name');
        const name = input.value.trim();
        const store = this.findMasterStore(storeId);

        if (name && store) {
            const newCategory = {
                id: this.generateId(),
                name: name,
                items: []
            };
            store.categories.push(newCategory);
            this.saveData();
            this.renderMasterStores();
            input.value = '';
            this.closeModal('addCategory');
            console.log(`Category "${name}" added to store ${storeId}.`);
        } else if (!store) {
             alert("Error: Store not found.");
        } else {
            alert("Por favor, introduce un nombre para la categoría.");
        }
    }

    handleEditCategory() {
        const context = JSON.parse(this.dom.modals.editCategory.dataset.context || '{}');
        const { storeId, categoryId } = context;
        const input = this.dom.modals.editCategory.querySelector('#edit-category-name');
        const newName = input.value.trim();
        const category = this.findMasterCategory(storeId, categoryId);

        if (newName && category) {
            category.name = newName;
            this.saveData();
            this.renderMasterStores();
            this.renderShoppingList(); // Update category names in shopping list
            this.closeModal('editCategory');
            console.log(`Category ${categoryId} renamed to "${newName}".`);
        } else if (!category) {
             alert("Error: Category not found.");
        } else {
             alert("Por favor, introduce un nuevo nombre para la categoría.");
        }
    }

    deleteMasterCategory(storeId, categoryId) {
        const store = this.findMasterStore(storeId);
        if (!store) return;

        if (store.categories.length <= 1) {
            alert("Cannot delete the last category in a store.");
            return;
        }

        if (confirm(`¿Estás seguro de que quieres eliminar la categoría "${category.name}" y todos sus artículos? Esta acción no se puede deshacer.`)) {
            const initialLength = store.categories.length;
            const categoryToDelete = store.categories.find(c => c.id === categoryId);
            store.categories = store.categories.filter(c => c.id !== categoryId);

            if(store.categories.length < initialLength) {
                // Also remove items from this category from ALL active/archived shopping lists
                this.appData.lists.forEach(list => {
                    list.shoppingList = list.shoppingList.filter(item => !(item.storeId === storeId && item.categoryId === categoryId));
                });
                this.appData.archivedLists.forEach(list => {
                   list.shoppingList = list.shoppingList.filter(item => !(item.storeId === storeId && item.categoryId === categoryId));
                });

                this.saveData();
                this.renderMasterStores();
                this.renderShoppingList();
                console.log(`Category ${categoryId} deleted from store ${storeId}.`);
            } else {
                 console.warn(`Category ${categoryId} not found for deletion.`);
            }
        }
    }

    addMasterItem(storeId, categoryId, name) {
        if (!name) {
            alert('Por favor, introduce un nombre para el artículo.');
            return;
        }
        const category = this.findMasterCategory(storeId, categoryId);
        if (!category) {
            alert("Error: Categoría no encontrada.");
            return;
        }
        const newItem = {
            id: this.generateId(),
            name: name,
            order: category.items.length > 0 ? Math.max(...category.items.map(i => i.order || 0)) + 1 : 0
        };
        category.items.push(newItem);
        console.log(`Item "${name}" added to category ${categoryId}.`);
        this.saveData();
        this.renderMasterStores(); // Re-render relevant part
    }

    handleEditItem() {
        const modal = this.dom.modals.editItem;
        const context = JSON.parse(modal.dataset.context || '{}');
        const { storeId, categoryId, itemId } = context;
        const nameInput = modal.querySelector('#edit-item-name');
        const newStoreSelect = modal.querySelector('#edit-item-store-select');
        const newCategorySelect = modal.querySelector('#edit-item-category-select');
        // Notes input removed from modal

        if (!storeId || !categoryId || !itemId) {
            alert("Error: Missing context for editing item.");
            return;
        }

        const newName = nameInput.value.trim();
        const newStoreId = newStoreSelect.value;
        const newCategoryId = newCategorySelect.value;

        if (!newName) {
            alert('Por favor, introduce un nuevo nombre para el artículo.');
            return;
        }
        if (!newStoreId || !newCategoryId) {
            alert('Por favor, selecciona una tienda y categoría de destino.');
            return;
        }

        const item = this.findMasterItem(storeId, categoryId, itemId);
        if (!item) {
            alert("Error: Item not found.");
            return;
        }

        // Update name (notes are gone)
        item.name = newName;

        // Update corresponding item in shopping list if present
        this.appData.lists.forEach(list => {
            const shoppingItem = list.shoppingList.find(i => i.id === itemId);
            if (shoppingItem) {
                shoppingItem.name = newName;
                 // Also update store/category if moved
                 shoppingItem.storeId = newStoreId;
                 shoppingItem.categoryId = newCategoryId;
            }
        });


        // Move item if necessary
        if (newStoreId !== storeId || newCategoryId !== categoryId) {
            // Remove from old location
            const oldCategory = this.findMasterCategory(storeId, categoryId);
            if (oldCategory) {
                oldCategory.items = oldCategory.items.filter(i => i.id !== itemId);
            }
            // Add to new location
            const newCategory = this.findMasterCategory(newStoreId, newCategoryId);
            if (newCategory) {
                 // Add item to the new category's items array
                item.order = newCategory.items.length > 0 ? Math.max(...newCategory.items.map(i => i.order || 0)) + 1 : 0; // Recalc order
                newCategory.items.push(item);
            } else {
                console.error("Failed to find new category to move item into.");
                 // Optional: Add back to original if move fails? Or just alert?
                 alert("Error: Could not find the destination category. Item remains in original location.");
                 if(oldCategory) oldCategory.items.push(item); // Put it back
                 return; // Stop before closing modal/saving
            }
        }

        this.saveData();
        this.renderMasterStores();
        this.renderShoppingList(); // Re-render in case item name/category changed
        this.closeModal('editItem');
        console.log(`Item ${itemId} updated.`);
    }

    deleteMasterItem(storeId, categoryId, itemId) {
         console.log(`Attempting deleteMasterItem - Store: ${storeId}, Cat: ${categoryId}, Item: ${itemId}`);
         const category = this.findMasterCategory(storeId, categoryId);
         if (category) {
            console.log(` -> Found category: ${category.name}`);
            const initialLength = category.items.length;
            const itemIndex = category.items.findIndex(i => i.id === itemId);
            if (itemIndex === -1) {
                 console.warn(` -> Item ${itemId} not found in category items array.`);
                 return;
            }
            console.log(` -> Found item at index: ${itemIndex}. Proceeding with deletion.`);
            category.items = category.items.filter(i => i.id !== itemId);
            if(category.items.length < initialLength) {
                console.log(" -> Item removed from category data.");
                // Remove from ALL shopping lists
                console.log(" -> Removing from active/archived shopping lists...");
                this.appData.lists.forEach(list => {
                    list.shoppingList = list.shoppingList.filter(item => item.id !== itemId);
                });
                this.appData.archivedLists.forEach(list => {
                    list.shoppingList = list.shoppingList.filter(item => item.id !== itemId);
                 });
                console.log(" -> Saving data and re-rendering...");
                this.saveData();
                this.renderMasterStores();
                this.renderShoppingList();
                console.log(`Item ${itemId} deleted from category ${categoryId}.`);
            } else {
                 // This case should ideally not be reached if findIndex found it
                 console.error(`Item ${itemId} was found but filter failed to remove it.`);
            }
         } else {
             console.warn(`Category ${categoryId} not found for item deletion.`);
         }
    }

    // --- Shopping List Actions ---
    addItemToShoppingList(storeId, categoryId, itemId) {
         console.log(`Attempting addItemToShoppingList - Store: ${storeId}, Cat: ${categoryId}, Item: ${itemId}`);
        const list = this.getActiveList();
        if (!list) {
            console.error("No hay ninguna lista activa seleccionada para añadir artículos.");
            alert("No active shopping list selected!");
            return;
        }
        // Check if already added
        if (list.shoppingList.some(item => item.id === itemId)) {
            console.log(` -> Item ${itemId} already in shopping list. Skipping add.`);
            // Update master list button state even if skipped
            this.renderMasterStores();
            return;
        }

        const masterItem = this.findMasterItem(storeId, categoryId, itemId);
        if (masterItem) {
            console.log(` -> Found master item: ${masterItem.name}`);
             // Append to end of category group in shopping list
            const categoryItemsInList = list.shoppingList.filter(i => i.storeId === storeId && i.categoryId === categoryId);
            const order = categoryItemsInList.length > 0 ? Math.max(...categoryItemsInList.map(i => i.order || 0)) + 1 : 0;
            const newItem = {
                id: masterItem.id,
                name: masterItem.name,
                storeId: storeId,
                categoryId: categoryId,
                checked: false,
                order: order
            };
             console.log(" -> Creating new shopping list item:", newItem);
            list.shoppingList.push(newItem);
             console.log(" -> Saving data and re-rendering...");
            this.saveData();
            this.renderShoppingList();
            this.renderMasterStores(); // Update button state
            console.log(`Item "${masterItem.name}" added to shopping list.`);
        } else {
             console.error(" -> Could not find the master item to add.");
             alert("Error: Could not find the master item to add.");
        }
    }

    removeItemFromShoppingList(itemId) {
        const list = this.getActiveList();
        if (list) {
            const initialLength = list.shoppingList.length;
            list.shoppingList = list.shoppingList.filter(item => item.id !== itemId);
            if(list.shoppingList.length < initialLength) {
                this.saveData();
                this.renderShoppingList();
                this.renderMasterStores(); // Update add button states
                console.log(`Item ${itemId} removed from shopping list.`);
            }
        }
    }

    toggleShoppingListItemChecked(itemId) {
        const list = this.getActiveList();
        if (list) {
            const item = list.shoppingList.find(item => item.id === itemId);
            if (item) {
                item.checked = !item.checked;
                this.saveData();
                // Visually update immediately (could be optimized to not re-render whole list)
                const itemElement = this.dom.shoppingListItemsContainer.querySelector(`.shopping-list-item[data-item-id="${itemId}"]`);
                if (itemElement) {
                    itemElement.classList.toggle('checked', item.checked);
                }
                console.log(`Item ${itemId} checked state: ${item.checked}.`);
            } else {
                 console.warn(`Item ${itemId} not found in shopping list to toggle.`);
            }
        } else {
             console.warn("No active list found to toggle item check.");
        }
    }

    // --- Drag and Drop Handlers ---
    handleDragStart(event) {
        // Only handle dragging for master list items intended for shopping list
        const draggableElement = event.target.closest('.item[draggable="true"]');
        if (!draggableElement) {
             // Also allow dragging shopping list items for reordering within the list
             const shoppingListItem = event.target.closest('.shopping-list-item[draggable="true"]');
             if (shoppingListItem) {
                 this.draggedItemInfo = {
                    type: 'item',
                    itemId: shoppingListItem.dataset.itemId,
                    categoryId: shoppingListItem.dataset.categoryId,
                    storeId: shoppingListItem.dataset.storeId,
                    listType: 'shopping', 
                    element: shoppingListItem
                 };
                 console.log(`[handleDragStart] Set draggedItemInfo (Shopping List Item):`, JSON.parse(JSON.stringify(this.draggedItemInfo)));
                 event.dataTransfer.effectAllowed = 'move';
                 event.dataTransfer.setData('text/plain', JSON.stringify(this.draggedItemInfo));
                 setTimeout(() => shoppingListItem.classList.add('dragging'), 0);
                 console.log(`[handleDragStart] Drag Start: Shopping List Item ${this.draggedItemInfo.itemId}`);
             } else {
                 console.log("[handleDragStart] Element is not a draggable master item or shopping list item.");
             }
             return;
        }

        // It's a master list item
        const itemId = draggableElement.dataset.itemId;
        const categoryId = draggableElement.dataset.categoryId;
        const storeId = draggableElement.dataset.storeId;

        // Prevent dragging master item if already in list
        const activeList = this.getActiveList();
        const isInList = activeList && activeList.shoppingList.some(listItem => listItem.id === itemId);
        if (isInList) {
            console.log("Previniendo arrastre: El artículo ya está en la lista de compras.");
            event.preventDefault();
            return;
        }

        this.draggedItemInfo = {
            type: 'item',
            itemId: itemId,
            categoryId: categoryId,
            storeId: storeId,
            listType: 'master',
            element: draggableElement
        };

        console.log(`[handleDragStart] Set draggedItemInfo (Master Item):`, JSON.parse(JSON.stringify(this.draggedItemInfo)));

        event.dataTransfer.effectAllowed = 'move'; // Allow moving to shopping list
        event.dataTransfer.setData('text/plain', JSON.stringify(this.draggedItemInfo)); 

        setTimeout(() => draggableElement.classList.add('dragging'), 0);
        console.log(`[handleDragStart] Drag Start: Master Item ${itemId}`);
    }

    handleDragOver(event) {
        event.preventDefault(); // Necessary to allow drop
        if (!this.draggedItemInfo || this.draggedItemInfo.type !== 'item') return; // Only handle item drags

        // Check if over a valid drop zone (only shopping list item list for master items)
        // Or another shopping list item list for reordering shopping list items
        const dropZone = event.target.closest('ul.shopping-list-item-list[data-droppable="true"]'); 

        // Remove previous drag-over highlights
        document.querySelectorAll('.drag-over').forEach(el => {
            if (el !== dropZone) {
                el.classList.remove('drag-over');
            }
        });

        if (dropZone) {
            // Allow dropping master items OR shopping list items onto shopping list UL
            if (this.draggedItemInfo.listType === 'master' || this.draggedItemInfo.listType === 'shopping') {
                 event.dataTransfer.dropEffect = 'move';
                 dropZone.classList.add('drag-over');
            } else {
                 event.dataTransfer.dropEffect = 'none'; // Should not happen based on dragStart
                 dropZone.classList.remove('drag-over'); 
            }
        } else {
            event.dataTransfer.dropEffect = 'none';
        }
    }

    // getDragAfterElement remains the same - needed for shopping list reorder

    handleDragLeave(event) {
        // Check relatedTarget to prevent flickering when moving over child elements
        if (event.relatedTarget && event.target.contains(event.relatedTarget)) {
            return;
        }
        // Only remove from shopping list ULs now
        const dropZone = event.target.closest('ul.shopping-list-item-list[data-droppable="true"]');
        if (dropZone) {
            dropZone.classList.remove('drag-over');
        }
    }

    handleDrop(event) {
        event.preventDefault();
        console.log("[handleDrop] Event Target:", event.target);
        if (!this.draggedItemInfo || this.draggedItemInfo.type !== 'item') return; // Only handle item drops

        const draggedInfo = this.draggedItemInfo; // Local copy
        
        // Find the shopping list drop zone
        const dropZone = event.target.closest('ul.shopping-list-item-list[data-droppable="true"]');
        const dropZoneType = dropZone ? 'shopping-list-items' : null;

        console.log(`[handleDrop] Found dropZone: ${dropZone}, type: ${dropZoneType}`);
        console.log("[handleDrop] Value of draggedItemInfo at start:", JSON.parse(JSON.stringify(draggedInfo)));

        // Abort if not a valid shopping list drop zone
        if (!dropZone || !draggedInfo) {
            console.log("[handleDrop] Drop aborted (not a valid shopping list drop zone or no dragged info).");
            return;
        }

        dropZone.classList.remove('drag-over');

        // Handle drop based on item source
        if (draggedInfo.listType === 'master') {
            // Add item from master list
            console.log(` -> Case: Add Master item ${draggedInfo.itemId} to Shopping List`);
            this.addItemToShoppingList(draggedInfo.storeId, draggedInfo.categoryId, draggedInfo.itemId);
        } else if (draggedInfo.listType === 'shopping') {
            // Reorder item within the shopping list
             console.log(` -> Case: Reorder Shopping List Item ${draggedInfo.itemId}`);
             const targetCategoryEl = dropZone.closest('.shopping-list-category-group');
             let targetStoreEl = dropZone.closest('.shopping-list-store-group');
             if (targetCategoryEl && targetStoreEl) {
                  const targetStoreId = targetStoreEl.dataset.storeId;
                  const targetCategoryId = targetCategoryEl.dataset.categoryId;
                  this.updateItemOrder('shopping', targetStoreId, targetCategoryId, dropZone);
             } else {
                  console.error("[Shopping List Reorder] Could not determine target store/category for drop.");
             }
        } else {
             console.warn("Unknown dragged item listType:", draggedInfo.listType);
        }
        // dragEnd cleans up
    }

    // Remove handleItemDrop, handleCategoryDrop, handleStoreDrop
    // Keep updateItemOrder, remove updateStoreOrder, updateCategoryOrder, moveMasterItem, moveCategory

    handleDragEnd(event) {
        console.log("[handleDragEnd] Drag End fired.");
        if (this.draggedItemInfo && this.draggedItemInfo.element) {
            console.log("[handleDragEnd] Removing 'dragging' class from:", this.draggedItemInfo.element);
            this.draggedItemInfo.element.classList.remove('dragging');
        }
        // Clean up drop zones
        document.querySelectorAll('.drag-over').forEach(el => {
            console.log("[handleDragEnd] Removing 'drag-over' class from:", el);
            el.classList.remove('drag-over');
        });
        console.log("[handleDragEnd] Clearing draggedItemInfo.");
        this.draggedItemInfo = null;
        // Re-render master stores needed to update the (+) button state if an item was added
        this.renderMasterStores(); 
        // Shopping list is re-rendered by addItemToShoppingList or updateItemOrder
    }

    // updateItemOrder logic remains for shopping list reordering
    updateItemOrder(listType, targetStoreId, targetCategoryId, containerElement) {
        // Only handle shopping list for now
        if (listType !== 'shopping') {
             console.warn(`[updateItemOrder] called with unsupported listType: ${listType}`);
             return;
        }

        console.log(`[updateItemOrder] Called for ${listType} list. Target Store: ${targetStoreId}, Cat: ${targetCategoryId}`);
        const itemElements = [...containerElement.querySelectorAll('.shopping-list-item[draggable="true"]')]; // Target shopping list items
        const orderedItemIds = itemElements.map(el => {
             console.log(`  -> DOM Item ID: ${el.dataset.itemId}`);
             return el.dataset.itemId;
        });
        console.log(`[updateItemOrder] New DOM order: ${orderedItemIds.join(', ')}`);

        const list = this.getActiveList();
        if (list) {
            console.log(`[updateItemOrder] Found active shopping list: ${list.name}`);
            const itemMap = new Map(list.shoppingList.map(item => [item.id, item]));

            // Update order for items found in the current container based on their DOM order
            orderedItemIds.forEach((id, index) => {
                const item = itemMap.get(id);
                // Check if the item belongs to the target store/category before updating order
                // This prevents accidentally reordering items dropped into the wrong visual group
                if (item && item.storeId === targetStoreId && item.categoryId === targetCategoryId) {
                    item.order = index; // Update order based on position within this specific UL
                    console.log(`  -> Updating order for shopping item ${item.name} (${id}) to ${index}`);
                } else if (item) {
                    console.warn(`  -> Skipped order update for shopping item ${item.name} (${id}). It doesn't belong to target ${targetStoreId}/${targetCategoryId}.`);
                } else {
                    console.warn(`  -> Shopping Item ID ${id} from DOM not found in shopping list data map.`);
                }
            });

            // Need to re-sort the entire shoppingList array based on the potentially updated order properties
             list.shoppingList.sort((a, b) => (a.order || 0) - (b.order || 0));

            // Note: To make cross-category/store reordering work robustly, we'd need a more
            // complex logic that potentially updates the storeId/categoryId of the dropped item
            // and recalculates orders globally or within the new target group.
            // Current logic only reorders within the same category visually represented by the dropZone ul.

            console.log(`[updateItemOrder] Shopping list data potentially reordered (within category ${targetCategoryId}).`);
            this.saveData();
            // Re-render to ensure visual consistency across groups if sort changed anything
            this.renderShoppingList();
        } else {
            console.error("[updateItemOrder] No se pudo encontrar la lista activa para reordenar artículos de compra.");
            // return; // Removed return here, was causing issues before
        }

        // --- REMOVE MISPLACED BLOCK START ---
        /* 
         console.log(`[updateItemOrder] New DOM order: ${orderedItemIds.join(', ')}`); // LOG <-- THIS WAS LINE 1467

        if (listType === 'master') {
            // ... removed master list logic ...
        } else if (listType === 'shopping') {
           // ... removed duplicate shopping list logic ...
        }

        this.saveData();
        // ...
        */
       // --- REMOVE MISPLACED BLOCK END ---
    }

    // Remove updateStoreOrder
    // Remove updateCategoryOrder
    // Remove moveMasterItem
    // Remove moveCategory

    // handleDuplicateItemConfirm...

    // --- Data Import/Export ---
    exportData() {
        try {
            const dataStr = JSON.stringify(this.appData, null, 2); // Pretty print JSON
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
            link.download = `shopping-list-backup-${timestamp}.json`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
            console.log("Data exported successfully.");
        } catch (error) {
            console.error("Error exportando datos:", error);
            alert("Fallo al exportar datos. Ver consola para detalles.");
        }
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) {
            return; // No file selected
        }

        if (!file.type || file.type !== 'application/json') {
            alert("Por favor, selecciona un archivo JSON válido (.json).");
            this.dom.importFileInput.value = ''; // Reset input
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);

                // Basic validation of the imported structure
                if (!importedData || typeof importedData !== 'object' || !Array.isArray(importedData.lists) || !Array.isArray(importedData.archivedLists) || !Array.isArray(importedData.masterStores)) {
                    throw new Error("Estructura de datos inválida en el archivo importado.");
                }

                if (confirm("Importar este archivo sobrescribirá todas las listas y artículos actuales. ¿Estás seguro?")) {
                    this.appData = importedData;
                    this.activeListId = null; // Reset active list
                    // Try to find a valid active list ID from the imported data
                    if (this.appData.lists.length > 0) {
                        const lastActiveId = localStorage.getItem('shoppingListLastActiveId'); // Check if old ID exists in new data
                        if (lastActiveId && this.appData.lists.some(l => l.id === lastActiveId)) {
                            this.activeListId = lastActiveId;
                        } else {
                             this.activeListId = this.appData.lists[0].id; // Default to first imported list
                        }
                    }
                    
                    this.saveData(); // Save the imported data
                    this.render();   // Re-render the entire UI
                    console.log("Datos importados con éxito.");
                    alert("¡Datos importados con éxito!");
                } else {
                    console.log("Importación cancelada por el usuario.");
                }

            } catch (error) {
                console.error("Error importando datos:", error);
                alert(`Fallo al importar datos: ${error.message}. Por favor, revisa el formato del archivo y la consola para detalles.`);
            }
             finally {
                 this.dom.importFileInput.value = ''; // Reset input regardless of success/failure/cancel
            }
        };

        reader.onerror = (error) => {
            console.error("Error leyendo archivo:", error);
            alert("Fallo al leer el archivo seleccionado.");
            this.dom.importFileInput.value = ''; // Reset input
        };

        reader.readAsText(file);
    }

    // --- Reordering Functions ---
    moveStore(storeId, direction) {
        const stores = this.appData.masterStores;
        const index = stores.findIndex(s => s.id === storeId);
        if (index === -1) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= stores.length) return; // Prevent moving out of bounds

        // Swap elements
        [stores[index], stores[newIndex]] = [stores[newIndex], stores[index]];

        // Update order property for all stores (simpler than just updating swapped pair)
        stores.forEach((store, i) => store.order = i);

        this.saveData();
        this.renderMasterStores(); // Re-render to reflect new order and button states
        console.log(`Store ${storeId} moved ${direction}.`);
    }

    moveCategory(storeId, categoryId, direction) {
        const store = this.findMasterStore(storeId);
        if (!store) return;
        const categories = store.categories;
        const index = categories.findIndex(c => c.id === categoryId);
        if (index === -1) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= categories.length) return;

        // Swap elements
        [categories[index], categories[newIndex]] = [categories[newIndex], categories[index]];

        // Update order property for all categories in this store
        categories.forEach((cat, i) => cat.order = i);

        this.saveData();
        this.renderMasterStores(); // Re-render the whole master list for simplicity
        console.log(`Category ${categoryId} in store ${storeId} moved ${direction}.`);
    }

    moveItem(storeId, categoryId, itemId, direction) {
        const category = this.findMasterCategory(storeId, categoryId);
        if (!category) return;
        const items = category.items;
        const index = items.findIndex(i => i.id === itemId);
        if (index === -1) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= items.length) return;

        // Swap elements
        [items[index], items[newIndex]] = [items[newIndex], items[index]];

        // Update order property for all items in this category
        items.forEach((item, i) => item.order = i);

        this.saveData();
        this.renderMasterStores(); // Re-render the whole master list for simplicity
        console.log(`Item ${itemId} in category ${categoryId} moved ${direction}.`);
    }

    // --- Other Actions ---
    handleDuplicateItemConfirm() {
        const context = JSON.parse(this.dom.modals.duplicateItem.dataset.context || '{}');
        const { storeId: originalStoreId, categoryId: originalCategoryId, itemId } = context;
        
        const targetStoreId = this.dom.modals.duplicateItem.querySelector('#duplicate-item-store-select').value;
        const targetCategoryId = this.dom.modals.duplicateItem.querySelector('#duplicate-item-category-select').value;

        if (!targetStoreId || !targetCategoryId) {
            alert("Please select a target store and category.");
            return;
        }

        const originalItem = this.findMasterItem(originalStoreId, originalCategoryId, itemId);
        if (!originalItem) {
            alert("No se pudo encontrar el artículo original para duplicar.");
            this.closeModal('duplicateItem');
            return;
        }

        console.log(`Duplicating item '${originalItem.name}' to Store ${targetStoreId}, Category ${targetCategoryId}`);
        // Use addMasterItem logic, but pass the name
        this.addMasterItem(targetStoreId, targetCategoryId, originalItem.name);

        this.closeModal('duplicateItem');
    }

    // Helper function to get a consistent color for a category
    getCategoryColor(categoryId) {
        // Simple hash function to get a number from the ID string
        let hash = 0;
        for (let i = 0; i < categoryId.length; i++) {
            hash = categoryId.charCodeAt(i) + ((hash << 5) - hash);
            hash = hash & hash; // Convert to 32bit integer
        }

        // Predefined list of distinct colors
        const colors = [
            '#1abc9c', // Turquoise
            '#3498db', // Peter River (Blue)
            '#9b59b6', // Amethyst (Purple)
            '#e67e22', // Carrot (Orange)
            '#e74c3c', // Alizarin (Red)
            '#16a085', // Green Sea
            '#2980b9', // Belize Hole (Darker Blue)
            '#8e44ad', // Wisteria (Darker Purple)
            '#d35400', // Pumpkin (Darker Orange)
            '#c0392b', // Pomegranate (Darker Red)
            '#f1c40f', // Sun Flower (Yellow)
            '#2ecc71'  // Emerald (Green)
        ];

        // Use modulo to wrap around the color list based on the hash
        const index = Math.abs(hash % colors.length);
        return colors[index];
    }
} 