const _target = new EventTarget();

export const State = {
    setLoading(is) { _target.dispatchEvent(new CustomEvent('loading', { detail: !!is })); },
    onLoading(cb) { _target.addEventListener('loading', e => cb(e.detail)); },
    setError(err) { _target.dispatchEvent(new CustomEvent('error', { detail: err })); },
    onError(cb) { _target.addEventListener('error', e => cb(e.detail)); },
};

export default State;
