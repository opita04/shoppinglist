document.addEventListener('DOMContentLoaded', () => {
    // console.log("DOM fully loaded. Waiting for Firebase to be ready...");

    // Function to initialize the app
    const initializeApp = () => {
        // console.log("Firebase is ready - About to initialize ShoppingListApp");
        // Log Firebase and Firestore availability again, should be true now
        const app = new ShoppingListApp();
        app.init();
    };

    // Check if Firebase is already ready (in case the event fired before this listener was added)
    if (window.firestoreFunctions) {
        // console.log("Firebase was already ready on DOMContentLoaded.");
        initializeApp();
    } else {
        // Listen for the custom firebase-ready event
        // console.log("Setting up listener for firebase-ready event...");
        document.addEventListener('firebase-ready', initializeApp, { once: true }); // Use { once: true } to only run once
    }
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

        // --- ADDED LOADING FLAGS ---
        this.storesLoaded = false;
        this.listsLoaded = false;
        // -------------------------

        // Check for Firestore availability and set internal flag
        this._firestore = !!window.firestoreFunctions; 
        // console.log(`[App.js] Constructor - Firestore available: ${this._firestore}`); // LOG REMOVED

        // Define a color palette for categories
        this.categoryColors = [
            '#3498db', // Blue (Primary)
            '#f39c12', // Orange (Secondary)
            '#2ecc71', // Green (Success)
            '#e74c3c', // Red (Danger)
            '#9b59b6', // Purple
            '#1abc9c', // Turquoise
            '#34495e', // Dark Blue/Grey
            '#f1c40f'  // Yellow
        ];

        // DOM Elements (Cache main elements)
        this.cacheDOMElements();

        // Templates
        this.cacheTemplates();
    }

    // --- Initialization ---
    init() {
        // console.log("[App.js] init() started."); // LOG REMOVED
        
        try {
            // console.log("[App.js] init() - Caching DOM Elements..."); // LOG REMOVED
            this.cacheDOMElements();
            // console.log("[App.js] init() - Caching Templates..."); // LOG REMOVED
            this.cacheTemplates();
            // console.log("[App.js] init() - Loading Data..."); // LOG REMOVED
            this.loadData(); 
            // Setup listeners AFTER initiating data load (DOM elements should exist)
            // console.log("[App.js] init() - Setting up Event Listeners..."); // LOG REMOVED
            this.setupEventListeners(); 
            // console.log("[App.js] init() - Initial steps complete (render/listeners setup pending data)."); // LOG REMOVED
        } catch (error) {
            console.error("[App.js] CRITICAL ERROR during init():", error); // Keep this error
            alert("There was a critical error initializing the application. See console for details.");
            document.title = "Lista de Compras - Error!";
        }
    }

    cacheDOMElements() {
        // console.log("Caching DOM elements...");
        
        this.dom = {
            // List Selection & Controls
            activeListSelect: document.getElementById('active-list-select'),
            newListBtn: document.getElementById('new-list-btn'),
            archiveListBtn: document.getElementById('archive-list-btn'),
            viewArchivedBtn: document.getElementById('view-archived-btn'),
            copyItemsBtn: document.getElementById('copy-items-btn'), // <-- Added
            exportDataBtn: document.getElementById('export-data-btn'),
            importDataBtn: document.getElementById('import-data-btn'),
            importFileInput: document.getElementById('import-file-input'),

            // Firebase Loading Indicator
            firebaseLoading: document.getElementById('firebase-loading'),

            // Item Management Panel
            itemManagementSection: document.getElementById('item-management'),
            addStoreBtn: document.getElementById('add-store-btn'),
            filterStoreSelect: document.getElementById('filter-store-select'),
            searchMasterItemsInput: document.getElementById('search-master-items-input'),
            storeContainers: document.getElementById('store-containers'),
            
            // Toggle sections
            toggleItemManagement: document.getElementById('toggle-item-management'),
            toggleShoppingList: document.getElementById('toggle-shopping-list'),
            itemManagementContent: document.getElementById('item-management-content'),
            shoppingListContent: document.getElementById('shopping-list-content'),
            
            // Sort control
            sortTypeSelect: document.getElementById('sort-type-select'),

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
                duplicateItem: document.getElementById('duplicate-item-modal'),
                share: document.getElementById('share-modal'), // Assumed ID for share modal
                copyItems: document.getElementById('copy-items-modal') // <-- Added
            },
            // Specific elements within the copy modal (optional caching)
            copySourceListSelect: document.getElementById('copy-source-list-select'),
            copyDestinationListSelect: document.getElementById('copy-destination-list-select'), // <-- Added
            confirmCopyItemsBtn: document.getElementById('confirm-copy-items-btn')
        };
        
        // console.log("DEBUG: DOM elements cached. Button existence:", {
        //     activeListSelect: !!this.dom.activeListSelect,
        //     newListBtn: !!this.dom.newListBtn,
        //     archiveListBtn: !!this.dom.archiveListBtn,
        //     viewArchivedBtn: !!this.dom.viewArchivedBtn
        // });
        
        // console.log("DEBUG: DOM modals existence:", {
        //     newList: !!this.dom.modals.newList,
        //     addStore: !!this.dom.modals.addStore,
        //     editStore: !!this.dom.modals.editStore,
        //     addCategory: !!this.dom.modals.addCategory,
        // });
    }

    cacheTemplates() {
        // console.log("Caching templates...");
        this.templates = {
            store: document.getElementById('store-template'),
            category: document.getElementById('category-template'),
            item: document.getElementById('item-template'),
            shoppingListStore: document.getElementById('shopping-list-store-template'),
            shoppingListCategory: document.getElementById('shopping-list-category-template'),
            shoppingListItem: document.getElementById('shopping-list-item-template'),
            archivedList: document.getElementById('archived-list-template')
        };
        
        // console.log("DEBUG: Templates cached. Existence:", {
        //     store: !!this.templates.store,
        //     category: !!this.templates.category,
        //     item: !!this.templates.item,
        //     shoppingListStore: !!this.templates.shoppingListStore,
        //     shoppingListCategory: !!this.templates.shoppingListCategory,
        //     shoppingListItem: !!this.templates.shoppingListItem,
        //     archivedList: !!this.templates.archivedList
        // });
    }

    // Helper function to convert kebab-case to camelCase
    kebabToCamelCase(str) {
        return str.replace(/-([a-z])/g, (match, char) => char.toUpperCase());
    }

    setupEventListeners() {
        // console.log("[App.js] setupEventListeners() called."); // LOG REMOVED
        try {
            // Header List Controls
            // console.log("DEBUG: Button elements:", {
            //     activeListSelect: !!this.dom.activeListSelect,
            //     newListBtn: !!this.dom.newListBtn,
            //     archiveListBtn: !!this.dom.archiveListBtn,
            //     viewArchivedBtn: !!this.dom.viewArchivedBtn
            // });
            
            if (this.dom.activeListSelect) this.dom.activeListSelect.addEventListener('change', event => {
                // console.log("DEBUG: activeListSelect change triggered");
                if (this.handleListChange) this.handleListChange.bind(this)(event);
                else console.error("handleListChange is undefined");
            });
            
            if (this.dom.newListBtn) this.dom.newListBtn.addEventListener('click', event => {
                // console.log("DEBUG: newListBtn click triggered");
                if (this.openModal) this.openModal('newList');
                else console.error("openModal is undefined");
            });
            
            if (this.dom.archiveListBtn) this.dom.archiveListBtn.addEventListener('click', event => {
                // console.log("DEBUG: archiveListBtn click triggered");
                if (this.archiveActiveList) this.archiveActiveList.bind(this)(event);
                else console.error("archiveActiveList is undefined");
            });
            
            if (this.dom.viewArchivedBtn) this.dom.viewArchivedBtn.addEventListener('click', event => {
                // console.log("DEBUG: viewArchivedBtn click triggered");
                if (this.showArchivedPanel) this.showArchivedPanel.bind(this)(event);
                else console.error("showArchivedPanel is undefined");
            });
            
            // Add logging to close panel button listener
            if (this.dom.closeArchivedPanelBtn) this.dom.closeArchivedPanelBtn.addEventListener('click', event => {
                // console.log("DEBUG: closeArchivedPanelBtn click triggered");
                if (this.hideArchivedPanel) this.hideArchivedPanel.bind(this)(event);
                else console.error("hideArchivedPanel is undefined");
            });
            
            if (this.dom.exportDataBtn) this.dom.exportDataBtn.addEventListener('click', this.exportData?.bind(this) || (() => {}));
            if (this.dom.importDataBtn) this.dom.importDataBtn.addEventListener('click', () => this.dom.importFileInput?.click());
            if (this.dom.importFileInput) this.dom.importFileInput.addEventListener('change', this.importData?.bind(this) || (() => {}));

            // Toggle Section Controls
            if (this.dom.toggleItemManagement) {
                this.dom.toggleItemManagement.addEventListener('click', () => this.toggleSection?.('itemManagement'));
            }
            if (this.dom.toggleShoppingList) {
                this.dom.toggleShoppingList.addEventListener('click', () => this.toggleSection?.('shoppingList'));
            }

            // Sort Type Control
            if (this.dom.sortTypeSelect) {
                this.dom.sortTypeSelect.addEventListener('change', () => this.renderMasterStores());
            }

            // Item Management Controls
            if (this.dom.addStoreBtn) {
                 // console.log("[App.js] setupEventListeners() - Attaching listener to addStoreBtn."); // LOG REMOVED
                 this.dom.addStoreBtn.addEventListener('click', () => {
                     // console.log("[App.js] Add Store button clicked. Calling openModal('addStore')."); // LOG REMOVED
                     this.openModal?.('addStore');
                 });
            } else {
                console.warn("[App.js] setupEventListeners() - addStoreBtn DOM element not found!"); // Keep this warn
            }
            if (this.dom.filterStoreSelect) this.dom.filterStoreSelect.addEventListener('change', this.renderMasterStores?.bind(this) || (() => {}));
            if (this.dom.searchMasterItemsInput) this.dom.searchMasterItemsInput.addEventListener('input', this.renderMasterStores?.bind(this) || (() => {}));

            // Modals - General Close
            document.querySelectorAll('.modal .close-modal').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    // console.log("DEBUG: Close modal button clicked");
                    const modalId = e.target.closest('.modal')?.id;
                    if (modalId) {
                        // Convert kebab-case ID fragment to camelCase key
                        const modalName = this.kebabToCamelCase(modalId.replace('-modal', '')); 
                        // console.log(`Close button clicked for modal ID: ${modalId}, derived name: ${modalName}`);
                        
                        // Add direct DOM manipulation as a backup in case closeModal has issues
                        const modalElement = document.getElementById(modalId);
                        if (modalElement) {
                            // console.log("DEBUG: Directly manipulating modal element");
                            modalElement.classList.remove('show');
                            modalElement.style.display = 'none';
                        }
                        
                        if (this.closeModal) {
                            this.closeModal(modalName);
                        } else {
                            console.error("closeModal is undefined");
                        }
                    } else {
                        console.error("Could not find parent modal for close button");
                    }
                });
            });
            
            document.querySelectorAll('.modal').forEach(modal => {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) { // Click on backdrop
                        // console.log("DEBUG: Modal backdrop clicked");
                        const modalId = modal.id;
                        if (modalId) {
                            // Convert kebab-case ID fragment to camelCase key
                            const modalName = this.kebabToCamelCase(modalId.replace('-modal', '')); 
                            // console.log(`Backdrop clicked for modal ID: ${modalId}, derived name: ${modalName}`);
                            
                            // Add direct DOM manipulation as a backup
                            modal.classList.remove('show');
                            modal.style.display = 'none';
                            
                            if (this.closeModal) {
                                this.closeModal(modalName);
                            } else {
                                console.error("closeModal is undefined");
                            }
                        }
                    }
                });
            });

            // Only set up modal event listeners if modal dom objects exist
            // console.log("DEBUG: Checking this.dom.modals before attaching listeners:", this.dom.modals); // <-- ADD LOG
            if (this.dom.modals) {
                // Modals - Specific Confirm Actions (Get elements within the handler)
                // Restore Listener attachments
                if (this.dom.modals.newList) {
                    const button = this.dom.modals.newList.querySelector('#confirm-new-list-btn');
                    // Use { once: true } for simple confirm modals if appropriate
                    if (button) button.addEventListener('click', this.handleCreateList.bind(this), { once: true });
                }
                
                if (this.dom.modals.addStore) {
                    const button = this.dom.modals.addStore.querySelector('#confirm-add-store-btn');
                    if (button) {
                        // console.log("[App.js] setupEventListeners() - Attaching ONCE listener to confirm-add-store-btn."); // LOG REMOVED
                        button.addEventListener('click', () => {
                            // console.log("[App.js] Confirm Add Store button clicked. Calling handleAddMasterStore."); // LOG REMOVED
                            this.handleAddMasterStore.bind(this)(); // Ensure 'this' context is correct
                        }, { once: true });
                     } else {
                         console.error("[App.js] setupEventListeners() - Could not find #confirm-add-store-btn within modal."); // Keep error
                     }
                }
                
                // REMOVE initial attachment for edit modals - will be handled in open...Modal functions
                /*
                if (this.dom.modals.editStore) {
                    const button = this.dom.modals.editStore.querySelector('#confirm-edit-store-btn');
                    // console.log("DEBUG: Found #confirm-edit-store-btn element during setup:", button); // <-- ADD LOG
                    if (button) {
                         button.addEventListener('click', this.handleEditMasterStore?.bind(this) || (() => {}));
                    } else {
                        // ADD THIS LOG BACK
                        console.error("DEBUG: Could not find #confirm-edit-store-btn within modal during setupEventListeners."); 
                    }
                }
                */
                
                if (this.dom.modals.addCategory) {
                    const button = this.dom.modals.addCategory.querySelector('#confirm-add-category-btn');
                     if (button) button.addEventListener('click', this.handleAddCategory.bind(this), { once: true });
                }
                
                 // REMOVE initial attachment for edit modals
                /*
                if (this.dom.modals.editCategory) {
                    const button = this.dom.modals.editCategory.querySelector('#confirm-edit-category-btn');
                    if (button) button.addEventListener('click', this.handleEditCategory?.bind(this) || (() => {}));
                }
                */
                
                // REMOVE initial attachment for edit modals
                /*
                if (this.dom.modals.editItem) {
                    const button = this.dom.modals.editItem.querySelector('#confirm-edit-item-btn');
                    if (button) button.addEventListener('click', this.handleEditItem?.bind(this) || (() => {}));
                }
                */
                
                if (this.dom.modals.duplicateItem) {
                    const button = this.dom.modals.duplicateItem.querySelector('#confirm-duplicate-item-btn');
                    // Duplicate might be complex, leave listener attachment to openDuplicateItemModal
                    // if (button) button.addEventListener('click', this.handleDuplicateItemConfirm?.bind(this) || (() => {}));
                }
            }

            // Drag and Drop (using delegation on containers)
            document.addEventListener('dragstart', this.handleDragStart?.bind(this) || (() => {}));
            document.addEventListener('dragover', this.handleDragOver?.bind(this) || (() => {}));
            document.addEventListener('dragleave', this.handleDragLeave?.bind(this) || (() => {}));
            document.addEventListener('drop', this.handleDrop?.bind(this) || (() => {}));
            document.addEventListener('dragend', this.handleDragEnd?.bind(this) || (() => {}));
            
            // console.log("[App.js] setupEventListeners() - Basic listeners attached."); // LOG REMOVED
            
            // --- Setup DELEGATED listeners --- 
            // Ensure containers exist before adding listeners
            if (this.dom.storeContainers) {
                // console.log("[App.js] setupEventListeners() - Attaching listener to storeContainers."); // LOG REMOVED
                this.dom.storeContainers.addEventListener('click', this.handleMasterListEvents.bind(this));
            } else {
                console.warn("[App.js] setupEventListeners() - storeContainers DOM element not found!"); // Keep warn
            }
            
            if (this.dom.shoppingListItemsContainer) {
                // console.log("[App.js] setupEventListeners() - Attaching listener to shoppingListItemsContainer."); // LOG REMOVED
                this.dom.shoppingListItemsContainer.addEventListener('click', this.handleShoppingListEvents.bind(this));
            } else {
                console.warn("[App.js] setupEventListeners() - shoppingListItemsContainer DOM element not found!"); // Keep warn
            }
            
             if (this.dom.archivedListsContainer) {
                // console.log("[App.js] setupEventListeners() - Attaching listener to archivedListsContainer."); // LOG REMOVED
                 this.dom.archivedListsContainer.addEventListener('click', this.handleArchivedListEvents.bind(this));
             } else {
                 console.warn("[App.js] setupEventListeners() - archivedListsContainer DOM element not found!"); // Keep warn
             }
            // ---------------------------------
            
            // console.log("[App.js] Event listeners setup complete."); // LOG REMOVED

            if (this.dom.copyItemsBtn) {
                this.dom.copyItemsBtn.addEventListener('click', this.openCopyItemsModal.bind(this));
            }
            
            // Add listener for source dropdown change *once* during setup
            if (this.dom.copySourceListSelect) {
                this.dom.copySourceListSelect.addEventListener('change', this.handleSourceListChangeInModal.bind(this)); // <-- Add this listener
            } else {
                console.warn("Copy source list select element not found during setup.");
            }
        } catch (error) {
             console.error("[App.js] Error setting up event listeners:", error); // Keep error
        }
    }

    // --- Data Handling ---
    loadData() {
        // console.log("[App.js Log] loadData() called. Attempting to load data..."); // REMOVED LOG
        // console.log("[App.js] loadData() called."); // LOG REMOVED
        this.showLoadingIndicator();

        // --- Firestore Path --- 
        // console.log(`[App.js] loadData - Checking this._firestore: ${this._firestore}`); // <-- RE-ADD THIS LOG
        if (this._firestore) {
            // console.log("[App.js] loadData() - Firestore detected. Proceeding with Firestore logic."); // LOG REMOVED
            
            // Timeout for hiding the indicator if Firestore takes too long
            this._loadingTimeout = setTimeout(() => {
                console.warn("[App.js] loadData() - Firestore loading timeout."); // Keep timeout warning
                this.hideLoadingIndicator();
            }, 10000); 
            
            const callbacks = {
                    onListsUpdate: ((lists) => {
                        // console.log("[App.js Log] loadData - onListsUpdate callback received. Raw lists data:", JSON.parse(JSON.stringify(lists))); // REMOVED LOG
                        // console.log("[App.js Log] loadData - onListsUpdate - Checking structure of first list (if exists):", lists.length > 0 ? Object.keys(lists[0]) : 'No lists'); // REMOVED LOG
                        this.appData.lists = lists; 
                        this.listsLoaded = true; // <<< SET FLAG

                        // --- Logic to handle active list --- 
                        // console.log(`[App.js] loadData() - onListsUpdate - Checking if list count (${this.appData.lists.length}) is zero.`); // LOG REMOVED
                        // REMOVED: createList call is moved to localStorage path below
                        if (this.appData.lists.length > 0) {
                             if (!this.activeListId || !this.appData.lists.some(l => l.id === this.activeListId)) {
                                 this.activeListId = this.appData.lists[0].id; // Default to first list if stored ID is invalid
                                 // localStorage.setItem('shoppingListLastActiveId', this.activeListId); // <<< REMOVED THIS LINE
                                 // console.log(`[App.js] loadData() - onListsUpdate - Setting active list ID to first available: ${this.activeListId}`); // LOG REMOVED
                    } else {
                                 // console.log(`[App.js] loadData() - onListsUpdate - Active list ID ${this.activeListId} is still valid.`); // LOG REMOVED
                             }
                             // console.log("[App.js] loadData() - onListsUpdate - Calling render() after receiving lists..."); // LOG REMOVED
                             this.render(); 
                        } else {
                             // If firestore returns zero lists, just render the empty state (don't auto-create)
                             console.warn("[App.js] loadData - onListsUpdate - Firestore returned zero lists. No default list created automatically."); // Keep this warn
                             this.render(); // Render empty state
                        }
                        // -------------------------------------
                        
                        // console.log("[App.js] loadData() - onListsUpdate - Calling hideLoadingIndicator()..."); // LOG REMOVED
                        this.hideLoadingIndicator(); 
                    }).bind(this),

                    onStoresUpdate: ((stores) => {
                        // console.log("[App.js] loadData() - onStoresUpdate callback received. Stores:", JSON.parse(JSON.stringify(stores))); // <-- ADD LOG
                        this.appData.masterStores = stores;
                        this.storesLoaded = true; // <<< SET FLAG
                    this.render(); // Call render after updating stores
                    // No need to hide indicator here, let the combined check in render handle it
                    }).bind(this),

                    onArchivedListsUpdate: ((archivedLists) => {
                        // console.log("[App.js] loadData() - onArchivedListsUpdate callback received."); // LOG REMOVED
                        this.appData.archivedLists = archivedLists;
                        // console.log("[App.js] loadData() - onArchivedListsUpdate - Calling renderArchivedLists()..."); // LOG REMOVED
                        this.renderArchivedLists();
                        // console.log("[App.js] loadData() - onArchivedListsUpdate - Calling hideLoadingIndicator()..."); // LOG REMOVED
                    this.hideLoadingIndicator();
                    }).bind(this)
                };
                
            // console.log("[App.js] loadData() - Subscribing to Firestore data..."); // LOG REMOVED
            try {
                this._firestoreUnsubscribe = window.firestoreFunctions.subscribeToAllData(callbacks);
                // console.log("[App.js] loadData() - Firestore subscription successful."); // LOG REMOVED
            } catch (error) {
                console.error("Error during Firestore subscription setup:", error); // Keep error
                console.error("Error details:", { 
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                    code: error.code
                });
                this.hideLoadingIndicator(); // Hide indicator on subscription error
                // Optionally, fall back to localStorage here? Or show error message? For now, just log.
            }
                
            // Initialize with empty data - callbacks will populate
            this.appData = {
                lists: [],
                archivedLists: [],
                masterStores: []
            };
                
            // Try to restore active list ID from localStorage immediately, callback might correct it
            const lastActiveId = localStorage.getItem('shoppingListLastActiveId');
            if (lastActiveId) {
                 this.activeListId = lastActiveId; 
                 // console.log(`Restored active list ID from localStorage: ${this.activeListId}`); // LOG REMOVED
            }
            // console.log(`[App.js] loadData() - Restored active list ID from localStorage (if found): ${this.activeListId}`); // LOG REMOVED
            
            // --- IMPORTANT: Stop synchronous execution here for Firestore path --- 
            return; 
            // --- The rest of the function is now the localStorage path --- 
        
        } else {
            // --- LocalStorage Path --- 
            // console.log("[App.js] loadData() - Firestore NOT detected, falling back to localStorage."); // LOG REMOVED
            this.hideLoadingIndicator(); // Hide indicator immediately if not using Firestore

            // console.log("[App.js] loadData() - Loading data from localStorage..."); // LOG REMOVED
            const savedData = localStorage.getItem('shoppingListAppData_v2');
            if (savedData) {
                // console.log("[App.js] loadData() - Found saved data in localStorage."); // LOG REMOVED
                try {
                    const parsedData = JSON.parse(savedData);
                    if (parsedData && Array.isArray(parsedData.lists) && Array.isArray(parsedData.archivedLists) && Array.isArray(parsedData.masterStores)) {
                        // console.log("[App.js] loadData() - Parsed localStorage data successfully."); // LOG REMOVED
                        this.appData = parsedData;
                    } else {
                        console.warn("[App.js] loadData() - Loaded data from localStorage has incorrect structure. Initializing default."); // Keep warn
                        this.initializeDefaultData();
                    }
                } catch (error) {
                    console.error("[App.js] loadData() - Error parsing localStorage data:", error); // Keep error
                    this.initializeDefaultData();
                }
            } else {
                // console.log("[App.js] loadData() - No saved data found in localStorage. Initializing default."); // LOG REMOVED
                this.initializeDefaultData();
            }

            // Set initial active list (localStorage path ONLY)
            // console.log("[App.js] loadData() - Setting initial active list (localStorage path)..."); // LOG REMOVED
            if (this.appData.lists.length > 0) {
                const lastActiveIdLocal = localStorage.getItem('shoppingListLastActiveId');
                if (lastActiveIdLocal && this.appData.lists.some(l => l.id === lastActiveIdLocal)) {
                    // console.log("[App.js] loadData() - Setting active list ID from localStorage:", lastActiveIdLocal); // LOG REMOVED
                    this.activeListId = lastActiveIdLocal;
                } else {
                    // console.log("[App.js] loadData() - Setting active list ID to the first list:", this.appData.lists[0].id); // LOG REMOVED
                    this.activeListId = this.appData.lists[0].id;
                    localStorage.setItem('shoppingListLastActiveId', this.activeListId); 
                }
            } else {
                // Create default list ONLY if NO lists exist after local storage load/init
                // console.log("[App.js] loadData() - No lists exist after localStorage load/init, creating a default list."); // LOG REMOVED
                this.createList("My First List"); 
            }
            // console.log("[App.js] loadData() - localStorage loading complete."); // LOG REMOVED
            
            // Render immediately after loading from localStorage
            this.render(); 
        }
        
        // console.log("[App.js] loadData() finished."); // LOG REMOVED (Now part of specific paths)
    }
    
    // Helper method to show the loading indicator
    showLoadingIndicator() {
        // console.log("[App.js] showLoadingIndicator() called."); // LOG REMOVED
        if (this.dom.firebaseLoading) {
            this.dom.firebaseLoading.classList.remove('hidden');
        }
    }

    // Helper method to hide the loading indicator
    hideLoadingIndicator() {
        // console.log("[App.js] hideLoadingIndicator() called."); // LOG REMOVED
        if (this.dom.firebaseLoading) {
            this.dom.firebaseLoading.classList.add('hidden');
            
            if (this._loadingTimeout) {
                clearTimeout(this._loadingTimeout);
                this._loadingTimeout = null;
            }
        }
    }
    
    // Toggle section collapse/expand
    toggleSection(sectionName) {
        // console.log(`Toggling section: ${sectionName}`);
        
        try {
            // Define mapping of section names to their DOM elements
            const sections = {
                itemManagement: {
                    content: this.dom.itemManagementContent,
                    button: this.dom.toggleItemManagement,
                    showText: 'Mostrar ▲',
                    hideText: 'Ocultar ▼'
                },
                shoppingList: {
                    content: this.dom.shoppingListContent,
                    button: this.dom.toggleShoppingList,
                    showText: 'Mostrar ▲',
                    hideText: 'Ocultar ▼'
                }
            };
            
            // Check if the requested section exists in our mapping
            if (!sections[sectionName]) {
                console.error(`Unknown section: ${sectionName}`);
            return;
        }

            const section = sections[sectionName];
            
            // Validate that the required DOM elements exist
            if (!section.content || !section.button) {
                console.error(`Missing DOM elements for section ${sectionName}:`, {
                    content: !!section.content,
                    button: !!section.button
                });
                return;
            }
            
            // Toggle the collapsed state
            section.content.classList.toggle('collapsed');
            section.button.classList.toggle('collapsed');
            
            // Update button text based on state
            if (section.content.classList.contains('collapsed')) {
                section.button.textContent = section.showText;
            } else {
                section.button.textContent = section.hideText;
            }
            
            // console.log(`Section ${sectionName} toggled successfully. Collapsed: ${section.content.classList.contains('collapsed')}`);
        } catch (error) {
            console.error(`Error toggling section ${sectionName}:`, error); // Keep this error?
        }
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
        console.log("[App.js Log] saveData() called. Current appData:", JSON.parse(JSON.stringify(this.appData))); // Added Deep Copy Log
        
        const activeList = this.getActiveList();
        if (!activeList) {
            console.warn("[App.js] saveData - No active list found, attempting to save full appData (localStorage path only).");
            // Fallback to saving everything to localStorage if no specific list is active (or if Firestore isn't used)
            if (!this._firestore) {
                try {
                    localStorage.setItem('shoppingListAppData_v2', JSON.stringify(this.appData));
                } catch (error) {
                    console.error("Error saving full appData to localStorage:", error);
                }
            }
            return; // Don't attempt Firestore update without an active list
        }
        
        // --- Save specific active list data --- 
        const listDataToSave = {
            shoppingList: activeList.shoppingList || [] // Ensure we always save an array
            // Potentially add other list-specific fields here if needed, e.g., list.name
        };

        // --- Firestore Path --- 
        if (this._firestore && window.firestoreFunctions?.updateList) {
            console.log(`[App.js] saveData - Using Firestore to update list ${this.activeListId}`);
            window.firestoreFunctions.updateList(this.activeListId, listDataToSave)
                .then(() => {
                    console.log(`[App.js] saveData - List ${this.activeListId} updated in Firestore successfully.`);
                })
                .catch(error => {
                    console.error(`[App.js] saveData - Error updating list ${this.activeListId} in Firestore:`, error);
                    // Optionally notify user or implement a retry?
                });
        } 
        // --- LocalStorage Path (still save locally as a backup or if Firestore is off) --- 
        else {
            console.log("[App.js] saveData - Firestore not available or updateList missing. Saving full data to localStorage.");
             try {
                 localStorage.setItem('shoppingListAppData_v2', JSON.stringify(this.appData)); // Save the whole state
                 if(this.activeListId) {
                    localStorage.setItem('shoppingListLastActiveId', this.activeListId); // Save last active ID
                 }
            } catch (error) {
                console.error("Error saving data to localStorage:", error);
                alert("There was an error saving your data locally.");
            }
        }
        
        // Also save the last active list ID to localStorage regardless of Firestore use
        if(this.activeListId) {
            localStorage.setItem('shoppingListLastActiveId', this.activeListId);
        }
    }

    // Ensure a list has all required properties
    sanitizeListData(list) {
        if (!list) return null;
        
        // Make sure the list has a shoppingList array
        if (!list.shoppingList) {
            list.shoppingList = [];
        }
        
        // Ensure the shoppingList is an array
        if (!Array.isArray(list.shoppingList)) {
            // console.warn(`DEBUG - shoppingList is not an array for list ${list.id}, fixing`);
            list.shoppingList = [];
        }
        
        return list;
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    }

    getActiveList() {
        const activeList = this.appData.lists.find(list => list.id === this.activeListId);
        
        // Sanitize the list data to ensure it has all required properties
        const sanitizedList = this.sanitizeListData(activeList);
        
        return sanitizedList;
    }

    findMasterItem(storeId, categoryId, itemId) {
        const category = this.findMasterCategory(storeId, categoryId);
        return category ? category.items.find(i => i.id === itemId) : null;
    }

    // --- Rendering ---
    render() {
        // console.log("Rendering UI...");
        
        // --- WAIT FOR INITIAL LOAD --- 
        if (!this.storesLoaded || !this.listsLoaded) {
            // console.log(`[App.js Log] Render called, but waiting for initial data. Stores: ${this.storesLoaded}, Lists: ${this.listsLoaded}`); // REMOVED LOG
            return; // Don't render until both initial loads are complete
        }
        // -----------------------------
        
        // console.log("[App.js Log] Render proceeding - initial data loaded."); // REMOVED LOG
        this.hideLoadingIndicator(); // Hide indicator once both are loaded and we render
        
        this.renderListSelect();
        this.renderMasterStores();
        this.renderShoppingList();
        this.renderArchivedLists(); // Keep panel content up-to-date
        // console.log("UI Render complete.");
    }

    renderListSelect() {
        this.dom.activeListSelect.innerHTML = '';
        // console.log(`[App.js Log] renderListSelect called. Current activeListId: ${this.activeListId}`); // REMOVED LOG
        if (this.appData.lists.length === 0) {
            // Handle case with no active lists
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
                // console.log(`[App.js Log] renderListSelect - List: '${list.name}' (ID: ${list.id}), Comparing with active ID: ${this.activeListId}, Setting selected: ${option.selected}`); // REMOVED LOG
                this.dom.activeListSelect.appendChild(option);
            });
            this.dom.archiveListBtn.disabled = this.appData.lists.length <= 1; // Can't archive last list
        }
    }

    renderMasterStores() {
        // console.log("[App.js] renderMasterStores() called."); // LOG REMOVED
        // --- ADDED DEBUG LOG ---
        // console.log(`[SYNC DEBUG] renderMasterStores: Called. Current activeListId = ${this.activeListId}`); // REMOVED
        // -----------------------

        if (!this.dom.storeContainers || !this.templates.store || !this.templates.category || !this.templates.item || !this.dom.filterStoreSelect || !this.dom.sortTypeSelect || !this.dom.searchMasterItemsInput) {
            console.error("[App.js] renderMasterStores - Missing DOM elements or templates:", { // Keep error
                storeContainers: !!this.dom.storeContainers,
                storeTemplate: !!this.templates.store,
                categoryTemplate: !!this.templates.category,
                itemTemplate: !!this.templates.item,
                filterStoreSelect: !!this.dom.filterStoreSelect,
                sortTypeSelect: !!this.dom.sortTypeSelect,
                searchMasterItemsInput: !!this.dom.searchMasterItemsInput
            }); 
            return;
        }
        // console.log("[App.js] renderMasterStores - All required DOM elements found."); // LOG REMOVED
        // console.log("[App.js] renderMasterStores - Current masterStores data:", JSON.parse(JSON.stringify(this.appData.masterStores))); // LOG REMOVED

        // --- Get Filter, Sort, Search Values ---
        const selectedStoreId = this.dom.filterStoreSelect.value;
        const sortType = this.dom.sortTypeSelect.value;
        const searchTerm = this.dom.searchMasterItemsInput.value.trim().toLowerCase();

        this.dom.storeContainers.innerHTML = ''; // Clear display area

        // --- Filter and Sort Data ---
        let storesToProcess = [...this.appData.masterStores];

        // Apply Store Dropdown Filter
        if (selectedStoreId !== 'all') {
            storesToProcess = storesToProcess.filter(store => store.id === selectedStoreId);
        }

        // Apply Search Filter (Build a new structure with only matching items/categories/stores)
        let filteredStores = [];
        if (searchTerm) {
            storesToProcess.forEach(store => {
                const storeNameLower = store.name.toLowerCase();
                const storeMatches = storeNameLower.includes(searchTerm);
                let matchingCategories = [];

                if (store.categories) {
                    store.categories.forEach(category => {
                        const categoryNameLower = category.name.toLowerCase();
                        const categoryMatches = categoryNameLower.includes(searchTerm);
                        let matchingItems = [];

                        if (category.items) {
                            category.items.forEach(item => {
                                const itemNameLower = item.name.toLowerCase();
                                if (itemNameLower.includes(searchTerm)) {
                                    matchingItems.push({...item}); // Add item if it matches
                                }
                            });
                        }

                        // Include category if its name matches OR it has items that match
                        if (categoryMatches || matchingItems.length > 0) {
                            // If category name matched search, include all its items regardless of item search match
                            const itemsToInclude = categoryMatches ? [...(category.items || [])].map(item => ({...item})) : matchingItems;
                            matchingCategories.push({ ...category, items: itemsToInclude });
                        }
                    });
                }

                // Include store if its name matches OR it has categories that match
                if (storeMatches || matchingCategories.length > 0) {
                     // If store name matched search, include all its categories & items (deep copy needed)
                     const categoriesToInclude = storeMatches 
                        ? [...(store.categories || [])].map(cat => ({...cat, items: [...(cat.items || [])].map(item => ({...item}))})) 
                        : matchingCategories;
                     filteredStores.push({ ...store, categories: categoriesToInclude });
                }
            });
        } else {
            // No search term, use the dropdown-filtered list
            filteredStores = storesToProcess.map(store => ({ 
                ...store, 
                categories: [...(store.categories || [])].map(cat => ({...cat, items: [...(cat.items || [])].map(item => ({...item}))}))
            }));
        }

        // --- Apply Sorting ---
        let isManualSort = true;
        if (sortType === 'alphabetical') {
            filteredStores.sort((a, b) => a.name.localeCompare(b.name));
            isManualSort = false;
        } else {
            // Manual order is the current order
        }

        // --- Render Filtered and Sorted Data ---
        if (filteredStores.length === 0 && (selectedStoreId !== 'all' || searchTerm)) {
            const noResultsMsg = document.createElement('p');
            noResultsMsg.textContent = "No hay tiendas o artículos que coincidan con los filtros/búsqueda.";
            noResultsMsg.className = 'empty-state';
            this.dom.storeContainers.appendChild(noResultsMsg);
        } else {
            filteredStores.forEach(store => {
                const storeTemplate = this.templates.store.content.cloneNode(true);
                const storeContainer = storeTemplate.querySelector('.store-container');
                storeContainer.dataset.storeId = store.id;
                const storeNameElement = storeContainer.querySelector('.store-name');
                if (storeNameElement) storeNameElement.textContent = store.name;
            const categoriesWrapper = storeContainer.querySelector('.categories-wrapper');

                if (categoriesWrapper && store.categories && store.categories.length > 0) {
                    let categoriesToRender = [...store.categories];
                    if (!isManualSort) { // Sort categories alphabetically if stores are sorted
                        categoriesToRender.sort((a, b) => a.name.localeCompare(b.name));
                    }

                    categoriesToRender.forEach((category, categoryIndex) => {
                        const categoryTemplate = this.templates.category.content.cloneNode(true);
                        const categoryContainer = categoryTemplate.querySelector('.category-container');
                        categoryContainer.dataset.categoryId = category.id;
                        categoryContainer.dataset.storeId = store.id;
                        categoryContainer.style.borderLeftColor = '#3498db'; // USE PRIMARY BLUE COLOR DIRECTLY
                        const categoryNameElement = categoryContainer.querySelector('.category-name');
                        if (categoryNameElement) categoryNameElement.textContent = category.name;
                        const itemListElement = categoryContainer.querySelector('.item-list');

                        if (itemListElement && category.items && category.items.length > 0) {
                            let itemsToRender = [...category.items];
                            if (!isManualSort) { // Sort items alphabetically if stores are sorted
                                itemsToRender.sort((a, b) => a.name.localeCompare(b.name));
                            }

                            const activeList = this.getActiveList();
                            // const shoppingListItemIds = new Set(activeList?.shoppingList?.map(item => item.id) || []); // OLD check used unique ID
                            const shoppingListItemMasterIds = new Set(activeList?.shoppingList?.map(slItem => slItem.itemId) || []); // NEW check uses master item ID
                            // --- ADDED DEBUG LOG ---
                            // console.log(`[SYNC DEBUG] renderMasterStores: Rendering category '${category.name}'. Active List: ${activeList?.name || 'None'}. Items on active list (master IDs):`, shoppingListItemMasterIds); // REMOVED
                            // -----------------------

                            itemsToRender.forEach(item => {
                                    const itemTemplate = this.templates.item.content.cloneNode(true);
                                    const itemElement = itemTemplate.querySelector('.item');
                                itemElement.dataset.itemId = item.id;
                                itemElement.dataset.categoryId = category.id;
                                itemElement.dataset.storeId = store.id;
                                    const itemNameElement = itemElement.querySelector('.item-name');
                                if (itemNameElement) itemNameElement.textContent = item.name;

                                 // Add/Remove button state
                                    const addRemoveButton = itemElement.querySelector('.add-to-shopping-list-btn');
                                    if(addRemoveButton) {
                                    addRemoveButton.dataset.itemId = item.id;
                                        // if (shoppingListItemIds.has(item.id)) { // OLD check
                                        if (shoppingListItemMasterIds.has(item.id)) { // NEW check uses the correct set
                                        addRemoveButton.textContent = '✓';
                                            addRemoveButton.title = 'Quitar de Lista';
                                        itemElement.classList.add('in-list');
                                        } else {
                                            addRemoveButton.textContent = '+';
                                            addRemoveButton.title = 'Añadir a Lista';
                                             itemElement.classList.remove('in-list');
                                        }
                                    }
                                    
                                // Action buttons
                                    const editButton = itemElement.querySelector('.edit-item-btn');
                                    if(editButton) editButton.dataset.itemId = item.id;
                                    const deleteButton = itemElement.querySelector('.delete-item-btn');
                                    if(deleteButton) deleteButton.dataset.itemId = item.id;
                                const duplicateButton = itemElement.querySelector('.duplicate-item-btn');
                                if(duplicateButton) duplicateButton.dataset.itemId = item.id;

                                    itemListElement.appendChild(itemElement);
                                });
                            } else {
                            // Category has no items (might happen if search matched category name but not items)
                             const noItemsMsg = document.createElement('p');
                             noItemsMsg.textContent = "No hay artículos en esta categoría.";
                             noItemsMsg.classList.add('empty-state-text');
                             itemListElement.appendChild(noItemsMsg);
                        }
                        categoriesWrapper.appendChild(categoryContainer);
                    });
                } else {
                     // Store has no categories
                     const noCategoriesMsg = document.createElement('p');
                     noCategoriesMsg.textContent = "No hay categorías en esta tienda.";
                     noCategoriesMsg.classList.add('empty-state-text');
                     categoriesWrapper.appendChild(noCategoriesMsg);
                }
            this.dom.storeContainers.appendChild(storeContainer);
        });
        }

        // --- Populate Filter Dropdown --- 
        // console.log("[App.js] renderMasterStores - Calling populateStoreFilterDropdown..."); // LOG REMOVED
        this.populateStoreFilterDropdown(selectedStoreId);
    }

    renderShoppingList() {
        // console.log(`[App.js] renderShoppingList called. Active List ID: ${this.activeListId}`); // REMOVED LOG
        if (!this.dom.shoppingListItemsContainer) {
            console.error("[App.js] Cannot render shopping list: shoppingListItemsContainer element not found.");
            return;
        }
        
        // Clear existing items
        this.dom.shoppingListItemsContainer.innerHTML = '';
        
        if (!this.activeListId) {
            console.log("[App.js] renderShoppingList - No active list selected, clearing display."); // ADDED LOG
            this.dom.shoppingListItemsContainer.textContent = 'Select a list to view items.';
            this.updateActiveListNameDisplay(); // Clear name display as well
            return;
        }
        
        const activeList = this.getActiveList();
        // console.log("[App.js Log] renderShoppingList - Result of getActiveList():", activeList ? JSON.parse(JSON.stringify(activeList)) : 'null'); // REMOVED LOG
        if (!activeList) {
            console.error(`[App.js] renderShoppingList - Could not find active list data for ID: ${this.activeListId}`); // Keep this error
            this.dom.shoppingListItemsContainer.textContent = 'Error: Could not load list data.';
            this.updateActiveListNameDisplay('Error');
            return;
        }
        
        this.updateActiveListNameDisplay(); // Update the name display with the correct list name
        
        // console.log(`[App.js] renderShoppingList - Active list found:`, JSON.stringify(activeList, null, 2)); // LOG REMOVED
        
        // --- Check for items (using the CORRECT key 'shoppingList') --- 
        if (!activeList.shoppingList || activeList.shoppingList.length === 0) { 
             // console.log(`[App.js] renderShoppingList - Active list '${activeList.name}' has no items (checked activeList.shoppingList).`); // REMOVED LOG
             // --- REMOVED Redundant Check for shoppingList --- 
            this.dom.shoppingListItemsContainer.textContent = 'This list is empty. Add items from the management panel.';
            return; // Nothing more to render
        } else {
            // console.log(`[App.js] renderShoppingList - Active list '${activeList.name}' has ${activeList.shoppingList.length} items (checked activeList.shoppingList). Rendering...`); // REMOVED LOG
        }

        // Group items by store and category for rendering
        const groupedItems = this.groupShoppingListItems(activeList.shoppingList); // USE CORRECT KEY

        // --- Render grouped items --- 
        Object.keys(groupedItems).forEach(storeId => {
            const storeGroup = groupedItems[storeId];

            const storeTemplate = this.templates.shoppingListStore.content.cloneNode(true);
            const storeGroupElement = storeTemplate.querySelector('.shopping-list-store-group');
            const storeNameElement = storeGroupElement.querySelector('.store-name');
            if (storeNameElement) storeNameElement.textContent = storeGroup.storeName;
            
            const categoriesWrapper = storeGroupElement.querySelector('.shopping-list-categories-wrapper');
            if (!categoriesWrapper) {
                console.error("Missing .shopping-list-categories-wrapper in shopping list store template"); // Keep error
                return;
            }

            Object.keys(storeGroup.categories).forEach(categoryId => {
                const categoryGroup = storeGroup.categories[categoryId];

                const categoryTemplate = this.templates.shoppingListCategory.content.cloneNode(true);
                const categoryGroupElement = categoryTemplate.querySelector('.shopping-list-category-group');
                // console.log(`[DIAGNOSTIC] Shopping list category element for ${categoryGroup.categoryName} (ID: ${categoryId}) created. Initial borderLeftColor style: ${categoryGroupElement.style.borderLeftColor}`); // REMOVE LOG
                const categoryNameElement = categoryGroupElement.querySelector('.category-name');
                if (categoryNameElement) categoryNameElement.textContent = categoryGroup.categoryName;
                
                const itemListElement = categoryGroupElement.querySelector('.shopping-list-item-list');
                 if (!itemListElement) {
                    console.error("Missing .shopping-list-item-list in shopping list category template");
                    return;
                }

                categoryGroup.items.forEach(item => {
                    const itemTemplate = this.templates.shoppingListItem.content.cloneNode(true);
                    const itemElement = itemTemplate.querySelector('.shopping-list-item');
                    const itemNameElement = itemElement.querySelector('.item-name');
                    const itemCheckbox = itemElement.querySelector('.item-checkbox');
                    const itemLabel = itemElement.querySelector('.item-label'); // Assuming label wraps checkbox + name

                    // itemElement.dataset.itemId = item.id; // For event handling - CHANGED (Was using master ID)
                    itemElement.dataset.shoppingListItemId = item.id; // Store the UNIQUE shopping list item ID
                    itemElement.dataset.itemId = item.itemId; // Store the master item ID (might be useful elsewhere)
                    itemElement.dataset.storeId = item.storeId; // Use item's storeId
                    itemElement.dataset.categoryId = item.categoryId; // Use item's categoryId

                    if (itemNameElement) itemNameElement.textContent = item.name;
                    if (itemCheckbox) {
                        itemCheckbox.checked = item.checked || false; // Handle checked state
                        // itemCheckbox.id = `shopping-item-${item.id}`; // Unique ID for label association - CHANGED (Was using master ID)
                        itemCheckbox.id = `shopping-item-${item.id}`; // Use UNIQUE shopping list item ID
                        
                        // Apply/Remove visual styles based on checked state
                        if (itemCheckbox.checked) {
                            itemElement.classList.add('checked');
                            itemLabel?.classList.add('line-through', 'text-gray-500'); // Style label directly
                        } else {
                            itemElement.classList.remove('checked');
                            itemLabel?.classList.remove('line-through', 'text-gray-500'); // Ensure style is removed
                        }
                    }
                     if (itemLabel) {
                        // itemLabel.setAttribute('for', `shopping-item-${item.id}`); // Associate label with checkbox - CHANGED (Was using master ID)
                        itemLabel.setAttribute('for', `shopping-item-${item.id}`); // Use UNIQUE shopping list item ID
                    }
                    
                    // Add data-attributes to buttons for delegation
                    const removeButton = itemElement.querySelector('.remove-from-list-btn');
                    // if(removeButton) removeButton.dataset.itemId = item.id; // CHANGED (Was using master ID)
                    if(removeButton) removeButton.dataset.shoppingListItemId = item.id; // Use UNIQUE shopping list item ID

                    itemListElement.appendChild(itemElement);
                });

                categoriesWrapper.appendChild(categoryGroupElement);
            });

            this.dom.shoppingListItemsContainer.appendChild(storeGroupElement);
        });
    }

    renderArchivedLists() {
        if (!this.dom.archivedListsContainer || !this.templates.archivedList) {
            console.error("Missing DOM element or template for archived list rendering.");
            return;
        }
        
        this.dom.archivedListsContainer.innerHTML = ''; // Clear existing archived lists

        const archivedLists = this.appData.archivedLists || [];

        if (archivedLists.length === 0) {
            this.dom.archivedListsContainer.textContent = "No hay listas archivadas.";
            return;
        }

        // Sort archived lists by date (newest first) if archivedAt exists
        archivedLists.sort((a, b) => {
            const dateA = a.archivedAt ? new Date(a.archivedAt.seconds * 1000) : 0;
            const dateB = b.archivedAt ? new Date(b.archivedAt.seconds * 1000) : 0;
            return dateB - dateA;
        });

        archivedLists.forEach(list => {
            const listTemplate = this.templates.archivedList.content.cloneNode(true);
            const listItemElement = listTemplate.querySelector('.archived-list-item');
            const listNameElement = listItemElement.querySelector('.list-name');
            const listDateElement = listItemElement.querySelector('.list-date');
            
            listItemElement.dataset.listId = list.id; // For event handling

            if (listNameElement) {
                listNameElement.textContent = list.name || "Unnamed Archived List";
            } else {
                console.warn("Could not find .list-name element in archived list template.");
            }

            if (listDateElement) {
                let formattedDate = "Date unknown";
                try {
                    // Check if archivedAt is a Firestore Timestamp
                    if (list.archivedAt && typeof list.archivedAt.toDate === 'function') {
                         formattedDate = list.archivedAt.toDate().toLocaleDateString();
                    } else if (list.archivedAt) {
                        // Attempt to parse if it's a string or number
                        formattedDate = new Date(list.archivedAt).toLocaleDateString();
                    }
                 } catch (e) {
                    console.error("Error formatting archived date:", e);
                 }    
                listDateElement.textContent = `Archived: ${formattedDate}`;
            } else {
                console.warn("Could not find .list-date element in archived list template.");
            }
            
             // Add data-attributes to buttons for delegation
            const restoreButton = listItemElement.querySelector('.restore-list-btn');
            if(restoreButton) restoreButton.dataset.listId = list.id;
            const deleteButton = listItemElement.querySelector('.delete-archived-list-btn');
            if(deleteButton) deleteButton.dataset.listId = list.id;

            this.dom.archivedListsContainer.appendChild(listItemElement);
        });
    }
    
    createList(name) {
        // console.log(`[App.js] createList() called with name: "${name}"`); // LOG REMOVED
        
        // Create a new list in local memory first
        const newList = {
            id: this.generateId(),
            name: name,
            createdAt: new Date().toISOString(),
            shoppingList: []
        };
        
        // Add to our data
        this.appData.lists.push(newList);
        this.activeListId = newList.id;
        localStorage.setItem('shoppingListLastActiveId', this.activeListId);
        
        // Try to save to Firestore if available
        if (window.firestoreFunctions) {
            window.firestoreFunctions.createList(name)
                .then(serverList => {
                    // The list will be updated via subscription
                })
                .catch(error => {
                    console.error("Error creating list in Firestore:", error);
                    console.error("Error details:", {
                        name: error.name,
                        message: error.message,
                        stack: error.stack,
                        code: error.code
                    });
                });
        } else {
            console.log("Firestore not available, skipping cloud save");
        }
        
        // Render UI updates
        this.render();
        return newList;
    }
    
    // Stub methods for potentially missing handlers
    handleListChange() {
        const selectedListId = this.dom.activeListSelect.value;
        // console.log(`[App.js] handleListChange triggered. Selected List ID: ${selectedListId}`); // REMOVED LOG
        // --- ADDED DEBUG LOG ---
        // console.log(`[SYNC DEBUG] handleListChange: Selected List ID = ${selectedListId}`); // REMOVED
        // -----------------------

        if (selectedListId) {
            this.activeListId = selectedListId;
            // console.log(`[App.js Log] handleListChange - About to save to localStorage. ID: ${this.activeListId}, Name: ${this.dom.activeListSelect.options[this.dom.activeListSelect.selectedIndex]?.text}`); // REMOVED LOG
            localStorage.setItem('shoppingListLastActiveId', this.activeListId);
            // console.log(`[App.js] handleListChange - Set activeListId to: ${this.activeListId}`); // REMOVED LOG
            // --- ADDED DEBUG LOG ---
            // console.log(`[SYNC DEBUG] handleListChange: Calling renderShoppingList for activeListId = ${this.activeListId}`); // REMOVED
            // -----------------------
            this.renderShoppingList(); // Re-render the shopping list with the new active list
            this.updateActiveListNameDisplay(); // Update the name display
            this.toggleArchiveButtonState(); // Update archive button based on whether a list is selected
            // --- ADDED DEBUG LOG ---
            // Let's explicitly call renderMasterStores here FOR TESTING to see if it fixes the button states.
            // This might not be the final solution, but helps diagnose.
            // console.log(`[SYNC DEBUG] handleListChange: Explicitly calling renderMasterStores FOR TESTING`); // REMOVED
            this.renderMasterStores();
            // -----------------------
        } else {
            // console.warn("[App.js] handleListChange - No list selected (value is empty). Clearing display."); // Keep this warn
             // --- ADDED DEBUG LOG ---
            // console.log(`[SYNC DEBUG] handleListChange: No list selected.`); // REMOVED
             // -----------------------
            this.activeListId = null;
            this.renderShoppingList(); // Clear the list display
            this.updateActiveListNameDisplay();
            this.toggleArchiveButtonState();
             // --- ADDED DEBUG LOG ---
            // Also re-render master stores when no list is selected (for testing)
            // console.log(`[SYNC DEBUG] handleListChange: Explicitly calling renderMasterStores FOR TESTING (no list selected)`); // REMOVED
            this.renderMasterStores();
             // -----------------------
        }
        // No need to explicitly save data on list change, only when items are modified
    }
    
    // --- ADDED METHOD ---
    updateActiveListNameDisplay(overrideText = null) {
        if (!this.dom.activeListNameDisplay) {
            // console.warn("[App.js] updateActiveListNameDisplay - DOM element 'active-list-name-display' not found."); // Optional log
            return; 
        }

        if (overrideText !== null) {
            this.dom.activeListNameDisplay.textContent = overrideText;
            return;
        }

        const activeList = this.getActiveList();
        if (activeList) {
            this.dom.activeListNameDisplay.textContent = activeList.name || "Unnamed List";
        } else {
            this.dom.activeListNameDisplay.textContent = "No List Selected";
        }
    }
    // --------------------
    
    // --- Modal Handling ---
    openModal(modalName) {
        // console.log(`[App.js] openModal called for: ${modalName}`); // LOG REMOVED
        const modalElement = this.dom.modals[modalName];
        
        if (!modalElement) {
            console.error(`[App.js] openModal - Modal element not found for: ${modalName}`); // Keep error
                         return;
                    }
        // console.log(`[App.js] openModal - Found modal element for ${modalName}:`, modalElement); // LOG REMOVED
        
        // Clear common input types before opening
        const inputs = modalElement.querySelectorAll('input[type="text"], input[type="number"], textarea');
        inputs.forEach(input => input.value = '');
        const selects = modalElement.querySelectorAll('select');
        selects.forEach(select => select.selectedIndex = 0);
        
        // Fix: Use 'show' class instead of 'active' to match the CSS
        modalElement.classList.add('show');
        modalElement.style.display = 'flex'; // Match the 'display: flex' in the CSS
        
        // Optionally focus the first input field
        const firstInput = modalElement.querySelector('input, select, textarea');
        if (firstInput) {
            firstInput.focus();
        }
    }
    
    closeModal(modalName) {
        const modalElement = this.dom.modals[modalName];
        
        if (!modalElement) {
            console.error(`Modal element not found for: ${modalName}`);
            return;
        }
        
        // Clear common input types before closing (optional, but good practice)
        const inputs = modalElement.querySelectorAll('input[type="text"], input[type="number"], textarea');
        inputs.forEach(input => input.value = '');
        const selects = modalElement.querySelectorAll('select');
        selects.forEach(select => select.selectedIndex = 0);
        
        // Clear context
        this.currentModalContext = null;

        // Fix: Use 'show' class instead of 'active' to match the CSS
        modalElement.classList.remove('show');
        modalElement.style.display = 'none';
    }
    
    archiveActiveList() {
        if (this.appData.lists.length <= 1) {
            alert("You cannot archive the last active list.");
            console.warn("Attempted to archive the last list.");
            return;
        }

        const listId = this.activeListId;
        if (!listId) {
            alert("No active list selected to archive.");
            console.error("archiveActiveList called with no activeListId.");
            return;
        }

        const listToArchive = this.appData.lists.find(l => l.id === listId);
        if (!listToArchive) {
             alert("Error: Could not find the active list data.");
             console.error(`List data not found for ID: ${listId} during archive.`);
             return;
        }
        
        // Optimistic UI Update (Remove from active lists immediately)
        const listIndex = this.appData.lists.findIndex(l => l.id === listId);
        if (listIndex > -1) {
            this.appData.lists.splice(listIndex, 1);
        }
        
        // Select the next available list as active
        this.activeListId = this.appData.lists.length > 0 ? this.appData.lists[0].id : null;
        localStorage.setItem('shoppingListLastActiveId', this.activeListId);
        
        // Re-render the list select immediately
        this.renderListSelect(); 
        this.renderShoppingList(); // Update the shopping list display
        
        // Call Firestore function
        if (window.firestoreFunctions && window.firestoreFunctions.archiveList) {
            window.firestoreFunctions.archiveList(listId)
                .then(() => {
                    // Firestore listener should update appData.archivedLists and trigger renderArchivedLists
                })
                .catch(error => {
                    console.error(`Error archiving list ${listId} in Firestore:`, error);
                    alert(`Failed to archive the list in the cloud. Error: ${error.message}`);
                    // Revert Optimistic Update (Put the list back)
                    if (listIndex > -1) {
                        this.appData.lists.splice(listIndex, 0, listToArchive); // Add back at original index
                        this.activeListId = listId; // Restore active ID
                        localStorage.setItem('shoppingListLastActiveId', this.activeListId);
                        this.render(); // Re-render everything to be safe
                    }
                });
                    } else {
            console.warn("Firestore function archiveList not available. Archiving locally only.");
             // If only local, add to archivedLists now and save
             const archivedData = { ...listToArchive, archivedAt: new Date() };
             this.appData.archivedLists = this.appData.archivedLists || [];
             this.appData.archivedLists.push(archivedData);
             if (!window.db) { this.saveData(); }
             this.renderArchivedLists(); // Update archive panel view
        }
    }
    
    showArchivedPanel() {
        if (this.dom.archivedListsPanel) {
            this.dom.archivedListsPanel.classList.add('show');
            this.renderArchivedLists(); // Ensure content is up-to-date when shown
        } else {
            console.error("Archived lists panel element not found.");
        }
    }
    
    hideArchivedPanel() {
        if (this.dom.archivedListsPanel) {
            this.dom.archivedListsPanel.classList.remove('show');
        } else {
            console.error("Archived lists panel element not found.");
        }
    }
    
    exportData() {
        try {
            // Create a comprehensive export object
            const exportObject = {
                version: 2, // Increment if data structure changes significantly
                exportedAt: new Date().toISOString(),
                appData: this.appData // Export all current app data
            };
            
            const dataStr = JSON.stringify(exportObject, null, 2); // Pretty print JSON
            const dataBlob = new Blob([dataStr], {type: "application/json"});
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            // Create filename with date
            const date = new Date();
            const filename = `shopping_list_export_${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}.json`;
            link.download = filename;
            
            // Simulate click to trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Revoke the object URL to free up memory
            URL.revokeObjectURL(url);
            
            alert("Datos exportados exitosamente como " + filename);
            
        } catch (error) {
            console.error("Error exporting data:", error);
            alert("Error al exportar datos. Ver la consola para más detalles.");
        }
    }
    
    importData(event) {
        const fileInput = event ? event.target : this.dom.importFileInput;
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            console.warn("Import called but no file selected.");
                                return;
                             }

        const file = fileInput.files[0];

        if (file.type !== 'application/json') {
            alert("Por favor, selecciona un archivo JSON válido exportado desde esta aplicación.");
            fileInput.value = ''; // Reset input
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const fileContent = e.target.result;
                const importedObject = JSON.parse(fileContent);

                // --- Data Validation ---
                if (!importedObject || typeof importedObject !== 'object') {
                    throw new Error("El archivo importado no es un objeto JSON válido.");
                }
                
                // Check for version and top-level appData
                if (!importedObject.appData || !importedObject.version) {
                     throw new Error("El formato del archivo importado no es válido (falta 'version' o 'appData').");
                }
                
                // Basic structure validation of appData
                const dataToImport = importedObject.appData;
                if (!dataToImport || 
                    !Array.isArray(dataToImport.lists) || 
                    !Array.isArray(dataToImport.archivedLists) || 
                    !Array.isArray(dataToImport.masterStores)) {
                    throw new Error("La estructura de 'appData' en el archivo importado no es válida.");
                }
                
                console.log(`Imported data version: ${importedObject.version}. Current app expects version 2.`);
                // TODO: Add migration logic if versions differ significantly in the future

                // --- Confirmation --- 
                if (!confirm("¿Estás seguro de que quieres importar estos datos? Esto SOBRESCRIBIRÁ todos tus datos actuales (listas, tiendas, artículos).")) {
                    console.log("Import cancelled by user.");
                    fileInput.value = ''; // Reset input
                    return;
                }
                
                console.log("User confirmed import. Overwriting current data...");
                
                // --- Overwrite Data --- 
                this.appData = dataToImport;
                
                // Reset active list ID based on imported data
                if (this.appData.lists.length > 0) {
                    this.activeListId = this.appData.lists[0].id; 
                            } else {
                    this.activeListId = null;
                }
                localStorage.setItem('shoppingListLastActiveId', this.activeListId);
                
                console.log("Local appData overwritten. Saving and re-rendering...");

                // --- Persist & Render ---
                 if (window.firestoreFunctions) {
                    // Firestore Sync: More complex. Simplest is often delete all existing then add all imported.
                    // This requires dedicated Firestore functions.
                    // For now, we'll just update local data and localStorage.
                    console.warn("Firestore detected. Import function currently only updates local data and localStorage. Cloud data may be out of sync. Implement Firestore sync for full import.");
                     if (!window.db) { this.saveData(); } // Save to localStorage as backup
                     alert("Datos importados localmente. Es posible que los datos en la nube no estén sincronizados.");
                 } else {
                    // Save to localStorage if that's the primary source
                    this.saveData(); 
                    alert("¡Datos importados y guardados localmente con éxito!");
                 }

                this.render(); // Re-render the entire UI with imported data
                console.log("Import process complete.");

            } catch (error) {
                console.error("Error processing imported file:", error);
                alert(`Error al importar el archivo: ${error.message}`);
            } finally {
                 // Reset file input regardless of success/failure
                fileInput.value = '';
            }
        };

        reader.onerror = (e) => {
            console.error("Error reading file:", e);
            alert("Ocurrió un error al leer el archivo seleccionado.");
            fileInput.value = ''; // Reset input
        };

        reader.readAsText(file);
    }
    
    handleCreateList() {
        // console.log("Handling Create New List confirmation...");
        const modalElement = this.dom.modals.newList;
        if (!modalElement) {
            console.error("New List modal element not found.");
            return;
        }
        
        const input = modalElement.querySelector('#new-list-name');
        if (!input) {
             console.error("New list name input not found in modal.");
            return;
        }
        
        const listName = input.value.trim();
        
        if (listName) {
            // console.log(`Attempting to create list with name: "${listName}"`);
            try {
                this.createList(listName); // This handles local data, Firestore, and rendering
                
                // Close modal directly to ensure it happens
                // console.log("DEBUG: Directly closing modal after list creation");
                modalElement.classList.remove('show');
                modalElement.style.display = 'none';
                
                // Also try normal close method
                this.closeModal('newList');
            } catch (error) {
                console.error("Error during createList call:", error);
                alert(`Failed to create list: ${error.message}`);
                // Optionally keep the modal open on error?
            }
        } else {
            alert("Please enter a name for the new list.");
            input.focus(); // Focus the input for correction
        }
    }
    
    handleAddMasterStore() {
        // console.log("[App.js] handleAddMasterStore() called."); // LOG REMOVED
        const modalElement = this.dom.modals.addStore; 
        if (!modalElement) {
            console.error("[App.js] handleAddMasterStore - Add Store modal element not found in this.dom.modals."); // Keep error
            alert("Error: Could not find the add store modal.");
            return;
        }
        // console.log("[App.js] handleAddMasterStore - Found modal element:", modalElement); // LOG REMOVED
        
        const inputElement = modalElement.querySelector('#new-store-name'); 
        if (!inputElement) {
             console.error("[App.js] handleAddMasterStore - Could not find #new-store-name input within modal."); // Keep error
            alert("Error: Could not find the store name input field.");
            return;
        }
        // console.log("[App.js] handleAddMasterStore - Found input element:", inputElement); // LOG REMOVED
        
        const storeName = inputElement.value.trim(); 
        // console.log(`[App.js] handleAddMasterStore - Trimmed store name: '${storeName}'`); // LOG REMOVED

        if (!storeName) {
            // console.log("[App.js] handleAddMasterStore - Store name is empty."); // LOG REMOVED
            alert("Please enter a name for the new store.");
            inputElement.focus();
            // Re-attach listener since it was { once: true }
            const confirmButton = modalElement.querySelector('#confirm-add-store-btn');
            if (confirmButton) {
                 // console.log("[App.js] handleAddMasterStore - Re-attaching listener due to empty name."); // LOG REMOVED
                 confirmButton.addEventListener('click', this.handleAddMasterStore.bind(this), { once: true });
            } else {
                console.error("[App.js] handleAddMasterStore - Could not find confirm button to re-attach listener."); // Keep error
            }
            return;
        }

        const newStore = {
            id: this.generateId(),
            name: storeName,
            categories: [],
            order: this.appData.masterStores.length
        };
        // console.log("[App.js] handleAddMasterStore - Prepared new store object:", newStore); // LOG REMOVED

        if (this._firestore && window.firestoreFunctions && window.firestoreFunctions.addMasterStore) {
            // console.log("[App.js] handleAddMasterStore - Firestore detected. Calling window.firestoreFunctions.addMasterStore..."); // LOG REMOVED
            window.firestoreFunctions.addMasterStore(storeName)
                .then(createdStore => {
                    // console.log("[App.js] handleAddMasterStore - Firestore success:", createdStore); // LOG REMOVED
                    this.closeModal('addStore');
                })
                .catch(error => {
                    console.error("[App.js] handleAddMasterStore - Firestore error:", error); // Keep error
                    alert(`Failed to add store to the cloud. Error: ${error.message}`);
                });
        } else {
            // console.warn("[App.js] handleAddMasterStore - Firestore not available. Adding locally only."); // LOG REMOVED
            this.appData.masterStores.push(newStore);
            if (!this._firestore) { 
                 // console.log("[App.js] handleAddMasterStore - Calling saveData() for local addition."); // LOG REMOVED
                 this.saveData(); 
            }
            this.renderMasterStores();
            this.closeModal('addStore');
        }
    }
    
    handleEditMasterStore() {
        // console.log("DEBUG: Entered handleEditMasterStore");
        const modalElement = this.dom.modals.editStore;
        const storeName = modalElement?.querySelector('#edit-store-name')?.value.trim();
        const storeId = modalElement?.dataset.editingStoreId;
        
        if (!storeId) {
             console.error("Editing Store ID not found in modal data.");
             alert("Error: Could not determine which store to update.");
             
             this.closeModal('editStore');
             return;
        }

        if (!storeName) {
            alert("Please enter a name for the store.");
            modalElement?.querySelector('#edit-store-name')?.focus();
            return;
        }

        const store = this.appData.masterStores.find(s => s.id === storeId);
        if (!store) {
             console.error(`Store ${storeId} not found when trying to save edit.`);
             alert("Error: Store could not be found.");
             
             this.closeModal('editStore');
             return;
        }
        
        if (store.name === storeName) {
             // console.log("Store name unchanged, closing modal.");
             this.closeModal('editStore');
             return;
        }

        // console.log(`Attempting to update store ${storeId} to name: "${storeName}"`);

        if (window.firestoreFunctions && window.firestoreFunctions.updateMasterStore) {
            window.firestoreFunctions.updateMasterStore(storeId, { name: storeName })
                .then(() => {
                    // console.log("Store updated successfully in Firestore:", storeId);
                    this.closeModal('editStore');
                })
                .catch(error => {
                    console.error(`Error updating master store ${storeId} in Firestore:`, error);
                    alert(`Failed to update store in the cloud. Error: ${error.message}`);
                });
        } else {
            console.warn("Firestore function updateMasterStore not available. Updating locally only.");
            
            store.name = storeName;
            if (!window.db) { this.saveData(); } 
            this.renderMasterStores();
            
            this.closeModal('editStore');
        }
    }
    
    handleAddCategory() {
        // console.log("Handling Add Category confirmation...");
        const modalElement = this.dom.modals.addCategory;
        const categoryName = modalElement?.querySelector('#new-category-name')?.value.trim();
        const storeId = modalElement?.dataset.addingToStoreId;
        
         if (!storeId) {
             console.error("Target Store ID not found in modal data for adding category.");
             alert("Error: Could not determine which store to add the category to.");
             this.closeModal('addCategory');
             return;
        }

        if (!categoryName) {
            alert("Please enter a name for the new category.");
            modalElement?.querySelector('#new-category-name')?.focus();
            return;
        }

        const store = this.appData.masterStores.find(s => s.id === storeId);
        if (!store) {
             console.error(`Store ${storeId} not found when trying to save new category.`);
             alert("Error: Store could not be found.");
             this.closeModal('addCategory');
             return;
        }

        if (!Array.isArray(store.categories)) {
            store.categories = [];
        }

        const newCategory = {
            id: this.generateId(),
            name: categoryName,
            items: [],
            order: store.categories.length
        };

        store.categories.push(newCategory);

        // console.log(`Attempting to add category "${categoryName}" to store ${storeId}`);

        if (window.firestoreFunctions && window.firestoreFunctions.updateMasterStore) {
            window.firestoreFunctions.updateMasterStore(storeId, JSON.parse(JSON.stringify(store)))
                .then(() => {
                    // console.log(`Store ${storeId} updated successfully in Firestore after adding category.`);
                    this.closeModal('addCategory');
                })
                .catch(error => {
                    console.error(`Error updating master store ${storeId} after adding category:`, error);
                    alert(`Failed to add category to the cloud. Error: ${error.message}`);
                });
        } else {
            console.warn("Firestore function updateMasterStore not available. Adding category locally only.");
            if (!window.db) { this.saveData(); }
            this.renderMasterStores();
            this.closeModal('addCategory');
        }
    }
    
    handleEditCategory() {
        // console.log("Handling Edit Category confirmation...");
        const modalElement = this.dom.modals.editCategory;
        const categoryName = modalElement?.querySelector('#edit-category-name')?.value.trim();
        const storeId = modalElement?.dataset.editingStoreId;
        const categoryId = modalElement?.dataset.editingCategoryId;
        
        if (!storeId || !categoryId) {
            console.error("Editing Store/Category ID not found in modal data.");
            alert("Error: Could not determine which category to update.");
            this.closeModal('editCategory');
             return;
        }

        if (!categoryName) {
            alert("Please enter a name for the category.");
            modalElement?.querySelector('#edit-category-name')?.focus();
            return;
        }
        
        const store = this.appData.masterStores.find(s => s.id === storeId);
        const category = store?.categories.find(c => c.id === categoryId);
        if (!category) {
            console.error(`Category ${categoryId} not found when saving edit.`);
            alert("Error: Category could not be found.");
            this.closeModal('editCategory');
            return;
        }

         if (category.name === categoryName) {
             // console.log("Category name unchanged, closing modal.");
             this.closeModal('editCategory');
             return;
        }

        // console.log(`Attempting to update category ${categoryId} to name: "${categoryName}"`);

        if (window.firestoreFunctions && window.firestoreFunctions.updateMasterStore) {
            category.name = categoryName;
            window.firestoreFunctions.updateMasterStore(storeId, JSON.parse(JSON.stringify(store)))
                .then(() => {
                    // console.log(`Store ${storeId} updated successfully in Firestore after editing category ${categoryId}.`);
                    this.closeModal('editCategory');
                })
                .catch(error => {
                    console.error(`Error updating store ${storeId} after editing category ${categoryId}:`, error);
                    alert(`Failed to update category in the cloud. Error: ${error.message}`);
                });
        } else {
            console.warn("Firestore function updateMasterStore not available. Updating category locally only.");
            category.name = categoryName;
            if (!window.db) { this.saveData(); }
            this.renderMasterStores();
            this.closeModal('editCategory');
        }
    }
    
    handleEditItem() {
        // console.log("Handling Edit Item confirmation...");
        const modalElement = this.dom.modals.editItem;
        const nameInput = modalElement?.querySelector('#edit-item-name');
        const itemName = nameInput?.value.trim();
        const storeId = modalElement?.dataset.editingStoreId;
        const categoryId = modalElement?.dataset.editingCategoryId;
        const itemId = modalElement?.dataset.editingItemId;
        // TODO: Get selected store/category IDs if move functionality is added

        if (!storeId || !categoryId || !itemId) {
            console.error("Editing context (IDs) not found in modal data.");
            alert("Error: Could not determine which item to update.");
            this.closeModal('editItem');
            return;
        }

        if (!itemName) {
            alert("Please enter a name for the item.");
            nameInput?.focus();
            return;
        }

        const store = this.appData.masterStores.find(s => s.id === storeId);
        const category = store?.categories.find(c => c.id === categoryId);
        const item = category?.items.find(i => i.id === itemId);

        if (!item) {
            console.error(`Item ${itemId} not found when saving edit.`);
            alert("Error: Item could not be found.");
            this.closeModal('editItem');
            return;
        }

        // Check if name actually changed (add checks for store/category later)
        if (item.name === itemName) {
            // console.log("Item data unchanged, closing modal.");
            this.closeModal('editItem');
            return;
        }

        // console.log(`Attempting to update item ${itemId} to name: "${itemName}"`);
        
        // Update local data first (for responsiveness)
        const originalName = item.name;
        item.name = itemName;
        // TODO: Update storeId/categoryId if moved
        
        // Update Firestore by sending the *entire store* data (simpler for now)
        if (window.firestoreFunctions && window.firestoreFunctions.updateMasterStore) {
            const storeDataToUpdate = JSON.parse(JSON.stringify(store)); // Deep clone
            window.firestoreFunctions.updateMasterStore(storeId, storeDataToUpdate)
                .then(() => {
                    // console.log(`Store ${storeId} updated successfully in Firestore after editing item ${itemId}.`);
                    this.closeModal('editItem');
                })
                .catch(error => {
                    console.error(`Error updating store ${storeId} after editing item ${itemId}:`, error);
                    alert(`Failed to update item in the cloud. Error: ${error.message}`);
                    // Revert local change
                    item.name = originalName;
                    this.renderMasterStores(); // Re-render reverted state
                });
        } else {
            console.warn("Firestore function updateMasterStore not available. Updating item locally only.");
            if (!window.db) { this.saveData(); } // Save local changes if using localStorage
            this.renderMasterStores(); // Re-render local changes
            this.closeModal('editItem');
        }
    }
    
    handleDuplicateItemConfirm() {
        console.log("[App.js] handleDuplicateItemConfirm() called."); // <-- ADD LOG
        const modalElement = this.dom.modals.duplicateItem;
        if (!modalElement) {
            console.error("[App.js] handleDuplicateItemConfirm - Duplicate Item modal element not found."); // <-- ADD LOG
            return;
        }
        
        const targetStoreId = modalElement.querySelector('#duplicate-item-store-select')?.value;
        const targetCategoryId = modalElement.querySelector('#duplicate-item-category-select')?.value;
        const originalItemName = modalElement.dataset.originalItemName; 
        console.log("[App.js] handleDuplicateItemConfirm - Data from modal:", { targetStoreId, targetCategoryId, originalItemName }); // <-- ADD LOG
        
        // Basic validation
        if (!targetStoreId || !targetCategoryId || !originalItemName) {
            console.error("[App.js] handleDuplicateItemConfirm - Missing data from modal."); // <-- ADD LOG
            alert("Error: Missing information to duplicate the item.");
            this.closeModal('duplicateItem');
            return;
        }
        
        console.log(`[App.js] handleDuplicateItemConfirm - Attempting to duplicate item "${originalItemName}" into store ${targetStoreId}, category ${targetCategoryId}`); // <-- ADD LOG

        try {
            console.log("[App.js] handleDuplicateItemConfirm - Calling handleAddNewItem..."); // <-- ADD LOG
            this.handleAddNewItem(targetStoreId, targetCategoryId, originalItemName);
            console.log("[App.js] handleDuplicateItemConfirm - handleAddNewItem completed (async Firestore save may still be pending)."); // <-- ADD LOG
            this.closeModal('duplicateItem');
        } catch (error) {
            console.error("[App.js] handleDuplicateItemConfirm - Error calling handleAddNewItem:", error); // <-- ADD LOG
            alert(`Failed to duplicate item: ${error.message}`);
        }
    }
    
    handleDragStart() {
        // console.log("handleDragStart called - stub implementation");
        // Implement if needed
    }
    
    handleDragOver() {
        // console.log("handleDragOver called - stub implementation");
        // Implement if needed
    }
    
    handleDragLeave() {
        // console.log("handleDragLeave called - stub implementation");
        // Implement if needed
    }
    
    handleDrop() {
        // console.log("handleDrop called - stub implementation");
        // Implement if needed
    }
    
    handleDragEnd() {
        // console.log("handleDragEnd called - stub implementation");
        // Implement if needed
    }
    
    // --- Specific Action Handlers (Called by delegated handlers or direct listeners) ---

    // Store Actions
    openEditStoreModal(storeId) {
        console.log(`DEBUG: Entered openEditStoreModal for store ${storeId}`);
        const store = this.appData.masterStores.find(s => s.id === storeId);
        if (!store) {
            console.error(`Store ${storeId} not found for editing.`);
            alert("Error: Store not found.");
            return;
        }
        
        const modalElement = this.dom.modals.editStore;
        const input = modalElement?.querySelector('#edit-store-name');
        const confirmButton = modalElement?.querySelector('#confirm-edit-store-btn');
        
        if (!modalElement || !input || !confirmButton) {
             console.error("Edit store modal elements (modal, input, or button) not found.");
            return;
        }
        
        // Store the ID in the modal dataset
        console.log(`DEBUG: Setting editStore modal dataset.editingStoreId = ${storeId}`);
        modalElement.dataset.editingStoreId = storeId;
        
        // --- Attach listener directly --- 
        const boundHandler = this.handleEditMasterStore.bind(this);
        console.log("DEBUG: Finding confirm button for edit store: ", confirmButton);
        confirmButton.addEventListener('click', boundHandler, { once: true }); // Use once: true
        console.log(`DEBUG: Attached { once: true } click listener to confirm-edit-store-btn for store ${storeId}.`);
        // -------------------------------

        // Show the modal using the generic method FIRST
        this.openModal('editStore'); 
        
        // Pre-fill the input AFTER modal is shown/cleared
        input.value = store.name;
        input.focus(); // Focus after populating
        
        console.log(`DEBUG: Exiting openEditStoreModal for store ${storeId}`);
    }
    handleDeleteMasterStore(storeId) {
        console.log(`Handling Delete Master Store for store ${storeId}`);
        const store = this.appData.masterStores.find(s => s.id === storeId);
        const storeName = store?.name || 'this store';

        if (!store) {
            console.error(`Store ${storeId} not found for deletion.`);
            alert("Error: Store not found.");
            return;
        }

        // Confirmation
        if (confirm(`Are you sure you want to delete the entire store "${storeName}" and all its categories and items? This cannot be undone.`)) {
            console.log(`Confirmed deletion for store ${storeId} (${storeName})`);

            // Call Firestore delete function
            if (window.firestoreFunctions && window.firestoreFunctions.deleteMasterStore) {
                window.firestoreFunctions.deleteMasterStore(storeId)
                    .then(() => {
                        console.log(`Store ${storeId} deleted successfully in Firestore.`);
                        // Let subscription handle UI update
                    })
                    .catch(error => {
                        console.error(`Error deleting master store ${storeId} from Firestore:`, error);
                        alert(`Failed to delete store from the cloud. Error: ${error.message}`);
                    });
            } else {
                 console.warn("Firestore function deleteMasterStore not available. Deleting locally only.");
                // Delete locally
                const storeIndex = this.appData.masterStores.findIndex(s => s.id === storeId);
                if (storeIndex > -1) {
                    this.appData.masterStores.splice(storeIndex, 1);
                }
                if (!window.db) { this.saveData(); } 
                this.renderMasterStores();
            }
        } else {
            console.log(`Store deletion cancelled for ${storeId}.`);
        }
    }
    openAddCategoryModal(storeId) {
        console.log(`Opening Add Category modal for store ${storeId}`);
        const store = this.appData.masterStores.find(s => s.id === storeId);
        if (!store) {
            console.error(`Store ${storeId} not found when trying to add category.`);
            alert("Error: Store not found.");
            return;
        }
        
        const modalElement = this.dom.modals.addCategory;
         if (!modalElement) {
             console.error("Add category modal elements not found.");
            return;
        }
        
        // Store the ID in the modal or a temporary variable for the confirm handler
        modalElement.dataset.addingToStoreId = storeId;
        
        // Open the modal (generic function)
        this.openModal('addCategory'); 
    }
    moveStore(storeId, direction) {
        console.log(`DEBUG: moveStore called for ${storeId}, direction: ${direction}`);
        const stores = this.appData.masterStores;
        const index = stores.findIndex(s => s.id === storeId);

        if (index === -1) {
            console.error(`moveStore: Store ${storeId} not found.`);
            return;
        }

        let newIndex = index;
        if (direction === 'up' && index > 0) {
            newIndex = index - 1;
        } else if (direction === 'down' && index < stores.length - 1) {
            newIndex = index + 1;
        } else {
            console.log(`moveStore: Cannot move store ${storeId} ${direction} from index ${index}.`);
            return; // Cannot move further
        }

        console.log(`moveStore: Moving store ${storeId} from index ${index} to ${newIndex}`);
        // Remove store from original position and insert at new position
        const [storeToMove] = stores.splice(index, 1);
        stores.splice(newIndex, 0, storeToMove);

        // TODO: Update Firestore order if needed (complex without dedicated order field)
        // For now, relying on local order and localStorage saving.
        if (!window.db) { 
            console.log("DEBUG: moveStore - Saving data to localStorage.");
            this.saveData(); 
        } 
        
        console.log("DEBUG: moveStore - Re-rendering master stores.");
        this.renderMasterStores(); // Re-render with new order
    }

    // Category Actions
    openEditCategoryModal(storeId, categoryId) {
        console.log(`DEBUG: Entered openEditCategoryModal for cat ${categoryId}`);
        const store = this.appData.masterStores.find(s => s.id === storeId);
        const category = store?.categories.find(c => c.id === categoryId);
        if (!category) {
            console.error(`Category ${categoryId} not found in store ${storeId} for editing.`);
            alert("Error: Category not found.");
            return;
        }
        
        const modalElement = this.dom.modals.editCategory;
        const input = modalElement?.querySelector('#edit-category-name');
        const confirmButton = modalElement?.querySelector('#confirm-edit-category-btn');

        if (!modalElement || !input || !confirmButton) {
             console.error("Edit category modal elements (modal, input, or button) not found.");
            return;
        }
        
        // Store IDs for the confirm handler
        console.log(`DEBUG: Setting editCategory modal dataset: store=${storeId}, category=${categoryId}`);
        modalElement.dataset.editingStoreId = storeId;
        modalElement.dataset.editingCategoryId = categoryId;
        
        // --- Attach listener directly ---
        const boundHandler = this.handleEditCategory.bind(this);
        console.log("DEBUG: Finding confirm button for edit category: ", confirmButton);
        confirmButton.addEventListener('click', boundHandler, { once: true });
        console.log(`DEBUG: Attached { once: true } click listener to confirm-edit-category-btn for category ${categoryId}.`);
        // ------------------------------
        
        // Show modal FIRST
        this.openModal('editCategory'); 
        
        // Pre-fill input AFTER modal is shown/cleared
        input.value = category.name;
        input.focus(); // Focus after populating
        
        console.log(`DEBUG: Exiting openEditCategoryModal for cat ${categoryId}`);
    }
    handleDeleteCategory(storeId, categoryId) {
        console.log(`Handling Delete Category ${categoryId} in store ${storeId}`);
        const store = this.appData.masterStores.find(s => s.id === storeId);
        const category = store?.categories.find(c => c.id === categoryId);
        const categoryName = category?.name || 'this category';

        if (!category) {
            console.error(`Category ${categoryId} not found in store ${storeId} for deletion.`);
            alert("Error: Category not found.");
            return;
        }

        // Confirmation
        if (confirm(`Are you sure you want to delete the category "${categoryName}" and all its items? This cannot be undone.`)) {
            console.log(`Confirmed deletion for category ${categoryId} (${categoryName})`);
            
             // Find the index of the category to remove it
            const categoryIndex = store.categories.findIndex(c => c.id === categoryId);
            if (categoryIndex > -1) {
                 // Remove locally
                 store.categories.splice(categoryIndex, 1);
                console.log(`Removed category ${categoryId} from local data in store ${storeId}.`);

                 // Update Firestore (send whole store data)
                if (window.firestoreFunctions && window.firestoreFunctions.updateMasterStore) {
                    const storeDataToUpdate = JSON.parse(JSON.stringify(store));
                    window.firestoreFunctions.updateMasterStore(storeId, storeDataToUpdate)
                        .then(() => {
                            console.log(`Store ${storeId} updated successfully in Firestore after deleting category ${categoryId}.`);
                            // Let subscription handle UI update?
                            this.renderMasterStores(); // Re-render for immediate feedback
                        })
                        .catch(error => {
                             console.error(`Error updating store ${storeId} after deleting category ${categoryId}:`, error);
                             alert(`Failed to delete category from the cloud. Error: ${error.message}`);
                            // Consider reverting local changes
                        });
                } else {
                    console.warn("Firestore function updateMasterStore not available. Deleting category locally only.");
                    if (!window.db) { this.saveData(); }
                    this.renderMasterStores();
                }
            } else {
                 console.error(`Category index not found for ${categoryId} during deletion process.`);
            }
        } else {
            console.log(`Category deletion cancelled for ${categoryId}.`);
        }
    }
    handleAddNewItem(storeId, categoryId, itemName) {
        console.log(`[App.js] handleAddNewItem called with: storeId=${storeId}, categoryId=${categoryId}, itemName="${itemName}"`); // <-- ADD LOG

        const store = this.appData.masterStores.find(s => s.id === storeId);
        if (!store) {
            console.error(`[App.js] handleAddNewItem - Store ${storeId} not found.`); // <-- ADD LOG
            alert("Error: Could not find the store to add the item to.");
            return;
        }

        const category = store.categories.find(c => c.id === categoryId);
        if (!category) {
            console.error(`[App.js] handleAddNewItem - Category ${categoryId} not found in store ${storeId}.`); // <-- ADD LOG
            alert("Error: Could not find the category to add the item to.");
            return;
        }

        if (!Array.isArray(category.items)) {
            console.warn(`[App.js] handleAddNewItem - Initializing missing items array for category ${categoryId}`); // <-- ADD LOG
            category.items = [];
        }

        const newItem = {
            id: this.generateId(),
            name: itemName,
            order: category.items.length 
        };
        console.log(`[App.js] handleAddNewItem - Created new item object:`, newItem); // <-- ADD LOG

        category.items.push(newItem);
        console.log(`[App.js] handleAddNewItem - Added new item ${newItem.id} locally.`); // <-- ADD LOG

        if (this._firestore && window.firestoreFunctions && window.firestoreFunctions.updateMasterStore) {
             const storeDataToUpdate = JSON.parse(JSON.stringify(store));
            console.log(`[App.js] handleAddNewItem - Calling Firestore updateMasterStore for store ${storeId}.`); // <-- ADD LOG
            window.firestoreFunctions.updateMasterStore(storeId, storeDataToUpdate)
                .then(() => {
                    console.log(`[App.js] handleAddNewItem - Firestore updated successfully after adding item ${newItem.id}.`); // <-- ADD LOG
                    this.renderMasterStores();
                })
                .catch(error => {
                    console.error(`[App.js] handleAddNewItem - Error updating Firestore after adding item ${newItem.id}:`, error); // <-- ADD LOG
                    alert(`Failed to save the new item to the cloud. Error: ${error.message}`);
                });
        } else {
            console.warn("[App.js] handleAddNewItem - Firestore not available. Adding locally only."); // <-- ADD LOG
            if (!this._firestore) { this.saveData(); } 
            this.renderMasterStores();
        }
    }
     moveCategory(storeId, categoryId, direction) {
        console.log(`DEBUG: moveCategory called for ${categoryId}, direction: ${direction}`);
        const store = this.appData.masterStores.find(s => s.id === storeId);
        if (!store || !Array.isArray(store.categories)) {
            console.error(`moveCategory: Store ${storeId} or its categories not found.`);
            return;
        }
        
        const categories = store.categories;
        const index = categories.findIndex(c => c.id === categoryId);

        if (index === -1) {
            console.error(`moveCategory: Category ${categoryId} not found in store ${storeId}.`);
            return;
        }

        let newIndex = index;
        if (direction === 'up' && index > 0) {
            newIndex = index - 1;
        } else if (direction === 'down' && index < categories.length - 1) {
            newIndex = index + 1;
        } else {
            console.log(`moveCategory: Cannot move category ${categoryId} ${direction} from index ${index}.`);
            return; 
        }

        console.log(`moveCategory: Moving category ${categoryId} from index ${index} to ${newIndex}`);
        const [categoryToMove] = categories.splice(index, 1);
        categories.splice(newIndex, 0, categoryToMove);

        // Update Firestore with the entire store data
        if (window.firestoreFunctions && window.firestoreFunctions.updateMasterStore) {
            const storeDataToUpdate = JSON.parse(JSON.stringify(store));
            console.log(`DEBUG: moveCategory - Calling Firestore updateMasterStore for store ${storeId}.`);
            window.firestoreFunctions.updateMasterStore(storeId, storeDataToUpdate)
                .then(() => {
                    console.log(`DEBUG: moveCategory - Firestore updated successfully for store ${storeId}.`);
                    this.renderMasterStores(); // Re-render only after successful save
                })
                .catch(error => {
                    console.error(`DEBUG: moveCategory - Error updating Firestore for store ${storeId}:`, error);
                    alert(`Failed to save category order change. Error: ${error.message}`);
                    // Optional: Revert local change? (More complex)
                });
        } else {
            console.warn("DEBUG: moveCategory - Firestore function updateMasterStore not available. Saving locally.");
            if (!window.db) { this.saveData(); }
            this.renderMasterStores(); // Re-render local changes
        }
    }

    // Master Item Actions
    handleAddItemToShoppingList(storeId, categoryId, itemId) {
        console.log(`[App.js Log] handleAddItemToShoppingList called with storeId: ${storeId}, categoryId: ${categoryId}, itemId: ${itemId}`); // Added Log
        console.log(`Handling Add Item to Shopping List for master item ${itemId}`);

        // 1. Find Master Item
        const store = this.appData.masterStores.find(s => s.id === storeId);
        const category = store?.categories.find(c => c.id === categoryId);
        const masterItem = category?.items.find(i => i.id === itemId);

        if (!masterItem) {
            console.error(`Master item ${itemId} not found when trying to add to shopping list.`);
            alert("Error: Could not find the original item.");
            return;
        }

        // 2. Get Active List
        const activeList = this.getActiveList();
        if (!activeList) {
            console.error("Cannot add item: No active list found.");
            alert("Error: No active shopping list selected.");
            return;
        }
        // Ensure shoppingList array exists
        if (!Array.isArray(activeList.shoppingList)) {
             console.warn("Initializing missing shoppingList array on active list."); // Keep this warn
             activeList.shoppingList = [];
        }

        // 3. Check for Duplicates (based on MASTER item ID)
        // const alreadyExists = activeList.shoppingList.some(item => item.id === masterItem.id); // OLD check compared unique ID to master ID
        const alreadyExists = activeList.shoppingList.some(slItem => slItem.itemId === masterItem.id); // NEW check compares shopping list item's itemId to master ID
        if (alreadyExists) {
            console.log(`Item ${masterItem.name} (Master ID: ${masterItem.id}) already exists in the shopping list.`); // Updated log
            // Optionally provide feedback to the user, e.g., flash the existing item
            alert(`"${masterItem.name}" ya está en la lista.`);
            return;
        }

        // 4. Create Shopping List Item Object
        const shoppingListItem = {
            // id: masterItem.id, // Use the same ID as the master item - CHANGED
            id: this.generateId(), // Generate a UNIQUE ID for this shopping list item
            itemId: masterItem.id, // Link back to the master item ID
            name: masterItem.name,
            storeId: storeId,
            categoryId: categoryId,
            checked: false, // New items are unchecked
            notes: '' // Add the notes field
        };

        console.log("[App.js Log] Creating new shopping list item:", JSON.parse(JSON.stringify(shoppingListItem))); // Added Deep Copy Log
        // 5. Add to Local Data
        activeList.shoppingList.push(shoppingListItem);
        console.log(`Added item ${masterItem.id} to local active list.`);

        // 6. Update Firestore
        if (window.firestoreFunctions && window.firestoreFunctions.updateList) {
            const listDataToUpdate = { shoppingList: activeList.shoppingList };
            console.log(`Calling Firestore updateList for list ${activeList.id} after adding item.`);
            window.firestoreFunctions.updateList(activeList.id, listDataToUpdate)
                .then(() => {
                    console.log(`Firestore updated successfully after adding item ${masterItem.id}.`);
                    // Re-render immediately
                    this.renderShoppingList(); 
                })
                .catch(error => {
                    console.error(`Error updating Firestore after adding item ${masterItem.id}:`, error);
                    alert(`Failed to add item to the cloud list. Error: ${error.message}`);
                    // Revert local change
                    activeList.shoppingList = activeList.shoppingList.filter(item => item.id !== masterItem.id);
                    this.renderShoppingList(); // Re-render to show reverted state
                });
        } else {
             console.warn("Firestore function updateList not available. Adding locally only.");
             if (!window.db) { this.saveData(); } 
             this.renderShoppingList();
        }
    }
    openEditItemModal(storeId, categoryId, itemId) {
        // console.log(`DEBUG: openEditItemModal called for item ${itemId} in category ${categoryId}, store ${storeId}`);
        const store = this.appData.masterStores.find(s => s.id === storeId);
        const category = store?.categories.find(c => c.id === categoryId);
        const item = category?.items.find(i => i.id === itemId);

        if (!item) { // <-- Restore check for !item
            console.error(`Item ${itemId} not found for editing.`);
            alert("Error: Item not found.");
            return;
        }

        const modalElement = this.dom.modals.editItem;
        const nameInput = modalElement?.querySelector('#edit-item-name');
        // TODO: Add store/category select elements later if move functionality is needed
        const storeSelect = modalElement?.querySelector('#edit-item-store-select'); // <-- FIND SELECT
        const categorySelect = modalElement?.querySelector('#edit-item-category-select'); // <-- FIND SELECT
        const confirmButton = modalElement?.querySelector('#confirm-edit-item-btn');

        if (!modalElement || !nameInput || !storeSelect || !categorySelect || !confirmButton) { // <-- CHECK SELECTS
            console.error("Edit item modal elements not found (modal, name, store, category, or button)."); // <-- UPDATE ERROR
            return;
        }

        // Store context
        // console.log(`DEBUG: Setting editItem modal dataset: store=${storeId}, category=${categoryId}, item=${itemId}`);
        modalElement.dataset.editingStoreId = storeId;
        modalElement.dataset.editingCategoryId = categoryId;
        modalElement.dataset.editingItemId = itemId;

        // Add listener
        const boundHandler = this.handleEditItem.bind(this);
        // console.log("DEBUG: Finding confirm button for edit item: ", confirmButton);
        confirmButton.addEventListener('click', boundHandler, { once: true }); // Use once: true for simple confirm
        // console.log(`DEBUG: Attached { once: true } click listener to confirm-edit-item-btn for item ${itemId}.`);

        // Show modal FIRST
        this.openModal('editItem');
        
        // Pre-fill data AFTER modal is shown/cleared
        nameInput.value = item.name;
        nameInput.focus(); // Focus after populating
        
        // --- Populate Store Dropdown --- 
        // console.log("DEBUG: Populating store dropdown. Master stores:", JSON.parse(JSON.stringify(this.appData.masterStores)));
        storeSelect.innerHTML = ''; // Clear existing options
        this.appData.masterStores.forEach(s => {
            const option = document.createElement('option');
            option.value = s.id;
            option.textContent = s.name;
            option.selected = s.id === storeId;
            storeSelect.appendChild(option);
        });
        // console.log("DEBUG: Store dropdown populated.");

        // --- Populate Category Dropdown (based on selected store) --- 
        const populateEditCategoryDropdown = (selectedStoreId) => {
            // console.log(`DEBUG: Populating category dropdown for store ${selectedStoreId}`);
            categorySelect.innerHTML = ''; // Clear existing options
            const selectedStore = this.appData.masterStores.find(s => s.id === selectedStoreId);
            if (selectedStore && selectedStore.categories) {
                // console.log(`DEBUG: Found ${selectedStore.categories.length} categories in store ${selectedStoreId}`);
                selectedStore.categories.forEach(c => {
                    const option = document.createElement('option');
                    option.value = c.id;
                    option.textContent = c.name;
                    // Select the original category *only* if the original store is selected
                    option.selected = (selectedStoreId === storeId && c.id === categoryId);
                    categorySelect.appendChild(option);
                });
            } else {
                // console.log(`DEBUG: No categories found for store ${selectedStoreId}`);
            }
            // Add a placeholder if no categories exist
            if (categorySelect.options.length === 0) {
                const option = document.createElement('option');
                option.textContent = "No categories";
                option.disabled = true;
                categorySelect.appendChild(option);
            }
             // console.log("DEBUG: Category dropdown populated.");
        };

        // Initial population for the original store
        populateEditCategoryDropdown(storeId);

        // Update categories when store selection changes
        storeSelect.onchange = () => populateEditCategoryDropdown(storeSelect.value);
        
        // console.log("DEBUG: Dropdowns populated and event listener attached.");
        // TODO: Populate and set selected store/category dropdowns // <-- REMOVE THIS TODO // <-- This line should have been removed previously, removing it now
    }
    handleDeleteMasterItem(storeId, categoryId, itemId) {
        // Find the item for the confirmation message
        const store = this.appData.masterStores.find(s => s.id === storeId);
        const category = store?.categories.find(c => c.id === categoryId);
        const item = category?.items.find(i => i.id === itemId);
        const itemName = item?.name || 'this item';

        if (!item) {
            console.error(`Could not find master item ${itemId} in category ${categoryId} / store ${storeId} to delete.`);
            alert("Error: Could not find the item to delete.");
            return;
        }

        // Confirmation dialog
        if (confirm(`Are you sure you want to delete the master item "${itemName}"? This cannot be undone.`)) {
            console.log(`Confirmed deletion for item ${itemId} (${itemName})`);
            
            // Find the index of the item to remove it
            const itemIndex = category.items.findIndex(i => i.id === itemId);
            if (itemIndex > -1) {
                 // Remove the item from the local data structure
                category.items.splice(itemIndex, 1);
                console.log(`Removed item ${itemId} from local data.`);

                // Update Firestore (pass the entire updated store data)
                if (window.firestoreFunctions && window.firestoreFunctions.updateMasterStore) {
                     // Clone the store object to avoid sending internal references
                    const storeDataToUpdate = JSON.parse(JSON.stringify(store));
                    // Firestore might not need the id field within the data payload for an update
                    // delete storeDataToUpdate.id; 
                    // ^ Commented out: Firestore update typically needs just the fields to change, 
                    // but here we are sending the whole modified object for simplicity, 
                    // assuming Firestore handles merging or replacing.
                    // Let's update the entire store document for simplicity. 
                    // If performance becomes an issue, update only the specific category.

                    console.log(`Calling Firestore updateMasterStore for store ${storeId} with updated data.`);
                    window.firestoreFunctions.updateMasterStore(storeId, storeDataToUpdate)
                        .then(() => {
                            console.log(`Firestore updated successfully after deleting item ${itemId}.`);
                            // Data might update via subscription, but re-render immediately for responsiveness
                            this.renderMasterStores();
                        })
                        .catch(error => {
                            console.error(`Error updating Firestore after deleting item ${itemId}:`, error);
                            alert(`Failed to save changes to the cloud. Error: ${error.message}`);
                            // Potentially revert local changes or notify user
                            // For now, we'll leave the local change and let the next Firestore sync potentially fix it.
                        });
                } else {
                    console.warn("Firestore function updateMasterStore not available. Deleting locally only.");
                    // If only using localStorage, save the data
                     if (!window.db) { this.saveData(); } // Assuming no Firestore means we use localStorage
                     this.renderMasterStores(); // Re-render local changes
                }
            } else {
                 console.error(`Item index not found for ${itemId} during deletion process.`);
            }
        } else {
            console.log("Item deletion cancelled by user.");
        }
    }
    openDuplicateItemModal(storeId, categoryId, itemId) {
        console.log(`[App.js] openDuplicateItemModal called for item ${itemId} in cat ${categoryId}, store ${storeId}`); // <-- ADD LOG
        const store = this.appData.masterStores.find(s => s.id === storeId);
        const category = store?.categories.find(c => c.id === categoryId);
        const item = category?.items.find(i => i.id === itemId);

        if (!item) {
            console.error(`[App.js] openDuplicateItemModal - Item ${itemId} not found.`); // <-- ADD LOG
            alert("Error: Original item not found.");
            return;
        }

        const modalElement = this.dom.modals.duplicateItem;
        const nameDisplay = modalElement?.querySelector('#duplicate-item-name-display');
        const storeSelect = modalElement?.querySelector('#duplicate-item-store-select');
        const categorySelect = modalElement?.querySelector('#duplicate-item-category-select');
        const confirmButton = modalElement?.querySelector('#confirm-duplicate-item-btn');

        if (!modalElement || !nameDisplay || !storeSelect || !categorySelect || !confirmButton) {
            console.error("[App.js] openDuplicateItemModal - Duplicate item modal elements not found.", { // <-- ADD LOG
                 modal: !!modalElement,
                 name: !!nameDisplay,
                 storeSel: !!storeSelect,
                 catSel: !!categorySelect,
                 btn: !!confirmButton
            });
            return;
        }
        console.log("[App.js] openDuplicateItemModal - All modal elements found."); // <-- ADD LOG

        // Store original item context
        modalElement.dataset.originalStoreId = storeId;
        modalElement.dataset.originalCategoryId = categoryId;
        modalElement.dataset.originalItemId = itemId;
        modalElement.dataset.originalItemName = item.name; 
        console.log("[App.js] openDuplicateItemModal - Set dataset attributes."); // <-- ADD LOG

        // Set display name
        nameDisplay.textContent = item.name;

        // Populate Store dropdown
        storeSelect.innerHTML = '';
        console.log("[App.js] openDuplicateItemModal - Populating store select..."); // <-- ADD LOG
        this.appData.masterStores.forEach(s => {
            const option = document.createElement('option');
            option.value = s.id;
            option.textContent = s.name;
            option.selected = s.id === storeId; // Default to original store
            storeSelect.appendChild(option);
        });
        console.log("[App.js] openDuplicateItemModal - Store select populated."); // <-- ADD LOG

        // Populate Category dropdown based on selected store
        const populateCategoryDropdown = (selectedStoreId) => {
             console.log(`[App.js] openDuplicateItemModal - Populating category select for store ${selectedStoreId}...`); // <-- ADD LOG
            categorySelect.innerHTML = '';
            const selectedStore = this.appData.masterStores.find(s => s.id === selectedStoreId);
            if (selectedStore && selectedStore.categories) {
                selectedStore.categories.forEach(c => {
                    const option = document.createElement('option');
                    option.value = c.id;
                    option.textContent = c.name;
                    option.selected = (selectedStoreId === storeId && c.id === categoryId) || (!categorySelect.options.length);
                    categorySelect.appendChild(option);
                });
                console.log(`[App.js] openDuplicateItemModal - Added ${selectedStore.categories.length} categories.`); // <-- ADD LOG
            }
            if (!categorySelect.options.length) {
                 console.log("[App.js] openDuplicateItemModal - No categories found for selected store."); // <-- ADD LOG
                const option = document.createElement('option');
                option.textContent = "No categories";
                option.disabled = true;
                categorySelect.appendChild(option);
            }
        };

        // Initial population
        populateCategoryDropdown(storeId);

        // Update categories when store changes
        storeSelect.onchange = () => populateCategoryDropdown(storeSelect.value);

        // Add listener for confirm button
        // Ensure listener is attached only once if modal might be reused
        const boundConfirmHandler = this.handleDuplicateItemConfirm.bind(this);
        // Remove existing listener before adding new one to prevent duplicates
        confirmButton.removeEventListener('click', boundConfirmHandler); // May need a named function reference if this doesn't work
        confirmButton.addEventListener('click', boundConfirmHandler, { once: true });
        console.log("[App.js] openDuplicateItemModal - Attached listener to confirm button."); // <-- ADD LOG

        // Show the modal
        this.openModal('duplicateItem'); 
        console.log("[App.js] openDuplicateItemModal - Modal opened."); // <-- ADD LOG
    }

    // Archived List Actions
    handleRestoreArchivedList(listId) {
        console.log(`DEBUG: handleRestoreArchivedList method called for listId: ${listId}`);
        
        const listToRestore = this.appData.archivedLists.find(l => l.id === listId);
        if (!listToRestore) {
            alert("Error: Could not find the archived list data.");
            console.error(`Archived list data not found for ID: ${listId} during restore.`);
            return;
        }
        
        console.log(`Attempting to restore list: ${listToRestore.name} (ID: ${listId})`);

        // Optimistic UI update
        const listIndex = this.appData.archivedLists.findIndex(l => l.id === listId);
        if (listIndex > -1) {
            this.appData.archivedLists.splice(listIndex, 1);
            // Add back to active lists (optional, Firestore sync preferred)
            // const { archivedAt, ...restoredData } = listToRestore;
            // this.appData.lists.push(restoredData);
        }
        this.renderArchivedLists(); // Update panel immediately
        
        // Call Firestore function
        if (window.firestoreFunctions && window.firestoreFunctions.restoreList) {
            window.firestoreFunctions.restoreList(listId)
                .then(() => {
                    console.log(`List ${listId} successfully restored in Firestore.`);
                    // Firestore listener should update appData.lists and trigger render
                })
                .catch(error => {
                    console.error(`Error restoring list ${listId} in Firestore:`, error);
                    alert(`Failed to restore the list from the cloud. Error: ${error.message}`);
                    // Revert UI
                    if (listIndex > -1) {
                        this.appData.archivedLists.splice(listIndex, 0, listToRestore);
                        this.renderArchivedLists();
                    }
                });
        } else {
            console.warn("Firestore function restoreList not available. Restoring locally only.");
             // If only local, add back to active lists and save
            const { archivedAt, ...restoredData } = listToRestore;
            this.appData.lists = this.appData.lists || [];
            this.appData.lists.push(restoredData);
             this.activeListId = listId; // Make it active? Maybe not necessary.
            localStorage.setItem('shoppingListLastActiveId', this.activeListId);
            if (!window.db) { this.saveData(); }
             this.render(); // Full render to update dropdown and list view
        }
    }
    handleDeleteArchivedList(listId) {
        console.log(`DEBUG: handleDeleteArchivedList method called for listId: ${listId}`);
        
        const listToDelete = this.appData.archivedLists.find(l => l.id === listId);
        const listName = listToDelete?.name || 'this list';

        if (!listToDelete) {
            alert("Error: Could not find the archived list data to delete.");
            console.error(`Archived list data not found for ID: ${listId} during delete.`);
            return;
        }
        
        // Confirmation
        if (confirm(`Are you sure you want to permanently delete the archived list "${listName}"? This cannot be undone.`)) {
            console.log(`Confirmed deletion for archived list ${listId} (${listName})`);
            
            // Optimistic UI update
            const listIndex = this.appData.archivedLists.findIndex(l => l.id === listId);
            if (listIndex > -1) {
                this.appData.archivedLists.splice(listIndex, 1);
            }
            this.renderArchivedLists(); // Update panel immediately
            
            // Call Firestore function
            if (window.firestoreFunctions && window.firestoreFunctions.deleteArchivedList) {
                window.firestoreFunctions.deleteArchivedList(listId)
                    .then(() => {
                        console.log(`Archived list ${listId} successfully deleted in Firestore.`);
                        // UI already updated optimistically
                    })
                    .catch(error => {
                        console.error(`Error deleting archived list ${listId} from Firestore:`, error);
                        alert(`Failed to delete the archived list from the cloud. Error: ${error.message}`);
                        // Revert UI
                        if (listIndex > -1) {
                             this.appData.archivedLists.splice(listIndex, 0, listToDelete);
                             this.renderArchivedLists();
                        }
                    });
            } else {
                 console.warn("Firestore function deleteArchivedList not available. Deleting locally only.");
                 if (!window.db) { this.saveData(); } // Save if local storage is used
                 // UI already updated
            }
        } else {
             console.log(`Archived list deletion cancelled for ${listId}.`);
        }
    }
    
    // --- Delegated Event Handlers ---
    handleMasterListEvents(event) {
        // Function body completely replaced with correct logic
        const target = event.target;

        // Find the relevant elements and IDs based on the clicked target
        const itemElement = target.closest('.item');
        const categoryContainer = target.closest('.category-container');
        const storeContainer = target.closest('.store-container');
        
        // Extract IDs, potentially from different levels depending on what was clicked
        const itemId = itemElement?.dataset.itemId;
        const categoryId = categoryContainer?.dataset.categoryId || itemElement?.dataset.categoryId;
        const storeId = storeContainer?.dataset.storeId || categoryContainer?.dataset.storeId || itemElement?.dataset.storeId;

        // --- Store Actions ---
        if (target.classList.contains('edit-store-btn') && storeId) {
            this.openEditStoreModal(storeId);
        } else if (target.classList.contains('delete-store-btn') && storeId) {
            this.handleDeleteMasterStore(storeId);
        } else if (target.classList.contains('add-category-btn') && storeId) {
            this.openAddCategoryModal(storeId);
        } else if (target.classList.contains('move-store-up-btn') && storeId) {
            this.moveStore(storeId, 'up');
        } else if (target.classList.contains('move-store-down-btn') && storeId) {
            this.moveStore(storeId, 'down');
        
        // --- Category Actions ---
        } else if (target.classList.contains('edit-category-btn') && storeId && categoryId) {
             this.openEditCategoryModal(storeId, categoryId);
        } else if (target.classList.contains('delete-category-btn') && storeId && categoryId) {
             this.handleDeleteCategory(storeId, categoryId);
        } else if (target.classList.contains('add-item-btn') && storeId && categoryId) {
             const input = categoryContainer?.querySelector('.new-item-input');
             const itemName = input?.value.trim();
             if (itemName) {
                 this.handleAddNewItem(storeId, categoryId, itemName);
                 input.value = ''; // Clear input after adding
             } // Optionally add an else to alert if itemName is empty
        } else if (target.classList.contains('move-category-up-btn') && storeId && categoryId) {
            this.moveCategory(storeId, categoryId, 'up');
        } else if (target.classList.contains('move-category-down-btn') && storeId && categoryId) {
            this.moveCategory(storeId, categoryId, 'down');

        // --- Item Actions ---
        } else if (target.classList.contains('add-to-shopping-list-btn') && storeId && categoryId && itemId) {
            const activeList = this.getActiveList();
            // const alreadyExists = activeList?.shoppingList?.some(item => item.id === itemId); // OLD check
            const alreadyExists = activeList?.shoppingList?.some(slItem => slItem.itemId === itemId); // NEW check compares master ID (itemId) to shopping list item's itemId
            if (alreadyExists) {
                 // this.handleRemoveItemFromShoppingList(itemId); // OLD: Tried to remove using master ID
                 // Find the specific shopping list item to remove based on the master itemId
                 const shoppingListItemToRemove = activeList.shoppingList.find(slItem => slItem.itemId === itemId);
                 if (shoppingListItemToRemove) {
                     this.handleRemoveItemFromShoppingList(shoppingListItemToRemove.id); // Call remove with the correct UNIQUE id
                 } else {
                     console.warn(`Master item ${itemId} marked as existing, but couldn't find corresponding shopping list item to remove.`);
                 }
            } else {
                this.handleAddItemToShoppingList(storeId, categoryId, itemId);
            }
        } else if (target.classList.contains('edit-item-btn') && storeId && categoryId && itemId) {
            this.openEditItemModal(storeId, categoryId, itemId);
        } else if (target.classList.contains('delete-item-btn') && storeId && categoryId && itemId) {
            this.handleDeleteMasterItem(storeId, categoryId, itemId);
        } else if (target.classList.contains('duplicate-item-btn') && storeId && categoryId && itemId) {
            this.openDuplicateItemModal(storeId, categoryId, itemId);
         } else if (target.classList.contains('move-item-up-btn') && storeId && categoryId && itemId) {
            this.moveItem(storeId, categoryId, itemId, 'up');
        } else if (target.classList.contains('move-item-down-btn') && storeId && categoryId && itemId) {
            this.moveItem(storeId, categoryId, itemId, 'down');
        }
        // If no specific action matched, do nothing.
    }

    handleShoppingListEvents(event) {
        const target = event.target;
        const itemElement = target.closest('.shopping-list-item');
        const shoppingListItemId = itemElement?.dataset.shoppingListItemId;

        if (!shoppingListItemId) {
            return; // Click outside a relevant item
        }

        // Check if the click was on the checkbox or its label
        if (target.classList.contains('item-checkbox') || target.classList.contains('item-label')) {
            // Find the actual checkbox element within this item element
            const checkbox = itemElement.querySelector('.item-checkbox');
            if (checkbox) {
                 // Important: Read the checked state AFTER the default browser behavior has occurred
                 // Use setTimeout to allow the event loop to process the check change before we read it
                 setTimeout(() => {
                    const isChecked = checkbox.checked;
                    console.log(`DEBUG: Checkbox/Label clicked for ${shoppingListItemId}. Checkbox state: ${isChecked}`); // Added Debug Log
                    this.toggleShoppingItemChecked(shoppingListItemId, isChecked);
                 }, 0);
            } else {
                console.warn("Could not find checkbox element within item for ID:", shoppingListItemId);
            }
        }
        // Check if the click was on the remove button
        else if (target.classList.contains('remove-from-list-btn')) {
            this.handleRemoveItemFromShoppingList(shoppingListItemId);
        }
        // Add handling for notes later
    }

    handleArchivedListEvents(event) {
        // console.log("[App.js] handleArchivedListEvents triggered."); // LOG REMOVED
        const target = event.target;
        
        const listItemElement = target.closest('.archived-list-item');
        const listId = listItemElement?.dataset.listId;

        if (!listId) {
            return;
        }

        if (target.classList.contains('restore-list-btn')) {
            this.handleRestoreArchivedList(listId);
        }
        else if (target.classList.contains('delete-archived-list-btn')) {
            this.handleDeleteArchivedList(listId);
        }
    }

    // --- Specific Modal Openers that Attach Listeners ---
    openAddStoreModal() {
        console.log("DEBUG: Entered openAddStoreModal");
        const modalElement = this.dom.modals.addStore;
        const confirmButton = modalElement?.querySelector('#confirm-add-store-btn');

        if (!modalElement || !confirmButton) {
            console.error("Add store modal elements (modal or button) not found.");
            return;
        }

        const boundHandler = this.handleAddMasterStore.bind(this);
        confirmButton.addEventListener('click', boundHandler, { once: true });
        console.log("DEBUG: Attached click listener to confirm-add-store-btn");

        this.openModal('addStore'); // Use generic openModal for showing/clearing
         console.log("DEBUG: Exiting openAddStoreModal");
    }
    
    openAddCategoryModal(storeId) {
        console.log(`DEBUG: Entered openAddCategoryModal for store ${storeId}`);
         const store = this.appData.masterStores.find(s => s.id === storeId);
        if (!store) {
            console.error(`Store ${storeId} not found when trying to add category.`);
            alert("Error: Store not found.");
            return;
        }
        
        const modalElement = this.dom.modals.addCategory;
         if (!modalElement) {
             console.error("Add category modal elements not found.");
            return;
        }
        
        // Store the ID in the modal or a temporary variable for the confirm handler
        modalElement.dataset.addingToStoreId = storeId;
        
        // Open the modal (generic function)
        this.openModal('addCategory'); 
    }

    handleRemoveItemFromShoppingList(shoppingListItemId) { // Parameter renamed for clarity
        // console.log(`DEBUG: handleRemoveItemFromShoppingList - Start for item ${itemId}`); // CHANGED
        console.log(`DEBUG: handleRemoveItemFromShoppingList - Start for item ${shoppingListItemId}`);

        const activeList = this.getActiveList();
        if (!activeList) {
            console.error("DEBUG: handleRemoveItemFromShoppingList - Cannot remove item: No active list found.");
            return;
        }
        console.log(`DEBUG: handleRemoveItemFromShoppingList - Active list found: ${activeList.id}`);
        
        if (!Array.isArray(activeList.shoppingList)) {
            console.error("DEBUG: handleRemoveItemFromShoppingList - Cannot remove item: shoppingList is not an array.");
            // Attempt recovery
            activeList.shoppingList = []; 
            // return; // Maybe proceed after recovery attempt?
        }

        const initialLength = activeList.shoppingList.length;
        // const itemIndex = activeList.shoppingList.findIndex(item => item.id === itemId); // Find by master ID - CHANGED
        const itemIndex = activeList.shoppingList.findIndex(item => item.id === shoppingListItemId); // Find by UNIQUE shopping list item ID
        // console.log(`DEBUG: handleRemoveItemFromShoppingList - Initial list length: ${initialLength}, Found item index: ${itemIndex}`); // CHANGED
        console.log(`DEBUG: handleRemoveItemFromShoppingList - Initial list length: ${initialLength}, Found item index: ${itemIndex} for ID ${shoppingListItemId}`);
        
        if (itemIndex === -1) {
            //  console.warn(`DEBUG: handleRemoveItemFromShoppingList - Item ${itemId} was not found in the active list to remove.`); // CHANGED
             console.warn(`DEBUG: handleRemoveItemFromShoppingList - Item ${shoppingListItemId} was not found in the active list to remove.`);
             // No need to update Firestore if nothing changed
            return;
        }

        // --- Perform Local Update --- 
        const itemBeingRemoved = activeList.shoppingList[itemIndex]; // Keep reference for potential revert
        activeList.shoppingList.splice(itemIndex, 1);
        // console.log(`DEBUG: handleRemoveItemFromShoppingList - Removed item ${itemId} locally. New length: ${activeList.shoppingList.length}`); // CHANGED
        console.log(`DEBUG: handleRemoveItemFromShoppingList - Removed item ${shoppingListItemId} locally. New length: ${activeList.shoppingList.length}`);
        // -----------------------------

        // --- Trigger UI Update (Optimistic) ---
        console.log("DEBUG: handleRemoveItemFromShoppingList - Triggering optimistic UI render...");
        this.renderShoppingList();
        this.renderMasterStores(); // Re-render master to update the button state
        console.log("DEBUG: handleRemoveItemFromShoppingList - Optimistic UI render complete.");
        // ---------------------------------------
        
        // --- Update Firestore --- 
        if (window.firestoreFunctions && window.firestoreFunctions.updateList) {
            // Send the *entire updated* shoppingList array
            const listDataToUpdate = { shoppingList: activeList.shoppingList };
             console.log(`DEBUG: handleRemoveItemFromShoppingList - Calling Firestore updateList for list ${activeList.id} after removing item.`);
             console.log(`DEBUG: Data being sent:`, listDataToUpdate);
             
             window.firestoreFunctions.updateList(activeList.id, listDataToUpdate)
                .then(() => {
                    // console.log(`DEBUG: handleRemoveItemFromShoppingList - Firestore updated successfully after removing item ${itemId}.`); // CHANGED
                    console.log(`DEBUG: handleRemoveItemFromShoppingList - Firestore updated successfully after removing item ${shoppingListItemId}.`);
                    // UI already updated optimistically
                })
                .catch(error => {
                    // console.error(`DEBUG: handleRemoveItemFromShoppingList - Error updating Firestore after removing item ${itemId}:`, error); // CHANGED
                    console.error(`DEBUG: handleRemoveItemFromShoppingList - Error updating Firestore after removing item ${shoppingListItemId}:`, error);
                    alert(`Failed to remove item from the cloud list. Error: ${error.message}`);
                    
                    // --- Revert Local Data & UI --- 
                    console.log(`DEBUG: handleRemoveItemFromShoppingList - Reverting local data change due to Firestore error.`);
                    activeList.shoppingList.splice(itemIndex, 0, itemBeingRemoved); // Add item back at original index
                    console.log(`DEBUG: handleRemoveItemFromShoppingList - Reverted local list. New length: ${activeList.shoppingList.length}. Triggering revert render...`);
                    this.renderShoppingList();
                    this.renderMasterStores();
                    console.log(`DEBUG: handleRemoveItemFromShoppingList - Revert render complete.`);
                    // ----------------------------------
                });
            } else {
            console.warn("DEBUG: handleRemoveItemFromShoppingList - Firestore function updateList not available. Removing locally only.");
             if (!window.db) {
                 console.log("DEBUG: handleRemoveItemFromShoppingList - Saving local data (localStorage fallback).");
                    this.saveData();
             }
             // UI already updated optimistically above
        }
        console.log(`DEBUG: handleRemoveItemFromShoppingList - End for item ${shoppingListItemId}`);
    }

    moveItem(storeId, categoryId, itemId, direction) {
        console.log(`DEBUG: moveItem called for ${itemId}, direction: ${direction}`);
        const store = this.appData.masterStores.find(s => s.id === storeId);
        const category = store?.categories.find(c => c.id === categoryId);
        if (!category || !Array.isArray(category.items)) {
            console.error(`moveItem: Category ${categoryId} or its items not found.`);
            return;
        }

        const items = category.items;
        const index = items.findIndex(i => i.id === itemId);

        if (index === -1) {
            console.error(`moveItem: Item ${itemId} not found in category ${categoryId}.`);
            return;
        }

        let newIndex = index;
        if (direction === 'up' && index > 0) {
            newIndex = index - 1;
        } else if (direction === 'down' && index < items.length - 1) {
            newIndex = index + 1;
        } else {
            console.log(`moveItem: Cannot move item ${itemId} ${direction} from index ${index}.`);
            return;
        }

        console.log(`moveItem: Moving item ${itemId} from index ${index} to ${newIndex}`);
        const [itemToMove] = items.splice(index, 1);
        items.splice(newIndex, 0, itemToMove);

        // Update Firestore with the entire store data
        if (window.firestoreFunctions && window.firestoreFunctions.updateMasterStore) {
             const storeDataToUpdate = JSON.parse(JSON.stringify(store));
            console.log(`DEBUG: moveItem - Calling Firestore updateMasterStore for store ${storeId}.`);
            window.firestoreFunctions.updateMasterStore(storeId, storeDataToUpdate)
                .then(() => {
                    console.log(`DEBUG: moveItem - Firestore updated successfully for store ${storeId}.`);
                    this.renderMasterStores(); // Re-render only after successful save
                })
                .catch(error => {
                    console.error(`DEBUG: moveItem - Error updating Firestore for store ${storeId}:`, error);
                    alert(`Failed to save item order change. Error: ${error.message}`);
                    // Optional: Revert local change?
                });
        } else {
            console.warn("DEBUG: moveItem - Firestore function updateMasterStore not available. Saving locally.");
                if (!window.db) { this.saveData(); }
            this.renderMasterStores(); // Re-render local changes
        }
    }

    populateStoreFilterDropdown(currentValue) {
        // console.log("[App.js] populateStoreFilterDropdown() called. Current selected value:", currentValue); // REMOVED LOG
        if (!this.dom.filterStoreSelect) {
            console.error("[App.js] populateStoreFilterDropdown - filterStoreSelect DOM element not found!"); // Keep error
            return;
        }
        
        const selectElement = this.dom.filterStoreSelect;
        // console.log("[App.js] populateStoreFilterDropdown - BEFORE clear. Current innerHTML:", selectElement.innerHTML); // REMOVED LOG
        selectElement.innerHTML = ''; 

        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'Todas las Tiendas';
        selectElement.appendChild(allOption);

        // console.log("[App.js] populateStoreFilterDropdown - Looping through masterStores:", JSON.parse(JSON.stringify(this.appData.masterStores))); // REMOVED LOG
        if (this.appData.masterStores && this.appData.masterStores.length > 0) {
            this.appData.masterStores.forEach(store => {
                const option = document.createElement('option');
                option.value = store.id;
                option.textContent = store.name;
                selectElement.appendChild(option);
            });
            // console.log(`[App.js] populateStoreFilterDropdown - Added ${this.appData.masterStores.length} store options.`); // REMOVED LOG
        } else {
            // console.log("[App.js] populateStoreFilterDropdown - No master stores found to populate dropdown."); // REMOVED LOG
        }

        // console.log("[App.js] populateStoreFilterDropdown - AFTER append loop. Current innerHTML:", selectElement.innerHTML); // REMOVED LOG
        selectElement.value = currentValue || 'all'; 
        // console.log(`[App.js] populateStoreFilterDropdown - Set dropdown value to: ${selectElement.value}`); // REMOVED LOG
    }

    // --- ADDED FUNCTION --- 
    toggleShoppingItemChecked(shoppingListItemId, isChecked) { // Parameter renamed for clarity
         console.log(`[App.js Log] toggleShoppingItemChecked called for item ID: ${shoppingListItemId}, checked: ${isChecked}`); // Added Log
        console.log(`DEBUG: toggleShoppingItemChecked called for item ${shoppingListItemId}, checked: ${isChecked}`); // Add log
        const activeList = this.getActiveList();
        if (!activeList || !Array.isArray(activeList.shoppingList)) {
            console.error("toggleShoppingItemChecked: Active list or shoppingList array not found.");
            return;
        }

        // const item = activeList.shoppingList.find(i => i.id === itemId); // Find by master ID - CHANGED
        const item = activeList.shoppingList.find(i => i.id === shoppingListItemId); // Find by UNIQUE shopping list item ID
        if (!item) {
            // console.error(`toggleShoppingItemChecked: Item ${itemId} not found in active list.`); // CHANGED
            console.error(`toggleShoppingItemChecked: Item ${shoppingListItemId} not found in active list.`);
            return;
        }

        // Update data
        item.checked = isChecked;
         console.log("[App.js Log] Updated item state:", JSON.parse(JSON.stringify(item))); // Added Deep Copy Log
        console.log(`DEBUG: Updated item ${shoppingListItemId} checked status to ${isChecked} in local data.`); // Add log

        // Persist change
        if (this._firestore && window.firestoreFunctions && window.firestoreFunctions.updateList) {
            const listDataToUpdate = { shoppingList: activeList.shoppingList };
            console.log(`DEBUG: Calling Firestore updateList for list ${activeList.id} after toggling item ${shoppingListItemId}.`); // Add log
            window.firestoreFunctions.updateList(activeList.id, listDataToUpdate)
                .then(() => {
                    console.log(`DEBUG: Firestore updated successfully for item ${shoppingListItemId} toggle.`); // Add log
                    // Firestore listener should ideally trigger render, but render immediately for responsiveness
                    this.renderShoppingList();
                })
                .catch(error => {
                    console.error(`Error updating list in Firestore after toggling item ${shoppingListItemId}:`, error);
                    // Revert local data change on error?
                    item.checked = !isChecked; // Revert
                    this.renderShoppingList(); // Re-render reverted state
                    alert("Failed to update item status in the cloud.");
                });
        } else {
            console.log("DEBUG: Firestore not available, saving locally and re-rendering."); // Add log
            this.saveData();
            this.renderShoppingList(); // Re-render UI based on updated local data
        }
    }
    // ---------------------

    // --- ADDED METHOD ---
    toggleArchiveButtonState() {
        if (!this.dom.archiveListBtn) {
            // console.warn("[App.js] toggleArchiveButtonState - Archive button DOM element not found.");
            return;
        }
        // Disable if no list is active OR if there is only one list left.
        this.dom.archiveListBtn.disabled = !this.activeListId || this.appData.lists.length <= 1;
    }
    // --------------------

    // --- ADDED METHOD --- 
    // Groups items from a shopping list array by store and then category
    groupShoppingListItems(shoppingListItems) {
        const grouped = {};

        if (!shoppingListItems || !Array.isArray(shoppingListItems)) {
            console.warn("[App.js] groupShoppingListItems - received invalid input:", shoppingListItems);
            return grouped; // Return empty object if input is invalid
        }

        shoppingListItems.forEach(item => {
            // Find the master store
            const masterStore = this.appData.masterStores.find(s => s.id === item.storeId);
            if (!masterStore) {
                console.warn(`[App.js] groupShoppingListItems - Could not find master store for item:`, item);
                return; // Skip item if store is missing
            }

            // Find the master category within the store
            const masterCategory = masterStore.categories.find(c => c.id === item.categoryId);
            if (!masterCategory) {
                console.warn(`[App.js] groupShoppingListItems - Could not find master category for item in store ${masterStore.name}:`, item);
                return; // Skip item if category is missing
            }

            // Initialize store group if it doesn't exist
            if (!grouped[item.storeId]) {
                grouped[item.storeId] = {
                    storeName: masterStore.name,
                    categories: {}
                };
            }

            // Initialize category group if it doesn't exist
            if (!grouped[item.storeId].categories[item.categoryId]) {
                grouped[item.storeId].categories[item.categoryId] = {
                    categoryName: masterCategory.name,
                    items: []
                };
            }

            // Add the item to the correct group
            grouped[item.storeId].categories[item.categoryId].items.push(item);
        });

        // console.log("[App.js] groupShoppingListItems - Grouped items result:", JSON.parse(JSON.stringify(grouped))); // Optional debug log
        return grouped;
    }
    // ---------------------

    // --- New Methods for Copy Items --- 

    openCopyItemsModal() {
        console.log("Opening Copy Items modal...");
        const modalElement = this.dom.modals.copyItems;
        const sourceSelect = this.dom.copySourceListSelect;
        const destinationSelect = this.dom.copyDestinationListSelect;
        const confirmButton = this.dom.confirmCopyItemsBtn;

        if (!modalElement || !sourceSelect || !destinationSelect || !confirmButton) { 
            console.error("Copy Items Modal Error: Missing one or more DOM elements.", { modal: !!modalElement, source: !!sourceSelect, dest: !!destinationSelect, confirm: !!confirmButton });
            alert("Error: Could not open the copy dialog. UI elements missing.");
            return; 
        }
        if (this.appData.lists.length < 2) { 
            alert("Need at least two lists to copy items."); 
            return; 
        } 
        
        console.log(`[CopyModal LOG] activeListId before populating source: ${this.activeListId}`); // <-- ADD LOG
        
        // --- Populate Source Select --- 
        sourceSelect.innerHTML = '';
        const sourcePlaceholder = document.createElement('option');
        sourcePlaceholder.value = "";
        sourcePlaceholder.textContent = "-- Selecciona origen --";
        sourcePlaceholder.disabled = true;
        // DO NOT set selected here - let the value setting handle it later
        sourceSelect.appendChild(sourcePlaceholder);

        // let activeListSelectedInSource = false; // <-- REMOVE THIS FLAG
        this.appData.lists.forEach(list => {
            const sourceOption = document.createElement('option');
            sourceOption.value = list.id;
            sourceOption.textContent = list.name;
            // Set selected attribute during creation if it matches active list
            // if (list.id === this.activeListId) { // <-- REMOVE logic from here
            //     console.log(`[CopyModal LOG] Setting option ${list.id} (${list.name}) selected = true`); // <-- REMOVE LOG
            //     sourceOption.selected = true;
            //     activeListSelectedInSource = true;
            // }
            sourceSelect.appendChild(sourceOption);
        });
        
        // --- Set the value AFTER populating ---
        if (this.activeListId && this.appData.lists.some(l => l.id === this.activeListId)) {
            console.log(`[CopyModal LOG] Setting sourceSelect.value to activeListId: ${this.activeListId}`); // <-- ADD LOG
            sourceSelect.value = this.activeListId; 
        } else {
             console.log(`[CopyModal LOG] activeListId (${this.activeListId}) is invalid or not found in lists, setting sourceSelect.value to ""`); // <-- ADD LOG
             sourceSelect.value = ""; // Default to placeholder if activeListId is bad
        }
        
        console.log(`[CopyModal LOG] After populating and setting value - sourceSelect.value: ${sourceSelect.value}`); // <-- ADD LOG
        console.log(`[CopyModal LOG] After populating and setting value - sourceSelect.selectedIndex: ${sourceSelect.selectedIndex}`); // <-- ADD LOG
        // ---------------------------------------
        
        // --- Populate Destination Select (based on initial source value) --- 
        const initialSourceId = sourceSelect.value; // Read the value that is actually selected now
        console.log(`[CopyModal LOG] Initial source ID for populating destination: ${initialSourceId}`); // <-- ADD LOG
        this.populateDestinationListSelect(initialSourceId); 
        // -----------------------------------------------------------

        // Attach the confirmation listener...
        const boundConfirmHandler = this.handleConfirmCopyItems.bind(this);
        // Use replaceWith to clear previous listeners reliably
        const newConfirmButton = confirmButton.cloneNode(true);
        confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);
        // confirmButton.replaceWith(confirmButton.cloneNode(true)); // Less safe if confirmButton reference is used elsewhere
        this.dom.confirmCopyItemsBtn = modalElement.querySelector('#confirm-copy-items-btn'); // Re-cache the new button
        this.dom.confirmCopyItemsBtn.addEventListener('click', boundConfirmHandler, { once: true });
        console.log("Attached { once: true } listener to confirm copy button.");

        // --- Open the modal BEFORE setting the value ---
        this.openModal('copyItems');
        // ----------------------------------------------

        // --- Set the value AFTER populating AND *after* modal is likely visible ---
        setTimeout(() => {
            if (this.activeListId && this.appData.lists.some(l => l.id === this.activeListId)) {
                console.log(`[CopyModal LOG - setTimeout] Setting sourceSelect.value to activeListId: ${this.activeListId}`); // <-- MOVE LOG
                sourceSelect.value = this.activeListId;
            } else {
                console.log(`[CopyModal LOG - setTimeout] activeListId (${this.activeListId}) is invalid or not found in lists, setting sourceSelect.value to ""`); // <-- MOVE LOG
                sourceSelect.value = ""; // Default to placeholder if activeListId is bad
            }

            console.log(`[CopyModal LOG - setTimeout] After setting value - sourceSelect.value: ${sourceSelect.value}`); // <-- MOVE LOG
            console.log(`[CopyModal LOG - setTimeout] After setting value - sourceSelect.selectedIndex: ${sourceSelect.selectedIndex}`); // <-- MOVE LOG
        }, 0); // Use a 0ms delay to push execution after current cycle
        // -----------------------------------------------------------------------
    }

    async handleConfirmCopyItems() {
        console.log("Confirm Copy Items button clicked.");
        const sourceListId = this.dom.copySourceListSelect?.value;
        const destinationListId = this.dom.copyDestinationListSelect?.value;
        const confirmButton = this.dom.confirmCopyItemsBtn;

        // --- Simplified Validation --- 
        if (!sourceListId) {
            alert("Please select a source list.");
            // Re-attach listener on validation failure
            if (confirmButton) confirmButton.addEventListener('click', this.handleConfirmCopyItems.bind(this), { once: true });
            return;
        }
        if (!destinationListId) {
            alert("Please select a destination list.");
            // Re-attach listener on validation failure
            if (confirmButton) confirmButton.addEventListener('click', this.handleConfirmCopyItems.bind(this), { once: true });
            return;
        }
        // No need to check if they are the same, UI prevents it via populateDestinationListSelect
        // --- End Simplified Validation ---
        
        console.log(`Attempting to copy items from ${sourceListId} to ${destinationListId}...`);
        confirmButton.disabled = true;
        confirmButton.textContent = 'Copiando...';

        try {
            const response = await fetch(`/api/lists/${destinationListId}/copy-from/${sourceListId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('Error response from server:', data);
                throw new Error(data.message || `Error ${response.status}`);
            }

            console.log('Copy successful:', data);
            alert(data.message || `Successfully copied ${data.itemsCopied} item(s).`);
            this.closeModal('copyItems');
            // List updates handled by Firestore listener

        } catch (error) {
            console.error('Failed to copy items:', error);
            alert(`Error copying items: ${error.message}`);
            // Re-enable button and re-attach listener on error so user can retry
            // *** REMOVE button reset from here ***
            // if (confirmButton) {
            //     confirmButton.disabled = false;
            //     confirmButton.textContent = 'Copiar Items';
            //     confirmButton.addEventListener('click', this.handleConfirmCopyItems.bind(this), { once: true });
            //     console.log("Re-attached listener to confirm copy button after error.");
            // }
        } finally {
             // ALWAYS reset button state here
             if (confirmButton) {
                 confirmButton.disabled = false;
                 confirmButton.textContent = 'Copiar Items';
                 // Re-attach listener ONLY if the modal is still open (likely due to an error)
                 if (this.dom.modals.copyItems?.style.display !== 'none') {
                     confirmButton.addEventListener('click', this.handleConfirmCopyItems.bind(this), { once: true });
                     console.log("Re-attached listener to confirm copy button after error/modal still open.");
                 }
             }
        }
    }

    // --- New helper to populate the destination list dropdown --- 
    populateDestinationListSelect(excludeListId) {
        const destinationSelect = this.dom.copyDestinationListSelect;
        if (!destinationSelect) return;
        
        const currentDestValue = destinationSelect.value; // Remember current selection if possible
        destinationSelect.innerHTML = ''; // Clear

        // Add placeholder
        const destPlaceholder = document.createElement('option');
        destPlaceholder.value = "";
        destPlaceholder.textContent = "-- Selecciona destino --";
        destPlaceholder.disabled = true;
        destPlaceholder.selected = true;
        destinationSelect.appendChild(destPlaceholder);

        let canRestoreSelection = false;
        this.appData.lists.forEach(list => {
            if (list.id !== excludeListId) { // Exclude the source list
                const destOption = document.createElement('option');
                destOption.value = list.id;
                destOption.textContent = list.name;
                destinationSelect.appendChild(destOption);
                // Check if the current selection can be restored
                if (list.id === currentDestValue) {
                    canRestoreSelection = true;
                }
            }
        });
        
        // Restore previous selection if it's still valid
        if (canRestoreSelection) {
            destinationSelect.value = currentDestValue;
        } else {
             destinationSelect.value = ""; // Default to placeholder
        }
    }
    
    // --- Event handler for source list change --- 
    handleSourceListChangeInModal(event) {
        const selectedSourceId = event.target.value;
        // Repopulate destination, excluding the newly selected source
        this.populateDestinationListSelect(selectedSourceId);
    }
} // Ensure the class definition is properly closed