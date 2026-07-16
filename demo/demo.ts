import { FlexMenu } from '../src/index';

document.addEventListener('DOMContentLoaded', () => {
  const navEl = document.getElementById('nav');
  const resizableWrapper = document.getElementById('resizable-menu-wrapper');
  const widthSlider = document.getElementById('width-slider') as HTMLInputElement;
  const widthDisplay = document.getElementById('width-display');
  const themeButtons = document.querySelectorAll('.btn-theme');
  const presetButtons = document.querySelectorAll('.btn-preset');
  const btnAddItem = document.getElementById('btn-add-item');
  const itemInput = document.getElementById('item-input') as HTMLInputElement;
  const activeItemsList = document.getElementById('active-items-list');
  const logsList = document.getElementById('logs-list');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  if (!navEl || !resizableWrapper || !widthSlider || !widthDisplay || !logsList) {
    console.error('FlexMenu Demo: Crucial DOM elements missing.');
    return;
  }

  let flexMenuInstance: FlexMenu | null = null;

  // --- Logger Helper ---
  function addLog(message: string, type: 'system' | 'overflow' | 'underflow' = 'system') {
    const time = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerHTML = `[${time}] ${message}`;
    logsList?.appendChild(entry);
    if (logsList) {
      logsList.scrollTop = logsList.scrollHeight;
    }
  }

  // --- Initialize FlexMenu ---
  function initMenu() {
    if (flexMenuInstance) {
      flexMenuInstance.destroy();
      addLog('[System] Destroying previous FlexMenu instance...', 'system');
    }

    addLog('[System] Creating new FlexMenu instance...', 'system');
    
    flexMenuInstance = new FlexMenu('#nav', {
      sticky: false, // Turned off for inside-page demo box
      onRefresh: (instance) => {
        const w = Math.round(instance.menuElement.getBoundingClientRect().width);
        addLog(`[System] Menu refreshed (Container width: ${w}px)`, 'system');
      },
      onOverflow: (item) => {
        const text = item.textContent?.replace(/[✗\s]+/g, '').trim() || 'Item';
        addLog(`[Overflow] Item "${text}" collapsed into dropdown`, 'overflow');
      },
      onUnderflow: (item) => {
        const text = item.textContent?.replace(/[✗\s]+/g, '').trim() || 'Item';
        addLog(`[Underflow] Item "${text}" restored to menu bar`, 'underflow');
      }
    });

    updateItemListUI();
  }

  // --- Item List Manager UI ---
  function updateItemListUI() {
    if (!activeItemsList || !flexMenuInstance) return;
    activeItemsList.innerHTML = '';

    // Retrieve all top-level items representing the menu structure
    // We access the original items tracked inside the instance
    const items = (flexMenuInstance as any).originalItems as HTMLElement[];
    
    items.forEach((item, index) => {
      const text = item.querySelector('a')?.textContent || item.textContent || `Item ${index + 1}`;
      
      const li = document.createElement('li');
      li.className = 'item-list-entry';
      li.innerHTML = `
        <span>${text}</span>
        <button class="btn-remove-item" data-index="${index}" title="Remove item">×</button>
      `;
      activeItemsList.appendChild(li);
    });

    // Attach click events to remove buttons
    document.querySelectorAll('.btn-remove-item').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const index = parseInt(target.getAttribute('data-index') || '0', 10);
        removeItem(index);
      });
    });
  }

  function removeItem(index: number) {
    if (!flexMenuInstance) return;
    const items = (flexMenuInstance as any).originalItems as HTMLElement[];
    const itemToRemove = items[index];

    if (itemToRemove) {
      const text = itemToRemove.querySelector('a')?.textContent || itemToRemove.textContent || 'Item';
      addLog(`[System] Removing menu item: "${text}"`, 'system');
      itemToRemove.remove();
      initMenu();
    }
  }

  // --- Add Item Handler ---
  if (btnAddItem && itemInput) {
    btnAddItem.addEventListener('click', () => {
      const text = itemInput.value.trim();
      if (!text) return;

      addLog(`[System] Adding menu item: "${text}"`, 'system');

      // Create new DOM element
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = 'javascript:void(0)';
      a.textContent = text;
      li.appendChild(a);

      // Insert it before the "More" item
      const moreItem = navEl.querySelector('.nav-more');
      if (moreItem) {
        navEl.insertBefore(li, moreItem);
      } else {
        navEl.appendChild(li);
      }

      itemInput.value = '';
      initMenu();
    });

    itemInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        btnAddItem.click();
      }
    });
  }

  // --- Container Width Slider ---
  widthSlider.addEventListener('input', (e) => {
    const val = (e.target as HTMLInputElement).value;
    widthDisplay.textContent = val;
    resizableWrapper.style.width = `${val}px`;
    // ResizeObserver inside FlexMenu handles the reflow automatically!
  });

  // --- Device presets ---
  presetButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLButtonElement;
      const width = target.getAttribute('data-width') || '1000';
      widthSlider.value = width;
      widthDisplay.textContent = width;
      resizableWrapper.style.width = `${width}px`;
      addLog(`[System] Preset applied: Width ${width}px`, 'system');
    });
  });

  // --- Theme Toggles ---
  themeButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      themeButtons.forEach((b) => b.classList.remove('active'));
      const target = e.currentTarget as HTMLButtonElement;
      target.classList.add('active');

      const theme = target.getAttribute('data-theme') || 'obsidian';
      document.body.className = '';
      document.body.classList.add(`theme-${theme}`);
      addLog(`[System] Theme switched to: ${theme.toUpperCase()}`, 'system');

      // Re-measure widths since padding / font styles can change the size of components
      setTimeout(() => {
        if (flexMenuInstance) {
          addLog('[System] Re-measuring item sizes for new theme...', 'system');
          flexMenuInstance.measureWidths();
          flexMenuInstance.refresh();
        }
      }, 50);
    });
  });

  // --- Tab Switcher ---
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      tabButtons.forEach((b) => b.classList.remove('active'));
      tabContents.forEach((c) => c.classList.remove('active'));

      const target = e.currentTarget as HTMLButtonElement;
      target.classList.add('active');

      const tabId = target.getAttribute('data-tab') || 'vanilla';
      const content = document.getElementById(`tab-${tabId}`);
      content?.classList.add('active');
    });
  });

  // Start initial menu instantiation
  initMenu();
});
