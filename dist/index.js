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
  InfiniteLoopStrategy: () => InfiniteLoopStrategy,
  VirtualContainer: () => VirtualContainer
});
module.exports = __toCommonJS(index_exports);

// src/VirtualContainer.tsx
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
      result.push({
        id,
        offset,
        index,
        opacity: 1,
        isAppearing,
        isDisappearing,
        isMoving,
        hasChanged,
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
        version: inCeil.version
      });
    }
  }
  return result;
}

// src/VirtualContainer.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var MAX_SCROLL_HEIGHT = 1e7;
function VirtualContainer(props) {
  const {
    strategy,
    height,
    slotHeight,
    width = "100%",
    overscan = 2,
    children,
    onPositionChange,
    signal,
    className,
    style
  } = props;
  const [scrollPosition, setScrollPosition] = (0, import_react.useState)(
    strategy.getInitialPosition()
  );
  const containerRef = (0, import_react.useRef)(null);
  const rafRef = (0, import_react.useRef)(null);
  const prevItemsRef = (0, import_react.useRef)(/* @__PURE__ */ new Map());
  const viewportSlots = Math.ceil(height / slotHeight);
  const totalSlots = viewportSlots + overscan * 2;
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
    const ceil2 = floor2 === scrollPosition ? floor2 : floor2 + 1;
    const t2 = scrollPosition - floor2;
    return { floor: floor2, ceil: ceil2, t: t2 };
  }, [scrollPosition]);
  const itemsAtFloor = (0, import_react.useMemo)(() => {
    return strategy.getItemsAtPosition(floor, totalSlots);
  }, [strategy, floor, totalSlots, signal]);
  const itemsAtCeil = (0, import_react.useMemo)(() => {
    return strategy.getItemsAtPosition(ceil, totalSlots);
  }, [strategy, ceil, totalSlots, signal]);
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "div",
    {
      ref: containerRef,
      className,
      style: {
        height: `${height}px`,
        width,
        overflow: "auto",
        position: "relative",
        ...style
      },
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { height: `${scrollHeight}px`, position: "relative" }, children: interpolatedItems.map((item) => {
        const data = strategy.getItemData(item.id);
        const itemState = {
          id: item.id,
          offset: item.offset,
          index: item.index,
          opacity: item.opacity,
          isAppearing: item.isAppearing,
          isDisappearing: item.isDisappearing,
          isMoving: item.isMoving,
          hasChanged: item.hasChanged
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
      }) })
    }
  );
}

// src/strategies/InfiniteLoopStrategy.ts
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  InfiniteLoopStrategy,
  VirtualContainer
});
