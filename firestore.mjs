import { db } from './public/firebase.mjs';
import {
    collection,
    addDoc,
    deleteDoc,
    doc,
    onSnapshot,
    updateDoc,
    getDoc,
    setDoc,
    query,
    orderBy
} from 'firebase/firestore';

// Collection references
const listsRef = collection(db, 'lists');
const masterStoresRef = collection(db, 'masterStores');
const archivedListsRef = collection(db, 'archivedLists');

// List operations
export const createList = async (name) => {
    // console.log('[Firestore] Creating new list:', name);
    try {
        const docRef = await addDoc(listsRef, {
            name,
            createdAt: new Date(),
            shoppingList: []
        });
        // console.log('[Firestore] List created with ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('[Firestore] Error creating list:', error);
        throw error;
    }
};

export const updateList = async (listId, data) => {
    // console.log('[Firestore] Updating list:', listId, 'with data:', data);
    console.log(`[Firestore Log] updateList called. listId: ${listId} data:`, data);
    try {
        await updateDoc(doc(db, 'lists', listId), data);
        // console.log('[Firestore] List updated successfully');
        console.log(`[Firestore Log] updateList successful for listId: ${listId}`);
    } catch (error) {
        console.error(`[Firestore Error] Error updating list ${listId}:`, error);
        console.error(`[Firestore Log] updateList failed for listId: ${listId} Error:`, error);
        throw error;
    }
};

export const deleteList = async (listId) => {
    // console.log('[Firestore] Deleting list:', listId);
    try {
        await deleteDoc(doc(db, 'lists', listId));
        // console.log('[Firestore] List deleted successfully');
    } catch (error) {
        console.error('[Firestore] Error deleting list:', error);
        throw error;
    }
};

export const subscribeToList = (listId, callback) => {
    // console.log('[Firestore] Subscribing to list:', listId);
    return onSnapshot(doc(db, 'lists', listId), (doc) => {
        // console.log('[Firestore] List update received:', doc.data());
        callback(doc.data());
    }, (error) => {
        console.error('[Firestore] Error in list subscription:', error);
    });
};

// Function to get a single list document's data once
export const getList = async (listId) => {
    // console.log(`[Firestore Log] getList called for listId: ${listId}`);
    try {
        const listDocRef = doc(db, 'lists', listId);
        const listDocSnap = await getDoc(listDocRef);

        if (listDocSnap.exists()) {
            // console.log(`[Firestore Log] getList successful for listId: ${listId} Data:`, JSON.parse(JSON.stringify(listDocSnap.data())));
            return listDocSnap.data();
        } else {
            console.warn(`[Firestore] No shopping list found with ID: ${listId}`);
            throw new Error(`List with ID ${listId} not found`);
        }
    } catch (error) {
        console.error('[Firestore] Error getting list:', error);
        console.error(`[Firestore Log] getList failed for listId: ${listId} Error:`, error);
        throw error;
    }
};

// Master stores operations
export const addMasterStore = async (name) => {
    // console.log('[Firestore] Adding master store:', name);
    try {
        const docRef = await addDoc(masterStoresRef, {
            name,
            categories: []
        });
        // console.log('[Firestore] Master store added with ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('[Firestore] Error adding master store:', error);
        throw error;
    }
};

export const updateMasterStore = async (storeId, data) => {
    // console.log('[Firestore] Updating master store:', storeId, 'with data:', data);
    try {
        await updateDoc(doc(db, 'masterStores', storeId), data);
        // console.log('[Firestore] Master store updated successfully');
    } catch (error) {
        console.error('[Firestore] Error updating master store:', error);
        throw error;
    }
};

export const deleteMasterStore = async (storeId) => {
    // console.log('[Firestore] Deleting master store:', storeId);
    try {
        await deleteDoc(doc(db, 'masterStores', storeId));
        // console.log('[Firestore] Master store deleted successfully');
    } catch (error) {
        console.error('[Firestore] Error deleting master store:', error);
        throw error;
    }
};

export const subscribeToMasterStores = (callback) => {
    // console.log('[Firestore] Subscribing to master stores');
    const q = query(masterStoresRef, orderBy('name'));
    return onSnapshot(q, (snapshot) => {
        const stores = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        // console.log('[Firestore] Master stores update received:', stores);
        callback(stores);
    }, (error) => {
        console.error('[Firestore] Error in master stores subscription:', error);
    });
};

// Archived lists operations
export const archiveList = async (listId) => {
    // console.log('[Firestore] Archiving list:', listId);
    try {
        // Get the list document
        const listDocRef = doc(db, 'lists', listId);
        const listDocSnap = await getDoc(listDocRef);

        if (!listDocSnap.exists()) {
            throw new Error(`List with ID ${listId} not found`);
        }

        // Add to archived lists
        const listData = listDocSnap.data();
        await addDoc(archivedListsRef, {
            ...listData,
            originalId: listId,
            archivedAt: new Date()
        });

        // Delete from active lists
        await deleteDoc(listDocRef);
        // console.log('[Firestore] List archived successfully');
    } catch (error) {
        console.error('[Firestore] Error archiving list:', error);
        throw error;
    }
};

export const restoreArchivedList = async (listId) => {
    // console.log('[Firestore] Restoring archived list:', listId);
    try {
        // Get the archived list document
        const archivedDocRef = doc(db, 'archivedLists', listId);
        const archivedDocSnap = await getDoc(archivedDocRef);

        if (!archivedDocSnap.exists()) {
            throw new Error(`Archived list with ID ${listId} not found`);
        }

        // Get the data and remove archivedAt field
        const archivedData = archivedDocSnap.data();
        const { archivedAt, originalId, ...dataToRestore } = archivedData;

        // Add back to active lists
        let newDocRef;
        if (originalId) {
            // Try to use original ID if possible
            newDocRef = doc(db, 'lists', originalId);
            await setDoc(newDocRef, dataToRestore);
        } else {
            // Otherwise create a new document
            newDocRef = await addDoc(listsRef, dataToRestore);
        }

        // Delete from archived lists
        await deleteDoc(archivedDocRef);
        // console.log('[Firestore] List restored successfully with ID:', newDocRef.id);
        return originalId || newDocRef.id;
    } catch (error) {
        console.error('[Firestore] Error restoring archived list:', error);
        throw error;
    }
};

export const subscribeToArchivedLists = (callback) => {
    // console.log('[Firestore] Subscribing to archived lists');
    const q = query(archivedListsRef, orderBy('archivedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const lists = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        // console.log('[Firestore] Archived lists update received:', lists);
        callback(lists);
    }, (error) => {
        console.error('[Firestore] Error in archived lists subscription:', error);
    });
};

// Real-time updates
export const subscribeToAllData = (callbacks) => {
    // console.log('[Firestore] Setting up all data subscriptions');
    const unsubscribers = [
        subscribeToMasterStores(callbacks.onStoresUpdate),
        subscribeToArchivedLists(callbacks.onArchivedListsUpdate)
    ];

    // Subscribe to all lists
    const q = query(listsRef, orderBy('createdAt', 'desc'));
    const listsUnsubscribe = onSnapshot(q, (snapshot) => {
        const lists = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        // console.log('[Firestore] All lists update received:', lists);
        callbacks.onListsUpdate(lists);
    }, (error) => {
        console.error('[Firestore] Error in all lists subscription:', error);
    });

    unsubscribers.push(listsUnsubscribe);

    return () => {
        // console.log('[Firestore] Cleaning up all subscriptions');
        unsubscribers.forEach(unsubscribe => unsubscribe());
    };
};

// --- New Function to Handle Copy Logic --- 
export const copyListItems = async (sourceListId, destinationListId) => {
    // console.log(`[Firestore Log] copyListItems called: Copy from ${sourceListId} to ${destinationListId}`);
    try {
        // 1. Fetch lists using existing getList (which has access to db)
        // console.log('[Firestore Log] copyListItems - Fetching lists...');
        const [sourceList, destinationList] = await Promise.all([
            getList(sourceListId), // Call internal getList
            getList(destinationListId) // Call internal getList
        ]);

        // getList already throws if not found, but double-check
        if (!sourceList || !destinationList) {
            throw new Error('Source or destination list not found during copy operation.');
        }
        // console.log('[Firestore Log] copyListItems - Lists fetched.');

        // 2. Ensure shoppingList arrays exist
        const sourceItems = sourceList.shoppingList || [];
        const destinationItems = destinationList.shoppingList || [];
        // console.log(`[Firestore Log] copyListItems - Source items count: ${sourceItems.length}, Dest items count: ${destinationItems.length}`);

        // 3. Duplicate Check (comparing based on itemId)
        const destinationItemIds = new Set(destinationItems.map(item => item.itemId)); // Create a Set of existing destination item *IDs*
        const itemsToCopy = sourceItems.filter(item => !destinationItemIds.has(item.itemId)); // Keep source items whose itemId is NOT in the destination set
        // console.log(`[Firestore Log] copyListItems - Items to copy count (using itemId): ${itemsToCopy.length}`);

        if (itemsToCopy.length === 0) {
            // console.log(`[Firestore Log] copyListItems - No new items to copy.`);
            return { success: true, itemsCopied: 0, message: 'No new items to copy.' };
        }

        // 4. Combine and Update
        const updatedShoppingList = [...destinationItems, ...itemsToCopy];
        // console.log(`[Firestore Log] copyListItems - Updating destination list ${destinationListId} with ${updatedShoppingList.length} total items.`);
        await updateList(destinationListId, { shoppingList: updatedShoppingList }); // Call internal updateList
        // console.log(`[Firestore Log] copyListItems - Update successful for ${destinationListId}.`);

        return {
            success: true,
            itemsCopied: itemsToCopy.length,
            message: `Successfully copied ${itemsToCopy.length} item(s).`
        };

    } catch (error) {
        console.error(`[Firestore Error] Error during copyListItems (${sourceListId} -> ${destinationListId}):`, error);
        console.error(`[Firestore Log] copyListItems failed: ${error.message}`);
        // Re-throw a more specific error or return an error object
        throw new Error(`Failed to copy items: ${error.message}`);
        // Or: return { success: false, error: error.message };
    }
};

// ... rest of the file 