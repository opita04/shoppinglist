import { db } from './firebase.js';
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
    console.log('[Firestore Log] updateList called. listId:', listId, 'data:', JSON.parse(JSON.stringify(data)));
    try {
        await updateDoc(doc(db, 'lists', listId), data);
        // console.log('[Firestore] List updated successfully');
    } catch (error) {
        console.error('[Firestore] Error updating list:', error);
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