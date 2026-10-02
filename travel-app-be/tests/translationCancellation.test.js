jest.mock('axios', () => ({ post: jest.fn() }));

describe('translation provider cancellation', () => {
  const previousKey = process.env.OPENROUTER_API_KEY;
  const previousTimeout = process.env.TRANSLATION_INFERENCE_TIMEOUT_MS;
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.OPENROUTER_API_KEY = 'test-only-key';
    process.env.TRANSLATION_INFERENCE_TIMEOUT_MS = '10';
  });
  afterAll(() => {
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
    if (previousTimeout === undefined) delete process.env.TRANSLATION_INFERENCE_TIMEOUT_MS;
    else process.env.TRANSLATION_INFERENCE_TIMEOUT_MS = previousTimeout;
  });
  test('deadline aborts the real client path and does not try another model', async () => {
    const mockAxios = require('axios');
    let observedSignal;
    mockAxios.post.mockImplementation((_url, _body, { signal }) => new Promise((_resolve, reject) => {
      observedSignal = signal;
      signal.addEventListener('abort', () => reject(new Error('cancelled')));
    }));
    const { translateText } = require('../src/controllers/translationController');
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await translateText({ body: { text: 'deadline regression', langPair: 'en-es' } }, res);
    expect(observedSignal.aborted).toBe(true);
    expect(mockAxios.post).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json.mock.calls[0][0].error.code).toBe('SERVICE_TIMEOUT');
  });
  test('provider success returns clean translated content through the controller', async () => {
    const mockAxios = require('axios');
    mockAxios.post.mockResolvedValue({ data: { choices: [{ message: { content: 'Hola mundo' } }] } });
    const { translateText } = require('../src/controllers/translationController');
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await translateText({ body: { text: 'success regression', langPair: 'en-es' } }, res);
    expect(res.json).toHaveBeenCalledWith({ translation: 'Hola mundo', provider: 'openrouter' });
    expect(mockAxios.post.mock.calls[0][2].signal.aborted).toBe(false);
  });
});
