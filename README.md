# Shopping List Web App (v2)

A modern, mobile-first web application built with vanilla HTML, CSS, and JavaScript for managing shopping lists.

## Features

- **Multiple Lists**: Create, name, switch between, and archive multiple shopping lists.
- **Master Item List**: Maintain a central repository of items organized by store and category.
- **Store Management**: Add, edit, and delete stores in the master list.
- **Category Management**: Add, edit, and delete categories within each store.
- **Item Management**: Add, edit, and delete items within categories.
- **Shopping List Population**: Easily add items from the master list to the active shopping list.
- **Check Off Items**: Mark items as purchased in the shopping list view.
- **Drag & Drop Reordering**: Reorder items within categories in both the master list and the shopping list.
- **Move Items**: Edit items to move them between different stores and categories.
- **Archiving**: Keep completed lists for reference without cluttering the active lists.
- **Persistence**: All data (lists, stores, categories, items, archived lists) is saved in `localStorage`.
- **Responsive Design**: Mobile-first layout that adapts to desktop screens.

## Tech Stack

- HTML5
- CSS3 (using CSS Variables)
- Vanilla JavaScript (ES6+ Classes)

No external frameworks, libraries, or build tools are used.

## Project Structure

- `index.html`: The main HTML file containing the structure, panels, modals, and templates.
- `styles.css`: Contains all the CSS rules for styling and layout, following a mobile-first approach.
- `app.js`: Contains all the JavaScript logic, organized within a `ShoppingListApp` class. It handles:
    - Data management and `localStorage` interaction.
    - Rendering the UI based on the current data state.
    - Event handling for user interactions (clicks, drag & drop, etc.).
    - Modal operations.

## How to Run

1. Clone or download the project files.
2. Open the `index.html` file directly in your web browser.

That's it! The application runs entirely client-side.

## Key Concepts in `app.js`

- **Class-based Structure**: Logic is encapsulated within the `ShoppingListApp` class.
- **Data Separation**: Master item data (`appData.masterStores`) is kept separate from active shopping list data (`appData.lists[...].shoppingList`).
- **DOM Caching**: Key DOM elements are cached in `this.dom` for performance.
- **Templating**: HTML `<template>` elements are used for creating dynamic UI components.
- **Event Delegation**: Event listeners are attached to parent containers (`storeContainers`, `shoppingListItemsContainer`, etc.) to handle events on dynamically added elements efficiently.
- **Drag and Drop API**: Uses the native HTML Drag and Drop API for item reordering.
- **LocalStorage**: Saves the entire application state (`appData`) as a JSON string. 