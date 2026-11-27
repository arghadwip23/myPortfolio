"use client";

import { useEffect, useRef, useState } from "react";

import {
    FiPlay,
    FiPause,
    FiRewind,
    FiFastForward,
    FiChevronRight,
    FiChevronLeft,
    FiVolume2,
    FiVolumeX,
} from "react-icons/fi";

export default function HoverSound() {
    const [expanded, setExpanded] = useState(false);
    const [soundFx, setSoundFx] = useState(false);
    const [soundtrack, setSoundtrack] = useState(false);
    const [preferencesLoaded, setPreferencesLoaded] = useState(false);

    const hoverAudio = useRef(null);
    const musicAudio = useRef(null);
    const lastPlayed = useRef(0);

    // Restore visitor's sound FX preference
    useEffect(() => {
        const saved = localStorage.getItem("ui-sound-enabled");

        setSoundFx(saved === "true");
        setPreferencesLoaded(true);
    }, []);

    // Persist sound FX preference
    useEffect(() => {
        if (!preferencesLoaded) return;

        localStorage.setItem("ui-sound-enabled", String(soundFx));
    }, [soundFx, preferencesLoaded]);

    // `volume` is not a valid <audio> prop in React, so set it via ref
    useEffect(() => {
        if (hoverAudio.current) hoverAudio.current.volume = 0.35;
    }, []);

    // Detect mouse hover on interactive elements
    useEffect(() => {
        if (!soundFx) return;

        const handlePointerOver = (event) => {
            if (event.pointerType !== "mouse") return;

            const target = event.target;

            if (!(target instanceof Element)) return;

            // Ignore movement between children of the same element
            if (
                event.relatedTarget instanceof Node &&
                target.contains(event.relatedTarget)
            ) {
                return;
            }

            const interactive = target.closest(
                'a, button, [role="button"], [data-cursor-pointer]'
            );

            const hasPointerCursor =
                window.getComputedStyle(target).cursor === "pointer";

            if (!interactive && !hasPointerCursor) return;

            // Avoid excessive sound triggering
            const now = Date.now();

            if (now - lastPlayed.current < 120) return;

            lastPlayed.current = now;

            const audio = hoverAudio.current;

            if (!audio) return;

            audio.currentTime = 0;

            audio.play().catch(() => {
                // Respect browser autoplay restrictions
            });
        };

        document.addEventListener("pointerover", handlePointerOver);

        return () => {
            document.removeEventListener("pointerover", handlePointerOver);
        };
    }, [soundFx]);

    const toggleSoundFx = () => setSoundFx((previous) => !previous);

    const toggleSoundtrack = () => {
        const audio = musicAudio.current;

        if (!audio) return;

        if (soundtrack) {
            audio.pause();
            setSoundtrack(false);
            return;
        }

        audio
            .play()
            .then(() => setSoundtrack(true))
            .catch(() => setSoundtrack(false));
    };

    const rewindTrack = () => {
        const audio = musicAudio.current;

        if (!audio) return;

        audio.currentTime = Math.max(0, audio.currentTime - 10);
    };

    const forwardTrack = () => {
        const audio = musicAudio.current;

        if (!audio || !Number.isFinite(audio.duration)) return;

        audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
    };

    return (
        <>
            {/* Audio elements */}
            <audio ref={hoverAudio} src="/assets/hover.mp3" preload="auto" />

            <audio
                ref={musicAudio}
                src="/assets/track-02.m4a"
                loop
                preload="none"
                onEnded={() => setSoundtrack(false)}
            />

            {/* Collapsed trigger — pinned to upper quarter of the screen */}
            <button
                type="button"
                onClick={() => setExpanded(true)}
                aria-label="Open sound controls"
                aria-expanded={expanded}
                className={`fixed left-0 top-1/4 z-[9999] flex items-center justify-center border-none bg-[#f1f2f3] text-[#77818b] cursor-pointer
                    h-[40px] w-[34px] rounded-l-none rounded-r-[20px] p-0
                    min-[601px]:h-[54px] min-[601px]:w-[112px] min-[601px]:justify-between min-[601px]:rounded-[40px] min-[601px]:pl-[20px] min-[601px]:pr-[12px]
                    text-[15px] font-medium transition-[background,color,opacity] duration-300 motion-reduce:transition-none hover:bg-[#e9eaec]
                    ${expanded ? "invisible pointer-events-none opacity-0" : ""}`}
            >
                <span className="hidden whitespace-nowrap min-[601px]:inline">
                    Sound
                </span>

                <span className="flex h-[22px] w-[22px] items-center justify-center text-[17px] text-[#171717]">
                    <FiChevronRight />
                </span>
            </button>

            {/* Expanded panel — vertically centered, never taller than the viewport */}
            <div className="pointer-events-none fixed inset-y-0 left-0 z-[9999] flex items-center">
                <div
                    aria-hidden={!expanded}
                    className={`relative w-[150px] min-[601px]:w-[180px] origin-left rounded-[22px] min-[601px]:rounded-[30px] bg-[#f1f2f3] text-[#171717]
                        transition-[opacity,transform,visibility] duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none
                        ${expanded
                            ? "visible pointer-events-auto translate-x-0 scale-100 opacity-100"
                            : "invisible pointer-events-none -translate-x-[12px] scale-[0.96] opacity-0"
                        }`}
                >
                    {/* Scrollable content (collapse tab stays outside so it isn't clipped) */}
                    <div className="max-h-[calc(100dvh-24px)] overflow-y-auto overscroll-contain rounded-[inherit] p-[9px] min-[601px]:p-[11px]">
                        {/* Album artwork — hidden on small screens to save space */}
                        <div className="aspect-square w-full overflow-hidden rounded-[13px] bg-[#dedfe0] max-[600px]:hidden">
                            <img
                                src="/assets/cover.webp"
                                alt="Ghost Protocol album artwork"
                                className="block h-full w-full object-cover transition-transform duration-[600ms] ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none hover:scale-[1.04]"
                            />
                        </div>

                        {/* Track information */}
                        <div className="flex flex-col gap-[3px] min-[601px]:mt-[12px]">
                            <span className="text-[12px] min-[601px]:text-[13px] font-bold tracking-[0.02em]">
                                GHOST PROTOCOL
                            </span>

                            <span className="text-[10px] font-medium text-[#929292]">
                                Original soundtrack
                            </span>
                        </div>

                        {/* Playback controls */}
                        <div className="my-[10px] flex items-center justify-around min-[601px]:my-[15px] min-[601px]:mb-[20px]">
                            <button
                                type="button"
                                onClick={rewindTrack}
                                aria-label="Rewind 10 seconds"
                                title="Rewind 10 seconds"
                                className="flex items-center justify-center border-none bg-transparent p-0 text-[16px] min-[601px]:text-[17px] text-[#171717] cursor-pointer transition-[transform,opacity] duration-250 motion-reduce:transition-none hover:scale-[1.15] hover:opacity-60"
                            >
                                <FiRewind />
                            </button>

                            <button
                                type="button"
                                className="flex h-[36px] w-[36px] min-[601px]:h-[42px] min-[601px]:w-[42px] items-center justify-center rounded-full border-none bg-[#171717] p-0 text-[16px] min-[601px]:text-[18px] text-white cursor-pointer transition-[transform,opacity] duration-250 motion-reduce:transition-none hover:scale-[1.15] hover:opacity-60"
                                onClick={toggleSoundtrack}
                                aria-label={soundtrack ? "Pause soundtrack" : "Play soundtrack"}
                            >
                                {soundtrack ? <FiPause /> : <FiPlay />}
                            </button>

                            <button
                                type="button"
                                onClick={forwardTrack}
                                aria-label="Forward 10 seconds"
                                title="Forward 10 seconds"
                                className="flex items-center justify-center border-none bg-transparent p-0 text-[16px] min-[601px]:text-[17px] text-[#171717] cursor-pointer transition-[transform,opacity] duration-250 motion-reduce:transition-none hover:scale-[1.15] hover:opacity-60"
                            >
                                <FiFastForward />
                            </button>
                        </div>

                        {/* Sound FX toggle */}
                        <div className="flex flex-col gap-[6px] min-[601px]:mt-[16px] min-[601px]:gap-[9px]">
                            <span className="text-[12px] min-[601px]:text-[14px] font-semibold text-[#858585]">
                                Sound Fx
                            </span>

                            <button
                                type="button"
                                className={`flex h-[38px] min-[601px]:h-[48px] w-full items-center justify-between rounded-[30px] border-none px-[14px] min-[601px]:px-[17px] text-[13px] min-[601px]:text-[14px] font-semibold cursor-pointer transition-[background,color,transform] duration-250 motion-reduce:transition-none hover:-translate-y-[1px] ${soundFx
                                        ? "bg-[#171717] text-white"
                                        : "bg-[#fafafa] text-[#77818b]"
                                    }`}
                                onClick={toggleSoundFx}
                                aria-pressed={soundFx}
                            >
                                <span>{soundFx ? "On" : "Off"}</span>
                                {soundFx ? <FiVolume2 /> : <FiVolumeX />}
                            </button>
                        </div>

                        {/* Soundtrack toggle */}
                        <div className="mt-[10px] flex flex-col gap-[6px] min-[601px]:mt-[16px] min-[601px]:gap-[9px]">
                            <span className="text-[12px] min-[601px]:text-[14px] font-semibold text-[#858585]">
                                Soundtrack
                            </span>

                            <button
                                type="button"
                                className={`flex h-[38px] min-[601px]:h-[48px] w-full items-center justify-between rounded-[30px] border-none px-[14px] min-[601px]:px-[17px] text-[13px] min-[601px]:text-[14px] font-semibold cursor-pointer transition-[background,color,transform] duration-250 motion-reduce:transition-none hover:-translate-y-[1px] ${soundtrack
                                        ? "bg-[#171717] text-white"
                                        : "bg-[#fafafa] text-[#77818b]"
                                    }`}
                                onClick={toggleSoundtrack}
                                aria-pressed={soundtrack}
                            >
                                <span>{soundtrack ? "On" : "Off"}</span>
                                {soundtrack ? <FiVolume2 /> : <FiVolumeX />}
                            </button>
                        </div>
                    </div>

                    {/* Collapse tab */}
                    <button
                        type="button"
                        className="absolute right-[-13px] top-1/2 flex h-[48px] w-[26px] -translate-y-1/2 items-center justify-center rounded-r-[18px] border-none bg-[#f1f2f3] text-[15px] text-[#171717] cursor-pointer transition-colors duration-250 motion-reduce:transition-none hover:bg-[#e5e6e8]"
                        onClick={() => setExpanded(false)}
                        aria-label="Collapse sound controls"
                    >
                        <FiChevronLeft />
                    </button>
                </div>
            </div>
        </>
    );
}