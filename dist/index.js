"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  InfiniteHierarchySelectionStrategy: () => InfiniteHierarchySelectionStrategy,
  InfiniteHierarchyStrategy: () => InfiniteHierarchyStrategy,
  InfiniteLoopStrategy: () => InfiniteLoopStrategy,
  TweenList: () => TweenList
});
module.exports = __toCommonJS(index_exports);

// src/TweenList.tsx
var import_react = require("react");

// src/utils/lerp.ts
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// src/utils/diffSnapshots.ts
function diffSnapshots(itemsAtFloor, itemsAtCeil, t, prevItems) {
  const floorMap = /* @__PURE__ */ new Map();
  const ceilMap = /* @__PURE__ */ new Map();
  for (const item of itemsAtFloor) {
    floorMap.set(item.id, item);
  }
  for (const item of itemsAtCeil) {
    ceilMap.set(item.id, item);
  }
  const allIds = /* @__PURE__ */ new Set([...floorMap.keys(), ...ceilMap.keys()]);
  const result = [];
  for (const id of allIds) {
    const inFloor = floorMap.get(id);
    const inCeil = ceilMap.get(id);
    const prevState = prevItems.get(id);
    const index = inFloor ? inFloor.index : inCeil ? inCeil.index : void 0;
    if (inFloor && inCeil) {
      const offset = lerp(inFloor.offset, inCeil.offset, t);
      const isAppearing = !prevState;
      const isDisappearing = false;
      let isMoving = false;
      if (prevState) {
        if (inFloor.index !== void 0 && prevState.index !== void 0) {
          isMoving = prevState.index !== inFloor.index;
        } else {
          isMoving = prevState.offset !== inFloor.offset;
        }
      }
      const hasChanged = prevState && prevState.version !== void 0 && inFloor.version !== void 0 ? prevState.version !== inFloor.version : false;
      const isSticky = inFloor.offset === inCeil.offset;
      result.push({
        id,
        offset,
        index,
        opacity: 1,
        isAppearing,
        isDisappearing,
        isMoving,
        hasChanged,
        isSticky,
        version: inFloor.version
      });
    } else if (inFloor && !inCeil) {
      const opacity = 1 - t;
      const offset = lerp(inFloor.offset, inFloor.offset - 1, t);
      result.push({
        id,
        offset,
        index,
        opacity,
        isAppearing: false,
        isDisappearing: true,
        isMoving: false,
        hasChanged: false,
        isSticky: false,
        version: inFloor.version
      });
    } else if (!inFloor && inCeil) {
      const opacity = t;
      const offset = lerp(inCeil.offset + 1, inCeil.offset, t);
      result.push({
        id,
        offset,
        index,
        opacity,
        isAppearing: true,
        isDisappearing: false,
        isMoving: false,
        hasChanged: false,
        isSticky: false,
        version: inCeil.version
      });
    }
  }
  return result;
}

// src/utils/easing.ts
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// src/TweenList.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var MAX_SCROLL_HEIGHT = 1e7;
var TweenList = (0, import_react.forwardRef)(function TweenList2(props, ref) {
  const {
    strategy,
    height,
    slotHeight,
    width = "100%",
    children,
    onPositionChange,
    signal,
    className,
    scrollClassName,
    style
  } = props;
  const [scrollPosition, setScrollPosition] = (0, import_react.useState)(
    strategy.getInitialPosition()
  );
  const containerRef = (0, import_react.useRef)(null);
  const rafRef = (0, import_react.useRef)(null);
  const animationRafRef = (0, import_react.useRef)(null);
  (0, import_react.useImperativeHandle)(ref, () => ({
    scrollTo: (position, behavior = "auto") => {
      return new Promise((resolve) => {
        const container = containerRef.current;
        if (!container) {
          resolve();
          return;
        }
        if (animationRafRef.current !== null) {
          cancelAnimationFrame(animationRafRef.current);
          animationRafRef.current = null;
        }
        const scrollTop = position * slotHeight;
        if (behavior === "smooth") {
          const startScrollTop = container.scrollTop;
          const distance = scrollTop - startScrollTop;
          const startTime = performance.now();
          const duration = 500;
          const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeInOutCubic(progress);
            const newScrollTop = startScrollTop + distance * easedProgress;
            container.scrollTop = newScrollTop;
            if (progress < 1) {
              animationRafRef.current = requestAnimationFrame(animate);
            } else {
              animationRafRef.current = null;
              resolve();
            }
          };
          animationRafRef.current = requestAnimationFrame(animate);
        } else {
          container.scrollTop = scrollTop;
          setScrollPosition(position);
          resolve();
        }
      });
    }
  }));
  const prevItemsRef = (0, import_react.useRef)(/* @__PURE__ */ new Map());
  const viewportSlots = Math.ceil(height / slotHeight);
  const totalPositions = strategy.getTotalPositions();
  const scrollHeight = Math.min(totalPositions * slotHeight, MAX_SCROLL_HEIGHT);
  (0, import_react.useEffect)(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(() => {
        const scrollTop = container.scrollTop;
        const position = scrollTop / slotHeight;
        setScrollPosition(position);
        if (onPositionChange) {
          onPositionChange(position);
        }
      });
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [slotHeight, onPositionChange]);
  (0, import_react.useLayoutEffect)(() => {
    const container = containerRef.current;
    if (!container) return;
    const initialPosition = strategy.getInitialPosition();
    const initialScrollTop = initialPosition * slotHeight;
    container.scrollTop = initialScrollTop;
    setScrollPosition(initialPosition);
  }, []);
  const { floor, ceil, t } = (0, import_react.useMemo)(() => {
    const floor2 = Math.floor(scrollPosition);
    const ceil2 = floor2 + 1;
    const t2 = scrollPosition - floor2;
    return { floor: floor2, ceil: ceil2, t: t2 };
  }, [scrollPosition]);
  const itemsAtFloor = (0, import_react.useMemo)(() => {
    return strategy.getItemsAtPosition(floor, viewportSlots);
  }, [strategy, floor, viewportSlots, signal]);
  const itemsAtCeil = (0, import_react.useMemo)(() => {
    return strategy.getItemsAtPosition(ceil, viewportSlots);
  }, [strategy, ceil, viewportSlots, signal]);
  const interpolatedItems = (0, import_react.useMemo)(() => {
    return diffSnapshots(itemsAtFloor, itemsAtCeil, t, prevItemsRef.current);
  }, [itemsAtFloor, itemsAtCeil, t]);
  (0, import_react.useEffect)(() => {
    const newPrevItems = /* @__PURE__ */ new Map();
    for (const item of interpolatedItems) {
      newPrevItems.set(item.id, {
        offset: item.offset,
        index: item.index,
        version: item.version
      });
    }
    prevItemsRef.current = newPrevItems;
  });
  const stickyItems = interpolatedItems.filter((item) => item.isSticky);
  const scrollItems = interpolatedItems.filter((item) => !item.isSticky);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "div",
    {
      style: {
        position: "relative",
        height: `${height}px`,
        width,
        ...style
      },
      className,
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "div",
        {
          ref: containerRef,
          className: scrollClassName,
          style: {
            height: "100%",
            width: "100%",
            overflow: "auto",
            position: "relative",
            zIndex: 0
          },
          children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { height: `${scrollHeight}px`, position: "relative" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "div",
              {
                style: {
                  position: "sticky",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 0,
                  // Don't displace content
                  zIndex: 10,
                  overflow: "visible"
                  // Allow items to be seen
                },
                children: stickyItems.map((item) => {
                  const data = strategy.getItemData(item.id);
                  const itemState = {
                    id: item.id,
                    offset: item.offset,
                    index: item.index,
                    opacity: item.opacity,
                    isAppearing: item.isAppearing,
                    isDisappearing: item.isDisappearing,
                    isMoving: item.isMoving,
                    hasChanged: item.hasChanged,
                    isSticky: true
                  };
                  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    "div",
                    {
                      style: {
                        position: "absolute",
                        top: `${item.offset * slotHeight}px`,
                        // Position relative to sticky container (viewport top)
                        left: 0,
                        right: 0,
                        height: `${slotHeight}px`,
                        opacity: item.opacity
                      },
                      children: children(data, itemState)
                    },
                    item.id
                  );
                })
              }
            ),
            scrollItems.map((item) => {
              const data = strategy.getItemData(item.id);
              const itemState = {
                id: item.id,
                offset: item.offset,
                index: item.index,
                opacity: item.opacity,
                isAppearing: item.isAppearing,
                isDisappearing: item.isDisappearing,
                isMoving: item.isMoving,
                hasChanged: item.hasChanged,
                isSticky: false
              };
              return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "div",
                {
                  style: {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: `${slotHeight}px`,
                    transform: `translateY(${(floor + item.offset + t) * slotHeight}px)`,
                    opacity: item.opacity
                  },
                  children: children(data, itemState)
                },
                item.id
              );
            })
          ] })
        }
      )
    }
  );
});

// src/strategies/InfiniteLoop/InfiniteLoopStrategy.ts
var InfiniteLoopStrategy = class {
  constructor(items, options) {
    this.items = items;
    this.getItemId = options?.getItemId ?? ((item) => item.id);
    this.totalPositions = options?.totalPositions ?? 1e5;
    this.itemsById = /* @__PURE__ */ new Map();
    this.itemVersions = /* @__PURE__ */ new Map();
    for (const item of items) {
      const id = this.getItemId(item);
      this.itemsById.set(id, item);
      this.itemVersions.set(id, 0);
    }
  }
  getItemsAtPosition(position, viewportSlots) {
    if (this.items.length === 0) {
      return [];
    }
    const result = [];
    for (let slot = 0; slot < viewportSlots; slot++) {
      const absoluteIndex = position + slot;
      let itemIndex = absoluteIndex % this.items.length;
      if (itemIndex < 0) {
        itemIndex += this.items.length;
      }
      const item = this.items[itemIndex];
      const originalId = this.getItemId(item);
      const version = this.itemVersions.get(originalId);
      const uniqueId = `${originalId}__${absoluteIndex}`;
      result.push({
        id: uniqueId,
        offset: slot,
        index: absoluteIndex,
        version
      });
    }
    return result;
  }
  getItemData(id) {
    const separatorIndex = id.lastIndexOf("__");
    const originalId = separatorIndex !== -1 ? id.substring(0, separatorIndex) : id;
    const item = this.itemsById.get(originalId);
    if (!item) {
      const fallbackItem = this.itemsById.get(id);
      if (fallbackItem) return fallbackItem;
      throw new Error(`Item with id "${originalId}" (derived from "${id}") not found`);
    }
    return item;
  }
  getTotalPositions() {
    return this.totalPositions;
  }
  getInitialPosition() {
    return Math.floor(this.totalPositions / 2);
  }
  /**
   * Update an existing item in place
   * @param id - Item ID to update
   * @param data - New item data
   * @param incrementVersion - If true, increments version to trigger change animation
   */
  updateItem(id, data, incrementVersion = false) {
    const index = this.items.findIndex((item) => this.getItemId(item) === id);
    if (index === -1) {
      throw new Error(`Item with id "${id}" not found`);
    }
    this.items[index] = data;
    this.itemsById.set(id, data);
    if (incrementVersion) {
      const currentVersion = this.itemVersions.get(id) ?? 0;
      this.itemVersions.set(id, currentVersion + 1);
    }
  }
  /**
   * Replace entire items array
   * @param items - New items array
   */
  setItems(items) {
    this.items = items;
    this.itemsById.clear();
    this.itemVersions.clear();
    for (const item of items) {
      const id = this.getItemId(item);
      this.itemsById.set(id, item);
      this.itemVersions.set(id, 0);
    }
  }
};

// src/strategies/InfiniteHierarchy/InfiniteHierarchyStrategy.ts
var InfiniteHierarchyStrategy = class {
  constructor(items, options) {
    this.itemsById = /* @__PURE__ */ new Map();
    this.flatItemsById = /* @__PURE__ */ new Map();
    this.itemVersions = /* @__PURE__ */ new Map();
    this.flatItems = this.flattenItems(items);
    this.totalPositions = options?.totalPositions ?? 1e5;
  }
  /**
   * Main entry point for calculating visible items.
   * The pipeline consists of three steps:
   * 1. Generate "Natural Slots": Items that would be visible based purely on scroll position.
   * 2. Group into Sections: Organize items by their root ancestor to handle infinite wrapping (transitions between end and start of list).
   * 3. Resolve Sticky Headers: Ensure all visible items have their parents visible, stacking them at the top if necessary.
   */
  getItemsAtPosition(position, viewportSlots) {
    if (this.flatItems.length === 0) {
      return [];
    }
    const naturalSlots = this.generateNaturalSlots(position, viewportSlots);
    const sections = this.groupItemsIntoSections(naturalSlots);
    return this.resolveStickyHeaders(naturalSlots, sections);
  }
  /**
   * Step 1: Generate items based on the raw scroll position.
   * Handles the modulo arithmetic to create the illusion of an infinite list.
   */
  generateNaturalSlots(position, viewportSlots) {
    const naturalSlots = [];
    for (let slot = 0; slot < viewportSlots; slot++) {
      const absoluteIndex = position + slot;
      let itemIndex = absoluteIndex % this.flatItems.length;
      if (itemIndex < 0) {
        itemIndex += this.flatItems.length;
      }
      const flatItem = this.flatItems[itemIndex];
      const originalId = flatItem.id;
      const version = this.itemVersions.get(originalId);
      const uniqueId = `${originalId}__${absoluteIndex}`;
      naturalSlots.push({
        id: uniqueId,
        offset: slot,
        index: absoluteIndex,
        version
      });
    }
    return naturalSlots;
  }
  /**
   * Step 2: Group natural items into sections based on their Root ID.
   * This is critical for infinite scrolling because the view might straddle the end of the list and the beginning of the next loop.
   * Each group represents a coherent hierarchical tree (or part of one).
   */
  groupItemsIntoSections(naturalSlots) {
    const sections = [];
    let currentSection = null;
    let lastFlatIndex = -1;
    for (const item of naturalSlots) {
      const originalId = this.getOriginalId(item.id);
      const flatItem = this.flatItemsById.get(originalId);
      if (!flatItem) continue;
      const flatIndex = this.flatItems.indexOf(flatItem);
      const rootId = flatItem.parents.length > 0 ? flatItem.parents[0] : flatItem.id;
      const isWrap = lastFlatIndex !== -1 && flatIndex < lastFlatIndex;
      const isNewRoot = !currentSection || currentSection.rootId !== rootId;
      if (isNewRoot || isWrap) {
        currentSection = {
          rootId,
          items: []
        };
        sections.push(currentSection);
      }
      currentSection.items.push(item);
      lastFlatIndex = flatIndex;
    }
    return sections;
  }
  /**
   * Step 3: Iterate through sections to enforce hierarchical consistency.
   * 
   * The core algorithm ensures that for every visible item, its parent chain is also visible.
   * If a parent is not naturally visible (scrolled out), it is added as a "Sticky Header".
   * 
   * This process is iterative because adding a sticky header covers the topmost slot,
   * potentially hiding an item. Hiding an item might remove the need for *its* parent,
   * or creating a sticky header might reveal a new context.
   * 
   * The "previousStickyStack" carries over sticky headers from previous sections (e.g., when transitioning loops).
   */
  resolveStickyHeaders(naturalSlots, sections) {
    const finalSlots = /* @__PURE__ */ new Map();
    naturalSlots.forEach((item) => finalSlots.set(item.offset, item));
    let previousStickyStack = [];
    for (const section of sections) {
      let currentSectionStickyStack = [];
      let restartSection = true;
      while (restartSection) {
        restartSection = false;
        const effectiveList = [...previousStickyStack, ...currentSectionStickyStack];
        const effectiveCount = effectiveList.length;
        let sectionHasUncoveredItems = false;
        let allUncoveredSatisfied = true;
        for (let i = section.items.length - 1; i >= 0; i--) {
          const item = section.items[i];
          if (item.offset < effectiveCount) {
            continue;
          }
          sectionHasUncoveredItems = true;
          const uncoveredItem = item;
          const missingParentInfo = this.findMissingParent(uncoveredItem, effectiveList, section.items, effectiveCount);
          if (missingParentInfo) {
            if (previousStickyStack.length > 0) {
              previousStickyStack.pop();
            }
            currentSectionStickyStack.push(missingParentInfo);
            restartSection = true;
            allUncoveredSatisfied = false;
            break;
          }
        }
        if (restartSection) {
          continue;
        }
        if (!sectionHasUncoveredItems) {
          break;
        }
        if (allUncoveredSatisfied) {
          const finalStickyList = [...previousStickyStack, ...currentSectionStickyStack];
          this.applyStickyItemsToSlots(finalSlots, finalStickyList);
          return Array.from(finalSlots.values()).sort((a, b) => a.offset - b.offset);
        }
      }
      previousStickyStack = [...previousStickyStack, ...currentSectionStickyStack];
    }
    this.applyStickyItemsToSlots(finalSlots, previousStickyStack);
    return Array.from(finalSlots.values()).sort((a, b) => a.offset - b.offset);
  }
  /**
   * Helper to check if a specific item's parent is visible.
   * Returns the constructed sticky item if the parent is missing, or null if satisfied.
   */
  findMissingParent(item, effectiveList, sectionItems, effectiveCount) {
    const originalId = this.getOriginalId(item.id);
    const flatItem = this.flatItemsById.get(originalId);
    if (!flatItem) return null;
    for (const parentId of flatItem.parents) {
      const inSticky = effectiveList.some((s) => this.getOriginalId(s.id) === parentId);
      if (inSticky) continue;
      const parentUniqueId = this.calculateParentUniqueId(flatItem, parentId, item.index);
      if (!parentUniqueId) continue;
      const naturalParent = sectionItems.find(
        (si) => si.id === parentUniqueId && si.offset >= effectiveCount
      );
      if (naturalParent) continue;
      return {
        id: parentUniqueId,
        offset: 0,
        // Placeholder, offset is assigned based on stack position later
        index: this.getAbsoluteIndexFromUniqueId(parentUniqueId),
        version: this.itemVersions.get(parentId)
      };
    }
    return null;
  }
  calculateParentUniqueId(childFlatItem, parentId, childAbsoluteIndex) {
    if (childAbsoluteIndex === void 0) return null;
    const parentFlatItem = this.flatItemsById.get(parentId);
    if (!parentFlatItem) return null;
    const childFlatIndex = this.flatItems.indexOf(childFlatItem);
    const parentFlatIndex = this.flatItems.indexOf(parentFlatItem);
    const distance = childFlatIndex - parentFlatIndex;
    const parentAbsoluteIndex = childAbsoluteIndex - distance;
    return `${parentId}__${parentAbsoluteIndex}`;
  }
  applyStickyItemsToSlots(slots, stickyList) {
    stickyList.forEach((stickyItem, index) => {
      stickyItem.offset = index;
      slots.set(index, stickyItem);
    });
  }
  flattenItems(items, depth = 0, parents = []) {
    let result = [];
    for (const item of items) {
      const flatItem = {
        data: item,
        id: item.id,
        depth,
        parents: [...parents]
      };
      result.push(flatItem);
      this.itemsById.set(item.id, item);
      this.flatItemsById.set(item.id, flatItem);
      if (!this.itemVersions.has(item.id)) {
        this.itemVersions.set(item.id, 0);
      }
      if (item.children && item.children.length > 0) {
        const childParents = [...parents, item.id];
        const children = this.flattenItems(item.children, depth + 1, childParents);
        result = result.concat(children);
      }
    }
    return result;
  }
  /* Utility Methods */
  getOriginalId(uniqueId) {
    const separatorIndex = uniqueId.lastIndexOf("__");
    return separatorIndex !== -1 ? uniqueId.substring(0, separatorIndex) : uniqueId;
  }
  getAbsoluteIndexFromUniqueId(uniqueId) {
    const parts = uniqueId.split("__");
    return parseInt(parts[parts.length - 1], 10);
  }
  getItemData(id) {
    const originalId = this.getOriginalId(id);
    const flatItem = this.flatItemsById.get(originalId);
    if (!flatItem) {
      throw new Error(`Item with id "${originalId}" (derived from "${id}") not found`);
    }
    const parentId = flatItem.parents.length > 0 ? flatItem.parents[flatItem.parents.length - 1] : void 0;
    return {
      ...flatItem.data,
      depth: flatItem.depth,
      hasChildren: flatItem.data.children && flatItem.data.children.length > 0,
      parentId
    };
  }
  getTotalPositions() {
    return this.totalPositions;
  }
  getInitialPosition() {
    return Math.floor(this.totalPositions / 2);
  }
};

// src/strategies/InfiniteHierarchySelection/InfiniteHierarchySelectionStrategy.ts
var InfiniteHierarchySelectionStrategy = class {
  constructor(items, options) {
    this.itemsById = /* @__PURE__ */ new Map();
    this.flatItemsById = /* @__PURE__ */ new Map();
    this.itemVersions = /* @__PURE__ */ new Map();
    this.flatItems = this.flattenItems(items);
    this.totalPositions = options?.totalPositions ?? 1e5;
    this.selectedIds = /* @__PURE__ */ new Set();
  }
  /**
   * Main entry point for calculating visible items.
   * Extends the base algorithm to include selected items as sticky headers.
   */
  getItemsAtPosition(position, viewportSlots) {
    if (this.flatItems.length === 0) {
      return [];
    }
    const naturalSlots = this.generateNaturalSlots(position, viewportSlots);
    const sections = this.groupItemsIntoSections(naturalSlots);
    return this.resolveStickyHeaders(position, naturalSlots, sections);
  }
  /* Core Pipeline Steps */
  generateNaturalSlots(position, viewportSlots) {
    const naturalSlots = [];
    for (let slot = 0; slot < viewportSlots; slot++) {
      const absoluteIndex = position + slot;
      let itemIndex = absoluteIndex % this.flatItems.length;
      if (itemIndex < 0) {
        itemIndex += this.flatItems.length;
      }
      const flatItem = this.flatItems[itemIndex];
      const originalId = flatItem.id;
      const version = this.itemVersions.get(originalId);
      const uniqueId = `${originalId}__${absoluteIndex}`;
      naturalSlots.push({
        id: uniqueId,
        offset: slot,
        index: absoluteIndex,
        version
      });
    }
    return naturalSlots;
  }
  groupItemsIntoSections(naturalSlots) {
    const sections = [];
    let currentSection = null;
    let lastFlatIndex = -1;
    for (const item of naturalSlots) {
      const originalId = this.getOriginalId(item.id);
      const flatItem = this.flatItemsById.get(originalId);
      if (!flatItem) continue;
      const flatIndex = this.flatItems.indexOf(flatItem);
      const rootId = flatItem.parents.length > 0 ? flatItem.parents[0] : flatItem.id;
      const isWrap = lastFlatIndex !== -1 && flatIndex < lastFlatIndex;
      const isNewRoot = !currentSection || currentSection.rootId !== rootId;
      if (isNewRoot || isWrap) {
        currentSection = {
          rootId,
          items: []
        };
        sections.push(currentSection);
      }
      currentSection.items.push(item);
      lastFlatIndex = flatIndex;
    }
    return sections;
  }
  /**
   * Core algorithm for determining sticky headers.
   * Differs from base strategy by prioritizing selected items.
   * 
   * Priority Logic:
   * 1. Selected items (always sticky if not visible).
   * 2. Hierarchical parents (sticky if needed by visible child).
   * 
   * When conflicts arise (need space):
   * - Selected items are NEVER removed from the sticky stack.
   * - Hierarchical parents from previous sections CAN be removed (popped).
   */
  resolveStickyHeaders(position, naturalSlots, sections) {
    const finalSlots = /* @__PURE__ */ new Map();
    naturalSlots.forEach((item) => finalSlots.set(item.offset, item));
    let previousStickyStack = this.getInitialSelectedStickyStack(position, naturalSlots);
    for (const section of sections) {
      let currentSectionStickyStack = [];
      let restartSection = true;
      while (restartSection) {
        restartSection = false;
        const effectiveList = [...previousStickyStack, ...currentSectionStickyStack];
        const effectiveCount = effectiveList.length;
        if (this.checkForCoveredSelection(naturalSlots, effectiveList, effectiveCount)) {
          const itemToSticky = this.findCoveredSelected(naturalSlots, effectiveList, effectiveCount);
          if (itemToSticky) {
            currentSectionStickyStack.push(itemToSticky);
            restartSection = true;
            continue;
          }
        }
        let sectionHasUncoveredItems = false;
        let allUncoveredSatisfied = true;
        for (let i = section.items.length - 1; i >= 0; i--) {
          const item = section.items[i];
          if (item.offset < effectiveCount) {
            continue;
          }
          sectionHasUncoveredItems = true;
          const uncoveredItem = item;
          const missingParentInfo = this.findMissingParent(uncoveredItem, effectiveList, section.items, effectiveCount);
          if (missingParentInfo) {
            if (previousStickyStack.length > 0) {
              const candidateToRemove = previousStickyStack[previousStickyStack.length - 1];
              const candidateId = this.getOriginalId(candidateToRemove.id);
              if (!this.selectedIds.has(candidateId)) {
                previousStickyStack.pop();
              } else {
              }
            }
            currentSectionStickyStack.push(missingParentInfo);
            restartSection = true;
            allUncoveredSatisfied = false;
            break;
          }
        }
        if (restartSection) {
          continue;
        }
        if (!sectionHasUncoveredItems) {
          break;
        }
        if (allUncoveredSatisfied) {
          const finalStickyList2 = [...previousStickyStack, ...currentSectionStickyStack];
          this.applyStickyItemsToSlots(finalSlots, finalStickyList2);
          return Array.from(finalSlots.values()).sort((a, b) => a.offset - b.offset);
        }
      }
      previousStickyStack = [...previousStickyStack, ...currentSectionStickyStack];
    }
    const finalStickyList = previousStickyStack;
    this.applyStickyItemsToSlots(finalSlots, finalStickyList);
    return Array.from(finalSlots.values()).sort((a, b) => a.offset - b.offset);
  }
  /* Helpers for Sticky Logic */
  getInitialSelectedStickyStack(position, naturalSlots) {
    const naturalIds = new Set(naturalSlots.map((item) => this.getOriginalId(item.id)));
    const initialSticky = [];
    this.selectedIds.forEach((id) => {
      if (!naturalIds.has(id)) {
        const flatItem = this.flatItemsById.get(id);
        if (flatItem) {
          const absoluteIndex = this.getClosestInstanceAbove(flatItem, position);
          const uniqueId = `${id}__${absoluteIndex}`;
          initialSticky.push({
            id: uniqueId,
            offset: 0,
            index: absoluteIndex,
            version: this.itemVersions.get(id)
          });
        }
      }
    });
    initialSticky.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    return initialSticky;
  }
  checkForCoveredSelection(naturalSlots, effectiveList, effectiveCount) {
    return !!this.findCoveredSelected(naturalSlots, effectiveList, effectiveCount);
  }
  findCoveredSelected(naturalSlots, effectiveList, effectiveCount) {
    for (let i = 0; i < effectiveCount; i++) {
      if (i >= naturalSlots.length) break;
      const naturalItem = naturalSlots[i];
      const originalId = this.getOriginalId(naturalItem.id);
      const alreadySticky = effectiveList.some((s) => this.getOriginalId(s.id) === originalId);
      if (alreadySticky) continue;
      if (this.selectedIds.has(originalId)) {
        return {
          ...naturalItem,
          offset: 0
        };
      }
    }
    return null;
  }
  findMissingParent(item, effectiveList, sectionItems, effectiveCount) {
    const originalId = this.getOriginalId(item.id);
    const flatItem = this.flatItemsById.get(originalId);
    if (!flatItem) return null;
    for (const parentId of flatItem.parents) {
      const inSticky = effectiveList.some((s) => this.getOriginalId(s.id) === parentId);
      if (inSticky) continue;
      const parentUniqueId = this.calculateParentUniqueId(flatItem, parentId, item.index);
      if (!parentUniqueId) continue;
      const naturalParent = sectionItems.find(
        (si) => si.id === parentUniqueId && si.offset >= effectiveCount
      );
      if (naturalParent) continue;
      return {
        id: parentUniqueId,
        offset: 0,
        index: this.getAbsoluteIndexFromUniqueId(parentUniqueId),
        version: this.itemVersions.get(parentId)
      };
    }
    return null;
  }
  calculateParentUniqueId(childFlatItem, parentId, childAbsoluteIndex) {
    if (childAbsoluteIndex === void 0) return null;
    const parentFlatItem = this.flatItemsById.get(parentId);
    if (!parentFlatItem) return null;
    const childFlatIndex = this.flatItems.indexOf(childFlatItem);
    const parentFlatIndex = this.flatItems.indexOf(parentFlatItem);
    const distance = childFlatIndex - parentFlatIndex;
    const parentAbsoluteIndex = childAbsoluteIndex - distance;
    return `${parentId}__${parentAbsoluteIndex}`;
  }
  getAbsoluteIndexFromUniqueId(uniqueId) {
    const parts = uniqueId.split("__");
    return parseInt(parts[parts.length - 1], 10);
  }
  applyStickyItemsToSlots(slots, stickyList) {
    stickyList.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    stickyList.forEach((stickyItem, index) => {
      stickyItem.offset = index;
      slots.set(index, stickyItem);
    });
  }
  flattenItems(items, depth = 0, parents = []) {
    let result = [];
    for (const item of items) {
      const flatItem = {
        data: item,
        id: item.id,
        depth,
        parents: [...parents]
      };
      result.push(flatItem);
      this.itemsById.set(item.id, item);
      this.flatItemsById.set(item.id, flatItem);
      if (!this.itemVersions.has(item.id)) {
        this.itemVersions.set(item.id, 0);
      }
      if (item.children && item.children.length > 0) {
        const childParents = [...parents, item.id];
        const children = this.flattenItems(item.children, depth + 1, childParents);
        result = result.concat(children);
      }
    }
    return result;
  }
  /* Utility Methods */
  getClosestInstanceAbove(flatItem, position) {
    const totalItems = this.flatItems.length;
    const itemIndex = this.flatItems.indexOf(flatItem);
    const loopStart = Math.floor(position / totalItems) * totalItems;
    let candidate = loopStart + itemIndex;
    if (candidate > position) {
      candidate -= totalItems;
    }
    return candidate;
  }
  getOriginalId(uniqueId) {
    const separatorIndex = uniqueId.lastIndexOf("__");
    return separatorIndex !== -1 ? uniqueId.substring(0, separatorIndex) : uniqueId;
  }
  // Selection API
  toggleSelection(id) {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
    this.notifySelectionChange();
  }
  select(id) {
    this.selectedIds.add(id);
    this.notifySelectionChange();
  }
  deselect(id) {
    this.selectedIds.delete(id);
    this.notifySelectionChange();
  }
  getSelectedIds() {
    return new Set(this.selectedIds);
  }
  setOnSelectionChange(callback) {
    this.onSelectionChangeCallback = callback;
  }
  notifySelectionChange() {
    if (this.onSelectionChangeCallback) {
      this.onSelectionChangeCallback(new Set(this.selectedIds));
    }
  }
  getItemData(id) {
    const originalId = this.getOriginalId(id);
    const flatItem = this.flatItemsById.get(originalId);
    if (!flatItem) {
      throw new Error(`Item with id "${originalId}" (derived from "${id}") not found`);
    }
    const parentId = flatItem.parents.length > 0 ? flatItem.parents[flatItem.parents.length - 1] : void 0;
    return {
      ...flatItem.data,
      depth: flatItem.depth,
      hasChildren: flatItem.data.children && flatItem.data.children.length > 0,
      parentId,
      isSelected: this.selectedIds.has(originalId)
    };
  }
  getTotalPositions() {
    return this.totalPositions;
  }
  getInitialPosition() {
    return Math.floor(this.totalPositions / 2);
  }
  /**
   * Iteratively searches for a scroll position where the item becomes naturally visible (not sticky).
   * Simulates deselection to ensure the item doesn't disappear when stickiness is removed.
   */
  findSafeScrollPosition(id, currentPosition, viewportSlots) {
    const originalId = this.getOriginalId(id);
    if (!this.flatItemsById.has(originalId)) {
      return currentPosition;
    }
    const wasSelected = this.selectedIds.has(originalId);
    if (wasSelected) {
      this.selectedIds.delete(originalId);
    }
    let testPos = Math.floor(currentPosition);
    const limit = this.flatItems.length * 2;
    let iterations = 0;
    try {
      while (iterations < limit) {
        const items = this.getItemsAtPosition(testPos, viewportSlots);
        const isVisible = items.some((item) => this.getOriginalId(item.id) === originalId);
        if (isVisible) {
          return testPos;
        }
        testPos--;
        iterations++;
      }
    } finally {
      if (wasSelected) {
        this.selectedIds.add(originalId);
      }
    }
    return currentPosition;
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  InfiniteHierarchySelectionStrategy,
  InfiniteHierarchyStrategy,
  InfiniteLoopStrategy,
  TweenList
});
