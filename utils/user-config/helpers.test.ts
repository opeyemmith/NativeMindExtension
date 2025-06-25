import { describe, it, expect, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import { getUserConfig } from '.';
import { storage } from '#imports';

describe('user config helpers', () => {
  beforeEach(() => {
    // See https://webext-core.aklinker1.io/fake-browser/reseting-state
    fakeBrowser.reset();
  });

  it('should return true when the account exists in storage', async () => {
    const userConfig = await getUserConfig()
    const r1 = userConfig.llm.model.toRef()
    const r2 = userConfig.llm.model.toRef()
    r1.value = 'test-model'
    expect(r2.value).toBe('test-model');
    const localValue = await storage.getItem(userConfig.llm.model.areaKey);
    expect(localValue).toBe('test-model');
  });
});
