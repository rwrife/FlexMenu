export interface FlexMenuOptions {
  /** CSS selector for menu items to be managed. Default: '> li:not(.nav-more)' */
  itemSelector?: string;
  /** CSS selector for the "More" menu item. Default: '.nav-more' */
  moreSelector?: string;
  /** CSS selector for the dropdown list container inside the "More" item. Default: 'ul' */
  moreContainerSelector?: string;
  /** CSS class to apply to the "More" item. Default: 'nav-more' */
  moreClass?: string;
  /** CSS class applied to the menu when it becomes fixed/sticky. Default: 'fix' */
  fixClass?: string;
  /** CSS class applied to open the dropdown menu. Default: 'is-open' */
  openClass?: string;
  /** Debounce time in milliseconds for handling resize events. Default: 16 */
  debounceTime?: number;
  /** Enable scroll-to-stick / sticky behavior. Default: false */
  sticky?: boolean;
  /** Custom markup or callback for the "More" item if it doesn't exist. */
  moreItemTemplate?: string | (() => HTMLElement);
  /** Callback triggered when the menu finishes refreshing. */
  onRefresh?: (instance: FlexMenu) => void;
  /** Callback triggered when an item is moved into the "More" dropdown. */
  onOverflow?: (item: HTMLElement) => void;
  /** Callback triggered when an item is moved back into the main menu. */
  onUnderflow?: (item: HTMLElement) => void;
}

export class FlexMenu {
  public menuElement: HTMLElement;
  public options: Required<FlexMenuOptions>;
  
  private originalItems: HTMLElement[] = [];
  private itemWidths = new WeakMap<HTMLElement, number>();
  private moreItem!: HTMLElement;
  private moreContainer!: HTMLElement;
  private moreTrigger!: HTMLElement;
  private moreWidth = 0;
  
  private resizeObserver: ResizeObserver | null = null;
  private debounceTimer: number | null = null;
  private isDropdownOpen = false;
  
  // Sticky nav properties
  private spacerElement: HTMLElement | null = null;
  private stickyOffsetTop = 0;
  private isStickyActive = false;
  
  // Event listeners for cleanup
  private boundDocumentClick: (e: MouseEvent) => void;
  private boundDocumentKeydown: (e: KeyboardEvent) => void;
  private boundScroll: () => void;

  constructor(element: HTMLElement | string, options: FlexMenuOptions = {}) {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!(el instanceof HTMLElement)) {
      throw new Error(`FlexMenu: Element "${element}" not found or is not a valid HTMLElement.`);
    }
    
    this.menuElement = el;
    
    // Set default options
    this.options = {
      itemSelector: '> li:not(.nav-more)',
      moreSelector: '.nav-more',
      moreContainerSelector: 'ul',
      moreClass: 'nav-more',
      fixClass: 'fix',
      openClass: 'is-open',
      debounceTime: 16,
      sticky: false,
      moreItemTemplate: `<li class="nav-more"><a href="javascript:void(0)" class="more-trigger" aria-haspopup="true" aria-expanded="false" role="button"><span class="more-icon"><em></em><em></em><em></em><em></em></span></a><ul></ul></li>`,
      onRefresh: () => {},
      onOverflow: () => {},
      onUnderflow: () => {},
      ...options
    };

    // Pre-bind event handlers for easy cleanup
    this.boundDocumentClick = this.handleDocumentClick.bind(this);
    this.boundDocumentKeydown = this.handleDocumentKeydown.bind(this);
    this.boundScroll = this.handleScroll.bind(this);

    this.init();
  }

  private init(): void {
    // 1. Resolve the "More" item or create one
    let moreEl = this.menuElement.querySelector(this.options.moreSelector) as HTMLElement | null;
    if (!moreEl) {
      if (typeof this.options.moreItemTemplate === 'function') {
        moreEl = this.options.moreItemTemplate();
      } else {
        const temp = document.createElement('div');
        temp.innerHTML = this.options.moreItemTemplate.trim();
        moreEl = temp.firstChild as HTMLElement;
      }
      this.menuElement.appendChild(moreEl);
    }
    this.moreItem = moreEl;
    this.moreItem.classList.add(this.options.moreClass);

    // Find the container inside the "More" item
    const container = this.moreItem.querySelector(this.options.moreContainerSelector) as HTMLElement | null;
    if (!container) {
      throw new Error(`FlexMenu: Dropdown container matching "${this.options.moreContainerSelector}" not found inside "More" item.`);
    }
    this.moreContainer = container;
    
    // Find or set up the trigger element inside "More"
    const trigger = this.moreItem.querySelector('a, button, [role="button"]') as HTMLElement | null;
    this.moreTrigger = trigger || this.moreItem;
    if (!this.moreTrigger.getAttribute('role')) {
      this.moreTrigger.setAttribute('role', 'button');
    }
    if (!this.moreTrigger.getAttribute('tabindex')) {
      this.moreTrigger.setAttribute('tabindex', '0');
    }
    this.moreTrigger.setAttribute('aria-haspopup', 'true');
    this.moreTrigger.setAttribute('aria-expanded', 'false');
    
    // Generate an ID for the dropdown container if it doesn't have one, for ARIA linkage
    if (!this.moreContainer.id) {
      this.moreContainer.id = `flexmenu-dropdown-${Math.random().toString(36).substr(2, 9)}`;
    }
    this.moreTrigger.setAttribute('aria-controls', this.moreContainer.id);

    // 2. Identify all menu items (both active and already in dropdown)
    const activeItems = Array.from(this.menuElement.querySelectorAll(this.options.itemSelector.replace(/^>\s*/, ''))) as HTMLElement[];
    const dropdownItems = Array.from(this.moreContainer.children) as HTMLElement[];
    
    // Filter active items to ensure they are direct children
    const directActiveItems = activeItems.filter(item => item.parentElement === this.menuElement && item !== this.moreItem);
    
    this.originalItems = [...directActiveItems, ...dropdownItems];

    // 3. Set up event listeners
    this.moreTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleDropdown();
    });
    
    this.moreTrigger.addEventListener('keydown', this.handleTriggerKeydown.bind(this));
    this.moreContainer.addEventListener('keydown', this.handleDropdownKeydown.bind(this));
    
    document.addEventListener('click', this.boundDocumentClick);
    document.addEventListener('keydown', this.boundDocumentKeydown);

    if (this.options.sticky) {
      this.setupSticky();
    }

    // 4. Cache original element widths in horizontal orientation
    this.measureWidths();

    // 5. Start ResizeObserver
    if (typeof ResizeObserver !== 'undefined') {
      const parent = this.menuElement.parentElement || document.body;
      this.resizeObserver = new ResizeObserver(() => {
        this.debounceRefresh();
      });
      this.resizeObserver.observe(parent);
    } else {
      window.addEventListener('resize', this.debounceRefresh.bind(this));
    }

    // 6. Initial render
    this.refresh();
  }

  /**
   * Temporarily place all items horizontally to measure their natural widths.
   */
  public measureWidths(): void {
    const originalMoreDisplay = this.moreItem.style.display;
    const originalMoreVisibility = this.moreItem.style.visibility;
    
    // Hide more item from taking space, but keep it in document
    this.moreItem.style.display = 'none';
    
    // Move all items temporarily back to the menu element
    this.originalItems.forEach(item => {
      const originalDisplay = item.style.display;
      item.style.display = 'inline-block'; // force layout measurement shape if flex-wrap/display block is active
      this.menuElement.insertBefore(item, this.moreItem);
      
      const width = this.getOuterWidth(item);
      this.itemWidths.set(item, width);
      
      item.style.display = originalDisplay;
    });

    // Measure the "More" item itself
    this.moreItem.style.display = '';
    this.moreItem.style.visibility = 'hidden';
    this.moreWidth = this.getOuterWidth(this.moreItem);
    
    // Restore "More" item display styles
    this.moreItem.style.display = originalMoreDisplay;
    this.moreItem.style.visibility = originalMoreVisibility;
  }

  /**
   * Reflow the menu items between the menu bar and the "More" dropdown.
   */
  public refresh(): void {
    const containerWidth = this.menuElement.getBoundingClientRect().width;
    
    const style = window.getComputedStyle(this.menuElement);
    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const paddingRight = parseFloat(style.paddingRight) || 0;
    const availableWidth = containerWidth - paddingLeft - paddingRight;

    // Check if ALL items fit in the menu bar
    let totalItemsWidth = 0;
    this.originalItems.forEach(item => {
      totalItemsWidth += this.itemWidths.get(item) || 0;
    });

    if (totalItemsWidth <= availableWidth) {
      // Everything fits! No dropdown needed.
      this.originalItems.forEach(item => {
        if (item.parentElement !== this.menuElement) {
          this.menuElement.insertBefore(item, this.moreItem);
          this.options.onUnderflow(item);
        }
      });
      
      this.moreItem.style.display = 'none';
      this.moreItem.setAttribute('aria-hidden', 'true');
      this.closeDropdown();
    } else {
      // Show the dropdown trigger
      this.moreItem.style.display = '';
      this.moreItem.removeAttribute('aria-hidden');
      
      const widthLimit = availableWidth - this.moreWidth;
      let accumulatedWidth = 0;
      
      this.originalItems.forEach((item) => {
        const itemWidth = this.itemWidths.get(item) || 0;
        
        if (accumulatedWidth + itemWidth <= widthLimit) {
          // Item fits in main navigation
          if (item.parentElement !== this.menuElement) {
            this.menuElement.insertBefore(item, this.moreItem);
            this.options.onUnderflow(item);
          }
          accumulatedWidth += itemWidth;
        } else {
          // Item overflows, push to dropdown
          if (item.parentElement !== this.moreContainer) {
            this.moreContainer.appendChild(item);
            this.options.onOverflow(item);
          }
        }
      });
    }

    this.options.onRefresh(this);
  }

  private debounceRefresh(): void {
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = window.setTimeout(() => {
      this.refresh();
      this.debounceTimer = null;
    }, this.options.debounceTime);
  }

  /**
   * Toggles the "More" dropdown visibility.
   */
  public toggleDropdown(): void {
    if (this.isDropdownOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  /**
   * Opens the "More" dropdown.
   */
  public openDropdown(): void {
    if (this.isDropdownOpen) return;
    this.isDropdownOpen = true;
    this.moreItem.classList.add(this.options.openClass);
    this.moreTrigger.setAttribute('aria-expanded', 'true');
  }

  /**
   * Closes the "More" dropdown.
   */
  public closeDropdown(): void {
    if (!this.isDropdownOpen) return;
    this.isDropdownOpen = false;
    this.moreItem.classList.remove(this.options.openClass);
    this.moreTrigger.setAttribute('aria-expanded', 'false');
  }

  /**
   * Sticky Nav Setup.
   */
  private setupSticky(): void {
    this.stickyOffsetTop = this.menuElement.getBoundingClientRect().top + window.scrollY;
    
    // Create spacer element to prevent layouts from snapping when nav goes fixed
    this.spacerElement = document.createElement('div');
    this.spacerElement.className = 'flexmenu-spacer';
    this.spacerElement.style.height = `${this.menuElement.offsetHeight}px`;
    this.spacerElement.style.display = 'none';
    this.menuElement.parentNode?.insertBefore(this.spacerElement, this.menuElement);
    
    window.addEventListener('scroll', this.boundScroll);
  }

  private handleScroll(): void {
    const scrollY = window.scrollY;
    
    if (!this.isStickyActive && scrollY > this.stickyOffsetTop) {
      this.isStickyActive = true;
      if (this.spacerElement) {
        this.spacerElement.style.display = 'block';
        this.spacerElement.style.height = `${this.menuElement.offsetHeight}px`;
      }
      this.menuElement.classList.add(this.options.fixClass);
    } else if (this.isStickyActive && scrollY <= this.stickyOffsetTop) {
      this.isStickyActive = false;
      if (this.spacerElement) {
        this.spacerElement.style.display = 'none';
      }
      this.menuElement.classList.remove(this.options.fixClass);
    }
  }

  // --- Accessibility / Keyboard navigation handlers ---

  private handleTriggerKeydown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        this.toggleDropdown();
        if (this.isDropdownOpen) {
          this.focusFirstDropdownItem();
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.openDropdown();
        this.focusFirstDropdownItem();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.openDropdown();
        this.focusLastDropdownItem();
        break;
    }
  }

  private handleDropdownKeydown(e: KeyboardEvent): void {
    const activeEl = document.activeElement as HTMLElement | null;
    if (!activeEl || !this.moreContainer.contains(activeEl)) return;

    const dropdownItems = Array.from(this.moreContainer.querySelectorAll('li, a, button, [tabindex="0"]')) as HTMLElement[];
    const index = dropdownItems.indexOf(activeEl);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = (index + 1) % dropdownItems.length;
        dropdownItems[nextIndex]?.focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = (index - 1 + dropdownItems.length) % dropdownItems.length;
        dropdownItems[prevIndex]?.focus();
        break;
      case 'Home':
        e.preventDefault();
        dropdownItems[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        dropdownItems[dropdownItems.length - 1]?.focus();
        break;
      case 'Escape':
        e.preventDefault();
        this.closeDropdown();
        this.moreTrigger.focus();
        break;
      case 'Tab':
        // Tab closes dropdown and lets focus leave naturally
        this.closeDropdown();
        break;
    }
  }

  private handleDocumentKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.isDropdownOpen) {
      this.closeDropdown();
      this.moreTrigger.focus();
    }
  }

  private handleDocumentClick(e: MouseEvent): void {
    if (this.isDropdownOpen && !this.moreItem.contains(e.target as Node)) {
      this.closeDropdown();
    }
  }

  private focusFirstDropdownItem(): void {
    setTimeout(() => {
      const focusable = this.moreContainer.querySelector('li, a, button, [tabindex="0"]') as HTMLElement | null;
      focusable?.focus();
    }, 50);
  }

  private focusLastDropdownItem(): void {
    setTimeout(() => {
      const focusables = Array.from(this.moreContainer.querySelectorAll('li, a, button, [tabindex="0"]')) as HTMLElement[];
      if (focusables.length > 0) {
        focusables[focusables.length - 1]?.focus();
      }
    }, 50);
  }

  private getOuterWidth(el: HTMLElement): number {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    const marginLeft = parseFloat(style.marginLeft) || 0;
    const marginRight = parseFloat(style.marginRight) || 0;
    // Fractional pixels to avoid browser rounding bugs
    return rect.width + marginLeft + marginRight;
  }

  /**
   * Dismantles the FlexMenu instance, restoring original DOM structure and listeners.
   */
  public destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    } else {
      window.removeEventListener('resize', this.debounceRefresh);
    }

    if (this.options.sticky) {
      window.removeEventListener('scroll', this.boundScroll);
      this.spacerElement?.remove();
      this.menuElement.classList.remove(this.options.fixClass);
    }

    document.removeEventListener('click', this.boundDocumentClick);
    document.removeEventListener('keydown', this.boundDocumentKeydown);

    // Move all items back to the menu element
    this.originalItems.forEach(item => {
      this.menuElement.insertBefore(item, this.moreItem);
    });

    // Remove "More" item if it was auto-generated
    if (this.options.moreSelector === '.nav-more' && this.moreItem.parentNode === this.menuElement) {
      this.moreItem.remove();
    }

    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
    }
  }
}
