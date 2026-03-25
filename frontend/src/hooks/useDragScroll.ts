import { useRef, useCallback, useEffect } from 'react';

/**
 * useDragScroll
 * Attaches mouse-drag and touch-scroll behavior to a horizontal overflow container.
 * Also tracks scroll position to expose "canScrollLeft" / "canScrollRight" booleans
 * so parent components can render gradient edge indicators.
 */
export function useDragScroll() {
    const ref = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);
    const velocity = useRef(0);
    const lastX = useRef(0);
    const lastTime = useRef(0);
    const rafId = useRef<number | null>(null);

    const startDrag = useCallback((clientX: number) => {
        const el = ref.current;
        if (!el) return;
        isDragging.current = true;
        startX.current = clientX - el.offsetLeft;
        scrollLeft.current = el.scrollLeft;
        lastX.current = clientX;
        lastTime.current = Date.now();
        velocity.current = 0;
        if (rafId.current) cancelAnimationFrame(rafId.current);
        el.style.cursor = 'grabbing';
        el.style.userSelect = 'none';
    }, []);

    const onDrag = useCallback((clientX: number) => {
        if (!isDragging.current) return;
        const el = ref.current;
        if (!el) return;
        const x = clientX - el.offsetLeft;
        const walk = (x - startX.current) * 1.2; // Multiplier for speed
        el.scrollLeft = scrollLeft.current - walk;

        const now = Date.now();
        const dt = now - lastTime.current;
        if (dt > 0) {
            velocity.current = (clientX - lastX.current) / dt;
        }
        lastX.current = clientX;
        lastTime.current = now;
    }, []);

    const stopDrag = useCallback(() => {
        if (!isDragging.current) return;
        isDragging.current = false;
        const el = ref.current;
        if (!el) return;
        el.style.cursor = '';
        el.style.userSelect = '';

        // Inertia: continue scroll with decaying velocity
        let vel = velocity.current * 15;
        const inertia = () => {
            if (!el || Math.abs(vel) < 0.5) return;
            el.scrollLeft -= vel;
            vel *= 0.92;
            rafId.current = requestAnimationFrame(inertia);
        };
        rafId.current = requestAnimationFrame(inertia);
    }, []);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const onMouseDown = (e: MouseEvent) => {
            startDrag(e.clientX);
        };
        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging.current) return;
            e.preventDefault();
            onDrag(e.clientX);
        };
        const onMouseUp = () => stopDrag();
        const onMouseLeave = () => {
            if (isDragging.current) stopDrag();
        };

        el.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        el.addEventListener('mouseleave', onMouseLeave);

        return () => {
            el.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            el.removeEventListener('mouseleave', onMouseLeave);
            if (rafId.current) cancelAnimationFrame(rafId.current);
        };
    }, [startDrag, onDrag, stopDrag]);

    return ref;
}
