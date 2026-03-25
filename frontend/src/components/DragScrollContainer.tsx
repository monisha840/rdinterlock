import React, { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface DragScrollContainerProps {
    children: React.ReactNode;
    className?: string;
    showHint?: boolean;
}

/**
 * DragScrollContainer
 * Wraps any horizontally-overflowing content with:
 *  - Hidden scrollbar
 *  - Mouse drag-to-scroll with inertia
 *  - Touch native scroll (smooth)
 *  - Left/right gradient fade indicators
 *  - Grab cursor feedback
 */
export const DragScrollContainer: React.FC<DragScrollContainerProps> = ({
    children,
    className,
    showHint = false,
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const startScrollLeft = useRef(0);
    const velocity = useRef(0);
    const lastX = useRef(0);
    const lastTime = useRef(0);
    const rafId = useRef<number | null>(null);

    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const updateScrollState = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 4);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }, []);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        updateScrollState();
        const observer = new ResizeObserver(updateScrollState);
        observer.observe(el);
        el.addEventListener('scroll', updateScrollState, { passive: true });

        return () => {
            observer.disconnect();
            el.removeEventListener('scroll', updateScrollState);
        };
    }, [updateScrollState]);

    const stopInertia = () => {
        if (rafId.current) {
            cancelAnimationFrame(rafId.current);
            rafId.current = null;
        }
    };

    const applyInertia = (vel: number) => {
        const el = ref.current;
        if (!el || Math.abs(vel) < 0.5) return;
        el.scrollLeft -= vel;
        rafId.current = requestAnimationFrame(() => applyInertia(vel * 0.92));
    };

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const onMouseDown = (e: MouseEvent) => {
            stopInertia();
            isDragging.current = true;
            startX.current = e.clientX;
            startScrollLeft.current = el.scrollLeft;
            lastX.current = e.clientX;
            lastTime.current = Date.now();
            velocity.current = 0;
            el.style.cursor = 'grabbing';
            el.style.userSelect = 'none';
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging.current) return;
            e.preventDefault();
            const dx = e.clientX - startX.current;
            el.scrollLeft = startScrollLeft.current - dx;
            const now = Date.now();
            const dt = now - lastTime.current;
            if (dt > 0) velocity.current = (e.clientX - lastX.current) / dt;
            lastX.current = e.clientX;
            lastTime.current = now;
        };

        const onMouseUp = () => {
            if (!isDragging.current) return;
            isDragging.current = false;
            el.style.cursor = '';
            el.style.userSelect = '';
            applyInertia(velocity.current * 10);
        };

        el.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        return () => {
            el.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            stopInertia();
        };
    }, []);

    return (
        <div className="relative">
            {/* Left fade gradient */}
            {canScrollLeft && (
                <div
                    className="absolute left-0 top-0 bottom-0 w-10 z-10 pointer-events-none"
                    style={{
                        background: 'linear-gradient(to right, hsl(var(--card)) 0%, transparent 100%)',
                    }}
                />
            )}

            {/* Right fade gradient */}
            {canScrollRight && (
                <div
                    className="absolute right-0 top-0 bottom-0 w-10 z-10 pointer-events-none"
                    style={{
                        background: 'linear-gradient(to left, hsl(var(--card)) 0%, transparent 100%)',
                    }}
                />
            )}

            {/* Scrollable container */}
            <div
                ref={ref}
                className={cn('overflow-x-auto scrollbar-hide cursor-grab select-none', className)}
                style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
            >
                {children}
            </div>

            {/* Swipe hint for first load */}
            {showHint && canScrollRight && (
                <div className="flex items-center justify-end gap-1 mt-1 pr-1">
                    <span className="text-[9px] font-semibold text-muted-foreground/60 animate-pulse">
                        swipe to view more →
                    </span>
                </div>
            )}
        </div>
    );
};
