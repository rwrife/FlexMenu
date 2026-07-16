# FlexMenu JS 🚀

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![NPM version](https://img.shields.io/npm/v/flexmenu.svg?style=flat)](https://www.npmjs.com/package/flexmenu)
[![TypeScript Support](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

**FlexMenu JS** is a modern, lightweight, type-safe, and zero-dependency flexible navigation bar component that implements the **Priority Plus** layout pattern. When menu items overflow their horizontal container, FlexMenu automatically moves them into a customizable "More" dropdown menu. 

Designed for high-performance and modern web applications, it utilizes `ResizeObserver` (rather than window resize events) to instantly recalculate element layout, supports WAI-ARIA keyboard and screen reader accessibility guidelines, and is compatible with any JavaScript framework (React, Vue, Angular, Svelte) or vanilla environment.

---

## Key Features

- **Zero Runtime Dependencies**: Ultra lightweight and self-contained.
- **TypeScript Support**: Written in TypeScript with full declaration maps included.
- **ResizeObserver-powered**: Triggers layout recalculations only when the container bounds change, avoiding heavy page reflow loops.
- **WAI-ARIA Accessibility**: Complete keyboard navigation (arrows, Space, Enter, Escape, Tab closing) and screen-reader support out of the box.
- **Dynamic Content Support**: Simple APIs to recalculate widths when menu items are added, removed, or translated dynamically.
- **Framework Agnostic**: Integrates seamlessly with React, Vue, Angular, Svelte, or plain HTML.
- **Customizable Styling**: Uses CSS Custom Properties (variables) for effortless skinning and theme setups.
- **Sticky Layout Option**: Includes optional built-in sticky scroll behavior with height-compensating spacers to prevent layout shifting.

---

## Installation

### Via npm
```bash
npm install flexmenu
```

### Via CDN (Direct Browser Script)
Insert the script and CSS directly into your HTML:
```html
<link rel="stylesheet" href="https://unpkg.com/flexmenu/dist/style.css">
<script src="https://unpkg.com/flexmenu/dist/flexmenu.umd.js"></script>
```

---

## Quick Start

### 1. HTML Markup
Create a simple unordered list. You can optionally include a `nav-more` element or let FlexMenu generate one automatically.

```html
<ul id="nav" class="flexmenu-nav">
  <li><a href="#home">Home</a></li>
  <li><a href="#services">Services</a></li>
  <li><a href="#portfolio">Portfolio</a></li>
  <li><a href="#blog">Blog</a></li>
  <li><a href="#contact">Contact Us</a></li>
  <!-- FlexMenu will automatically append the "More" dropdown item here if it overflows -->
</ul>
```

### 2. Stylesheets
Import the default structural layout stylesheet:
```javascript
import 'flexmenu/style.css';
```

### 3. JavaScript / TypeScript
Instantiate the `FlexMenu` class:
```javascript
import { FlexMenu } from 'flexmenu';

const menu = new FlexMenu('#nav', {
  debounceTime: 50,
  sticky: true
});
```

---

## API Reference

### Configuration Options

You can customize `FlexMenu` by passing an options object to the constructor:

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `itemSelector` | `string` | `'> li:not(.nav-more)'` | CSS selector for individual menu items. |
| `moreSelector` | `string` | `'.nav-more'` | CSS selector for the "More" container element. |
| `moreContainerSelector` | `string` | `'ul'` | CSS selector for the dropdown list inside the "More" item. |
| `moreClass` | `string` | `'nav-more'` | Class added to the "More" list item. |
| `fixClass` | `string` | `'fix'` | Class applied to the navbar when sticky scrolling activates. |
| `openClass` | `string` | `'is-open'` | Class applied to open the dropdown menu. |
| `debounceTime` | `number` | `16` | Debounce time (ms) for resize calculations. |
| `sticky` | `boolean` | `false` | Enable scroll-to-stick/sticky bar behavior. |
| `moreItemTemplate` | `string \| (() => HTMLElement)` | *(Default HTML)* | Custom HTML markup string or builder function for generating the "More" trigger if it is not present in the markup. |

#### Callbacks
- **`onRefresh(instance: FlexMenu)`**: Fired whenever the menu redistributes items.
- **`onOverflow(item: HTMLElement)`**: Fired when an item overflows and moves to the dropdown.
- **`onUnderflow(item: HTMLElement)`**: Fired when an item fits again and returns to the menu bar.

### Instance Methods

- **`refresh()`**: Manually recalculates layout and redistributes items. Useful for single page applications.
- **`measureWidths()`**: Recalculates the cached horizontal widths of all items. Call this if text content or font sizing changes dynamically.
- **`toggleDropdown()`**: Toggles the open state of the "More" dropdown.
- **`openDropdown()`**: Opens the "More" dropdown.
- **`closeDropdown()`**: Closes the "More" dropdown.
- **`destroy()`**: Dismantles the component, cleans up observers, detaches event listeners, and restores the original DOM markup structure.

---

## Styling & Themes

FlexMenu uses CSS variables for easy customization. You can override these variables in your own stylesheet:

```css
#nav {
  --flexmenu-bg: #1e293b;            /* Nav bar background */
  --flexmenu-text: #f1f5f9;          /* Font color */
  --flexmenu-hover-bg: #3b82f6;       /* Item hover background */
  --flexmenu-hover-text: #ffffff;     /* Item hover text */
  --flexmenu-height: 60px;           /* Navigation bar height */
  
  --flexmenu-dropdown-bg: #334155;    /* Dropdown background */
  --flexmenu-dropdown-text: #cbd5e1;  /* Dropdown font color */
  --flexmenu-dropdown-hover-bg: #475569; /* Dropdown hover background */
}
```

---

## Framework Integrations

### React Integration
In React, instantiate `FlexMenu` inside a `useEffect` hook and remember to destroy the instance on unmount to prevent memory leaks:

```tsx
import React, { useEffect, useRef } from 'react';
import { FlexMenu } from 'flexmenu';
import 'flexmenu/style.css';

export function Navigation() {
  const navRef = useRef<HTMLUListElement>(null);
  const instanceRef = useRef<FlexMenu | null>(null);

  useEffect(() => {
    if (navRef.current) {
      instanceRef.current = new FlexMenu(navRef.current, {
        sticky: false
      });
    }
    return () => {
      instanceRef.current?.destroy();
    };
  }, []);

  return (
    <ul ref={navRef} id="nav" className="flexmenu-nav">
      <li><a href="#">Home</a></li>
      <li><a href="#">Shop</a></li>
      <li><a href="#">Contact</a></li>
    </ul>
  );
}
```

### Vue 3 Integration
In Vue 3, use `onMounted` and `onUnmounted` lifecycle hooks:

```vue
<template>
  <ul ref="navRef" id="nav" class="flexmenu-nav">
    <li><a href="#">Home</a></li>
    <li><a href="#">Products</a></li>
    <li><a href="#">About</a></li>
  </ul>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { FlexMenu } from 'flexmenu';
import 'flexmenu/style.css';

const navRef = ref(null);
let menuInstance = null;

onMounted(() => {
  if (navRef.value) {
    menuInstance = new FlexMenu(navRef.value);
  }
});

onUnmounted(() => {
  if (menuInstance) {
    menuInstance.destroy();
  }
});
</script>
```

---

## Accessibility (WAI-ARIA)

FlexMenu is fully accessible and keyboard-navigable:
- **`aria-haspopup="true"`** and **`aria-expanded`** are added to the dropdown trigger automatically.
- **`aria-controls`** connects the trigger to the dropdown list.
- **`aria-hidden="true"`** hides the "More" dropdown trigger when it is not needed.
- **Keyboard Navigation**:
  - **Enter** / **Space** / **ArrowDown**: Opens the dropdown and focuses the first item.
  - **ArrowDown** / **ArrowUp**: Cycle focus through dropdown links (wraps around).
  - **Home** / **End**: Focus first / last item in the dropdown.
  - **Escape**: Closes the dropdown and returns focus to the trigger.
  - **Tab**: Closes the dropdown and lets focus exit naturally.
  - **Clicking Outside**: Closes the dropdown.

---

## License

MIT License. Feel free to use in personal or commercial projects.
