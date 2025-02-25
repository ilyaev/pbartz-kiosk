/* eslint-disable no-unused-vars */
import Observe from "./observe";
import { SpotifyPlaybackState, SpotifyAudioAnalysis } from "./types";
import ease from "./easing";
import { interpolate } from "./index";
import { scaleLog } from "d3-scale";
import { min } from "d3-array";

interface TrackSyncOptions {
    volumeSmoothing: number;
}

export class TrackSync {
    volume?: number;
    state: TrackSyncState = Observe({
        intervalTypes: ["tatums", "segments", "beats", "bars", "sections"],
        activeIntervals: Observe({
            tatums: {},
            segments: {},
            beats: {},
            bars: {},
            sections: {},
        }),
        currentlyPlaying: {},
        trackAnalysis: {} as SpotifyAudioAnalysis,
        trackFeatures: {},
        initialTrackProgress: 0,
        initialStart: 0,
        trackProgress: 0,
        active: false,
        initialized: false,
        volumeSmoothing: 10,
        volume: 0,
        queues: {
            volume: [],
            beat: [],
        },
        finished: false,
    } as Partial<TrackSyncState>);

    hooks: any = {
        tatum: () => {},
        segment: () => {},
        beat: () => {},
        bar: () => {},
        section: () => {},
    };

    constructor(options?: TrackSyncOptions) {
        this.state.volumeSmoothing =
            options && options.volumeSmoothing
                ? options.volumeSmoothing
                : this.state.volumeSmoothing;
        this.initHooks();
    }

    setTrack(trackAnalysis: SpotifyAudioAnalysis, id: string) {
        if (id !== this.state.currentlyPlaying.id) {
            this.state.trackAnalysis = trackAnalysis;
        }
    }

    processPlaybackState(
        data: SpotifyPlaybackState,
        syncTimeOnly: boolean = false
    ) {
        const songsInSync =
            JSON.stringify(data.item) ===
            JSON.stringify(this.state.currentlyPlaying);

        if (!data.item || !data.item.duration_ms) {
            return;
        }

        if (
            (this.state.initialized === false || !songsInSync) &&
            syncTimeOnly === false
        ) {
            this.getTrackInfo(data);
        } else {
            this.state.initialTrackProgress = data.progress_ms;
            this.state.trackProgress = data.progress_ms;
            this.state.initialStart = window.performance.now();
            this.state.active = data.is_playing;
        }
    }

    getTrackInfo(data: SpotifyPlaybackState) {
        const tick = window.performance.now();
        const analysis = this.state.trackAnalysis;

        this.state.intervalTypes.forEach((t) => {
            const type = (analysis as any)[t];
            if (!type) return;
            type[0].duration = type[0].start + type[0].duration;
            type[0].start = 0;
            type[type.length - 1].duration =
                data.item.duration_ms / 1000 - type[type.length - 1].start;
            type.forEach((interval: any) => {
                if (interval.loudness_max_time) {
                    interval.loudness_max_time =
                        interval.loudness_max_time * 1000;
                }
                interval.start = interval.start * 1000;
                interval.duration = interval.duration * 1000;
            });
        });

        const tock = window.performance.now() - tick;

        this.state.currentlyPlaying = data.item;
        this.state.trackAnalysis = analysis;
        this.state.initialTrackProgress = data.progress_ms + tock;
        this.state.trackProgress = data.progress_ms + tock;
        this.state.initialStart = window.performance.now();

        if (this.state.initialized === false) {
            this.state.initialized = true;
        }

        this.state.active = data.is_playing;
    }

    setActiveIntervals() {
        const determineInterval = (type: any) => {
            const analysis = (this.state.trackAnalysis as any)[type];
            const progress = this.state.trackProgress;
            for (let i = 0; i < analysis.length; i++) {
                if (i === analysis.length - 1) return i;
                if (
                    analysis[i].start < progress &&
                    progress < analysis[i + 1].start
                )
                    return i;
            }
        };

        this.state.intervalTypes.forEach((type) => {
            const index = determineInterval(type);
            if (
                !(this.state.activeIntervals as any)[type].start ||
                index !== (this.state.activeIntervals as any)[type].index
            ) {
                (this.state.activeIntervals as any)[type] = {
                    ...(this.state.trackAnalysis as any)[type][index as number],
                    index,
                };
            }

            const { start, duration } = (this.state.activeIntervals as any)[
                type
            ];
            const elapsed = this.state.trackProgress - start;
            (this.state.activeIntervals as any)[type].elapsed = elapsed;
            (this.state.activeIntervals as any)[type].progress = ease(
                elapsed / duration
            );
        });
    }

    getVolume() {
        const {
            loudness_max,
            loudness_start,
            loudness_max_time,
            duration,
            elapsed,
            start,
            index,
        } = this.state.activeIntervals.segments;

        if (!this.state.trackAnalysis.segments[index + 1]) return 0;

        const next =
            this.state.trackAnalysis.segments[index + 1].loudness_start;
        const current = start + elapsed;
        if (elapsed < loudness_max_time) {
            const progress = Math.min(1, elapsed / loudness_max_time);
            return interpolate(loudness_start, loudness_max)(progress);
        } else {
            const _start = start + loudness_max_time;
            const _elapsed = current - _start;
            const _duration = duration - loudness_max_time;
            const progress = Math.min(1, _elapsed / _duration);
            return interpolate(loudness_max, next)(progress);
        }
    }

    getInterval(type: string) {
        return (this.state.activeIntervals as any)[type + "s"];
    }

    tick(now: number) {
        if (!this.state.active) return;

        /** Set track progress and active intervals. */
        this.state.trackProgress =
            now - this.state.initialStart + this.state.initialTrackProgress;
        this.setActiveIntervals();

        /** Get current volume. */
        const volume = this.getVolume();
        const queues = this.state.queues;

        /** Add volume value to the beginning of the volume queue. */
        queues.volume.unshift(volume);

        /** If the queue is larger than 400 values, remove the last value. */
        if (queues.volume.length > 400) {
            queues.volume.pop();
        }

        /** Add volume value to the beginning of the beat queue. */
        queues.beat.unshift(volume);

        /** If the queue is larger than our defined smoothing value, remove the last value. */
        if (queues.beat.length > this.state.volumeSmoothing) {
            queues.beat.pop();
        }

        function average(arr: any[]) {
            return arr.reduce((a, b) => a + b) / arr.length;
        }

        /** Scale volume (dB) to a linear range using the minimum and average values of the volume queue. */
        const sizeScale = scaleLog()
            .domain([min(queues.volume), average(queues.volume)])
            .range([0, 1]);

        /** Average the beat queue, then pass it to our size scale. */
        const beat = average(queues.beat);
        this.volume = sizeScale(beat);
        if (
            this.state.trackProgress >= this.state.currentlyPlaying.duration_ms
        ) {
            this.state.finished = true;
            this.state.active = false;
        }
    }

    watch(key: string, method: any) {
        this.state.watch(key, method);
    }

    on(interval: any, method: any) {
        this.hooks[interval] = method;
    }

    initHooks() {
        this.state.activeIntervals.watch("tatums", (t) => this.hooks.tatum(t));
        this.state.activeIntervals.watch("segments", (s) =>
            this.hooks.segment(s)
        );
        this.state.activeIntervals.watch("beats", (b) => this.hooks.beat(b));
        this.state.activeIntervals.watch("bars", (b) => this.hooks.bar(b));
        this.state.activeIntervals.watch("sections", (s) =>
            this.hooks.section(s)
        );
    }
}

type ObserveWatcher = (key: string, callback: (val: any) => void) => void;

export interface TrackSyncState {
    intervalTypes: string[];
    activeIntervals: {
        tatums: any;
        segments: any;
        beats: any;
        bars: any;
        sections: any;
        watch: ObserveWatcher;
    };
    currentlyPlaying: any; //TrackObjectFull;
    trackAnalysis: SpotifyAudioAnalysis;
    trackFeatures: any;
    initialTrackProgress: number;
    initialStart: number;
    trackProgress: number;
    active: boolean;
    initialized: boolean;
    volumeSmoothing: any;
    volume: number;
    queues: {
        volume: any[];
        beat: any[];
    };
    watch: ObserveWatcher;
    finished: boolean;
}
