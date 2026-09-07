// This bundle is evaluated ONLY inside the QuickJS WebAssembly interpreter.
// It keeps the original Tide Here harmonic engine and Schureman corrections.
import {createTidePredictor} from '@neaps/tide-predictor';

export function predict({constituents, start, end}) {
  const first = new Date(start), last = new Date(end);
  if (!Number.isFinite(+first) || !Number.isFinite(+last) || last <= first || last-first > 7*86400000) {
    throw new Error('Choose a valid five-day window.');
  }
  const predictor = createTidePredictor(constituents, {nodeCorrections: 'schureman'});
  return predictor.getExtremesPrediction({start: first, end: last}).map(event => ({
    type: event.high ? 'high' : 'low', at: event.time.toISOString(),
    height: event.level / 100, unit: 'm'
  }));
}
