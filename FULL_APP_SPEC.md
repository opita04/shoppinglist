# Shopping List App — Full Specification

## Overview
Create a modern, mobile-friendly Shopping List web application that allows users to manage multiple shopping lists, organize items by stores and categories, and sync data in real-time using Firebase Firestore. The app should support archiving, importing/exporting data, and provide a smooth, responsive user experience.

---

## Core Features

### 1. User Interface
- **Mobile-first, responsive design** using HTML5, CSS3 (Flexbox/Grid), and modern best practices.
- **Header** with:
  - App title.
  - Dropdown to select the active shopping list.
  - Buttons: New List, Archive List, View Archived, Export, Import.
- **Main Panels:**
  - **Item Management Panel** ("Gestión de Artículos"):
    - Add/Edit/Delete stores.
    - Add/Edit/Delete categories within stores.
    - Add/Edit/Delete items within categories.
    - Search/filter items and stores.
    - Sort items/categories/stores manually or alphabetically.
    - Visual indicator for items already on the active shopping list.
    - Button to add/remove items to/from the active shopping list.
  - **Shopping List Panel**:
    - Displays items grouped by store and category for the selected list.
    - Check/uncheck items as bought.
    - Remove items from the list.
    - Copy items from another list.
    - Show active list name.
- **Archived Lists Panel**:
  - View, restore, or permanently delete archived lists.
- **Modals** for:
  - Creating a new list.
  - Adding/editing stores, categories, and items.
  - Copying items between lists.
  - Import/export confirmation.

### 2. Data Model
- **Shopping Lists**: Each with a unique ID, name, creation date, and an array of shopping list items.
- **Master Stores**: Each with a unique ID, name, order, and an array of categories.
- **Categories**: Each with a unique ID, name, order, and an array of items.
- **Items**: Each with a unique ID, name, order, and optional notes.
- **Shopping List Items**: Reference master item ID, store ID, category ID, name, checked status, and notes.

### 3. Real-Time Sync & Persistence
- Use **Firebase Firestore** for all data storage and real-time updates.
- Support for offline mode (localStorage fallback if Firebase is unavailable).
- All CRUD operations (create, read, update, delete) for lists, stores, categories, and items must sync with Firestore.

### 4. Import/Export
- Export all app data as a JSON file.
- Import data from a JSON file, with version and structure validation.
- Warn user that import will overwrite all current data.

### 5. Archiving
- Archive shopping lists (move from active to archived).
- Restore archived lists.
- Permanently delete archived lists.

### 6. Copy Items Between Lists
- Modal to select source and destination lists.
- Copy items from one list to another, avoiding duplicates.

### 7. Accessibility & Usability
- Keyboard navigation for all controls and modals.
- ARIA labels and roles for accessibility.
- Tooltips for all action buttons.
- Visual feedback for actions (e.g., item added/removed, list archived).

### 8. Error Handling & Logging
- User-friendly error messages for all failed operations.
- Console logs for debugging (can be toggled on/off).
- Global error handler for Firebase initialization.

---

## Technical Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+), no frameworks required (but you may use a lightweight library if justified).
- **Backend:** No backend server required for core app (Firebase handles data). If needed, a simple Node.js/Express server for custom API endpoints (e.g., for advanced copy logic).
- **Database:** Firebase Firestore (NoSQL, real-time).
- **Hosting:** Firebase Hosting.
- **Version Control:** Git, GitHub.

---

## Project Structure Example

```
/Shopping List
  /public
    index.html
    app.js
    styles.css
    firebase.mjs
  firebase.json
  firestore.rules
  firestore.indexes.json
  server.js (optional, for custom endpoints)
  package.json
  README.md
```

---

## Detailed Requirements

### UI/UX
- Use a clean, modern, mobile-first layout.
- All actions (add, edit, delete, archive, restore, copy) should be accessible via buttons or modals.
- Use color and icons to distinguish actions and states (e.g., checked items, archived lists).
- Provide clear feedback for all user actions.

### Data Flow
- On app load, initialize Firebase and fetch all data (lists, stores, archived lists).
- When the user switches the active list, update both the shopping list panel and the item management panel to reflect the new context.
- All changes (add, edit, delete, archive, restore) should update Firestore and the UI in real-time.
- If Firestore is unavailable, fall back to localStorage and notify the user.

### Code Quality
- Use modular, well-documented code.
- Separate concerns: Firebase logic, UI rendering, event handling.
- Use ES6 classes or modules for structure.
- Include comments for all major functions and complex logic.

### Security
- Use Firestore security rules to restrict access (read/write) as appropriate.
- Do not expose sensitive keys in public repos (use Firebase's client-safe config).

### Testing
- Manual testing for all features.
- (Optional) Add automated tests for core logic.

---

## Bonus Features (Optional)
- User authentication (Google, email/password).
- Shareable list links (for family/collaborators).
- Drag-and-drop reordering of stores, categories, and items.
- PWA support (installable, offline-first).
- Dark mode toggle.

---

## Deliverables
- Complete source code in a GitHub repository.
- Deployed app on Firebase Hosting.
- README with setup instructions, features, and screenshots.

---

## Example User Stories

- As a user, I can create multiple shopping lists and switch between them.
- As a user, I can add stores, categories, and items, and organize them as I like.
- As a user, I can add items from the master list to my shopping list and see which items are already included.
- As a user, I can archive old lists and restore them later if needed.
- As a user, I can export my data for backup and import it on another device.
- As a user, I can copy items from one list to another to save time.

---

## References
- [Firebase Web Docs](https://firebase.google.com/docs/web/setup)
- [Firestore Data Model](https://firebase.google.com/docs/firestore/data-model)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)
- [MDN Web Docs: HTML, CSS, JS](https://developer.mozilla.org/)

---