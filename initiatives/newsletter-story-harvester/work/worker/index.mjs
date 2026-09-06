import html from '../private/site/index.html?raw';
import seed from '../private/site/seed.json';
import {createReviewWorker} from '../src/review-worker.mjs';

export default createReviewWorker({html, seed});
