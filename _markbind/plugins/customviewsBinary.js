/*!
 * custom-views v0.1.1
 * (c) 2025 Chan Ger Teck
 * Released under the MIT License.
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CustomViews = {}));
})(this, (function (exports) { 'use strict';

  function renderImage(el, asset) {
    el.innerHTML = '';
    const img = document.createElement('img');
    img.src = asset.src;
    img.alt = asset.alt || '';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.display = 'block';
    el.appendChild(img);
  }

  function renderText(el, asset) {
    el.textContent = asset.content;
  }

  function renderHtml(el, asset) {
    el.innerHTML = asset.content;
  }

  /**
   * Render a placeholder into a given element
   * @param {HTMLElement} el - target element
   * @param {Object} asset - { key: placeholderKey, value: placeholderValue }
   * @param {Object} config - loaded master JSON
   */
  function renderPlaceholderInto(el, asset, config) {
    const placeholderData = config.data?.placeholders?.[asset.key]?.[asset.value];
    if (!placeholderData) return;

    switch (placeholderData.type) {
      case 'image':
        renderImage(el, placeholderData);
        break;

      case 'text':
        renderText(el, placeholderData);
        break;

      case 'html':
        renderHtml(el, placeholderData);
        break;

      default:
        console.warn('[CustomViews] Unknown placeholder type:', placeholderData.type);
    }
  }

  /**
   * Render a toggle into matching elements
   * @param {HTMLElement} el - target element
   * @param {string} toggleCategory - toggle name
   * @param {string} toggleId - toggle id (from data-customviews-id)
   * @param {Object} config - loaded master JSON
   * @param {number} idx - optional index if multiple entries exist
   */
  function renderToggleInto(el, toggleCategory, toggleId, config, idx = 0) {
    const toggleData = config.data?.toggles?.[toggleCategory]?.[toggleId];
    if (!toggleData) return;

    // If toggleData is an array, use idx; otherwise, use directly
    const item = Array.isArray(toggleData) ? toggleData[idx] : toggleData;
    if (!item) return;

    switch (item.type) {
      case 'image':
        renderImage(el, item);
        break;
      case 'text':
        renderText(el, item);
        break;
      case 'html':
        renderHtml(el, item);
        break;
      default:
        el.innerHTML = item.content || item;
        console.warn('[CustomViews] Unknown toggle type:', item.type);
    }}

  var renderers = {
    placeholder: renderPlaceholderInto,
    toggle: renderToggleInto,
  };

  class CustomViews {
    /**
     * @param {Object} options - Configuration options
     * @param {string} options.configUrl - Path to the JSON config (default: master.json)
     * @param {HTMLElement} options.rootEl - Root element where views will be rendered
     * @param {Function} options.onViewChange - Optional callback triggered when view changes
     */
    constructor(options = {}) {
      this.configUrl = options.configUrl || 'master.json';
      this.rootEl = options.rootEl || document.getElementById('view-container') || document.body;
      this.config = null;
      this.currentStateId = null;
      this.currentState = null;
      this.onViewChange = options.onViewChange || null;
    }

    /**
     * Inits: Loads config json, render initial state and listen for URL change
     */
    async init() {
      await this.loadConfig();
      this.renderFromUrl();
      this.listenForUrlChanges();
    }

    /**
     * Load the JSON config file from configUrl, stores in this.config
     */
    async loadConfig() {
      try {
        const res = await fetch(this.configUrl);
        this.config = await res.json();
        if (!this.config.states) throw new Error('Invalid config: missing states');
        console.log("Config Loaded!");
        console.log(this.config);
      } catch (err) {
        console.error('[CustomViews] Failed to load config:', err);
      }
    }

    /**
     * Determine which state to render based on ?state= param in the URL
     */
    renderFromUrl() {
      const urlParams = new URLSearchParams(window.location.search);
      const stateId = urlParams.get('state') || this.config?.defaultState || Object.keys(this.config.states)[0];
      this.selectState(stateId);
    }

    /**
     * Change the active state
     * @param {string} stateId - ID of the state (must exist in config.states)
     */
    selectState(stateId) {
      if (!this.config || !this.config.states[stateId]) {
        console.warn('[CustomViews] State not found:', stateId);
        return;
      }
      this.currentStateId = stateId;
      this.currentState = this.config.states[stateId];

      // Update URL
      const url = new URL(window.location);
      url.searchParams.set('state', stateId);
      window.history.pushState({}, '', url);

      this.renderState();
      if (typeof this.onViewChange === 'function') {
        this.onViewChange(stateId, this.currentState);
      }
    }

    /**
     * Render the current state: Update placeholder and toggle elements
     */
    renderState() {
      if (!this.currentState) return;

      // Placeholders
      Object.entries(this.currentState.placeholders || {}).forEach(([key, value]) => {
        const els = document.querySelectorAll(`[data-customviews-placeholder="${key}"]`);
        els.forEach(el => renderers.placeholder(el, { key, value }, this.config));
      });

      // Toggles
      // Hide all toggles by default
      document.querySelectorAll('[data-customviews-toggle]').forEach(el => {
        const category = el.getAttribute('data-customviews-toggle');
        if ((this.currentState.toggles || []).includes(category)) {
          el.style.display = '';
        } else {
          el.style.display = 'none';
        }
      });

      // Add Toggles not present
      (this.currentState.toggles || []).forEach(toggleCategory => {
        const els = document.querySelectorAll(`[data-customviews-toggle="${toggleCategory}"]`);
        els.forEach((el, idx) => {
          const toggleId = el.getAttribute('data-customviews-id');
          // Pass both category and id to the renderer
          renderers.toggle(el, toggleCategory, toggleId, this.config, idx);
        });
      });

      console.log("State Rendered!");
    }

    /**
     * Handle browser back/forward navigation
     */
    listenForUrlChanges() {
      window.addEventListener('popstate', () => {
        this.renderFromUrl();
      });
    }
  }

  exports.CustomViews = CustomViews;
  exports.default = CustomViews;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
