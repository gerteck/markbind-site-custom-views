/*!
 * custom-views v0.1.1
 * (c) 2025 Chan Ger Teck
 * Released under the MIT License.
 */
'use strict';

/** --- Basic renderers --- */
function renderImage(el, asset) {
    if (!asset.src)
        return;
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
    if (asset.content != null) {
        el.textContent = asset.content;
    }
}
function renderHtml(el, asset) {
    if (asset.content != null) {
        el.innerHTML = asset.content;
    }
}
/** --- Unified asset renderer --- */
function renderAssetInto(el, assetId, assetsManager) {
    const asset = assetsManager.get(assetId);
    if (!asset)
        return;
    switch (asset.type) {
        case 'image':
            renderImage(el, asset);
            break;
        case 'text':
            renderText(el, asset);
            break;
        case 'html':
            renderHtml(el, asset);
            break;
        default:
            el.innerHTML = asset.content || String(asset);
            console.warn('[CustomViews] Unknown asset type:', asset.type);
    }
}

/**
 * A LocalConfig defines a profile (ViewScope) for a viewer.
 * - `modifiablePlaceholderAssets` determines which assets can be swapped into visible placeholders.
 * - `allowedToggles` determines which toggle categories are visible.
 * - `states` contains predefined views for the profile.
 * - `defaultState` is the state initially shown.
 */
class LocalConfig {
    id;
    /** Assets that can be assigned to each visible placeholder */
    modifiablePlaceholderAssets;
    /** Toggles visible to the viewer */
    allowedToggles;
    /** Predefined states (snapshots of placeholder values + toggles) */
    states;
    /** Default state to render on load */
    defaultState;
    constructor(opts) {
        this.id = opts.id;
        this.modifiablePlaceholderAssets = opts.modifiablePlaceholderAssets;
        this.allowedToggles = opts.allowedToggles;
        this.states = opts.states;
        this.defaultState = opts.defaultState;
    }
}

class CustomViewsCore {
    rootEl;
    assetsManager;
    localConfigPaths;
    defaultState;
    onViewChange;
    profileFromUrl = null;
    stateIdFromUrl = null;
    localConfig = null;
    constructor(options) {
        this.assetsManager = options.assetsManager;
        this.localConfigPaths = options.localConfigPaths;
        this.defaultState = options.defaultState;
        this.rootEl = options.rootEl || document.body;
        this.onViewChange = options.onViewChange;
    }
    /** Initialize: render default or URL-specified state */
    async init() {
        console.log("CustomViewsCore init");
        this.renderFromUrl();
        window.addEventListener("popstate", () => {
            this.renderFromUrl();
        });
    }
    async renderFromUrl() {
        this.parseUrlForProfileState();
        if (this.profileFromUrl) {
            const localConfig = await this.loadLocalConfig(this.profileFromUrl);
            this.localConfig = localConfig;
        }
        if (this.localConfig) {
            this.renderLocalConfigState(this.stateIdFromUrl, this.localConfig);
        }
        else {
            this.renderState(this.defaultState);
        }
    }
    /**
     * Retrieves profile and state if any, based on the current URL's query string.
     */
    parseUrlForProfileState() {
        // Just the query string part of the URL (everything after ? but before #).
        // Can .get("param"), .has, .set(), .append()
        const urlParams = new URLSearchParams(window.location.search);
        this.profileFromUrl = urlParams.get("profile") || null;
        this.stateIdFromUrl = urlParams.get("state") || null;
        if (this.profileFromUrl &&
            this.localConfigPaths &&
            !(this.profileFromUrl in this.localConfigPaths)) {
            console.warn("Profile in URL not recognized");
            this.profileFromUrl = null;
            this.stateIdFromUrl = null;
        }
        // ToDo: Later extension: Custom State
    }
    /**
     * Loads the local configuration for a given profile ID.
     *
     * This method attempts to fetch and parse a local configuration file
     * based on the provided `profileId`. If the profile ID is invalid,
     * missing, or not present in `localConfigPaths`, the method logs a warning
     * and returns `false`. If the configuration file is successfully fetched
     * and parsed, it initializes `this.localConfig` with the parsed data and
     * returns `true`. On failure, it logs the error, sets `this.localConfig`
     * to `null`, and returns `false`.
     *
     * @param profileId - The identifier for the profile whose local configuration should be loaded.
     * @returns A promise that resolves to `true` if the configuration was loaded successfully, or `false` otherwise.
     */
    async loadLocalConfig(profileId) {
        // Load local config based on profileId
        if (!profileId || !this.localConfigPaths ||
            (!(profileId in this.localConfigPaths))) {
            console.warn("Local Config Paths or Profile not present");
            return null;
        }
        const localConfigPath = this.localConfigPaths[profileId];
        if (!localConfigPath) {
            return null;
        }
        try {
            const response = await fetch(localConfigPath);
            const configJson = await response.json();
            const config = new LocalConfig(configJson);
            return config;
        }
        catch (err) {
            console.warn("Failed to load local config:", err);
            return null;
        }
    }
    async renderLocalConfigState(stateId, localConfig) {
        if (!stateId) {
            stateId = localConfig.defaultState;
        }
        // load state
        const state = localConfig.states[stateId];
        if (!state) {
            console.warn("State ID not found in local config, rendering default state");
            await this.renderState(this.defaultState);
        }
        else {
            await this.renderState(state);
        }
    }
    /** Render all placeholders and toggles for the current state */
    renderState(state) {
        if (!state)
            return;
        const placeholders = state.placeholders || {};
        const toggles = state.toggles || [];
        // Toggles hide or show relevant toggles
        this.rootEl.querySelectorAll("[data-customviews-toggle]").forEach(el => {
            const category = el.dataset.customviewsToggle;
            if (!category || !toggles.includes(category)) {
                el.setAttribute("hidden", "");
            }
            else {
                el.removeAttribute("hidden");
            }
        });
        // Render toggles
        for (const category of toggles) {
            this.rootEl.querySelectorAll(`[data-customviews-toggle="${category}"]`).forEach(el => {
                // if it has an id, then we render the asset into it
                // if it has no id, then we assume it's a container and just show it
                const toggleId = el.dataset.customviewsId;
                if (!toggleId) {
                    // If no ID is present, we can assume it's a container and just show it
                    el.classList.remove("hidden");
                }
                else {
                    renderAssetInto(el, toggleId, this.assetsManager);
                }
            });
        }
        // Placeholders
        // In the html, there can be two types of placeholders:
        // Just has the key,
        // Has both key and id (container, asset stored directly in html)
        this.rootEl.querySelectorAll("[data-customviews-placeholder]").forEach(el => {
            const key = el.dataset.customviewsPlaceholder;
            // if no key, skip
            if (!key)
                return;
            // check in the state, what is the mapping for the placeholder key
            const assetId = placeholders[key];
            if (!assetId) {
                // If no assetId is mapped for this placeholder key, hide the element
                el.setAttribute("hidden", "");
                return;
            }
            // check if there is a customviewsId
            const placeholderId = el.dataset.customviewsId;
            if (placeholderId) {
                // check if placeholderId matches assetId, if it is then we should show it.
                if (placeholderId === assetId) {
                    el.removeAttribute("hidden");
                }
                else {
                    el.setAttribute("hidden", "");
                }
            }
            else {
                // if not placeholderId, it means it is positional, so we render the asset into it
                renderAssetInto(el, assetId, this.assetsManager);
            }
        });
        // Notify consumer of state change
        if (typeof this.onViewChange === "function") {
            if (this.stateIdFromUrl) {
                this.onViewChange(this.stateIdFromUrl, state);
            }
            else {
                this.onViewChange("default state", state);
            }
        }
    }
}

class AssetsManager {
    assets;
    constructor(assets) {
        this.assets = assets;
    }
    get(assetId) {
        return this.assets[assetId];
    }
    loadFromJSON(json) {
        this.assets = json;
    }
    loadAdditionalAssets(additionalAssets) {
        this.assets = { ...this.assets, ...additionalAssets };
    }
    validate() {
        // optional: check each asset has type, id, etc.
        return Object.values(this.assets).every(a => a.type);
    }
}

class CustomViews {
    // Entry Point to use CustomViews
    static async initFromJson(opts) {
        // Load assets JSON
        const assetsJson = await (await fetch(opts.assetsJsonPath)).json();
        const assetsManager = new AssetsManager(assetsJson);
        // Load Default State
        const defaultState = await (await fetch(opts.defaultStateJsonPath)).json();
        // Init CustomViews
        const core = new CustomViewsCore({
            assetsManager,
            defaultState,
            localConfigPaths: opts.localConfigPaths,
            rootEl: opts.rootEl,
            onViewChange: opts.onViewChange,
        });
        core.init();
        return core;
    }
}
if (typeof window !== "undefined") {
    // @ts-ignore
    window.CustomViews = CustomViews;
}

exports.CustomViews = CustomViews;
//# sourceMappingURL=custom-views.cjs.js.map
