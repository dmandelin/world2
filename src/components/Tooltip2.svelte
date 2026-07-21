<script lang="ts">
    import { onMount, onDestroy, type Snippet } from "svelte";

    let { children }: { children?: Snippet } = $props();

    let anchorEl = $state<HTMLSpanElement | null>(null);
    let tooltipEl = $state<HTMLDivElement | null>(null);
    let targetEl = $state<HTMLElement | null>(null);

    let isVisible = $state(false);
    let isPinned = $state(false);
    let isMouseOverTarget = $state(false);
    let isMouseOverTooltip = $state(false);

    let pos = $state({ left: 0, top: 0 });
    let customPos = $state<{ left: number; top: number } | null>(null);

    let isDragging = $state(false);
    let dragStart = { mouseX: 0, mouseY: 0, posX: 0, posY: 0 };
    let openTimer: any = null;
    let closeTimer: any = null;
    let lastCloseTime = 0;

    function portal(node: HTMLElement) {
        if (typeof document !== "undefined" && document.body) {
            document.body.appendChild(node);
        }
        return {
            destroy() {
                if (node.parentNode) {
                    node.parentNode.removeChild(node);
                }
            },
        };
    }

    function calculatePosition() {
        if (typeof window === "undefined" || !targetEl || !tooltipEl) return;
        if (customPos) {
            pos = { ...customPos };
            return;
        }

        const targetRect = targetEl.getBoundingClientRect();
        const tooltipRect = tooltipEl.getBoundingClientRect();

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const gap = 8;
        const padding = 10;

        const tw = tooltipRect.width;
        const th = tooltipRect.height;

        // Default preference: try above target
        let top = targetRect.top - th - gap;
        let left = targetRect.left + (targetRect.width - tw) / 2;

        // If top goes offscreen (above viewport), place below target
        if (top < padding) {
            top = targetRect.bottom + gap;
        }

        // If bottom also goes offscreen, check side placements
        if (top + th > vh - padding && targetRect.top - th - gap < padding) {
            // Try right
            if (targetRect.right + tw + gap <= vw - padding) {
                left = targetRect.right + gap;
                top = targetRect.top + (targetRect.height - th) / 2;
            }
            // Or left
            else if (targetRect.left - tw - gap >= padding) {
                left = targetRect.left - tw - gap;
                top = targetRect.top + (targetRect.height - th) / 2;
            }
        }

        // Clamp to viewport boundaries
        left = Math.max(padding, Math.min(left, vw - tw - padding));
        top = Math.max(padding, Math.min(top, vh - th - padding));

        pos = { left, top };
    }

    function scheduleShow(delayMs: number) {
        if (isVisible) return;
        if (openTimer) clearTimeout(openTimer);
        openTimer = setTimeout(() => {
            if (isMouseOverTarget) {
                showTooltip();
            }
        }, delayMs);
    }

    function showTooltip() {
        if (closeTimer) {
            clearTimeout(closeTimer);
            closeTimer = null;
        }
        isVisible = true;
        if (typeof window !== "undefined") {
            requestAnimationFrame(() => {
                calculatePosition();
            });
        }
    }

    function hideTooltip() {
        if (isPinned) return;
        closeTimer = setTimeout(() => {
            if (!isMouseOverTarget && !isMouseOverTooltip && !isPinned) {
                isVisible = false;
                customPos = null;
                lastCloseTime = Date.now();
            }
        }, 150);
    }

    function handleTargetMouseEnter() {
        isMouseOverTarget = true;
        const isWarm = Date.now() - lastCloseTime < 250;
        scheduleShow(isWarm ? 80 : 120);
    }

    function handleTargetMouseMove() {
        if (!isVisible && isMouseOverTarget) {
            const isWarm = Date.now() - lastCloseTime < 250;
            scheduleShow(isWarm ? 80 : 120);
        }
    }

    function handleTargetMouseLeave() {
        isMouseOverTarget = false;
        if (openTimer) {
            clearTimeout(openTimer);
            openTimer = null;
        }
        hideTooltip();
    }

    function handleTooltipMouseEnter() {
        isMouseOverTooltip = true;
        if (closeTimer) {
            clearTimeout(closeTimer);
            closeTimer = null;
        }
    }

    function handleTooltipMouseLeave() {
        isMouseOverTooltip = false;
        hideTooltip();
    }

    function handleKeyDown(e: KeyboardEvent) {
        if (typeof document === "undefined") return;
        if (e.key === " " || e.code === "Space") {
            const active = document.activeElement;
            if (
                active &&
                (active.tagName === "INPUT" ||
                    active.tagName === "TEXTAREA" ||
                    (active as HTMLElement).isContentEditable)
            ) {
                return;
            }

            if (isVisible && (isMouseOverTarget || isMouseOverTooltip || isPinned)) {
                e.preventDefault();
                isPinned = !isPinned;
                if (!isPinned && !isMouseOverTarget && !isMouseOverTooltip) {
                    isVisible = false;
                    customPos = null;
                }
            }
        }
    }

    function dismissPinned() {
        isPinned = false;
        isVisible = false;
        customPos = null;
    }

    function handleMouseDown(e: MouseEvent) {
        if (!isPinned || typeof window === "undefined") return;
        // Don't drag if clicking buttons, inputs, links, or dismiss button
        const target = e.target as HTMLElement;
        if (target.closest("button, a, input, textarea, select")) {
            return;
        }

        isDragging = true;
        dragStart = {
            mouseX: e.clientX,
            mouseY: e.clientY,
            posX: pos.left,
            posY: pos.top,
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
    }

    function handleMouseMove(e: MouseEvent) {
        if (!isDragging || typeof window === "undefined") return;
        const dx = e.clientX - dragStart.mouseX;
        const dy = e.clientY - dragStart.mouseY;

        const newLeft = Math.max(0, Math.min(dragStart.posX + dx, window.innerWidth - 50));
        const newTop = Math.max(0, Math.min(dragStart.posY + dy, window.innerHeight - 30));

        customPos = { left: newLeft, top: newTop };
        pos = { left: newLeft, top: newTop };
    }

    function handleMouseUp() {
        isDragging = false;
        if (typeof window !== "undefined") {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        }
    }

    onMount(() => {
        if (anchorEl) {
            targetEl = anchorEl.parentElement;
            if (targetEl) {
                targetEl.addEventListener("mouseenter", handleTargetMouseEnter);
                targetEl.addEventListener("mousemove", handleTargetMouseMove);
                targetEl.addEventListener("mouseleave", handleTargetMouseLeave);
                targetEl.addEventListener("focusin", handleTargetMouseEnter);
                targetEl.addEventListener("focusout", handleTargetMouseLeave);
            }
        }

        if (typeof window !== "undefined") {
            window.addEventListener("keydown", handleKeyDown);
            window.addEventListener("scroll", calculatePosition, true);
            window.addEventListener("resize", calculatePosition);
        }
    });

    onDestroy(() => {
        if (targetEl) {
            targetEl.removeEventListener("mouseenter", handleTargetMouseEnter);
            targetEl.removeEventListener("mousemove", handleTargetMouseMove);
            targetEl.removeEventListener("mouseleave", handleTargetMouseLeave);
            targetEl.removeEventListener("focusin", handleTargetMouseEnter);
            targetEl.removeEventListener("focusout", handleTargetMouseLeave);
        }
        if (typeof window !== "undefined") {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("scroll", calculatePosition, true);
            window.removeEventListener("resize", calculatePosition);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        }
    });
</script>

<span bind:this={anchorEl} style="display: none;"></span>

{#if isVisible}
    <div
        use:portal
        bind:this={tooltipEl}
        class="tooltip2-bubble"
        class:is-pinned={isPinned}
        class:is-dragging={isDragging}
        style="left: {pos.left}px; top: {pos.top}px;"
        onmouseenter={handleTooltipMouseEnter}
        onmouseleave={handleTooltipMouseLeave}
        onmousedown={handleMouseDown}
        role="tooltip"
        tabindex="-1"
    >
        {#if isPinned}
            <div class="tooltip2-pinned-bar">
                <span class="pinned-indicator">📌 Pinned (Space to unpin)</span>
                <button
                    type="button"
                    class="tooltip2-close-btn"
                    onclick={dismissPinned}
                    title="Dismiss"
                >
                    ×
                </button>
            </div>
        {/if}

        <div class="tooltip2-content">
            {@render children?.()}
        </div>
    </div>
{/if}

<style>
    .tooltip2-bubble {
        position: fixed;
        background-color: #f9f6eb;
        color: #2c1e05;
        border: 2px solid #62531d;
        border-radius: 4px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        padding: 8px 12px;
        z-index: 999999;
        font-size: 0.875rem;
        font-weight: normal;
        line-height: 1.4;
        max-width: 90vw;
        box-sizing: border-box;
        text-align: left;
        user-select: text;
    }

    .tooltip2-bubble.is-pinned {
        border-color: #a0522d;
        border-style: dashed;
        cursor: move;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
    }

    .tooltip2-bubble.is-dragging {
        cursor: grabbing;
        opacity: 0.9;
    }

    .tooltip2-pinned-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 6px;
        padding-bottom: 4px;
        border-bottom: 1px solid #d4c8a5;
        user-select: none;
    }

    .pinned-indicator {
        font-size: 0.75rem;
        color: #7c4a03;
        font-weight: bold;
    }

    .tooltip2-close-btn {
        background: transparent;
        border: none;
        color: #62531d;
        font-size: 1.2rem;
        line-height: 1;
        cursor: pointer;
        padding: 0 4px;
        border-radius: 2px;
    }

    .tooltip2-close-btn:hover {
        background-color: #e5dac0;
        color: #a00;
    }

    .tooltip2-content {
        all: revert;
    }
</style>
