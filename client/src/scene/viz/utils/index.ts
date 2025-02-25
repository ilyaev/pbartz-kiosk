export const bem = (parent: string) => (child?: string, params?: any) => {
    const res = [parent].concat(child ? [child] : []);
    const first = res.join("_");
    params &&
        Object.keys(params).forEach((param) => {
            params[param] && res.push(param);
        });
    return params ? first + " " + res.join("_") : first;
};

export const normalizeSpotifyURI = (uri: string) =>
    uri
        .split(":")
        .slice(-3)
        .map((one, index) => (index === 0 ? "spotify" : one))
        .join(":");

export const waitForTime = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

export const msToString = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.round((ms - mins * 60000) / 1000);
    return `${mins < 10 ? "0" + mins : mins}:${secs < 10 ? "0" + secs : secs}`;
};

export const mkTime = () => Math.round(new Date().getTime() / 1000);

export const interpolate = (a: number, b: number) => {
    return function (t: number) {
        return a * (1 - t) + b * t;
    };
};

export const getRandomColor = (max: number = 1) => {
    const r = Math.random() * max;
    const g = Math.random() * max;
    const b = Math.random() * max;
    return [r, g, b];
};
